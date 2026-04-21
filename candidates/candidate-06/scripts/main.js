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

  function formatSigned(value) {
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2);
  }

  function findSymbolById(symbols, id) {
    return symbols.find(function (symbol) {
      return symbol.id === id;
    });
  }

  function buildOutcomeText(outcome, result, symbols) {
    if (outcome.kind === "triple") {
      const symbol = findSymbolById(symbols, outcome.symbolId);
      const symbolName = symbol ? symbol.label : outcome.symbolId.toUpperCase();
      return (
        "Triple " +
        symbolName +
        "! Payout " +
        outcome.payout.toFixed(2) +
        " (net " +
        formatSigned(result.netChange) +
        ")."
      );
    }

    if (outcome.kind === "pair") {
      const pairSymbol = findSymbolById(symbols, outcome.symbolId);
      const pairName = pairSymbol ? pairSymbol.label : outcome.symbolId.toUpperCase();
      return (
        "Pair " +
        pairName +
        ": payout " +
        outcome.payout.toFixed(2) +
        " (net " +
        formatSigned(result.netChange) +
        ")."
      );
    }

    return "No match this spin (net " + formatSigned(result.netChange) + ").";
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
    }

    function handleResetSession(settings) {
      game.startNewSession(settings);
      const symbols = Payouts.SYMBOLS;
      ui.renderReel(0, symbols[0], true);
      ui.renderReel(1, symbols[1], true);
      ui.renderReel(2, symbols[2], true);
      syncState();
      ui.setOutcome("New session started with your selected limits.", "");
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
      ui.setScreen("game");
      audio.playWelcome();
    }

    async function handleSpin(source) {
      const canSpin = game.getCanSpin();
      if (!canSpin.ok) {
        ui.setOutcome(canSpin.reason, "negative");
        return;
      }

      if (source === "lever") {
        ui.animateLeverPull();
      }

      game.setSpinning(true);
      syncState();
      ui.setOutcome("Spinning reels...", "");
      audio.playSpinStart();

      const symbols = await Reels.spin({
        symbols: Payouts.SYMBOLS,
        reducedMotion: reducedMotion,
        onUpdate: function (reelIndex, symbol, isFinal) {
          ui.renderReel(reelIndex, symbol, isFinal);
        },
        onReelStop: function (reelIndex) {
          audio.playReelStop(reelIndex);
        }
      });

      const stateBeforeOutcome = game.getState();
      const outcome = Payouts.evaluateSpin(symbols, stateBeforeOutcome.currentBet);
      const result = game.applyOutcome({ symbols: symbols, outcome: outcome });

      game.setSpinning(false);
      syncState();

      const tone = result.netChange > 0 ? "positive" : "negative";
      ui.setOutcome(buildOutcomeText(outcome, result, Payouts.SYMBOLS), tone);

      if (outcome.kind === "triple") {
        const symbol = findSymbolById(Payouts.SYMBOLS, outcome.symbolId);
        ui.showBigWin(symbol ? symbol.label : "Major", outcome.payout);
        audio.playWin("triple");
      } else if (outcome.payout > 0) {
        ui.showMinorWin();
        audio.playWin("pair");
      } else {
        audio.playLoss();
      }

      if (result.isPaused) {
        ui.setOutcome(result.pauseReason + " " + buildOutcomeText(outcome, result, Payouts.SYMBOLS), "negative");
      }
    }

    ui.init({
      paytableRows: Payouts.getPaytableRows(),
      fairnessInfo: Payouts.getFairnessInfo(),
      handlers: {
        onPlay: handlePlay,
        onBackToEntry: handleBackToEntry,
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
    ui.setOutcome("Session ready. Pull the lever or press Spin when comfortable.", "");
  });
})(window);
