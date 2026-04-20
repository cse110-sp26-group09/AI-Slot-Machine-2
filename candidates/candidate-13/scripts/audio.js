/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

export function createAudioEngine(enabledAtStart = true) {
  let enabled = Boolean(enabledAtStart);
  let context = null;

  function getContext() {
    if (!enabled) {
      return null;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }

    if (!context) {
      context = new AudioCtx();
    }

    if (context.state === "suspended") {
      context.resume();
    }

    return context;
  }

  function playTone(frequency, durationMs, gain = 0.02, type = "square") {
    const ctx = getContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;
    const end = now + durationMs / 1000;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(end);
  }

  return {
    setEnabled(next) {
      enabled = Boolean(next);
    },

    playReelTick() {
      playTone(420, 45, 0.012, "square");
    },

    playWin(multiplier) {
      const sequence = multiplier >= 10 ? [523, 659, 784] : [440, 554];
      sequence.forEach((frequency, index) => {
        setTimeout(() => {
          playTone(frequency, 120, 0.022, "triangle");
        }, index * 100);
      });
    },

    playLoss() {
      playTone(185, 160, 0.018, "sawtooth");
    },

    playLimitWarning() {
      playTone(265, 130, 0.016, "sine");
    }
  };
}
