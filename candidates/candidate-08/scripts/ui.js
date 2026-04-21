/**
 * @typedef {{ id: string, label: string, icon: string, imagePath: string, weight: number }} SymbolDef
 */

/**
 * @param {number} value
 * @returns {string}
 */
function formatCredits(value) {
  const rounded = Math.round(value);
  return `${new Intl.NumberFormat().format(rounded)} cr`;
}

/**
 * @returns {{
 * entryScreen: HTMLElement,
 * ageGateScreen: HTMLElement,
 * gameScreen: HTMLElement,
 * entryPlayBtn: HTMLButtonElement,
 * entryInfoBtn: HTMLButtonElement,
 * gameplayInfoBtn: HTMLButtonElement,
 * infoModal: HTMLElement,
 * closeInfoBtn: HTMLButtonElement,
 * ageGateForm: HTMLFormElement,
 * birthdateInput: HTMLInputElement,
 * ageGateMessage: HTMLElement,
 * ageBackBtn: HTMLButtonElement,
 * balanceValue: HTMLElement,
 * betValue: HTMLElement,
 * lastDeltaValue: HTMLElement,
 * totalSpendValue: HTMLElement,
 * totalPayoutValue: HTMLElement,
 * netResultValue: HTMLElement,
 * spinsValue: HTMLElement,
 * spinBtn: HTMLButtonElement,
 * leverBtn: HTMLButtonElement,
 * betDownBtn: HTMLButtonElement,
 * betUpBtn: HTMLButtonElement,
 * betInput: HTMLInputElement,
 * addCreditsBtn: HTMLButtonElement,
 * lossLimitInput: HTMLInputElement,
 * applyLimitBtn: HTMLButtonElement,
 * limitStatus: HTMLElement,
 * outcomeMessage: HTMLElement,
 * responsibleMessage: HTMLElement,
 * resetSessionBtn: HTMLButtonElement,
 * paytableBody: HTMLElement,
 * modalPaytableBody: HTMLElement,
 * rtpValue: HTMLElement,
 * rngValue: HTMLElement,
 * fairnessNote: HTMLElement,
 * tierValue: HTMLElement,
 * xpValue: HTMLElement,
 * xpProgressBar: HTMLElement,
 * highContrastToggle: HTMLInputElement,
 * largeTextToggle: HTMLInputElement,
 * reduceMotionToggle: HTMLInputElement,
 * soundToggle: HTMLInputElement,
 * volumeInput: HTMLInputElement,
 * entrySoundToggle: HTMLInputElement,
 * entryVolumeInput: HTMLInputElement,
 * reelsWrap: HTMLElement,
 * reels: HTMLElement[],
 * bigWinOverlay: HTMLElement,
 * bigWinText: HTMLElement
 * }}
 */
function getElements() {
  return {
    entryScreen: document.getElementById("entryScreen"),
    ageGateScreen: document.getElementById("ageGateScreen"),
    gameScreen: document.getElementById("gameScreen"),
    entryPlayBtn: document.getElementById("entryPlayBtn"),
    entryInfoBtn: document.getElementById("entryInfoBtn"),
    gameplayInfoBtn: document.getElementById("gameplayInfoBtn"),
    infoModal: document.getElementById("infoModal"),
    closeInfoBtn: document.getElementById("closeInfoBtn"),
    ageGateForm: document.getElementById("ageGateForm"),
    birthdateInput: document.getElementById("birthdateInput"),
    ageGateMessage: document.getElementById("ageGateMessage"),
    ageBackBtn: document.getElementById("ageBackBtn"),
    balanceValue: document.getElementById("balanceValue"),
    betValue: document.getElementById("betValue"),
    lastDeltaValue: document.getElementById("lastDeltaValue"),
    totalSpendValue: document.getElementById("totalSpendValue"),
    totalPayoutValue: document.getElementById("totalPayoutValue"),
    netResultValue: document.getElementById("netResultValue"),
    spinsValue: document.getElementById("spinsValue"),
    spinBtn: document.getElementById("spinBtn"),
    leverBtn: document.getElementById("leverBtn"),
    betDownBtn: document.getElementById("betDownBtn"),
    betUpBtn: document.getElementById("betUpBtn"),
    betInput: document.getElementById("betInput"),
    addCreditsBtn: document.getElementById("addCreditsBtn"),
    lossLimitInput: document.getElementById("lossLimitInput"),
    applyLimitBtn: document.getElementById("applyLimitBtn"),
    limitStatus: document.getElementById("limitStatus"),
    outcomeMessage: document.getElementById("outcomeMessage"),
    responsibleMessage: document.getElementById("responsibleMessage"),
    resetSessionBtn: document.getElementById("resetSessionBtn"),
    paytableBody: document.querySelector("#paytable tbody"),
    modalPaytableBody: document.querySelector("#modalPaytable tbody"),
    rtpValue: document.getElementById("rtpValue"),
    rngValue: document.getElementById("rngValue"),
    fairnessNote: document.getElementById("fairnessNote"),
    tierValue: document.getElementById("tierValue"),
    xpValue: document.getElementById("xpValue"),
    xpProgressBar: document.getElementById("xpProgressBar"),
    highContrastToggle: document.getElementById("highContrastToggle"),
    largeTextToggle: document.getElementById("largeTextToggle"),
    reduceMotionToggle: document.getElementById("reduceMotionToggle"),
    soundToggle: document.getElementById("soundToggle"),
    volumeInput: document.getElementById("volumeInput"),
    entrySoundToggle: document.getElementById("entrySoundToggle"),
    entryVolumeInput: document.getElementById("entryVolumeInput"),
    reelsWrap: document.getElementById("reelsWrap"),
    reels: [
      document.getElementById("reel0"),
      document.getElementById("reel1"),
      document.getElementById("reel2")
    ],
    bigWinOverlay: document.getElementById("bigWinOverlay"),
    bigWinText: document.getElementById("bigWinText")
  };
}

