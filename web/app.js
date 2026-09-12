import { TradingEngine } from '../src/engine.js';
import { SimMarket } from '../src/market.js';
import { heuristicDecide, claudeDecide } from '../src/brain.js';
import { Agent } from '../src/agent.js';
import { compileConfig } from '../src/config.js';

let engine = null;
let isRunning = false;
let isPaused = false;
let selectedAgentId = 0;
let mode = 'sim';
let seed = 42;
let baseSize = 0.01;

// Initialize agents
function initializeAgents() {
  return [
    new Agent('agent_0', 'SCOUT', { ptn: 8, spd: 4, rsk: 5, gas: 3 }, 2),
    new Agent('agent_1', 'SNIPER', { ptn: 10, spd: 2, rsk: 2, gas: 5 }, 1),
    new Agent('agent_2', 'WHALE', { ptn: 6, spd: 1, rsk: 8, gas: 4 }, 3),
    new Agent('agent_3', 'ARB', { ptn: 4, spd: 5, rsk: 3, gas: 6 }, 1),
  ];
}

// Update cost display
function updateCostDisplay() {
  const ptn = parseInt(document.getElementById('ptnSlider').value);
  const spd = parseInt(document.getElementById('spdSlider').value);
  const rsk = parseInt(document.getElementById('rskSlider').value);
  const gas = parseInt(document.getElementById('gasSlider').value);
  const level = parseInt(document.getElementById('levelSlider').value);

  const stats = { ptn, spd, rsk, gas };
  const config = compileConfig(stats, level, {}, baseSize);

  const modelName = config.model === 'claude-opus-5' ? 'OPUS 5' : 'FABLE 5.1';
  document.getElementById('costModel').textContent = modelName;
  document.getElementById('costContext').textContent = `${config.ctxCandles} candles`;
  document.getElementById('costThinking').textContent = `${config.thinkingBudget} tokens`;
  document.getElementById('costDecision').textContent = `$${config.costPerDecision.toFixed(4)}`;
  document.getElementById('costDaily').textContent = `$${config.dailyBurn.toFixed(2)}`;
  document.getElementById('costPosition').textContent = `${config.positionSizeEth.toFixed(4)} ETH`;

  // Update stat value displays
  document.getElementById('ptnValue').textContent = ptn;
  document.getElementById('spdValue').textContent = spd;
  document.getElementById('rskValue').textContent = rsk;
  document.getElementById('gasValue').textContent = gas;
  document.getElementById('levelValue').textContent = level;
}

// Update agent stats display
function updateAgentStats() {
  if (!engine) return;

  const html = engine.agents.map((agent) => `
    <div class="stat-item">
      <div class="stat-label">${agent.type} (${agent.id})</div>
      <div class="stat-value">P&L: $${agent.pnl.toFixed(2)}</div>
      <div class="stat-value">Trades: ${agent.trades}</div>
      <div class="stat-value">Win Rate: ${agent.getWinRate().toFixed(1)}%</div>
    </div>
  `).join('');

  document.getElementById('agentStats').innerHTML = html;
}

// Update leaderboard
function updateLeaderboard() {
  if (!engine) return;

  const sorted = [...engine.agents].sort((a, b) => b.pnl - a.pnl);
  const html = sorted.map((agent, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${agent.id}</td>
      <td>${agent.type}</td>
      <td>$${agent.pnl.toFixed(2)}</td>
      <td>${agent.trades}</td>
      <td>${agent.getWinRate().toFixed(1)}%</td>
    </tr>
  `).join('');

  document.getElementById('leaderboardBody').innerHTML = html;
}

// Update village display
function updateVillage() {
  if (!engine) return;

  const village = document.getElementById('village');
  village.innerHTML = engine.agents.map((agent, i) => `
    <div class="agent-tile ${selectedAgentId === i ? 'active' : ''}" data-agent="${i}">
      <div class="agent-name">${agent.type}</div>
      <div class="agent-pnl">$${agent.pnl.toFixed(2)}</div>
      <div style="font-size: 10px; color: #00ff00;">${agent.trades} trades</div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.agent-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      selectedAgentId = parseInt(tile.dataset.agent);
      updateVillage();
      updateAgentStats();
    });
  });

  document.getElementById('currentTick').textContent = engine.market.tick;
  document.getElementById('currentPhase').textContent = engine.phase;
}

