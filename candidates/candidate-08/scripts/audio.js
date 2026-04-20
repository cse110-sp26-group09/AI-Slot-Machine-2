/**
 * Lightweight Web Audio helper for non-intrusive slot feedback.
 */
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.4;
    this.context = null;
  }

  ensureContext() {
    if (!this.context && typeof AudioContext !== "undefined") {
      this.context = new AudioContext();
    }
    if (this.context && this.context.state === "suspended") {
      this.context.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
  }

  /**
   * @param {number} frequency
   * @param {number} durationMs
   * @param {"sine" | "square" | "triangle" | "sawtooth"} type
   * @param {number} delayMs
   */
  playTone(frequency, durationMs, type = "sine", delayMs = 0) {
    if (!this.enabled) {
      return;
    }

    this.ensureContext();
    if (!this.context) {
      return;
    }

    const start = this.context.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(this.volume * 0.16, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.start(start);
    oscillator.stop(end);
  }

  playSpinStart() {
    this.playTone(250, 80, "triangle");
  }

  /**
   * @param {number} index
   */
  playReelStop(index) {
    this.playTone(320 + index * 80, 70, "sine");
  }

  /**
   * @param {number} netChange
   */
  playOutcome(netChange) {
    if (netChange > 0) {
      this.playTone(420, 100, "triangle", 0);
      this.playTone(560, 120, "triangle", 100);
      this.playTone(710, 160, "triangle", 220);
      return;
    }

    if (netChange === 0) {
      this.playTone(300, 120, "sine");
      return;
    }

    this.playTone(220, 100, "sawtooth");
  }

  playLimitReached() {
    this.playTone(190, 140, "square", 0);
    this.playTone(190, 140, "square", 180);
  }
}
