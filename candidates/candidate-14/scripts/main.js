/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { applyAccessibility } from "./accessibility.js";
import { createAudioController } from "./audio.js";
import { createGame } from "./game.js";
import { animateSpin } from "./reels.js";
import { loadSession, saveSession } from "./storage.js";
import { createUI } from "./ui.js";

const MAX_VALID_BIRTHDATE = new Date(2005, 3, 22, 23, 59, 59, 999);

const game = createGame(loadSession());
const audio = createAudioController(game.getViewModel().settings);

let spinLock = false;

const ui = createUI({
  onSpin: handleSpin,
  onBetShift: (direction) => game.shiftBet(direction),
  onBetSet: (value) => game.setBet(value),
  onLossLimitSet: (value) => game.setLossLimit(value),
  onDailyClaim: handleDailyClaim,
  onNewSession: () => game.resetSession(),
  onSettingChange: (name, value) => game.updateSetting(name, value)
});

const dom = {
  entryScreen: document.getElementById("entry-screen"),
  ageGateScreen: document.getElementById("age-gate-screen"),
  gameScreen: document.getElementById("game-screen"),
  playButton: document.getElementById("entry-play-button"),
  infoButton: document.getElementById("entry-info-button"),
  infoModal: document.getElementById("info-modal"),
  infoCloseButton: document.getElementById("info-close-button"),
  ageGateForm: document.getElementById("age-gate-form"),
  ageDobInput: document.getElementById("age-dob"),
  ageFeedback: document.getElementById("age-gate-feedback"),
  ageBackButton: document.getElementById("age-back-button")
};

function showScreen(screenName) {
  const showEntry = screenName === "entry";
  const showAge = screenName === "age";
  const showGame = screenName === "game";

  dom.entryScreen.hidden = !showEntry;
  dom.ageGateScreen.hidden = !showAge;
  dom.gameScreen.hidden = !showGame;

  dom.entryScreen.classList.toggle("active", showEntry);
  dom.ageGateScreen.classList.toggle("active", showAge);
  dom.gameScreen.classList.toggle("active", showGame);
}

function openInfoModal() {
  dom.infoModal.hidden = false;
}

function closeInfoModal() {
  dom.infoModal.hidden = true;
}

function parseUsDate(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function validateAgeGate() {
  const parsedDob = parseUsDate(dom.ageDobInput.value);
  if (!parsedDob) {
    return {
      ok: false,
      message: "Invalid format. Enter date of birth as MM/DD/YYYY."
    };
  }

  if (parsedDob > MAX_VALID_BIRTHDATE) {
    return {
      ok: false,
      message: "Entry denied: You must be 21 or older. Maximum valid birth date is 04/22/2005."
    };
  }

  return {
    ok: true,
    message: "Age verification complete. Entering gameplay."
  };
}

function syncUi(viewModel) {
  applyAccessibility(document.body, viewModel.settings);
  audio.setEnabled(viewModel.settings.soundEnabled);
  audio.setVolume(viewModel.settings.soundVolume);
  ui.render(viewModel);
}

game.subscribe((viewModel, event) => {
  saveSession(game.getPersistableState());
  syncUi(viewModel);

  if (event?.type === "daily-claimed") {
    audio.playDailyReward();
  }

  if (event?.type === "setting-updated" && event.name === "soundEnabled" && viewModel.settings.soundEnabled) {
    audio.startBgm();
  }
});

syncUi(game.getViewModel());
showScreen("entry");

document.addEventListener(
  "pointerdown",
  () => {
    audio.startBgm();
  },
  { once: true }
);

dom.playButton.addEventListener("click", () => {
  audio.startBgm();
  dom.ageFeedback.textContent = "Compliance check required before gameplay access.";
  dom.ageDobInput.value = "";
  showScreen("age");
  dom.ageDobInput.focus();
});

dom.infoButton.addEventListener("click", () => {
  audio.startBgm();
  openInfoModal();
});

dom.infoCloseButton.addEventListener("click", () => {
  closeInfoModal();
});

dom.infoModal.addEventListener("click", (event) => {
  if (event.target === dom.infoModal) {
    closeInfoModal();
  }
});

dom.ageBackButton.addEventListener("click", () => {
  showScreen("entry");
});

dom.ageGateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  audio.startBgm();

  const validation = validateAgeGate();
  dom.ageFeedback.textContent = validation.message;

  if (!validation.ok) {
    return;
  }

  showScreen("game");
  audio.playWelcome();
});

function handleDailyClaim() {
  const result = game.claimDailyReward();
  if (!result.claimed) {
    return;
  }
}

async function handleSpin() {
  if (spinLock) {
    return;
  }

  const start = game.beginSpin();
  if (!start.ok) {
    return;
  }

  spinLock = true;
  ui.hideMajorWinOverlay();
  ui.setSpinInProgress(true);
  syncUi(game.getViewModel());
  audio.playSpinStart();

  try {
    const finalReels = await animateSpin({
      onReelFrame: (reelIndex, symbolId) => {
        ui.updateReel(reelIndex, symbolId, true);
      },
      onReelStop: (reelIndex, symbolId) => {
        ui.updateReel(reelIndex, symbolId, false);
        ui.markReelStopped(reelIndex);
        audio.playReelStop();
      }
    });

    const settled = game.settleSpin(finalReels);
    if (settled.ok) {
      const { outcome } = settled;
      ui.playOutcomeEffects(outcome);
      if (outcome.isWin) {
        audio.playWin(outcome.isJackpot || outcome.multiplier >= 45);
      } else {
        audio.playLoss();
      }
    }
  } finally {
    spinLock = false;
    ui.setSpinInProgress(false);
    syncUi(game.getViewModel());
  }
}
