/**
 * Lightweight Web Audio manager for slot machine sound effects.
 */
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.5;
    this.audioContext = null;
    this.masterGain = null;
    this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Ensures AudioContext exists and is resumed.
   * @returns {Promise<boolean>}
   */
  async unlock() {
    if (!this.supported) {
      return false;
    }

    if (!this.audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextCtor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext.state === "running";
  }

  /**
   * @returns {boolean}
   */
  toggleEnabled() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * @param {number} nextVolume
   */
  setVolume(nextVolume) {
    const clampedVolume = Math.max(0, Math.min(1, nextVolume));
    this.volume = clampedVolume;

    if (this.masterGain) {
      this.masterGain.gain.value = clampedVolume;
    }
  }

  playSpin() {
    this.#playSequence([
      { frequency: 190, duration: 0.05, type: "triangle", gain: 0.11, offset: 0 },
      { frequency: 230, duration: 0.05, type: "triangle", gain: 0.11, offset: 0.09 },
      { frequency: 270, duration: 0.05, type: "triangle", gain: 0.11, offset: 0.18 }
    ]);
  }

  /**
   * @param {"small" | "big" | "jackpot"} tier
   */
  playWin(tier = "small") {
    const patterns = {
      small: [
        { frequency: 520, duration: 0.08, type: "sine", gain: 0.12, offset: 0 },
        { frequency: 660, duration: 0.1, type: "sine", gain: 0.12, offset: 0.09 }
      ],
      big: [
        { frequency: 480, duration: 0.08, type: "sine", gain: 0.14, offset: 0 },
        { frequency: 640, duration: 0.08, type: "sine", gain: 0.14, offset: 0.08 },
        { frequency: 820, duration: 0.16, type: "triangle", gain: 0.16, offset: 0.16 }
      ],
      jackpot: [
        { frequency: 520, duration: 0.09, type: "triangle", gain: 0.16, offset: 0 },
        { frequency: 690, duration: 0.09, type: "triangle", gain: 0.16, offset: 0.09 },
        { frequency: 880, duration: 0.1, type: "triangle", gain: 0.17, offset: 0.18 },
        { frequency: 1040, duration: 0.2, type: "sine", gain: 0.18, offset: 0.28 }
      ]
    };

    this.#playSequence(patterns[tier] || patterns.small);
  }

  playLoss() {
    this.#playSequence([
      { frequency: 260, duration: 0.08, type: "sawtooth", gain: 0.09, offset: 0 },
      { frequency: 180, duration: 0.12, type: "sawtooth", gain: 0.09, offset: 0.08 }
    ]);
  }

  /**
   * @param {Array<{frequency: number, duration: number, type: OscillatorType, gain: number, offset: number}>} notes
   */
  #playSequence(notes) {
    if (!this.enabled || !this.audioContext || !this.masterGain) {
      return;
    }

    const start = this.audioContext.currentTime;
    for (const note of notes) {
      this.#scheduleTone({
        frequency: note.frequency,
        duration: note.duration,
        type: note.type,
        gain: note.gain,
        startTime: start + note.offset
      });
    }
  }

  /**
   * @param {{frequency: number, duration: number, type: OscillatorType, gain: number, startTime: number}} tone
   */
  #scheduleTone({ frequency, duration, type, gain, startTime }) {
    if (!this.audioContext || !this.masterGain) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.01);
  }
}
