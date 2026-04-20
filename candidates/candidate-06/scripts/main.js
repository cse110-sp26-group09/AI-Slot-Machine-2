/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function bootApp(global) {
  function formatSigned(value) {
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2);
  }

  function buildOutcomeText(outcome, result) {
    if (outcome.kind === "triple") {
      return (
        "Triple " +
        outcome.symbolId.toUpperCase() +
        "! Payout " +
        outcome.payout.toFixed(2) +
        " (net " +
        formatSigned(result.netChange) +
        ")."
      );
    }

    if (outcome.kind === "pair") {
      return (
        "Pair " +
        outcome.symbolId.toUpperCase() +
        ": payout " +
        outcome.payout.toFixed(2) +
        " (net " +
        formatSigned(result.netChange) +
        ")."
      );
    }

    return "No match this spin (net " + formatSigned(result.netChange) + ").";
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

    async function handleSpin() {
      const canSpin = game.getCanSpin();
      if (!canSpin.ok) {
        ui.setOutcome(canSpin.reason, "negative");
        return;
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
      ui.setOutcome(buildOutcomeText(outcome, result), tone);

      if (outcome.payout > 0) {
        audio.playWin(outcome.payout);
      } else {
        audio.playLoss();
      }

      if (result.isPaused) {
        ui.setOutcome(result.pauseReason + " " + buildOutcomeText(outcome, result), "negative");
      }
    }

    ui.init({
      paytableRows: Payouts.getPaytableRows(),
      fairnessInfo: Payouts.getFairnessInfo(),
      handlers: {
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

    accessibility.init(ui.getAccessibilityInputs(), function (preferences) {
      reducedMotion = preferences.reducedMotion;
    });

    const seedSymbols = Payouts.SYMBOLS;
    ui.renderReel(0, seedSymbols[0], true);
    ui.renderReel(1, seedSymbols[1], true);
    ui.renderReel(2, seedSymbols[2], true);

    syncState();
    ui.setOutcome("Session ready. Press Spin Reels when comfortable.", "");
  });
})(window);
