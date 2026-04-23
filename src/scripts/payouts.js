/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachPayoutsModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  const SYMBOLS = [
    {
      id: "spongebob",
      code: "SPG",
      label: "SpongeBob",
      icon: "assets/icons/Spongebob.png"
    },
    {
      id: "patrick",
      code: "PAT",
      label: "Patrick",
      icon: "assets/icons/Patrick.png"
    },
    {
      id: "squidward",
      code: "SQD",
      label: "Squidward",
      icon: "assets/icons/Squidward_Tentacles.png"
    },
    {
      id: "sandy",
      code: "SND",
      label: "Sandy",
      icon: "assets/icons/Sandy.png"
    },
    {
      id: "mrcrabs",
      code: "MRC",
      label: "Mr. Krabs",
      icon: "assets/icons/Mr.Crabs.png"
    },
    {
      id: "mrspuff",
      code: "MRP",
      label: "Mrs. Puff",
      icon: "assets/icons/Mrs.Puff.png"
    },
    {
      id: "pearl",
      code: "PRL",
      label: "Pearl",
      icon: "assets/icons/Pearl.png"
    },
    {
      id: "plankton",
      code: "PLK",
      label: "Plankton",
      icon: "assets/icons/Plankton.png"
    },
    {
      id: "gary",
      code: "GRY",
      label: "Gary",
      icon: "assets/icons/Gary.png"
    }
  ];

  const TRIPLE_MULTIPLIER = {
    spongebob: 30,
    patrick: 24,
    squidward: 22,
    sandy: 20,
    mrcrabs: 18,
    mrspuff: 16,
    pearl: 14,
    plankton: 12,
    gary: 10
  };

  const PAIR_MULTIPLIER = {
    spongebob: 3.1,
    patrick: 2.8,
    squidward: 2.6,
    sandy: 2.4,
    mrcrabs: 2.2,
    mrspuff: 2,
    pearl: 1.8,
    plankton: 1.6,
    gary: 1.4
  };

  function roundToCents(value) {
    return Math.round(value * 100) / 100;
  }

  function countById(symbols) {
    return symbols.reduce(function reducer(map, symbol) {
      map[symbol.id] = (map[symbol.id] || 0) + 1;
      return map;
    }, {});
  }

  function evaluateSpin(symbols, betAmount) {
    const counts = countById(symbols);
    const ids = Object.keys(counts);

    if (ids.length === 1) {
      const symbolId = ids[0];
      const multiplier = TRIPLE_MULTIPLIER[symbolId] || 0;
      const payout = roundToCents(betAmount * multiplier);
      return {
        kind: "triple",
        symbolId: symbolId,
        multiplier: multiplier,
        payout: payout,
        isWin: payout > 0
      };
    }

    const pairSymbolId = ids.find(function findPair(id) {
      return counts[id] === 2;
    });

    if (pairSymbolId) {
      const pairMultiplier = PAIR_MULTIPLIER[pairSymbolId] || 0;
      const pairPayout = roundToCents(betAmount * pairMultiplier);
      return {
        kind: "pair",
        symbolId: pairSymbolId,
        multiplier: pairMultiplier,
        payout: pairPayout,
        isWin: pairPayout > 0
      };
    }

    return {
      kind: "loss",
      symbolId: null,
      multiplier: 0,
      payout: 0,
      isWin: false
    };
  }

  function getPaytableRows() {
    return SYMBOLS.map(function mapSymbol(symbol) {
      return {
        symbol: symbol,
        triple: TRIPLE_MULTIPLIER[symbol.id],
        pair: PAIR_MULTIPLIER[symbol.id]
      };
    });
  }

  function calculateTheoreticalRtp() {
    const symbolCount = SYMBOLS.length;
    const tripleProbabilityPerSymbol = 1 / Math.pow(symbolCount, 3);
    const pairProbabilityPerSymbol =
      3 * Math.pow(1 / symbolCount, 2) * (1 - 1 / symbolCount);

    const tripleSum = Object.keys(TRIPLE_MULTIPLIER).reduce(function add(acc, key) {
      return acc + TRIPLE_MULTIPLIER[key];
    }, 0);

    const pairSum = Object.keys(PAIR_MULTIPLIER).reduce(function add(acc, key) {
      return acc + PAIR_MULTIPLIER[key];
    }, 0);

    const expectedReturnPerBet =
      tripleSum * tripleProbabilityPerSymbol + pairSum * pairProbabilityPerSymbol;

    const anyTripleProbability = 1 / Math.pow(symbolCount, 2);
    const anyPairProbability =
      (3 * (symbolCount - 1)) / Math.pow(symbolCount, 2);

    return {
      rtp: expectedReturnPerBet,
      houseEdge: 1 - expectedReturnPerBet,
      probabilityAnyTriple: anyTripleProbability,
      probabilityAnyPair: anyPairProbability,
      probabilityNoWin: 1 - anyTripleProbability - anyPairProbability
    };
  }

  function formatPercent(value) {
    return (value * 100).toFixed(2) + "%";
  }

  function getFairnessInfo() {
    const rtp = calculateTheoreticalRtp();
    return {
      rtpText:
        "Theoretical RTP: " +
        formatPercent(rtp.rtp) +
        " (house edge " +
        formatPercent(rtp.houseEdge) +
        ").",
      oddsText:
        "Hit rates: any 3-of-a-kind " +
        formatPercent(rtp.probabilityAnyTriple) +
        ", any pair " +
        formatPercent(rtp.probabilityAnyPair) +
        ", no-win spin " +
        formatPercent(rtp.probabilityNoWin) +
        "."
    };
  }

  SlotApp.Payouts = {
    SYMBOLS: SYMBOLS,
    evaluateSpin: evaluateSpin,
    getPaytableRows: getPaytableRows,
    getFairnessInfo: getFairnessInfo
  };
})(window);
