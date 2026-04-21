import { REEL_SYMBOLS, spinReels } from "./reels.js";
import { PAYTABLE_ROWS, calculateTheoreticalRtp, evaluateSpin } from "./payouts.js";

const STARTING_BALANCE = 500;
const BET_MIN = 5;
const BET_MAX = 100;
const BET_STEP = 5;
const DEFAULT_LOSS_LIMIT = 150;

const LOYALTY_TIERS = Object.freeze([
  { name: "Bronze", min: 0, nextMin: 150 },
  { name: "Silver", min: 150, nextMin: 400 },
  { name: "Gold", min: 400, nextMin: 800 },
  { name: "Platinum", min: 800, nextMin: null },
]);

/**
 * Main game coordinator.
 * @param {{
 * ui: ReturnType<import("./ui.js").createUI>,
 * audio: ReturnType<import("./audio.js").createAudioController>,
 * storage: ReturnType<import("./storage.js").createStorage>,
 * accessibility: ReturnType<import("./accessibility.js").createAccessibilityController>
 * }} dependencies
 */
export function createGameController({ ui, audio, storage, accessibility }) {
  const restored = storage.loadState();
  let state = hydrateState(restored);
  const symbolMap = new Map(REEL_SYMBOLS.map((symbol) => [symbol.id, symbol]));
  const rtp = calculateTheoreticalRtp(REEL_SYMBOLS);
  let banner = { text: "Ready to spin.", tone: "info" };

  /**
   * Startup sequence.
   */
  function init() {
    ui.renderPaytable(PAYTABLE_ROWS);
    wireEvents();
    applySettings();
    syncLossLimitState();
    render();
    ui.setRestoreNote(
      restored
        ? "Session restored from browser storage."
        : "Session auto-save is active in this browser.",
    );
  }

  function wireEvents() {
    ui.bindControls({
      onSpin: handleSpin,
      onBetStep: (direction) => setBet(state.bet + direction * BET_STEP, false),
      onBetInput: (value) => setBet(value, false),
      onSetLossLimit: setLossLimit,
      onClaimDailyReward: claimDailyReward,
      onToggleSound: (enabled) => {
        state.settings.soundEnabled = enabled;
        audio.setEnabled(enabled);
        saveAndRender();
      },
      onVolumeChange: (volume) => {
        state.settings.volume = clampVolume(volume);
        audio.setVolume(state.settings.volume);
        saveAndRender();
      },
      onToggleContrast: (enabled) => {
        state.settings.highContrast = enabled;
        applySettings();
        saveAndRender();
      },
      onToggleLargeText: (enabled) => {
        state.settings.largeText = enabled;
        applySettings();
        saveAndRender();
      },
      onToggleMotion: (enabled) => {
        state.settings.reducedMotion = enabled;
        applySettings();
        saveAndRender();
      },
      onNewSession: startFreshSession,
    });
  }

  function applySettings() {
    audio.setEnabled(state.settings.soundEnabled);
    audio.setVolume(state.settings.volume);
    accessibility.apply(state.settings);
  }

  async function handleSpin() {
    if (state.isSpinning) {
      return;
    }

    if (state.controls.pausedByLimit) {
      audio.playLimit();
      setBanner("Loss limit reached. Raise the limit or start a fresh session.", "warn");
      render();
      return;
    }

    if (state.balance < state.bet) {
      audio.playLimit();
      setBanner("Insufficient balance for this bet. Lower your bet or claim your daily reward.", "warn");
      render();
      return;
    }

    if (isHighRiskBet() && !state.session.highBetAcknowledged) {
      const confirmed = window.confirm(
        "This bet is over 35% of your current balance. Continue with this higher-risk spin?",
      );
      if (!confirmed) {
        setBanner("Spin canceled. Bet remains unchanged.", "info");
        render();
        return;
      }
      state.session.highBetAcknowledged = true;
    }

    const betAmount = state.bet;
    state.isSpinning = true;
    state.session.spins += 1;
    state.session.spent += betAmount;
    state.session.lastSpinAt = new Date().toISOString();
    state.balance -= betAmount;
    state.loyalty.points += Math.max(1, Math.floor(betAmount / 5));
    saveState();

    setBanner("Running inference...", "info");
    render();

    audio.playSpinStart();

    let symbols;
    try {
      symbols = await spinReels({
        reducedMotion: state.settings.reducedMotion,
        onReelStart(reelIndex) {
          ui.setReelSpinning(reelIndex, true);
          audio.playSpinTick();
        },
        onReelUpdate(reelIndex, symbolId, isFinal) {
          const symbol = symbolMap.get(symbolId);
          if (!symbol) {
            return;
          }
          ui.updateReel(reelIndex, symbol, isFinal);
          if (isFinal) {
            audio.playReelStop(reelIndex);
          }
        },
      });
    } finally {
      audio.stopSpinLoop();
    }

    if (!symbols) {
      state.isSpinning = false;
      setBanner("Spin interrupted. Please try again.", "warn");
      saveAndRender();
      return;
    }

    state.reels = symbols;

    const result = evaluateSpin(symbols, betAmount);
    if (result.payout > 0) {
      state.balance += result.payout;
      state.session.won += result.payout;
      state.session.wins += 1;
      audio.playWin(result.multiplier);
      ui.playWinFeedback({
        major: result.lineType === "jackpot",
        payout: result.payout,
        multiplier: result.multiplier,
        reducedMotion: state.settings.reducedMotion,
      });
    } else {
      audio.playLoss();
    }

    state.isSpinning = false;
    const limitNotice = syncLossLimitState();
    const reminder = getResponsibleReminder();
    const outcomeMessage = buildOutcomeMessage(result);

    if (limitNotice) {
      setBanner(`${outcomeMessage} ${limitNotice}`, "warn");
      audio.playLimit();
    } else if (reminder) {
      setBanner(`${outcomeMessage} ${reminder}`, result.lineType === "loss" ? "warn" : "info");
    } else {
      setBanner(outcomeMessage, getToneForResult(result.lineType));
    }

    saveAndRender();
  }

  /**
   * @param {number} requested
   * @param {boolean} withMessage
   */
  function setBet(requested, withMessage) {
    state.bet = normalizeBet(requested);
    if (withMessage) {
      setBanner(`Bet set to ${state.bet} tokens.`, "info");
    }
    saveAndRender();
  }

  /**
   * @param {number} requestedLimit
   */
  function setLossLimit(requestedLimit) {
    const normalized = normalizeWholeNumber(requestedLimit, DEFAULT_LOSS_LIMIT);
    state.controls.lossLimit = Math.max(0, normalized);
    const notice = syncLossLimitState();
    if (state.controls.lossLimit === 0) {
      setBanner("Loss limit disabled. You can re-enable it any time.", "info");
    } else if (notice) {
      setBanner("Current session loss already meets this limit, so play is paused.", "warn");
    } else {
      setBanner(`Loss limit set to ${state.controls.lossLimit} tokens.`, "info");
    }
    saveAndRender();
  }

  function claimDailyReward() {
    const reward = getDailyRewardInfo(state.reward.lastClaimDate, state.reward.streak);
    if (!reward.available) {
      setBanner("Daily compute bonus already claimed today.", "info");
      render();
      return;
    }

    state.balance += reward.amount;
    state.session.bonus += reward.amount;
    state.reward.lastClaimDate = reward.todayKey;
    state.reward.streak = reward.nextStreak;
    syncLossLimitState();

    audio.playReward();
    setBanner(`Daily bonus credited: +${reward.amount} tokens. Streak ${reward.nextStreak}.`, "win");
    saveAndRender();
  }

  function startFreshSession() {
    const shouldReset = window.confirm(
      "Start a fresh session with a new balance? Loyalty, reward streak, and settings will be kept.",
    );
    if (!shouldReset) {
      return;
    }

    const preserved = {
      settings: { ...state.settings },
      reward: { ...state.reward },
      loyalty: { ...state.loyalty },
    };

    state = createDefaultState();
    state.settings = preserved.settings;
    state.reward = preserved.reward;
    state.loyalty = preserved.loyalty;
    applySettings();

    setBanner("Fresh session started.", "info");
    saveAndRender();
  }

  function saveAndRender() {
    saveState();
    render();
  }

  function saveState() {
    storage.saveState(state);
  }

  function render() {
    ui.renderState({
      state,
      derived: buildDerivedState(state),
      symbolMap,
      banner,
      rtp,
    });
  }

  /**
   * @param {string} text
   * @param {"info" | "win" | "warn" | "loss"} tone
   */
  function setBanner(text, tone) {
    banner = { text, tone };
  }

  /**
   * @returns {string | null}
   */
  function syncLossLimitState() {
    const sessionLoss = getSessionLoss(state);
    const limit = state.controls.lossLimit;

    if (limit <= 0) {
      state.controls.pausedByLimit = false;
      state.session.limitWarningShown = false;
      return null;
    }

    if (sessionLoss >= limit) {
      state.controls.pausedByLimit = true;
      return "Loss limit reached. Gameplay is paused.";
    }

    state.controls.pausedByLimit = false;

    if (sessionLoss >= Math.floor(limit * 0.8) && !state.session.limitWarningShown) {
      state.session.limitWarningShown = true;
      return "You are close to your loss limit.";
    }

    if (sessionLoss < Math.floor(limit * 0.6)) {
      state.session.limitWarningShown = false;
    }

    return null;
  }

  /**
   * @returns {string | null}
   */
  function getResponsibleReminder() {
    const net = getSessionNet(state);
    if (state.session.spins === 1 && state.controls.lossLimit === 0) {
      return "Tip: set a loss limit to keep your session bounded.";
    }

    if (state.session.spins > 0 && state.session.spins % 12 === 0 && net < 0) {
      return "Reminder: a short break can keep play fun and clear-headed.";
    }

    return null;
  }

  /**
   * @param {{title: string, spinNet: number, payout: number}} result
   * @returns {string}
   */
  function buildOutcomeMessage(result) {
    const net = getSessionNet(state);
    const sessionNet = net > 0 ? `Session net +${net}.` : net < 0 ? `Session net -${Math.abs(net)}.` : "Session net 0.";

    if (result.payout === 0) {
      return `${result.title}. No payout this spin (${Math.abs(result.spinNet)} token cost). ${sessionNet}`;
    }

    if (result.spinNet === 0) {
      return `${result.title}. Break-even spin. ${sessionNet}`;
    }

    return `${result.title}. Spin net +${result.spinNet} tokens. ${sessionNet}`;
  }

  /**
   * @param {"jackpot" | "win" | "push" | "loss"} resultType
   * @returns {"info" | "win" | "warn" | "loss"}
   */
  function getToneForResult(resultType) {
    if (resultType === "jackpot" || resultType === "win") {
      return "win";
    }
    if (resultType === "loss") {
      return "loss";
    }
    return "info";
  }

  function isHighRiskBet() {
    return state.bet >= Math.ceil(state.balance * 0.35);
  }

  return { init };
}

