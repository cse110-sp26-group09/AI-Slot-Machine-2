/**
 * @typedef {{ id: string, label: string, icon: string, weight: number }} SymbolDef
 */

const TRIPLE_MULTIPLIERS = {
  spongebob: 18,
  patrick: 14,
  squidward: 12,
  sandy: 11,
  "mr-krabs": 10,
  plankton: 8,
  gary: 7,
  "mrs-puff": 6,
  pearl: 5
};

export const PAYTABLE_ROWS = [
  { pattern: "Spongebob x3", payout: "18x bet (Major Win)" },
  { pattern: "Patrick x3", payout: "14x bet (Major Win)" },
  { pattern: "Squidward x3", payout: "12x bet (Major Win)" },
  { pattern: "Sandy x3", payout: "11x bet (Major Win)" },
  { pattern: "Mr. Krabs x3", payout: "10x bet (Major Win)" },
  { pattern: "Plankton x3", payout: "8x bet (Major Win)" },
  { pattern: "Gary x3", payout: "7x bet (Major Win)" },
  { pattern: "Mrs. Puff x3", payout: "6x bet (Major Win)" },
  { pattern: "Pearl x3", payout: "5x bet (Major Win)" },
  { pattern: "Any pair", payout: "2x bet (Minor Win)" }
];

/**
 * Evaluate spin outcome for a specific symbol triplet.
 * @param {SymbolDef[]} symbols
 * @param {number} bet
 * @returns {{ payout: number, multiplier: number, line: string, matchType: "triple" | "pair" | "none", matchedSymbolId: string | null }}
 */
export function evaluateSpin(symbols, bet) {
  const counts = new Map();
  for (const symbol of symbols) {
    counts.set(symbol.id, (counts.get(symbol.id) ?? 0) + 1);
  }

  for (const [id, count] of counts.entries()) {
    if (count === 3) {
      const multiplier = TRIPLE_MULTIPLIERS[id] ?? 0;
      return {
        payout: multiplier * bet,
        multiplier,
        line: `${symbols[0].icon} ${symbols[0].label} x3`,
        matchType: "triple",
        matchedSymbolId: id
      };
    }
  }

  for (const [id, count] of counts.entries()) {
    if (count === 2) {
      const pair = symbols.find((symbol) => symbol.id === id);
      return {
        payout: 2 * bet,
        multiplier: 2,
        line: `${pair ? `${pair.icon} ${pair.label}` : "Pair"} x2`,
        matchType: "pair",
        matchedSymbolId: id
      };
    }
  }

  return {
    payout: 0,
    multiplier: 0,
    line: "No payout",
    matchType: "none",
    matchedSymbolId: null
  };
}

/**
 * Calculate theoretical RTP by enumerating all weighted strip combinations.
 * @param {SymbolDef[][]} reelStrips
 * @returns {number}
 */
export function calculateTheoreticalRtp(reelStrips) {
  const [reelA, reelB, reelC] = reelStrips;
  const totalOutcomes = reelA.length * reelB.length * reelC.length;
  let totalPayout = 0;

  for (const a of reelA) {
    for (const b of reelB) {
      for (const c of reelC) {
        totalPayout += evaluateSpin([a, b, c], 1).payout;
      }
    }
  }

  return (totalPayout / totalOutcomes) * 100;
}
