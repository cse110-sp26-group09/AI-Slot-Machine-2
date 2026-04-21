const THREE_MATCH_PAYOUTS = Object.freeze({
  PAIN: 25,
  ITACHI: 20,
  KONAN: 15,
  KISAME: 10,
  DEIDARA: 8,
  TOBI: 5,
  ZETSU: 1
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
    { match: "PAIN PAIN PAIN", payout: "25x", notes: "Legendary jackpot symbol" },
    { match: "ITACHI ITACHI ITACHI", payout: "20x", notes: "High-tier assault" },
    { match: "KONAN KONAN KONAN", payout: "15x", notes: "Major win tier" },
    { match: "KISAME KISAME KISAME", payout: "10x", notes: "Strong payout" },
    { match: "DEIDARA DEIDARA DEIDARA", payout: "8x", notes: "Explosive boost" },
    { match: "TOBI TOBI TOBI", payout: "5x", notes: "Mid-tier return" },
    { match: "ZETSU ZETSU ZETSU", payout: "1x", notes: "Break-even line" },
    { match: "Any 2 matching symbols", payout: "0.5x", notes: "Partial rebate" },
    { match: "No match", payout: "0x", notes: "No payout" }
  ];
}
