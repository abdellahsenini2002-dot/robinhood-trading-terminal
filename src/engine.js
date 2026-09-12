// Core trading engine: runs the 6-phase loop
// REST -> TRAIN -> SCAN -> DECIDE -> HOLD -> SETTLE

import { Agent } from "./agent.js";
import { SimMarket } from "./market.js";
import { heuristicDecide } from "./brain.js";

class TradingEngine {
  constructor(agents = [], market = null, brain = null) {
    this.agents = agents || this.initializeAgents();
    this.market = market || new SimMarket(42);
    this.brain = brain || heuristicDecide;
    this.phase = "REST";
    this.phaseMap = ["REST", "TRAIN", "SCAN", "DECIDE", "HOLD", "SETTLE"];
    this.currentPhaseIndex = 0;
    this.positions = {}; // agent.id -> position
    this.history = [];
  }

  initializeAgents() {
    const types = ["SCOUT", "SNIPER", "WHALE", "ARB"];
    return types.map((type, i) => new Agent(`agent_${i}`, type));
  }

  async runTick() {
    const candle = this.market.getLatestCandle();

    switch (this.phase) {
      case "REST":
        this.phaseRest();
        break;
      case "TRAIN":
        this.phaseTrain();
        break;
      case "SCAN":
        await this.phaseScan(candle);
        break;
      case "DECIDE":
        await this.phaseDecide(candle);
        break;
      case "HOLD":
        this.phaseHold();
        break;
      case "SETTLE":
        this.phaseSettle();
        break;
    }

    this.moveToNextPhase();
    this.market.tick();
  }

  phaseRest() {
    // Agents rest, prepare for next cycle
  }

  phaseTrain() {
    // Update agent configurations based on stats
    this.agents.forEach((agent) => {
      agent.getConfig();
    });
  }

  async phaseScan(candle) {
    // Scan market conditions
    this.currentCandle = candle;
  }

  async phaseDecide(candle) {
    // Each agent makes a decision
    for (const agent of this.agents) {
      const decision = await this.brain(agent, candle);

      if (decision.action === "BUY" && !this.positions[agent.id]) {
        this.positions[agent.id] = {
          ...decision,
          entryTick: this.market.tick,
          entryPrice: candle.close,
        };
      } else if (decision.action === "SELL" && this.positions[agent.id]) {
        const position = this.positions[agent.id];
        const exitPrice = candle.close;
        const pnl = position.sizeEth * (exitPrice - position.entryPrice);
        const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

        agent.recordTrade({ pnl, pnlPercent });
        this.history.push({
          agent: agent.id,
          action: "SELL",
          pnl,
          pnlPercent,
          tick: this.market.tick,
        });

        delete this.positions[agent.id];
      }
    }
  }

  phaseHold() {
    // Positions held, monitor for exit signals
  }

  phaseSettle() {
    // Settle any expired positions
    Object.keys(this.positions).forEach((agentId) => {
      const position = this.positions[agentId];
      if (this.market.tick - position.entryTick > position.holdTicks) {
        const agent = this.agents.find((a) => a.id === agentId);
        const exitPrice = this.currentCandle.close;
        const pnl = position.sizeEth * (exitPrice - position.entryPrice);
        const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

        agent.recordTrade({ pnl, pnlPercent });
        this.history.push({
          agent: agentId,
          action: "SETTLE",
          pnl,
          pnlPercent,
          tick: this.market.tick,
        });

        delete this.positions[agentId];
      }
    });
  }

  moveToNextPhase() {
    this.currentPhaseIndex = (this.currentPhaseIndex + 1) % this.phaseMap.length;
    this.phase = this.phaseMap[this.currentPhaseIndex];
  }

  async run() {
    while (this.market.isRunning()) {
      await this.runTick();
    }

    return this.getResults();
  }

  getResults() {
    const leaderboard = this.agents
      .map((agent) => ({
        id: agent.id,
        type: agent.type,
        pnl: agent.pnl,
        trades: agent.trades,
        winRate: agent.getWinRate(),
        config: agent.getConfig(),
      }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      leaderboard,
      totalTrades: this.history.length,
      history: this.history,
    };
  }
}

export { TradingEngine };
