/**
 * @fileoverview DOM rendering and event wiring for the slot UI.
 * @typedef {{text: string, tone: "neutral" | "win" | "break-even" | "partial" | "loss"}} OutcomeMessage
 */

/**
 * @param {number} value
 * @returns {string}
 */
function formatCredits(value) {
  return `${Math.round(value)} cr`;
}

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return numericValue;
}

/**
 * @param {any} spinResult
 * @returns {OutcomeMessage}
 */
function getOutcomeMessage(spinResult) {
  if (!spinResult || !spinResult.ok) {
    return {
      text: "Ready to spin.",
      tone: "neutral"
    };
  }

  const payout = spinResult.payoutInfo.payout;
  const line = spinResult.payoutInfo.line;

  if (spinResult.outcomeType === "win") {
    return {
      text: `Win: ${line} paid ${formatCredits(payout)}.`,
      tone: "win"
    };
  }

  if (spinResult.outcomeType === "break-even") {
    return {
      text: `Break-even: ${line} returned your bet.`,
      tone: "break-even"
    };
  }

  if (spinResult.outcomeType === "partial") {
    return {
      text: `Partial return: ${line} paid ${formatCredits(payout)}.`,
      tone: "partial"
    };
  }

  return {
    text: "No payout this spin.",
    tone: "loss"
  };
}

/**
 * @param {Element} element
 * @returns {void}
 */
function clearToneClasses(element) {
  element.classList.remove("tone-win", "tone-loss", "tone-neutral", "tone-break-even", "tone-partial");
}

/**
 * UI controller: only DOM reads/writes and user event wiring.
 * @param {{
 *   getSymbolById: (symbolId: string) => {label: string, title: string, icon: string},
 *   getRandomSymbolId: () => string,
 *   onSpin: () => Promise<any> | any,
 *   onBetChange: (bet: number) => void,
 *   onLimitsChange: (limits: {sessionBudget: number, lossLimit: number}) => void,
 *   onResume: () => void,
 *   onReset: () => void,
 *   onToggleAccessibility: (key: string, enabled: boolean) => void,
 *   onToggleSound: (enabled: boolean) => void,
 *   onVolumeChange: (volume: number) => void,
 *   onPlayRequest: () => void,
 *   onSubmitAge: (birthDate: string) => void,
 *   onBackFromAge: () => void,
 *   onBackToHome: () => void
 * }} options
 */
