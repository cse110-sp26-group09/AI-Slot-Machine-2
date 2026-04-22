/**
 * Audio controller for themed media and fallback Web Audio cues.
 */
export function createAudioController(initialState = { enabled: true, volume: 0.6 }) {
  let enabled = Boolean(initialState.enabled);
  let volume = clampVolume(initialState.volume);
  let audioContext = null;
  let unlockedByGesture = false;

  const tracks = {
    bgm: createTrack("assets/audio/akatsuki-song.mp3", true, 0.36),
    welcome: createTrack("assets/audio/akatsuki-welcome.mp3", false, 0.8),
    spin: createTrack("assets/audio/akatsuki-spin.mp3", false, 0.7),
    win: createTrack("assets/audio/akatsuki-win.mp3", false, 0.9),
  };

  syncTrackVolumes();

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      stopTrack(tracks.bgm);
      stopTrack(tracks.spin);
      return;
    }

    if (unlockedByGesture) {
      startBgm();
    }
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    syncTrackVolumes();
  }

  function unlockByGesture() {
    unlockedByGesture = true;
    const context = getContext();
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }

    if (enabled) {
      startBgm();
    }
  }

  function startBgm() {
    playTrack(tracks.bgm, { restart: false });
  }

  function playWelcome() {
    playTrack(tracks.welcome, { restart: true });
  }

  function playSpinStart() {
    playTrack(tracks.spin, { restart: true });
  }

  function stopSpinLoop() {
    stopTrack(tracks.spin);
  }

  function playSpinTick() {
    beep({ frequency: 280, duration: 0.03, gain: 0.012, type: "square" });
  }

  function playReelStop(reelIndex) {
    beep({ frequency: 320 + reelIndex * 44, duration: 0.06, gain: 0.018, type: "triangle" });
  }

  function playWin(multiplier) {
    playTrack(tracks.win, { restart: true });

    if (multiplier >= 8) {
      beep({ frequency: 540, duration: 0.13, gain: 0.045, type: "triangle", delay: 0.0 });
      beep({ frequency: 680, duration: 0.16, gain: 0.05, type: "triangle", delay: 0.11 });
      beep({ frequency: 820, duration: 0.2, gain: 0.055, type: "triangle", delay: 0.24 });
      return;
    }

    beep({ frequency: 430, duration: 0.1, gain: 0.032, type: "triangle", delay: 0.0 });
    beep({ frequency: 560, duration: 0.12, gain: 0.035, type: "triangle", delay: 0.1 });
  }

  function playLoss() {
    beep({ frequency: 180, duration: 0.13, gain: 0.025, type: "sawtooth" });
  }

  function playLimit() {
    beep({ frequency: 230, duration: 0.1, gain: 0.03, type: "square", delay: 0.0 });
    beep({ frequency: 200, duration: 0.12, gain: 0.032, type: "square", delay: 0.12 });
  }

  function playReward() {
    beep({ frequency: 410, duration: 0.09, gain: 0.035, type: "triangle", delay: 0.0 });
    beep({ frequency: 540, duration: 0.11, gain: 0.036, type: "triangle", delay: 0.1 });
    beep({ frequency: 680, duration: 0.15, gain: 0.038, type: "triangle", delay: 0.22 });
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

    return audioContext;
  }

  /**
   * @param {HTMLAudioElement} track
   * @param {{restart: boolean}} options
   */
  function playTrack(track, options) {
    if (!enabled || !track) {
      return;
    }

    if (options.restart) {
      track.currentTime = 0;
    }

    track.play().catch(() => {});
  }

  /**
   * @param {HTMLAudioElement} track
   */
  function stopTrack(track) {
    if (!track) {
      return;
    }

    track.pause();
    track.currentTime = 0;
  }

  function syncTrackVolumes() {
    tracks.bgm.volume = volume * 0.36;
    tracks.welcome.volume = volume * 0.8;
    tracks.spin.volume = volume * 0.7;
    tracks.win.volume = volume * 0.9;
  }

  return {
    setEnabled,
    setVolume,
    unlockByGesture,
    startBgm,
    playWelcome,
    playSpinStart,
    stopSpinLoop,
    playSpinTick,
    playReelStop,
    playWin,
    playLoss,
    playLimit,
    playReward,
  };
}

/**
 * @param {string} source
 * @param {boolean} loop
 * @param {number} baseVolume
 * @returns {HTMLAudioElement}
 */
function createTrack(source, loop, baseVolume) {
  const audio = new Audio(source);
  audio.loop = loop;
  audio.preload = "auto";
  audio.volume = baseVolume;
  return audio;
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