/**
 * @param {any} restored
 * @returns {any}
 */
function hydrateState(restored) {
  const defaults = createDefaultState();
  if (!restored || typeof restored !== "object") {
    return defaults;
  }

  const next = {
    ...defaults,
    ...restored,
    session: {
      ...defaults.session,
      ...restored.session,
    },
    controls: {
      ...defaults.controls,
      ...restored.controls,
    },
    loyalty: {
      ...defaults.loyalty,
      ...restored.loyalty,
    },
    reward: {
      ...defaults.reward,
      ...restored.reward,
    },
    settings: {
      ...defaults.settings,
      ...restored.settings,
    },
  };

  next.balance = normalizeWholeNumber(next.balance, STARTING_BALANCE);
  next.bet = normalizeBet(next.bet);
  next.session.spent = normalizeWholeNumber(next.session.spent, 0);
  next.session.won = normalizeWholeNumber(next.session.won, 0);
  next.session.bonus = normalizeWholeNumber(next.session.bonus, 0);
  next.session.spins = normalizeWholeNumber(next.session.spins, 0);
  next.session.wins = normalizeWholeNumber(next.session.wins, 0);
  next.loyalty.points = normalizeWholeNumber(next.loyalty.points, 0);
  next.controls.lossLimit = Math.max(0, normalizeWholeNumber(next.controls.lossLimit, DEFAULT_LOSS_LIMIT));
  next.settings.volume = clampVolume(next.settings.volume);
  next.settings.soundEnabled = Boolean(next.settings.soundEnabled);
  next.settings.highContrast = Boolean(next.settings.highContrast);
  next.settings.largeText = Boolean(next.settings.largeText);
  next.settings.reducedMotion = Boolean(next.settings.reducedMotion);
  next.isSpinning = false;
  next.reels = sanitizeReels(next.reels);

  return next;
}

