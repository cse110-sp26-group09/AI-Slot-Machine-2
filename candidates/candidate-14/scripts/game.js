import {
  BET_STEP,
  DEFAULT_BET,
  DEFAULT_LOSS_LIMIT,
  MAX_BET,
  MIN_BET,
  STARTING_BALANCE,
  evaluateSpin,
  formatTokens
} from "./payouts.js";

const STATE_VERSION = 1;

const LOYALTY_TIERS = [
  { name: "Bronze", minPoints: 0, dailyBonus: 0 },
  { name: "Silver", minPoints: 500, dailyBonus: 10 },
  { name: "Gold", minPoints: 1500, dailyBonus: 20 },
  { name: "Platinum", minPoints: 3000, dailyBonus: 35 }
];

const LOYALTY_CHECKPOINT_POINTS = 250;
const LOYALTY_CHECKPOINT_BONUS = 25;

function clampBet(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_BET;
  }
  const stepped = Math.round(numeric / BET_STEP) * BET_STEP;
  return Math.min(MAX_BET, Math.max(MIN_BET, stepped));
}

function clampLossLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_LOSS_LIMIT;
  }
  return Math.max(20, Math.min(5000, Math.round(numeric)));
}

function getDateKey(date = new Date()) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return getDateKey(previous);
}

function getTierForPoints(points) {
  let tier = LOYALTY_TIERS[0];
  for (const candidateTier of LOYALTY_TIERS) {
    if (points >= candidateTier.minPoints) {
      tier = candidateTier;
    }
  }
  return tier;
}

function getNextTier(points) {
  for (const tier of LOYALTY_TIERS) {
    if (tier.minPoints > points) {
      return tier;
    }
  }
  return null;
}

function computeLossAmount(state) {
  return Math.max(0, state.totalSpent - state.totalWon);
}

function computeNet(state) {
  return state.totalWon - state.totalSpent;
}

function createDefaultState() {
  return {
    version: STATE_VERSION,
    balance: STARTING_BALANCE,
    currentBet: DEFAULT_BET,
    totalSpent: 0,
    totalWon: 0,
    spins: 0,
    wins: 0,
    currentReels: ["model", "prompt", "token"],
    lastOutcome: null,
    lossLimit: DEFAULT_LOSS_LIMIT,
    isPausedByLimit: false,
    pauseReason: "",
    pendingBet: null,
    loyaltyPoints: 0,
    loyaltyBonusCheckpoint: 0,
    daily: {
      lastClaimDate: "",
      streak: 0
    },
    settings: {
      highContrast: false,
      largeText: false,
      soundEnabled: true,
      soundVolume: 0.45
    }
  };
}

function normalizeState(savedState) {
  const defaults = createDefaultState();
  if (!savedState || typeof savedState !== "object") {
    return defaults;
  }

  const normalized = {
    ...defaults,
    ...savedState,
    currentBet: clampBet(savedState.currentBet),
    lossLimit: clampLossLimit(savedState.lossLimit),
    balance: Number.isFinite(savedState.balance) ? Math.max(0, Math.floor(savedState.balance)) : defaults.balance,
    totalSpent: Number.isFinite(savedState.totalSpent) ? Math.max(0, Math.floor(savedState.totalSpent)) : 0,
    totalWon: Number.isFinite(savedState.totalWon) ? Math.max(0, Math.floor(savedState.totalWon)) : 0,
    spins: Number.isFinite(savedState.spins) ? Math.max(0, Math.floor(savedState.spins)) : 0,
    wins: Number.isFinite(savedState.wins) ? Math.max(0, Math.floor(savedState.wins)) : 0,
    loyaltyPoints: Number.isFinite(savedState.loyaltyPoints)
      ? Math.max(0, Math.floor(savedState.loyaltyPoints))
      : 0,
    loyaltyBonusCheckpoint: Number.isFinite(savedState.loyaltyBonusCheckpoint)
      ? Math.max(0, Math.floor(savedState.loyaltyBonusCheckpoint))
      : 0,
    pendingBet: null,
    daily: {
      ...defaults.daily,
      ...(savedState.daily || {})
    },
    settings: {
      ...defaults.settings,
      ...(savedState.settings || {})
    }
  };

  normalized.settings.soundVolume = Number.isFinite(normalized.settings.soundVolume)
    ? Math.min(1, Math.max(0, Number(normalized.settings.soundVolume)))
    : defaults.settings.soundVolume;
  normalized.settings.soundEnabled = Boolean(normalized.settings.soundEnabled);
  normalized.settings.highContrast = Boolean(normalized.settings.highContrast);
  normalized.settings.largeText = Boolean(normalized.settings.largeText);

  if (!Array.isArray(savedState.currentReels) || savedState.currentReels.length !== 3) {
    normalized.currentReels = [...defaults.currentReels];
  }

  if (computeLossAmount(normalized) >= normalized.lossLimit) {
    normalized.isPausedByLimit = true;
    normalized.pauseReason = "Loss limit reached. Start a new session or raise your limit to continue.";
  }

  return normalized;
}

