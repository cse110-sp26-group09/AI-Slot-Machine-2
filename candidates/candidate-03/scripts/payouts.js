/**
 * Match rewards are multipliers against the spin cost.
 */
const TRIPLE_MULTIPLIERS = Object.freeze({
  TOKEN: 5,
  PROMPT: 6,
  GPU: 8,
  AGENT: 10,
  RATE_LIMIT: 12,
  HALLUCINATION: 15,
});

/**
 * @param {string[]} symbolIds
 * @param {number} spinCost
 * @returns {{
 *  winAmount: number,
 *  multiplier: number,
 *  didWin: boolean,
 *  tier: "none" | "small" | "big" | "jackpot",
 *  message: string
 * }}
 */
export function evaluatePayout(symbolIds, spinCost) {
  if (!Array.isArray(symbolIds) || symbolIds.length !== 3) {
    throw new Error("Payout requires exactly three symbols.");
  }

  const counts = symbolIds.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  const uniqueCount = Object.keys(counts).length;

  if (uniqueCount === 1) {
    const id = symbolIds[0];
    const multiplier = TRIPLE_MULTIPLIERS[id] || 5;
    return {
      winAmount: spinCost * multiplier,
      multiplier,
      didWin: true,
      tier: multiplier >= 12 ? "jackpot" : "big",
      message: `Triple ${prettyName(id)}! ${multiplier}x payout unlocked.`,
    };
  }

  const isModelPipeline =
    symbolIds.join("-") === "PROMPT-TOKEN-AGENT" ||
    symbolIds.join("-") === "AGENT-TOKEN-PROMPT";

  if (isModelPipeline) {
    return {
      winAmount: spinCost * 4,
      multiplier: 4,
      didWin: true,
      tier: "big",
      message: "Prompt -> Token -> Agent pipeline shipped. 4x payout.",
    };
  }

  if (uniqueCount === 2) {
    return {
      winAmount: spinCost * 2,
      multiplier: 2,
      didWin: true,
      tier: "small",
      message: "Two of a kind. Your model barely converged. 2x payout.",
    };
  }

  return {
    winAmount: 0,
    multiplier: 0,
    didWin: false,
    tier: "none",
    message: "No match. Tokens burned on prompt experiments.",
  };
}

/**
 * @param {string} id
 * @returns {string}
 */
function prettyName(id) {
  return id.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}
