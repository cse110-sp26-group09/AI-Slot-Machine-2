function formatCredits(value) {
  return `${Math.round(value)} cr`;
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return numericValue;
}

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

function clearToneClasses(element) {
  element.classList.remove("tone-win", "tone-loss", "tone-neutral", "tone-break-even", "tone-partial");
}

/**
 * UI controller: only DOM reads/writes and user event wiring.
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
  onVolumeChange
}) {
  const reels = [
    document.getElementById("reel-1"),
    document.getElementById("reel-2"),
    document.getElementById("reel-3")
  ];

  const elements = {
    spinButton: document.getElementById("spin-button"),
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
    highContrastToggle: document.getElementById("high-contrast-toggle"),
    largePrintToggle: document.getElementById("large-print-toggle"),
    reducedMotionToggle: document.getElementById("reduced-motion-toggle"),
    paytableBody: document.getElementById("paytable-body"),
    rtpValue: document.getElementById("rtp-value"),
    hitRateValue: document.getElementById("hit-rate-value")
  };

  let spinInProgress = false;

  function renderSymbols(symbolIds) {
    reels.forEach((reelElement, index) => {
      const symbol = getSymbolById(symbolIds[index]);
      reelElement.textContent = symbol.label;
      reelElement.setAttribute("aria-label", symbol.title);
      reelElement.title = symbol.title;
    });
  }

  function setSpinEnabled(enabled) {
    elements.spinButton.disabled = !enabled;
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

  function animateSingleReel(reelElement, finalSymbolId, durationMs) {
    return new Promise((resolve) => {
      reelElement.classList.add("spinning");
      const start = Date.now();

      const timer = window.setInterval(() => {
        const rollingSymbol = getSymbolById(getRandomSymbolId());
        reelElement.textContent = rollingSymbol.label;
      }, 70);

      const stopSpin = () => {
        window.clearInterval(timer);
        const finalSymbol = getSymbolById(finalSymbolId);
        reelElement.textContent = finalSymbol.label;
        reelElement.title = finalSymbol.title;
        reelElement.setAttribute("aria-label", finalSymbol.title);
        reelElement.classList.remove("spinning");
        resolve();
      };

      const frameTick = () => {
        if (Date.now() - start >= durationMs) {
          stopSpin();
          return;
        }

        window.requestAnimationFrame(frameTick);
      };

      window.requestAnimationFrame(frameTick);
    });
  }

  async function animateReels(finalSymbols, reducedMotion) {
    if (reducedMotion) {
      renderSymbols(finalSymbols);
      return;
    }

    await animateSingleReel(reels[0], finalSymbols[0], 500);
    await animateSingleReel(reels[1], finalSymbols[1], 800);
    await animateSingleReel(reels[2], finalSymbols[2], 1100);
  }

  function setBusy(isBusy) {
    spinInProgress = isBusy;
    elements.spinButton.disabled = isBusy;
    elements.spinButton.setAttribute("aria-busy", String(isBusy));
  }

  function renderPaytable(rows) {
    elements.paytableBody.innerHTML = "";

    rows.forEach((row) => {
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

      elements.paytableBody.appendChild(tableRow);
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
  }

  function bindEvents() {
    elements.spinButton.addEventListener("click", () => {
      onSpin();
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

    elements.volumeInput.addEventListener("input", () => {
      onVolumeChange(toNumber(elements.volumeInput.value, 0.4));
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
    renderState,
    renderSpinResult,
    renderAdvisory,
    setMessage,
    setBusy,
    animateReels,
    renderPaytable,
    renderFairness,
    renderAccessibilitySettings,
    renderSoundSettings
  };
}
