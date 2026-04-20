export const REEL_SYMBOLS = Object.freeze([
  "PROMPT",
  "TOKEN",
  "MODEL",
  "GPU",
  "CACHE",
  "CREDIT",
  "404"
]);

const REEL_CONFIGS = Object.freeze([
  { symbols: REEL_SYMBOLS, weights: [24, 23, 18, 12, 10, 8, 5] },
  { symbols: REEL_SYMBOLS, weights: [23, 24, 17, 12, 11, 8, 5] },
  { symbols: REEL_SYMBOLS, weights: [24, 22, 18, 11, 10, 9, 6] }
]);

function pickWeightedSymbol(symbols, weights, randomFn) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = randomFn() * total;

  for (let i = 0; i < symbols.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) {
      return symbols[i];
    }
  }

  return symbols[symbols.length - 1];
}

export function generateSpinResult(randomFn = Math.random) {
  return REEL_CONFIGS.map((reel) =>
    pickWeightedSymbol(reel.symbols, reel.weights, randomFn)
  );
}

export function isNearMiss(symbols) {
  const highExcitement = new Set(["GPU", "CACHE", "MODEL"]);
  const counts = new Map();

  symbols.forEach((symbol) => {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  });

  for (const [symbol, count] of counts.entries()) {
    if (count === 2 && highExcitement.has(symbol)) {
      return true;
    }
  }

  return false;
}
