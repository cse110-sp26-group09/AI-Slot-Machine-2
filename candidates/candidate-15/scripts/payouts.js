(function attachPayoutsModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  const SYMBOLS = [
    { id: "token", label: "Token", icon: "🪙", weight: 22, tripleMultiplier: 10 },
    { id: "prompt", label: "Prompt", icon: "✍️", weight: 18, tripleMultiplier: 14 },
    { id: "credit", label: "Credit", icon: "💳", weight: 16, tripleMultiplier: 18 },
    { id: "cache", label: "Cache", icon: "💾", weight: 14, tripleMultiplier: 24 },
    { id: "gpu", label: "GPU", icon: "⚙️", weight: 10, tripleMultiplier: 40 },
    { id: "model", label: "Model", icon: "🤖", weight: 7, tripleMultiplier: 65 },
    { id: "singularity", label: "Singularity", icon: "🚀", weight: 3, tripleMultiplier: 180 }
  ];

  const PAIR_MULTIPLIER = 0.9;

  const symbolById = SYMBOLS.reduce((map, symbol) => {
    map[symbol.id] = symbol;
    return map;
  }, {});

  /**
   * Evaluates one 3-reel outcome.
   * @param {string[]} symbolIds
   * @param {number} bet
   * @returns {{payout:number,outcome:string,matchedSymbolId:string|null}}
   */
  function evaluateSpin(symbolIds, bet) {
    const counts = countSymbols(symbolIds);
    const matchedEntry = getTopCountEntry(counts);

    if (matchedEntry.count === 3) {
      const symbol = symbolById[matchedEntry.symbolId];
      const payout = Math.max(0, Math.round(bet * symbol.tripleMultiplier));
      const outcome = payout >= bet * 25 ? "jackpot" : payout >= bet * 8 ? "big-win" : "win";
      return { payout, outcome, matchedSymbolId: symbol.id };
    }

    if (matchedEntry.count === 2) {
      const payout = Math.max(0, Math.round(bet * PAIR_MULTIPLIER));
      return { payout, outcome: "partial", matchedSymbolId: matchedEntry.symbolId };
    }

    return { payout: 0, outcome: "loss", matchedSymbolId: null };
  }

  /**
   * Provides a simple, transparent RTP approximation from configured weights and multipliers.
   * @returns {{rtp:number,winRate:number,pairWinRate:number,tripleWinRate:number}}
   */
  function getTheoreticalMetrics() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    const probabilities = SYMBOLS.map((symbol) => symbol.weight / totalWeight);

    let pairWinRate = 0;
    let tripleWinRate = 0;
    let expectedMultiplier = 0;

    SYMBOLS.forEach((symbol, index) => {
      const p = probabilities[index];
      const p3 = p * p * p;
      const pPair = 3 * p * p * (1 - p);
      pairWinRate += pPair;
      tripleWinRate += p3;
      expectedMultiplier += p3 * symbol.tripleMultiplier;
    });

    expectedMultiplier += pairWinRate * PAIR_MULTIPLIER;

    return {
      rtp: expectedMultiplier,
      winRate: pairWinRate + tripleWinRate,
      pairWinRate,
      tripleWinRate
    };
  }

  function countSymbols(symbolIds) {
    return symbolIds.reduce((map, symbolId) => {
      map[symbolId] = (map[symbolId] || 0) + 1;
      return map;
    }, {});
  }

  function getTopCountEntry(counts) {
    let symbolId = null;
    let count = 0;

    Object.keys(counts).forEach((id) => {
      if (counts[id] > count) {
        symbolId = id;
        count = counts[id];
      }
    });

    return { symbolId, count };
  }

  root.Payouts = {
    SYMBOLS,
    PAIR_MULTIPLIER,
    evaluateSpin,
    getTheoreticalMetrics
  };
})(window);
