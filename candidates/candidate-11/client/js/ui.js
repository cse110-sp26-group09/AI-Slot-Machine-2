const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTokens = (value) => Number(value).toFixed(2);

const parseDurationMs = (rawValue) => {
  const normalized = rawValue.trim();
  if (normalized.endsWith("ms")) {
    return Number.parseFloat(normalized.replace("ms", ""));
  }
  if (normalized.endsWith("s")) {
    return Number.parseFloat(normalized.replace("s", "")) * 1000;
  }
  return Number.parseFloat(normalized) || 0;
};

const toTierProgress = ({ xpValue, thresholds, sequence }) => {
  const tierIndex = sequence.findLastIndex((tier) => xpValue >= thresholds[tier]);
  const safeIndex = tierIndex < 0 ? 0 : tierIndex;
  const currentTier = sequence[safeIndex];
  const nextTier = sequence[safeIndex + 1] ?? currentTier;

  if (currentTier === nextTier) {
    return {
      tier: currentTier,
      percent: 100
    };
  }

  const currentFloor = thresholds[currentTier];
  const nextFloor = thresholds[nextTier];
  const span = nextFloor - currentFloor;
  const progress = span > 0 ? ((xpValue - currentFloor) / span) * 100 : 100;

  return {
    tier: currentTier,
    percent: clamp(progress, 0, 100)
  };
};

