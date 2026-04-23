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

    const bgm = new global.Audio("assets/audio/spongebob-bgm.mp3");
    bgm.loop = true;
    bgm.preload = "auto";

    const sources = {
      welcome: "assets/audio/spongebob-welcome.mp3",
      spin: "assets/audio/spongebob-spin.mp3",
      bigWin: "assets/audio/spongebob-bigwin.mp3",
      win: "assets/audio/spongebob-win.mp3",
      loss: "assets/audio/spongebob-loss.mp3"
    };

    function applyVolume() {
      bgm.volume = Math.max(0, Math.min(1, volume * 0.45));
    }

    function ensureContext() {
      if (!enabled) {
        return null;
      }

      if (!context) {
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) {
          return null;
        }
        context = new AudioContextClass();
      }

      if (context.state === "suspended") {
        context.resume().catch(function () {
          // Browsers may reject resume before trusted interaction.
        });
      }

      return context;
    }

    function playToneSweep(options) {
      const audioContext = ensureContext();
      if (!audioContext) {
        return;
      }

      const startTime = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = options.type || "sine";
      oscillator.frequency.setValueAtTime(options.fromHz, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.toHz || options.fromHz),
        startTime + options.durationSec
      );

      const targetGain = Math.max(0, Math.min(1, volume * (options.gain || 0.2)));
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(targetGain, startTime + Math.min(0.03, options.durationSec * 0.5));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.durationSec);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + options.durationSec + 0.01);
    }

    function playOneShot(path, gainScale) {
      if (!enabled) {
        return;
      }

      try {
        const clip = new global.Audio(path);
        clip.volume = Math.max(0, Math.min(1, volume * gainScale));
        clip.play().catch(function () {
          // Playback can fail before trusted interaction.
        });
      } catch (error) {
        // Continue even if clip file is unavailable.
      }
    }

    function startBackgroundMusic() {
      if (!enabled) {
        return;
      }

      applyVolume();
      bgm.play().catch(function () {
        // Browser may block autoplay until a user gesture.
      });
    }

    function stopBackgroundMusic() {
      bgm.pause();
    }

    function setEnabled(isEnabled) {
      enabled = Boolean(isEnabled);
      if (enabled) {
        startBackgroundMusic();
      } else {
        stopBackgroundMusic();
      }
    }

    function setVolume(rawVolume) {
      volume = Math.max(0, Math.min(1, rawVolume));
      applyVolume();
    }

    function playWelcome() {
      playOneShot(sources.welcome, 0.9);
    }

    function playSpinStart() {
      ensureContext();
      playOneShot(sources.spin, 0.72);
    }

    function playReelStop(reelIndex, meta) {
      const mode = meta && meta.mode ? meta.mode : "normal";
      const base = 170 + reelIndex * 36;
      const to = mode === "slam" ? 85 : 64;
      playToneSweep({
        type: "triangle",
        fromHz: base,
        toHz: to,
        durationSec: mode === "slam" ? 0.08 : 0.12,
        gain: mode === "slam" ? 0.15 : 0.12
      });
    }

    function playAnticipation() {
      playToneSweep({
        type: "sine",
        fromHz: 520,
        toHz: 720,
        durationSec: 0.18,
        gain: 0.15
      });
      global.setTimeout(function () {
        playToneSweep({
          type: "sine",
          fromHz: 660,
          toHz: 980,
          durationSec: 0.22,
          gain: 0.18
        });
      }, 150);
    }

    function playSmallWinChime() {
      playOneShot(sources.win, 0.68);
      playToneSweep({
        type: "triangle",
        fromHz: 740,
        toHz: 1080,
        durationSec: 0.16,
        gain: 0.16
      });
    }

    function playCoinBurst() {
      const tones = [
        { from: 920, to: 1100, at: 0 },
        { from: 1040, to: 1240, at: 90 },
        { from: 1180, to: 1380, at: 170 }
      ];
      tones.forEach(function (tone) {
        global.setTimeout(function () {
          playToneSweep({
            type: "square",
            fromHz: tone.from,
            toHz: tone.to,
            durationSec: 0.09,
            gain: 0.1
          });
        }, tone.at);
      });
    }

    function playOutcome(level) {
      if (level === "small") {
        playSmallWinChime();
        return;
      }

      if (level === "big") {
        playOneShot(sources.bigWin, 0.85);
        playCoinBurst();
        return;
      }

      if (level === "mega") {
        playOneShot(sources.bigWin, 1);
        playCoinBurst();
        global.setTimeout(playCoinBurst, 210);
        return;
      }

      playOneShot(sources.loss, 0.85);
    }

    function playWin(kind) {
      if (kind === "triple") {
        playOutcome("big");
        return;
      }
      playOutcome("small");
    }

    function playLoss() {
      playOutcome("loss");
    }

    applyVolume();

    return {
      setEnabled: setEnabled,
      setVolume: setVolume,
      startBackgroundMusic: startBackgroundMusic,
      playWelcome: playWelcome,
      playSpinStart: playSpinStart,
      playReelStop: playReelStop,
      playAnticipation: playAnticipation,
      playOutcome: playOutcome,
      playWin: playWin,
      playLoss: playLoss
    };
  }

  SlotApp.Audio = {
    createAudioController: createAudioController
  };
})(window);
