/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function delay(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function formatTokens(value) {
  return Number(value || 0).toFixed(2);
}

function setModalVisible(modalElement, visible) {
  modalElement.classList.toggle('modal-overlay--visible', visible);
}

function getTierBounds(tierThresholds, tierName) {
  const ordered = [
    ['Bronze', tierThresholds.BRONZE],
    ['Silver', tierThresholds.SILVER],
    ['Gold', tierThresholds.GOLD],
    ['Platinum', tierThresholds.PLATINUM],
    ['VIP', tierThresholds.VIP]
  ];

  const index = ordered.findIndex(([name]) => name === tierName);
  const safeIndex = index >= 0 ? index : 0;
  const lower = ordered[safeIndex][1];
  const upper = ordered[Math.min(safeIndex + 1, ordered.length - 1)][1];

  return { lower, upper: upper === lower ? lower + 1 : upper };
}

function createAudioEngine(audioConfig) {
  let audioContext = null;
  let ambientOscillator = null;
  let ambientGainNode = null;

  function ensureContext() {
    if (!audioContext) {
      audioContext = new window.AudioContext();
    }
    return audioContext;
  }

  async function resumeContext() {
    const context = ensureContext();
    if (context.state !== 'running') {
      await context.resume();
    }
    return context;
  }

  async function startAmbientHum() {
    const context = await resumeContext();
    if (ambientOscillator) {
      return;
    }

    ambientGainNode = context.createGain();
    ambientGainNode.gain.value = 0;
    ambientGainNode.connect(context.destination);

    ambientOscillator = context.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.value = audioConfig.ambientFrequencyHz;
    ambientOscillator.connect(ambientGainNode);
    ambientOscillator.start();

    const now = context.currentTime;
    ambientGainNode.gain.linearRampToValueAtTime(0.028, now + audioConfig.toneDurationMs / 1000);
  }

  async function stopAmbientHum() {
    if (!audioContext || !ambientOscillator || !ambientGainNode) {
      return;
    }

    const context = audioContext;
    const now = context.currentTime;
    ambientGainNode.gain.linearRampToValueAtTime(0.0001, now + audioConfig.toneDurationMs / 1000);
    await delay(audioConfig.toneDurationMs);

    ambientOscillator.stop();
    ambientOscillator.disconnect();
    ambientGainNode.disconnect();

    ambientOscillator = null;
    ambientGainNode = null;
  }

  async function playWinFanfare(winScale) {
    const context = await resumeContext();
    const tones = audioConfig.winSteps;
    const startFreq = audioConfig.winBaseFreqHz;
    const durationSeconds = audioConfig.toneDurationMs / 1000;

    for (let step = 0; step < tones; step += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const normalizedWin = clamp(winScale, 0, 1);
      const detuneBoost = normalizedWin * 180;

      oscillator.type = 'triangle';
      oscillator.frequency.value = startFreq + step * (35 + detuneBoost / tones);
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(context.destination);

      const offset = step * durationSeconds * 0.45;
      const startAt = context.currentTime + offset;
      oscillator.start(startAt);

      gain.gain.exponentialRampToValueAtTime(0.08 + normalizedWin * 0.1, startAt + durationSeconds * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);

      oscillator.stop(startAt + durationSeconds);
    }
  }

  async function playNearMissTone() {
    const context = await resumeContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const durationSeconds = audioConfig.toneDurationMs / 1000;

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(audioConfig.nearMissStartFreqHz, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(audioConfig.nearMissEndFreqHz, context.currentTime + durationSeconds);

    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + durationSeconds * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + durationSeconds);
  }

  return {
    startAmbientHum,
    stopAmbientHum,
    playWinFanfare,
    playNearMissTone,
    resumeContext
  };
}

export function createUiController({ publicConfig }) {
  const elements = {
    app: document.querySelector('#app'),
    reelGrid: document.querySelector('#reelGrid'),
    ageGateModal: document.querySelector('#ageGateModal'),
    realityCheckModal: document.querySelector('#realityCheckModal'),
    paytableModal: document.querySelector('#paytableModal'),
    ageConfirmButton: document.querySelector('#ageConfirmButton'),
    realityAcknowledgeButton: document.querySelector('#realityAcknowledgeButton'),
    closePaytableButton: document.querySelector('#closePaytableButton'),
    paytableButton: document.querySelector('#paytableButton'),
    paytableList: document.querySelector('#paytableList'),
    spinButton: document.querySelector('#spinButton'),
    autoplayButton: document.querySelector('#autoplayButton'),
    depositButton: document.querySelector('#depositButton'),
    selfExcludeButton: document.querySelector('#selfExcludeButton'),
    betRange: document.querySelector('#betRange'),
    betValue: document.querySelector('#betValue'),
    balanceValue: document.querySelector('#balanceValue'),
    spendValue: document.querySelector('#spendValue'),
    winValue: document.querySelector('#winValue'),
    tierLabel: document.querySelector('#tierLabel'),
    xpFill: document.querySelector('#xpFill'),
    messageTicker: document.querySelector('#messageTicker'),
    turboToggle: document.querySelector('#turboToggle'),
    humToggle: document.querySelector('#humToggle'),
    autoplayLimitInput: document.querySelector('#autoplayLimitInput')
  };

  const audioEngine = createAudioEngine({
    ambientFrequencyHz: publicConfig.audio.AMBIENT_FREQUENCY_HZ,
    winBaseFreqHz: publicConfig.audio.WIN_BASE_FREQ_HZ,
    winSteps: publicConfig.audio.WIN_STEPS,
    nearMissStartFreqHz: publicConfig.audio.NEAR_MISS_START_FREQ_HZ,
    nearMissEndFreqHz: publicConfig.audio.NEAR_MISS_END_FREQ_HZ,
    toneDurationMs: publicConfig.audio.TONE_DURATION_MS
  });

  const bet = publicConfig.game.bet;
  elements.betRange.min = String(bet.min);
  elements.betRange.max = String(bet.max);
  elements.betRange.step = String(bet.step);
  elements.betRange.value = String(bet.min);

  elements.autoplayLimitInput.min = String(1);
  elements.autoplayLimitInput.max = String(publicConfig.compliance.autoplayHardCap);
  elements.autoplayLimitInput.value = String(publicConfig.game.autoplayMax);

  function revealApp() {
    elements.app.classList.remove('app--hidden');
  }

  function setAgeGateVisible(visible) {
    setModalVisible(elements.ageGateModal, visible);
  }

  function setRealityCheckVisible(visible) {
    setModalVisible(elements.realityCheckModal, visible);
  }

  function setPaytableVisible(visible) {
    setModalVisible(elements.paytableModal, visible);
  }

  function setControlsDisabled(disabled) {
    elements.spinButton.disabled = disabled;
    elements.autoplayButton.disabled = disabled;
    elements.betRange.disabled = disabled;
    elements.depositButton.disabled = disabled;
  }

  function setBetValue(value) {
    elements.betValue.textContent = formatTokens(value);
    elements.betRange.value = String(value);
  }

  function getSelectedBet() {
    return Number(elements.betRange.value || elements.betRange.min);
  }

  function getAutoplayLimit() {
    return Number(elements.autoplayLimitInput.value || 0);
  }

  function updateStatus({ balance, sessionSpend, winValue, tier, xp, tierThresholds }) {
    elements.balanceValue.textContent = formatTokens(balance);
    elements.spendValue.textContent = formatTokens(sessionSpend);
    elements.winValue.textContent = formatTokens(winValue);
    elements.tierLabel.textContent = tier;

    const bounds = getTierBounds(tierThresholds, tier);
    const ratio = (xp - bounds.lower) / (bounds.upper - bounds.lower);
    elements.xpFill.style.width = `${clamp(ratio, 0, 1) * 100}%`;
  }

  function setMessage(text) {
    elements.messageTicker.textContent = text;
  }

  function setTurboVisual(isTurboEnabled, normalMs, turboMs) {
    const duration = isTurboEnabled ? turboMs : normalMs;
    document.documentElement.style.setProperty('--spin-duration-ms', `${duration}ms`);
  }

  function renderPaytable(symbols) {
    elements.paytableList.innerHTML = '';
    for (const symbol of symbols) {
      const row = document.createElement('article');
      row.className = 'paytable-row';

      const emoji = document.createElement('span');
      emoji.className = 'paytable-row__emoji';
      emoji.textContent = symbol.emoji;

      const label = document.createElement('span');
      label.className = 'paytable-row__label';
      label.textContent = symbol.label;

      const payout = document.createElement('span');
      payout.className = 'paytable-row__payout';
      payout.textContent = `3:${symbol.payout[3] || 0} 4:${symbol.payout[4] || 0} 5:${symbol.payout[5] || 0}`;

      row.append(emoji, label, payout);
      elements.paytableList.appendChild(row);
    }
  }

  return {
    elements,
    audioEngine,
    revealApp,
    setAgeGateVisible,
    setRealityCheckVisible,
    setPaytableVisible,
    setControlsDisabled,
    setBetValue,
    getSelectedBet,
    getAutoplayLimit,
    updateStatus,
    setMessage,
    setTurboVisual,
    renderPaytable
  };
}