function buildResponsiblePrompt(state, outcome) {
  const lossAmount = computeLossAmount(state);
  if (state.isPausedByLimit) {
    return state.pauseReason;
  }

  if (state.lossLimit > 0) {
    const ratio = lossAmount / state.lossLimit;
    if (ratio >= 0.8) {
      return "You are close to your loss limit. Lowering your bet can extend play with less risk.";
    }
    if (ratio >= 0.5) {
      return "You are halfway to your loss limit. Consider a short pause before the next spin.";
    }
  }

  if (state.spins > 0 && state.spins % 12 === 0) {
    return "Break reminder: a quick stretch helps keep decisions calm and deliberate.";
  }

  if (outcome?.isJackpot) {
    return "Jackpot hit. You can lock in gains now or keep spinning with the same guardrails.";
  }

  if (outcome?.netChange > 0 && state.spins > 4) {
    return "Nice result. If you are ahead, consider setting a target to cash out.";
  }

  return "Set a clear stopping point and keep bets within your comfort zone.";
}

function createViewModel(state) {
  const tier = getTierForPoints(state.loyaltyPoints);
  const nextTier = getNextTier(state.loyaltyPoints);
  const lossAmount = computeLossAmount(state);
  const todayKey = getDateKey();
  const canClaimDaily = state.daily.lastClaimDate !== todayKey;
  const nextTierPoints = nextTier ? nextTier.minPoints : tier.minPoints;
  const tierProgress = nextTier
    ? (state.loyaltyPoints - tier.minPoints) / (nextTier.minPoints - tier.minPoints)
    : 1;

  const spinAvailability = getSpinAvailability(state);

  return {
    ...state,
    canSpin: spinAvailability.canSpin,
    spinBlockReason: spinAvailability.reason,
    net: computeNet(state),
    lossAmount,
    lossProgress: state.lossLimit > 0 ? Math.min(1, lossAmount / state.lossLimit) : 0,
    canClaimDaily,
    loyaltyTier: tier.name,
    loyaltyDailyBonus: tier.dailyBonus,
    nextTierName: nextTier ? nextTier.name : "Top tier reached",
    nextTierPoints,
    tierProgress: Math.max(0, Math.min(1, tierProgress)),
    responsiblePrompt: buildResponsiblePrompt(state, state.lastOutcome)
  };
}

function getSpinAvailability(state) {
  if (state.pendingBet !== null) {
    return { canSpin: false, reason: "Spin in progress." };
  }
  if (state.isPausedByLimit) {
    return { canSpin: false, reason: state.pauseReason };
  }
  if (state.balance < state.currentBet) {
    return { canSpin: false, reason: "Balance is below your current bet." };
  }
  if (state.balance < MIN_BET) {
    return { canSpin: false, reason: "Not enough balance for minimum bet. Start a new session." };
  }
  return { canSpin: true, reason: "" };
}