/**
 * @param {HTMLElement} reelElement
 * @param {SymbolDef} symbol
 */
function renderSymbol(reelElement, symbol) {
  reelElement.innerHTML = "";

  const image = document.createElement("img");
  image.className = "reel-symbol-image";
  image.src = symbol.imagePath;
  image.alt = symbol.label;
  image.loading = "lazy";

  const label = document.createElement("span");
  label.className = "reel-symbol-label";
  label.textContent = `${symbol.icon} ${symbol.label}`;

  reelElement.append(image, label);
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {"entry" | "ageGate" | "game"} screen
 */
function setScreen(el, screen) {
  const mapping = {
    entry: el.entryScreen,
    ageGate: el.ageGateScreen,
    game: el.gameScreen
  };

  Object.values(mapping).forEach((node) => {
    const isActive = node === mapping[screen];
    node.classList.toggle("screen-active", isActive);
    node.setAttribute("aria-hidden", String(!isActive));
  });

  document.body.dataset.screen = screen;
}

/**
 * @param {ReturnType<typeof getElements>} el
 */
function openInfoModal(el) {
  el.infoModal.classList.add("open");
  el.infoModal.setAttribute("aria-hidden", "false");
}

/**
 * @param {ReturnType<typeof getElements>} el
 */
function closeInfoModal(el) {
  el.infoModal.classList.remove("open");
  el.infoModal.setAttribute("aria-hidden", "true");
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ balance: number, bet: number, totalSpend: number, totalPayout: number, netResult: number, spins: number, isPaused: boolean, pauseReason: string, loyalty: { tier: string, currentXp: number, progressPercent: number, nextXp: number | null } }} state
 * @param {number} lastDelta
 */
function renderState(el, state, lastDelta) {
  el.balanceValue.textContent = formatCredits(state.balance);
  el.betValue.textContent = formatCredits(state.bet);
  el.lastDeltaValue.textContent = `${lastDelta >= 0 ? "+" : ""}${lastDelta} cr`;

  el.totalSpendValue.textContent = formatCredits(state.totalSpend);
  el.totalPayoutValue.textContent = formatCredits(state.totalPayout);
  el.netResultValue.textContent = `${state.netResult >= 0 ? "+" : ""}${state.netResult} cr`;
  el.spinsValue.textContent = String(state.spins);

  el.tierValue.textContent = state.loyalty.tier;
  if (state.loyalty.nextXp === null) {
    el.xpValue.textContent = `${state.loyalty.currentXp} XP (Max Tier)`;
  } else {
    el.xpValue.textContent = `${state.loyalty.currentXp} / ${state.loyalty.nextXp} XP`;
  }
  el.xpProgressBar.style.width = `${state.loyalty.progressPercent.toFixed(1)}%`;

  el.betInput.value = String(state.bet);
  el.spinBtn.disabled = state.isPaused;
  el.leverBtn.disabled = state.isPaused;

  if (state.isPaused) {
    el.limitStatus.textContent = state.pauseReason;
  }
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ outcomeText: string, outcomeClass: "win" | "neutral" | "loss", responsiblePrompt: string, isMajorWin?: boolean }} outcome
 */
