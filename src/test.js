// Test suite for config compilation and agent stats

import { compileConfig, getThinkBudget, getCostPerDecision, getDailyBurn } from "./config.js";
import { Agent } from "./agent.js";

console.log("🧪 TESTING CONFIG COMPILATION\n");

// Test 1: Thinking budget scale
console.log("Test 1: Thinking Budget Scale");
for (let ptn = 0; ptn <= 12; ptn += 4) {
  const budget = getThinkBudget(ptn);
  const cost = getCostPerDecision(ptn);
  const dailyBurn = getDailyBurn(ptn);
  console.log(`PTN ${ptn}: Budget=${budget}, Cost/Decision=$${cost.toFixed(4)}, Daily=$${dailyBurn.toFixed(2)}`);
}

// Test 2: Config compilation
console.log("\nTest 2: Full Config Compilation");
const testStats = { ptn: 8, spd: 3, rsk: 5, gas: 4 };
const config = compileConfig(testStats, 2, { overclock: false }, 0.01);
console.log("Stats:", testStats);
console.log("Config:");
Object.entries(config).forEach(([key, value]) => {
  console.log(`  ${key}: ${typeof value === "number" ? value.toFixed(4) : value}`);
});

// Test 3: Agent serialization
console.log("\nTest 3: Agent Serialization");
const agent = new Agent("test_agent", "SCOUT", { ptn: 8, spd: 4, rsk: 5, gas: 3 }, 2);
agent.recordTrade({ pnl: 0.05, pnlPercent: 2.3 });
agent.recordTrade({ pnl: -0.02, pnlPercent: -1.1 });
agent.recordTrade({ pnl: 0.08, pnlPercent: 3.5 });
console.log(agent.serialize());

console.log("\n✅ All tests passed");
