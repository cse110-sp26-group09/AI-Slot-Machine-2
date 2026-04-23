/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function bootApp(global) {
  const AGE_GATE_MAX_BIRTHDATE = {
    year: 2005,
    month: 4,
    day: 22
  };
  const BONUS_SYMBOL_ID = "spongebob";
  const REEL_DURATION_MS = 2000;

  function formatSigned(value) {
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2);
  }

  function findSymbolById(symbols, id) {
    return symbols.find(function (symbol) {
      return symbol.id === id;
    });
  }

  function getWinningReelIndexes(spinSymbols, symbolId) {
    return spinSymbols.reduce(function collect(matches, symbol, index) {
      if (symbol.id === symbolId) {
        matches.push(index);
      }
      return matches;
    }, []);
  }

  function getCelebrationTier(outcome, betAmount) {
    if (!outcome.isWin || betAmount <= 0) {
      return "loss";
    }

    const ratio = outcome.payout / betAmount;
    if (ratio >= 50) {
      return "mega";
    }
    if (ratio >= 10) {
      return "big";
    }
    return "small";
  }

  function buildOutcomeMessage(outcome, result, symbols) {
    const ratio = result.bet > 0 ? outcome.payout / result.bet : 0;

    if (!outcome.isWin) {
      return {
        text: "No match this spin (net " + formatSigned(result.netChange) + ").",
        tone: "negative",
        payline: "No match on this payline."
      };
    }

    if (outcome.kind === "triple") {
      const symbol = findSymbolById(symbols, outcome.symbolId);
      const symbolName = symbol ? symbol.label : outcome.symbolId.toUpperCase();
      return {
        text:
          "Triple " +
          symbolName +
          "! " +
          ratio.toFixed(1) +
          "x payout: " +
          outcome.payout.toFixed(2) +
          " (net " +
          formatSigned(result.netChange) +
          ").",
        tone: "positive",
        payline: "3-of-a-kind locked. Dramatic reel stop confirmed."
      };
    }

    if (outcome.kind === "pair") {
      const pairSymbol = findSymbolById(symbols, outcome.symbolId);
      const pairName = pairSymbol ? pairSymbol.label : outcome.symbolId.toUpperCase();
      const isPartial = outcome.payout < result.bet;
      return {
        text:
          (isPartial ? "Partial return: " : "Pair " + pairName + " win: ") +
          outcome.payout.toFixed(2) +
          " (net " +
          formatSigned(result.netChange) +
          ").",
        tone: isPartial ? "anticipation" : "positive",
        payline: "2-of-a-kind paid " + ratio.toFixed(1) + "x."
      };
    }

    return {
      text: "Spin complete (net " + formatSigned(result.netChange) + ").",
      tone: result.netChange >= 0 ? "positive" : "negative",
      payline: "Outcome settled."
    };
  }

  function parseBirthDate(rawValue) {
    const trimmed = String(rawValue || "").trim();
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);

    if (!match) {
      return { ok: false, reason: "Use MM/DD/YYYY format (example: 04/22/2005)." };
    }

    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);

    if (month < 1 || month > 12) {
      return { ok: false, reason: "Month must be between 01 and 12." };
    }

    const maxDays = new Date(year, month, 0).getDate();
    if (day < 1 || day > maxDays) {
      return { ok: false, reason: "Enter a valid calendar date." };
    }

    return {
      ok: true,
      value: {
        year: year,
        month: month,
        day: day
      }
    };
  }

  function isAtMost(dateValue, upperBound) {
    if (dateValue.year !== upperBound.year) {
      return dateValue.year < upperBound.year;
    }

    if (dateValue.month !== upperBound.month) {
      return dateValue.month < upperBound.month;
    }

    return dateValue.day <= upperBound.day;
  }

  global.document.addEventListener("DOMContentLoaded", function () {
    const Payouts = global.SlotApp.Payouts;
    const Reels = global.SlotApp.Reels;
    const Game = global.SlotApp.Game;
    const UI = global.SlotApp.UI;
    const Audio = global.SlotApp.Audio;
    const Accessibility = global.SlotApp.Accessibility;

    const ui = UI.createUi();
    const game = Game.createGame({
      startingBalance: 200,
      budgetCap: 250,
      lossLimit: 100,
      currentBet: 5
    });
    const audio = Audio.createAudioController();
    const accessibility = Accessibility.createController();

    let reducedMotion = false;
    let activeSpinSession = null;

    function syncState() {
      ui.renderState(game.getState());
    }

    function handleBetIncrease() {
      game.adjustBet(1);
      syncState();
    }

    function handleBetDecrease() {
      game.adjustBet(-1);
      syncState();
    }

    function handleBetSet(value) {
      game.setBet(value);
      syncState();
    }

    function handleApplyGuardrails(settings) {
      game.updateSessionSettings(settings);
      syncState();
      ui.setOutcome("Session limits updated.", "");
      ui.setPaylineText("Payline ready.", "");
    }

    function handleResetSession(settings) {
      game.startNewSession(settings);
      const symbols = Payouts.SYMBOLS;
      ui.clearWinEffects();
      ui.renderReel(0, symbols[0], true);
      ui.renderReel(1, symbols[1], true);
      ui.renderReel(2, symbols[2], true);
      syncState();
      ui.setOutcome("New session started with your selected limits.", "");
      ui.setPaylineText("Fresh session loaded.", "");
    }

    function handlePlay() {
      audio.startBackgroundMusic();
      ui.setAgeMessage("", "");
      ui.setScreen("age");
    }

    function handleBackToEntry() {
      ui.setAgeMessage("", "");
      ui.setScreen("entry");
    }

    function handleBackToHome() {
      ui.setAgeMessage("", "");
      ui.setScreen("entry");
    }

    function handleVerifyAge(rawDate) {
      const parsed = parseBirthDate(rawDate);

      if (!parsed.ok) {
        ui.setAgeMessage(parsed.reason, "negative");
        return;
      }

      const isOldEnough = isAtMost(parsed.value, AGE_GATE_MAX_BIRTHDATE);
      if (!isOldEnough) {
        ui.setAgeMessage(
          "Access denied. This experience is only available to users 21+. Valid dates must be on or before 04/22/2005.",
          "negative"
        );
        return;
      }

      ui.setAgeMessage("Age verified. Entering the game...", "positive");
      audio.playWelcome();
      audio.playSpinStart();
      ui.playAgePassBubbles();
      ui.setScreen("game");
    }

    function handleSpinControlsWhileSpinning(source) {
      if (!activeSpinSession) {
        return false;
      }

      const status = activeSpinSession.getStatus();
      if (status.slamRequested) {
        return true;
      }

      if (status.speedRequested) {
        activeSpinSession.requestSlamStop();
        ui.setSpinControlMode("slam");
        ui.setOutcome("Slam Stop engaged. Locking reels now...", "anticipation");
        ui.setPaylineText("Slam Stop active.", "anticipation");
        return true;
      }

      activeSpinSession.requestSpeedUp();
      ui.setSpinControlMode("speed");
      ui.setOutcome("Speed-up enabled. Tap again for Slam Stop.", "anticipation");
      ui.setPaylineText("Rapid mode active.", "anticipation");
      return true;
    }

    async function handleSpin(source) {
      const fromSpinButton = source === "button";
      const fromSlotArea = source === "tap";

      if (!activeSpinSession && !fromSpinButton) {
        return;
      }

      if (activeSpinSession && (fromSpinButton || fromSlotArea) && handleSpinControlsWhileSpinning(source)) {
        return;
      }

      const canSpin = game.getCanSpin();
      if (!canSpin.ok) {
        ui.setOutcome(canSpin.reason, "negative");
        return;
      }

      game.setSpinning(true);
      ui.clearWinEffects();
      ui.setSpinControlMode("ready");
      syncState();
      ui.setPaylineText("Reels spinning left to right...", "");
      ui.setOutcome("Spinning reels... tap to speed up.", "");
      audio.playSpinStart();

      activeSpinSession = Reels.startSpin({
        symbols: Payouts.SYMBOLS,
        reducedMotion: reducedMotion,
        bonusSymbolId: BONUS_SYMBOL_ID,
        reelDurationMs: REEL_DURATION_MS,
        onUpdate: function (reelIndex, symbol, isFinal, motion) {
          ui.renderReel(reelIndex, symbol, isFinal, motion);
        },
        onReelStop: function (reelIndex, symbol, motion) {
          audio.playReelStop(reelIndex, motion);
        },
        onAnticipation: function () {
          const bonusSymbol = findSymbolById(Payouts.SYMBOLS, BONUS_SYMBOL_ID);
          ui.showAnticipation(bonusSymbol ? bonusSymbol.label : "Bonus");
          audio.playAnticipation();
        }
      });

      let symbols = [];
      let stopMode = "normal";
      try {
        const spinResult = await activeSpinSession.promise;
        symbols = spinResult.symbols;
        stopMode = spinResult.stopMode;
      } finally {
        activeSpinSession = null;
      }

      const stateBeforeOutcome = game.getState();
      const outcome = Payouts.evaluateSpin(symbols, stateBeforeOutcome.currentBet);
      const result = game.applyOutcome({
        symbols: symbols,
        outcome: outcome,
        spinMeta: {
          stopMode: stopMode
        }
      });
      const winningReelIndexes = outcome.isWin
        ? getWinningReelIndexes(symbols, outcome.symbolId)
        : [];
      const message = buildOutcomeMessage(outcome, result, Payouts.SYMBOLS);
      const symbol = outcome.symbolId ? findSymbolById(Payouts.SYMBOLS, outcome.symbolId) : null;
      const celebrationTier = getCelebrationTier(outcome, result.bet);

      game.setSpinning(false);
      ui.setSpinControlMode("idle");
      syncState();

      ui.setOutcome(message.text, message.tone);
      ui.setPaylineText(message.payline, celebrationTier === "loss" ? "loss" : "small");
      audio.playOutcome(celebrationTier);

      await ui.playCelebration({
        level: celebrationTier,
        reelIndexes: winningReelIndexes,
        symbolLabel: symbol ? symbol.label : "Bonus",
        payout: outcome.payout,
        bet: result.bet
      });

      if (result.isPaused) {
        ui.setOutcome(result.pauseReason + " " + message.text, "negative");
      }
    }

    ui.init({
      paytableRows: Payouts.getPaytableRows(),
      fairnessInfo: Payouts.getFairnessInfo(),
      handlers: {
        onPlay: handlePlay,
        onBackToEntry: handleBackToEntry,
        onBackToHome: handleBackToHome,
        onVerifyAge: handleVerifyAge,
        onBetIncrease: handleBetIncrease,
        onBetDecrease: handleBetDecrease,
        onBetSet: handleBetSet,
        onSpin: handleSpin,
        onApplyGuardrails: handleApplyGuardrails,
        onResetSession: handleResetSession,
        onSoundEnabled: function (enabled) {
          audio.setEnabled(enabled);
        },
        onVolumeChange: function (value) {
          audio.setVolume(value / 100);
        }
      }
    });

    global.document.body.addEventListener(
      "pointerdown",
      function () {
        audio.startBackgroundMusic();
      },
      { once: true }
    );

    accessibility.init(ui.getAccessibilityInputs(), function (preferences) {
      reducedMotion = preferences.reducedMotion;
    });

    const seedSymbols = Payouts.SYMBOLS;
    ui.renderReel(0, seedSymbols[0], true);
    ui.renderReel(1, seedSymbols[1], true);
    ui.renderReel(2, seedSymbols[2], true);
    syncState();
    ui.setPaylineText("Payline ready.", "");
    ui.setOutcome("Session ready. Press Spin when comfortable.", "");

    ui.playLoadingSequence(reducedMotion ? 420 : 1300).then(function () {
      ui.setScreen("entry");
    });
  });
})(window);
