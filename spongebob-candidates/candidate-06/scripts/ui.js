/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachUiModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});
  const HISTORY_COLLAPSE_KEY = "slot_history_collapsed_v1";

  function createUi() {
    const elements = {};
    let winEffectResetTimer = 0;
    let spinControlMode = "idle";
    let overlayDismissHandler = null;
    let historyCollapsed = false;

    function byId(id) {
      return global.document.getElementById(id);
    }

    function formatCredits(value) {
      return Number(value).toFixed(2);
    }

    function formatSigned(value) {
      const number = Number(value);
      const sign = number > 0 ? "+" : "";
      return sign + number.toFixed(2);
    }

    function safeReadHistoryCollapsed() {
      try {
        return global.localStorage.getItem(HISTORY_COLLAPSE_KEY) === "1";
      } catch (error) {
        return false;
      }
    }

    function safeWriteHistoryCollapsed(isCollapsed) {
      try {
        global.localStorage.setItem(HISTORY_COLLAPSE_KEY, isCollapsed ? "1" : "0");
      } catch (error) {
        // Ignore storage failures in restricted browser contexts.
      }
    }

    function bindElements() {
      elements.loadingScreen = byId("loading-screen");
      elements.loadingFill = byId("loading-fill");
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
      elements.backHomeGame = byId("back-home-game");
      elements.closeInfoModal = byId("close-info-modal");

      elements.reels = [byId("reel-0"), byId("reel-1"), byId("reel-2")];
      elements.slotPanel = global.document.querySelector(".slot-panel");
      elements.betInput = byId("bet-input");
      elements.betDecrease = byId("bet-decrease");
      elements.betIncrease = byId("bet-increase");
      elements.spinButton = byId("spin-button");
      elements.paylineText = byId("payline-text");

      elements.outcome = byId("outcome");
      elements.prompt = byId("responsible-message");
      elements.bigWinOverlay = byId("big-win-overlay");
      elements.bigWinTitle = byId("big-win-title");
      elements.bigWinText = byId("big-win-text");
      elements.bigWinDismiss = byId("big-win-dismiss");

      elements.balanceValue = byId("balance-value");
      elements.currentBetValue = byId("current-bet-value");
      elements.spendValue = byId("spend-value");
      elements.returnedValue = byId("returned-value");
      elements.netValue = byId("net-value");
      elements.spinsValue = byId("spins-value");
      elements.winsValue = byId("wins-value");

      elements.ribbonSpun = byId("ribbon-spun");
      elements.ribbonWon = byId("ribbon-won");
      elements.ribbonNet = byId("ribbon-net");

      elements.tierValue = byId("tier-value");
      elements.xpValue = byId("xp-value");
      elements.nextTierValue = byId("next-tier-value");
      elements.xpProgress = byId("xp-progress");
      elements.tierProgressText = byId("tier-progress-text");

      elements.historyToggle = byId("history-toggle");
      elements.historyCount = byId("history-count");
      elements.historyContent = byId("history-content");
      elements.historyBody = byId("history-body");

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

    function waitMs(ms) {
      return new Promise(function (resolve) {
        global.setTimeout(resolve, ms);
      });
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
      elements.outcome.classList.remove("positive", "negative", "anticipation");
      if (tone === "positive") {
        elements.outcome.classList.add("positive");
      } else if (tone === "negative") {
        elements.outcome.classList.add("negative");
      } else if (tone === "anticipation") {
        elements.outcome.classList.add("anticipation");
      }
    }

    function setPaylineText(text, tone) {
      elements.paylineText.textContent = text;
      elements.paylineText.classList.remove("loss-glow", "small-glow", "anticipation");
      if (tone === "loss") {
        elements.paylineText.classList.add("loss-glow");
      } else if (tone === "small") {
        elements.paylineText.classList.add("small-glow");
      } else if (tone === "anticipation") {
        elements.paylineText.classList.add("anticipation");
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
        loading: elements.loadingScreen,
        entry: elements.entryScreen,
        age: elements.ageScreen,
        game: elements.gameScreen
      };

      Object.keys(targets).forEach(function (key) {
        const element = targets[key];
        if (!element) {
          return;
        }
        element.classList.toggle("active", key === screenName);
      });
    }

    function playLoadingSequence(durationMs) {
      const totalMs = Math.max(300, Number(durationMs) || 1400);
      setScreen("loading");

      return new Promise(function (resolve) {
        const start = global.performance.now();

        function frame(now) {
          const progress = Math.min((now - start) / totalMs, 1);
          elements.loadingFill.style.width = (progress * 100).toFixed(1) + "%";
          if (progress >= 1) {
            resolve();
            return;
          }
          global.requestAnimationFrame(frame);
        }

        elements.loadingFill.style.width = "0%";
        global.requestAnimationFrame(frame);
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

    function renderReel(index, symbol, isFinal, motion) {
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

      reel.classList.remove("spin-fast", "spin-steady", "spin-slow", "locked-thud");
      if (!isFinal) {
        reel.classList.add("spinning");
        if (motion && motion.stage) {
          reel.classList.add("spin-" + motion.stage);
        }
      } else {
        reel.classList.remove("spinning");
        reel.classList.add("locked-thud");
        global.setTimeout(function () {
          reel.classList.remove("locked-thud");
        }, 240);
      }
    }

    function removeParticles() {
      const particles = elements.slotPanel.querySelectorAll(".spin-bubble, .coin-burst");
      particles.forEach(function (particle) {
        particle.remove();
      });
    }

    function clearOverlay() {
      if (overlayDismissHandler) {
        elements.bigWinOverlay.removeEventListener("click", overlayDismissHandler);
        elements.bigWinDismiss.removeEventListener("click", overlayDismissHandler);
        overlayDismissHandler = null;
      }
      elements.bigWinOverlay.classList.add("hidden");
      elements.bigWinOverlay.classList.remove("requires-dismiss");
      elements.bigWinDismiss.classList.add("hidden");
      global.document.body.classList.remove("screen-bright-pulse");
    }

    function clearWinEffects() {
      if (winEffectResetTimer) {
        global.clearTimeout(winEffectResetTimer);
        winEffectResetTimer = 0;
      }

      elements.slotPanel.classList.remove("loss-flash", "small-win", "big-win", "mega-win");
      elements.outcome.classList.remove("big-pulse");
      elements.paylineText.classList.remove("loss-glow", "small-glow", "anticipation");
      elements.reels.forEach(function clearReelClasses(reel) {
        reel.classList.remove("win-highlight", "jackpot");
      });
      removeParticles();
      clearOverlay();
    }

    function spawnParticles(kind, count) {
      for (let index = 0; index < count; index += 1) {
        const particle = global.document.createElement("span");
        particle.className = kind === "coin" ? "coin-burst" : "spin-bubble";
        particle.style.left = 6 + Math.random() * 88 + "%";
        particle.style.top = 12 + Math.random() * 70 + "%";
        particle.style.setProperty("--particle-duration", 580 + Math.floor(Math.random() * 640) + "ms");
        particle.style.setProperty("--drift-x", -54 + Math.floor(Math.random() * 108) + "px");
        elements.slotPanel.appendChild(particle);

        global.setTimeout(function () {
          particle.remove();
        }, 1400);
      }
    }

    function highlightReels(reelIndexes, jackpot) {
      reelIndexes.forEach(function (index) {
        const reel = elements.reels[index];
        if (!reel) {
          return;
        }
        reel.classList.add("win-highlight");
        if (jackpot) {
          reel.classList.add("jackpot");
        }
      });
    }

    function withAutoReset(ms) {
      if (winEffectResetTimer) {
        global.clearTimeout(winEffectResetTimer);
      }
      winEffectResetTimer = global.setTimeout(function () {
        clearWinEffects();
      }, ms);
    }

    function playCelebration(config) {
      const level = config.level || "loss";
      const reelIndexes = config.reelIndexes || [];
      const symbolLabel = config.symbolLabel || "Bonus";
      const payout = Number(config.payout || 0);
      const bet = Number(config.bet || 0);
      const ratio = bet > 0 ? payout / bet : 0;

      clearWinEffects();
      spawnParticles("bubble", level === "mega" ? 28 : level === "big" ? 16 : 8);

      if (level === "loss") {
        setPaylineText("Loss spin. Reel lock complete.", "loss");
        elements.slotPanel.classList.add("loss-flash");
        withAutoReset(520);
        return waitMs(240);
      }

      if (level === "small") {
        highlightReels(reelIndexes, false);
        setPaylineText("Small win landed.", "small");
        elements.slotPanel.classList.add("small-win");
        withAutoReset(900);
        return waitMs(420);
      }

      if (level === "big") {
        highlightReels(reelIndexes, true);
        setPaylineText("Big win. Coin burst triggered.", "small");
        elements.slotPanel.classList.add("big-win");
        elements.outcome.classList.add("big-pulse");
        spawnParticles("coin", 20);
        withAutoReset(1650);
        return waitMs(860);
      }

      highlightReels(reelIndexes, true);
      setPaylineText("Mega jackpot. Tap to dismiss celebration.", "anticipation");
      elements.slotPanel.classList.add("mega-win");
      elements.outcome.classList.add("big-pulse");
      spawnParticles("coin", 30);
      global.document.body.classList.add("screen-bright-pulse");

      elements.bigWinTitle.textContent = symbolLabel + " Mega Jackpot!";
      elements.bigWinText.textContent =
        "Payout " + payout.toFixed(2) + " on " + ratio.toFixed(1) + "x bet. Tap to continue.";
      elements.bigWinOverlay.classList.remove("hidden");
      elements.bigWinOverlay.classList.add("requires-dismiss");
      elements.bigWinDismiss.classList.remove("hidden");

      return new Promise(function (resolve) {
        overlayDismissHandler = function () {
          clearWinEffects();
          resolve();
        };
        elements.bigWinDismiss.addEventListener("click", overlayDismissHandler);
        elements.bigWinOverlay.addEventListener("click", overlayDismissHandler);
      });
    }

    function showAnticipation(symbolLabel) {
      setPaylineText("Two " + symbolLabel + " symbols landed. Final reel incoming...", "anticipation");
      setOutcome("Anticipation rising...", "anticipation");
    }

    function setSpinControlMode(mode) {
      spinControlMode = mode;
      elements.spinButton.classList.remove("spin-speed", "spin-slam");

      if (mode === "ready") {
        elements.spinButton.textContent = "Speed Up";
        elements.spinButton.classList.add("spin-speed");
        return;
      }

      if (mode === "speed") {
        elements.spinButton.textContent = "Slam Stop";
        elements.spinButton.classList.add("spin-slam");
        return;
      }

      if (mode === "slam") {
        elements.spinButton.textContent = "Stopping...";
        elements.spinButton.classList.add("spin-slam");
        return;
      }

      elements.spinButton.textContent = "Spin";
    }

    function renderHistory(history, limit) {
      elements.historyBody.innerHTML = "";
      const rows = history || [];
      elements.historyCount.textContent = rows.length + "/" + (limit || 20);

      if (!rows.length) {
        const emptyRow = global.document.createElement("tr");
        const emptyCell = global.document.createElement("td");
        emptyCell.colSpan = 5;
        emptyCell.className = "history-empty";
        emptyCell.textContent = "No spins yet.";
        emptyRow.appendChild(emptyCell);
        elements.historyBody.appendChild(emptyRow);
        return;
      }

      rows.forEach(function (entry) {
        const tr = global.document.createElement("tr");

        const spinCell = global.document.createElement("td");
        spinCell.textContent = String(entry.spin);

        const betCell = global.document.createElement("td");
        betCell.textContent = formatCredits(entry.bet);

        const resultCell = global.document.createElement("td");
        resultCell.textContent = (entry.symbols || []).join(" | ");

        const payoutCell = global.document.createElement("td");
        payoutCell.textContent = formatCredits(entry.payout);

        const netCell = global.document.createElement("td");
        netCell.textContent = formatSigned(entry.net);
        if (entry.net > 0) {
          netCell.classList.add("net-positive");
        } else if (entry.net < 0) {
          netCell.classList.add("net-negative");
        }

        tr.appendChild(spinCell);
        tr.appendChild(betCell);
        tr.appendChild(resultCell);
        tr.appendChild(payoutCell);
        tr.appendChild(netCell);
        elements.historyBody.appendChild(tr);
      });
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
      elements.netValue.textContent = formatSigned(state.netResult);
      elements.netValue.classList.toggle("net-positive", state.netResult > 0);
      elements.netValue.classList.toggle("net-negative", state.netResult < 0);

      elements.spinsValue.textContent = String(state.spins);
      elements.winsValue.textContent = String(state.wins);

      elements.ribbonSpun.textContent = formatCredits(state.totalSpend);
      elements.ribbonWon.textContent = formatCredits(state.totalReturned);
      elements.ribbonNet.textContent = formatSigned(state.netResult);
      elements.ribbonNet.classList.toggle("positive", state.netResult > 0);
      elements.ribbonNet.classList.toggle("negative", state.netResult < 0);

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

      const disableSpin = !state.canSpin && !state.isSpinning;
      elements.spinButton.disabled = disableSpin;
      elements.betDecrease.disabled = state.isSpinning || state.isPaused;
      elements.betIncrease.disabled = state.isSpinning || state.isPaused;
      elements.betInput.disabled = state.isSpinning || state.isPaused;

      if (state.isSpinning && spinControlMode === "idle") {
        setSpinControlMode("ready");
      }
      if (!state.isSpinning && spinControlMode !== "idle") {
        setSpinControlMode("idle");
      }

      if (state.isPaused) {
        elements.pauseBanner.classList.remove("hidden");
        elements.pauseBanner.textContent = state.pauseReason;
      } else {
        elements.pauseBanner.classList.add("hidden");
        elements.pauseBanner.textContent = "";
      }

      elements.prompt.textContent = state.responsiblePrompt;
      renderHistory(state.spinHistory, state.historyLimit);
    }

    function setHistoryCollapsed(collapsed) {
      historyCollapsed = collapsed;
      elements.historyContent.classList.toggle("hidden", historyCollapsed);
      elements.historyToggle.setAttribute("aria-expanded", String(!historyCollapsed));
      safeWriteHistoryCollapsed(historyCollapsed);
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

      elements.slotPanel.addEventListener("pointerdown", function (event) {
        if (!elements.gameScreen.classList.contains("active")) {
          return;
        }
        const interactive = event.target.closest("button,input,label,a");
        if (interactive) {
          return;
        }
        handlers.onSpin("tap");
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

      elements.historyToggle.addEventListener("click", function () {
        setHistoryCollapsed(!historyCollapsed);
      });

      elements.openInfoEntry.addEventListener("click", openInfoModal);
      elements.openInfoGame.addEventListener("click", openInfoModal);
      elements.backHomeGame.addEventListener("click", function () {
        handlers.onBackToHome();
      });
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
      historyCollapsed = safeReadHistoryCollapsed();
      setHistoryCollapsed(historyCollapsed);
      setScreen("loading");
      setAgeMessage("", "");
      setSpinControlMode("idle");
      setPaylineText("Payline ready.", "");
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
      playLoadingSequence: playLoadingSequence,
      setOutcome: setOutcome,
      setPaylineText: setPaylineText,
      setAgeMessage: setAgeMessage,
      renderState: renderState,
      renderReel: renderReel,
      playCelebration: playCelebration,
      showAnticipation: showAnticipation,
      clearWinEffects: clearWinEffects,
      setSpinControlMode: setSpinControlMode,
      getAccessibilityInputs: getAccessibilityInputs
    };
  }

  SlotApp.UI = {
    createUi: createUi
  };
})(window);
