import { ALL_SYMBOLS } from "./reels.js";

/**
 * @template T
 * @param {T | null} value
 * @param {string} label
 * @returns {T}
 */
function requiredElement(value, label) {
  if (!value) {
    throw new Error(`Missing required element: ${label}`);
  }

  return value;
}

/**
 * @returns {{
 *  renderState: (state: {
 *    balance: number,
 *    totalSpins: number,
 *    totalWins: number,
 *    streak: number,
 *    bestWin: number,
 *    lastSymbols: [string, string, string],
 *    isSpinning: boolean,
 *    spinCost: number
 *  }) => void,
 *  setControls: (opts: { canSpin: boolean, muted: boolean, isSpinning: boolean }) => void,
 *  setStatus: (text: string) => void,
 *  animateSpin: (finalSymbols: [string, string, string], durationMs: number) => Promise<void>,
 *  flashWin: () => void,
 *  flashLoss: () => void,
 *  bindEvents: (handlers: { onSpin: () => void, onBailout: () => void, onAudioToggle: () => void }) => void
 * }}
 */
export function createUI() {
  const slotMachine = requiredElement(document.getElementById("slot-machine"), "#slot-machine");
  const reelWindows = /** @type {HTMLDivElement[]} */ (
    Array.from(document.querySelectorAll("[data-reel-index]"))
  );
  if (reelWindows.length !== 3) {
    throw new Error("Expected exactly 3 reel windows.");
  }
  const statusText = requiredElement(document.getElementById("status-text"), "#status-text");

  const balanceValue = requiredElement(document.getElementById("balance-value"), "#balance-value");
  const spinsValue = requiredElement(document.getElementById("spins-value"), "#spins-value");
  const winRateValue = requiredElement(document.getElementById("win-rate-value"), "#win-rate-value");
  const streakValue = requiredElement(document.getElementById("streak-value"), "#streak-value");
  const bestWinValue = requiredElement(document.getElementById("best-win-value"), "#best-win-value");
  const spinCostValue = requiredElement(document.getElementById("spin-cost"), "#spin-cost");

  const spinButton = requiredElement(document.getElementById("spin-btn"), "#spin-btn");
  const bailoutButton = requiredElement(document.getElementById("bailout-btn"), "#bailout-btn");
  const audioButton = requiredElement(document.getElementById("audio-btn"), "#audio-btn");

  /**
   * @param {[string, string, string]} symbols
   */
  function renderReels(symbols) {
    reelWindows.forEach((windowElement, index) => {
      const symbol = symbols[index] ?? "?";
      let symbolNode = windowElement.querySelector(".reel-symbol");

      if (!symbolNode) {
        symbolNode = document.createElement("span");
        symbolNode.className = "reel-symbol";
        windowElement.appendChild(symbolNode);
      }

      symbolNode.textContent = symbol;
    });
  }

  /**
   * @returns {[string, string, string]}
   */
  function randomPreviewSymbols() {
    const pick = () => ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)] ?? "404";
    return [pick(), pick(), pick()];
  }

  /**
   * @param {string} className
   */
  function flash(className) {
    slotMachine.classList.remove("flash-win", "flash-loss");
    slotMachine.classList.add(className);

    window.setTimeout(() => {
      slotMachine.classList.remove(className);
    }, 520);
  }

  return {
    renderState(state) {
      const winRate = state.totalSpins > 0 ? (state.totalWins / state.totalSpins) * 100 : 0;

      balanceValue.textContent = String(state.balance);
      spinsValue.textContent = String(state.totalSpins);
      winRateValue.textContent = `${winRate.toFixed(0)}%`;
      streakValue.textContent = String(state.streak);
      bestWinValue.textContent = String(state.bestWin);
      spinCostValue.textContent = String(state.spinCost);

      renderReels(state.lastSymbols);
    },

    setControls(opts) {
      spinButton.disabled = !opts.canSpin || opts.isSpinning;
      bailoutButton.disabled = opts.isSpinning;
      audioButton.disabled = opts.isSpinning;
      audioButton.setAttribute("aria-pressed", String(opts.muted));
      audioButton.textContent = opts.muted ? "Audio: Off" : "Audio: On";
    },

    setStatus(text) {
      statusText.textContent = text;
    },

    animateSpin(finalSymbols, durationMs) {
      slotMachine.classList.add("is-spinning");

      return new Promise((resolve) => {
        const intervalId = window.setInterval(() => {
          renderReels(randomPreviewSymbols());
        }, 90);

        window.setTimeout(() => {
          window.clearInterval(intervalId);
          renderReels(finalSymbols);
          slotMachine.classList.remove("is-spinning");
          resolve();
        }, durationMs);
      });
    },

    flashWin() {
      flash("flash-win");
    },

    flashLoss() {
      flash("flash-loss");
    },

    bindEvents(handlers) {
      spinButton.addEventListener("click", handlers.onSpin);
      bailoutButton.addEventListener("click", handlers.onBailout);
      audioButton.addEventListener("click", handlers.onAudioToggle);
    }
  };
}
