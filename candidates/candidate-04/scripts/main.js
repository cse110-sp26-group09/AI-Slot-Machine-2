import { createGame } from "./game.js";
import { getRandomSymbol } from "./reels.js";
import { createUI } from "./ui.js";
import { AudioController } from "./audio.js";

const game = createGame();
const ui = createUI(document);
const audio = new AudioController();

function refreshFromState() {
  const state = game.getState();
  ui.renderState(state);
  ui.setSpinEnabled(!state.isSpinning && state.balance >= state.spinCost);
  return state;
}

/**
 * Maps internal errors to player-facing messaging.
 * @param {unknown} error
 * @returns {string}
 */
function toPlayerMessage(error) {
  if (!(error instanceof Error)) {
    return "Unexpected machine error. Try again.";
  }

  if (error.message === "Insufficient tokens.") {
    return "Insufficient tokens. Reset session to reload your budget.";
  }

  if (error.message === "Spin in progress.") {
    return "Reels are still spinning. Please wait.";
  }

  return "Unexpected machine error. Try again.";
}

async function handleSpin() {
  ui.setSpinEnabled(false);
  ui.setStatus("Compiling lucky prompt...", "neutral");

  try {
    await audio.ensureReady();
    audio.playSpin();

    const result = game.spin();
    await ui.animateSpin(result.state.lastSymbols, getRandomSymbol);

    ui.renderState(result.state);
    ui.pulseResult(result.won);
    ui.setStatus(result.state.status, result.won ? "win" : "loss");

    if (result.won) {
      audio.playWin();
    } else {
      audio.playLose();
    }

    if (result.state.balance < result.state.spinCost) {
      ui.setStatus("You are out of tokens. Reset session to continue.", "loss");
    }
  } catch (error) {
    ui.setStatus(toPlayerMessage(error), "loss");
  } finally {
    refreshFromState();
  }
}

function handleReset() {
  const state = game.reset();
  ui.renderState(state);
  ui.setStatus(state.status, "neutral");
  ui.setSpinEnabled(state.balance >= state.spinCost);
}

async function handleToggleMute() {
  await audio.ensureReady();
  const isMuted = audio.toggleMute();
  ui.setMuteState(isMuted);
}

function handleVolumeChange(value) {
  const volume = Number(value) / 100;
  audio.setVolume(volume);
}

function bootstrap() {
  const state = refreshFromState();
  ui.setStatus(state.status, "neutral");
  ui.setMuteState(audio.muted);
  ui.refs.volumeRange.value = String(Math.round(audio.currentVolume * 100));

  ui.refs.spinButton.addEventListener("click", handleSpin);
  ui.refs.resetButton.addEventListener("click", handleReset);
  ui.refs.muteButton.addEventListener("click", handleToggleMute);
  ui.refs.volumeRange.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement) {
      handleVolumeChange(event.target.value);
    }
  });
}

bootstrap();
