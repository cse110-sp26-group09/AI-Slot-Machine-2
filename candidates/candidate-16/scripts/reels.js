/**
 * Symbol catalog and reel behavior.
 */
export const REEL_SYMBOLS = Object.freeze([
  {
    id: "MODEL",
    name: "Pain",
    glyph: "PAIN",
    icon: "assets/icons/symbol-hieu.png",
    weight: 14,
  },
  {
    id: "GPU",
    name: "Itachi",
    glyph: "ITACHI",
    icon: "assets/icons/symbol-jason.png",
    weight: 15,
  },
  {
    id: "TOKEN",
    name: "Konan",
    glyph: "KONAN",
    icon: "assets/icons/symbol-woosik.png",
    weight: 17,
  },
  {
    id: "PROMPT",
    name: "Obito",
    glyph: "OBITO",
    icon: "assets/icons/symbol-daniel.png",
    weight: 17,
  },
  {
    id: "CACHE",
    name: "Kisame",
    glyph: "KISAME",
    icon: "assets/icons/symbol-josh.png",
    weight: 18,
  },
  {
    id: "GLITCH",
    name: "Deidara",
    glyph: "DEIDARA",
    icon: "assets/icons/symbol-fahad.png",
    weight: 19,
  },
]);

const SYMBOL_MAP = new Map(REEL_SYMBOLS.map((symbol) => [symbol.id, symbol]));
const TOTAL_WEIGHT = REEL_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
const REEL_COUNT = 3;

/**
 * @param {string} symbolId
 * @returns {{id: string, name: string, glyph: string, weight: number}}
 */
export function getSymbolById(symbolId) {
  return SYMBOL_MAP.get(symbolId);
}

/**
 * Weighted random symbol draw.
 * @param {() => number} [rng]
 * @returns {string}
 */
export function drawWeightedSymbolId(rng = Math.random) {
  const roll = rng() * TOTAL_WEIGHT;
  let running = 0;

  for (const symbol of REEL_SYMBOLS) {
    running += symbol.weight;
    if (roll <= running) {
      return symbol.id;
    }
  }

  return REEL_SYMBOLS[REEL_SYMBOLS.length - 1].id;
}

/**
 * @param {number} [count]
 * @returns {string[]}
 */
export function generateSpinSymbols(count = REEL_COUNT) {
  return Array.from({ length: count }, () => drawWeightedSymbolId());
}

/**
 * Simulates reel spin timing and emits updates for UI animation.
 * @param {{
 *   reducedMotion?: boolean,
 *   onReelStart?: (reelIndex: number) => void,
 *   onReelUpdate?: (reelIndex: number, symbolId: string, isFinal: boolean) => void,
 *   onReelStop?: (reelIndex: number, symbolId: string) => void
 * }} options
 * @returns {Promise<string[]>}
 */
export async function spinReels(options = {}) {
  const {
    reducedMotion = false,
    onReelStart = () => {},
    onReelUpdate = () => {},
    onReelStop = () => {},
  } = options;

  const finalSymbols = generateSpinSymbols(REEL_COUNT);

  if (reducedMotion) {
    finalSymbols.forEach((symbolId, reelIndex) => {
      onReelStart(reelIndex);
      onReelUpdate(reelIndex, symbolId, true);
      onReelStop(reelIndex, symbolId);
    });
    await wait(200);
    return finalSymbols;
  }

  const stopPromises = finalSymbols.map(
    (finalSymbol, reelIndex) =>
      new Promise((resolve) => {
        onReelStart(reelIndex);

        const intervalMs = 80 + reelIndex * 12;
        const stopAfterMs = 900 + reelIndex * 360;

        const intervalHandle = window.setInterval(() => {
          onReelUpdate(reelIndex, drawWeightedSymbolId(), false);
        }, intervalMs);

        window.setTimeout(() => {
          window.clearInterval(intervalHandle);
          onReelUpdate(reelIndex, finalSymbol, true);
          onReelStop(reelIndex, finalSymbol);
          resolve();
        }, stopAfterMs);
      }),
  );

  await Promise.all(stopPromises);
  return finalSymbols;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
