/**
 * Browser UI adapter.
 * Handles DOM updates and user input bindings.
 */
export function createUI() {
  const elements = getElements();
  let paytableInitialized = false;
  let overlayTimeoutId = null;
  let winEffectTimeoutId = null;

  /**
   * @param {{
   * onSpin: () => void,
   * onBetStep: (direction: 1 | -1) => void,
   * onBetInput: (value: number) => void,
   * onSetLossLimit: (value: number) => void,
   * onClaimDailyReward: () => void,
   * onToggleSound: (enabled: boolean) => void,
   * onVolumeChange: (volumeFraction: number) => void,
   * onToggleContrast: (enabled: boolean) => void,
   * onToggleLargeText: (enabled: boolean) => void,
   * onToggleMotion: (enabled: boolean) => void,
   * onNewSession: () => void
   * }} handlers
   */
  function bindControls(handlers) {
    elements.spinButton.addEventListener("click", handlers.onSpin);
    elements.spinLever.addEventListener("click", handlers.onSpin);

    elements.betDown.addEventListener("click", () => handlers.onBetStep(-1));
    elements.betUp.addEventListener("click", () => handlers.onBetStep(1));
    elements.betSlider.addEventListener("input", () => handlers.onBetInput(Number(elements.betSlider.value)));
    elements.betInput.addEventListener("change", () => handlers.onBetInput(Number(elements.betInput.value)));

    elements.setLossLimitButton.addEventListener("click", () => {
      handlers.onSetLossLimit(Number(elements.lossLimitInput.value));
    });

    elements.dailyRewardButton.addEventListener("click", handlers.onClaimDailyReward);
    elements.newSessionButton.addEventListener("click", handlers.onNewSession);

    const updateVolume = (value) => handlers.onVolumeChange(Number(value) / 100);

    elements.soundToggle.addEventListener("change", () => handlers.onToggleSound(elements.soundToggle.checked));
    elements.entrySoundToggle.addEventListener("change", () => handlers.onToggleSound(elements.entrySoundToggle.checked));

    elements.volumeSlider.addEventListener("input", () => updateVolume(elements.volumeSlider.value));
    elements.entryVolumeSlider.addEventListener("input", () => updateVolume(elements.entryVolumeSlider.value));

    elements.contrastToggle.addEventListener("change", () => handlers.onToggleContrast(elements.contrastToggle.checked));
    elements.largeTextToggle.addEventListener("change", () => handlers.onToggleLargeText(elements.largeTextToggle.checked));
    elements.motionToggle.addEventListener("change", () => handlers.onToggleMotion(elements.motionToggle.checked));
  }

  /**
   * @param {{
   * onPlay: () => void,
   * onBackToEntry: () => void,
   * onHomeFromGame: () => void,
   * onSubmitAgeGate: (value: string) => void,
   * onAnyInteraction: () => void
   * }} handlers
   */
  function bindFlowControls(handlers) {
    elements.playButton.addEventListener("click", () => {
      handlers.onAnyInteraction();
      handlers.onPlay();
    });

    elements.backToEntryButton.addEventListener("click", handlers.onBackToEntry);

    elements.ageGateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handlers.onAnyInteraction();
      handlers.onSubmitAgeGate(elements.birthDateInput.value.trim());
    });

    elements.infoButton.addEventListener("click", () => {
      handlers.onAnyInteraction();
      openInfoModal();
    });

    elements.gameplayInfoButton.addEventListener("click", () => {
      handlers.onAnyInteraction();
      openInfoModal();
    });

    elements.gameplayHomeButton.addEventListener("click", () => {
      handlers.onAnyInteraction();
      closeInfoModal();
      handlers.onHomeFromGame();
    });

    elements.closeInfoButton.addEventListener("click", closeInfoModal);
    elements.infoModal.addEventListener("click", (event) => {
      if (event.target === elements.infoModal) {
        closeInfoModal();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.infoModal.hidden) {
        closeInfoModal();
      }
    });
  }

  /**
   * @param {"entry" | "age" | "gameplay"} screen
   */
  function setActiveScreen(screen) {
    const screenIds = {
      entry: "entryScreen",
      age: "ageGateScreen",
      gameplay: "gameplayScreen",
    };
    const nextId = screenIds[screen];
    const screens = [elements.entryScreen, elements.ageGateScreen, elements.gameplayScreen];
    screens.forEach((item) => {
      const isActive = item.id === nextId;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    if (screen !== "gameplay") {
      elements.winnerOverlay.hidden = true;
    }
  }

  /**
   * @param {string} message
   * @param {"info" | "warn" | "loss" | "win"} tone
   */
  function setAgeGateMessage(message, tone) {
    elements.ageGateMessage.textContent = message;
    elements.ageGateMessage.classList.remove("tone-info", "tone-warn", "tone-loss", "tone-win");
    elements.ageGateMessage.classList.add(`tone-${tone}`);
  }

  function focusBirthDateInput() {
    elements.birthDateInput.focus();
  }

  function clearBirthDateInput() {
    elements.birthDateInput.value = "";
  }

  /**
   * @param {{
   * state: any,
   * derived: any,
   * symbolMap: Map<string, {id: string, name: string, glyph: string, icon?: string}>,
   * banner: {text: string, tone: string},
   * rtp: number
   * }} model
   */
  function renderState(model) {
    const { state, derived, symbolMap, banner, rtp } = model;

    renderReels(state.reels, symbolMap);
    renderBanner(banner.text, banner.tone);

    elements.balanceValue.textContent = formatTokens(state.balance);
    elements.betValue.textContent = formatTokens(state.bet);
    elements.sessionLossValue.textContent = formatTokens(derived.sessionLoss);
    elements.lossLimitValue.textContent = state.controls.lossLimit > 0 ? formatTokens(state.controls.lossLimit) : "Off";
    elements.limitStatus.textContent = derived.limitStatusText;

    elements.spentValue.textContent = formatTokens(state.session.spent);
    elements.wonValue.textContent = formatTokens(state.session.won);
    elements.bonusValue.textContent = formatTokens(state.session.bonus);
    elements.netValue.textContent = signedTokens(derived.sessionNet);
    elements.netValue.className = derived.sessionNetClass;
    elements.spinsValue.textContent = String(state.session.spins);
    elements.winRateValue.textContent = `${derived.winRatePercent}%`;

    elements.lossLimitInput.value = String(state.controls.lossLimit);
    elements.betSlider.value = String(state.bet);
    elements.betInput.value = String(state.bet);

    const isSpinning = state.isSpinning;
    elements.spinButton.textContent = isSpinning ? "Spinning..." : "Spin Reels";
    elements.spinButton.disabled = !derived.canSpin;
    elements.spinLever.disabled = !derived.canSpin;
    elements.spinLever.classList.toggle("pulled", isSpinning);
    elements.gameplayHomeButton.disabled = isSpinning;

    elements.dailyRewardButton.disabled = !derived.dailyReward.available;
    elements.dailyStatus.textContent = derived.dailyReward.available
      ? `Daily reward ready: +${formatTokens(derived.dailyReward.amount)} (streak ${derived.dailyReward.nextStreak}).`
      : `Daily reward claimed today. Current streak: ${state.reward.streak}.`;

    elements.loyaltyTier.textContent = derived.loyalty.tier;
    elements.loyaltyPoints.textContent = `${state.loyalty.points} points`;
    elements.loyaltyProgress.value = derived.loyalty.progressPercent;
    elements.loyaltyNext.textContent = derived.loyalty.nextText;

    const volumePercent = String(Math.round(state.settings.volume * 100));
    elements.soundToggle.checked = state.settings.soundEnabled;
    elements.entrySoundToggle.checked = state.settings.soundEnabled;
    elements.volumeSlider.value = volumePercent;
    elements.entryVolumeSlider.value = volumePercent;
    elements.contrastToggle.checked = state.settings.highContrast;
    elements.largeTextToggle.checked = state.settings.largeText;
    elements.motionToggle.checked = state.settings.reducedMotion;

    elements.rtpValue.textContent = `Approximate RTP: ${rtp.toFixed(
      1,
    )}%. Theoretical long-run value from weighted reels.`;
  }

  /**
   * @param {{pattern: string, multiplier: string}[]} rows
   */
  function renderPaytable(rows) {
    if (paytableInitialized) {
      return;
    }

    renderPaytableRows(elements.paytableBody, rows);
    renderPaytableRows(elements.infoPaytableBody, rows);
    paytableInitialized = true;
  }

  /**
   * @param {number} reelIndex
   * @param {boolean} spinning
   */
  function setReelSpinning(reelIndex, spinning) {
    const reel = elements.reels[reelIndex];
    reel.style.setProperty("--reel-index", String(reelIndex));
    reel.classList.toggle("spinning", spinning);
    if (spinning) {
      reel.classList.remove("settled");
    }
    syncReelRowAnimationState();
  }

  /**
   * @param {number} reelIndex
   * @param {{name: string, glyph: string, icon?: string}} symbol
   * @param {boolean} isFinal
   */
  function updateReel(reelIndex, symbol, isFinal) {
    const reel = elements.reels[reelIndex];
    const icon = reel.querySelector(".reel-icon");
    const label = reel.querySelector(".reel-label");

    if (icon instanceof HTMLImageElement) {
      if (symbol.icon) {
        icon.src = symbol.icon;
      }
      icon.alt = symbol.name;
    }

    if (label) {
      label.textContent = symbol.name;
    }

    if (isFinal) {
      reel.classList.remove("spinning");
      reel.classList.add("settled");
      syncReelRowAnimationState();
    }
  }

  function syncReelRowAnimationState() {
    const anySpinning = elements.reels.some((reel) => reel.classList.contains("spinning"));
    elements.reelRow.classList.toggle("is-spinning", anySpinning);
  }

  /**
   * @param {string} text
   */
  function setRestoreNote(text) {
    elements.restoreNote.textContent = text;
  }

  /**
   * @param {string[]} reelIds
   * @param {Map<string, {name: string, glyph: string, icon?: string}>} symbolMap
   */
  function renderReels(reelIds, symbolMap) {
    reelIds.forEach((symbolId, index) => {
      const symbol = symbolMap.get(symbolId);
      if (symbol) {
        updateReel(index, symbol, true);
      }
    });
  }

  /**
   * @param {string} text
   * @param {string} tone
   */
  function renderBanner(text, tone) {
    elements.outcomeBanner.textContent = text;
    elements.outcomeBanner.classList.remove("tone-info", "tone-win", "tone-warn", "tone-loss");
    elements.outcomeBanner.classList.add(`tone-${tone}`);
  }

  /**
   * @param {{major: boolean, payout: number, multiplier: number, reducedMotion: boolean}} details
   */
  function playWinFeedback(details) {
    if (winEffectTimeoutId) {
      window.clearTimeout(winEffectTimeoutId);
      winEffectTimeoutId = null;
    }

    elements.slotCabinet.classList.remove("win-flash", "major-flash", "win-shake");
    void elements.slotCabinet.offsetWidth;
    elements.slotCabinet.classList.add(details.major ? "major-flash" : "win-flash");
    elements.slotCabinet.classList.add("win-shake");

    elements.outcomeBanner.classList.remove("win-pop");
    void elements.outcomeBanner.offsetWidth;
    elements.outcomeBanner.classList.add("win-pop");

    const winTargets = getWinHighlightTargets();
    winTargets.forEach((node) => {
      node.classList.remove("win-highlight");
      void node.offsetWidth;
      node.classList.add("win-highlight");
    });

    winEffectTimeoutId = window.setTimeout(() => {
      elements.slotCabinet.classList.remove("win-shake");
      elements.outcomeBanner.classList.remove("win-pop");
      winTargets.forEach((node) => node.classList.remove("win-highlight"));
    }, details.reducedMotion ? 240 : 760);

    showWinnerOverlay({
      title: details.major ? "Major Win" : "Win",
      detail: `Payout ${formatTokens(details.payout)} at ${details.multiplier.toFixed(1)}x.`,
      major: details.major,
      reducedMotion: details.reducedMotion,
    });
  }

  function closeInfoModal() {
    elements.infoModal.hidden = true;
  }

  function openInfoModal() {
    elements.infoModal.hidden = false;
  }

  /**
   * @param {{title: string, detail: string, major: boolean, reducedMotion: boolean}} details
   */
  function showWinnerOverlay(details) {
    if (overlayTimeoutId) {
      window.clearTimeout(overlayTimeoutId);
      overlayTimeoutId = null;
    }

    elements.winnerTitle.textContent = details.title;
    elements.winnerDetail.textContent = details.detail;
    elements.winnerCard.classList.remove("major", "normal");
    elements.winnerCard.classList.add(details.major ? "major" : "normal");
    elements.winnerOverlay.hidden = false;

    const duration = details.reducedMotion ? 900 : details.major ? 2600 : 1500;
    overlayTimeoutId = window.setTimeout(() => {
      elements.winnerOverlay.hidden = true;
    }, duration);
  }

  /**
   * @param {HTMLTableSectionElement} tbody
   * @param {{pattern: string, multiplier: string, icon?: string | null}[]} rows
   */
  function renderPaytableRows(tbody, rows) {
    tbody.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement("tr");
      const patternCell = document.createElement("td");
      const multiplierCell = document.createElement("td");

      if (row.icon) {
        const wrap = document.createElement("span");
        wrap.className = "pay-symbol";
        const icon = document.createElement("img");
        icon.src = row.icon;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.textContent = row.pattern;
        wrap.append(icon, text);
        patternCell.appendChild(wrap);
      } else {
        patternCell.textContent = row.pattern;
      }

      multiplierCell.textContent = row.multiplier;
      tr.append(patternCell, multiplierCell);
      tbody.appendChild(tr);
    }
  }

  /**
   * @returns {HTMLElement[]}
   */
  function getWinHighlightTargets() {
    const balanceCard = elements.balanceValue.closest(".metric-card");
    const targets = [balanceCard, elements.wonValue, elements.netValue];
    return targets.filter((node) => node instanceof HTMLElement);
  }

  return {
    bindControls,
    bindFlowControls,
    setActiveScreen,
    setAgeGateMessage,
    focusBirthDateInput,
    clearBirthDateInput,
    renderState,
    renderPaytable,
    setReelSpinning,
    updateReel,
    setRestoreNote,
    playWinFeedback,
  };
}

