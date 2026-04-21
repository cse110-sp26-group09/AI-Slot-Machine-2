/**
 * @typedef {{ id: string, label: string, icon: string, imagePath: string, weight: number }} SymbolDef
 */

/** @type {SymbolDef[]} */
export const SYMBOLS = [
  {
    id: "spongebob",
    label: "Spongebob",
    icon: "SP",
    imagePath: "assets/icons/Spongebob.png",
    weight: 3
  },
  {
    id: "patrick",
    label: "Patrick",
    icon: "PA",
    imagePath: "assets/icons/Patrick.png",
    weight: 4
  },
  {
    id: "squidward",
    label: "Squidward",
    icon: "SQ",
    imagePath: "assets/icons/Squidward_Tentacles.png",
    weight: 5
  },
  {
    id: "sandy",
    label: "Sandy",
    icon: "SA",
    imagePath: "assets/icons/Sandy.png",
    weight: 4
  },
  {
    id: "mr-krabs",
    label: "Mr. Krabs",
    icon: "MK",
    imagePath: "assets/icons/Mr.Crabs.png",
    weight: 4
  },
  {
    id: "plankton",
    label: "Plankton",
    icon: "PL",
    imagePath: "assets/icons/Plankton.png",
    weight: 6
  },
  {
    id: "gary",
    label: "Gary",
    icon: "GA",
    imagePath: "assets/icons/Gary.png",
    weight: 6
  },
  {
    id: "mrs-puff",
    label: "Mrs. Puff",
    icon: "MP",
    imagePath: "assets/icons/Mrs.Puff.png",
    weight: 5
  },
  {
    id: "pearl",
    label: "Pearl",
    icon: "PE",
    imagePath: "assets/icons/Pearl.png",
    weight: 5
  }
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
