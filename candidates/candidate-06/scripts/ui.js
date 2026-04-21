/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachUiModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  function createUi() {
    const elements = {};

    function byId(id) {
      return global.document.getElementById(id);
    }

    function formatCredits(value) {
      return value.toFixed(2);
    }

    function bindElements() {
      elements.entryScreen = byId("entry-screen");
      elements.ageScreen = byId("age-screen");
      elements.gameScreen = byId("game-screen");

      elements.playButton = byId("play-button");
      elements.verifyAgeButton = byId("verify-age");
      elements.backToEntryButton = byId("back-to-entry");
      elements.birthdateInput = byId("birthdate-input");
      elements.ageMessage = byId("age-message");

      elements.infoModal = byId("info-modal");
      elements.openInfoEntry = byId("open-info-entry");
      elements.openInfoGame = byId("open-info-game");
      elements.closeInfoModal = byId("close-info-modal");

      elements.reels = [byId("reel-0"), byId("reel-1"), byId("reel-2")];
      elements.slotPanel = global.document.querySelector(".slot-panel");
      elements.betInput = byId("bet-input");
      elements.betDecrease = byId("bet-decrease");
      elements.betIncrease = byId("bet-increase");
      elements.spinButton = byId("spin-button");
      elements.leverButton = byId("lever-button");

      elements.outcome = byId("outcome");
      elements.prompt = byId("responsible-message");
      elements.bigWinOverlay = byId("big-win-overlay");
      elements.bigWinTitle = byId("big-win-title");
      elements.bigWinText = byId("big-win-text");

      elements.balanceValue = byId("balance-value");
      elements.currentBetValue = byId("current-bet-value");
      elements.spendValue = byId("spend-value");
      elements.returnedValue = byId("returned-value");
      elements.netValue = byId("net-value");
      elements.spinsValue = byId("spins-value");
      elements.winsValue = byId("wins-value");

      elements.tierValue = byId("tier-value");
      elements.xpValue = byId("xp-value");
      elements.nextTierValue = byId("next-tier-value");
      elements.xpProgress = byId("xp-progress");
      elements.tierProgressText = byId("tier-progress-text");

      elements.startBalanceInput = byId("start-balance-input");
      elements.budgetCapInput = byId("budget-cap-input");
      elements.lossLimitInput = byId("loss-limit-input");
      elements.applyGuardrails = byId("apply-guardrails");
      elements.resetSession = byId("reset-session");
      elements.pauseBanner = byId("pause-banner");

      elements.paytableBody = byId("paytable-body");
      elements.rtpLine = byId("rtp-line");
      elements.oddsLine = byId("odds-line");

      elements.highContrastToggle = byId("toggle-high-contrast");
      elements.largePrintToggle = byId("toggle-large-print");
      elements.reducedMotionToggle = byId("toggle-reduced-motion");

      elements.soundEnabled = byId("sound-enabled");
      elements.volumeInput = byId("volume-input");
    }

    function getSessionInputs() {
      return {
        startingBalance: Number(elements.startBalanceInput.value),
        budgetCap: Number(elements.budgetCapInput.value),
        lossLimit: Number(elements.lossLimitInput.value),
        currentBet: Number(elements.betInput.value)
      };
    }

    function setOutcome(text, tone) {
      elements.outcome.textContent = text;
      elements.outcome.classList.remove("positive", "negative");
      if (tone === "positive") {
        elements.outcome.classList.add("positive");
      }
      if (tone === "negative") {
        elements.outcome.classList.add("negative");
      }
    }

    function setAgeMessage(text, tone) {
      elements.ageMessage.textContent = text;
      elements.ageMessage.classList.remove("positive", "negative");
      if (tone === "positive") {
        elements.ageMessage.classList.add("positive");
      }
      if (tone === "negative") {
        elements.ageMessage.classList.add("negative");
      }
    }

    function setScreen(screenName) {
      const targets = {
        entry: elements.entryScreen,
        age: elements.ageScreen,
        game: elements.gameScreen
      };

      Object.keys(targets).forEach(function (key) {
        targets[key].classList.toggle("active", key === screenName);
      });
    }

    function openInfoModal() {
      elements.infoModal.classList.remove("hidden");
    }

    function closeInfoModal() {
      elements.infoModal.classList.add("hidden");
    }

    function renderPaytable(rows) {
      elements.paytableBody.innerHTML = "";
      rows.forEach(function renderRow(row) {
        const tr = global.document.createElement("tr");

        const symbolCell = global.document.createElement("td");
        symbolCell.innerHTML =
          '<div class="pay-symbol">' +
          '<img src="' +
          row.symbol.icon +
          '" alt="' +
          row.symbol.label +
          ' icon" />' +
          '<span>' +
          row.symbol.code +
          " - " +
          row.symbol.label +
          "</span></div>";

        const tripleCell = global.document.createElement("td");
        tripleCell.textContent = row.triple.toFixed(1) + "x";

        const pairCell = global.document.createElement("td");
        pairCell.textContent = row.pair.toFixed(1) + "x";

        tr.appendChild(symbolCell);
        tr.appendChild(tripleCell);
        tr.appendChild(pairCell);
        elements.paytableBody.appendChild(tr);
      });
    }

    function renderFairness(info) {
      elements.rtpLine.textContent = info.rtpText;
      elements.oddsLine.textContent = info.oddsText;
    }

    function renderReel(index, symbol, isFinal) {
      const reel = elements.reels[index];
      reel.innerHTML =
        '<div class="symbol-image-wrap"><img src="' +
        symbol.icon +
        '" alt="' +
        symbol.label +
        ' symbol" /></div>' +
        '<span class="symbol-code">' +
        symbol.code +
        '</span><span class="symbol-label">' +
        symbol.label +
        "</span>";

      reel.classList.toggle("spinning", !isFinal);
    }

    function showMinorWin() {
      elements.slotPanel.classList.remove("minor-win");
      void elements.slotPanel.offsetWidth;
      elements.slotPanel.classList.add("minor-win");

      global.setTimeout(function () {
        elements.slotPanel.classList.remove("minor-win");
      }, 800);
    }

    function showBigWin(symbolLabel, payout) {
      elements.bigWinTitle.textContent = symbolLabel + " Jackpot!";
      elements.bigWinText.textContent = "Payout: " + payout.toFixed(2) + " credits";
      elements.bigWinOverlay.classList.remove("hidden");

      global.setTimeout(function () {
        elements.bigWinOverlay.classList.add("hidden");
      }, 2400);
    }

    function animateLeverPull() {
      elements.leverButton.classList.remove("pulled");
      void elements.leverButton.offsetWidth;
      elements.leverButton.classList.add("pulled");

      global.setTimeout(function () {
        elements.leverButton.classList.remove("pulled");
      }, 320);
    }

    function renderState(state) {
      const maxAffordableBet = Math.max(state.minBet, Math.floor(state.balance));
      const maxBetValue = Math.max(state.minBet, Math.min(state.maxBet, maxAffordableBet));

      elements.betInput.min = state.minBet;
      elements.betInput.max = maxBetValue;
      elements.betInput.value = state.currentBet;

      elements.balanceValue.textContent = formatCredits(state.balance);
      elements.currentBetValue.textContent = formatCredits(state.currentBet);
      elements.spendValue.textContent = formatCredits(state.totalSpend);
      elements.returnedValue.textContent = formatCredits(state.totalReturned);
      elements.netValue.textContent = formatCredits(state.netResult);
      elements.netValue.classList.toggle("net-positive", state.netResult > 0);
      elements.netValue.classList.toggle("net-negative", state.netResult < 0);

      elements.spinsValue.textContent = String(state.spins);
      elements.winsValue.textContent = String(state.wins);

      elements.tierValue.textContent = state.tier;
      elements.xpValue.textContent = String(state.xp);
      elements.nextTierValue.textContent = state.nextTier;
      elements.xpProgress.style.width = state.tierProgressPercent.toFixed(1) + "%";

      if (state.xpToNextTier > 0) {
        elements.tierProgressText.textContent =
          state.xpToNextTier + " XP to " + state.nextTier;
      } else {
        elements.tierProgressText.textContent = "Top tier reached.";
      }

      elements.startBalanceInput.value = state.startingBalance;
      elements.budgetCapInput.value = state.budgetCap;
      elements.lossLimitInput.value = state.lossLimit;

      const disableSpin = !state.canSpin;
      elements.spinButton.disabled = disableSpin;
      elements.leverButton.disabled = disableSpin;
      elements.betDecrease.disabled = state.isSpinning || state.isPaused;
      elements.betIncrease.disabled = state.isSpinning || state.isPaused;
      elements.betInput.disabled = state.isSpinning || state.isPaused;

      if (state.isPaused) {
        elements.pauseBanner.classList.remove("hidden");
        elements.pauseBanner.textContent = state.pauseReason;
      } else {
        elements.pauseBanner.classList.add("hidden");
        elements.pauseBanner.textContent = "";
      }

      elements.prompt.textContent = state.responsiblePrompt;
    }

    function bindHandlers(handlers) {
      elements.playButton.addEventListener("click", function () {
        handlers.onPlay();
      });

      elements.verifyAgeButton.addEventListener("click", function () {
        handlers.onVerifyAge(elements.birthdateInput.value);
      });

      elements.birthdateInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          handlers.onVerifyAge(elements.birthdateInput.value);
        }
      });

      elements.backToEntryButton.addEventListener("click", function () {
        handlers.onBackToEntry();
      });

      elements.betDecrease.addEventListener("click", function () {
        handlers.onBetDecrease();
      });

      elements.betIncrease.addEventListener("click", function () {
        handlers.onBetIncrease();
      });

      elements.betInput.addEventListener("change", function () {
        handlers.onBetSet(Number(elements.betInput.value));
      });

      elements.spinButton.addEventListener("click", function () {
        handlers.onSpin("button");
      });

      elements.leverButton.addEventListener("click", function () {
        handlers.onSpin("lever");
      });

      elements.applyGuardrails.addEventListener("click", function () {
        handlers.onApplyGuardrails(getSessionInputs());
      });

      elements.resetSession.addEventListener("click", function () {
        handlers.onResetSession(getSessionInputs());
      });

      elements.soundEnabled.addEventListener("change", function () {
        handlers.onSoundEnabled(Boolean(elements.soundEnabled.checked));
      });

      elements.volumeInput.addEventListener("input", function () {
        handlers.onVolumeChange(Number(elements.volumeInput.value));
      });

      elements.openInfoEntry.addEventListener("click", openInfoModal);
      elements.openInfoGame.addEventListener("click", openInfoModal);
      elements.closeInfoModal.addEventListener("click", closeInfoModal);

      elements.infoModal.addEventListener("click", function (event) {
        if (event.target === elements.infoModal) {
          closeInfoModal();
        }
      });

      global.document.addEventListener("keydown", function (event) {
        const isTypingElement =
          event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";

        if (event.code === "Escape") {
          closeInfoModal();
        }

        if (isTypingElement) {
          return;
        }

        if (event.code === "Space" && elements.gameScreen.classList.contains("active")) {
          event.preventDefault();
          handlers.onSpin("keyboard");
        }
      });
    }

    function init(config) {
      bindElements();
      renderPaytable(config.paytableRows);
      renderFairness(config.fairnessInfo);
      bindHandlers(config.handlers);

      elements.volumeInput.value = "45";
      elements.soundEnabled.checked = true;
      setScreen("entry");
      setAgeMessage("", "");
    }

    function getAccessibilityInputs() {
      return {
        highContrastInput: elements.highContrastToggle,
        largePrintInput: elements.largePrintToggle,
        reducedMotionInput: elements.reducedMotionToggle
      };
    }

    return {
      init: init,
      setScreen: setScreen,
      setOutcome: setOutcome,
      setAgeMessage: setAgeMessage,
      renderState: renderState,
      renderReel: renderReel,
      showMinorWin: showMinorWin,
      showBigWin: showBigWin,
      animateLeverPull: animateLeverPull,
      getAccessibilityInputs: getAccessibilityInputs
    };
  }

  SlotApp.UI = {
    createUi: createUi
  };
})(window);
