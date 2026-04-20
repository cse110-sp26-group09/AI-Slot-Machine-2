import { getSymbolById, pickWeightedSymbolId } from "./reels.js";

/**
 * @typedef {{
 *  balance: number,
 *  spinCost: number,
 *  totalSpins: number,
 *  wins: number,
 *  net: number
 * }} MinimalState
 */

/**
 * @param {{ spinCost: number }} config
 */
export function createUI(config) {
  const spinCost = config.spinCost;

  const elements = {
    reels: /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll(".reel"))),
    balanceValue: getElement("balance-value"),
    spinCostValue: getElement("spin-cost-value"),
    spinButton: getElement("spin-button"),
    statusText: getElement("status-text"),
    spinsValue: getElement("spins-value"),
    winsValue: getElement("wins-value"),
    winRateValue: getElement("win-rate-value"),
    netValue: getElement("net-value"),
    soundToggle: /** @type {HTMLInputElement} */ (getElement("sound-toggle")),
    volumeRange: /** @type {HTMLInputElement} */ (getElement("volume-range")),
  };

  if (elements.reels.length !== 3) {
    throw new Error("Expected exactly 3 reel elements in the DOM.");
  }

  elements.spinCostValue.textContent = String(spinCost);
  elements.spinButton.textContent = `Spin (${spinCost} TK)`;

  return {
    bindHandlers,
    renderInitial,
    renderAfterSpin,
    animateReels,
    setSpinEnabled,
    setStatus,
    getSoundEnabled,
    getVolume,
  };

  /**
   * @param {{ onSpin: () => void, onSoundToggle: (enabled: boolean) => void, onVolumeChange: (volume: number) => void }} handlers
   */
  function bindHandlers(handlers) {
    elements.spinButton.addEventListener("click", handlers.onSpin);
    elements.soundToggle.addEventListener("change", () => {
      handlers.onSoundToggle(elements.soundToggle.checked);
    });
    elements.volumeRange.addEventListener("input", () => {
      handlers.onVolumeChange(Number(elements.volumeRange.value) / 100);
    });
  }

  /**
   * @param {MinimalState} state
   */
  function renderInitial(state) {
    renderState(state);

    for (const reelEl of elements.reels) {
      setReelSymbol(reelEl, randomSymbol());
      reelEl.classList.remove("win", "lose", "spinning");
    }
  }

  /**
   * @param {{ state: MinimalState, payout: { didWin: boolean, message: string, winAmount: number } }} spinResult
   */
  function renderAfterSpin(spinResult) {
    renderState(spinResult.state);
    setStatus(spinResult.payout.message, spinResult.payout.didWin ? "win" : "loss");

    for (const reelEl of elements.reels) {
      reelEl.classList.toggle("win", spinResult.payout.didWin);
      reelEl.classList.toggle("lose", !spinResult.payout.didWin);
    }
  }

  /**
   * @param {string[]} finalIds
   * @param {(reelIndex: number) => void} onReelStop
   */
  async function animateReels(finalIds, onReelStop) {
    const reelIntervals = [];
    const stopPromises = elements.reels.map((reelEl, index) => {
      reelEl.classList.remove("win", "lose");
      reelEl.classList.add("spinning");

      const intervalId = window.setInterval(() => {
        setReelSymbol(reelEl, randomSymbol());
      }, 88 + index * 18);

      reelIntervals.push(intervalId);

      return new Promise((resolve) => {
        const stopDelay = 680 + index * 230;
        window.setTimeout(() => {
          window.clearInterval(intervalId);
          setReelSymbol(reelEl, getSymbolById(finalIds[index]));
          reelEl.classList.remove("spinning");
          onReelStop(index);
          resolve(undefined);
        }, stopDelay);
      });
    });

    await Promise.all(stopPromises);

    // Defensive cleanup if any interval survives due to timing issues.
    reelIntervals.forEach((id) => window.clearInterval(id));
  }

  /**
   * @param {boolean} enabled
   */
  function setSpinEnabled(enabled) {
    elements.spinButton.disabled = !enabled;
  }

  /**
   * @param {string} message
   * @param {"neutral" | "win" | "loss" | "warn"} tone
   */
  function setStatus(message, tone = "neutral") {
    elements.statusText.textContent = message;
    elements.statusText.classList.remove("win", "loss", "warn");

    if (tone !== "neutral") {
      elements.statusText.classList.add(tone);
    }
  }

  function getSoundEnabled() {
    return elements.soundToggle.checked;
  }

  function getVolume() {
    return Number(elements.volumeRange.value) / 100;
  }

  /**
   * @param {MinimalState} state
   */
  function renderState(state) {
    elements.balanceValue.textContent = String(state.balance);
    elements.spinsValue.textContent = String(state.totalSpins);
    elements.winsValue.textContent = String(state.wins);

    const winRate = state.totalSpins === 0 ? 0 : Math.round((state.wins / state.totalSpins) * 100);
    elements.winRateValue.textContent = `${winRate}%`;

    const netPrefix = state.net > 0 ? "+" : "";
    elements.netValue.textContent = `${netPrefix}${state.net} TK`;
    elements.netValue.style.color =
      state.net > 0 ? "var(--good)" : state.net < 0 ? "var(--bad)" : "var(--text)";
  }
}

/**
 * @returns {{ id: string, label: string, emoji: string, weight: number }}
 */
function randomSymbol() {
  return getSymbolById(pickWeightedSymbolId());
}

/**
 * @param {HTMLElement} reelEl
 * @param {{ emoji: string, label: string }} symbol
 */
function setReelSymbol(reelEl, symbol) {
  const emojiEl = reelEl.querySelector(".symbol-emoji");
  const labelEl = reelEl.querySelector(".symbol-label");

  if (!emojiEl || !labelEl) {
    throw new Error("Reel template is missing required symbol fields.");
  }

  emojiEl.textContent = symbol.emoji;
  labelEl.textContent = symbol.label;
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

// Exported for basic testability in future unit tests.
export const __internal = {
  randomSymbol,
};
