import { evaluatePayout } from "./payouts.js";
import { spinReels } from "./reels.js";

const DEFAULTS = Object.freeze({
  startingBalance: 200,
  spinCost: 10,
});

/**
 * @typedef {Object} GameState
 * @property {number} balance
 * @property {number} spinCost
 * @property {number} startingBalance
 * @property {number} totalSpins
 * @property {number} wins
 * @property {number} losses
 * @property {number} totalWinnings
 * @property {number} net
 */

/**
 * @param {{ startingBalance?: number, spinCost?: number, rng?: () => number }} config
 */
export function createGame(config = {}) {
  const startingBalance = toPositiveNumber(config.startingBalance, DEFAULTS.startingBalance);
  const spinCost = toPositiveNumber(config.spinCost, DEFAULTS.spinCost);
  const rng = typeof config.rng === "function" ? config.rng : Math.random;

  /** @type {GameState} */
  const state = {
    balance: startingBalance,
    spinCost,
    startingBalance,
    totalSpins: 0,
    wins: 0,
    losses: 0,
    totalWinnings: 0,
    net: 0,
  };

  return {
    getState,
    canSpin,
    spin,
  };

  function getState() {
    return { ...state };
  }

  function canSpin() {
    return state.balance >= state.spinCost;
  }

  function spin() {
    if (!canSpin()) {
      throw new Error("Insufficient token balance for spin.");
    }

    state.balance -= state.spinCost;

    const reels = spinReels(rng);
    const payout = evaluatePayout(reels.ids, state.spinCost);

    state.balance += payout.winAmount;
    state.totalSpins += 1;

    if (payout.didWin) {
      state.wins += 1;
      state.totalWinnings += payout.winAmount;
    } else {
      state.losses += 1;
    }

    state.net = state.balance - state.startingBalance;

    return {
      reels,
      payout,
      state: getState(),
      canSpinNext: canSpin(),
      spent: state.spinCost,
    };
  }
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}
