function createTone(audioContext, options) {
  const { frequency, duration, type = "sine", gain = 0.2, delay = 0 } = options;
  const oscillator = audioContext.createOscillator();
  const amp = audioContext.createGain();
  const startAt = audioContext.currentTime + delay;
  const endAt = startAt + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(amp);
  amp.connect(audioContext.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt);
}

function createManagedAudio(sources, loop = false) {
  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = loop;

  let sourceIndex = 0;

  function applySource(index) {
    if (index >= sources.length) {
      return;
    }
    sourceIndex = index;
    audio.src = sources[index];
    audio.load();
  }

  audio.addEventListener("error", () => {
    if (sourceIndex < sources.length - 1) {
      applySource(sourceIndex + 1);
    }
  });

  applySource(0);
  return audio;
}

function playMedia(audio, restart = true) {
  if (!audio) {
    return;
  }
  if (restart) {
    audio.currentTime = 0;
  }
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

export function createAudioController(initialSettings = {}) {
  let enabled = Boolean(initialSettings.soundEnabled ?? true);
  let volume = Number.isFinite(initialSettings.soundVolume) ? Number(initialSettings.soundVolume) : 0.45;
  volume = Math.min(1, Math.max(0, volume));

  /** @type {AudioContext | null} */
  let context = null;

  const bgm = createManagedAudio(["assets/audio/akatsuki-bgm.mp3", "assets/audio/akatsuki-song.mp3"], true);
  const spin = createManagedAudio(["assets/audio/akatsuki-spin.mp3"]);
  const welcome = createManagedAudio(["assets/audio/akatsuki-welcome.mp3"]);
  const win = createManagedAudio(["assets/audio/akatsuki-win.mp3"]);

  function syncMediaVolume() {
    bgm.volume = Math.min(1, volume * 0.45);
    spin.volume = Math.min(1, volume * 0.8);
    welcome.volume = Math.min(1, volume * 0.75);
    win.volume = Math.min(1, volume * 0.85);
  }

  syncMediaVolume();

  function getContext() {
    if (!enabled) {
      return null;
    }
    if (!context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        return null;
      }
      context = new AudioCtor();
    }
    if (context.state === "suspended") {
      context.resume();
    }
    return context;
  }

  function playToneGroup(toneList) {
    if (!enabled || volume <= 0) {
      return;
    }
    const audioContext = getContext();
    if (!audioContext) {
      return;
    }
    for (const tone of toneList) {
      createTone(audioContext, {
        ...tone,
        gain: tone.gain * volume
      });
    }
  }

  return {
    setEnabled(nextValue) {
      enabled = Boolean(nextValue);
      if (!enabled) {
        bgm.pause();
      }
    },
    setVolume(nextValue) {
      if (!Number.isFinite(nextValue)) {
        return;
      }
      volume = Math.min(1, Math.max(0, Number(nextValue)));
      syncMediaVolume();
    },
    startBgm() {
      if (!enabled || volume <= 0) {
        return;
      }
      playMedia(bgm, false);
    },
    playWelcome() {
      if (!enabled || volume <= 0) {
        return;
      }
      playMedia(welcome, true);
    },
    playSpinStart() {
      if (!enabled || volume <= 0) {
        return;
      }
      playMedia(spin, true);
    },
    playReelStop() {
      playToneGroup([{ frequency: 430, duration: 0.05, type: "triangle", gain: 0.1, delay: 0 }]);
    },
    playWin(isJackpot = false) {
      if (!enabled || volume <= 0) {
        return;
      }
      playMedia(win, true);
      if (isJackpot) {
        playToneGroup([
          { frequency: 540, duration: 0.11, type: "triangle", gain: 0.2, delay: 0.1 },
          { frequency: 760, duration: 0.2, type: "triangle", gain: 0.2, delay: 0.22 }
        ]);
      }
    },
    playLoss() {
      playToneGroup([{ frequency: 170, duration: 0.1, type: "sawtooth", gain: 0.1, delay: 0 }]);
    },
    playDailyReward() {
      playToneGroup([
        { frequency: 520, duration: 0.08, type: "triangle", gain: 0.2, delay: 0 },
        { frequency: 660, duration: 0.12, type: "triangle", gain: 0.2, delay: 0.08 }
      ]);
    }
  };
}
