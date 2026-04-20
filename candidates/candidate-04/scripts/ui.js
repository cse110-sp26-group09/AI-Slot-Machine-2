/**
 * @typedef {Object} UIRefs
 * @property {HTMLElement} reelGrid
 * @property {HTMLElement[]} reelSymbols
 * @property {HTMLElement[]} reelWindows
 * @property {HTMLElement} balanceValue
 * @property {HTMLElement} spinCostValue
 * @property {HTMLElement} spinsValue
 * @property {HTMLElement} winsValue
 * @property {HTMLElement} bestWinValue
 * @property {HTMLElement} statusText
 * @property {HTMLButtonElement} spinButton
 * @property {HTMLButtonElement} resetButton
 * @property {HTMLButtonElement} muteButton
 * @property {HTMLInputElement} volumeRange
 */

/**
 * @param {Document} root
 * @returns {UIRefs}
 */
function getRefs(root) {
  const reelGrid = root.getElementById("reelGrid");
  const reel0 = root.getElementById("reel0");
  const reel1 = root.getElementById("reel1");
  const reel2 = root.getElementById("reel2");
  const balanceValue = root.getElementById("balanceValue");
  const spinCostValue = root.getElementById("spinCostValue");
  const spinsValue = root.getElementById("spinsValue");
  const winsValue = root.getElementById("winsValue");
  const bestWinValue = root.getElementById("bestWinValue");
  const statusText = root.getElementById("statusText");
  const spinButton = root.getElementById("spinButton");
  const resetButton = root.getElementById("resetButton");
  const muteButton = root.getElementById("muteButton");
  const volumeRange = root.getElementById("volumeRange");

  const refs = {
    reelGrid,
    reelSymbols: [reel0, reel1, reel2],
    reelWindows: Array.from(root.querySelectorAll(".reel-window")),
    balanceValue,
    spinCostValue,
    spinsValue,
    winsValue,
    bestWinValue,
    statusText,
    spinButton,
    resetButton,
    muteButton,
    volumeRange,
  };

  for (const [key, value] of Object.entries(refs)) {
    if (
      !value ||
      (Array.isArray(value) && (value.length === 0 || value.some((item) => !item)))
    ) {
      throw new Error(`Missing required UI element: ${key}`);
    }
  }

  return /** @type {UIRefs} */ (refs);
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatTokens(value) {
  return `${value.toLocaleString()} tk`;
}

/**
 * @param {Document} root
 */
export function createUI(root = document) {
  const refs = getRefs(root);

  const setSymbols = (symbols) => {
    symbols.forEach((symbol, index) => {
      refs.reelSymbols[index].textContent = symbol.icon;
      refs.reelSymbols[index].setAttribute("aria-label", symbol.name);
    });
  };

  const setUnknownSymbols = () => {
    refs.reelSymbols.forEach((reel) => {
      reel.textContent = "?";
      reel.setAttribute("aria-label", "Unknown");
    });
  };

  const clearPulseClasses = () => {
    refs.reelGrid.classList.remove("reel-grid-win", "reel-grid-loss");
  };

  return {
    refs,

    renderState(state) {
      refs.balanceValue.textContent = formatTokens(state.balance);
      refs.spinCostValue.textContent = formatTokens(state.spinCost);
      refs.spinsValue.textContent = state.spins.toString();
      refs.winsValue.textContent = state.wins.toString();
      refs.bestWinValue.textContent = formatTokens(state.bestWin);
      refs.spinButton.textContent = `Spin (-${state.spinCost} tokens)`;

      if (state.lastSymbols.length === 3) {
        setSymbols(state.lastSymbols);
      } else {
        setUnknownSymbols();
      }
    },

    setStatus(message, tone = "neutral") {
      refs.statusText.textContent = message;
      refs.statusText.dataset.tone = tone;
    },

    setSpinEnabled(enabled) {
      refs.spinButton.disabled = !enabled;
    },

    setSpinning(spinning) {
      refs.reelGrid.classList.toggle("is-spinning", spinning);
    },

    setMuteState(isMuted) {
      refs.muteButton.textContent = isMuted ? "Sound: Off" : "Sound: On";
      refs.muteButton.setAttribute("aria-pressed", String(isMuted));
    },

    pulseResult(won) {
      clearPulseClasses();
      refs.reelGrid.classList.add(won ? "reel-grid-win" : "reel-grid-loss");
      setTimeout(clearPulseClasses, 700);
    },

    animateSpin(finalSymbols, getRandomSymbol) {
      return new Promise((resolve) => {
        this.setSpinning(true);

        let frame = 0;
        const frameLimit = 15;
        const spinInterval = window.setInterval(() => {
          frame += 1;
          refs.reelSymbols.forEach((reel) => {
            reel.textContent = getRandomSymbol().icon;
          });

          if (frame >= frameLimit) {
            window.clearInterval(spinInterval);

            const stopOneByOne = (index) => {
              if (index >= refs.reelSymbols.length) {
                this.setSpinning(false);
                resolve();
                return;
              }

              refs.reelSymbols[index].textContent = finalSymbols[index].icon;
              refs.reelSymbols[index].setAttribute("aria-label", finalSymbols[index].name);
              refs.reelWindows[index].classList.add("stop-pop");

              window.setTimeout(() => {
                refs.reelWindows[index].classList.remove("stop-pop");
                stopOneByOne(index + 1);
              }, 120);
            };

            stopOneByOne(0);
          }
        }, 70);
      });
    },
  };
}
