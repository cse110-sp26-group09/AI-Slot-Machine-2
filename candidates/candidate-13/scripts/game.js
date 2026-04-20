export const BET_CONFIG = Object.freeze({
  min: 5,
  max: 100,
  step: 5
});

const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: true,
  highContrast: false,
  largePrint: false,
  reducedMotion: false
});

const DEFAULT_STATE = Object.freeze({
  balance: 500,
  bet: 10,
  totalSpent: 0,
  totalWon: 0,
  spins: 0,
  wins: 0,
  loyaltyPoints: 0,
  loyaltyLevel: 1,
  lossLimit: 200,
  isPaused: false,
  pauseReason: "",
  isSpinning: false,
  lastDailyRewardDate: "",
  dailyRewardStreak: 0,
  settings: DEFAULT_SETTINGS
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBet(value) {
  const raw = Number(value);
  const safe = Number.isFinite(raw) ? raw : BET_CONFIG.min;
  const stepped = Math.round(safe / BET_CONFIG.step) * BET_CONFIG.step;
  return clamp(stepped, BET_CONFIG.min, BET_CONFIG.max);
}

function parseDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function isYesterday(previousDate, currentDate) {
  const previous = new Date(previousDate);
  const current = new Date(currentDate);
  previous.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  const diffMs = current.getTime() - previous.getTime();
  return diffMs === 24 * 60 * 60 * 1000;
}

export function createInitialState(savedState = {}) {
  const merged = {
    ...DEFAULT_STATE,
    ...savedState,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(savedState.settings || {})
    }
  };

  merged.bet = normalizeBet(merged.bet);
  merged.balance = Math.max(0, Math.floor(Number(merged.balance) || 0));
  merged.totalSpent = Math.max(0, Math.floor(Number(merged.totalSpent) || 0));
  merged.totalWon = Math.max(0, Math.floor(Number(merged.totalWon) || 0));
  merged.spins = Math.max(0, Math.floor(Number(merged.spins) || 0));
  merged.wins = Math.max(0, Math.floor(Number(merged.wins) || 0));
  merged.loyaltyPoints = Math.max(0, Math.floor(Number(merged.loyaltyPoints) || 0));
  merged.loyaltyLevel = Math.max(1, Math.floor(Number(merged.loyaltyLevel) || 1));
  merged.lossLimit = Math.max(0, Math.floor(Number(merged.lossLimit) || 0));
  merged.isPaused = Boolean(merged.isPaused);
  merged.isSpinning = false;

  if (!merged.pauseReason) {
    merged.pauseReason = "";
  }

  return merged;
}

export function setBet(state, value) {
  state.bet = normalizeBet(value);
  return state.bet;
}

export function nudgeBet(state, direction) {
  const delta = direction === "up" ? BET_CONFIG.step : -BET_CONFIG.step;
  return setBet(state, state.bet + delta);
}

export function getSessionSummary(state) {
  const net = state.totalWon - state.totalSpent;
  const loss = Math.max(0, -net);
  const winRate = state.spins > 0 ? Math.round((state.wins / state.spins) * 100) : 0;

  return {
    net,
    loss,
    winRate
  };
}

export function getLimitStatus(state) {
  const summary = getSessionSummary(state);
  const hasLimit = state.lossLimit > 0;
  const hitLimit = hasLimit && summary.loss >= state.lossLimit;
  const nearLimit = hasLimit && !hitLimit && summary.loss >= state.lossLimit * 0.8;

  return {
    hitLimit,
    nearLimit,
    loss: summary.loss
  };
}

function enforceLossLimit(state) {
  const status = getLimitStatus(state);
  if (status.hitLimit) {
    state.isPaused = true;
    state.pauseReason = "loss-limit";
  } else if (state.pauseReason === "loss-limit") {
    state.isPaused = false;
    state.pauseReason = "";
  }
  return status;
}

export function setLossLimit(state, value) {
  const normalized = Math.max(0, Math.floor(Number(value) || 0));
  state.lossLimit = normalized;
  return enforceLossLimit(state);
}

export function canSpin(state) {
  if (state.isSpinning) {
    return { ok: false, reason: "Spin already running." };
  }
  if (state.isPaused && state.pauseReason === "loss-limit") {
    return {
      ok: false,
      reason: "Session paused at your loss limit. Raise the limit or reset totals."
    };
  }
  if (state.balance < state.bet) {
    return { ok: false, reason: "Insufficient balance for this bet." };
  }
  return { ok: true, reason: "" };
}

export function startSpin(state) {
  const permission = canSpin(state);
  if (!permission.ok) {
    return permission;
  }

  state.balance -= state.bet;
  state.totalSpent += state.bet;
  state.spins += 1;
  state.loyaltyPoints += 1;
  state.isSpinning = true;

  return { ok: true, reason: "" };
}

function grantLoyaltyReward(state) {
  if (state.loyaltyPoints === 0 || state.loyaltyPoints % 10 !== 0) {
    return 0;
  }

  const reward = 20 + state.loyaltyLevel * 10;
  state.loyaltyLevel += 1;
  state.balance += reward;
  state.totalWon += reward;
  return reward;
}

export function finishSpin(state, payout) {
  state.isSpinning = false;

  if (payout > 0) {
    state.balance += payout;
    state.totalWon += payout;
    state.wins += 1;
  }

  const roundNet = payout - state.bet;
  const loyaltyReward = grantLoyaltyReward(state);
  const limitState = enforceLossLimit(state);

  return {
    roundNet,
    loyaltyReward,
    limitState
  };
}

export function applyDailyReward(state, date = new Date()) {
  const today = parseDateOnly(date);
  if (state.lastDailyRewardDate === today) {
    return {
      granted: false,
      reward: 0,
      streak: state.dailyRewardStreak
    };
  }

  if (
    state.lastDailyRewardDate &&
    isYesterday(state.lastDailyRewardDate, today)
  ) {
    state.dailyRewardStreak += 1;
  } else {
    state.dailyRewardStreak = 1;
  }

  state.lastDailyRewardDate = today;
  const reward = 35 + state.dailyRewardStreak * 10 + state.loyaltyLevel * 3;
  state.balance += reward;
  state.totalWon += reward;

  return {
    granted: true,
    reward,
    streak: state.dailyRewardStreak
  };
}

export function getResponsiblePrompt(state) {
  const limit = getLimitStatus(state);

  if (limit.hitLimit) {
    return {
      tone: "caution",
      text: "Loss cap reached. Pause here, or increase the limit intentionally before continuing."
    };
  }
  if (limit.nearLimit) {
    return {
      tone: "caution",
      text: "You are within 20% of your session loss limit."
    };
  }
  if (state.spins > 0 && state.spins % 15 === 0) {
    return {
      tone: "neutral",
      text: "Checkpoint: consider a short break before your next batch of spins."
    };
  }
  if (state.balance < state.bet * 3) {
    return {
      tone: "neutral",
      text: "Balance is running low. Lower the bet if you want a longer session."
    };
  }
  return {
    tone: "neutral",
    text: "Use the loss limit as your budget guardrail."
  };
}
