const AUDIO_FILES = Object.freeze({
  bgm: 'assets/audio/spongebob-bgm.mp3',
  welcome: 'assets/audio/spongebob-welcome.mp3',
  spin: 'assets/audio/spongebob-spin.mp3',
  bigwin: 'assets/audio/spongebob-bigwin.mp3',
  win: 'assets/audio/spongebob-win.mp3',
  loss: 'assets/audio/spongebob-loss.mp3'
});

export class AudioController {
  constructor() {
    this.enabled = true;
    this.volume = 0.4;
    this.musicStarted = false;

    this.tracks = {
      bgm: this.createAudio(AUDIO_FILES.bgm, { loop: true }),
      welcome: this.createAudio(AUDIO_FILES.welcome),
      spin: this.createAudio(AUDIO_FILES.spin),
      bigwin: this.createAudio(AUDIO_FILES.bigwin),
      win: this.createAudio(AUDIO_FILES.win),
      loss: this.createAudio(AUDIO_FILES.loss)
    };

    this.applyVolume();
  }

  /**
   * @param {string} src
   * @param {{loop?:boolean}} options
   * @returns {HTMLAudioElement}
   */
  createAudio(src, options = {}) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.loop = Boolean(options.loop);
    return audio;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.tracks.bgm.pause();
      return;
    }

    this.startBackgroundMusic();
  }

  /**
   * @param {number} volume
   */
  setVolume(volume) {
    if (!Number.isFinite(volume)) {
      return;
    }

    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  applyVolume() {
    this.tracks.bgm.volume = this.volume * 0.55;
    this.tracks.welcome.volume = this.volume;
    this.tracks.spin.volume = this.volume * 0.85;
    this.tracks.bigwin.volume = this.volume;
    this.tracks.win.volume = this.volume * 0.95;
    this.tracks.loss.volume = this.volume * 0.88;
  }

  async startBackgroundMusic() {
    if (!this.enabled) {
      return;
    }

    this.musicStarted = true;
    try {
      await this.tracks.bgm.play();
    } catch {
      // Browsers may block autoplay before user interaction.
    }
  }

  /**
   * Unlocks browser audio policies after a user gesture and starts BGM.
   */
  activateFromGesture() {
    if (!this.musicStarted) {
      this.startBackgroundMusic();
      return;
    }

    if (this.enabled && this.tracks.bgm.paused) {
      this.startBackgroundMusic();
    }
  }

  /**
   * @param {HTMLAudioElement} track
   */
  playTrack(track) {
    if (!this.enabled || !track) {
      return;
    }

    try {
      track.currentTime = 0;
      const playPromise = track.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Ignore blocked play calls.
        });
      }
    } catch {
      // Ignore playback exceptions.
    }
  }

  playWelcome() {
    this.playTrack(this.tracks.welcome);
  }

  playSpin() {
    this.playTrack(this.tracks.spin);
  }

  /**
   * @param {{result:'win'|'push'|'loss', isJackpot:boolean}} outcome
   */
  playOutcome(outcome) {
    if (!outcome) {
      return;
    }

    if (outcome.isJackpot) {
      this.playTrack(this.tracks.bigwin);
      return;
    }

    if (outcome.result === 'loss') {
      this.playTrack(this.tracks.loss);
      return;
    }

    this.playTrack(this.tracks.win);
  }
}
