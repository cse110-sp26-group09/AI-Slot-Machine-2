const AUDIO_PATHS = {
  bgm: "assets/audio/spongebob-bgm.mp3",
  welcome: "assets/audio/spongebob-welcome.mp3",
  spin: "assets/audio/spongebob-spin.mp3",
  bigWin: "assets/audio/spongebob-bigwin.mp3",
  win: "assets/audio/spongebob-win.mp3",
  loss: "assets/audio/spongebob-loss.mp3"
};

/**
 * HTMLAudio-based manager for themed background music and spin feedback.
 */
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.4;
    this.tracks = {
      bgm: new Audio(AUDIO_PATHS.bgm),
      welcome: new Audio(AUDIO_PATHS.welcome),
      spin: new Audio(AUDIO_PATHS.spin),
      bigWin: new Audio(AUDIO_PATHS.bigWin),
      win: new Audio(AUDIO_PATHS.win),
      loss: new Audio(AUDIO_PATHS.loss)
    };

    this.tracks.bgm.loop = true;
    this.tracks.bgm.preload = "auto";
    this.updateTrackVolumes();
  }

  updateTrackVolumes() {
    const bgmVolume = Math.max(0, Math.min(1, this.volume * 0.55));
    this.tracks.bgm.volume = bgmVolume;
    this.tracks.welcome.volume = this.volume;
    this.tracks.spin.volume = this.volume;
    this.tracks.bigWin.volume = this.volume;
    this.tracks.win.volume = this.volume;
    this.tracks.loss.volume = this.volume;
  }

  playSfx(name) {
    if (!this.enabled) {
      return;
    }
    const source = this.tracks[name];
    if (!source) {
      return;
    }

    const clip = source.cloneNode();
    clip.volume = source.volume;
    clip.play().catch(() => {
      /* Ignore transient playback errors. */
    });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.tracks.bgm.pause();
      return;
    }
    this.startBackgroundMusic();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.updateTrackVolumes();
  }

  startBackgroundMusic() {
    if (!this.enabled) {
      return;
    }
    this.tracks.bgm.play().catch(() => {
      /* Will succeed after a click/tap gesture. */
    });
  }

  playWelcome() {
    this.playSfx("welcome");
  }

  playSpinStart() {
    this.playSfx("spin");
  }

  /**
   * @param {number} _index
   */
  playReelStop(_index) {
    // Intentionally no-op to avoid over-layering repetitive sounds over themed spin audio.
  }

  /**
   * @param {{ winTier: "major" | "minor" | "none" }} outcome
   */
  playOutcome(outcome) {
    if (outcome.winTier === "major") {
      this.playSfx("bigWin");
      return;
    }
    if (outcome.winTier === "minor") {
      this.playSfx("win");
      return;
    }
    this.playSfx("loss");
  }

  playLimitReached() {
    this.playSfx("loss");
  }
}
