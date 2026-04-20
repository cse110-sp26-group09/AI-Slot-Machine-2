/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { REEL_SYMBOLS } from "./reels.js";

function toneClass(prefix, tone) {
  return `${prefix}-${tone}`;
}

export function getUIRefs() {
  return {
    balanceValue: document.getElementById("balanceValue"),
    betValue: document.getElementById("betValue"),
    betInput: document.getElementById("betInput"),
    betDown: document.getElementById("betDown"),
    betUp: document.getElementById("betUp"),
    spinButton: document.getElementById("spinButton"),
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
    lossLimitInput: document.getElementById("lossLimitInput"),
    applyLossLimit: document.getElementById("applyLossLimit"),
    resetSession: document.getElementById("resetSession"),
    rtpValue: document.getElementById("rtpValue")
  };
}

export function renderPaytable(refs, rows) {
  refs.paytableBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const match = document.createElement("td");
    match.textContent = row.match;

    const payout = document.createElement("td");
    payout.textContent = row.payout;

    const notes = document.createElement("td");
    notes.textContent = row.notes;

    tr.append(match, payout, notes);
    refs.paytableBody.appendChild(tr);
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
  refs.betInput.value = String(state.bet);
  refs.lossLimitInput.value = String(state.lossLimit);
  refs.soundToggle.checked = state.settings.soundEnabled;
  refs.accessibilityMode.checked =
    state.settings.highContrast && state.settings.largePrint;
  refs.reducedMotionToggle.checked = state.settings.reducedMotion;
}

export function setSpinEnabled(refs, enabled) {
  refs.spinButton.disabled = !enabled;
}

export function setReelSymbols(refs, symbols) {
  refs.reels.forEach((reel, index) => {
    reel.textContent = symbols[index];
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

export async function animateReels(refs, finalSymbols, options = {}) {
  const reducedMotion = Boolean(options.reducedMotion);
  const onTick = typeof options.onTick === "function" ? options.onTick : null;

  if (reducedMotion) {
    setReelSymbols(refs, finalSymbols);
    await wait(120);
    return;
  }

  const durations = [760, 1060, 1360];
  await Promise.all(
    refs.reels.map((reel, index) =>
      animateSingleReel(reel, finalSymbols[index], durations[index], onTick)
    )
  );
}

function animateSingleReel(reelElement, finalSymbol, duration, onTick) {
  return new Promise((resolve) => {
    const intervalMs = 90;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      const randomIndex = Math.floor(Math.random() * REEL_SYMBOLS.length);
      reelElement.textContent = REEL_SYMBOLS[randomIndex];
      if (onTick) {
        onTick();
      }
      if (elapsed >= duration) {
        clearInterval(timer);
        reelElement.textContent = finalSymbol;
        resolve();
      }
    }, intervalMs);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
