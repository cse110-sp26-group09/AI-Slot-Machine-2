/**
 * @fileoverview Client-side slot machine module.
 */

import { createGameEngine } from "./game.js";
import { getFairnessReport, getPaytableRows } from "./payouts.js";
import { createUI } from "./ui.js";
import { createAudioController } from "./audio.js";
import { createAccessibilityController } from "./accessibility.js";
import { getRandomSymbolId, getSymbolById } from "./reels.js";

const AGE_GATE_CUTOFF = new Date("2005-04-22T23:59:59");

/**
 * @param {string} dateText
 * @returns {{ok: boolean, message: string}}
 */
function validateBirthDate(dateText) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateText);

  if (!match) {
    return {
      ok: false,
      message: "Use MM/DD/YYYY format, for example 04/22/2000."
    };
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2026) {
    return {
      ok: false,
      message: "Enter a valid calendar date in MM/DD/YYYY format."
    };
  }

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return {
      ok: false,
      message: "Enter a real calendar date in MM/DD/YYYY format."
    };
  }

  if (parsed > AGE_GATE_CUTOFF) {
    return {
      ok: false,
      message: "Entry denied. You must be 21+ (born on or before 04/22/2005)."
    };
  }

  return {
    ok: true,
    message: "Age verified. Welcome to Bikini Bottom Reels."
  };
}

function isMajorWin(spinResult) {
  if (!spinResult || !spinResult.ok || spinResult.payoutInfo.payout <= 0) {
    return false;
  }

  const [first, second, third] = spinResult.symbols;
  return first === second && second === third;
}

document.addEventListener("DOMContentLoaded", () => {
  const game = createGameEngine();
  const audio = createAudioController();
  const accessibility = createAccessibilityController(document.body);

  const ui = createUI({
    getSymbolById,
    getRandomSymbolId,
    onSpin: handleSpin,
    onBetChange: handleBetChange,
    onLimitsChange: handleLimitsChange,
    onResume: handleResume,
    onReset: handleReset,
    onToggleAccessibility: handleA11yToggle,
    onToggleSound: handleSoundToggle,
    onVolumeChange: handleVolumeChange,
    onPlayRequest: handlePlayRequest,
    onSubmitAge: handleAgeSubmit,
    onBackFromAge: handleBackFromAge,
    onBackToHome: handleBackToHome
  });

  const fairnessReport = getFairnessReport();
  ui.renderPaytable(getPaytableRows());
  ui.renderFairness(fairnessReport);
  ui.renderAccessibilitySettings(accessibility.getSettings());
  ui.renderSoundSettings(audio.getSettings());

  const fairnessNote = document.getElementById("fairness-note");
  fairnessNote.textContent = fairnessReport.note;

  refreshView(game.getState(), game.getResponsiblePrompt());
  ui.showEntryScreen();

  function refreshView(state, advisoryText) {
    ui.renderState(state);
    ui.renderAdvisory(advisoryText || game.getResponsiblePrompt());
  }

  function handlePlayRequest() {
    audio.prime();
    audio.startBackgroundMusic();
    ui.setAgeFeedback("Verification required before gameplay.", "neutral");
    ui.showAgeScreen();
  }

  function handleBackFromAge() {
    ui.showEntryScreen();
  }

  function handleBackToHome() {
    ui.showEntryScreen();
  }

  function handleAgeSubmit(dateText) {
    const validation = validateBirthDate(dateText);

    if (!validation.ok) {
      ui.setAgeFeedback(validation.message, "warning");
      return;
    }

    ui.setAgeFeedback(validation.message, "win");
    ui.showGameScreen();
    ui.setMessage("Welcome to Bikini Bottom Reels. Set your bet and spin.", "neutral");
    audio.playWelcome();
  }

  function handleBetChange(nextBet) {
    const state = game.setBet(nextBet);
    refreshView(state, game.getResponsiblePrompt());
  }

  function handleLimitsChange(nextLimits) {
    const state = game.updateLimits(nextLimits);
    refreshView(state, game.getResponsiblePrompt());
  }

  function handleResume() {
    const resumeResult = game.resumeIfAllowed();

    if (!resumeResult.ok) {
      ui.setMessage(`${resumeResult.message} Adjust limits or reset the session.`, "warning");
      refreshView(resumeResult.state, game.getResponsiblePrompt());
      audio.playLimitReached();
      return;
    }

    ui.setMessage(resumeResult.message, "neutral");
    refreshView(resumeResult.state, game.getResponsiblePrompt());
  }

  function handleReset() {
    const state = game.resetSession();
    ui.setMessage("Session reset. Limits kept; progress restarted.", "neutral");
    refreshView(state, game.getResponsiblePrompt());
  }

  function handleA11yToggle(key, enabled) {
    const settings = accessibility.setSetting(key, enabled);
    ui.renderAccessibilitySettings(settings);
  }

  function handleSoundToggle(enabled) {
    audio.setEnabled(enabled);
    ui.renderSoundSettings(audio.getSettings());
  }

  function handleVolumeChange(level) {
    audio.setVolume(level);
    ui.renderSoundSettings(audio.getSettings());
  }

  async function handleSpin() {
    audio.prime();

    const spinResult = game.spin();

    if (!spinResult.ok) {
      ui.setMessage(spinResult.message, "warning");
      refreshView(spinResult.state, spinResult.advisory);
      audio.playLimitReached();
      return;
    }

    ui.setBusy(true);
    ui.setMessage("Spinning reels...", "neutral");
    audio.playSpin();

    const accessibilitySettings = accessibility.getSettings();
    await ui.animateReels(spinResult.symbols, accessibilitySettings.reducedMotion);

    ui.renderSpinResult(spinResult);

    if (spinResult.payoutInfo.payout > 0) {
      if (isMajorWin(spinResult)) {
        audio.playBigWin();
        ui.celebrateMajorWin(spinResult, accessibilitySettings.reducedMotion);
      } else {
        audio.playMinorWin();
        ui.celebrateMinorWin();
      }
    } else {
      audio.playLoss();
    }

    ui.setBusy(false);
    refreshView(spinResult.state, spinResult.advisory);

    if (spinResult.state.isPaused) {
      audio.playLimitReached();
    }
  }
});
