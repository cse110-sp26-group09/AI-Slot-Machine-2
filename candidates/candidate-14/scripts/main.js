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
});

syncUi(game.getViewModel());

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
      if (outcome.isWin) {
        audio.playWin(outcome.isJackpot);
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

