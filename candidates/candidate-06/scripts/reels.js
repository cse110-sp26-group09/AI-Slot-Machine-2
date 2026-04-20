(function attachReelsModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  function randomInt(maxExclusive) {
    if (global.crypto && typeof global.crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      global.crypto.getRandomValues(array);
      return Math.floor((array[0] / 0x100000000) * maxExclusive);
    }

    return Math.floor(Math.random() * maxExclusive);
  }

  function randomSymbol(symbols) {
    return symbols[randomInt(symbols.length)];
  }

  function spin(options) {
    const symbols = options.symbols;
    const reelCount = options.reelCount || 3;
    const reducedMotion = Boolean(options.reducedMotion);
    const onUpdate = options.onUpdate;
    const onReelStop = options.onReelStop;

    const finalSymbols = Array.from({ length: reelCount }, function () {
      return randomSymbol(symbols);
    });

    if (reducedMotion) {
      finalSymbols.forEach(function (symbol, reelIndex) {
        if (onUpdate) {
          onUpdate(reelIndex, symbol, true);
        }
        if (onReelStop) {
          onReelStop(reelIndex, symbol);
        }
      });
      return Promise.resolve(finalSymbols);
    }

    return new Promise(function (resolve) {
      let stopCount = 0;
      const intervalMs = 80;
      const baseDurationMs = 760;
      const stopOffsetMs = 260;

      for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
        const spinInterval = setInterval(function () {
          const interimSymbol = randomSymbol(symbols);
          if (onUpdate) {
            onUpdate(reelIndex, interimSymbol, false);
          }
        }, intervalMs);

        const randomOffsetMs = randomInt(120);
        const stopAtMs = baseDurationMs + reelIndex * stopOffsetMs + randomOffsetMs;

        setTimeout(function stopReel() {
          clearInterval(spinInterval);

          const stoppedSymbol = finalSymbols[reelIndex];
          if (onUpdate) {
            onUpdate(reelIndex, stoppedSymbol, true);
          }
          if (onReelStop) {
            onReelStop(reelIndex, stoppedSymbol);
          }

          stopCount += 1;
          if (stopCount === reelCount) {
            resolve(finalSymbols);
          }
        }, stopAtMs);
      }
    });
  }

  SlotApp.Reels = {
    spin: spin
  };
})(window);