// Update trade history
function updateTradeHistory() {
  if (!engine) return;

  const recent = engine.history.slice(-10).reverse();
  const html = recent.map((trade) => `
    <div class="trade-item ${trade.pnl > 0 ? 'win' : 'loss'}">
      <strong>${trade.agent}</strong> - ${trade.action}<br>
      P&L: $${trade.pnl.toFixed(4)} (${trade.pnlPercent.toFixed(2)}%)<br>
      Tick: ${trade.tick}
    </div>
  `).join('');

  document.getElementById('tradeHistory').innerHTML = html || '<p style="font-size: 11px; color: #888;">No trades yet</p>';
}

// Start backtest
async function startBacktest() {
  if (isRunning) return;

  document.getElementById('startBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('status').textContent = 'Running...';
  isRunning = true;
  isPaused = false;

  const agents = initializeAgents();
  const market = mode === 'sim' ? new SimMarket(seed) : null;
  const brain = mode === 'sim' ? heuristicDecide : null;

  engine = new TradingEngine(agents, market, brain);

  try {
    const tickInterval = setInterval(async () => {
      if (!isRunning || isPaused) return;

      await engine.runTick();
      updateVillage();
      updateAgentStats();
      updateLeaderboard();
      updateTradeHistory();

      if (!engine.market.isRunning()) {
        clearInterval(tickInterval);
        isRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('status').textContent = 'Complete';
      }
    }, 50);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('status').textContent = 'Error';
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }
}

// Pause/Resume
function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
  document.getElementById('status').textContent = isPaused ? 'Paused' : 'Running...';
}

// Reset
function resetBacktest() {
  isRunning = false;
  isPaused = false;
  engine = null;
  selectedAgentId = 0;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').textContent = '⏸️ Pause';
  document.getElementById('status').textContent = 'Ready';
  document.getElementById('village').innerHTML = '';
  document.getElementById('agentStats').innerHTML = '';
  document.getElementById('leaderboardBody').innerHTML = '';
  document.getElementById('tradeHistory').innerHTML = '';
}

// Export results
function exportResults() {
  if (!engine) {
    alert('Run a backtest first');
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    mode,
    seed,
    leaderboard: engine.agents.map((a) => ({
      id: a.id,
      type: a.type,
      pnl: a.pnl,
      trades: a.trades,
      winRate: a.getWinRate(),
    })),
    totalTrades: engine.history.length,
  };

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backtest-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Settings
function openSettings() {
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
  mode = document.getElementById('modeSelect').value;
  seed = parseInt(document.getElementById('seedInput').value);
  baseSize = parseFloat(document.getElementById('baseSize').value);
  const apiKey = document.getElementById('apiKey').value;

  if (apiKey) localStorage.setItem('anthropicKey', apiKey);

  updateCostDisplay();
  closeSettings();
  alert('Settings saved');
}

window.closeSettings = closeSettings;
window.openSettings = openSettings;
window.saveSettings = saveSettings;

// Event listeners
document.getElementById('ptnSlider').addEventListener('input', updateCostDisplay);
document.getElementById('spdSlider').addEventListener('input', updateCostDisplay);
document.getElementById('rskSlider').addEventListener('input', updateCostDisplay);
document.getElementById('gasSlider').addEventListener('input', updateCostDisplay);
document.getElementById('levelSlider').addEventListener('input', updateCostDisplay);

document.getElementById('startBtn').addEventListener('click', startBacktest);
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resetBtn').addEventListener('click', resetBacktest);
document.getElementById('exportBtn').addEventListener('click', exportResults);

document.getElementById('settingsBtn').addEventListener('click', openSettings);

document.getElementById('modeToggle').addEventListener('click', () => {
  mode = mode === 'sim' ? 'live' : 'sim';
  document.getElementById('modeToggle').textContent = `Mode: ${mode.toUpperCase()}`;
});

// Initialize
updateCostDisplay();
console.log('✅ Trading Terminal UI loaded');