export function createGame(savedState) {
  let state = normalizeState(savedState);
  const listeners = new Set();

  function emit(event) {
    const viewModel = createViewModel(state);
    for (const listener of listeners) {
      listener(viewModel, event);
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getPersistableState() {
    const { pendingBet, ...persistableState } = state;
    return {
      ...persistableState,
      pendingBet: null
    };
  }

  function setBet(nextBet) {
    state.currentBet = clampBet(nextBet);
    emit({ type: "bet-updated" });
  }

  function shiftBet(direction) {
    const delta = direction === "up" ? BET_STEP : -BET_STEP;
    setBet(state.currentBet + delta);
  }

  function setLossLimit(nextLimit) {
    state.lossLimit = clampLossLimit(nextLimit);
    if (computeLossAmount(state) < state.lossLimit) {
      state.isPausedByLimit = false;
      state.pauseReason = "";
    }
    emit({ type: "loss-limit-updated" });
  }

  function updateSetting(name, value) {
    if (!(name in state.settings)) {
      return;
    }
    if (name === "soundVolume") {
      state.settings.soundVolume = Math.min(1, Math.max(0, Number(value)));
    } else {
      state.settings[name] = Boolean(value);
    }
    emit({ type: "setting-updated", name });
  }

  function beginSpin() {
    const availability = getSpinAvailability(state);
    if (!availability.canSpin) {
      return { ok: false, reason: availability.reason };
    }

    const bet = state.currentBet;
    state.balance -= bet;
    state.totalSpent += bet;
    state.spins += 1;
    state.pendingBet = bet;

    emit({ type: "spin-started", bet });
    return { ok: true, bet };
  }

  function settleSpin(reelIds) {
    if (state.pendingBet === null) {
      return {
        ok: false,
        reason: "No pending spin to settle."
      };
    }

    const bet = state.pendingBet;
    const evaluation = evaluateSpin(reelIds, bet);
    state.currentReels = [...reelIds];
    state.balance += evaluation.payout;
    state.totalWon += evaluation.payout;
    state.pendingBet = null;
    state.loyaltyPoints += bet;

    const currentCheckpoint = Math.floor(state.loyaltyPoints / LOYALTY_CHECKPOINT_POINTS);
    let loyaltyBonusAwarded = 0;
    if (currentCheckpoint > state.loyaltyBonusCheckpoint) {
      const checkpointDelta = currentCheckpoint - state.loyaltyBonusCheckpoint;
      loyaltyBonusAwarded = checkpointDelta * LOYALTY_CHECKPOINT_BONUS;
      state.balance += loyaltyBonusAwarded;
      state.totalWon += loyaltyBonusAwarded;
      state.loyaltyBonusCheckpoint = currentCheckpoint;
    }

    const netChange = evaluation.payout - bet;
    if (evaluation.payout > 0) {
      state.wins += 1;
    }

    if (computeLossAmount(state) >= state.lossLimit) {
      state.isPausedByLimit = true;
      state.pauseReason = "Loss limit reached. Session paused to protect your budget.";
    }

    const resultMessage = evaluation.isWin
      ? evaluation.isJackpot
        ? "JACKPOT: Model cluster aligned."
        : `Win: ${evaluation.matchedRule.label}`
      : "No payout this spin.";

    const detailMessage = evaluation.isWin
      ? `Bet ${formatTokens(bet)} -> Payout ${formatTokens(evaluation.payout)} (${evaluation.multiplier}x)`
      : `Bet ${formatTokens(bet)} -> Payout 0 (Net -${formatTokens(bet)})`;

    const outcome = {
      ...evaluation,
      bet,
      netChange,
      loyaltyBonusAwarded,
      resultMessage,
      detailMessage,
      responsiblePrompt: buildResponsiblePrompt(state, {
        ...evaluation,
        bet,
        netChange
      })
    };

    state.lastOutcome = outcome;
    emit({ type: "spin-settled", outcome });
    return { ok: true, outcome };
  }

  function claimDailyReward(date = new Date()) {
    const todayKey = getDateKey(date);
    if (state.daily.lastClaimDate === todayKey) {
      return { claimed: false, reason: "Daily reward already claimed today." };
    }

    const yesterdayKey = getPreviousDateKey(date);
    state.daily.streak = state.daily.lastClaimDate === yesterdayKey ? state.daily.streak + 1 : 1;
    state.daily.lastClaimDate = todayKey;

    const tier = getTierForPoints(state.loyaltyPoints);
    const streakBonus = Math.min(35, state.daily.streak * 5);
    const reward = 30 + streakBonus + tier.dailyBonus;

    state.balance += reward;
    state.totalWon += reward;

    const outcome = {
      resultMessage: "Daily reward claimed.",
      detailMessage: `+${formatTokens(reward)} tokens (Streak ${state.daily.streak}, ${tier.name} tier bonus included).`,
      reward,
      streak: state.daily.streak
    };
    state.lastOutcome = {
      ...state.lastOutcome,
      ...outcome
    };
    emit({ type: "daily-claimed", outcome });
    return { claimed: true, outcome };
  }

  function resetSession() {
    const preservedSettings = { ...state.settings };
    const preservedDaily = { ...state.daily };
    const preservedLoyalty = {
      loyaltyPoints: state.loyaltyPoints,
      loyaltyBonusCheckpoint: state.loyaltyBonusCheckpoint
    };
    state = createDefaultState();
    state.settings = preservedSettings;
    state.daily = preservedDaily;
    state.loyaltyPoints = preservedLoyalty.loyaltyPoints;
    state.loyaltyBonusCheckpoint = preservedLoyalty.loyaltyBonusCheckpoint;
    emit({ type: "session-reset" });
  }

  return {
    subscribe,
    setBet,
    shiftBet,
    setLossLimit,
    updateSetting,
    beginSpin,
    settleSpin,
    claimDailyReward,
    resetSession,
    getViewModel: () => createViewModel(state),
    getPersistableState
  };
}

