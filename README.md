# Robinhood Trading Terminal

An AI-powered game-based trading terminal for Robinhood Chain. Play a village simulation where upgrading stats directly controls a real trading agent's behavior.

## Overview

Every stat you adjust in the game corresponds to a real trading parameter:

- **PTN** (Thinking) → Context window + reasoning budget + model tier
- **SPD** (Speed) → Poll interval + decision frequency
- **RSK** (Risk) → Position size multiplier
- **GAS** (Gas) → Slippage tolerance

Upgrade a stat in the game, watch the API costs update in real time, run a backtest, submit to the leaderboard.

## Quick Start

### Installation

```bash
npm install
cp .env.example .env
```

### Simulator Mode (Free)

```bash
npm run sim
```

Runs backtest against seeded deterministic market. No API costs.

### Live Mode (Requires API Key)

```bash
echo "ANTHROPIC_KEY=sk-ant-..." >> .env
echo "MODE=live" >> .env
npm run live
```

Trades real tokens on Robinhood Chain using Claude as the trading brain.

## Architecture

### 6-Phase Loop

Each tick cycles through:

1. **REST** - Agents prepare
2. **TRAIN** - Update config from stats
3. **SCAN** - Read market data
4. **DECIDE** - Claude (live) or heuristic (sim) makes decision
5. **HOLD** - Monitor open positions
6. **SETTLE** - Close expired positions, record P&L

### Config Compilation

```javascript
const config = compileConfig(stats, level, boosts, baseSizeEth);
// Returns:
// {
//   pollIntervalMs: 2420,
//   model: "claude-opus-5",
//   ctxCandles: 72,
//   thinkingBudget: 1500,
//   positionSizeEth: 0.0176,
//   slippageBps: 106,
//   costPerDecision: 0.0444,
//   dailyBurn: 117.01
// }
```

### Decision Shape

Both simulator and live brain return the same JSON:

```json
{
  "action": "BUY",
  "sizeEth": 0.031,
  "confidence": 0.72,
  "holdTicks": 34,
  "reason": "reserves rising, dev wallet quiet"
}
```

## Agent Classes

- **SCOUT** - Early entries, favor young tokens
- **SNIPER** - High precision, skip more than trade
- **WHALE** - Size on conviction, curve >40%
- **ARB** - Short holds, small edges

## Cost Scaling

| PTN | Model | Context | Thinking | $/Decision | $/Day |
|-----|-------|---------|----------|------------|-------|
| 0 | OPUS 5 | 24 | 0 | $0.0040 | $10.64 |
| 4 | OPUS 5 | 48 | 512 | $0.0183 | $48.15 |
| 8 | OPUS 5 | 72 | 1,500 | $0.0444 | $117.01 |
| 12 | FABLE 5.1 | 96 | 3,000 | $0.1667 | $439.16 |

## Files

- `src/config.js` - Stat-to-parameter compilation
- `src/agent.js` - Agent class with stats and config
- `src/market.js` - SimMarket (seeded) and PonsMarket (live)
- `src/brain.js` - heuristicDecide (sim) and claudeDecide (live)
- `src/engine.js` - Core 6-phase trading loop
- `src/index.js` - Main entry point
- `src/test.js` - Unit tests

## Leaderboard

Run backtest with different configs, track P&L, see ranking:

```
🏆 LEADERBOARD
----------------------------
🥇 agent_0 (SCOUT)
   P&L: $127.45 | Trades: 23 | Win Rate: 65.2%
🥈 agent_2 (WHALE)
   P&L: $84.32 | Trades: 12 | Win Rate: 58.3%
🥉 agent_3 (ARB)
   P&L: $45.67 | Trades: 34 | Win Rate: 52.9%
```

## Key Safety Rules

1. Errors always resolve to SKIP (never trade on failure)
2. Position size capped after model answer (enforce in code, not model)
3. Temperature 0 (repeatable reasoning)

## Next Steps

1. Adjust agent stats in `src/index.js`
2. Run simulator: `npm run sim`
3. Compare P&L on leaderboard
4. When ready, add ANTHROPIC_KEY and go live

## License

MIT
