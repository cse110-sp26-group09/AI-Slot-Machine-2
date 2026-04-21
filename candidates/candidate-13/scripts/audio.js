/**
 * @fileoverview Audio engine for themed background and spin feedback.
 */

function createTrack(src, { loop = false, volume = 0.5 } = {}) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = loop;
  audio.volume = volume;
  return audio;
}

export function createAudioEngine({ enabledAtStart = true, volume = 0.55 } = {}) {
  let enabled = Boolean(enabledAtStart);
  let masterVolume = clampVolume(volume);
  let isPrimed = false;
  let context = null;

  const tracks = {
    bgm: createTrack("assets/audio/akatsuki-bgm.mp3", { loop: true, volume: masterVolume * 0.45 }),
    welcome: createTrack("assets/audio/akatsuki-welcome.mp3", { volume: masterVolume * 0.7 }),
    spin: createTrack("assets/audio/akatsuki-spin.mp3", { volume: masterVolume * 0.75 }),
    win: createTrack("assets/audio/akatsuki-win.mp3", { volume: masterVolume * 0.85 })
  };

  function clampVolume(next) {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) {
      return 0.55;
    }
    return Math.max(0, Math.min(1, parsed));
  }

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

  function playTone(frequency, durationMs, gain = 0.02, type = "sine") {
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
    gainNode.gain.setValueAtTime(gain * masterVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(end);
  }

  function setTrackVolumes() {
    tracks.bgm.volume = masterVolume * 0.45;
    tracks.welcome.volume = masterVolume * 0.7;
    tracks.spin.volume = masterVolume * 0.75;
    tracks.win.volume = masterVolume * 0.85;
  }

  function playTrack(track, { restart = true, preserveCurrentTime = false } = {}) {
    if (!enabled) {
      return;
    }

    if (restart && !preserveCurrentTime) {
      track.currentTime = 0;
    }

    const promise = track.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        // Ignore browser autoplay rejections until user interaction unlocks media.
      });
    }
  }

  function pauseTrack(track) {
    track.pause();
  }

  return {
    prime() {
      isPrimed = true;
      const ctx = getContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      if (enabled) {
        playTrack(tracks.bgm, { restart: false, preserveCurrentTime: true });
      }
    },

    setEnabled(next) {
      enabled = Boolean(next);
      if (!enabled) {
        pauseTrack(tracks.bgm);
        return;
      }
      if (isPrimed) {
        playTrack(tracks.bgm, { restart: false, preserveCurrentTime: true });
      }
    },

    setVolume(next) {
      masterVolume = clampVolume(next);
      setTrackVolumes();
    },

    playBgm() {
      if (!enabled || !isPrimed) {
        return;
      }
      playTrack(tracks.bgm, { restart: false, preserveCurrentTime: true });
    },

    playWelcome() {
      playTrack(tracks.welcome);
    },

    playSpin() {
      playTrack(tracks.spin);
    },

    playWin(isMajor = false) {
      playTrack(tracks.win);
      if (isMajor) {
        setTimeout(() => playTone(620, 260, 0.025, "triangle"), 300);
      }
    },

    playLoss() {
      playTone(140, 140, 0.018, "sawtooth");
    },

    playLimitWarning() {
      playTone(260, 140, 0.02, "square");
    }
  };
}
