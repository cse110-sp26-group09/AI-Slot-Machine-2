import { spinReels } from "./reels.js";
import { calculatePayout } from "./payouts.js";

export const GAME_CONFIG = {
  initialBalance: 250,
  spinCost: 10,
};

/**
 * @typedef {Object} GameState
 * @property {number} balance
 * @property {number} spinCost
 * @property {number} spins
 * @property {number} wins
 * @property {number} bestWin
 * @property {boolean} isSpinning
 * @property {string} status
 * @property {{id: string, icon: string, name: string}[]} lastSymbols
 */

/**
 * Creates isolated game state and mutation methods.
 * @returns {{
 *  getState: () => GameState,
 *  reset: () => GameState,
 *  spin: () => { state: GameState, won: boolean, payout: number }
 * }}
 */
export function createGame() {
  /** @type {GameState} */
  let state = {
    balance: GAME_CONFIG.initialBalance,
    spinCost: GAME_CONFIG.spinCost,
    spins: 0,
    wins: 0,
    bestWin: 0,
    isSpinning: false,
    status: "Build your prompt budget. Hit spin.",
    lastSymbols: [],
  };

  const cloneState = () => ({ ...state, lastSymbols: [...state.lastSymbols] });

  const ensureCanSpin = () => {
    if (state.isSpinning) {
      throw new Error("Spin in progress.");
    }
    if (state.balance < state.spinCost) {
      throw new Error("Insufficient tokens.");
    }
  };

  return {
    getState() {
      return cloneState();
    },

    reset() {
      state = {
        ...state,
        balance: GAME_CONFIG.initialBalance,
        spins: 0,
        wins: 0,
        bestWin: 0,
        status: "Session reset. New bankroll loaded.",
        isSpinning: false,
        lastSymbols: [],
      };
      return cloneState();
    },

    spin() {
      ensureCanSpin();
      state.isSpinning = true;
      state.spins += 1;
      state.balance -= state.spinCost;

      const symbols = spinReels();
      const outcome = calculatePayout(symbols, state.spinCost);

      if (outcome.won) {
        state.wins += 1;
        state.balance += outcome.payout;
        state.bestWin = Math.max(state.bestWin, outcome.payout);
      }

      state.status = outcome.message;
      state.lastSymbols = symbols;
      state.isSpinning = false;

      return {
        state: cloneState(),
        won: outcome.won,
        payout: outcome.payout,
      };
    },
  };
}
