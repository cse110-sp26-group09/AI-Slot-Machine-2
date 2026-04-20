/**
 * Lightweight Web Audio controller for slot feedback sounds.
 */
export function createAudioController(initialState = { enabled: true, volume: 0.6 }) {
  let enabled = Boolean(initialState.enabled);
  let volume = clampVolume(initialState.volume);
  let audioContext = null;

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
  }

  function playSpinTick() {
    beep({ frequency: 330, duration: 0.05, gain: 0.02, type: "square" });
  }

  function playReelStop(reelIndex) {
    beep({ frequency: 440 + reelIndex * 55, duration: 0.08, gain: 0.026, type: "triangle" });
  }

  function playWin(multiplier) {
    const base = multiplier >= 8 ? 520 : 430;
    beep({ frequency: base, duration: 0.12, gain: 0.05, type: "triangle", delay: 0.0 });
    beep({ frequency: base + 130, duration: 0.14, gain: 0.05, type: "triangle", delay: 0.12 });
    beep({ frequency: base + 250, duration: 0.18, gain: 0.055, type: "triangle", delay: 0.26 });
  }

  function playLoss() {
    beep({ frequency: 180, duration: 0.14, gain: 0.03, type: "sawtooth" });
  }

  function playLimit() {
    beep({ frequency: 240, duration: 0.1, gain: 0.032, type: "square", delay: 0.0 });
    beep({ frequency: 200, duration: 0.14, gain: 0.035, type: "square", delay: 0.12 });
  }

  function playReward() {
    beep({ frequency: 420, duration: 0.1, gain: 0.045, type: "triangle", delay: 0.0 });
    beep({ frequency: 560, duration: 0.12, gain: 0.045, type: "triangle", delay: 0.11 });
    beep({ frequency: 700, duration: 0.16, gain: 0.045, type: "triangle", delay: 0.24 });
  }

  /**
   * @param {{frequency: number, duration: number, gain: number, type: OscillatorType, delay?: number}} config
   */
  function beep(config) {
    if (!enabled) {
      return;
    }

    const context = getContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const start = now + (config.delay ?? 0);
    const end = start + config.duration;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, start);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, config.gain * volume), start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }

  /**
   * @returns {AudioContext | null}
   */
  function getContext() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  return {
    setEnabled,
    setVolume,
    playSpinTick,
    playReelStop,
    playWin,
    playLoss,
    playLimit,
    playReward,
  };
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 0.6;
  }
  return Math.min(1, Math.max(0, value));
}
