/**
 * Symbol definitions and payout rules for the slot machine.
 */
const SYMBOLS = Object.freeze([
  { id: "token", label: "Token", glyph: "◎", weight: 24, tripleMultiplier: 2 },
  { id: "prompt", label: "Prompt", glyph: "✍", weight: 20, tripleMultiplier: 3 },
  { id: "agent", label: "Agent", glyph: "🤖", weight: 15, tripleMultiplier: 4 },
  { id: "gpu", label: "GPU", glyph: "⚙", weight: 12, tripleMultiplier: 6 },
  { id: "unicorn", label: "Unicorn", glyph: "🦄", weight: 6, tripleMultiplier: 10 },
  { id: "wild", label: "Wildcard", glyph: "✨", weight: 4, tripleMultiplier: 12, isWild: true },
  { id: "bug", label: "Bug", glyph: "🐞", weight: 19, tripleMultiplier: 1 }
]);

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
const SYMBOL_BY_ID = SYMBOLS.reduce((map, symbol) => {
  map[symbol.id] = symbol;
  return map;
}, {});

/**
 * Draws one weighted random symbol.
 * @param {() => number} randomFn
 * @returns {{id: string, label: string, glyph: string, weight: number, tripleMultiplier: number, isWild?: boolean}}
 */
export function drawRandomSymbol(randomFn = Math.random) {
  const roll = randomFn() * TOTAL_WEIGHT;
  let cursor = 0;

  for (const symbol of SYMBOLS) {
    cursor += symbol.weight;
    if (roll <= cursor) {
      return symbol;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1];
}

/**
 * @param {{glyph: string, label: string}} symbol
 * @returns {string}
 */
export function formatSymbolDisplay(symbol) {
  return `${symbol.glyph} ${symbol.label}`;
}

/**
 * @param {number} multiplier
 * @returns {"small" | "big" | "jackpot"}
 */
function resolveTier(multiplier) {
  if (multiplier >= 8) {
    return "jackpot";
  }

  if (multiplier >= 4) {
    return "big";
  }

  return "small";
}

/**
 * @param {Array<{id: string}>} symbols
 * @param {number} wager
 * @returns {{isWin: boolean, payout: number, netGain: number, tone: "win" | "loss", tier: "none" | "small" | "big" | "jackpot", message: string}}
 */
export function evaluateSpin(symbols, wager) {
  const symbolIds = symbols.map((symbol) => symbol.id);
  const counts = symbolIds.reduce((map, id) => {
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});

  const wildCount = counts.wild || 0;
  const nonWildEntries = Object.entries(counts).filter(([id]) => id !== "wild");

  if (wildCount === 3) {
    const multiplier = SYMBOL_BY_ID.wild.tripleMultiplier;
    const payout = wager * multiplier;

    return {
      isWin: true,
      payout,
      netGain: payout - wager,
      tone: "win",
      tier: resolveTier(multiplier),
      message: "Triple Wildcards! Corporate AI budget unlocked."
    };
  }

  const tripleCandidate = nonWildEntries.find(([, count]) => count + wildCount === 3);
  if (tripleCandidate) {
    const [symbolId, count] = tripleCandidate;
    const baseMultiplier = SYMBOL_BY_ID[symbolId].tripleMultiplier;
    const multiplier = count === 3
      ? baseMultiplier
      : Math.max(2, Math.ceil(baseMultiplier * 0.8));
    const payout = wager * multiplier;

    return {
      isWin: true,
      payout,
      netGain: payout - wager,
      tone: "win",
      tier: resolveTier(multiplier),
      message: wildCount > 0
        ? `Wildcard patched your ${SYMBOL_BY_ID[symbolId].label} stack.`
        : `Three ${SYMBOL_BY_ID[symbolId].label}s! Model upgrade approved.`
    };
  }

  const pairEntry = nonWildEntries.find(([, count]) => count === 2);
  if (pairEntry) {
    const [symbolId] = pairEntry;
    const payout = Math.ceil(wager * 1.5);

    return {
      isWin: true,
      payout,
      netGain: payout - wager,
      tone: "win",
      tier: "small",
      message: `Pair of ${SYMBOL_BY_ID[symbolId].label}s. Minor token rebate secured.`
    };
  }

  if (wildCount === 1) {
    const payout = wager;
    return {
      isWin: true,
      payout,
      netGain: 0,
      tone: "win",
      tier: "small",
      message: "Wildcard softened the loss. You broke even on this spin."
    };
  }

  return {
    isWin: false,
    payout: 0,
    netGain: -wager,
    tone: "loss",
    tier: "none",
    message: "No payout. Prompt budget consumed by inference latency."
  };
}

export { SYMBOLS };