function renderOutcome(el, outcome) {
  el.outcomeMessage.textContent = outcome.outcomeText;
  el.outcomeMessage.classList.remove("win", "neutral", "loss", "big-win");
  el.outcomeMessage.classList.add(outcome.outcomeClass);
  if (outcome.isMajorWin) {
    el.outcomeMessage.classList.add("big-win");
  }
  el.responsibleMessage.textContent = outcome.responsiblePrompt || "";

  el.reelsWrap.classList.remove("result-win", "result-loss");
  void el.reelsWrap.offsetWidth;
  if (outcome.outcomeClass === "win") {
    el.reelsWrap.classList.add("result-win");
  } else if (outcome.outcomeClass === "loss") {
    el.reelsWrap.classList.add("result-loss");
  }
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ pattern: string, payout: string }[]} rows
 */
function renderPaytable(el, rows) {
  const renderRows = (tbody) => {
    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const tdPattern = document.createElement("td");
      const tdPayout = document.createElement("td");
      tdPattern.textContent = row.pattern;
      tdPayout.textContent = row.payout;
      tr.append(tdPattern, tdPayout);
      tbody.appendChild(tr);
    });
  };

  renderRows(el.paytableBody);
  renderRows(el.modalPaytableBody);
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ rtp: number, rngText: string, note: string }} fairness
 */
function renderFairness(el, fairness) {
  el.rtpValue.textContent = `Theoretical RTP: ${fairness.rtp.toFixed(2)}% (long-run average; short sessions vary).`;
  el.rngValue.textContent = fairness.rngText;
  el.fairnessNote.textContent = fairness.note;
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {SymbolDef[]} symbols
 */
function renderReelsImmediately(el, symbols) {
  symbols.forEach((symbol, index) => {
    renderSymbol(el.reels[index], symbol);
    el.reels[index].classList.remove("spinning");
  });
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ reduceMotion: boolean }} settings
 * @returns {Promise<void>}
 */
