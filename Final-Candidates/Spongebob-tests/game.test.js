"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./test-utils");

function loadGameAndSymbols() {
  const windowObject = loadScripts(["scripts/game.js", "scripts/payouts.js"]);
  return {
    Game: windowObject.SlotApp.Game,
    symbols: windowObject.SlotApp.Payouts.SYMBOLS
  };
}

test("createGame clamps bet within min/max and current balance", function () {
  const loaded = loadGameAndSymbols();
  const game = loaded.Game.createGame({
    startingBalance: 40,
    budgetCap: 250,
    lossLimit: 100,
    currentBet: 80
  });

  assert.equal(game.getState().currentBet, 40);

  game.setBet(0);
  assert.equal(game.getState().currentBet, 1);

  game.setBet(200);
  assert.equal(game.getState().currentBet, 40);
});

test("applyOutcome updates accounting, wins, xp, and history entry", function () {
  const loaded = loadGameAndSymbols();
  const game = loaded.Game.createGame({
    startingBalance: 200,
    budgetCap: 1000,
    lossLimit: 1000,
    currentBet: 5
  });

  const spongebob = loaded.symbols.find(function (symbol) {
    return symbol.id === "spongebob";
  });

  const result = game.applyOutcome({
    symbols: [spongebob, spongebob, spongebob],
    outcome: {
      kind: "triple",
      symbolId: "spongebob",
      multiplier: 30,
      payout: 150,
      isWin: true
    },
    spinMeta: {
      stopMode: "speed"
    }
  });

  const state = game.getState();
  assert.equal(state.spins, 1);
  assert.equal(state.wins, 1);
  assert.equal(state.totalSpend, 5);
  assert.equal(state.totalReturned, 150);
  assert.equal(state.netResult, 145);
  assert.equal(state.balance, 345);
  assert.equal(state.xp, 15);
  assert.equal(state.spinHistory.length, 1);
  assert.equal(state.spinHistory[0].stopMode, "speed");
  assert.equal(result.netChange, 145);
});

test("game pauses when budget cap is reached", function () {
  const loaded = loadGameAndSymbols();
  const game = loaded.Game.createGame({
    startingBalance: 50,
    budgetCap: 10,
    lossLimit: 100,
    currentBet: 5
  });

  const symbols = loaded.symbols.slice(0, 3);
  const lossOutcome = {
    kind: "loss",
    symbolId: null,
    multiplier: 0,
    payout: 0,
    isWin: false
  };

  game.applyOutcome({ symbols: symbols, outcome: lossOutcome });
  assert.equal(game.getState().isPaused, false);

  game.applyOutcome({ symbols: symbols, outcome: lossOutcome });
  const pausedState = game.getState();

  assert.equal(pausedState.isPaused, true);
  assert.equal(pausedState.pauseReason, "Spend budget reached. Start a new session to continue.");
  const canSpin = game.getCanSpin();
  assert.equal(canSpin.ok, false);
  assert.equal(canSpin.reason, "Spend budget reached. Start a new session to continue.");
});

test("spin history keeps only the latest 20 entries", function () {
  const loaded = loadGameAndSymbols();
  const game = loaded.Game.createGame({
    startingBalance: 500,
    budgetCap: 0,
    lossLimit: 0,
    currentBet: 1
  });

  const symbols = loaded.symbols.slice(0, 3);
  const lossOutcome = {
    kind: "loss",
    symbolId: null,
    multiplier: 0,
    payout: 0,
    isWin: false
  };

  for (let spin = 0; spin < 25; spin += 1) {
    game.applyOutcome({ symbols: symbols, outcome: lossOutcome });
  }

  const history = game.getState().spinHistory;
  assert.equal(history.length, 20);
  assert.equal(history[0].spin, 25);
  assert.equal(history[19].spin, 6);
});
