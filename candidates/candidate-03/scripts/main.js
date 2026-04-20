/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { createAudioController } from "./audio.js";
import { createGame } from "./game.js";
import { createUI } from "./ui.js";

const game = createGame({
  startingBalance: 200,
  spinCost: 10,
});

const ui = createUI({ spinCost: game.getState().spinCost });
const audio = createAudioController();

let isSpinning = false;

initialize();

function initialize() {
  ui.bindHandlers({
    onSpin: handleSpin,
    onSoundToggle: (enabled) => {
      audio.setEnabled(enabled);
      ui.setStatus(enabled ? "Sound enabled." : "Sound muted.", "neutral");
    },
    onVolumeChange: (volume) => {
      audio.setVolume(volume);
    },
  });

  audio.setEnabled(ui.getSoundEnabled());
  audio.setVolume(ui.getVolume());

  ui.renderInitial(game.getState());
  ui.setSpinEnabled(game.canSpin());
}

async function handleSpin() {
  if (isSpinning) {
    return;
  }

  if (!game.canSpin()) {
    ui.setStatus("Not enough tokens. Session complete.", "warn");
    ui.setSpinEnabled(false);
    return;
  }

  isSpinning = true;
  ui.setSpinEnabled(false);
  ui.setStatus("Models training... spinning reels.", "neutral");

  try {
    audio.unlock();
    audio.playSpinStart();

    const spinResult = game.spin();

    await ui.animateReels(spinResult.reels.ids, (reelIndex) => {
      audio.playReelStop(reelIndex);
    });

    ui.renderAfterSpin(spinResult);

    if (spinResult.payout.didWin) {
      audio.playWin(spinResult.payout.tier);
    } else {
      audio.playLoss();
    }

    if (!spinResult.canSpinNext) {
      ui.setStatus("Out of tokens. Cash out and iterate your prompt strategy.", "warn");
    }
  } catch (error) {
    console.error(error);
    ui.setStatus("Unexpected error during spin. Please refresh and retry.", "warn");
  } finally {
    isSpinning = false;
    ui.setSpinEnabled(game.canSpin());
  }
}
