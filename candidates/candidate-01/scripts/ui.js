/**
 * UI rendering and event wiring.
 */
export class SlotUI {
  /**
   * @param {object} options
   * @param {import('./game.js').SlotGame} options.game
   * @param {import('./audio.js').AudioManager} options.audio
   * @param {HTMLElement} options.balanceEl
   * @param {HTMLButtonElement} options.spinButton
   * @param {HTMLSelectElement} options.wagerSelect
   * @param {HTMLElement} options.statusEl
   * @param {HTMLButtonElement} options.audioToggle
   * @param {HTMLInputElement} options.volumeRange
   * @param {{spins: HTMLElement, wins: HTMLElement, net: HTMLElement}} options.statsEls
   */
  constructor({
    game,
    audio,
    balanceEl,
    spinButton,
    wagerSelect,
    statusEl,
    audioToggle,
    volumeRange,
    statsEls
  }) {
    this.game = game;
    this.audio = audio;
    this.balanceEl = balanceEl;
    this.spinButton = spinButton;
    this.wagerSelect = wagerSelect;
    this.statusEl = statusEl;
    this.audioToggle = audioToggle;
    this.volumeRange = volumeRange;
    this.statsEls = statsEls;

    this.lastState = null;
    this.bindEvents();
  }

  bindEvents() {
    this.spinButton.addEventListener("click", async () => {
      await this.audio.unlock();
      await this.game.spin();
    });

    this.wagerSelect.addEventListener("change", () => {
      const nextWager = Number(this.wagerSelect.value);
      this.game.setWager(nextWager);
    });

    this.audioToggle.addEventListener("click", async () => {
      await this.audio.unlock();
      const enabled = this.audio.toggleEnabled();
      this.audioToggle.textContent = enabled ? "Sound: On" : "Sound: Off";
      this.audioToggle.setAttribute("aria-pressed", String(enabled));
    });

    this.volumeRange.addEventListener("input", () => {
      const nextVolume = Number(this.volumeRange.value) / 100;
      this.audio.setVolume(nextVolume);
    });

    window.addEventListener("keydown", async (event) => {
      if (event.code !== "Space") {
        return;
      }

      if (event.target && ["INPUT", "SELECT", "BUTTON"].includes(event.target.tagName)) {
        return;
      }

      event.preventDefault();
      await this.audio.unlock();
      await this.game.spin();
    });
  }

  /**
   * @param {object} state
   */
  renderState(state) {
    this.balanceEl.textContent = String(state.balance);
    this.statusEl.textContent = state.statusText;
    this.statusEl.dataset.tone = state.statusTone;

    this.statsEls.spins.textContent = String(state.totalSpins);
    this.statsEls.wins.textContent = String(state.wins);
    this.statsEls.net.textContent = String(state.netGain);

    this.statsEls.net.classList.toggle("positive", state.netGain > 0);
    this.statsEls.net.classList.toggle("negative", state.netGain < 0);

    const cannotAfford = state.balance < state.wager;
    this.spinButton.disabled = state.isSpinning || cannotAfford;
    this.spinButton.textContent = state.isSpinning ? "Spinning..." : "Spin Reels";
    this.wagerSelect.disabled = state.isSpinning;

    this.lastState = state;
  }

  /**
   * @param {{isWin: boolean, tier: "none" | "small" | "big" | "jackpot"}} outcome
   */
  handleOutcome(outcome) {
    if (outcome.isWin) {
      this.audio.playWin(outcome.tier === "none" ? "small" : outcome.tier);
      return;
    }

    this.audio.playLoss();
  }

  playSpinFeedback() {
    this.audio.playSpin();
  }
}
