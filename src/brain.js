// Trading decision logic: heuristic for sim, Claude for live

import Anthropic from "@anthropic-ai/sdk";

// Heuristic decision maker for simulator
function heuristicDecide(agent, candle) {
  const token = candle.token;
  const conf = Math.random();

  // SCOUT: early entries
  if (agent.type === "SCOUT" && token.ageMinutes < 8 && conf > 0.3) {
    return {
      action: "BUY",
      sizeEth: 0.01 + agent.stats.rsk * 0.002,
      confidence: 0.6 + agent.stats.ptn * 0.05,
      holdTicks: 50 + agent.stats.ptn * 10,
      reason: "Early entry, low age",
    };
  }

  // SNIPER: precision, high threshold
  if (agent.type === "SNIPER" && conf > 0.7) {
    return {
      action: "BUY",
      sizeEth: 0.005,
      confidence: 0.85,
      holdTicks: 20,
      reason: "High precision entry",
    };
  }

  // WHALE: size on high conviction
  if (agent.type === "WHALE" && token.reserves > 40 && conf > 0.6) {
    return {
      action: "BUY",
      sizeEth: 0.05 + agent.stats.rsk * 0.01,
      confidence: 0.75,
      holdTicks: 100,
      reason: "Large reserves, high conviction",
    };
  }

  // ARB: short holds
  if (agent.type === "ARB" && conf > 0.5) {
    return {
      action: "BUY",
      sizeEth: 0.01,
      confidence: 0.55,
      holdTicks: 5,
      reason: "Quick arbitrage",
    };
  }

  // Default: skip
  return {
    action: "SKIP",
    sizeEth: 0,
    confidence: 0,
    holdTicks: 0,
    reason: "No clear signal",
  };
}

// Claude-based decision maker for live trading
function claudeDecide(apiKey) {
  const client = new Anthropic({
    apiKey,
  });

  return async (agent, candle) => {
    try {
      const prompt = `Current token: ${candle.token.id}
Price: $${candle.close.toFixed(8)}
Reserves: ${candle.token.reserves.toFixed(2)} ETH
Age: ${candle.token.ageMinutes.toFixed(1)} minutes
Buyers: ${candle.token.buyers}

Decide now.`;

      const response = await client.messages.create({
        model: agent.getConfig().model,
        max_tokens: agent.getConfig().thinkingBudget,
        temperature: 0,
        system: agent.getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0].text;
      const decision = JSON.parse(content);

      // Enforce safety rules
      if (!decision.action || !["BUY", "SELL", "SKIP"].includes(decision.action)) {
        return {
          action: "SKIP",
          sizeEth: 0,
          confidence: 0,
          holdTicks: 0,
          reason: "Parse error - defaulting to SKIP",
        };
      }

      // Cap position size
      const config = agent.getConfig();
      decision.sizeEth = Math.min(decision.sizeEth, config.positionSizeEth);

      return decision;
    } catch (error) {
      console.error("Claude decision error:", error.message);
      return {
        action: "SKIP",
        sizeEth: 0,
        confidence: 0,
        holdTicks: 0,
        reason: `Error: ${error.message}`,
      };
    }
  };
}

export { heuristicDecide, claudeDecide };
