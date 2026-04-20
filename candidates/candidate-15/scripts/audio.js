(function attachAudioModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const AudioContextRef = global.AudioContext || global.webkitAudioContext;

  let context = null;
  let enabled = true;
  let volume = 0.6;

  function ensureContext() {
    if (!AudioContextRef || context) {
      return;
    }
    context = new AudioContextRef();
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
  }

  function setVolume(nextVolume) {
    volume = clamp(nextVolume, 0, 1);
  }

  function playSpinTick() {
    playTone(220, 0.03, 0.03, "triangle");
  }

  function playReelStop(reelIndex) {
    const base = 320 - reelIndex * 30;
    playTone(base, 0.07, 0.07, "square");
  }

  function playAnticipation() {
    playTone(430, 0.18, 0.06, "sawtooth");
  }

  function playWin(outcome) {
    if (outcome === "jackpot") {
      playTone(620, 0.2, 0.08, "sine");
      playTone(880, 0.26, 0.08, "sine", 0.07);
      return;
    }

    if (outcome === "big-win") {
      playTone(520, 0.13, 0.08, "sine");
      playTone(690, 0.16, 0.07, "triangle", 0.06);
      return;
    }

    playTone(470, 0.1, 0.08, "sine");
  }

  function playLoss() {
    playTone(180, 0.06, 0.05, "triangle");
  }

  function playGuardrail() {
    playTone(240, 0.14, 0.05, "square");
  }

  function playTone(frequency, duration, gain, type, delaySeconds) {
    if (!enabled) {
      return;
    }

    ensureContext();
    if (!context) {
      return;
    }

    const now = context.currentTime + (delaySeconds || 0);
    const oscillator = context.createOscillator();
    const amp = context.createGain();

    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);

    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain * volume, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(amp);
    amp.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  root.Audio = {
    setEnabled,
    setVolume,
    playSpinTick,
    playReelStop,
    playAnticipation,
    playWin,
    playLoss,
    playGuardrail
  };
})(window);
