(function attachPayoutsModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  const SYMBOLS = [
    {
      id: "aditya",
      label: "Aditya",
      image: "assets/icons/symbol-aditya.png",
      weight: 22,
      tripleMultiplier: 8
    },
    {
      id: "alexis",
      label: "Alexis",
      image: "assets/icons/symbol-alexis.png",
      weight: 19,
      tripleMultiplier: 12
    },
    {
      id: "daniel",
      label: "Daniel",
      image: "assets/icons/symbol-daniel.png",
      weight: 15,
      tripleMultiplier: 18
    },
    {
      id: "powell",
      label: "Powell",
      image: "assets/icons/symbol-powell.png",
      weight: 12,
      tripleMultiplier: 24
    },
    {
      id: "hieu",
      label: "Hieu",
      image: "assets/icons/symbol-hieu.png",
      weight: 10,
      tripleMultiplier: 38
    },
    {
      id: "james",
      label: "James",
      image: "assets/icons/symbol-james.png",
      weight: 7,
      tripleMultiplier: 64
    },
    {
      id: "hemendra",
      label: "Hemendra",
      image: "assets/icons/symbol-hemendra.png",
      weight: 3,
      tripleMultiplier: 160
    }
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
   * Provides RTP approximation from configured weights and multipliers.
   * @returns {{rtp:number,winRate:number,pairWinRate:number,tripleWinRate:number}}
   */
  function getTheoreticalMetrics() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    const probabilities = SYMBOLS.map((symbol) => symbol.weight / totalWeight);

    let pairWinRate = 0;
    let tripleWinRate = 0;
    let expectedMultiplier = 0;

    SYMBOLS.forEach((symbol, index) => {
      const probability = probabilities[index];
      const pThree = probability * probability * probability;
      const pPair = 3 * probability * probability * (1 - probability);
      pairWinRate += pPair;
      tripleWinRate += pThree;
      expectedMultiplier += pThree * symbol.tripleMultiplier;
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
