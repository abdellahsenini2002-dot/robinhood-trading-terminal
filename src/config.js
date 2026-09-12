// Agent configuration compiler
// Converts game stats (PTN, SPD, RSK, GAS) into runtime trading parameters

const MODEL_LADDER = [
  { minPtn: 0, id: "claude-opus-5" },
  { minPtn: 12, id: "claude-fable-5-1" },
];

const getThinkBudget = (ptn) => {
  if (ptn >= 12) return 3000; // deep chain-of-thought
  if (ptn >= 8) return 1500;  // moderate reasoning
  if (ptn >= 4) return 512;   // light thinking
  return 0;                    // raw instinct
};

const getCostPerDecision = (ptn) => {
  if (ptn >= 12) return 0.1667; // Fable 5.1 with 3000 tokens
  if (ptn >= 8) return 0.0444;  // Opus 5 with 1500 tokens
  if (ptn >= 4) return 0.0183;  // Opus 5 with 512 tokens
  return 0.0040;                 // No thinking
};

const getDailyBurn = (ptn) => {
  const costPerDecision = getCostPerDecision(ptn);
  const decisionsPerDay = (24 * 60 * 60 * 1000) / Math.max(400, 3200 - 3 * 260); // ~2635 decisions/day at baseline
  return costPerDecision * decisionsPerDay;
};

function compileConfig(stats, level = 0, boosts = {}, baseSizeEth = 0.01) {
  // Find model tier
  const tier = [...MODEL_LADDER]
    .reverse()
    .find((t) => stats.ptn >= t.minPtn);

  // Poll interval: faster with SPD stat
  let pollIntervalMs = Math.max(400, 3200 - stats.spd * 260);

  // Context window: more candles with PTN
  let ctxCandles = Math.min(120, 24 + stats.ptn * 6);

  // Thinking budget
  let thinkingBudget = getThinkBudget(stats.ptn);

  // Position size: scales with RSK and level
  let positionSizeEth =
    baseSizeEth * (1 + stats.rsk * 0.18) * (1 + level * 0.12);

  // Slippage tolerance: lower with GAS stat
  const slippageBps = Math.max(30, 160 - stats.gas * 9);

  // Apply boosts
  if (boosts.overclock) {
    pollIntervalMs = Math.max(200, Math.round(pollIntervalMs / 3));
  }
  if (boosts.alphaFeed) {
    ctxCandles *= 2;
    thinkingBudget *= 2;
  }
  if (boosts.leverage) {
    positionSizeEth *= 2;
  }

  const maxSizeEth = baseSizeEth * 8; // hard cap

  return {
    pollIntervalMs,
    model: tier.id,
    ctxCandles,
    thinkingBudget,
    positionSizeEth: Math.min(maxSizeEth, positionSizeEth),
    slippageBps,
    maxSizeEth,
    costPerDecision: getCostPerDecision(stats.ptn),
    dailyBurn: getDailyBurn(stats.ptn),
  };
}

export { compileConfig, MODEL_LADDER, getThinkBudget, getCostPerDecision, getDailyBurn };
