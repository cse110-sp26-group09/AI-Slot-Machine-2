/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

export const formatTokens = (value) => `${Number(value).toFixed(2)}`;

const ensureDialogOpen = (dialogElement) => {
  if (!dialogElement.open) {
    dialogElement.showModal();
  }
};

export const setupAgeGate = ({ modalElement, confirmButton }) =>
  new Promise((resolve) => {
    ensureDialogOpen(modalElement);
    const onConfirm = () => {
      modalElement.close();
      confirmButton.removeEventListener("click", onConfirm);
      resolve(true);
    };
    confirmButton.addEventListener("click", onConfirm);
  });

export const setupRealityCheck = ({
  modalElement,
  acknowledgeButton,
  minutes,
  onTrigger,
  onAcknowledge
}) => {
  const timeoutMs = minutes * 60 * 1000;
  const timerId = window.setTimeout(() => {
    ensureDialogOpen(modalElement);
    onTrigger();
  }, timeoutMs);

  const onClick = () => {
    modalElement.close();
    onAcknowledge();
  };

  acknowledgeButton.addEventListener("click", onClick);
  return () => window.clearTimeout(timerId);
};

export const updateProgressionUi = ({ state, tierBadgeElement, xpFillElement, xpTextElement }) => {
  tierBadgeElement.textContent = state.progression.badge;
  xpFillElement.style.width = `${state.progression.progressRatio * 100}%`;
  xpTextElement.textContent = `XP ${Math.floor(state.progression.xp)}`;
};

export const renderPaytable = ({ container, symbols }) => {
  container.innerHTML = "";
  for (const symbol of symbols) {
    const row = document.createElement("article");
    row.className = "paytable-row";

    const payoutText = Object.entries(symbol.payout)
      .map(([count, payout]) => `${count}x: ${payout}`)
      .join(" · ");

    row.innerHTML = [
      `<span>${symbol.emoji}</span>`,
      `<span>${symbol.label}</span>`,
      `<span>${payoutText}</span>`
    ].join("");

    container.append(row);
  }
};

export const setSpinDurationVariable = ({ turboEnabled, rootStyle, normalMs, turboMs }) => {
  const activeMs = turboEnabled ? turboMs : normalMs;
  rootStyle.setProperty("--timing-spin-active", `${activeMs}ms`);
  return activeMs;
};

export const createSoundEngine = ({
  winBaseFrequency,
  nearMissStartFrequency,
  nearMissEndFrequency,
  humFrequency,
  minimumBetForSound,
  winFrequencyScaleFactor,
  winDurationBaseSeconds,
  winDurationScaleSeconds,
  winGain,
  nearMissGain
}) => {
  let audioContext = null;
  let humOscillator = null;
  let humGain = null;

  const ensureContext = () => {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  };

  const playBeep = ({ frequency, durationSeconds, gainAmount }) => {
    ensureContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = frequency;
    gain.gain.value = gainAmount;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationSeconds);
  };

  const playWin = ({ totalWin, bet, maxWinScale }) => {
    if (totalWin <= 0) {
      return;
    }

    const safeBet = Math.max(bet, minimumBetForSound);
    const ratio = Math.min(totalWin / safeBet, maxWinScale);
    const frequency = winBaseFrequency + ratio * winFrequencyScaleFactor;
    const durationSeconds = winDurationBaseSeconds + ratio * winDurationScaleSeconds;
    playBeep({
      frequency,
      durationSeconds,
      gainAmount: winGain
    });
  };

  const playNearMiss = ({ stepCount, stepDurationSeconds }) => {
    ensureContext();
    const stepDelta = (nearMissEndFrequency - nearMissStartFrequency) / stepCount;
    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const frequency = nearMissStartFrequency + stepDelta * stepIndex;
      const startAt = audioContext.currentTime + stepDurationSeconds * stepIndex;

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = nearMissGain;
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + stepDurationSeconds);
    }
  };

  const setAmbientEnabled = (enabled) => {
    ensureContext();
    if (enabled) {
      if (!humOscillator) {
        humOscillator = audioContext.createOscillator();
        humGain = audioContext.createGain();
        humOscillator.frequency.value = humFrequency;
        humGain.gain.value = 0.01;
        humOscillator.connect(humGain).connect(audioContext.destination);
        humOscillator.start();
      }
      return;
    }

    if (humOscillator) {
      humOscillator.stop();
      humOscillator.disconnect();
      humGain.disconnect();
      humOscillator = null;
      humGain = null;
    }
  };

  return {
    playWin,
    playNearMiss,
    setAmbientEnabled
  };
};
