import { evaluateSpin } from "./payouts.js";

/**
 * Encapsulates game state and core slot loop.
 */
export class SlotGame {
  /**
   * @param {object} options
   * @param {import("./reels.js").ReelAnimator} options.reelAnimator
   * @param {number} [options.startingBalance]
   * @param {number} [options.defaultWager]
   * @param {(symbols: Array<{id: string}>, wager: number) => object} [options.payoutResolver]
   * @param {(state: object) => void} [options.onStateChange]
   * @param {(payload: {outcome: object, symbols: object[], state: object}) => void} [options.onSpinResult]
   * @param {(error: unknown) => void} [options.onError]
   */
  constructor({
    reelAnimator,
    startingBalance = 120,
    defaultWager = 10,
    payoutResolver = evaluateSpin,
    onStateChange = () => {},
    onSpinResult = () => {},
    onError = () => {}
  }) {
    if (!reelAnimator) {
      throw new Error("SlotGame requires a ReelAnimator instance.");
    }

    this.reelAnimator = reelAnimator;
    this.payoutResolver = payoutResolver;
    this.onStateChange = onStateChange;
    this.onSpinResult = onSpinResult;
    this.onError = onError;

    this.state = {
      balance: startingBalance,
      wager: defaultWager,
      isSpinning: false,
      totalSpins: 0,
      wins: 0,
      losses: 0,
      netGain: 0,
      lastPayout: 0,
      statusText: "Ready. Place a wager and spin.",
      statusTone: "neutral",
      lastSymbols: []
    };
  }

  /**
   * @returns {object}
   */
  getState() {
    return { ...this.state, lastSymbols: [...this.state.lastSymbols] };
  }

  /**
   * @param {number} nextWager
   */
  setWager(nextWager) {
    const wager = Number(nextWager);
    if (!Number.isFinite(wager) || wager <= 0) {
      this.state.statusText = "Invalid wager amount.";
      this.state.statusTone = "warn";
      this.#notify();
      return;
    }

    this.state.wager = wager;

    if (this.state.balance < wager) {
      this.state.statusText = "Insufficient tokens for this wager.";
      this.state.statusTone = "warn";
    } else {
      this.state.statusText = `Wager set to ${wager} tokens.`;
      this.state.statusTone = "neutral";
    }

    this.#notify();
  }

  /**
   * @returns {Promise<object | null>}
   */
  async spin() {
    if (this.state.isSpinning) {
      return null;
    }

    if (this.state.balance < this.state.wager) {
      this.state.statusText = "Not enough tokens. Lower wager to continue.";
      this.state.statusTone = "warn";
      this.#notify();
      return null;
    }

    const wager = this.state.wager;
    this.state.isSpinning = true;
    this.state.balance -= wager;
    this.state.statusText = "Dispatching prompts to the reel cluster...";
    this.state.statusTone = "neutral";
    this.#notify();

    try {
      const symbols = await this.reelAnimator.spin();
      const outcome = this.payoutResolver(symbols, wager);

      this.state.balance += outcome.payout;
      this.state.totalSpins += 1;
      this.state.lastPayout = outcome.payout;
      this.state.lastSymbols = symbols;
      this.state.netGain += outcome.netGain;
      this.state.statusText = outcome.message;
      this.state.statusTone = outcome.tone;

      if (outcome.isWin) {
        this.state.wins += 1;
      } else {
        this.state.losses += 1;
      }

      this.state.isSpinning = false;
      this.#notify();
      this.onSpinResult({
        outcome,
        symbols,
        state: this.getState()
      });
      return outcome;
    } catch (error) {
      this.state.balance += wager;
      this.state.isSpinning = false;
      this.state.statusText = "Spin failed. Tokens were refunded.";
      this.state.statusTone = "warn";
      this.#notify();
      this.onError(error);
      return null;
    }
  }

  #notify() {
    this.onStateChange(this.getState());
  }
}
