/**
 * @fileoverview Main controller for slot machine flow and game lifecycle.
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
import { generateSpinResult, isNearMiss, REEL_SYMBOLS } from "./reels.js";
import { clearSession, loadSession, saveSession } from "./storage.js";
import {
  animateLever,
  animateReels,
  getUIRefs,
  hideBigWinOverlay,
  markReelsAsWin,
  pulseMachine,
  renderPaytable,
  renderSummary,
  setModalOpen,
  setOutcome,
  setReelSymbols,
  setResponsiblePrompt,
  setRtp,
  setSpinEnabled,
  showBigWinOverlay,
  showScreen,
  syncControls
} from "./ui.js";

const AGE_CUTOFF_DATE = new Date(2005, 3, 22, 23, 59, 59, 999);
const AGE_CUTOFF_LABEL = "04/22/2005";
const BIG_WIN_THRESHOLD = 15;

const refs = getUIRefs();
let state = createInitialState(loadSession() || {});
const audio = createAudioEngine({
  enabledAtStart: state.settings.soundEnabled,
  volume: state.settings.volume
});
let bigWinTimer = null;

renderPaytable(refs, getPaytableRows());
setRtp(refs, THEORETICAL_RTP);
setReelSymbols(refs, REEL_SYMBOLS.slice(0, 3));
showScreen(refs, "entry");
setModalOpen(refs, false);
hideBigWinOverlay(refs);

const daily = applyDailyReward(state, new Date());
if (daily.granted) {
  setOutcome(
    refs,
    `Daily reward +${daily.reward} tokens. Streak: ${daily.streak} day(s).`,
    "win"
  );
}

saveSession(state);
render();
registerEvents();

function registerEvents() {
  document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
  document.addEventListener("keydown", unlockAudioOnce, { once: true });

  refs.playButton.addEventListener("click", () => {
    unlockAudioOnce();
    showScreen(refs, "age");
    refs.dobInput.focus();
  });

  refs.backToEntry.addEventListener("click", () => {
    showScreen(refs, "entry");
    setAgeGateMessage("Compliance check required before gameplay.", "neutral");
  });

  refs.ageGateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateAgeGate(refs.dobInput.value);

    setAgeGateMessage(result.message, result.tone);
    if (!result.ok) {
      return;
    }

    showScreen(refs, "game");
    audio.playWelcome();
    audio.playBgm();
    setOutcome(refs, "Verification complete. Pull the lever when ready.", "neutral");
    saveSession(state);
  });

  refs.openInfoButton.addEventListener("click", () => {
    setModalOpen(refs, true);
  });

  refs.openInfoInGame.addEventListener("click", () => {
    setModalOpen(refs, true);
  });

  refs.backToHomeFromGame.addEventListener("click", () => {
    dismissBigWinOverlay();
    setModalOpen(refs, false);
    showScreen(refs, "entry");
    setAgeGateMessage("Compliance check required before gameplay.", "neutral");
  });

  refs.closeInfoButton.addEventListener("click", () => {
    setModalOpen(refs, false);
  });

  refs.closeInfoBackdrop.addEventListener("click", () => {
    setModalOpen(refs, false);
  });

  refs.bigWinOverlay.addEventListener("click", () => {
    dismissBigWinOverlay();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setModalOpen(refs, false);
      dismissBigWinOverlay();
    }
  });

  refs.leverSpin.addEventListener("click", () => onSpin(true));

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
    updateSoundSetting(refs.soundToggle.checked);
  });

  refs.entrySoundToggle.addEventListener("change", () => {
    updateSoundSetting(refs.entrySoundToggle.checked);
  });

  refs.volumeControl.addEventListener("input", () => {
    updateVolumeSetting(Number(refs.volumeControl.value));
  });

  refs.entryVolumeControl.addEventListener("input", () => {
    updateVolumeSetting(Number(refs.entryVolumeControl.value));
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
    setReelSymbols(refs, REEL_SYMBOLS.slice(0, 3));
    saveAndRender("Session totals reset. Daily reward tracking was kept.", "neutral");
  });
}

function unlockAudioOnce() {
  audio.prime();
  audio.playBgm();
}

function setAgeGateMessage(text, tone = "neutral") {
  refs.ageGateMessage.textContent = text;
  refs.ageGateMessage.classList.remove("success", "error");
  if (tone === "success") {
    refs.ageGateMessage.classList.add("success");
  }
  if (tone === "error") {
    refs.ageGateMessage.classList.add("error");
  }
}

function validateAgeGate(value) {
  const parsed = parseBirthDate(value);
  if (!parsed.ok) {
    return {
      ok: false,
      tone: "error",
      message: "Enter a valid date in MM/DD/YYYY format."
    };
  }

  if (parsed.date > AGE_CUTOFF_DATE) {
    return {
      ok: false,
      tone: "error",
      message: `Access denied: You must be 21 or older. Latest eligible birth date is ${AGE_CUTOFF_LABEL}.`
    };
  }

  return {
    ok: true,
    tone: "success",
    message: "Verification passed. Entering gameplay..."
  };
}

function parseBirthDate(rawValue) {
  const value = String(rawValue || "").trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return { ok: false, date: null };
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return { ok: false, date: null };
  }

  const date = new Date(year, month - 1, day);
  const validDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!validDate) {
    return { ok: false, date: null };
  }

  return { ok: true, date };
}

function updateSoundSetting(enabled) {
  state.settings.soundEnabled = Boolean(enabled);
  audio.setEnabled(state.settings.soundEnabled);
  if (state.settings.soundEnabled) {
    unlockAudioOnce();
  }
  saveAndRender(`Sound ${state.settings.soundEnabled ? "enabled" : "muted"}.`);
}

function updateVolumeSetting(percent) {
  const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
  state.settings.volume = normalized / 100;
  audio.setVolume(state.settings.volume);
  saveAndRender(`Volume set to ${normalized}%.`);
}

function dismissBigWinOverlay() {
  if (bigWinTimer) {
    clearTimeout(bigWinTimer);
    bigWinTimer = null;
  }
  hideBigWinOverlay(refs);
}

async function onSpin(fromLever) {
  const allowed = canSpin(state);
  if (!allowed.ok) {
    setOutcome(refs, allowed.reason, "caution");
    render();
    return;
  }

  if (fromLever) {
    animateLever(refs);
  }

  dismissBigWinOverlay();
  startSpin(state);
  markReelsAsWin(refs, false);
  setOutcome(refs, "Reels are spinning...", "neutral");
  audio.playSpin();
  saveSession(state);
  render();

  const symbols = generateSpinResult();
  await animateReels(refs, symbols, {
    reducedMotion: state.settings.reducedMotion
  });

  const payout = evaluatePayout(symbols, state.bet);
  const nearMiss = isNearMiss(symbols) && payout.payout === 0;
  const round = finishSpin(state, payout.payout);
  const isMajorWin = payout.multiplier >= BIG_WIN_THRESHOLD;

  if (payout.payout > 0) {
    audio.playWin(isMajorWin);
    pulseMachine(refs);
  } else {
    audio.playLoss();
  }

  if (round.limitState.nearLimit || round.limitState.hitLimit) {
    audio.playLimitWarning();
  }

  if (isMajorWin) {
    showBigWinOverlay(refs, `${payout.reason} secured ${payout.payout} tokens!`, {
      reducedMotion: state.settings.reducedMotion
    });
    bigWinTimer = setTimeout(() => {
      dismissBigWinOverlay();
    }, state.settings.reducedMotion ? 1800 : 3400);
  }

  markReelsAsWin(refs, payout.payout > 0);

  const message = buildOutcomeMessage(
    payout,
    round.roundNet,
    round.loyaltyReward,
    nearMiss,
    isMajorWin
  );

  const tone = round.limitState.hitLimit
    ? "caution"
    : round.roundNet > 0
      ? "win"
      : round.roundNet === 0
        ? "neutral"
        : "loss";

  saveAndRender(message, tone);
}

function buildOutcomeMessage(payout, roundNet, loyaltyReward, nearMiss, isMajorWin) {
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

  if (isMajorWin) {
    return `Major win: ${payout.reason} paid ${payout.payout}. Net this spin: +${roundNet}.${rewardText}`;
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
