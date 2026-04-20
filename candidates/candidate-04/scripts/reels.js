/**
 * @typedef {Object} SymbolMeta
 * @property {string} id
 * @property {string} icon
 * @property {string} name
 */

/** @type {SymbolMeta[]} */
export const SYMBOLS = [
  { id: "token", icon: "🪙", name: "Token" },
  { id: "chip", icon: "💾", name: "Inference Chip" },
  { id: "prompt", icon: "📝", name: "Prompt" },
  { id: "bot", icon: "🤖", name: "Assistant" },
  { id: "spark", icon: "⚡", name: "Latency Spark" },
  { id: "brain", icon: "🧠", name: "Foundation Brain" },
  { id: "rocket", icon: "🚀", name: "Launch" },
];

const REEL_STRIPS = [
  ["token", "chip", "prompt", "bot", "token", "spark", "brain", "token", "rocket"],
  ["token", "prompt", "chip", "bot", "token", "spark", "brain", "token", "rocket"],
  ["token", "chip", "prompt", "bot", "token", "spark", "brain", "token", "rocket"],
];

const SYMBOL_MAP = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));

/**
 * Picks one symbol id from a reel strip.
 * @param {string[]} strip
 * @param {() => number} random
 * @returns {string}
 */
function pickFromStrip(strip, random) {
  const index = Math.floor(random() * strip.length);
  return strip[index];
}

/**
 * Generates a result for all 3 reels.
 * @param {() => number} [random]
 * @returns {SymbolMeta[]}
 */
export function spinReels(random = Math.random) {
  return REEL_STRIPS.map((strip) => SYMBOL_MAP.get(pickFromStrip(strip, random)));
}

/**
 * Returns a random symbol (used during reel animation).
 * @param {() => number} [random]
 * @returns {SymbolMeta}
 */
export function getRandomSymbol(random = Math.random) {
  const index = Math.floor(random() * SYMBOLS.length);
  return SYMBOLS[index];
}
