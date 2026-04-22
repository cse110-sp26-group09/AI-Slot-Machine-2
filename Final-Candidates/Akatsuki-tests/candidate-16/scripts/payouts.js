import { REEL_SYMBOLS } from "./reels.js";

const TRIPLE_MULTIPLIERS = Object.freeze({
  NAGATO: 9,
  KONAN: 11,
  ITACHI: 13,
  KISAME: 16,
  SASORI: 19,
  DEIDARA: 24,
  HIDAN: 30,
  KAKUZU: 38,
  TOBI: 50,
  ZETSU: 64,
  OBITO: 92,
  YAHIKO: 140,
});

const AKATSUKI_ALIGNMENT_COMBO = Object.freeze(["NAGATO", "KONAN", "OBITO"]);
const AKATSUKI_ALIGNMENT_MULTIPLIER = 18;
const TWO_MATCH_MULTIPLIER = 1.1;
const JACKPOT_MULTIPLIER = 30;

const SYMBOL_META_BY_ID = new Map(REEL_SYMBOLS.map((symbol) => [symbol.id, symbol]));

const tripleRows = REEL_SYMBOLS.map((symbol) => ({
  key: `${symbol.id}3`,
  pattern: `3x ${symbol.name}`,
  multiplier: `${TRIPLE_MULTIPLIERS[symbol.id]}x`,
  icon: symbol.icon,
}));

export const PAYTABLE_ROWS = Object.freeze([
  ...tripleRows,
  {
    key: "ALIGNMENT",
    pattern: "Nagato + Konan + Obito (any order)",
    multiplier: `${AKATSUKI_ALIGNMENT_MULTIPLIER}x`,
    icon: null,
  },
  {
    key: "PAIR",
    pattern: "Any 2 matching symbols",
    multiplier: `${TWO_MATCH_MULTIPLIER}x`,
    icon: null,
  },
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
  if (payout > 0) {
    lineType = outcome.multiplier >= JACKPOT_MULTIPLIER && spinNet > 0 ? "jackpot" : "win";
  }
  if (payout === bet) {
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
    const multiplier = TRIPLE_MULTIPLIERS[a] ?? 0;
    const symbolName = SYMBOL_META_BY_ID.get(a)?.name ?? a;
    return {
      multiplier,
      title: `Three ${symbolName} symbols`,
    };
  }

  if (isAkatsukiAlignment(symbols)) {
    return {
      multiplier: AKATSUKI_ALIGNMENT_MULTIPLIER,
      title: "Akatsuki alignment combo",
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
function isAkatsukiAlignment(symbols) {
  const sorted = [...symbols].sort();
  const target = [...AKATSUKI_ALIGNMENT_COMBO].sort();
  return sorted.every((value, index) => value === target[index]);
}

/**
 * @param {string[]} symbols
 * @returns {boolean}
 */
function hasPair(symbols) {
  return symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2];
}
