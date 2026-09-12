// Market abstraction: SimMarket (seeded random) and PonsMarket (real Robinhood Chain)

class SimMarket {
  constructor(seed = 42) {
    this.seed = seed;
    this.currentPrice = 0.000001;
    this.tick = 0;
    this.maxTicks = 7000;
    this.tokens = [];
    this.rng = this.seededRandom(seed);
    this.generateMarket();
  }

  seededRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  generateMarket() {
    // Generate ~200 tokens with survival curve matching 1% success rate
    for (let i = 0; i < 200; i++) {
      const ageMinutes = this.rng() * 30;
      const survived = this.rng() < 0.01; // 1% survival
      this.tokens.push({
        id: `token_${i}`,
        price: 0.000001 * (1 + this.rng() * 10),
        reserves: Math.random() * 100,
        ageMinutes,
        survived,
        buyers: Math.floor(this.rng() * 500),
      });
    }
  }

  getLatestCandle() {
    const token = this.tokens[Math.floor(this.rng() * this.tokens.length)];
    const volatility = 0.02 + this.rng() * 0.15;
    const direction = this.rng() > 0.5 ? 1 : -1;

    return {
      timestamp: this.tick,
      open: this.currentPrice,
      close: this.currentPrice * (1 + direction * volatility),
      high: this.currentPrice * (1 + Math.abs(volatility) * 1.2),
      low: this.currentPrice * (1 - Math.abs(volatility) * 0.8),
      volume: this.rng() * 50,
      token,
    };
  }

  executeOrder(action, sizeEth, slippageBps) {
    const candle = this.getLatestCandle();
    const slippageMultiplier = 1 + (slippageBps / 10000) * (action === "BUY" ? 1 : -1);
    const executionPrice = candle.close * slippageMultiplier;

    return {
      action,
      sizeEth,
      entryPrice: executionPrice,
      timestamp: this.tick,
      token: candle.token,
    };
  }

  settlePosition(position) {
    if (!position) return { pnl: 0, pnlPercent: 0 };

    const candle = this.getLatestCandle();
    const exitPrice = candle.close;
    const pnl =
      (position.action === "BUY" ? 1 : -1) *
      position.sizeEth *
      (exitPrice - position.entryPrice);
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

    return { pnl, pnlPercent };
  }

  tick() {
    this.tick++;
    this.currentPrice *= 1 + (this.rng() - 0.5) * 0.02;
  }

  isRunning() {
    return this.tick < this.maxTicks;
  }
}

class PonsMarket {
  constructor(bitqueryKey, rpcUrl) {
    this.bitqueryKey = bitqueryKey;
    this.rpcUrl = rpcUrl;
    this.currentPrice = 0.000001;
    this.tick = 0;
  }

  async getLatestCandle() {
    // Would fetch real data from Bitquery
    // Stub for now
    return {
      timestamp: Date.now(),
      open: this.currentPrice,
      close: this.currentPrice * (1 + (Math.random() - 0.5) * 0.1),
      high: this.currentPrice * 1.05,
      low: this.currentPrice * 0.95,
      volume: Math.random() * 100,
    };
  }

  async executeOrder(action, sizeEth, slippageBps) {
    // Would execute real trade on Pons via viem
    // Stub for now
    return {
      action,
      sizeEth,
      entryPrice: this.currentPrice,
      txHash: "0x...",
      timestamp: Date.now(),
    };
  }

  async settlePosition(position) {
    // Would settle real position
    return { pnl: 0, pnlPercent: 0 };
  }
}

export { SimMarket, PonsMarket };
