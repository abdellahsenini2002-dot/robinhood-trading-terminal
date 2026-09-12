import dotenv from "dotenv";
import { TradingEngine } from "./engine.js";
import { SimMarket } from "./market.js";
import { heuristicDecide, claudeDecide } from "./brain.js";
import { Agent } from "./agent.js";

dotenv.config();

const MODE = process.env.MODE || "sim";
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

async function main() {
  console.log(`\n🎮 ROBINHOOD TRADING TERMINAL`);
  console.log(`Mode: ${MODE.toUpperCase()}`);
  console.log(`----------------------------\n`);

  // Initialize agents
  const agents = [
    new Agent("agent_0", "SCOUT", { ptn: 8, spd: 4, rsk: 5, gas: 3 }, 2),
    new Agent("agent_1", "SNIPER", { ptn: 10, spd: 2, rsk: 2, gas: 5 }, 1),
    new Agent("agent_2", "WHALE", { ptn: 6, spd: 1, rsk: 8, gas: 4 }, 3),
    new Agent("agent_3", "ARB", { ptn: 4, spd: 5, rsk: 3, gas: 6 }, 1),
  ];

  console.log("📊 AGENT STATS");
  agents.forEach((agent) => {
    const config = agent.getConfig();
    console.log(`\n${agent.type} (${agent.id})`);
    console.log(`  PTN: ${agent.stats.ptn} | SPD: ${agent.stats.spd} | RSK: ${agent.stats.rsk} | GAS: ${agent.stats.gas}`);
    console.log(`  Model: ${config.model}`);
    console.log(`  Thinking Budget: ${config.thinkingBudget} tokens`);
    console.log(`  Cost/Day: $${config.dailyBurn.toFixed(2)}`);
    console.log(`  Position Size: ${config.positionSizeEth.toFixed(4)} ETH`);
  });

  // Choose brain and market based on mode
  const market = MODE === "sim" ? new SimMarket(42) : null;
  const brain = MODE === "sim" ? heuristicDecide : claudeDecide(ANTHROPIC_KEY);

  if (MODE === "live" && !ANTHROPIC_KEY) {
    console.error("\n❌ Live mode requires ANTHROPIC_KEY in .env");
    process.exit(1);
  }

  // Create engine
  const engine = new TradingEngine(agents, market, brain);

  console.log("\n🚀 Running backtest...");
  console.log(`Phases: REST -> TRAIN -> SCAN -> DECIDE -> HOLD -> SETTLE\n`);

  try {
    const results = await engine.run();

    console.log("\n✅ BACKTEST COMPLETE\n");
    console.log("🏆 LEADERBOARD");
    console.log("----------------------------");

    results.leaderboard.forEach((agent, index) => {
      const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      console.log(`${emoji} ${agent.id} (${agent.type})`);
      console.log(`   P&L: $${agent.pnl.toFixed(2)} | Trades: ${agent.trades} | Win Rate: ${agent.winRate.toFixed(1)}%`);
    });

    console.log(`\n📈 Total Trades: ${results.totalTrades}`);
    console.log(`📊 Total P&L: $${results.leaderboard.reduce((sum, a) => sum + a.pnl, 0).toFixed(2)}`);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
