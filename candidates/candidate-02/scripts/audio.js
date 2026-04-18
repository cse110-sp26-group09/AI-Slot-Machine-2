const AUDIO_PREF_KEY = "prompt-palace-muted-v1";

/**
 * @returns {{
 *  isMuted: () => boolean,
 *  toggleMute: () => boolean,
 *  playSpin: () => void,
 *  playWin: (tier: "none" | "small" | "big" | "jackpot") => void,
 *  playLoss: () => void,
 *  playError: () => void
 * }}
 */
export function createAudio() {
  let muted = readInitialMutePreference();
  /** @type {AudioContext | null} */
  let context = null;

  function ensureContext() {
    if (typeof window.AudioContext !== "function") {
      return null;
    }

    if (!context) {
      context = new window.AudioContext();
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {
        // No-op: browser can block autoplay or background tab audio.
      });
    }

    return context;
  }

  /**
   * @param {number} frequency
   * @param {number} startOffsetSec
   * @param {number} durationSec
   * @param {number} gainValue
   * @param {OscillatorType} [waveType]
   */
  function tone(frequency, startOffsetSec, durationSec, gainValue, waveType = "triangle") {
    if (muted) {
      return;
    }

    const ctx = ensureContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = waveType;
    oscillator.frequency.value = frequency;

    const now = ctx.currentTime + startOffsetSec;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.02);
  }

  return {
    isMuted() {
      return muted;
    },

    toggleMute() {
      muted = !muted;
      try {
        localStorage.setItem(AUDIO_PREF_KEY, String(muted));
      } catch (_err) {
        // No-op: storage can be blocked.
      }
      return muted;
    },

    playSpin() {
      tone(180, 0, 0.08, 0.028, "sawtooth");
      tone(230, 0.07, 0.08, 0.026, "sawtooth");
      tone(290, 0.14, 0.08, 0.024, "sawtooth");
    },

    playWin(tier) {
      if (tier === "jackpot") {
        tone(440, 0, 0.12, 0.05);
        tone(660, 0.12, 0.12, 0.052);
        tone(880, 0.24, 0.18, 0.055);
        tone(1100, 0.45, 0.26, 0.055);
        return;
      }

      if (tier === "big") {
        tone(330, 0, 0.11, 0.04);
        tone(500, 0.11, 0.12, 0.043);
        tone(660, 0.23, 0.14, 0.045);
        return;
      }

      tone(280, 0, 0.08, 0.03);
      tone(350, 0.09, 0.09, 0.03);
    },

    playLoss() {
      tone(260, 0, 0.08, 0.026, "square");
      tone(190, 0.08, 0.12, 0.024, "square");
    },

    playError() {
      tone(130, 0, 0.08, 0.03, "square");
      tone(120, 0.09, 0.08, 0.03, "square");
    }
  };
}

function readInitialMutePreference() {
  try {
    return localStorage.getItem(AUDIO_PREF_KEY) === "true";
  } catch (_err) {
    return false;
  }
}
