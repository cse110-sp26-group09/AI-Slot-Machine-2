/**
 * @fileoverview Client-side slot machine audio module.
 */

(function attachAudioModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const AudioContextRef = global.AudioContext || global.webkitAudioContext;

  let context = null;
  let enabled = true;
  let volume = 0.6;
  let bgmRequested = false;

  const tracks = {
    bgm: createTrack("assets/audio/akatsuki-song.mp3", true),
    welcome: createTrack("assets/audio/akatsuki-welcome.mp3"),
    spin: createTrack("assets/audio/akatsuki-spin.mp3"),
    win: createTrack("assets/audio/akatsuki-win.mp3")
  };

  function createTrack(src, loop) {
    const audio = new global.Audio(src);
    audio.preload = "auto";
    audio.loop = Boolean(loop);
    return audio;
  }

  function ensureContext() {
    if (!AudioContextRef || context) {
      return;
    }
    context = new AudioContextRef();
  }

  function resumeContext() {
    ensureContext();
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      tracks.bgm.pause();
      return;
    }

    if (bgmRequested) {
      startBackgroundMusic();
    }
  }

  function setVolume(nextVolume) {
    volume = clamp(nextVolume, 0, 1);
    tracks.bgm.volume = volume * 0.42;
  }

  function startBackgroundMusic() {
    bgmRequested = true;
    if (!enabled) {
      return;
    }

    tracks.bgm.volume = volume * 0.42;
    safePlay(tracks.bgm);
  }

  function playWelcome() {
    playClip(tracks.welcome, 0.9);
  }

  function playSpin() {
    playClip(tracks.spin, 0.7);
  }

  function playSpinTick() {
    playTone(250, 0.02, 0.025, "triangle");
  }

  function playReelStop(reelIndex) {
    const base = 320 - reelIndex * 24;
    playTone(base, 0.05, 0.045, "square");
  }

  function playAnticipation() {
    playTone(420, 0.14, 0.05, "sawtooth");
  }

  function playWin(outcome) {
    const winGain = outcome === "jackpot" ? 1 : outcome === "big-win" ? 0.92 : 0.82;
    playClip(tracks.win, winGain);

    if (outcome === "jackpot") {
      playTone(720, 0.14, 0.05, "sine");
      playTone(920, 0.2, 0.045, "triangle", 0.08);
      return;
    }

    if (outcome === "big-win") {
      playTone(610, 0.12, 0.04, "sine");
      playTone(760, 0.16, 0.04, "triangle", 0.06);
    }
  }

  function playLoss() {
    playTone(180, 0.07, 0.04, "triangle");
  }

  function playGuardrail() {
    playTone(220, 0.16, 0.04, "square");
  }

  function playClip(audio, gainMultiplier) {
    if (!enabled) {
      return;
    }

    resumeContext();
    audio.currentTime = 0;
    if (audio !== tracks.bgm) {
      audio.volume = clamp(volume * gainMultiplier, 0, 1);
    }
    safePlay(audio);
  }

  function safePlay(audio) {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function playTone(frequency, duration, gain, type, delaySeconds) {
    if (!enabled) {
      return;
    }

    resumeContext();
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
    startBackgroundMusic,
    playWelcome,
    playSpin,
    playSpinTick,
    playReelStop,
    playAnticipation,
    playWin,
    playLoss,
    playGuardrail
  };
})(window);
