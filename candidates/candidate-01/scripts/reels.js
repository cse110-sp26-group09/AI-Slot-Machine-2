import { drawRandomSymbol, formatSymbolDisplay } from "./payouts.js";

/**
 * Handles reel visual animation and final symbol rendering.
 */
export class ReelAnimator {
  /**
   * @param {HTMLElement[]} reelElements
   * @param {() => number} randomFn
   */
  constructor(reelElements, randomFn = Math.random) {
    if (!Array.isArray(reelElements) || reelElements.length !== 3) {
      throw new Error("ReelAnimator requires exactly 3 reel elements.");
    }

    this.reelElements = reelElements;
    this.randomFn = randomFn;
    this.isAnimating = false;
  }

  /**
   * @returns {Promise<Array<{id: string, label: string, glyph: string, weight: number, tripleMultiplier: number, isWild?: boolean}>>}
   */
  async spin() {
    if (this.isAnimating) {
      throw new Error("Reels are already spinning.");
    }

    this.isAnimating = true;
    const finalSymbols = this.reelElements.map(() => drawRandomSymbol(this.randomFn));

    try {
      const animations = this.reelElements.map((reelElement, index) => {
        const stopDelayMs = 700 + index * 320;
        return this.#animateSingleReel(reelElement, finalSymbols[index], stopDelayMs);
      });

      await Promise.all(animations);
      return finalSymbols;
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * @param {HTMLElement} reelElement
   * @param {{id: string, label: string, glyph: string}} finalSymbol
   * @param {number} stopDelayMs
   * @returns {Promise<void>}
   */
  #animateSingleReel(reelElement, finalSymbol, stopDelayMs) {
    return new Promise((resolve) => {
      reelElement.classList.add("spinning");

      const ticker = window.setInterval(() => {
        const transientSymbol = drawRandomSymbol(this.randomFn);
        this.#renderReel(reelElement, transientSymbol);
      }, 70);

      window.setTimeout(() => {
        window.clearInterval(ticker);
        this.#renderReel(reelElement, finalSymbol);
        reelElement.classList.remove("spinning");
        resolve();
      }, stopDelayMs);
    });
  }

  /**
   * @param {HTMLElement} reelElement
   * @param {{id: string, label: string, glyph: string}} symbol
   */
  #renderReel(reelElement, symbol) {
    reelElement.dataset.symbolId = symbol.id;
    reelElement.textContent = formatSymbolDisplay(symbol);
  }
}
