export class AudioController {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this.audioContext = null;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  /**
   * @param {number} volume
   */
  setVolume(volume) {
    if (!Number.isFinite(volume)) {
      return;
    }

    this.volume = Math.max(0, Math.min(1, volume));
  }

  ensureContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  /**
   * @param {number} frequency
   * @param {number} startOffset
   * @param {number} duration
   * @param {'sine'|'square'|'triangle'|'sawtooth'} waveType
   * @param {number} volumeFactor
   */
  playTone(frequency, startOffset, duration, waveType = 'sine', volumeFactor = 1) {
    if (!this.enabled) {
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Ignore resume errors caused by browser autoplay policies.
      });
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);

    const startTime = ctx.currentTime + startOffset;
    const endTime = startTime + duration;
    const finalVolume = this.volume * volumeFactor;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(finalVolume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  }

  playSpin() {
    this.playTone(420, 0, 0.05, 'square', 0.6);
    this.playTone(500, 0.06, 0.05, 'square', 0.5);
    this.playTone(580, 0.12, 0.05, 'square', 0.45);
  }

  /**
   * @param {{result:'win'|'push'|'loss', isJackpot:boolean}} outcome
   */
  playOutcome(outcome) {
    if (!outcome) {
      return;
    }

    if (outcome.isJackpot) {
      this.playTone(523, 0, 0.16, 'triangle', 0.9);
      this.playTone(659, 0.18, 0.16, 'triangle', 0.9);
      this.playTone(784, 0.36, 0.24, 'triangle', 0.95);
      return;
    }

    if (outcome.result === 'win') {
      this.playTone(440, 0, 0.11, 'triangle', 0.7);
      this.playTone(554, 0.12, 0.11, 'triangle', 0.7);
      this.playTone(659, 0.24, 0.16, 'triangle', 0.75);
      return;
    }

    if (outcome.result === 'push') {
      this.playTone(430, 0, 0.12, 'sine', 0.45);
      this.playTone(470, 0.13, 0.12, 'sine', 0.45);
      return;
    }

    this.playTone(240, 0, 0.1, 'sawtooth', 0.4);
    this.playTone(190, 0.11, 0.12, 'sawtooth', 0.35);
  }
}
