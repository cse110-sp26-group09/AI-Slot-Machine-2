import { SlotGame } from "./game.js";
import { AudioManager } from "./audio.js";
import { createUiController } from "./ui.js";
import { initAccessibility } from "./accessibility.js";
import { PAYTABLE_ROWS, calculateTheoreticalRtp } from "./payouts.js";
import { REEL_STRIPS, getRngDescription, spinReels } from "./reels.js";

const game = new SlotGame({
  initialBalance: 300,
  initialBet: 5,
  minBet: 1,
  maxBet: 20,
  lossLimit: 100
});

const audio = new AudioManager();
const ui = createUiController();

let isSpinning = false;
let lastDelta = 0;
let accessibilitySettings = {
  highContrast: false,
  largePrint: false,
  reduceMotion: false
};

const initialSymbols = spinReels();

ui.renderPaytable(PAYTABLE_ROWS);
ui.renderFairness({
  rtp: calculateTheoreticalRtp(REEL_STRIPS),
  rngText: getRngDescription(),
  note: "RTP is calculated from this machine's published reel weights and paytable."
});
ui.renderReelsImmediately(initialSymbols);
ui.renderState(game.getState(), lastDelta);
ui.setLimitStatus("Set a loss limit before starting. Reaching it pauses spins.");
ui.renderOutcome({
  outcomeText: "Ready to spin. Each spin is independent and random.",
  outcomeClass: "neutral",
  responsiblePrompt: ""
});

ui.elements.lossLimitInput.value = String(game.getState().lossLimit);
audio.setEnabled(ui.elements.soundToggle.checked);
audio.setVolume(Number(ui.elements.volumeInput.value));

initAccessibility(
  {
    highContrastToggle: ui.elements.highContrastToggle,
    largeTextToggle: ui.elements.largeTextToggle,
    reduceMotionToggle: ui.elements.reduceMotionToggle
  },
  (settings) => {
    accessibilitySettings = settings;
  }
);

/**
 * Render the current game state and keep spin interactivity consistent.
 */
function refreshState() {
  const state = game.getState();
  ui.renderState(state, lastDelta);
  ui.elements.spinBtn.disabled = isSpinning || state.isPaused;
}

/**
 * @param {string} reason
 */
function showBlockedSpin(reason) {
  ui.renderOutcome({
    outcomeText: reason,
    outcomeClass: "loss",
    responsiblePrompt: ""
  });
}

async function handleSpin() {
  if (isSpinning) {
    return;
  }

  const outcome = game.spin(spinReels);
  if (!outcome.ok) {
    showBlockedSpin(outcome.reason || "Unable to spin.");
    ui.setLimitStatus(outcome.reason || "Unable to spin.");
    refreshState();
    return;
  }

  isSpinning = true;
  refreshState();

  audio.playSpinStart();

  await ui.animateSpin(spinReels, outcome.symbols || [], accessibilitySettings, (index) => {
    audio.playReelStop(index);
  });

  lastDelta = outcome.netChange || 0;

  ui.renderOutcome({
    outcomeText: outcome.outcomeText || "",
    outcomeClass: outcome.outcomeClass || "neutral",
    responsiblePrompt: outcome.responsiblePrompt || ""
  });

  audio.playOutcome(lastDelta);

  if (outcome.limitReached) {
    audio.playLimitReached();
  }

  const state = game.getState();
  if (state.isPaused) {
    ui.setLimitStatus(state.pauseReason);
  } else {
    ui.setLimitStatus(state.lossLimit > 0 ? `Loss limit active: ${state.lossLimit} credits.` : "Loss limit disabled.");
  }

  isSpinning = false;
  refreshState();
}

ui.bind({
  onBetDown: () => {
    game.adjustBet(-1);
    refreshState();
  },
  onBetUp: () => {
    game.adjustBet(1);
    refreshState();
  },
  onBetInput: (value) => {
    game.setBet(value);
    refreshState();
  },
  onSpin: handleSpin,
  onAddCredits: () => {
    game.addCredits(50);
    ui.setLimitStatus("Added 50 credits.");
    refreshState();
  },
  onApplyLimit: (value) => {
    const applied = game.setLossLimit(value);
    const state = game.getState();
    if (state.isPaused) {
      ui.setLimitStatus(state.pauseReason);
    } else {
      ui.setLimitStatus(applied > 0 ? `Loss limit set to ${applied} credits.` : "Loss limit disabled.");
    }
    refreshState();
  },
  onResetSession: () => {
    game.resetSessionSummary();
    lastDelta = 0;
    ui.renderOutcome({
      outcomeText: "Session summary reset. Balance is unchanged.",
      outcomeClass: "neutral",
      responsiblePrompt: ""
    });
    ui.setLimitStatus("Session summary restarted.");
    refreshState();
  },
  onSoundToggle: (enabled) => {
    audio.setEnabled(enabled);
  },
  onVolumeChange: (value) => {
    audio.setVolume(value);
  }
});

refreshState();
