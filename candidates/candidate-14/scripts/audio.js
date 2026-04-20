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

export function createAudioController(initialSettings = {}) {
  let enabled = Boolean(initialSettings.soundEnabled ?? true);
  let volume = Number.isFinite(initialSettings.soundVolume) ? Number(initialSettings.soundVolume) : 0.45;
  volume = Math.min(1, Math.max(0, volume));

  /** @type {AudioContext | null} */
  let context = null;

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
    },
    setVolume(nextValue) {
      if (!Number.isFinite(nextValue)) {
        return;
      }
      volume = Math.min(1, Math.max(0, Number(nextValue)));
    },
    playSpinStart() {
      playToneGroup([
        { frequency: 240, duration: 0.1, type: "square", gain: 0.22, delay: 0 },
        { frequency: 320, duration: 0.11, type: "square", gain: 0.18, delay: 0.1 }
      ]);
    },
    playReelStop() {
      playToneGroup([{ frequency: 420, duration: 0.05, type: "triangle", gain: 0.17, delay: 0 }]);
    },
    playWin(isJackpot = false) {
      if (isJackpot) {
        playToneGroup([
          { frequency: 420, duration: 0.11, type: "triangle", gain: 0.26, delay: 0 },
          { frequency: 560, duration: 0.14, type: "triangle", gain: 0.24, delay: 0.1 },
          { frequency: 760, duration: 0.2, type: "triangle", gain: 0.22, delay: 0.24 }
        ]);
        return;
      }
      playToneGroup([
        { frequency: 380, duration: 0.07, type: "sine", gain: 0.2, delay: 0 },
        { frequency: 500, duration: 0.1, type: "sine", gain: 0.18, delay: 0.08 }
      ]);
    },
    playLoss() {
      playToneGroup([{ frequency: 180, duration: 0.1, type: "sawtooth", gain: 0.11, delay: 0 }]);
    },
    playDailyReward() {
      playToneGroup([
        { frequency: 520, duration: 0.08, type: "triangle", gain: 0.2, delay: 0 },
        { frequency: 660, duration: 0.12, type: "triangle", gain: 0.2, delay: 0.08 }
      ]);
    }
  };
}

