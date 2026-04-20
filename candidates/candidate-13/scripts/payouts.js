const THREE_MATCH_PAYOUTS = Object.freeze({
  GPU: 25,
  CACHE: 20,
  MODEL: 15,
  CREDIT: 10,
  TOKEN: 8,
  PROMPT: 5,
  "404": 1
});

export const THEORETICAL_RTP = 95.2;

/**
 * Evaluate payout from three reel symbols.
 * @param {string[]} symbols
 * @param {number} bet
 * @returns {{multiplier: number, payout: number, reason: string}}
 */
export function evaluatePayout(symbols, bet) {
  const [a, b, c] = symbols;

  if (a === b && b === c) {
    const multiplier = THREE_MATCH_PAYOUTS[a] || 0;
    return {
      multiplier,
      payout: Math.floor(bet * multiplier),
      reason: `${a} x3`
    };
  }

  const hasPair = a === b || b === c || a === c;
  if (hasPair) {
    return {
      multiplier: 0.5,
      payout: Math.floor(bet * 0.5),
      reason: "Any matching pair"
    };
  }

  return {
    multiplier: 0,
    payout: 0,
    reason: "No match"
  };
}

export function getPaytableRows() {
  return [
    { match: "GPU GPU GPU", payout: "25x", notes: "Jackpot cluster" },
    { match: "CACHE CACHE CACHE", payout: "20x", notes: "Compute cache blast" },
    { match: "MODEL MODEL MODEL", payout: "15x", notes: "Model sync" },
    { match: "CREDIT CREDIT CREDIT", payout: "10x", notes: "Credit flood" },
    { match: "TOKEN TOKEN TOKEN", payout: "8x", notes: "Token run" },
    { match: "PROMPT PROMPT PROMPT", payout: "5x", notes: "Prompt chain" },
    { match: "404 404 404", payout: "1x", notes: "Break-even meme line" },
    { match: "Any 2 matching symbols", payout: "0.5x", notes: "Partial rebate" },
    { match: "No match", payout: "0x", notes: "No payout" }
  ];
}
