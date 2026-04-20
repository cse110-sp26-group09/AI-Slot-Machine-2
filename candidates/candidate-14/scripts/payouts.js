export const STARTING_BALANCE = 500;
export const MIN_BET = 5;
export const MAX_BET = 100;
export const BET_STEP = 5;
export const DEFAULT_BET = 10;
export const DEFAULT_LOSS_LIMIT = 200;

export const SYMBOLS = [
  { id: "model", label: "Model", icon: "🤖", weight: 6 },
  { id: "prompt", label: "Prompt", icon: "🧩", weight: 8 },
  { id: "token", label: "Token", icon: "🪙", weight: 12 },
  { id: "credit", label: "Credit", icon: "💳", weight: 12 },
  { id: "compute", label: "Compute", icon: "⚙️", weight: 14 },
  { id: "cache", label: "Cache", icon: "🗂️", weight: 16 },
  { id: "glitch", label: "Glitch", icon: "🐛", weight: 10 }
];

const symbolById = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));

export const PAYTABLE_RULES = [
  {
    id: "triple-model",
    pattern: ["model", "model", "model"],
    label: "Three Models",
    multiplier: 80,
    notes: "Jackpot"
  },
  {
    id: "triple-prompt",
    pattern: ["prompt", "prompt", "prompt"],
    label: "Three Prompts",
    multiplier: 45,
    notes: "Major win"
  },
  {
    id: "triple-token",
    pattern: ["token", "token", "token"],
    label: "Three Tokens",
    multiplier: 25,
    notes: "Strong win"
  },
  {
    id: "triple-credit",
    pattern: ["credit", "credit", "credit"],
    label: "Three Credits",
    multiplier: 18,
    notes: "Strong win"
  },
  {
    id: "triple-compute",
    pattern: ["compute", "compute", "compute"],
    label: "Three Computes",
    multiplier: 14,
    notes: "Solid win"
  },
  {
    id: "triple-cache",
    pattern: ["cache", "cache", "cache"],
    label: "Three Caches",
    multiplier: 10,
    notes: "Solid win"
  },
  {
    id: "pair-token",
    pattern: ["token", "token", "any"],
    label: "Exactly Two Tokens",
    multiplier: 4,
    notes: "Frequent mid-tier hit"
  },
  {
    id: "pair-credit",
    pattern: ["credit", "credit", "any"],
    label: "Exactly Two Credits",
    multiplier: 1.5,
    notes: "Small return"
  },
  {
    id: "pair-cache",
    pattern: ["cache", "cache", "any"],
    label: "Exactly Two Caches",
    multiplier: 2,
    notes: "Break-even or better"
  }
];

const tripleRuleById = new Map();
const pairRuleBySymbolId = new Map();

for (const rule of PAYTABLE_RULES) {
  const [first, second, third] = rule.pattern;
  if (first === second && second === third) {
    tripleRuleById.set(first, rule);
  } else if (third === "any" && first === second) {
    pairRuleBySymbolId.set(first, rule);
  }
}

function countSymbols(reelIds) {
  const counts = new Map();
  for (const reelId of reelIds) {
    counts.set(reelId, (counts.get(reelId) || 0) + 1);
  }
  return counts;
}

function getCombinationText(reelIds) {
  return reelIds
    .map((id) => {
      const symbol = symbolById.get(id);
      return symbol ? symbol.icon : "?";
    })
    .join(" ");
}

/**
 * Evaluate one spin against the paytable.
 * @param {string[]} reelIds
 * @param {number} bet
 */
export function evaluateSpin(reelIds, bet) {
  const counts = countSymbols(reelIds);
  let matchedRule = null;

  for (const [symbolId, count] of counts.entries()) {
    if (count === 3) {
      matchedRule = tripleRuleById.get(symbolId) || null;
      break;
    }
  }

  if (!matchedRule) {
    for (const [symbolId, count] of counts.entries()) {
      if (count === 2 && pairRuleBySymbolId.has(symbolId)) {
        matchedRule = pairRuleBySymbolId.get(symbolId);
        break;
      }
    }
  }

  const multiplier = matchedRule ? matchedRule.multiplier : 0;
  const payout = Math.floor(bet * multiplier);
  const isWin = payout > 0;
  const isJackpot = matchedRule?.id === "triple-model";

  return {
    reelIds: [...reelIds],
    combinationText: getCombinationText(reelIds),
    matchedRule,
    multiplier,
    payout,
    isWin,
    isJackpot
  };
}

export function getSymbol(symbolId) {
  return symbolById.get(symbolId) || null;
}

export function getAllSymbolIds() {
  return SYMBOLS.map((symbol) => symbol.id);
}

export function getRtpEstimate() {
  const symbols = SYMBOLS;
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let expectedReturn = 0;

  for (const first of symbols) {
    for (const second of symbols) {
      for (const third of symbols) {
        const probability =
          (first.weight / totalWeight) *
          (second.weight / totalWeight) *
          (third.weight / totalWeight);
        const evaluation = evaluateSpin([first.id, second.id, third.id], 1);
        expectedReturn += probability * evaluation.multiplier;
      }
    }
  }

  return {
    rtp: expectedReturn,
    rtpPercent: Number((expectedReturn * 100).toFixed(2)),
    houseEdgePercent: Number(((1 - expectedReturn) * 100).toFixed(2))
  };
}

export function formatTokens(value) {
  return Number(value).toLocaleString("en-US");
}

