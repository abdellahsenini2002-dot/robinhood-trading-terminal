// Agent class representing a trading bot with stats and configuration

import { compileConfig } from "./config.js";

class Agent {
  constructor(id, type = "SCOUT", stats = {}, level = 0) {
    this.id = id;
    this.type = type; // SCOUT, SNIPER, WHALE, ARB

    // Default stats
    this.stats = {
      ptn: stats.ptn || 4,  // Thinking (PTN)
      spd: stats.spd || 3,  // Speed (SPD)
      rsk: stats.rsk || 3,  // Risk (RSK)
      gas: stats.gas || 3,  // Gas efficiency (GAS)
    };

    this.level = level;
    this.boosts = {};
    this.pnl = 0;
    this.trades = 0;
    this.wins = 0;
    this.position = null;
  }

  getConfig(baseSizeEth = 0.01) {
    return compileConfig(this.stats, this.level, this.boosts, baseSizeEth);
  }

  getSystemPrompt() {
    const classLens = {
      SCOUT: "You favour early entries. Age under 8 minutes interests you.",
      SNIPER: "You favour precision. Skip more than you trade.",
      WHALE: "You favour size on high conviction only. Curve above 40% is your zone.",
      ARB: "You favour short holds and small edges. Exit fast.",
    };

    return `You are a memecoin trading agent on Robinhood Chain (Pons). Hard facts:
- 99 of 100 Pons tokens die on the bonding curve.
- Gas is subsidized. Wash trading is free. Buyer counts inflate easily.
- Your job is capital preservation first, opportunity second.
- ${classLens[this.type]}

Reply ONLY JSON, no prose:
{"action":"BUY"|"SELL"|"SKIP","sizeEth":number,"confidence":number,"holdTicks":number,"reason":string}

If you are not confident, SKIP. A missed trade costs nothing.`;
  }

  recordTrade(result) {
    this.trades++;
    if (result.pnl > 0) this.wins++;
    this.pnl += result.pnl;
  }

  getWinRate() {
    return this.trades > 0 ? (this.wins / this.trades) * 100 : 0;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      stats: this.stats,
      level: this.level,
      pnl: this.pnl,
      trades: this.trades,
      wins: this.wins,
      winRate: this.getWinRate(),
      config: this.getConfig(),
    };
  }
}

export { Agent };
