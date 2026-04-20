/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachAudioModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  function createAudioController() {
    let enabled = true;
    let volume = 0.45;
    let context = null;
    let masterGain = null;

    function ensureContext() {
      if (context) {
        return;
      }

      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) {
        enabled = false;
        return;
      }

      context = new AudioCtx();
      masterGain = context.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(context.destination);
    }

    function playTone(frequency, durationMs, gainValue, type, delaySec) {
      if (!enabled) {
        return;
      }

      ensureContext();
      if (!context || !masterGain) {
        return;
      }

      if (context.state === "suspended") {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startAt = context.currentTime + (delaySec || 0);
      const durationSec = durationMs / 1000;

      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.linearRampToValueAtTime(gainValue, startAt + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSec + 0.02);
    }

    function setEnabled(isEnabled) {
      enabled = Boolean(isEnabled);
    }

    function setVolume(rawVolume) {
      volume = Math.max(0, Math.min(1, rawVolume));
      if (masterGain) {
        masterGain.gain.value = volume;
      }
    }

    function playSpinStart() {
      playTone(210, 120, 0.13, "triangle", 0);
      playTone(260, 120, 0.1, "triangle", 0.07);
    }

    function playReelStop(reelIndex) {
      const base = 310 + reelIndex * 38;
      playTone(base, 70, 0.12, "square", 0);
    }

    function playWin(amount) {
      const boost = Math.min(180, amount * 3);
      playTone(420 + boost * 0.2, 130, 0.15, "triangle", 0);
      playTone(540 + boost * 0.25, 150, 0.13, "triangle", 0.08);
      playTone(680 + boost * 0.3, 200, 0.12, "triangle", 0.16);
    }

    function playLoss() {
      playTone(165, 160, 0.09, "sawtooth", 0);
    }

    return {
      setEnabled: setEnabled,
      setVolume: setVolume,
      playSpinStart: playSpinStart,
      playReelStop: playReelStop,
      playWin: playWin,
      playLoss: playLoss
    };
  }

  SlotApp.Audio = {
    createAudioController: createAudioController
  };
})(window);
