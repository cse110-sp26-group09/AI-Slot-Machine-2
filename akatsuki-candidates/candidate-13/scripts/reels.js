/**
 * @fileoverview Reel symbols and weighted spin utilities.
 */

const SYMBOL_CATALOG = Object.freeze([
  { id: "PAIN", label: "PAIN", icon: "assets/icons/symbol-hieu.png" },
  { id: "ITACHI", label: "ITACHI", icon: "assets/icons/symbol-james.png" },
  { id: "KONAN", label: "KONAN", icon: "assets/icons/symbol-alexis.png" },
  { id: "KISAME", label: "KISAME", icon: "assets/icons/symbol-jason.png" },
  { id: "DEIDARA", label: "DEIDARA", icon: "assets/icons/symbol-daniel.png" },
  { id: "ZETSU", label: "ZETSU", icon: "assets/icons/symbol-woosik.png" },
  { id: "TOBI", label: "TOBI", icon: "assets/icons/symbol-aditya.png" }
]);

export const REEL_SYMBOLS = Object.freeze(SYMBOL_CATALOG.map((symbol) => symbol.id));

export const SYMBOL_META = Object.freeze(
  SYMBOL_CATALOG.reduce((acc, symbol) => {
    acc[symbol.id] = symbol;
    return acc;
  }, {})
);

const REEL_CONFIGS = Object.freeze([
  { symbols: REEL_SYMBOLS, weights: [24, 23, 18, 12, 10, 8, 5] },
  { symbols: REEL_SYMBOLS, weights: [23, 24, 17, 12, 11, 8, 5] },
  { symbols: REEL_SYMBOLS, weights: [24, 22, 18, 11, 10, 9, 6] }
]);

function pickWeightedSymbol(symbols, weights, randomFn) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = randomFn() * total;

  for (let index = 0; index < symbols.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return symbols[index];
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
  const highExcitement = new Set(["PAIN", "ITACHI", "KONAN"]);
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
