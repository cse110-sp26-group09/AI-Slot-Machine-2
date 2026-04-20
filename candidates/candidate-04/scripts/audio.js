/**
 * Small Web Audio wrapper so UI can trigger feedback sounds without owning audio state.
 */
export class AudioController {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isMuted = false;
    this.volume = 0.7;
  }

  /** @returns {boolean} */
  get muted() {
    return this.isMuted;
  }

  /** @returns {number} */
  get currentVolume() {
    return this.volume;
  }

  async ensureReady() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }

    if (!this.audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * @param {number} value range 0..1
   */
  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  /**
   * @param {number} frequency
   * @param {number} durationMs
   * @param {OscillatorType} [type]
   */
  beep(frequency, durationMs, type = "sine") {
    if (!this.audioContext || !this.masterGain || this.isMuted) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000 + 0.02);
  }

  playSpin() {
    this.beep(320, 70, "square");
  }

  playWin() {
    this.beep(520, 80, "triangle");
    setTimeout(() => this.beep(660, 120, "triangle"), 75);
    setTimeout(() => this.beep(880, 180, "triangle"), 140);
  }

  playLose() {
    this.beep(240, 140, "sawtooth");
  }
}
