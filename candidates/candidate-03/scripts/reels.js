/**
 * Weighted reel symbols for the AI satire slot machine.
 * A lower weight means a rarer symbol.
 */
export const REEL_SYMBOLS = Object.freeze([
  { id: "PROMPT", label: "Prompt", emoji: "💬", weight: 18 },
  { id: "TOKEN", label: "Token", emoji: "🪙", weight: 20 },
  { id: "GPU", label: "GPU", emoji: "🖥️", weight: 12 },
  { id: "AGENT", label: "Agent", emoji: "🤖", weight: 10 },
  { id: "RATE_LIMIT", label: "Rate Limit", emoji: "⏳", weight: 7 },
  { id: "HALLUCINATION", label: "Hallucination", emoji: "🫥", weight: 5 },
]);

const symbolById = new Map(REEL_SYMBOLS.map((symbol) => [symbol.id, symbol]));

const totalWeight = REEL_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

/**
 * @param {string} id
 * @returns {{ id: string, label: string, emoji: string, weight: number }}
 */
export function getSymbolById(id) {
  const symbol = symbolById.get(id);
  if (!symbol) {
    throw new Error(`Unknown symbol id: ${id}`);
  }

  return symbol;
}

/**
 * Returns a random symbol id based on configured weights.
 * @param {() => number} rng
 * @returns {string}
 */
export function pickWeightedSymbolId(rng = Math.random) {
  const roll = rng() * totalWeight;
  let runningWeight = 0;

  for (const symbol of REEL_SYMBOLS) {
    runningWeight += symbol.weight;
    if (roll < runningWeight) {
      return symbol.id;
    }
  }

  return REEL_SYMBOLS[REEL_SYMBOLS.length - 1].id;
}

/**
 * Spin three reels and return both ids and symbol objects.
 * @param {() => number} rng
 * @returns {{ ids: string[], symbols: { id: string, label: string, emoji: string, weight: number }[] }}
 */
export function spinReels(rng = Math.random) {
  const ids = [pickWeightedSymbolId(rng), pickWeightedSymbolId(rng), pickWeightedSymbolId(rng)];
  const symbols = ids.map((id) => getSymbolById(id));
  return { ids, symbols };
}
