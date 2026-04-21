/**
 * @fileoverview DOM rendering and UI effects.
 */

import { REEL_SYMBOLS, SYMBOL_META } from "./reels.js";

function toneClass(prefix, tone) {
  return `${prefix}-${tone}`;
}

function renderReelSymbol(reelElement, symbol) {
  const meta = SYMBOL_META[symbol] || { label: symbol, icon: "" };
  reelElement.replaceChildren();

  if (meta.icon) {
    const image = document.createElement("img");
    image.src = meta.icon;
    image.alt = meta.label;
    image.className = "reel-symbol-img";
    reelElement.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.textContent = meta.label;
    reelElement.appendChild(fallback);
  }

  reelElement.setAttribute("aria-label", meta.label);
  reelElement.dataset.symbol = symbol;
}

export function getUIRefs() {
  return {
    entryScreen: document.getElementById("entryScreen"),
    ageGateScreen: document.getElementById("ageGateScreen"),
    gameScreen: document.getElementById("gameScreen"),
    playButton: document.getElementById("playButton"),
    backToEntry: document.getElementById("backToEntry"),
    ageGateForm: document.getElementById("ageGateForm"),
    dobInput: document.getElementById("dobInput"),
    ageGateMessage: document.getElementById("ageGateMessage"),
    openInfoButton: document.getElementById("openInfoButton"),
    openInfoInGame: document.getElementById("openInfoInGame"),
    closeInfoButton: document.getElementById("closeInfoButton"),
    closeInfoBackdrop: document.getElementById("closeInfoBackdrop"),
    infoModal: document.getElementById("infoModal"),
    infoPaytableBody: document.getElementById("infoPaytableBody"),
    bigWinOverlay: document.getElementById("bigWinOverlay"),
    bigWinText: document.getElementById("bigWinText"),
    bigWinParticles: document.getElementById("bigWinParticles"),
    slotMachineShell: document.querySelector(".slot-machine-shell"),
    balanceValue: document.getElementById("balanceValue"),
    betValue: document.getElementById("betValue"),
    betInput: document.getElementById("betInput"),
    betDown: document.getElementById("betDown"),
    betUp: document.getElementById("betUp"),
    spinButton: document.getElementById("spinButton"),
    leverSpin: document.getElementById("leverSpin"),
    reels: [
      document.getElementById("reel0"),
      document.getElementById("reel1"),
      document.getElementById("reel2")
    ],
    outcomeText: document.getElementById("outcomeText"),
    responsiblePrompt: document.getElementById("responsiblePrompt"),
    paytableBody: document.getElementById("paytableBody"),
    summaryNet: document.getElementById("summaryNet"),
    summarySpent: document.getElementById("summarySpent"),
    summaryWon: document.getElementById("summaryWon"),
    summaryLoss: document.getElementById("summaryLoss"),
    summarySpins: document.getElementById("summarySpins"),
    summaryWinRate: document.getElementById("summaryWinRate"),
    summaryLoyalty: document.getElementById("summaryLoyalty"),
    summaryDaily: document.getElementById("summaryDaily"),
    summaryLimit: document.getElementById("summaryLimit"),
    accessibilityMode: document.getElementById("accessibilityMode"),
    reducedMotionToggle: document.getElementById("reducedMotionToggle"),
    soundToggle: document.getElementById("soundToggle"),
    entrySoundToggle: document.getElementById("entrySoundToggle"),
    volumeControl: document.getElementById("volumeControl"),
    entryVolumeControl: document.getElementById("entryVolumeControl"),
    lossLimitInput: document.getElementById("lossLimitInput"),
    applyLossLimit: document.getElementById("applyLossLimit"),
    resetSession: document.getElementById("resetSession"),
    rtpValue: document.getElementById("rtpValue")
  };
}

export function showScreen(refs, screenName) {
  refs.entryScreen.classList.toggle("is-active", screenName === "entry");
  refs.ageGateScreen.classList.toggle("is-active", screenName === "age");
  refs.gameScreen.classList.toggle("is-active", screenName === "game");
}

export function setModalOpen(refs, isOpen) {
  refs.infoModal.hidden = !isOpen;
}

export function renderPaytable(refs, rows) {
  [refs.paytableBody, refs.infoPaytableBody].forEach((tbody) => {
    if (!tbody) {
      return;
    }
    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const match = document.createElement("td");
      match.textContent = row.match;

      const payout = document.createElement("td");
      payout.textContent = row.payout;

      const notes = document.createElement("td");
      notes.textContent = row.notes;

      tr.append(match, payout, notes);
      tbody.appendChild(tr);
    });
  });
}

