import { SlotGame } from "./game.js";
import { AudioManager } from "./audio.js";
import { createUiController } from "./ui.js";
import { initAccessibility } from "./accessibility.js";
import { PAYTABLE_ROWS, calculateTheoreticalRtp } from "./payouts.js";
import { REEL_STRIPS, getRngDescription, spinReels } from "./reels.js";

const LEGAL_BIRTHDATE_CUTOFF = new Date(2005, 3, 22, 23, 59, 59, 999);

const game = new SlotGame({
  initialBalance: 300,
  initialBet: 5,
  minBet: 1,
  maxBet: 100,
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
  outcomeText: "Press Play to enter Bikini Bottom Slots.",
  outcomeClass: "neutral",
  responsiblePrompt: ""
});

ui.elements.lossLimitInput.value = String(game.getState().lossLimit);
ui.setBetBounds(game.minBet, game.maxBet);

const initialSoundEnabled = ui.elements.soundToggle.checked;
const initialVolume = Number(ui.elements.volumeInput.value);
audio.setEnabled(initialSoundEnabled);
audio.setVolume(initialVolume);
ui.setSoundState(initialSoundEnabled, initialVolume);
audio.startBackgroundMusic();

ui.setScreen("entry");
ui.clearAgeFeedback();
ui.closeInfoModal();

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
  ui.elements.leverBtn.disabled = isSpinning || state.isPaused;
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

/**
 * @param {string} value
 * @returns {Date | null}
 */
function parseBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  const parsed = new Date(year, month - 1, day);
  const isCalendarValid =
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;

  if (!isCalendarValid) {
    return null;
  }

  return parsed;
}

/**
 * @param {string} birthDateInput
 * @returns {{ ok: boolean, message: string, tone: "error" | "success" | "neutral" }}
 */
function validateAgeGate(birthDateInput) {
  const parsed = parseBirthDate(birthDateInput);
  if (!parsed) {
    return {
      ok: false,
      tone: "error",
      message: "Enter your birth date in MM/DD/YYYY format."
    };
  }

  if (parsed > LEGAL_BIRTHDATE_CUTOFF) {
    return {
      ok: false,
      tone: "error",
      message:
        "Access denied. You must be 21 or older to play. Eligible birth dates are on or before 04/22/2005."
    };
  }

  return {
    ok: true,
    tone: "success",
    message: "Age verification complete. Welcome to Bikini Bottom Slots."
  };
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

  await Promise.all([
    ui.animateLever(accessibilitySettings),
    ui.animateSpin(spinReels, outcome.symbols || [], accessibilitySettings, (index) => {
      audio.playReelStop(index);
    })
  ]);

  lastDelta = outcome.netChange || 0;
  const isMajorWin = outcome.winTier === "major";

  ui.renderOutcome({
    outcomeText: outcome.outcomeText || "",
    outcomeClass: outcome.outcomeClass || "neutral",
    responsiblePrompt: outcome.responsiblePrompt || "",
    isMajorWin
  });

  audio.playOutcome({ winTier: outcome.winTier || "none" });

  if (isMajorWin) {
    await ui.showBigWinOverlay("Major Win! Triple symbol match!");
  }

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
    ui.setSoundState(enabled, Number(ui.elements.volumeInput.value));
  },
  onVolumeChange: (value) => {
    audio.setVolume(value);
    ui.setSoundState(ui.elements.soundToggle.checked, value);
  },
  onPlay: () => {
    audio.startBackgroundMusic();
    ui.setScreen("ageGate");
    ui.clearAgeFeedback();
    ui.elements.birthdateInput.focus();
  },
  onInfoOpen: () => {
    audio.startBackgroundMusic();
    ui.openInfoModal();
  },
  onInfoClose: () => {
    ui.closeInfoModal();
  },
  onAgeBack: () => {
    ui.setScreen("entry");
    ui.clearAgeFeedback();
  },
  onVerifyAge: (birthDate) => {
    const verification = validateAgeGate(birthDate);
    ui.setAgeFeedback(verification.message, verification.tone);
    if (!verification.ok) {
      return;
    }

    ui.setScreen("game");
    ui.closeInfoModal();
    audio.playWelcome();
    ui.renderOutcome({
      outcomeText: "Welcome aboard. Pull the lever or press Spin to start.",
      outcomeClass: "neutral",
      responsiblePrompt: ""
    });
  }
});

refreshState();
