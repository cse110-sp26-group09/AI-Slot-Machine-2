import { spinReels } from "./reels.js";
import { evaluateSpin } from "./payouts.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";

const GAME_STATE_KEY = "prompt-palace-state-v1";

const DEFAULT_CONFIG = {
  startingBalance: 120,
  spinCost: 10,
  bailoutAmount: 80,
  spinDurationMs: 1250
};

/**
 * @typedef {Object} GameState
 * @property {number} balance
 * @property {number} totalSpins
 * @property {number} totalWins
 * @property {number} streak
 * @property {number} bestWin
 * @property {number} bailoutCount
 * @property {boolean} isSpinning
 * @property {[string, string, string]} lastSymbols
 */

/**
 * @param {Partial<typeof DEFAULT_CONFIG>} [customConfig]
 */
export function createGame(customConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const ui = createUI();
  const audio = createAudio();
  let state = loadState(config.startingBalance);

  function syncUI() {
    ui.renderState({
      ...state,
      spinCost: config.spinCost
    });

    ui.setControls({
      canSpin: state.balance >= config.spinCost,
      muted: audio.isMuted(),
      isSpinning: state.isSpinning
    });
  }

  async function handleSpin() {
    if (state.isSpinning) {
      return;
    }

    if (state.balance < config.spinCost) {
      ui.setStatus("Not enough tokens to spin. Take a VC bailout.");
      audio.playError();
      return;
    }

    state.isSpinning = true;
    state.balance -= config.spinCost;
    state.totalSpins += 1;
    persistState(state);
    syncUI();

    ui.setStatus("Spinning reels and burning compute credits...");
    audio.playSpin();

    const { symbols } = spinReels();
    await ui.animateSpin(symbols, config.spinDurationMs);

    const result = evaluateSpin(symbols, config.spinCost);
    state.lastSymbols = symbols;

    if (result.winTokens > 0) {
      state.balance += result.winTokens;
      state.totalWins += 1;
      state.streak += 1;
      state.bestWin = Math.max(state.bestWin, result.winTokens);
      ui.flashWin();
      audio.playWin(result.tier);
    } else {
      state.streak = 0;
      ui.flashLoss();
      audio.playLoss();
    }

    state.isSpinning = false;
    ui.setStatus(result.message);
    persistState(state);
    syncUI();
  }

  function handleBailout() {
    if (state.isSpinning) {
      return;
    }

    state.balance += config.bailoutAmount;
    state.bailoutCount += 1;
    ui.setStatus(`VC bailout approved. +${config.bailoutAmount} TK and zero accountability.`);
    audio.playWin("small");
    persistState(state);
    syncUI();
  }

  function handleAudioToggle() {
    const nowMuted = audio.toggleMute();
    ui.setControls({
      canSpin: state.balance >= config.spinCost,
      muted: nowMuted,
      isSpinning: state.isSpinning
    });

    if (!nowMuted) {
      audio.playSpin();
    }
  }

  return {
    init() {
      ui.bindEvents({
        onSpin: () => {
          void handleSpin();
        },
        onBailout: handleBailout,
        onAudioToggle: handleAudioToggle
      });

      syncUI();
      ui.setStatus(
        state.totalSpins > 0
          ? "Session restored. Spin to chase AI-token glory."
          : "Fresh bankroll loaded. Spin to run your first AI gamble."
      );
    }
  };
}

/**
 * @param {number} startingBalance
 * @returns {GameState}
 */
function loadState(startingBalance) {
  const fallback = {
    balance: startingBalance,
    totalSpins: 0,
    totalWins: 0,
    streak: 0,
    bestWin: 0,
    bailoutCount: 0,
    isSpinning: false,
    lastSymbols: ["GPT", "TOKEN", "API"]
  };

  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = /** @type {Partial<GameState>} */ (JSON.parse(raw));
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
      balance: safeInteger(parsed.balance, fallback.balance),
      totalSpins: safeInteger(parsed.totalSpins, 0),
      totalWins: safeInteger(parsed.totalWins, 0),
      streak: safeInteger(parsed.streak, 0),
      bestWin: safeInteger(parsed.bestWin, 0),
      bailoutCount: safeInteger(parsed.bailoutCount, 0),
      isSpinning: false,
      lastSymbols: sanitizeSymbols(parsed.lastSymbols, fallback.lastSymbols)
    };
  } catch (_err) {
    return fallback;
  }
}

/**
 * @param {GameState} state
 */
function persistState(state) {
  const snapshot = {
    balance: state.balance,
    totalSpins: state.totalSpins,
    totalWins: state.totalWins,
    streak: state.streak,
    bestWin: state.bestWin,
    bailoutCount: state.bailoutCount,
    lastSymbols: state.lastSymbols
  };

  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(snapshot));
  } catch (_err) {
    // No-op: storage may be unavailable in strict browsing modes.
  }
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function safeInteger(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : fallback;
}

/**
 * @param {unknown} value
 * @param {[string, string, string]} fallback
 * @returns {[string, string, string]}
 */
function sanitizeSymbols(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) {
    return fallback;
  }

  const [a, b, c] = value;
  if ([a, b, c].every((item) => typeof item === "string")) {
    return [a, b, c];
  }

  return fallback;
}
