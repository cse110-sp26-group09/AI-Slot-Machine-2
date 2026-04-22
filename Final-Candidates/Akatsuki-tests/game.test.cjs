"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { importCandidateModule, withMockedRandom, withMockedWindow } = require("./test-utils.cjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStorageStub(initialState) {
  let persisted = initialState ? clone(initialState) : null;
  const saves = [];

  return {
    saves: saves,
    getLatestState() {
      return saves.length ? clone(saves[saves.length - 1]) : null;
    },
    storage: {
      loadState() {
        return persisted ? clone(persisted) : null;
      },
      saveState(state) {
        persisted = clone(state);
        saves.push(clone(state));
      },
      clearState() {
        persisted = null;
      },
    },
  };
}

function createUIStub() {
  const controls = {};
  const renderPayloads = [];
  let paytableRows = [];
  let restoreNote = "";

  return {
    controls: controls,
    getLastRender() {
      return renderPayloads[renderPayloads.length - 1];
    },
    getPaytableRows() {
      return paytableRows;
    },
    getRestoreNote() {
      return restoreNote;
    },
    ui: {
      renderPaytable(rows) {
        paytableRows = rows;
      },
      bindControls(handlers) {
        Object.assign(controls, handlers);
      },
      setRestoreNote(note) {
        restoreNote = note;
      },
      renderState(payload) {
        renderPayloads.push(payload);
      },
      setReelSpinning() {},
      updateReel() {},
      playWinFeedback() {},
    },
  };
}

function createAudioStub() {
  return {
    setEnabled() {},
    setVolume() {},
    playLimit() {},
    playSpinStart() {},
    playSpinTick() {},
    playReelStop() {},
    stopSpinLoop() {},
    playWin() {},
    playLoss() {},
    playReward() {},
  };
}

function createAccessibilityStub() {
  return {
    apply() {},
  };
}

test("bet controls normalize and clamp values after init", async function () {
  await withMockedWindow({}, async function () {
    const gameModule = await importCandidateModule("scripts/game.js");
    const uiStub = createUIStub();
    const storageStub = createStorageStub(null);

    const game = gameModule.createGameController({
      ui: uiStub.ui,
      audio: createAudioStub(),
      storage: storageStub.storage,
      accessibility: createAccessibilityStub(),
    });

    game.init();

    assert.equal(uiStub.getPaytableRows().length > 0, true);
    assert.equal(uiStub.getRestoreNote(), "Session auto-save is active in this browser.");

    uiStub.controls.onBetInput(0);
    assert.equal(uiStub.getLastRender().state.bet, 5);

    uiStub.controls.onBetInput(103);
    assert.equal(uiStub.getLastRender().state.bet, 100);

    uiStub.controls.onBetStep(-1);
    assert.equal(uiStub.getLastRender().state.bet, 95);
  });
});

test("spin awards deterministic jackpot and updates session totals", async function () {
  await withMockedWindow({}, async function () {
    const gameModule = await importCandidateModule("scripts/game.js");
    const uiStub = createUIStub();
    const storageStub = createStorageStub({
      balance: 500,
      bet: 20,
      controls: { lossLimit: 0 },
      settings: { reducedMotion: true },
    });

    const game = gameModule.createGameController({
      ui: uiStub.ui,
      audio: createAudioStub(),
      storage: storageStub.storage,
      accessibility: createAccessibilityStub(),
    });

    game.init();

    await withMockedRandom([0.9999, 0.9999, 0.9999], function () {
      return uiStub.controls.onSpin();
    });

    const rendered = uiStub.getLastRender();
    assert.equal(rendered.state.session.spins, 1);
    assert.equal(rendered.state.session.wins, 1);
    assert.equal(rendered.state.session.spent, 20);
    assert.equal(rendered.state.session.won, 2800);
    assert.equal(rendered.state.balance, 3280);
    assert.equal(rendered.derived.sessionNet, 2780);
  });
});

test("spin pauses gameplay when session loss reaches configured limit", async function () {
  await withMockedWindow({}, async function () {
    const gameModule = await importCandidateModule("scripts/game.js");
    const uiStub = createUIStub();
    const storageStub = createStorageStub({
      balance: 50,
      bet: 20,
      controls: { lossLimit: 10 },
      settings: { reducedMotion: true },
    });

    const game = gameModule.createGameController({
      ui: uiStub.ui,
      audio: createAudioStub(),
      storage: storageStub.storage,
      accessibility: createAccessibilityStub(),
    });

    game.init();

    await withMockedRandom([0.1, 0.2, 0.3], function () {
      return uiStub.controls.onSpin();
    });

    const rendered = uiStub.getLastRender();
    assert.equal(rendered.state.session.spins, 1);
    assert.equal(rendered.state.session.wins, 0);
    assert.equal(rendered.state.balance, 30);
    assert.equal(rendered.state.controls.pausedByLimit, true);
    assert.equal(rendered.derived.canSpin, false);
    assert.match(rendered.banner.text, /Loss limit reached/);
    assert.equal(rendered.banner.tone, "warn");
  });
});

