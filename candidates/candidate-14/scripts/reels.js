import { SYMBOLS } from "./payouts.js";

const REEL_COUNT = 3;
const SPIN_TICK_MS = 80;
const REEL_BASE_DURATION_MS = 650;
const REEL_STAGGER_MS = 290;

const weightedPool = [];

for (const symbol of SYMBOLS) {
  weightedPool.push({
    id: symbol.id,
    cumulativeWeight: symbol.weight
  });
}

const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
for (let index = 1; index < weightedPool.length; index += 1) {
  weightedPool[index].cumulativeWeight += weightedPool[index - 1].cumulativeWeight;
}

function pickSymbolId(randomFn = Math.random) {
  const roll = randomFn() * totalWeight;
  for (const entry of weightedPool) {
    if (roll < entry.cumulativeWeight) {
      return entry.id;
    }
  }
  return weightedPool[weightedPool.length - 1].id;
}

export function rollReels(randomFn = Math.random) {
  return new Array(REEL_COUNT).fill(null).map(() => pickSymbolId(randomFn));
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Animate reel spinning with staggered stops.
 * @param {Object} options
 * @param {(reelIndex: number, symbolId: string) => void} [options.onReelFrame]
 * @param {(reelIndex: number, symbolId: string) => void} [options.onReelStop]
 * @param {() => void} [options.onStart]
 * @param {() => void} [options.onComplete]
 * @param {() => number} [options.randomFn]
 * @returns {Promise<string[]>}
 */
export async function animateSpin(options = {}) {
  const {
    onReelFrame,
    onReelStop,
    onStart,
    onComplete,
    randomFn = Math.random
  } = options;

  if (typeof onStart === "function") {
    onStart();
  }

  const finalResult = rollReels(randomFn);

  for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
    const reelDuration = REEL_BASE_DURATION_MS + reelIndex * REEL_STAGGER_MS;
    const startTime = performance.now();

    await new Promise((resolve) => {
      const timer = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        if (elapsed >= reelDuration) {
          window.clearInterval(timer);
          if (typeof onReelStop === "function") {
            onReelStop(reelIndex, finalResult[reelIndex]);
          }
          resolve();
          return;
        }

        const rollingSymbol = pickSymbolId(randomFn);
        if (typeof onReelFrame === "function") {
          onReelFrame(reelIndex, rollingSymbol);
        }
      }, SPIN_TICK_MS);
    });

    await wait(90);
  }

  if (typeof onComplete === "function") {
    onComplete();
  }

  return finalResult;
}

