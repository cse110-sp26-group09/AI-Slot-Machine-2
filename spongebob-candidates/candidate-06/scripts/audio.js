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

    function playOneShot(path, gainScale) {
      if (!enabled) {
        return;
      }

      try {
        const clip = new global.Audio(path);
        clip.volume = Math.max(0, Math.min(1, volume * gainScale));
        clip.play().catch(function () {
          // Playback can fail if browser interaction requirements are not yet met.
        });
      } catch (error) {
        // Continue without hard-failing if an audio file is not available.
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
      playOneShot(sources.spin, 0.72);
    }

    function playReelStop() {
      // Reel-stop clicks are intentionally omitted to keep the mix clean with themed spin SFX.
    }

    function playWin(kind) {
      if (kind === "triple") {
        playOneShot(sources.bigWin, 0.95);
        return;
      }

      playOneShot(sources.win, 0.85);
    }

    function playLoss() {
      playOneShot(sources.loss, 0.85);
    }

    applyVolume();

    return {
      setEnabled: setEnabled,
      setVolume: setVolume,
      startBackgroundMusic: startBackgroundMusic,
      playWelcome: playWelcome,
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