export function createUI({
  getSymbolById,
  getRandomSymbolId,
  onSpin,
  onBetChange,
  onLimitsChange,
  onResume,
  onReset,
  onToggleAccessibility,
  onToggleSound,
  onVolumeChange,
  onPlayRequest,
  onSubmitAge,
  onBackFromAge,
  onBackToHome
}) {
  const reels = [
    document.getElementById("reel-1"),
    document.getElementById("reel-2"),
    document.getElementById("reel-3")
  ];

  const elements = {
    entryScreen: document.getElementById("entry-screen"),
    ageScreen: document.getElementById("age-screen"),
    gameScreen: document.getElementById("game-screen"),
    playButton: document.getElementById("entry-play-button"),
    ageInput: document.getElementById("age-input"),
    ageSubmitButton: document.getElementById("age-submit-button"),
    ageBackButton: document.getElementById("age-back-button"),
    ageFeedback: document.getElementById("age-feedback"),
    infoModal: document.getElementById("info-modal"),
    infoButtons: [document.getElementById("entry-info-button"), document.getElementById("gameplay-info-button")],
    homeButton: document.getElementById("gameplay-home-button"),
    infoCloseButton: document.getElementById("info-close-button"),
    spinButton: document.getElementById("spin-button"),
    leverButton: document.getElementById("lever-button"),
    minusBetButton: document.getElementById("bet-minus"),
    plusBetButton: document.getElementById("bet-plus"),
    betInput: document.getElementById("bet-input"),
    budgetInput: document.getElementById("budget-input"),
    lossLimitInput: document.getElementById("loss-limit-input"),
    resumeButton: document.getElementById("resume-button"),
    resetButton: document.getElementById("reset-button"),
    outcome: document.getElementById("outcome-text"),
    payline: document.getElementById("payline-text"),
    advisory: document.getElementById("responsible-message"),
    pauseBanner: document.getElementById("pause-banner"),
    pauseReason: document.getElementById("pause-reason"),
    netResult: document.getElementById("net-result"),
    balance: document.getElementById("balance-value"),
    spend: document.getElementById("spend-value"),
    won: document.getElementById("won-value"),
    spins: document.getElementById("spins-value"),
    xp: document.getElementById("xp-value"),
    tierName: document.getElementById("tier-value"),
    tierProgressLabel: document.getElementById("tier-progress-label"),
    tierProgressFill: document.getElementById("tier-progress-fill"),
    soundToggle: document.getElementById("sound-toggle"),
    volumeInput: document.getElementById("volume-input"),
    entrySoundToggle: document.getElementById("entry-sound-toggle"),
    entryVolumeInput: document.getElementById("entry-volume-input"),
    highContrastToggle: document.getElementById("high-contrast-toggle"),
    largePrintToggle: document.getElementById("large-print-toggle"),
    reducedMotionToggle: document.getElementById("reduced-motion-toggle"),
    paytableBody: document.getElementById("paytable-body"),
    infoPaytableBody: document.getElementById("info-paytable-body"),
    rtpValue: document.getElementById("rtp-value"),
    hitRateValue: document.getElementById("hit-rate-value"),
    outcomeArea: document.querySelector(".outcome-area"),
    bigWinOverlay: document.getElementById("big-win-overlay"),
    bigWinLine: document.getElementById("big-win-line")
  };

  let spinInProgress = false;
  let lastFocusedElement = null;

  function renderSymbol(reelElement, symbolId) {
    const symbol = getSymbolById(symbolId);

    reelElement.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.className = "reel-symbol";

    const image = document.createElement("img");
    image.className = "reel-symbol-image";
    image.src = symbol.icon;
    image.alt = `${symbol.label} symbol`;

    const label = document.createElement("span");
    label.className = "reel-symbol-label";
    label.textContent = symbol.label;

    wrapper.appendChild(image);
    wrapper.appendChild(label);

    reelElement.appendChild(wrapper);
    reelElement.setAttribute("aria-label", `${symbol.title} symbol`);
    reelElement.title = symbol.title;
  }

  function renderSymbols(symbolIds) {
    reels.forEach((reelElement, index) => {
      renderSymbol(reelElement, symbolIds[index]);
    });
  }

  function setSpinEnabled(enabled) {
    elements.spinButton.disabled = !enabled;
    elements.leverButton.disabled = !enabled;
  }

  function updatePauseBanner(state) {
    if (state.isPaused) {
      elements.pauseBanner.hidden = false;
      elements.pauseReason.textContent = state.pauseReason;
      elements.resumeButton.disabled = false;
      return;
    }

    elements.pauseBanner.hidden = true;
    elements.pauseReason.textContent = "";
  }

  function setActiveScreen(activeScreen) {
    [elements.entryScreen, elements.ageScreen, elements.gameScreen].forEach((screen) => {
      const isActive = screen === activeScreen;
      screen.hidden = !isActive;
      screen.classList.toggle("is-active", isActive);
    });
  }

  function showEntryScreen() {
    setActiveScreen(elements.entryScreen);
  }

  function showAgeScreen() {
    setActiveScreen(elements.ageScreen);
    elements.ageInput.focus();
  }

  function showGameScreen() {
    setActiveScreen(elements.gameScreen);
  }

  function renderState(state) {
    elements.balance.textContent = formatCredits(state.balance);
    elements.spend.textContent = formatCredits(state.totalSpend);
    elements.won.textContent = formatCredits(state.totalWon);
    elements.spins.textContent = `${state.spins}`;
    elements.netResult.textContent = formatCredits(state.net);

    elements.netResult.classList.remove("positive", "negative", "flat");
    if (state.net > 0) {
      elements.netResult.classList.add("positive");
    } else if (state.net < 0) {
      elements.netResult.classList.add("negative");
    } else {
      elements.netResult.classList.add("flat");
    }

    elements.betInput.value = `${state.bet}`;
    elements.betInput.min = `${state.minBet}`;
    elements.betInput.max = `${state.maxBet}`;

    elements.budgetInput.value = `${state.sessionBudget}`;
    elements.lossLimitInput.value = `${state.lossLimit}`;

    elements.xp.textContent = `${state.xp} XP`;
    elements.tierName.textContent = state.tierName;
    elements.tierProgressFill.style.width = `${state.tierProgressPercent}%`;
    elements.tierProgressLabel.textContent =
      state.xpToNext > 0
        ? `${Math.round(state.tierProgressPercent)}% to ${state.nextTierName} (${state.xpToNext} XP left)`
        : "Top tier reached";

    const canAfford = state.balance >= state.bet;
    setSpinEnabled(!spinInProgress && !state.isPaused && canAfford);

    updatePauseBanner(state);
    renderSymbols(state.lastSymbols);
  }

  function renderAdvisory(message) {
    elements.advisory.textContent = message;
  }

  function renderSpinResult(spinResult) {
    renderSymbols(spinResult.symbols);

    const outcome = getOutcomeMessage(spinResult);
    elements.outcome.textContent = outcome.text;

    clearToneClasses(elements.outcome);
    clearToneClasses(elements.payline);

    if (outcome.tone === "win") {
      elements.outcome.classList.add("tone-win");
      elements.payline.classList.add("tone-win");
    } else if (outcome.tone === "loss") {
      elements.outcome.classList.add("tone-loss");
      elements.payline.classList.add("tone-loss");
    } else if (outcome.tone === "break-even") {
      elements.outcome.classList.add("tone-break-even");
      elements.payline.classList.add("tone-break-even");
    } else if (outcome.tone === "partial") {
      elements.outcome.classList.add("tone-partial");
      elements.payline.classList.add("tone-partial");
    } else {
      elements.outcome.classList.add("tone-neutral");
      elements.payline.classList.add("tone-neutral");
    }

    elements.payline.textContent = `Line: ${spinResult.payoutInfo.line} | Multiplier: ${spinResult.payoutInfo.multiplier}x`;
  }

  function setMessage(text, tone = "neutral") {
    elements.outcome.textContent = text;

    clearToneClasses(elements.outcome);
    if (tone === "warning") {
      elements.outcome.classList.add("tone-loss");
    } else {
      elements.outcome.classList.add("tone-neutral");
    }
  }

  function setAgeFeedback(text, tone = "neutral") {
    elements.ageFeedback.textContent = text;
    clearToneClasses(elements.ageFeedback);

    if (tone === "warning") {
      elements.ageFeedback.classList.add("tone-loss");
      return;
    }

    if (tone === "win") {
      elements.ageFeedback.classList.add("tone-win");
      return;
    }

    elements.ageFeedback.classList.add("tone-neutral");
  }

  function animateSingleReel(reelElement, finalSymbolId, durationMs) {
    return new Promise((resolve) => {
      reelElement.classList.add("spinning");
      reelElement.classList.remove("spin-settle");
      const start = window.performance.now();
      let timer = 0;

      const tick = () => {
        const elapsed = window.performance.now() - start;
        const progress = Math.min(elapsed / durationMs, 1);

        renderSymbol(reelElement, getRandomSymbolId());
        reelElement.style.setProperty("--spin-progress", `${progress}`);

        if (progress >= 1) {
          stopSpin();
          return;
        }

        const cadenceMs = progress < 0.55 ? 48 : progress < 0.84 ? 72 : 108;
        timer = window.setTimeout(tick, cadenceMs);
      };

      const stopSpin = () => {
        window.clearTimeout(timer);
        renderSymbol(reelElement, finalSymbolId);
        reelElement.classList.remove("spinning");
        reelElement.classList.add("spin-settle");
        reelElement.style.removeProperty("--spin-progress");
        window.setTimeout(() => {
          reelElement.classList.remove("spin-settle");
        }, 260);
        resolve();
      };

      tick();
    });
  }

  async function animateReels(finalSymbols, reducedMotion) {
    if (reducedMotion) {
      renderSymbols(finalSymbols);
      return;
    }

    await animateSingleReel(reels[0], finalSymbols[0], 550);
    await animateSingleReel(reels[1], finalSymbols[1], 880);
    await animateSingleReel(reels[2], finalSymbols[2], 1220);
  }

  function pulseOutcomeArea(className) {
    elements.outcomeArea.classList.remove("minor-win-pulse");
    if (className === "minor-win-pulse") {
      elements.outcomeArea.classList.add(className);
      window.setTimeout(() => {
        elements.outcomeArea.classList.remove(className);
      }, 900);
    }
  }

  function celebrateMinorWin() {
    pulseOutcomeArea("minor-win-pulse");
  }

  function celebrateMajorWin(spinResult, reducedMotion) {
    elements.bigWinLine.textContent = `${spinResult.payoutInfo.line} paid ${formatCredits(spinResult.payoutInfo.payout)}!`;
    elements.bigWinOverlay.hidden = false;
    elements.bigWinOverlay.classList.add("show");

    if (!reducedMotion) {
      for (let index = 0; index < 16; index += 1) {
        const burst = document.createElement("span");
        burst.className = "bubble-burst";
        burst.style.left = `${5 + Math.random() * 90}%`;
        burst.style.animationDelay = `${Math.random() * 240}ms`;
        elements.bigWinOverlay.appendChild(burst);
      }
    }

    window.setTimeout(() => {
      elements.bigWinOverlay.classList.remove("show");
      elements.bigWinOverlay.hidden = true;
      elements.bigWinOverlay.querySelectorAll(".bubble-burst").forEach((node) => node.remove());
    }, reducedMotion ? 1200 : 2500);
  }

  function setBusy(isBusy) {
    spinInProgress = isBusy;
    setSpinEnabled(!isBusy);

    elements.spinButton.setAttribute("aria-busy", String(isBusy));
    elements.leverButton.classList.toggle("lever-active", isBusy);
    elements.betInput.disabled = isBusy;
    elements.minusBetButton.disabled = isBusy;
    elements.plusBetButton.disabled = isBusy;
    elements.homeButton.disabled = isBusy;
  }

  function renderPaytable(rows) {
    elements.paytableBody.innerHTML = "";
    elements.infoPaytableBody.innerHTML = "";

    rows.forEach((row) => {
      const createRow = () => {
        const tableRow = document.createElement("tr");

        const comboCell = document.createElement("td");
        comboCell.textContent = row.combo;
        tableRow.appendChild(comboCell);

        const payoutCell = document.createElement("td");
        payoutCell.textContent = row.payout;
        tableRow.appendChild(payoutCell);

        const noteCell = document.createElement("td");
        noteCell.textContent = row.note;
        tableRow.appendChild(noteCell);

        return tableRow;
      };

      elements.paytableBody.appendChild(createRow());
      elements.infoPaytableBody.appendChild(createRow());
    });
  }

  function renderFairness(report) {
    elements.rtpValue.textContent = `${report.rtpPercent.toFixed(2)}%`;
    elements.hitRateValue.textContent = `${report.hitRatePercent.toFixed(2)}%`;
  }

  function renderAccessibilitySettings(settings) {
    elements.highContrastToggle.checked = settings.highContrast;
    elements.largePrintToggle.checked = settings.largePrint;
    elements.reducedMotionToggle.checked = settings.reducedMotion;
  }

  function renderSoundSettings(settings) {
    elements.soundToggle.checked = settings.enabled;
    elements.volumeInput.value = `${settings.volume}`;

    elements.entrySoundToggle.checked = settings.enabled;
    elements.entryVolumeInput.value = `${settings.volume}`;
  }

  function openInfoModal() {
    lastFocusedElement = document.activeElement;
    elements.infoModal.hidden = false;
    elements.infoModal.classList.add("show");
    elements.infoCloseButton.focus();
  }

  function closeInfoModal() {
    elements.infoModal.classList.remove("show");
    elements.infoModal.hidden = true;

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function bindEvents() {
    elements.playButton.addEventListener("click", () => {
      onPlayRequest();
    });

    elements.ageSubmitButton.addEventListener("click", () => {
      onSubmitAge(elements.ageInput.value.trim());
    });

    elements.ageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        onSubmitAge(elements.ageInput.value.trim());
      }
    });

    elements.ageBackButton.addEventListener("click", () => {
      onBackFromAge();
    });

    elements.infoButtons.forEach((button) => {
      button.addEventListener("click", openInfoModal);
    });

    elements.infoCloseButton.addEventListener("click", closeInfoModal);

    elements.infoModal.addEventListener("click", (event) => {
      if (event.target === elements.infoModal) {
        closeInfoModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.infoModal.hidden) {
        closeInfoModal();
      }
    });

    elements.spinButton.addEventListener("click", () => {
      onSpin();
    });

    elements.leverButton.addEventListener("click", () => {
      onSpin();
    });

    elements.homeButton.addEventListener("click", () => {
      onBackToHome();
    });

    elements.minusBetButton.addEventListener("click", () => {
      const nextValue = toNumber(elements.betInput.value, 1) - 1;
      onBetChange(nextValue);
    });

    elements.plusBetButton.addEventListener("click", () => {
      const nextValue = toNumber(elements.betInput.value, 1) + 1;
      onBetChange(nextValue);
    });

    elements.betInput.addEventListener("change", () => {
      onBetChange(toNumber(elements.betInput.value, 1));
    });

    elements.budgetInput.addEventListener("change", () => {
      onLimitsChange({
        sessionBudget: toNumber(elements.budgetInput.value, 0),
        lossLimit: toNumber(elements.lossLimitInput.value, 0)
      });
    });

    elements.lossLimitInput.addEventListener("change", () => {
      onLimitsChange({
        sessionBudget: toNumber(elements.budgetInput.value, 0),
        lossLimit: toNumber(elements.lossLimitInput.value, 0)
      });
    });

    elements.resumeButton.addEventListener("click", () => {
      onResume();
    });

    elements.resetButton.addEventListener("click", () => {
      onReset();
    });

    elements.soundToggle.addEventListener("change", () => {
      onToggleSound(elements.soundToggle.checked);
    });

    elements.entrySoundToggle.addEventListener("change", () => {
      onToggleSound(elements.entrySoundToggle.checked);
    });

    elements.volumeInput.addEventListener("input", () => {
      onVolumeChange(toNumber(elements.volumeInput.value, 0.4));
    });

    elements.entryVolumeInput.addEventListener("input", () => {
      onVolumeChange(toNumber(elements.entryVolumeInput.value, 0.4));
    });

    elements.highContrastToggle.addEventListener("change", () => {
      onToggleAccessibility("highContrast", elements.highContrastToggle.checked);
    });

    elements.largePrintToggle.addEventListener("change", () => {
      onToggleAccessibility("largePrint", elements.largePrintToggle.checked);
    });

    elements.reducedMotionToggle.addEventListener("change", () => {
      onToggleAccessibility("reducedMotion", elements.reducedMotionToggle.checked);
    });
  }

  bindEvents();

  return {
    showEntryScreen,
    showAgeScreen,
    showGameScreen,
    renderState,
    renderSpinResult,
    renderAdvisory,
    setMessage,
    setAgeFeedback,
    setBusy,
    animateReels,
    celebrateMinorWin,
    celebrateMajorWin,
    renderPaytable,
    renderFairness,
    renderAccessibilitySettings,
    renderSoundSettings
  };
}
