/**
 * @typedef {{ id: string, label: string, icon: string, weight: number }} SymbolDef
 */

const TRIPLE_MULTIPLIERS = {
  model: 15,
  token: 12,
  prompt: 10,
  credit: 8,
  cache: 6,
  bug: 3
};

export const PAYTABLE_ROWS = [
  { pattern: "M MODEL x3", payout: "15x bet" },
  { pattern: "T TOKEN x3", payout: "12x bet" },
  { pattern: "P PROMPT x3", payout: "10x bet" },
  { pattern: "R CREDIT x3", payout: "8x bet" },
  { pattern: "C CACHE x3", payout: "6x bet" },
  { pattern: "B BUG x3", payout: "3x bet" },
  { pattern: "Any non-BUG pair", payout: "2x bet" },
  { pattern: "BUG pair", payout: "1x bet (refund)" }
];

/**
 * Evaluate spin outcome for a specific symbol triplet.
 * @param {SymbolDef[]} symbols
 * @param {number} bet
 * @returns {{ payout: number, multiplier: number, line: string }}
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
        line: `${symbols[0].icon} ${symbols[0].label} x3`
      };
    }
  }

  for (const [id, count] of counts.entries()) {
    if (count === 2) {
      const multiplier = id === "bug" ? 1 : 2;
      const pair = symbols.find((symbol) => symbol.id === id);
      return {
        payout: multiplier * bet,
        multiplier,
        line: id === "bug" ? "BUG pair refund" : `${pair ? `${pair.icon} ${pair.label}` : "Pair"} x2`
      };
    }
  }

  return {
    payout: 0,
    multiplier: 0,
    line: "No payout"
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
