import { createGameEngine } from "./game.js";
import { getFairnessReport, getPaytableRows } from "./payouts.js";
import { createUI } from "./ui.js";
import { createAudioController } from "./audio.js";
import { createAccessibilityController } from "./accessibility.js";
import { getRandomSymbolId, getSymbolById } from "./reels.js";

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
    onVolumeChange: handleVolumeChange
  });

  const fairnessReport = getFairnessReport();
  ui.renderPaytable(getPaytableRows());
  ui.renderFairness(fairnessReport);
  ui.renderAccessibilitySettings(accessibility.getSettings());
  ui.renderSoundSettings(audio.getSettings());

  const fairnessNote = document.getElementById("fairness-note");
  fairnessNote.textContent = fairnessReport.note;

  refreshView(game.getState(), game.getResponsiblePrompt());

  function refreshView(state, advisoryText) {
    ui.renderState(state);
    ui.renderAdvisory(advisoryText || game.getResponsiblePrompt());
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

    if (spinResult.outcomeType === "win") {
      audio.playWin(spinResult.roundNet);
    } else if (spinResult.outcomeType === "break-even") {
      audio.playBreakEven();
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
