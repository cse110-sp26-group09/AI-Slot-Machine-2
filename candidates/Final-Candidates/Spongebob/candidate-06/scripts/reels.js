/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

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

  function getMode(controls) {
    if (controls.slamRequested) {
      return "slam";
    }
    if (controls.speedRequested) {
      return "speed";
    }
    return "normal";
  }

  function getStage(progress) {
    if (progress < 0.45) {
      return "fast";
    }
    if (progress < 0.82) {
      return "steady";
    }
    return "slow";
  }

  function getCadenceMs(progress, mode) {
    if (mode === "slam") {
      return progress > 0.8 ? 50 : 24;
    }

    if (mode === "speed") {
      if (progress < 0.6) {
        return 30;
      }
      if (progress < 0.86) {
        return 64;
      }
      return 110;
    }

    if (progress < 0.45) {
      return 44;
    }
    if (progress < 0.72) {
      return 72;
    }
    if (progress < 0.9) {
      return 118;
    }
    return 172;
  }

  function animateOneReel(params) {
    const reelIndex = params.reelIndex;
    const finalSymbol = params.finalSymbol;
    const symbols = params.symbols;
    const controls = params.controls;
    const onUpdate = params.onUpdate;
    const onReelStop = params.onReelStop;
    const durationMs = params.durationMs;

    return new Promise(function (resolve) {
      let timer = 0;
      const start = global.performance.now();
      let plannedStopAt = start + durationMs;
      let stopMode = "normal";

      function stop(now) {
        global.clearTimeout(timer);
        stopMode = getMode(controls);
        if (onUpdate) {
          onUpdate(reelIndex, finalSymbol, true, {
            stage: "locked",
            progress: 1,
            mode: stopMode,
            timestamp: now
          });
        }
        if (onReelStop) {
          onReelStop(reelIndex, finalSymbol, {
            mode: stopMode,
            timestamp: now
          });
        }
        resolve({
          mode: stopMode
        });
      }

      function tick() {
        const now = global.performance.now();

        if (controls.slamRequested) {
          plannedStopAt = Math.min(plannedStopAt, now + 140);
        } else if (controls.speedRequested) {
          plannedStopAt = Math.min(plannedStopAt, now + 650);
        }

        const spinSpan = Math.max(200, plannedStopAt - start);
        const progress = Math.min((now - start) / spinSpan, 1);
        const mode = getMode(controls);
        stopMode = mode;

        if (now >= plannedStopAt || progress >= 1) {
          stop(now);
          return;
        }

        if (onUpdate) {
          onUpdate(reelIndex, randomSymbol(symbols), false, {
            stage: getStage(progress),
            progress: progress,
            mode: mode,
            timestamp: now
          });
        }

        timer = global.setTimeout(tick, getCadenceMs(progress, mode));
      }

      tick();
    });
  }

  function startSpin(options) {
    const symbols = options.symbols;
    const reelCount = options.reelCount || 3;
    const reducedMotion = Boolean(options.reducedMotion);
    const onUpdate = options.onUpdate;
    const onReelStop = options.onReelStop;
    const onAnticipation = options.onAnticipation;
    const bonusSymbolId = options.bonusSymbolId || "";
    const reelDurationMs = Math.max(200, Number(options.reelDurationMs) || 2000);

    const finalSymbols = Array.from({ length: reelCount }, function () {
      return randomSymbol(symbols);
    });

    const controls = {
      active: true,
      speedRequested: false,
      slamRequested: false,
      currentReelIndex: -1
    };

    function runReducedMotion() {
      finalSymbols.forEach(function (symbol, reelIndex) {
        if (onUpdate) {
          onUpdate(reelIndex, symbol, true, {
            stage: "locked",
            progress: 1,
            mode: "normal",
            timestamp: global.performance.now()
          });
        }
        if (onReelStop) {
          onReelStop(reelIndex, symbol, {
            mode: "normal",
            timestamp: global.performance.now()
          });
        }
      });

      if (
        bonusSymbolId &&
        finalSymbols[0] &&
        finalSymbols[1] &&
        finalSymbols[0].id === bonusSymbolId &&
        finalSymbols[1].id === bonusSymbolId &&
        onAnticipation
      ) {
        onAnticipation({
          symbolId: bonusSymbolId,
          reelIndexes: [0, 1]
        });
      }
    }

    async function runAnimatedSpin() {
      let finalStopMode = "normal";

      for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
        controls.currentReelIndex = reelIndex;

        const result = await animateOneReel({
          reelIndex: reelIndex,
          finalSymbol: finalSymbols[reelIndex],
          symbols: symbols,
          controls: controls,
          onUpdate: onUpdate,
          onReelStop: onReelStop,
          durationMs: reelDurationMs
        });

        finalStopMode = result.mode;

        if (
          reelIndex === 1 &&
          bonusSymbolId &&
          finalSymbols[0].id === bonusSymbolId &&
          finalSymbols[1].id === bonusSymbolId &&
          onAnticipation
        ) {
          onAnticipation({
            symbolId: bonusSymbolId,
            reelIndexes: [0, 1]
          });
        }
      }

      return {
        symbols: finalSymbols,
        stopMode: finalStopMode
      };
    }

    const promise = (reducedMotion
      ? Promise.resolve().then(function () {
          runReducedMotion();
          return {
            symbols: finalSymbols,
            stopMode: "normal"
          };
        })
      : runAnimatedSpin()
    ).finally(function () {
      controls.active = false;
      controls.currentReelIndex = -1;
    });

    return {
      promise: promise,
      requestSpeedUp: function () {
        if (!controls.active) {
          return false;
        }
        controls.speedRequested = true;
        return true;
      },
      requestSlamStop: function () {
        if (!controls.active) {
          return false;
        }
        controls.speedRequested = true;
        controls.slamRequested = true;
        return true;
      },
      getStatus: function () {
        return {
          active: controls.active,
          currentReelIndex: controls.currentReelIndex,
          speedRequested: controls.speedRequested,
          slamRequested: controls.slamRequested,
          mode: getMode(controls)
        };
      }
    };
  }

  function spin(options) {
    return startSpin(options).promise.then(function (result) {
      return result.symbols;
    });
  }

  SlotApp.Reels = {
    spin: spin,
    startSpin: startSpin
  };
})(window);
