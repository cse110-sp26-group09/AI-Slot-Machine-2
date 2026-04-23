/**
 * Reel model and randomness utilities.
 * Uses weighted symbol stops and crypto-grade random selection when available.
 * @typedef {{id: string, label: string, title: string, icon: string}} ReelSymbol
 * @typedef {Record<string, number>} ReelWeights
 */

/** @type {ReadonlyArray<ReelSymbol>} */
export const SYMBOLS = Object.freeze([
  {
    id: "spongebob",
    label: "Spongebob",
    title: "Spongebob Squarepants",
    icon: "assets/icons/Spongebob.png"
  },
  {
    id: "patrick",
    label: "Patrick",
    title: "Patrick Star",
    icon: "assets/icons/Patrick.png"
  },
  {
    id: "sandy",
    label: "Sandy",
    title: "Sandy Cheeks",
    icon: "assets/icons/Sandy.png"
  },
  {
    id: "squidward",
    label: "Squidward",
    title: "Squidward Tentacles",
    icon: "assets/icons/Squidward_Tentacles.png"
  },
  {
    id: "mrkrabs",
    label: "Mr. Krabs",
    title: "Mr. Krabs",
    icon: "assets/icons/Mr.Crabs.png"
  },
  {
    id: "mrspuff",
    label: "Mrs. Puff",
    title: "Mrs. Puff",
    icon: "assets/icons/Mrs.Puff.png"
  },
  {
    id: "gary",
    label: "Gary",
    title: "Gary the Snail",
    icon: "assets/icons/Gary.png"
  },
  {
    id: "pearl",
    label: "Pearl",
    title: "Pearl Krabs",
    icon: "assets/icons/Pearl.png"
  },
  {
    id: "plankton",
    label: "Plankton",
    title: "Plankton",
    icon: "assets/icons/Plankton.png"
  }
]);

/** @type {ReadonlyArray<ReelWeights>} */
const REEL_WEIGHT_SETS = Object.freeze([
  {
    spongebob: 6,
    patrick: 7,
    sandy: 7,
    squidward: 8,
    mrkrabs: 6,
    mrspuff: 9,
    gary: 9,
    pearl: 8,
    plankton: 6
  },
  {
    spongebob: 6,
    patrick: 8,
    sandy: 7,
    squidward: 8,
    mrkrabs: 7,
    mrspuff: 8,
    gary: 9,
    pearl: 7,
    plankton: 6
  },
  {
    spongebob: 6,
    patrick: 7,
    sandy: 8,
    squidward: 7,
    mrkrabs: 7,
    mrspuff: 8,
    gary: 9,
    pearl: 8,
    plankton: 6
  }
]);

/**
 * @param {ReelWeights} weightMap
 * @returns {string[]}
 */
function buildReelStops(weightMap) {
  const stops = [];

  Object.entries(weightMap).forEach(([symbolId, weight]) => {
    for (let index = 0; index < weight; index += 1) {
      stops.push(symbolId);
    }
  });

  return stops;
}

export const REELS = REEL_WEIGHT_SETS.map(buildReelStops);

/**
 * @param {number} maxExclusive
 * @returns {number}
 */
function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    return 0;
  }

  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

/**
 * @param {string[]} reelStops
 * @returns {string}
 */
function pickFromReel(reelStops) {
  const stopIndex = secureRandomInt(reelStops.length);
  return reelStops[stopIndex];
}

/**
 * @returns {string[]}
 */
export function spinReels() {
  return REELS.map((reelStops) => pickFromReel(reelStops));
}

/**
 * @returns {string}
 */
export function getRandomSymbolId() {
  const symbolIndex = secureRandomInt(SYMBOLS.length);
  return SYMBOLS[symbolIndex].id;
}

/**
 * @param {string} symbolId
 * @returns {ReelSymbol}
 */
export function getSymbolById(symbolId) {
  return SYMBOLS.find((symbol) => symbol.id === symbolId) ?? SYMBOLS[0];
}

export function getReelDistributions() {
  return REELS.map((reelStops) => {
    const counts = {};

    reelStops.forEach((symbolId) => {
      counts[symbolId] = (counts[symbolId] ?? 0) + 1;
    });

    return {
      totalStops: reelStops.length,
      counts
    };
  });
}
