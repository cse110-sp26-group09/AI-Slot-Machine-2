/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import {
  applyDailyReward,
  BET_CONFIG,
  canSpin,
  createInitialState,
  finishSpin,
  getResponsiblePrompt,
  getSessionSummary,
  nudgeBet,
  setBet,
  setLossLimit,
  startSpin
} from "./game.js";
import { createAudioEngine } from "./audio.js";
import { setAccessibilityMode, applyAccessibility } from "./accessibility.js";
import { evaluatePayout, getPaytableRows, THEORETICAL_RTP } from "./payouts.js";
import { generateSpinResult, isNearMiss } from "./reels.js";
import { clearSession, loadSession, saveSession } from "./storage.js";
import {
  animateReels,
  getUIRefs,
  markReelsAsWin,
  renderPaytable,
  renderSummary,
  setOutcome,
  setResponsiblePrompt,
  setRtp,
  setSpinEnabled,
  syncControls
} from "./ui.js";

const refs = getUIRefs();
let state = createInitialState(loadSession() || {});
const audio = createAudioEngine(state.settings.soundEnabled);

renderPaytable(refs, getPaytableRows());
setRtp(refs, THEORETICAL_RTP);

const daily = applyDailyReward(state, new Date());
if (daily.granted) {
  setOutcome(
    refs,
    `Daily compute stipend +${daily.reward} tokens. Streak: ${daily.streak} day(s).`,
    "win"
  );
}

saveSession(state);
render();
registerEvents();

function registerEvents() {
  refs.spinButton.addEventListener("click", onSpin);

  refs.betInput.addEventListener("change", () => {
    setBet(state, Number(refs.betInput.value));
    saveAndRender(`Bet set to ${state.bet} tokens.`);
  });

  refs.betDown.addEventListener("click", () => {
    nudgeBet(state, "down");
    saveAndRender(`Bet set to ${state.bet} tokens.`);
  });

  refs.betUp.addEventListener("click", () => {
    nudgeBet(state, "up");
    saveAndRender(`Bet set to ${state.bet} tokens.`);
  });

  refs.soundToggle.addEventListener("change", () => {
    state.settings.soundEnabled = refs.soundToggle.checked;
    audio.setEnabled(state.settings.soundEnabled);
    saveAndRender(`Sound ${state.settings.soundEnabled ? "enabled" : "muted"}.`);
  });

  refs.accessibilityMode.addEventListener("change", () => {
    setAccessibilityMode(state.settings, refs.accessibilityMode.checked);
    saveAndRender(
      refs.accessibilityMode.checked
        ? "Accessibility mode enabled."
        : "Accessibility mode disabled."
    );
  });

  refs.reducedMotionToggle.addEventListener("change", () => {
    state.settings.reducedMotion = refs.reducedMotionToggle.checked;
    saveAndRender(
      state.settings.reducedMotion ? "Reduced motion enabled." : "Reduced motion disabled."
    );
  });

  refs.applyLossLimit.addEventListener("click", () => {
    const limitState = setLossLimit(state, Number(refs.lossLimitInput.value));
    if (limitState.hitLimit) {
      saveAndRender(
        "Loss limit reached. Spin is paused until you raise the limit or reset totals.",
        "caution"
      );
      return;
    }
    saveAndRender(
      state.lossLimit > 0
        ? `Session loss limit set to ${state.lossLimit} tokens.`
        : "Session loss limit turned off.",
      "neutral"
    );
  });

  refs.resetSession.addEventListener("click", () => {
    const shouldReset = window.confirm(
      "Reset spend/win totals and gameplay stats for this session?"
    );
    if (!shouldReset) {
      return;
    }

    const carry = {
      settings: { ...state.settings },
      lastDailyRewardDate: state.lastDailyRewardDate,
      dailyRewardStreak: state.dailyRewardStreak
    };
    state = createInitialState(carry);
    clearSession();
    saveAndRender("Session totals reset. Daily reward tracking was kept.", "neutral");
  });
}

async function onSpin() {
  const allowed = canSpin(state);
  if (!allowed.ok) {
    setOutcome(refs, allowed.reason, "caution");
    render();
    return;
  }

  startSpin(state);
  markReelsAsWin(refs, false);
  setOutcome(refs, "Spinning reels...", "neutral");
  saveSession(state);
  render();

  const symbols = generateSpinResult();
  await animateReels(refs, symbols, {
    reducedMotion: state.settings.reducedMotion,
    onTick: () => audio.playReelTick()
  });

  const payout = evaluatePayout(symbols, state.bet);
  const nearMiss = isNearMiss(symbols) && payout.payout === 0;
  const round = finishSpin(state, payout.payout);

  if (payout.payout > 0) {
    audio.playWin(payout.multiplier);
  } else {
    audio.playLoss();
  }
  if (round.limitState.nearLimit || round.limitState.hitLimit) {
    audio.playLimitWarning();
  }

  markReelsAsWin(refs, payout.payout > 0);
  const message = buildOutcomeMessage(payout, round.roundNet, round.loyaltyReward, nearMiss);

  const tone = round.limitState.hitLimit
    ? "caution"
    : round.roundNet > 0
      ? "win"
      : round.roundNet === 0
        ? "neutral"
        : "loss";

  saveAndRender(message, tone);
}

function buildOutcomeMessage(payout, roundNet, loyaltyReward, nearMiss) {
  const rewardText =
    loyaltyReward > 0 ? ` Loyalty +${loyaltyReward} tokens for 10 spins.` : "";

  if (state.isPaused && state.pauseReason === "loss-limit") {
    return `Loss limit reached. Gameplay paused.${rewardText}`;
  }

  if (payout.payout === 0 && nearMiss) {
    return `Near miss on a high-value symbol. No payout this spin.${rewardText}`;
  }

  if (payout.payout === 0) {
    return `No match. Net this spin: -${state.bet}.${rewardText}`;
  }

  if (roundNet > 0) {
    return `Payout ${payout.payout} (${payout.reason}). Net this spin: +${roundNet}.${rewardText}`;
  }

  if (roundNet === 0) {
    return `Returned your full bet with ${payout.reason}. Break-even spin.${rewardText}`;
  }

  return `Partial payout ${payout.payout} (${payout.reason}), but net this spin: ${roundNet}.${rewardText}`;
}

function render() {
  const summary = getSessionSummary(state);
  renderSummary(refs, state, summary);
  syncControls(refs, state);
  applyAccessibility(state.settings);
  setSpinEnabled(refs, canSpin(state).ok);

  refs.betInput.min = String(BET_CONFIG.min);
  refs.betInput.max = String(BET_CONFIG.max);
  refs.betInput.step = String(BET_CONFIG.step);

  const prompt = getResponsiblePrompt(state);
  setResponsiblePrompt(refs, prompt.text, prompt.tone);
}

function saveAndRender(message, tone = "neutral") {
  if (message) {
    setOutcome(refs, message, tone);
  }
  saveSession(state);
  render();
}