/**
 * @returns {any}
 */
function createDefaultState() {
  return {
    version: 1,
    balance: STARTING_BALANCE,
    bet: 20,
    reels: ["MODEL", "TOKEN", "PROMPT"],
    isSpinning: false,
    session: {
      spent: 0,
      won: 0,
      bonus: 0,
      spins: 0,
      wins: 0,
      createdAt: new Date().toISOString(),
      lastSpinAt: null,
      limitWarningShown: false,
      highBetAcknowledged: false,
    },
    controls: {
      lossLimit: DEFAULT_LOSS_LIMIT,
      pausedByLimit: false,
    },
    loyalty: {
      points: 0,
    },
    reward: {
      lastClaimDate: null,
      streak: 0,
    },
    settings: {
      soundEnabled: true,
      volume: 0.6,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
    },
  };
}

/**
 * @param {any} state
 * @returns {{
 * canSpin: boolean,
 * sessionLoss: number,
 * sessionNet: number,
 * sessionNetClass: string,
 * winRatePercent: number,
 * limitStatusText: string,
 * dailyReward: {available: boolean, amount: number, nextStreak: number},
 * loyalty: {tier: string, progressPercent: number, nextText: string}
 * }}
 */
function buildDerivedState(state) {
  const sessionNet = getSessionNet(state);
  const sessionLoss = getSessionLoss(state);
  const winRatePercent =
    state.session.spins > 0 ? Math.round((state.session.wins / state.session.spins) * 100) : 0;
  const dailyReward = getDailyRewardInfo(state.reward.lastClaimDate, state.reward.streak);
  const loyalty = getLoyaltyProgress(state.loyalty.points);

  let limitStatusText = "Loss limit disabled.";
  if (state.controls.lossLimit > 0) {
    limitStatusText = `${sessionLoss}/${state.controls.lossLimit} tokens used.`;
    if (state.controls.pausedByLimit) {
      limitStatusText = "Loss limit reached. Raise limit or reset session.";
    }
  }

  return {
    canSpin: !state.isSpinning && !state.controls.pausedByLimit && state.balance >= state.bet,
    sessionLoss,
    sessionNet,
    sessionNetClass: sessionNet > 0 ? "net-positive" : sessionNet < 0 ? "net-negative" : "net-neutral",
    winRatePercent,
    limitStatusText,
    dailyReward,
    loyalty,
  };
}

