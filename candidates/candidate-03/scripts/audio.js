/**
 * Lightweight Web Audio controller for UI and spin feedback.
 */
export function createAudioController() {
  /** @type {AudioContext | null} */
  let audioContext = null;
  let enabled = true;
  let volume = 0.7;

  return {
    unlock,
    setEnabled,
    setVolume,
    playSpinStart,
    playReelStop,
    playWin,
    playLoss,
  };

  function unlock() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) {
        enabled = false;
        return;
      }
      audioContext = new Context();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        // Ignore recoverable browser blocking errors.
      });
    }
  }

  function setEnabled(nextValue) {
    enabled = Boolean(nextValue);
  }

  function setVolume(nextValue) {
    if (typeof nextValue !== "number" || !Number.isFinite(nextValue)) {
      return;
    }

    volume = Math.max(0, Math.min(1, nextValue));
  }

  function playSpinStart() {
    tone(220, 0.06, "sawtooth", 0.09);
  }

  function playReelStop(reelIndex) {
    const base = 340;
    tone(base + reelIndex * 80, 0.05, "triangle", 0.07);
  }

  function playWin(tier) {
    const sequence =
      tier === "jackpot"
        ? [392, 523, 659, 784]
        : tier === "big"
          ? [392, 494, 659]
          : [330, 440];

    sequence.forEach((freq, i) => {
      tone(freq, 0.11, "triangle", 0.1, i * 0.07);
    });
  }

  function playLoss() {
    tone(190, 0.1, "square", 0.08);
  }

  /**
   * @param {number} frequency
   * @param {number} duration
   * @param {OscillatorType} wave
   * @param {number} gainAmount
   * @param {number} delay
   */
  function tone(frequency, duration, wave, gainAmount, delay = 0) {
    if (!enabled) {
      return;
    }

    unlock();

    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);

    const scaledGain = gainAmount * volume;
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, scaledGain), now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }
}
