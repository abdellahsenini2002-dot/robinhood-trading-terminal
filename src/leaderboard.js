// Leaderboard system: BUILDS (backtest) and VILLAGES (live)

class Leaderboard {
  constructor() {
    this.builds = []; // backtest results
    this.villages = []; // live session results
  }

  submitBuild(config, agents, pnl) {
    const build = {
      id: `build_${Date.now()}`,
      timestamp: Date.now(),
      config,
      agents: agents.map((a) => a.serialize()),
      totalPnL: pnl,
      rank: 0,
    };

    this.builds.push(build);
    this.builds.sort((a, b) => b.totalPnL - a.totalPnL);
    this.builds.forEach((b, i) => (b.rank = i + 1));

    return build;
  }

  submitVillage(sessionId, agents, pnl) {
    const village = {
      id: `village_${sessionId}`,
      timestamp: Date.now(),
      agents: agents.map((a) => a.serialize()),
      totalPnL: pnl,
      isLive: true,
      rank: 0,
    };

    this.villages.push(village);
    this.villages.sort((a, b) => b.totalPnL - a.totalPnL);
    this.villages.forEach((v, i) => (v.rank = i + 1));

    return village;
  }

  getLeadingBuild() {
    return this.builds[0] || null;
  }

  getTopVillages(limit = 3) {
    return this.villages.slice(0, limit);
  }

  serialize() {
    return {
      builds: this.builds.slice(0, 10),
      villages: this.villages.slice(0, 10),
    };
  }
}

export { Leaderboard };
