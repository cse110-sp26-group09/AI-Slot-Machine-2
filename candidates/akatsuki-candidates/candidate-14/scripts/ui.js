/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import {
  DEFAULT_BET,
  MAX_BET,
  MIN_BET,
  PAYTABLE_RULES,
  SYMBOLS,
  formatTokens,
  getRtpEstimate
} from "./payouts.js";

const symbolMap = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));

function getSymbolIcon(symbolId) {
  return symbolMap.get(symbolId)?.icon || "";
}

function getSymbolLabel(symbolId) {
  return symbolMap.get(symbolId)?.label || "Unknown";
}

function patternToReadable(pattern) {
  const [first, second, third] = pattern;
  if (third === "any") {
    return `${getSymbolLabel(first)} ${getSymbolLabel(second)} + any`;
  }
  return `${getSymbolLabel(first)} ${getSymbolLabel(second)} ${getSymbolLabel(third)}`;
}

function setNetClass(element, netValue) {
  element.classList.remove("positive", "negative", "neutral");
  if (netValue > 0) {
    element.classList.add("positive");
    return;
  }
  if (netValue < 0) {
    element.classList.add("negative");
    return;
  }
  element.classList.add("neutral");
}

export function createUI(callbacks) {
  const reelElements = [0, 1, 2].map((index) => document.getElementById(`reel-${index}`));

  const elements = {
    machine: document.querySelector(".machine"),
    balanceValue: document.getElementById("balance-value"),
    spentValue: document.getElementById("spent-value"),
    wonValue: document.getElementById("won-value"),
    netValue: document.getElementById("net-value"),
    status: document.getElementById("session-status"),
    lossProgress: document.getElementById("loss-progress"),
    betValue: document.getElementById("bet-value"),
    betRange: document.getElementById("bet-range"),
    betDownButton: document.getElementById("bet-down-button"),
    betUpButton: document.getElementById("bet-up-button"),
    leverButton: document.getElementById("lever-button"),
    outcomeMessage: document.getElementById("outcome-message"),
    outcomeDetail: document.getElementById("outcome-detail"),
    responsiblePrompt: document.getElementById("responsible-prompt"),
    lossLimitInput: document.getElementById("loss-limit-input"),
    dailyStatus: document.getElementById("daily-status"),
    dailyClaimButton: document.getElementById("daily-claim-button"),
    loyaltyTier: document.getElementById("loyalty-tier"),
    loyaltyPoints: document.getElementById("loyalty-points"),
    loyaltyProgressFill: document.getElementById("loyalty-progress-fill"),
    highContrastToggle: document.getElementById("high-contrast-toggle"),
    largeTextToggle: document.getElementById("large-text-toggle"),
    soundToggle: document.getElementById("sound-toggle"),
    soundVolume: document.getElementById("sound-volume"),
    paytableBody: document.getElementById("paytable-body"),
    infoPaytableBody: document.getElementById("info-paytable-body"),
    rtpValue: document.getElementById("rtp-value"),
    newSessionButton: document.getElementById("new-session-button"),
    majorWinOverlay: document.getElementById("major-win-overlay"),
    majorWinClose: document.getElementById("major-win-close"),
    majorWinMessage: document.getElementById("major-win-message")
  };

  let spinInProgress = false;

  function updateReel(reelIndex, symbolId, spinning = false) {
    const reel = reelElements[reelIndex];
    if (!reel) {
      return;
    }
    const icon = reel.querySelector(".reel-icon");
    const label = reel.querySelector(".reel-label");
    if (icon) {
      icon.src = getSymbolIcon(symbolId);
      icon.alt = `${getSymbolLabel(symbolId)} symbol`;
    }
    if (label) {
      label.textContent = getSymbolLabel(symbolId);
    }
    reel.classList.toggle("spinning", spinning);
  }

  function markReelStopped(reelIndex) {
    const reel = reelElements[reelIndex];
    if (!reel) {
      return;
    }
    reel.classList.remove("spinning");
    reel.classList.add("stopped");
    window.setTimeout(() => reel.classList.remove("stopped"), 260);
  }

  function appendPaytableRows(tableBody) {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = "";
    for (const rule of PAYTABLE_RULES) {
      const row = document.createElement("tr");
      const comboCell = document.createElement("td");
      const multiplierCell = document.createElement("td");
      const notesCell = document.createElement("td");

      comboCell.textContent = `${patternToReadable(rule.pattern)} (${rule.label})`;
      multiplierCell.textContent = `${rule.multiplier}x`;
      notesCell.textContent = rule.notes;

      row.appendChild(comboCell);
      row.appendChild(multiplierCell);
      row.appendChild(notesCell);
      tableBody.appendChild(row);
    }
  }

  function renderPaytable() {
    appendPaytableRows(elements.paytableBody);
    appendPaytableRows(elements.infoPaytableBody);

    const rtp = getRtpEstimate();
    if (elements.rtpValue) {
      elements.rtpValue.textContent = `Estimated RTP: ${rtp.rtpPercent}% (house edge ${rtp.houseEdgePercent}%). RTP reflects long-run averages, not short sessions.`;
    }
  }

  function renderOutcome(viewModel) {
    if (!viewModel.lastOutcome) {
      elements.outcomeMessage.textContent = "Choose a bet and pull the lever.";
      elements.outcomeDetail.textContent = "Payout details appear here.";
      return;
    }
    elements.outcomeMessage.textContent = viewModel.lastOutcome.resultMessage || "Spin settled.";
    elements.outcomeDetail.textContent = viewModel.lastOutcome.detailMessage || "";
  }

  function render(viewModel) {
    elements.balanceValue.textContent = formatTokens(viewModel.balance);
    elements.spentValue.textContent = formatTokens(viewModel.totalSpent);
    elements.wonValue.textContent = formatTokens(viewModel.totalWon);
    elements.netValue.textContent = formatTokens(viewModel.net);
    setNetClass(elements.netValue, viewModel.net);

    elements.betValue.textContent = formatTokens(viewModel.currentBet);
    elements.betRange.value = String(viewModel.currentBet);
    elements.lossLimitInput.value = String(viewModel.lossLimit);

    const controlsDisabled = spinInProgress || viewModel.pendingBet !== null;
    const spinDisabled = controlsDisabled || !viewModel.canSpin;

    elements.leverButton.disabled = spinDisabled;
    elements.betDownButton.disabled = controlsDisabled || viewModel.currentBet <= MIN_BET;
    elements.betUpButton.disabled = controlsDisabled || viewModel.currentBet >= MAX_BET;
    elements.betRange.disabled = controlsDisabled;
    elements.lossLimitInput.disabled = controlsDisabled;
    elements.newSessionButton.disabled = controlsDisabled;

    elements.status.textContent = viewModel.canSpin ? "Ready" : "Paused";
    elements.status.classList.toggle("paused", !viewModel.canSpin);
    elements.lossProgress.textContent = `Loss limit progress: ${Math.round(viewModel.lossProgress * 100)}% (${formatTokens(
      viewModel.lossAmount
    )}/${formatTokens(viewModel.lossLimit)})`;

    for (let index = 0; index < reelElements.length; index += 1) {
      const reelId = viewModel.currentReels[index];
      updateReel(index, reelId, spinInProgress);
    }

    elements.dailyClaimButton.disabled = !viewModel.canClaimDaily || controlsDisabled;
    elements.dailyStatus.textContent = viewModel.canClaimDaily
      ? `Streak ${viewModel.daily.streak}. Daily claim ready.`
      : `Claimed today. Current streak: ${viewModel.daily.streak}.`;

    elements.loyaltyTier.textContent = `Tier: ${viewModel.loyaltyTier}`;
    elements.loyaltyPoints.textContent = `Points: ${formatTokens(viewModel.loyaltyPoints)} | Next: ${viewModel.nextTierName}`;
    elements.loyaltyProgressFill.style.width = `${Math.round(viewModel.tierProgress * 100)}%`;

    elements.highContrastToggle.checked = Boolean(viewModel.settings.highContrast);
    elements.largeTextToggle.checked = Boolean(viewModel.settings.largeText);
    elements.soundToggle.checked = Boolean(viewModel.settings.soundEnabled);
    elements.soundVolume.value = String(Math.round(viewModel.settings.soundVolume * 100));

    renderOutcome(viewModel);
    elements.responsiblePrompt.textContent = viewModel.responsiblePrompt || "";

    if (!viewModel.canSpin && viewModel.spinBlockReason) {
      elements.outcomeDetail.textContent = viewModel.spinBlockReason;
    }
  }

  function setSpinInProgress(value) {
    spinInProgress = Boolean(value);
    elements.leverButton.classList.toggle("pulling", spinInProgress);
  }

  function hideMajorWinOverlay() {
    if (!elements.majorWinOverlay) {
      return;
    }
    elements.majorWinOverlay.hidden = true;
  }

  function playOutcomeEffects(outcome) {
    if (!outcome || !elements.machine) {
      return;
    }

    const isMajorWin = Boolean(outcome.isJackpot || outcome.multiplier >= 45);

    if (outcome.isWin) {
      elements.machine.classList.add("win-feedback");
      window.setTimeout(() => {
        elements.machine.classList.remove("win-feedback");
      }, 520);
    }

    if (isMajorWin) {
      elements.machine.classList.add("jackpot-feedback");
      window.setTimeout(() => {
        elements.machine.classList.remove("jackpot-feedback");
      }, 2700);

      if (elements.majorWinOverlay && elements.majorWinMessage) {
        elements.majorWinMessage.textContent = `${outcome.resultMessage} +${formatTokens(outcome.payout)} payout.`;
        elements.majorWinOverlay.hidden = false;
      }
    }
  }

  elements.leverButton.addEventListener("click", () => {
    callbacks.onSpin();
  });

  elements.betDownButton.addEventListener("click", () => {
    callbacks.onBetShift("down");
  });

  elements.betUpButton.addEventListener("click", () => {
    callbacks.onBetShift("up");
  });

  elements.betRange.addEventListener("input", (event) => {
    callbacks.onBetSet(Number(event.target.value || DEFAULT_BET));
  });

  elements.lossLimitInput.addEventListener("change", (event) => {
    callbacks.onLossLimitSet(Number(event.target.value));
  });

  elements.dailyClaimButton.addEventListener("click", () => {
    callbacks.onDailyClaim();
  });

  elements.newSessionButton.addEventListener("click", () => {
    callbacks.onNewSession();
  });

  elements.highContrastToggle.addEventListener("change", (event) => {
    callbacks.onSettingChange("highContrast", event.target.checked);
  });

  elements.largeTextToggle.addEventListener("change", (event) => {
    callbacks.onSettingChange("largeText", event.target.checked);
  });

  elements.soundToggle.addEventListener("change", (event) => {
    callbacks.onSettingChange("soundEnabled", event.target.checked);
  });

  elements.soundVolume.addEventListener("input", (event) => {
    callbacks.onSettingChange("soundVolume", Number(event.target.value) / 100);
  });

  if (elements.majorWinClose) {
    elements.majorWinClose.addEventListener("click", hideMajorWinOverlay);
  }
  if (elements.majorWinOverlay) {
    elements.majorWinOverlay.addEventListener("click", (event) => {
      if (event.target === elements.majorWinOverlay) {
        hideMajorWinOverlay();
      }
    });
  }

  renderPaytable();

  return {
    render,
    setSpinInProgress,
    updateReel,
    markReelStopped,
    playOutcomeEffects,
    hideMajorWinOverlay
  };
}
