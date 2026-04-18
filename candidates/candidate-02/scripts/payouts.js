/**
 * Payout table and result scoring.
 */
const PAYOUT_MULTIPLIERS = {
  JACKPOT_TOKEN: 20,
  JACKPOT_GPT: 12,
  TRIPLE_DEFAULT: 8,
  PROMPT_CHAIN: 4,
  DOUBLE: 2
};

/**
 * @param {[string, string, string]} symbols
 * @param {number} spinCost
 * @returns {{ winTokens: number, tier: "none" | "small" | "big" | "jackpot", message: string }}
 */
export function evaluateSpin(symbols, spinCost) {
  const [left, middle, right] = symbols;
  const isTriple = left === middle && middle === right;

  if (isTriple) {
    if (left === "TOKEN") {
      return {
        winTokens: spinCost * PAYOUT_MULTIPLIERS.JACKPOT_TOKEN,
        tier: "jackpot",
        message: "TOKEN TOKEN TOKEN! Venture capital unlocked."
      };
    }

    if (left === "GPT") {
      return {
        winTokens: spinCost * PAYOUT_MULTIPLIERS.JACKPOT_GPT,
        tier: "jackpot",
        message: "Triple GPT. You monetized autocomplete again."
      };
    }

    return {
      winTokens: spinCost * PAYOUT_MULTIPLIERS.TRIPLE_DEFAULT,
      tier: "big",
      message: `Triple ${left}. You sold an AI roadmap deck.`
    };
  }

  const hasPromptChain = [left, middle, right].includes("PROMPT")
    && [left, middle, right].includes("MODEL")
    && [left, middle, right].includes("TOKEN");

  if (hasPromptChain) {
    return {
      winTokens: spinCost * PAYOUT_MULTIPLIERS.PROMPT_CHAIN,
      tier: "big",
      message: "Prompt + Model + Token combo. Product-market fit theater!"
    };
  }

  if (left === middle || middle === right || left === right) {
    return {
      winTokens: spinCost * PAYOUT_MULTIPLIERS.DOUBLE,
      tier: "small",
      message: "Two symbols matched. You earned enough for one more inference."
    };
  }

  return {
    winTokens: 0,
    tier: "none",
    message: "No match. The cloud bill still arrived."
  };
}
