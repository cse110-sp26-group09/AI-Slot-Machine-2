/**
 * @typedef {{ id: string, label: string, icon: string, weight: number }} SymbolDef
 */

/** @type {SymbolDef[]} */
export const SYMBOLS = [
  { id: "prompt", label: "PROMPT", icon: "P", weight: 6 },
  { id: "token", label: "TOKEN", icon: "T", weight: 5 },
  { id: "model", label: "MODEL", icon: "M", weight: 4 },
  { id: "cache", label: "CACHE", icon: "C", weight: 7 },
  { id: "bug", label: "BUG", icon: "B", weight: 8 },
  { id: "credit", label: "CREDIT", icon: "R", weight: 6 }
];

/**
 * Build a weighted reel strip from symbol definitions.
 * @param {SymbolDef[]} symbols
 * @returns {SymbolDef[]}
 */
function buildWeightedStrip(symbols) {
  return symbols.flatMap((symbol) => Array(symbol.weight).fill(symbol));
}

export const REEL_STRIPS = [
  buildWeightedStrip(SYMBOLS),
  buildWeightedStrip(SYMBOLS),
  buildWeightedStrip(SYMBOLS)
];

/**
 * Returns a random integer in [0, maxExclusive) using crypto RNG.
 * @param {number} maxExclusive
 * @returns {number}
 */
function cryptoIndex(maxExclusive) {
  const bucket = new Uint32Array(1);
  crypto.getRandomValues(bucket);
  return bucket[0] % maxExclusive;
}

/**
 * Spin each reel and return selected symbols.
 * @returns {SymbolDef[]}
 */
export function spinReels() {
  return REEL_STRIPS.map((strip) => strip[cryptoIndex(strip.length)]);
}

/**
 * Human readable RNG description for trust/transparency UI.
 * @returns {string}
 */
export function getRngDescription() {
  return "Spins use browser crypto randomness (crypto.getRandomValues) with fixed, visible reel weights.";
}

/**
 * Format a symbol for display in the reel slot.
 * @param {SymbolDef} symbol
 * @returns {string}
 */
export function formatSymbolForReel(symbol) {
  return `${symbol.icon} ${symbol.label}`;
}
