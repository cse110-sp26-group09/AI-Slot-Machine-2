import { spinReels } from "./reels.js";
import { evaluateSpinPayout } from "./payouts.js";

const DEFAULT_CONFIG = Object.freeze({
  startingBalance: 200,
  defaultBet: 5,
  minBet: 1,
  maxBet: 25,
  defaultSessionBudget: 150,
  defaultLossLimit: 60
});

const TIER_THRESHOLDS = Object.freeze([
  { name: "Bronze", xp: 0 },
  { name: "Silver", xp: 140 },
  { name: "Gold", xp: 320 },
  { name: "Platinum", xp: 560 },
  { name: "Diamond", xp: 900 }
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.round(numericValue);
}

function deriveTier(xp) {
  const tierIndex = TIER_THRESHOLDS.reduce((bestIndex, tier, index) => {
    if (xp >= tier.xp) {
      return index;
    }
    return bestIndex;
  }, 0);

  const currentTier = TIER_THRESHOLDS[tierIndex];
  const nextTier = TIER_THRESHOLDS[tierIndex + 1] ?? null;

  if (!nextTier) {
    return {
      tierName: currentTier.name,
      progressPercent: 100,
      nextTierName: currentTier.name,
      xpToNext: 0
    };
  }

  const span = nextTier.xp - currentTier.xp;
  const inTierXp = xp - currentTier.xp;

  return {
    tierName: currentTier.name,
    progressPercent: clamp((inTierXp / span) * 100, 0, 100),
    nextTierName: nextTier.name,
    xpToNext: nextTier.xp - xp
  };
}

function getOutcomeType(roundNet, payoutAmount) {
  if (roundNet > 0) {
    return "win";
  }

  if (roundNet === 0 && payoutAmount > 0) {
    return "break-even";
  }

  if (payoutAmount > 0 && roundNet < 0) {
    return "partial";
  }

  return "loss";
}

function createInitialState(config) {
  return {
    balance: config.startingBalance,
    startingBalance: config.startingBalance,
    bet: config.defaultBet,
    minBet: config.minBet,
    maxBet: config.maxBet,
    totalSpend: 0,
    totalWon: 0,
    net: 0,
    spins: 0,
    xp: 0,
    tierName: "Bronze",
    tierProgressPercent: 0,
    nextTierName: "Silver",
    xpToNext: TIER_THRESHOLDS[1].xp,
    isPaused: false,
    pauseReason: "",
    sessionBudget: config.defaultSessionBudget,
    lossLimit: config.defaultLossLimit,
    lastSymbols: ["gpt", "token", "prompt"],
    lastLine: "Ready",
    lossStreak: 0
  };
}

function cloneState(state) {
  return {
    ...state,
    lastSymbols: [...state.lastSymbols]
  };
}

function getLossAmount(state) {
  return Math.max(0, state.totalSpend - state.totalWon);
}

function updateTierState(state) {
  const tier = deriveTier(state.xp);
  state.tierName = tier.tierName;
  state.tierProgressPercent = tier.progressPercent;
  state.nextTierName = tier.nextTierName;
  state.xpToNext = tier.xpToNext;
}

function evaluatePauseState(state) {
  const lossAmount = getLossAmount(state);

  if (state.lossLimit > 0 && lossAmount >= state.lossLimit) {
    state.isPaused = true;
    state.pauseReason = "Loss limit reached. Review your session before continuing.";
    return;
  }

  if (state.sessionBudget > 0 && state.totalSpend >= state.sessionBudget) {
    state.isPaused = true;
    state.pauseReason = "Session budget reached. Gameplay paused for a check-in.";
    return;
  }

  if (state.balance < state.minBet) {
    state.isPaused = true;
    state.pauseReason = "Balance is below minimum bet. Reset session to continue.";
    return;
  }

  state.isPaused = false;
  state.pauseReason = "";
}

function getResponsiblePrompt(state) {
  const lossAmount = getLossAmount(state);

  if (state.isPaused && state.pauseReason) {
    return state.pauseReason;
  }

  if (state.lossLimit > 0 && lossAmount >= state.lossLimit * 0.8) {
    return "You are close to your selected loss limit. A short pause can help keep play intentional.";
  }

  if (state.sessionBudget > 0 && state.totalSpend >= state.sessionBudget * 0.85) {
    return "You are near your session budget. Consider ending on your current plan.";
  }

  if (state.spins > 0 && state.spins % 20 === 0) {
    return "20 spins completed. Quick check-in: keep going only if it still feels fun.";
  }

  if (state.lossStreak >= 5) {
    return "Five losses in a row can happen with random variance. Consider taking a break.";
  }

  return "Limits are active. You can pause anytime with no penalty.";
}

export function createGameEngine(userConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig
  };

  const state = createInitialState(config);

  function getState() {
    return cloneState(state);
  }

  function setBet(nextBet) {
    const parsedBet = toInteger(nextBet, state.bet);
    state.bet = clamp(parsedBet, state.minBet, state.maxBet);
    return getState();
  }

  function updateLimits({ sessionBudget, lossLimit }) {
    state.sessionBudget = Math.max(0, toInteger(sessionBudget, state.sessionBudget));
    state.lossLimit = Math.max(0, toInteger(lossLimit, state.lossLimit));
    evaluatePauseState(state);
    return getState();
  }

  function canSpin() {
    evaluatePauseState(state);

    if (state.isPaused) {
      return {
        ok: false,
        message: state.pauseReason
      };
    }

    if (state.bet > state.balance) {
      return {
        ok: false,
        message: "Bet is higher than current balance. Lower the bet to continue."
      };
    }

    return { ok: true, message: "" };
  }

  function spin() {
    const spinGuard = canSpin();

    if (!spinGuard.ok) {
      return {
        ok: false,
        message: spinGuard.message,
        state: getState(),
        advisory: getResponsiblePrompt(state)
      };
    }

    state.balance -= state.bet;
    state.totalSpend += state.bet;

    const symbols = spinReels();
    const payoutInfo = evaluateSpinPayout(symbols, state.bet);

    state.balance += payoutInfo.payout;
    state.totalWon += payoutInfo.payout;
    state.net = state.totalWon - state.totalSpend;
    state.spins += 1;
    state.lastSymbols = [...symbols];
    state.lastLine = payoutInfo.line;

    const roundNet = payoutInfo.payout - state.bet;
    state.lossStreak = roundNet < 0 ? state.lossStreak + 1 : 0;
    state.xp += Math.max(2, 6 + Math.max(0, roundNet));
    updateTierState(state);

    evaluatePauseState(state);

    return {
      ok: true,
      symbols,
      payoutInfo,
      roundNet,
      outcomeType: getOutcomeType(roundNet, payoutInfo.payout),
      advisory: getResponsiblePrompt(state),
      state: getState()
    };
  }

  function resumeIfAllowed() {
    evaluatePauseState(state);

    if (state.isPaused) {
      return {
        ok: false,
        message: state.pauseReason,
        state: getState()
      };
    }

    return {
      ok: true,
      message: "Gameplay resumed.",
      state: getState()
    };
  }

  function forceResume() {
    state.isPaused = false;
    state.pauseReason = "";
    return getState();
  }

  function resetSession() {
    const preserved = {
      bet: state.bet,
      sessionBudget: state.sessionBudget,
      lossLimit: state.lossLimit
    };

    const nextState = createInitialState(config);

    Object.assign(state, nextState, preserved);
    evaluatePauseState(state);

    return getState();
  }

  return {
    getState,
    setBet,
    updateLimits,
    spin,
    resumeIfAllowed,
    forceResume,
    resetSession,
    getResponsiblePrompt: () => getResponsiblePrompt(state)
  };
}
