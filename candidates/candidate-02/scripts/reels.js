/**
 * Symbol definitions and weighted reel behavior.
 * We keep this module pure so game logic can test it in isolation.
 */
const REEL_SYMBOLS = [
  { id: "TOKEN", weight: 1 },
  { id: "GPT", weight: 2 },
  { id: "PROMPT", weight: 3 },
  { id: "MODEL", weight: 3 },
  { id: "API", weight: 4 },
  { id: "GPU", weight: 4 },
  { id: "BUG", weight: 5 },
  { id: "404", weight: 5 }
];

export const ALL_SYMBOLS = REEL_SYMBOLS.map((entry) => entry.id);

const WEIGHT_TOTAL = REEL_SYMBOLS.reduce((total, entry) => total + entry.weight, 0);

/**
 * @param {() => number} randomFn random number provider, expected range [0,1)
 * @returns {string}
 */
function pickWeightedSymbol(randomFn = Math.random) {
  const threshold = randomFn() * WEIGHT_TOTAL;
  let running = 0;

  for (const entry of REEL_SYMBOLS) {
    running += entry.weight;
    if (threshold < running) {
      return entry.id;
    }
  }

  return REEL_SYMBOLS[REEL_SYMBOLS.length - 1].id;
}

/**
 * @param {() => number} randomFn random number provider, expected range [0,1)
 * @returns {{ symbols: [string, string, string] }}
 */
export function spinReels(randomFn = Math.random) {
  return {
    symbols: [pickWeightedSymbol(randomFn), pickWeightedSymbol(randomFn), pickWeightedSymbol(randomFn)]
  };
}