export function renderSummary(refs, state, summary) {
  refs.balanceValue.textContent = `${state.balance} tokens`;
  refs.betValue.textContent = `${state.bet} tokens`;
  refs.summaryNet.textContent = `${summary.net >= 0 ? "+" : ""}${summary.net} tokens`;
  refs.summaryNet.classList.toggle("positive", summary.net > 0);
  refs.summaryNet.classList.toggle("negative", summary.net < 0);
  refs.summarySpent.textContent = `${state.totalSpent} tokens`;
  refs.summaryWon.textContent = `${state.totalWon} tokens`;
  refs.summaryLoss.textContent = `${summary.loss} tokens`;
  refs.summarySpins.textContent = `${state.spins}`;
  refs.summaryWinRate.textContent = `${summary.winRate}%`;
  refs.summaryLoyalty.textContent = `${state.loyaltyLevel}`;
  refs.summaryDaily.textContent = state.lastDailyRewardDate
    ? `${state.lastDailyRewardDate} (streak ${state.dailyRewardStreak})`
    : "Not claimed";
  refs.summaryLimit.textContent = state.lossLimit > 0 ? `${state.lossLimit} tokens` : "Off";
}

export function syncControls(refs, state) {
  const volume = Math.round(state.settings.volume * 100);

  refs.betInput.value = String(state.bet);
  refs.lossLimitInput.value = String(state.lossLimit);
  refs.soundToggle.checked = state.settings.soundEnabled;
  refs.entrySoundToggle.checked = state.settings.soundEnabled;
  refs.volumeControl.value = String(volume);
  refs.entryVolumeControl.value = String(volume);
  refs.accessibilityMode.checked =
    state.settings.highContrast && state.settings.largePrint;
  refs.reducedMotionToggle.checked = state.settings.reducedMotion;
}

export function setSpinEnabled(refs, enabled) {
  refs.spinButton.disabled = !enabled;
  refs.leverSpin.disabled = !enabled;
}

export function setReelSymbols(refs, symbols) {
  refs.reels.forEach((reel, index) => {
    renderReelSymbol(reel, symbols[index]);
  });
}

export function markReelsAsWin(refs, isWin) {
  refs.reels.forEach((reel) => {
    reel.classList.toggle("win", isWin);
  });
}

export function setOutcome(refs, text, tone = "neutral") {
  refs.outcomeText.className = `outcome ${toneClass("outcome", tone)}`;
  refs.outcomeText.textContent = text;
}

export function setResponsiblePrompt(refs, text, tone = "neutral") {
  refs.responsiblePrompt.className = `responsible ${toneClass("responsible", tone)}`;
  refs.responsiblePrompt.textContent = text;
}

export function setRtp(refs, rtp) {
  refs.rtpValue.textContent = `${rtp.toFixed(1)}%`;
}

export function pulseMachine(refs) {
  refs.slotMachineShell.classList.remove("machine-pulse");
  void refs.slotMachineShell.offsetWidth;
  refs.slotMachineShell.classList.add("machine-pulse");
}

export function animateLever(refs) {
  refs.leverSpin.classList.remove("is-pulled");
  void refs.leverSpin.offsetWidth;
  refs.leverSpin.classList.add("is-pulled");

  setTimeout(() => {
    refs.leverSpin.classList.remove("is-pulled");
  }, 260);
}

export function showBigWinOverlay(refs, text, options = {}) {
  refs.bigWinText.textContent = text;
  refs.bigWinOverlay.hidden = false;

  if (options.reducedMotion) {
    return;
  }

  refs.bigWinParticles.replaceChildren();
  for (let i = 0; i < 22; i += 1) {
    const particle = document.createElement("span");
    particle.className = "win-particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 0.6}s`;
    refs.bigWinParticles.appendChild(particle);
  }
}

export function hideBigWinOverlay(refs) {
  refs.bigWinOverlay.hidden = true;
  refs.bigWinParticles.replaceChildren();
}

export async function animateReels(refs, finalSymbols, options = {}) {
  const reducedMotion = Boolean(options.reducedMotion);

  if (reducedMotion) {
    setReelSymbols(refs, finalSymbols);
    await wait(120);
    return;
  }

  const durations = [760, 1080, 1380];
  await Promise.all(
    refs.reels.map((reel, index) =>
      animateSingleReel(reel, finalSymbols[index], durations[index])
    )
  );
}

function animateSingleReel(reelElement, finalSymbol, duration) {
  return new Promise((resolve) => {
    const intervalMs = 88;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      const randomIndex = Math.floor(Math.random() * REEL_SYMBOLS.length);
      renderReelSymbol(reelElement, REEL_SYMBOLS[randomIndex]);

      if (elapsed >= duration) {
        clearInterval(timer);
        renderReelSymbol(reelElement, finalSymbol);
        resolve();
      }
    }, intervalMs);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
