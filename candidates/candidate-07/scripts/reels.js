const SYMBOL_DEFINITIONS = Object.freeze([
  {
    id: 'prompt',
    label: 'PROMPT',
    weight: 20,
    description: 'Carefully engineered prompt.'
  },
  {
    id: 'token',
    label: 'TOKEN',
    weight: 18,
    description: 'The universal unit of AI spend.'
  },
  {
    id: 'credit',
    label: 'CREDIT',
    weight: 16,
    description: 'Cloud credits that disappear fast.'
  },
  {
    id: 'model',
    label: 'MODEL',
    weight: 14,
    description: 'New model release energy.'
  },
  {
    id: 'cache',
    label: 'CACHE',
    weight: 12,
    description: 'Cache hit. Latency drops.'
  },
  {
    id: 'gpu',
    label: 'GPU',
    weight: 10,
    description: 'A very expensive accelerant.'
  },
  {
    id: 'latency',
    label: 'LATENCY',
    weight: 8,
    description: 'Waiting on inference.'
  },
  {
    id: 'wild',
    label: 'WILD',
    weight: 2,
    description: 'Acts as any symbol for payouts.'
  }
]);

const SYMBOL_MAP = new Map(SYMBOL_DEFINITIONS.map((symbol) => [symbol.id, symbol]));
const TOTAL_WEIGHT = SYMBOL_DEFINITIONS.reduce((sum, symbol) => sum + symbol.weight, 0);

/**
 * Returns readonly reel symbol metadata.
 * @returns {Array<{id:string,label:string,weight:number,description:string}>}
 */
export function getAllSymbols() {
  return SYMBOL_DEFINITIONS.slice();
}

/**
 * Returns metadata for a single symbol.
 * @param {string} symbolId
 * @returns {{id:string,label:string,weight:number,description:string}|undefined}
 */
export function getSymbolById(symbolId) {
  return SYMBOL_MAP.get(symbolId);
}

/**
 * Returns symbol probabilities based on configured weights.
 * @returns {Array<{id:string, probability:number}>}
 */
export function getSymbolProbabilities() {
  return SYMBOL_DEFINITIONS.map((symbol) => ({
    id: symbol.id,
    probability: symbol.weight / TOTAL_WEIGHT
  }));
}

/**
 * Generates secure random values using browser crypto APIs.
 * @returns {number}
 */
function secureRandomUnit() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] / 4294967296;
}

/**
 * Picks one weighted symbol id.
 * @returns {string}
 */
function pickWeightedSymbol() {
  const randomValue = secureRandomUnit();
  let cumulative = 0;

  for (const symbol of SYMBOL_DEFINITIONS) {
    cumulative += symbol.weight / TOTAL_WEIGHT;
    if (randomValue < cumulative) {
      return symbol.id;
    }
  }

  return SYMBOL_DEFINITIONS[SYMBOL_DEFINITIONS.length - 1].id;
}

/**
 * Spins a given number of reels.
 * @param {number} reelCount
 * @returns {string[]}
 */
export function spinReels(reelCount = 3) {
  const safeReelCount = Number.isInteger(reelCount) && reelCount > 0 ? reelCount : 3;
  return Array.from({ length: safeReelCount }, () => pickWeightedSymbol());
}
