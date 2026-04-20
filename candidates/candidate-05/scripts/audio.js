/**
 * Lightweight Web Audio controller with gentle tones for spin outcomes.
 */
export function createAudioController() {
  let enabled = true;
  let volume = 0.4;
  let context;
  let masterGain;

  function ensureContext() {
    if (!context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return null;
      }

      context = new AudioContextCtor();
      masterGain = context.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(context.destination);
    }

    if (context.state === "suspended") {
      context.resume();
    }

    return context;
  }

  function playTone({ frequency, durationMs, type = "sine", offsetMs = 0, gain = 1 }) {
    if (!enabled) {
      return;
    }

    const audioContext = ensureContext();
    if (!audioContext || !masterGain) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const startTime = audioContext.currentTime + offsetMs / 1000;
    const stopTime = startTime + durationMs / 1000;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.14 * gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    oscillator.start(startTime);
    oscillator.stop(stopTime);
  }

  function playSpin() {
    playTone({ frequency: 220, durationMs: 120, type: "triangle" });
    playTone({ frequency: 260, durationMs: 120, type: "triangle", offsetMs: 90 });
    playTone({ frequency: 300, durationMs: 120, type: "triangle", offsetMs: 180 });
  }

  function playWin(roundNet) {
    const energy = Math.min(1.5, Math.max(1, roundNet / 20));

    playTone({ frequency: 480, durationMs: 110, type: "sine", gain: energy });
    playTone({ frequency: 620, durationMs: 140, type: "sine", offsetMs: 95, gain: energy });
    playTone({ frequency: 760, durationMs: 180, type: "sine", offsetMs: 190, gain: energy });
  }

  function playBreakEven() {
    playTone({ frequency: 420, durationMs: 100, type: "square", gain: 0.8 });
    playTone({ frequency: 420, durationMs: 100, type: "square", offsetMs: 120, gain: 0.8 });
  }

  function playLoss() {
    playTone({ frequency: 250, durationMs: 200, type: "sawtooth", gain: 0.8 });
  }

  function playLimitReached() {
    playTone({ frequency: 320, durationMs: 180, type: "square", gain: 0.9 });
    playTone({ frequency: 210, durationMs: 240, type: "square", offsetMs: 150, gain: 1 });
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
  }

  function setVolume(nextVolume) {
    volume = Math.min(1, Math.max(0, Number(nextVolume)));
    if (masterGain) {
      masterGain.gain.value = volume;
    }
  }

  function getSettings() {
    return {
      enabled,
      volume
    };
  }

  function prime() {
    ensureContext();
  }

  return {
    prime,
    playSpin,
    playWin,
    playBreakEven,
    playLoss,
    playLimitReached,
    setEnabled,
    setVolume,
    getSettings
  };
}
