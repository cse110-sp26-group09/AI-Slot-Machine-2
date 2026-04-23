/**
 * Symbol catalog and reel behavior.
 */
export const REEL_SYMBOLS = Object.freeze([
  {
    id: "NAGATO",
    name: "Nagato",
    glyph: "NAGATO",
    icon: "assets/icons/symbol-aditya.png",
    weight: 13,
  },
  {
    id: "KONAN",
    name: "Konan",
    glyph: "KONAN",
    icon: "assets/icons/symbol-alexis.png",
    weight: 12,
  },
  {
    id: "ITACHI",
    name: "Itachi",
    glyph: "ITACHI",
    icon: "assets/icons/symbol-daniel.png",
    weight: 11,
  },
  {
    id: "KISAME",
    name: "Kisame",
    glyph: "KISAME",
    icon: "assets/icons/symbol-fahad.png",
    weight: 10,
  },
  {
    id: "SASORI",
    name: "Sasori",
    glyph: "SASORI",
    icon: "assets/icons/symbol-hemendra.png",
    weight: 9,
  },
  {
    id: "DEIDARA",
    name: "Deidara",
    glyph: "DEIDARA",
    icon: "assets/icons/symbol-hieu.png",
    weight: 8,
  },
  {
    id: "HIDAN",
    name: "Hidan",
    glyph: "HIDAN",
    icon: "assets/icons/symbol-james.png",
    weight: 7,
  },
  {
    id: "KAKUZU",
    name: "Kakuzu",
    glyph: "KAKUZU",
    icon: "assets/icons/symbol-jason.png",
    weight: 6,
  },
  {
    id: "TOBI",
    name: "Tobi",
    glyph: "TOBI",
    icon: "assets/icons/symbol-josh.png",
    weight: 5,
  },
  {
    id: "ZETSU",
    name: "Zetsu",
    glyph: "ZETSU",
    icon: "assets/icons/symbol-powell.png",
    weight: 4,
  },
  {
    id: "OBITO",
    name: "Obito",
    glyph: "OBITO",
    icon: "assets/icons/symbol-waleed.png",
    weight: 3,
  },
  {
    id: "YAHIKO",
    name: "Yahiko",
    glyph: "YAHIKO",
    icon: "assets/icons/symbol-woosik.png",
    weight: 2,
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
        const totalDurationMs = 1280 + reelIndex * 420;
        const slowdownThresholdMs = Math.floor(totalDurationMs * 0.68);
        let elapsedMs = 0;

        const cycle = () => {
          onReelUpdate(reelIndex, drawWeightedSymbolId(), false);

          const isSlowingDown = elapsedMs >= slowdownThresholdMs;
          const minDelay = isSlowingDown ? 108 + reelIndex * 18 : 52 + reelIndex * 10;
          const maxDelay = isSlowingDown ? 148 + reelIndex * 20 : 82 + reelIndex * 12;
          const nextDelay = Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));

          elapsedMs += nextDelay;
          if (elapsedMs >= totalDurationMs) {
            onReelUpdate(reelIndex, finalSymbol, true);
            onReelStop(reelIndex, finalSymbol);
            resolve();
            return;
          }

          window.setTimeout(cycle, nextDelay);
        };

        cycle();
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