/**
 * @returns {Record<string, HTMLElement | HTMLInputElement | HTMLButtonElement | HTMLFormElement>}
 */
function getElements() {
  const query = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  };

  return {
    entryScreen: query("entryScreen"),
    ageGateScreen: query("ageGateScreen"),
    gameplayScreen: query("gameplayScreen"),
    playButton: query("playButton"),
    infoButton: query("infoButton"),
    gameplayInfoButton: query("gameplayInfoButton"),
    gameplayHomeButton: query("gameplayHomeButton"),
    infoModal: query("infoModal"),
    closeInfoButton: query("closeInfoButton"),
    ageGateForm: query("ageGateForm"),
    birthDateInput: query("birthDateInput"),
    backToEntryButton: query("backToEntryButton"),
    ageGateMessage: query("ageGateMessage"),
    restoreNote: query("restoreNote"),
    balanceValue: query("balanceValue"),
    betValue: query("betValue"),
    sessionLossValue: query("sessionLossValue"),
    lossLimitValue: query("lossLimitValue"),
    spentValue: query("spentValue"),
    wonValue: query("wonValue"),
    bonusValue: query("bonusValue"),
    netValue: query("netValue"),
    spinsValue: query("spinsValue"),
    winRateValue: query("winRateValue"),
    limitStatus: query("limitStatus"),
    paytableBody: query("paytableBody"),
    infoPaytableBody: query("infoPaytableBody"),
    rtpValue: query("rtpValue"),
    dailyStatus: query("dailyStatus"),
    loyaltyTier: query("loyaltyTier"),
    loyaltyPoints: query("loyaltyPoints"),
    loyaltyProgress: query("loyaltyProgress"),
    loyaltyNext: query("loyaltyNext"),
    outcomeBanner: query("outcomeBanner"),
    spinButton: query("spinButton"),
    spinLever: query("spinLever"),
    betDown: query("betDown"),
    betUp: query("betUp"),
    betSlider: query("betSlider"),
    betInput: query("betInput"),
    lossLimitInput: query("lossLimitInput"),
    setLossLimitButton: query("setLossLimitButton"),
    dailyRewardButton: query("dailyRewardButton"),
    newSessionButton: query("newSessionButton"),
    soundToggle: query("soundToggle"),
    entrySoundToggle: query("entrySoundToggle"),
    volumeSlider: query("volumeSlider"),
    entryVolumeSlider: query("entryVolumeSlider"),
    contrastToggle: query("contrastToggle"),
    largeTextToggle: query("largeTextToggle"),
    motionToggle: query("motionToggle"),
    slotCabinet: query("slotCabinet"),
    winnerOverlay: query("winnerOverlay"),
    winnerCard: query("winnerCard"),
    winnerTitle: query("winnerTitle"),
    winnerDetail: query("winnerDetail"),
    reelRow: queryClass(".reel-row"),
    reels: [query("reel-0"), query("reel-1"), query("reel-2")],
  };
}

/**
 * @param {string} selector
 * @returns {HTMLElement}
 */
function queryClass(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

/**
 * @param {number} amount
 * @returns {string}
 */
function formatTokens(amount) {
  const rounded = Math.max(0, Math.floor(amount));
  return `${rounded.toLocaleString("en-US")} tokens`;
}

/**
 * @param {number} amount
 * @returns {string}
 */
function signedTokens(amount) {
  const rounded = Math.floor(Math.abs(amount));
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${rounded.toLocaleString("en-US")} tokens`;
}