function animateLever(el, settings) {
  if (settings.reduceMotion) {
    return Promise.resolve();
  }

  el.leverBtn.classList.add("pull-down");
  return new Promise((resolve) => {
    setTimeout(() => {
      el.leverBtn.classList.remove("pull-down");
      el.leverBtn.classList.add("return-up");
      setTimeout(() => {
        el.leverBtn.classList.remove("return-up");
        resolve();
      }, 220);
    }, 220);
  });
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {() => SymbolDef[]} randomSpinFn
 * @param {SymbolDef[]} finalSymbols
 * @param {{ reduceMotion: boolean }} settings
 * @param {(index: number) => void} onReelStop
 * @returns {Promise<void>}
 */
async function animateSpin(el, randomSpinFn, finalSymbols, settings, onReelStop) {
  if (settings.reduceMotion) {
    renderReelsImmediately(el, finalSymbols);
    finalSymbols.forEach((_, index) => onReelStop(index));
    return;
  }

  el.reelsWrap.classList.add("spin-active");
  el.reels.forEach((reel) => reel.classList.add("spinning"));

  const interval = setInterval(() => {
    const temporary = randomSpinFn();
    temporary.forEach((symbol, index) => renderSymbol(el.reels[index], symbol));
  }, 95);

  const stopDelays = [500, 790, 1080];

  await Promise.all(
    finalSymbols.map(
      (symbol, index) =>
        new Promise((resolve) => {
          setTimeout(() => {
            renderSymbol(el.reels[index], symbol);
            el.reels[index].classList.remove("spinning");
            onReelStop(index);
            resolve();
          }, stopDelays[index]);
        })
    )
  );

  clearInterval(interval);
  el.reelsWrap.classList.remove("spin-active");
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {string} message
 * @param {"error" | "success" | "neutral"} tone
 */
function setAgeFeedback(el, message, tone = "neutral") {
  el.ageGateMessage.textContent = message;
  el.ageGateMessage.classList.remove("age-error", "age-success", "age-neutral");
  el.ageGateMessage.classList.add(`age-${tone}`);
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {boolean} enabled
 * @param {number} volume
 */
function setSoundState(el, enabled, volume) {
  el.soundToggle.checked = enabled;
  el.entrySoundToggle.checked = enabled;
  el.volumeInput.value = String(volume);
  el.entryVolumeInput.value = String(volume);
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {string} message
 * @returns {Promise<void>}
 */
function showBigWinOverlay(el, message) {
  el.bigWinText.textContent = message;
  el.bigWinOverlay.setAttribute("aria-hidden", "false");
  el.bigWinOverlay.classList.add("active");
  return new Promise((resolve) => {
    setTimeout(() => {
      el.bigWinOverlay.classList.remove("active");
      el.bigWinOverlay.setAttribute("aria-hidden", "true");
      resolve();
    }, 2400);
  });
}

/**
 * @param {{
 * onBetDown: () => void,
 * onBetUp: () => void,
 * onBetInput: (value: number) => void,
 * onSpin: () => void,
 * onAddCredits: () => void,
 * onApplyLimit: (value: number) => void,
 * onResetSession: () => void,
 * onSoundToggle: (enabled: boolean) => void,
 * onVolumeChange: (value: number) => void,
 * onPlay: () => void,
 * onInfoOpen: () => void,
 * onInfoClose: () => void,
 * onAgeBack: () => void,
 * onVerifyAge: (birthDate: string) => void
 * }} handlers
 */
function bindHandlers(el, handlers) {
  el.betDownBtn.addEventListener("click", handlers.onBetDown);
  el.betUpBtn.addEventListener("click", handlers.onBetUp);
  el.spinBtn.addEventListener("click", handlers.onSpin);
  el.leverBtn.addEventListener("click", handlers.onSpin);
  el.addCreditsBtn.addEventListener("click", handlers.onAddCredits);
  el.resetSessionBtn.addEventListener("click", handlers.onResetSession);
  el.entryPlayBtn.addEventListener("click", handlers.onPlay);
  el.entryInfoBtn.addEventListener("click", handlers.onInfoOpen);
  el.gameplayInfoBtn.addEventListener("click", handlers.onInfoOpen);
  el.closeInfoBtn.addEventListener("click", handlers.onInfoClose);
  el.ageBackBtn.addEventListener("click", handlers.onAgeBack);

  el.betInput.addEventListener("change", () => {
    handlers.onBetInput(Number(el.betInput.value));
  });

  el.applyLimitBtn.addEventListener("click", () => {
    handlers.onApplyLimit(Number(el.lossLimitInput.value));
  });

  el.soundToggle.addEventListener("change", () => {
    handlers.onSoundToggle(el.soundToggle.checked);
  });
  el.entrySoundToggle.addEventListener("change", () => {
    handlers.onSoundToggle(el.entrySoundToggle.checked);
  });

  el.volumeInput.addEventListener("input", () => {
    handlers.onVolumeChange(Number(el.volumeInput.value));
  });
  el.entryVolumeInput.addEventListener("input", () => {
    handlers.onVolumeChange(Number(el.entryVolumeInput.value));
  });

  el.ageGateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onVerifyAge(el.birthdateInput.value.trim());
  });

  el.infoModal.addEventListener("click", (event) => {
    if (event.target === el.infoModal) {
      handlers.onInfoClose();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.infoModal.classList.contains("open")) {
      handlers.onInfoClose();
    }
  });
}

export function createUiController() {
  const el = getElements();

  return {
    elements: el,
    bind: (handlers) => bindHandlers(el, handlers),
    renderState: (state, lastDelta = 0) => renderState(el, state, lastDelta),
    renderOutcome: (outcome) => renderOutcome(el, outcome),
    renderPaytable: (rows) => renderPaytable(el, rows),
    renderFairness: (fairness) => renderFairness(el, fairness),
    renderReelsImmediately: (symbols) => renderReelsImmediately(el, symbols),
    animateSpin: (randomSpinFn, finalSymbols, settings, onReelStop) =>
      animateSpin(el, randomSpinFn, finalSymbols, settings, onReelStop),
    animateLever: (settings) => animateLever(el, settings),
    setScreen: (screen) => setScreen(el, screen),
    openInfoModal: () => openInfoModal(el),
    closeInfoModal: () => closeInfoModal(el),
    setAgeFeedback: (message, tone) => setAgeFeedback(el, message, tone),
    clearAgeFeedback: () => setAgeFeedback(el, "", "neutral"),
    setSoundState: (enabled, volume) => setSoundState(el, enabled, volume),
    setBetBounds: (minBet, maxBet) => {
      el.betInput.min = String(minBet);
      el.betInput.max = String(maxBet);
    },
    showBigWinOverlay: (message) => showBigWinOverlay(el, message),
    setLimitStatus: (message) => {
      el.limitStatus.textContent = message;
    }
  };
}
