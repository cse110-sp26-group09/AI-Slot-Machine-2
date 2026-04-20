/**
 * @typedef {Object} PayoutResult
 * @property {number} payout
 * @property {boolean} won
 * @property {string} message
 */

const THREE_OF_KIND_PAYOUTS = {
  token: 30,
  chip: 40,
  prompt: 45,
  bot: 60,
  spark: 70,
  brain: 90,
  rocket: 120,
};

/**
 * Calculates payout and status message.
 * @param {{ id: string, name: string }[]} symbols
 * @param {number} betAmount
 * @returns {PayoutResult}
 */
export function calculatePayout(symbols, betAmount) {
  const ids = symbols.map((symbol) => symbol.id);
  const counts = ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  const [bestId, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (bestCount === 3) {
    const multiplier = THREE_OF_KIND_PAYOUTS[bestId] || 25;
    const payout = Math.round((betAmount * multiplier) / 10);
    return {
      won: true,
      payout,
      message: `Jackpot! Triple ${symbols[0].name} paid ${payout} tokens.`,
    };
  }

  if (bestCount === 2) {
    const payout = Math.round(betAmount * 1.8);
    return {
      won: true,
      payout,
      message: `Pair hit. The model smiled and returned ${payout} tokens.`,
    };
  }

  if (ids.includes("token") && ids.includes("prompt")) {
    const payout = Math.round(betAmount * 1.2);
    return {
      won: true,
      payout,
      message: `Prompt engineering rebate: +${payout} tokens.`,
    };
  }

  return {
    won: false,
    payout: 0,
    message: "No payout. Your context window evaporated.",
  };
}