const createAudioController = () => {
  let audioContext = null;
  let ambientNode = null;

  const ensureContext = () => {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  };

  const playTone = ({ frequency, duration, gain, type, rampTo }) => {
    const context = ensureContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startAt = context.currentTime;
    const endAt = startAt + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (rampTo) {
      oscillator.frequency.linearRampToValueAtTime(rampTo, endAt);
    }

    gainNode.gain.setValueAtTime(gain, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(endAt);
  };

  const playWinFanfare = ({ winAmount, betAmount }) => {
    const scaledGain = clamp((winAmount / Math.max(betAmount, 0.1)) * 0.02, 0.02, 0.12);
    playTone({ frequency: 392, duration: 0.22, gain: scaledGain, type: "triangle", rampTo: 523.25 });
    window.setTimeout(() => {
      playTone({ frequency: 523.25, duration: 0.25, gain: scaledGain * 0.9, type: "triangle", rampTo: 659.25 });
    }, 70);
  };

  const playNearMissTone = () => {
    playTone({ frequency: 280, duration: 0.16, gain: 0.04, type: "sawtooth", rampTo: 420 });
    window.setTimeout(() => {
      playTone({ frequency: 420, duration: 0.2, gain: 0.05, type: "sawtooth", rampTo: 620 });
    }, 85);
  };

  const setAmbientEnabled = (enabled) => {
    const context = ensureContext();

    if (!enabled) {
      if (ambientNode) {
        ambientNode.disconnect();
        ambientNode.stop();
        ambientNode = null;
      }
      return;
    }

    if (ambientNode) {
      return;
    }

    const gainNode = context.createGain();
    gainNode.gain.value = 0.012;

    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 72;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();

    ambientNode = oscillator;
  };

  return {
    playWinFanfare,
    playNearMissTone,
    setAmbientEnabled
  };
};

export const createUiController = ({ config }) => {
  const elements = {
    app: document.querySelector("#app"),
    reelGrid: document.querySelector("#reelGrid"),
    winMessage: document.querySelector("#winMessage"),
    balanceValue: document.querySelector("#balanceValue"),
    jackpotValue: document.querySelector("#jackpotValue"),
    sessionSpendValue: document.querySelector("#sessionSpendValue"),
    tierBadge: document.querySelector("#tierBadge"),
    xpFill: document.querySelector("#xpFill"),
    betSlider: document.querySelector("#betSlider"),
    betValue: document.querySelector("#betValue"),
    spinButton: document.querySelector("#spinButton"),
    infoButton: document.querySelector("#infoButton"),
    paytableModal: document.querySelector("#paytableModal"),
    closePaytableButton: document.querySelector("#closePaytableButton"),
    paytableContent: document.querySelector("#paytableContent"),
    ageGateModal: document.querySelector("#ageGateModal"),
    ageConfirmButton: document.querySelector("#ageConfirmButton"),
    depositLimitInput: document.querySelector("#depositLimitInput"),
    realityModal: document.querySelector("#realityModal"),
    realityAcknowledgeButton: document.querySelector("#realityAcknowledgeButton"),
    autoplayLimitInput: document.querySelector("#autoplayLimitInput"),
    autoplayButton: document.querySelector("#autoplayButton"),
    turboToggle: document.querySelector("#turboToggle"),
    ambientToggle: document.querySelector("#ambientToggle"),
    selfExcludeButton: document.querySelector("#selfExcludeButton")
  };

  const audio = createAudioController();

  const toggleModal = (modalElement, open) => {
    modalElement.classList.toggle("is-open", open);
    modalElement.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const openPaytable = () => toggleModal(elements.paytableModal, true);
  const closePaytable = () => toggleModal(elements.paytableModal, false);
  const openRealityCheck = () => toggleModal(elements.realityModal, true);
  const closeRealityCheck = () => toggleModal(elements.realityModal, false);
  const hideAgeGate = () => toggleModal(elements.ageGateModal, false);

  const showApp = () => {
    elements.app.classList.remove("is-hidden");
  };

  const setSpinEnabled = (enabled) => {
    elements.spinButton.disabled = !enabled;
  };

  const setAutoplayEnabled = (enabled) => {
    elements.autoplayButton.disabled = !enabled;
  };

  const configureBet = () => {
    elements.betSlider.min = String(config.limits.BET_MIN);
    elements.betSlider.max = String(config.limits.BET_MAX);
    elements.betSlider.step = String(config.limits.BET_STEP);

    const initialBet = Number(elements.betSlider.min);
    elements.betSlider.value = String(initialBet);
    elements.betValue.value = formatTokens(initialBet);
  };

  const syncBetDisplay = () => {
    elements.betValue.value = formatTokens(Number(elements.betSlider.value));
  };

  const setWinMessage = (message, highlight) => {
    elements.winMessage.textContent = message;
    elements.winMessage.classList.toggle("is-highlight", highlight);
    if (highlight) {
      const messageDuration = parseDurationMs(getComputedStyle(document.documentElement).getPropertyValue("--message-duration"));
      window.setTimeout(() => elements.winMessage.classList.remove("is-highlight"), messageDuration);
    }
  };

  const updateStatus = ({ balance, jackpotPool, sessionSpend }) => {
    elements.balanceValue.textContent = formatTokens(balance);
    elements.jackpotValue.textContent = formatTokens(jackpotPool);
    elements.sessionSpendValue.textContent = formatTokens(sessionSpend);
  };

  const updateXp = ({ xpValue }) => {
    const progress = toTierProgress({
      xpValue,
      thresholds: config.xp.TIER_THRESHOLDS,
      sequence: config.xp.TIER_SEQUENCE
    });

    elements.tierBadge.textContent = progress.tier;
    elements.xpFill.style.width = `${progress.percent}%`;
  };

  const renderPaytable = () => {
    elements.paytableContent.replaceChildren();

    for (const symbol of config.symbols) {
      const row = document.createElement("section");
      row.className = "paytable-row";
      row.textContent = `${symbol.emoji} ${symbol.label} | 3x: ${symbol.payout[3] ?? 0} | 4x: ${symbol.payout[4] ?? 0} | 5x: ${symbol.payout[5] ?? 0}`;
      elements.paytableContent.append(row);
    }
  };

  return {
    elements,
    audio,
    configureBet,
    syncBetDisplay,
    openPaytable,
    closePaytable,
    openRealityCheck,
    closeRealityCheck,
    hideAgeGate,
    showApp,
    setSpinEnabled,
    setAutoplayEnabled,
    setWinMessage,
    updateStatus,
    updateXp,
    renderPaytable
  };
};
