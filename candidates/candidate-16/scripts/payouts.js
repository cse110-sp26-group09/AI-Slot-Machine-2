const THREE_OF_A_KIND = Object.freeze({
  MODEL: 20,
  GPU: 15,
  TOKEN: 12,
  PROMPT: 10,
  CACHE: 8,
  GLITCH: 5,
});

const SYMBOL_NAMES = Object.freeze({
  MODEL: "Pain",
  GPU: "Itachi",
  TOKEN: "Konan",
  PROMPT: "Obito",
  CACHE: "Kisame",
  GLITCH: "Deidara",
});

const AI_STACK_COMBO = Object.freeze(["PROMPT", "TOKEN", "MODEL"]);
const AI_STACK_MULTIPLIER = 8;
const TWO_MATCH_MULTIPLIER = 1.1;

export const PAYTABLE_ROWS = Object.freeze([
  { key: "MODEL3", pattern: "3x Pain", multiplier: "20x" },
  { key: "GPU3", pattern: "3x Itachi", multiplier: "15x" },
  { key: "TOKEN3", pattern: "3x Konan", multiplier: "12x" },
  { key: "PROMPT3", pattern: "3x Obito", multiplier: "10x" },
  { key: "CACHE3", pattern: "3x Kisame", multiplier: "8x" },
  { key: "GLITCH3", pattern: "3x Deidara", multiplier: "5x" },
  { key: "STACK", pattern: "Obito + Konan + Pain", multiplier: "8x" },
  { key: "PAIR", pattern: "Any 2 matching symbols", multiplier: "1.1x" },
]);

/**
 * Evaluate one spin.
 * @param {string[]} symbols
 * @param {number} bet
 * @returns {{
 *   payout: number,
 *   multiplier: number,
 *   title: string,
 *   lineType: "jackpot" | "win" | "push" | "loss",
 *   spinNet: number
 * }}
 */
export function evaluateSpin(symbols, bet) {
  const outcome = evaluateOutcome(symbols);
  const payout = Math.floor(bet * outcome.multiplier);
  const spinNet = payout - bet;

  let lineType = "loss";
  if (payout > 0 && spinNet > 0) {
    lineType = outcome.multiplier >= 8 ? "jackpot" : "win";
  } else if (payout === bet) {
    lineType = "push";
  }

  return {
    payout,
    multiplier: outcome.multiplier,
    title: outcome.title,
    lineType,
    spinNet,
  };
}

/**
 * Long-run theoretical RTP using symbol probabilities and pay rules.
 * @param {{id: string, weight: number}[]} symbols
 * @returns {number}
 */
export function calculateTheoreticalRtp(symbols) {
  const totalWeight = symbols.reduce((sum, item) => sum + item.weight, 0);
  const probabilities = symbols.map((item) => ({
    id: item.id,
    probability: item.weight / totalWeight,
  }));

  let expectedMultiplier = 0;
  for (const first of probabilities) {
    for (const second of probabilities) {
      for (const third of probabilities) {
        const combo = [first.id, second.id, third.id];
        const probability = first.probability * second.probability * third.probability;
        expectedMultiplier += evaluateOutcome(combo).multiplier * probability;
      }
    }
  }

  return expectedMultiplier * 100;
}

/**
 * @param {string[]} symbols
 * @returns {{multiplier: number, title: string}}
 */
function evaluateOutcome(symbols) {
  const [a, b, c] = symbols;

  if (a === b && b === c) {
    const multiplier = THREE_OF_A_KIND[a] ?? 0;
    const symbolName = SYMBOL_NAMES[a] ?? a;
    return {
      multiplier,
      title: `Three ${symbolName} symbols`,
    };
  }

  if (isAiStackCombo(symbols)) {
    return {
      multiplier: AI_STACK_MULTIPLIER,
      title: "Akatsuki trinity combo",
    };
  }

  if (hasPair(symbols)) {
    return {
      multiplier: TWO_MATCH_MULTIPLIER,
      title: "Matching pair payout",
    };
  }

  return {
    multiplier: 0,
    title: "No payout",
  };
}

/**
 * @param {string[]} symbols
 * @returns {boolean}
 */
function isAiStackCombo(symbols) {
  const sorted = [...symbols].sort();
  const target = [...AI_STACK_COMBO].sort();
  return sorted.every((value, index) => value === target[index]);
}

/**
 * @param {string[]} symbols
 * @returns {boolean}
 */
function hasPair(symbols) {
  return symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2];
}
