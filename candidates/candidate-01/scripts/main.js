import { AudioManager } from "./audio.js";
import { SlotGame } from "./game.js";
import { ReelAnimator } from "./reels.js";
import { SlotUI } from "./ui.js";

function requireElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function init() {
  const reelElements = [
    requireElement('[data-reel="0"]'),
    requireElement('[data-reel="1"]'),
    requireElement('[data-reel="2"]')
  ];

  const balanceEl = requireElement("#balance-value");
  const spinButton = requireElement("#spin-button");
  const wagerSelect = requireElement("#wager-select");
  const statusEl = requireElement("#status-text");
  const audioToggle = requireElement("#audio-toggle");
  const volumeRange = requireElement("#volume-range");

  const statsEls = {
    spins: requireElement("#stats-spins"),
    wins: requireElement("#stats-wins"),
    net: requireElement("#stats-net")
  };

  const audio = new AudioManager();
  audio.setVolume(Number(volumeRange.value) / 100);

  const reelAnimator = new ReelAnimator(reelElements);

  let ui;
  const game = new SlotGame({
    reelAnimator,
    onStateChange: (state) => {
      if (!ui) {
        return;
      }

      if (state.isSpinning && (!ui.lastState || !ui.lastState.isSpinning)) {
        ui.playSpinFeedback();
      }

      ui.renderState(state);
    },
    onSpinResult: ({ outcome }) => {
      if (ui) {
        ui.handleOutcome(outcome);
      }
    },
    onError: (error) => {
      console.error("Spin failed", error);
    }
  });

  ui = new SlotUI({
    game,
    audio,
    balanceEl,
    spinButton,
    wagerSelect,
    statusEl,
    audioToggle,
    volumeRange,
    statsEls
  });

  ui.renderState(game.getState());
}

window.addEventListener("DOMContentLoaded", init);
