const SYMBOL_DEFINITIONS = Object.freeze([
  {
    id: 'spongebob',
    label: 'SpongeBob',
    weight: 18,
    description: 'Bikini Bottom legend.',
    iconPath: 'assets/icons/Spongebob.png'
  },
  {
    id: 'patrick',
    label: 'Patrick',
    weight: 16,
    description: 'Best-friend bonus energy.',
    iconPath: 'assets/icons/Patrick.png'
  },
  {
    id: 'squidward',
    label: 'Squidward',
    weight: 13,
    description: 'Clarinet-level composure.',
    iconPath: 'assets/icons/Squidward_Tentacles.png'
  },
  {
    id: 'sandy',
    label: 'Sandy',
    weight: 12,
    description: 'Science and karate boost.',
    iconPath: 'assets/icons/Sandy.png'
  },
  {
    id: 'mrcrabs',
    label: 'Mr. Krabs',
    weight: 11,
    description: 'Money-minded momentum.',
    iconPath: 'assets/icons/Mr.Crabs.png'
  },
  {
    id: 'gary',
    label: 'Gary',
    weight: 10,
    description: 'Steady snail luck.',
    iconPath: 'assets/icons/Gary.png'
  },
  {
    id: 'pearl',
    label: 'Pearl',
    weight: 9,
    description: 'High-energy combo chance.',
    iconPath: 'assets/icons/Pearl.png'
  },
  {
    id: 'mrspuff',
    label: 'Mrs. Puff',
    weight: 8,
    description: 'Driving-school volatility.',
    iconPath: 'assets/icons/Mrs.Puff.png'
  },
  {
    id: 'plankton',
    label: 'Plankton WILD',
    weight: 3,
    description: 'Wildcard symbol for combo substitution.',
    iconPath: 'assets/icons/Plankton.png'
  }
]);

const SYMBOL_MAP = new Map(SYMBOL_DEFINITIONS.map((symbol) => [symbol.id, symbol]));
const TOTAL_WEIGHT = SYMBOL_DEFINITIONS.reduce((sum, symbol) => sum + symbol.weight, 0);

/**
 * Returns readonly reel symbol metadata.
 * @returns {Array<{id:string,label:string,weight:number,description:string,iconPath:string}>}
 */
export function getAllSymbols() {
  return SYMBOL_DEFINITIONS.slice();
}

/**
 * Returns metadata for a single symbol.
 * @param {string} symbolId
 * @returns {{id:string,label:string,weight:number,description:string,iconPath:string}|undefined}
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
