(function attachReelsModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const { SYMBOLS } = root.Payouts;

  const weightedPool = createWeightedPool(SYMBOLS);

  /**
   * Builds a full spin result plus animation frames.
   * @returns {{result:string[],displaySymbols:Object[],reelPlans:Object[],anticipation:boolean}}
   */
  function buildSpin() {
    const displaySymbols = [pickSymbol(), pickSymbol(), pickSymbol()];
    const result = displaySymbols.map((symbol) => symbol.id);

    const anticipation = result[0] === result[1];
    const reelPlans = displaySymbols.map((finalSymbol, index) => {
      const frameCount = randomInt(13, 20);
      const frames = [];

      for (let i = 0; i < frameCount; i += 1) {
        frames.push(pickSymbol());
      }

      frames.push(finalSymbol);

      const baseDelay = 700 + index * 500;
      const anticipationDelay = anticipation && index === 2 ? 550 : 0;
      return {
        frames,
        final: finalSymbol,
        stopDelayMs: baseDelay + anticipationDelay
      };
    });

    return { result, displaySymbols, reelPlans, anticipation };
  }

  function pickSymbol() {
    const randomIndex = randomInt(0, weightedPool.length - 1);
    return weightedPool[randomIndex];
  }

  function createWeightedPool(symbols) {
    const pool = [];
    symbols.forEach((symbol) => {
      for (let i = 0; i < symbol.weight; i += 1) {
        pool.push(symbol);
      }
    });
    return pool;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  root.Reels = {
    buildSpin
  };
})(window);
