/**
 * @typedef {{ id: string, label: string, icon: string, weight: number }} SymbolDef
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
 * @param {SymbolDef} symbol
 * @returns {string}
 */
function symbolText(symbol) {
  return `${symbol.icon} ${symbol.label}`;
}

/**
 * @returns {{
 * balanceValue: HTMLElement,
 * betValue: HTMLElement,
 * lastDeltaValue: HTMLElement,
 * totalSpendValue: HTMLElement,
 * totalPayoutValue: HTMLElement,
 * netResultValue: HTMLElement,
 * spinsValue: HTMLElement,
 * spinBtn: HTMLButtonElement,
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
 * reels: HTMLElement[]
 * }}
 */
function getElements() {
  return {
    balanceValue: document.getElementById("balanceValue"),
    betValue: document.getElementById("betValue"),
    lastDeltaValue: document.getElementById("lastDeltaValue"),
    totalSpendValue: document.getElementById("totalSpendValue"),
    totalPayoutValue: document.getElementById("totalPayoutValue"),
    netResultValue: document.getElementById("netResultValue"),
    spinsValue: document.getElementById("spinsValue"),
    spinBtn: document.getElementById("spinBtn"),
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
    reels: [
      document.getElementById("reel0"),
      document.getElementById("reel1"),
      document.getElementById("reel2")
    ]
  };
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

  if (state.isPaused) {
    el.limitStatus.textContent = state.pauseReason;
  }
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ outcomeText: string, outcomeClass: "win" | "neutral" | "loss", responsiblePrompt: string }} outcome
 */
function renderOutcome(el, outcome) {
  el.outcomeMessage.textContent = outcome.outcomeText;
  el.outcomeMessage.classList.remove("win", "neutral", "loss");
  el.outcomeMessage.classList.add(outcome.outcomeClass);

  el.responsibleMessage.textContent = outcome.responsiblePrompt || "";
}

/**
 * @param {ReturnType<typeof getElements>} el
 * @param {{ pattern: string, payout: string }[]} rows
 */
function renderPaytable(el, rows) {
  el.paytableBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const tdPattern = document.createElement("td");
    const tdPayout = document.createElement("td");
    tdPattern.textContent = row.pattern;
    tdPayout.textContent = row.payout;
    tr.append(tdPattern, tdPayout);
    el.paytableBody.appendChild(tr);
  });
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
    el.reels[index].textContent = symbolText(symbol);
    el.reels[index].classList.remove("spinning");
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

  el.reels.forEach((reel) => reel.classList.add("spinning"));

  const interval = setInterval(() => {
    const temporary = randomSpinFn();
    temporary.forEach((symbol, index) => {
      el.reels[index].textContent = symbolText(symbol);
    });
  }, 90);

  const stopDelays = [420, 700, 980];

  await Promise.all(
    finalSymbols.map(
      (symbol, index) =>
        new Promise((resolve) => {
          setTimeout(() => {
            el.reels[index].textContent = symbolText(symbol);
            el.reels[index].classList.remove("spinning");
            onReelStop(index);
            resolve();
          }, stopDelays[index]);
        })
    )
  );

  clearInterval(interval);
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
 * onVolumeChange: (value: number) => void
 * }} handlers
 */
function bindHandlers(el, handlers) {
  el.betDownBtn.addEventListener("click", handlers.onBetDown);
  el.betUpBtn.addEventListener("click", handlers.onBetUp);
  el.spinBtn.addEventListener("click", handlers.onSpin);
  el.addCreditsBtn.addEventListener("click", handlers.onAddCredits);
  el.resetSessionBtn.addEventListener("click", handlers.onResetSession);

  el.betInput.addEventListener("change", () => {
    handlers.onBetInput(Number(el.betInput.value));
  });

  el.applyLimitBtn.addEventListener("click", () => {
    handlers.onApplyLimit(Number(el.lossLimitInput.value));
  });

  el.soundToggle.addEventListener("change", () => {
    handlers.onSoundToggle(el.soundToggle.checked);
  });

  el.volumeInput.addEventListener("input", () => {
    handlers.onVolumeChange(Number(el.volumeInput.value));
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
    setLimitStatus: (message) => {
      el.limitStatus.textContent = message;
    }
  };
}
