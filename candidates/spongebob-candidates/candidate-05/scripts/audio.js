/**
 * Asset-backed audio controller for themed music and spin feedback.
 * @returns {{
 *   prime: () => void,
 *   startBackgroundMusic: () => void,
 *   playWelcome: () => void,
 *   playSpin: () => void,
 *   playMinorWin: () => void,
 *   playBigWin: () => void,
 *   playLoss: () => void,
 *   playLimitReached: () => void,
 *   setEnabled: (nextEnabled: boolean) => void,
 *   setVolume: (nextVolume: number) => void,
 *   getSettings: () => {enabled: boolean, volume: number}
 * }}
 */
export function createAudioController() {
  let enabled = true;
  let volume = 0.4;

  const tracks = {
    bgm: new Audio("assets/audio/spongebob-bgm.mp3"),
    welcome: new Audio("assets/audio/spongebob-welcome.mp3"),
    spin: new Audio("assets/audio/spongebob-spin.mp3"),
    bigWin: new Audio("assets/audio/spongebob-bigwin.mp3"),
    win: new Audio("assets/audio/spongebob-win.mp3"),
    loss: new Audio("assets/audio/spongebob-loss.mp3")
  };

  tracks.bgm.loop = true;

  function applyVolume() {
    const bgmLevel = Math.max(0, Math.min(1, volume));
    tracks.bgm.volume = bgmLevel * 0.65;
    tracks.welcome.volume = bgmLevel;
    tracks.spin.volume = bgmLevel;
    tracks.bigWin.volume = bgmLevel;
    tracks.win.volume = bgmLevel;
    tracks.loss.volume = bgmLevel;
  }

  function safePlay(track) {
    if (!enabled) {
      return;
    }

    const nextTrack = track;
    nextTrack.currentTime = 0;
    nextTrack.play().catch(() => {
      // Ignore autoplay and decode failures to keep gameplay responsive.
    });
  }

  function prime() {
    applyVolume();
  }

  function startBackgroundMusic() {
    applyVolume();
    if (!enabled) {
      return;
    }

    tracks.bgm.play().catch(() => {
      // First interaction may still be required by the browser.
    });
  }

  function playWelcome() {
    safePlay(tracks.welcome);
  }

  function playSpin() {
    safePlay(tracks.spin);
  }

  function playMinorWin() {
    safePlay(tracks.win);
  }

  function playBigWin() {
    safePlay(tracks.bigWin);
  }

  function playLoss() {
    safePlay(tracks.loss);
  }

  function playLimitReached() {
    safePlay(tracks.loss);
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);

    if (!enabled) {
      tracks.bgm.pause();
      return;
    }

    startBackgroundMusic();
  }

  function setVolume(nextVolume) {
    volume = Math.min(1, Math.max(0, Number(nextVolume)));
    applyVolume();
  }

  function getSettings() {
    return {
      enabled,
      volume
    };
  }

  applyVolume();

  return {
    prime,
    startBackgroundMusic,
    playWelcome,
    playSpin,
    playMinorWin,
    playBigWin,
    playLoss,
    playLimitReached,
    setEnabled,
    setVolume,
    getSettings
  };
}
