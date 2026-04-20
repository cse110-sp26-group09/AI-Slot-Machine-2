/**
 * Reel model and randomness utilities.
 * Uses weighted symbol stops and crypto-grade random selection when available.
 * @typedef {{id: string, label: string, title: string}} ReelSymbol
 * @typedef {Record<string, number>} ReelWeights
 */

/** @type {ReadonlyArray<ReelSymbol>} */
export const SYMBOLS = Object.freeze([
  { id: "gpt", label: "GPT", title: "Flagship Model" },
  { id: "token", label: "TOKEN", title: "Token Cache" },
  { id: "prompt", label: "PROMPT", title: "Prompt Craft" },
  { id: "vector", label: "VECTOR", title: "Vector Store" },
  { id: "credit", label: "CREDIT", title: "Credit Bundle" },
  { id: "cache", label: "CACHE", title: "Cache Hit" },
  { id: "bug", label: "BUG", title: "Inference Glitch" }
]);

/** @type {ReadonlyArray<ReelWeights>} */
const REEL_WEIGHT_SETS = Object.freeze([
  { gpt: 4, token: 6, prompt: 8, vector: 9, credit: 10, cache: 11, bug: 6 },
  { gpt: 5, token: 7, prompt: 8, vector: 8, credit: 10, cache: 10, bug: 7 },
  { gpt: 4, token: 8, prompt: 7, vector: 9, credit: 10, cache: 10, bug: 7 }
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
