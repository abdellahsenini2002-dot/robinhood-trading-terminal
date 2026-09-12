import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { TradingEngine } from './src/engine.js';
import { SimMarket } from './src/market.js';
import { heuristicDecide, claudeDecide } from './src/brain.js';
import { Agent } from './src/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

let engine = null;
let backtest = null;

// API Routes
app.post('/api/backtest/start', async (req, res) => {
  const { seed = 42, mode = 'sim', agents = [] } = req.body;

  try {
    const agentList = agents.length > 0 ? agents : [
      new Agent('agent_0', 'SCOUT', { ptn: 8, spd: 4, rsk: 5, gas: 3 }, 2),
      new Agent('agent_1', 'SNIPER', { ptn: 10, spd: 2, rsk: 2, gas: 5 }, 1),
      new Agent('agent_2', 'WHALE', { ptn: 6, spd: 1, rsk: 8, gas: 4 }, 3),
      new Agent('agent_3', 'ARB', { ptn: 4, spd: 5, rsk: 3, gas: 6 }, 1),
    ];

    const market = mode === 'sim' ? new SimMarket(seed) : null;
    const brain = mode === 'sim' ? heuristicDecide : null;

    engine = new TradingEngine(agentList, market, brain);
    backtest = {
      id: `backtest_${Date.now()}`,
      status: 'running',
      seed,
      mode,
      startTime: Date.now(),
    };

    res.json({ id: backtest.id, status: 'running' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backtest/:id/status', (req, res) => {
  if (!engine || !backtest) {
    return res.status(404).json({ error: 'Backtest not found' });
  }

  res.json({
    id: backtest.id,
    status: backtest.status,
    progress: engine.market.tick / engine.market.maxTicks,
    tick: engine.market.tick,
    phase: engine.phase,
  });
});

app.get('/api/backtest/:id/results', (req, res) => {
  if (!engine) {
    return res.status(404).json({ error: 'Backtest not found' });
  }

  const leaderboard = engine.agents
    .map((agent) => ({
      id: agent.id,
      type: agent.type,
      pnl: agent.pnl,
      trades: agent.trades,
      winRate: agent.getWinRate(),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  res.json({
    id: backtest.id,
    leaderboard,
    totalTrades: engine.history.length,
    recentTrades: engine.history.slice(-20),
  });
});

app.get('/api/leaderboard', (req, res) => {
  if (!engine) {
    return res.json({ leaderboard: [] });
  }

  const leaderboard = engine.agents
    .map((agent) => ({
      id: agent.id,
      type: agent.type,
      pnl: agent.pnl,
      trades: agent.trades,
      winRate: agent.getWinRate(),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  res.json({ leaderboard });
});

app.listen(PORT, () => {
  console.log(`\n🚀 TRADING TERMINAL SERVER`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🎮 Open browser and navigate to http://localhost:${PORT}`);
  console.log(`✅ Ready to trade\n`);
});