/**
 * @param {any} state
 * @returns {number}
 */
function getSessionNet(state) {
  return state.session.won + state.session.bonus - state.session.spent;
}

/**
 * @param {any} state
 * @returns {number}
 */
function getSessionLoss(state) {
  return Math.max(0, -getSessionNet(state));
}

/**
 * @param {number} value
 * @returns {number}
 */
function normalizeBet(value) {
  const numeric = Number.isFinite(value) ? value : 20;
  const snapped = Math.round(numeric / BET_STEP) * BET_STEP;
  return Math.min(BET_MAX, Math.max(BET_MIN, snapped));
}

/**
 * @param {number} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizeWholeNumber(value, fallback) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.floor(numeric));
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 0.6;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * @param {unknown} reels
 * @returns {string[]}
 */
function sanitizeReels(reels) {
  if (!Array.isArray(reels) || reels.length !== 3) {
    return ["MODEL", "TOKEN", "PROMPT"];
  }

  const validIds = new Set(REEL_SYMBOLS.map((symbol) => symbol.id));
  return reels.map((id) => (validIds.has(id) ? id : "GLITCH"));
}

/**
 * @param {string | null} lastClaimDate
 * @param {number} currentStreak
 * @returns {{available: boolean, amount: number, nextStreak: number, todayKey: string}}
 */
function getDailyRewardInfo(lastClaimDate, currentStreak) {
  const todayKey = getLocalDateKey(new Date());
  const normalizedStreak = normalizeWholeNumber(currentStreak, 0);

  if (lastClaimDate === todayKey) {
    return {
      available: false,
      amount: 0,
      nextStreak: normalizedStreak,
      todayKey,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const nextStreak = lastClaimDate === yesterdayKey ? normalizedStreak + 1 : 1;
  const amount = Math.min(20 + nextStreak * 5, 80);

  return {
    available: true,
    amount,
    nextStreak,
    todayKey,
  };
}

/**
 * @param {number} points
 * @returns {{tier: string, progressPercent: number, nextText: string}}
 */
function getLoyaltyProgress(points) {
  const cleanPoints = normalizeWholeNumber(points, 0);
  const tier = LOYALTY_TIERS.find((item) => {
    if (item.nextMin === null) {
      return cleanPoints >= item.min;
    }
    return cleanPoints >= item.min && cleanPoints < item.nextMin;
  });

  if (!tier) {
    return {
      tier: "Bronze",
      progressPercent: 0,
      nextText: "Next tier in 150 points.",
    };
  }

  if (tier.nextMin === null) {
    return {
      tier: tier.name,
      progressPercent: 100,
      nextText: "Top tier unlocked.",
    };
  }

  const span = tier.nextMin - tier.min;
  const progressPercent = Math.round(((cleanPoints - tier.min) / span) * 100);
  const pointsRemaining = tier.nextMin - cleanPoints;

  return {
    tier: tier.name,
    progressPercent,
    nextText: `Next tier in ${pointsRemaining} points.`,
  };
}

/**
 * @param {Date} date
 * @returns {string}
 */
function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
