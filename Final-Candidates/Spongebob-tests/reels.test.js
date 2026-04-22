"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts, createSequenceMath } = require("./test-utils");

function loadReels(windowOverrides) {
  const windowObject = loadScripts(["scripts/reels.js"], {
    windowOverrides: windowOverrides
  });
  return windowObject.SlotApp.Reels;
}

const symbols = [
  { id: "bonus", code: "BON", label: "Bonus", icon: "bonus.png" },
  { id: "a", code: "AAA", label: "A", icon: "a.png" },
  { id: "b", code: "BBB", label: "B", icon: "b.png" }
];

test("startSpin with reducedMotion resolves symbols and emits final updates", async function () {
  const reels = loadReels({
    Math: createSequenceMath([0.01, 0.34, 0.81])
  });

  const updates = [];
  const stops = [];

  const session = reels.startSpin({
    symbols: symbols,
    reducedMotion: true,
    onUpdate: function (reelIndex, symbol, isFinal, motion) {
      updates.push({ reelIndex: reelIndex, symbol: symbol, isFinal: isFinal, motion: motion });
    },
    onReelStop: function (reelIndex, symbol, motion) {
      stops.push({ reelIndex: reelIndex, symbol: symbol, motion: motion });
    }
  });

  assert.equal(session.getStatus().active, true);

  const result = await session.promise;
  assert.equal(result.stopMode, "normal");
  assert.equal(result.symbols.length, 3);
  assert.equal(result.symbols[0].id, "bonus");
  assert.equal(result.symbols[1].id, "a");
  assert.equal(result.symbols[2].id, "b");

  assert.equal(updates.length, 3);
  updates.forEach(function (entry, index) {
    assert.equal(entry.reelIndex, index);
    assert.equal(entry.isFinal, true);
    assert.equal(entry.motion.stage, "locked");
    assert.equal(entry.motion.progress, 1);
    assert.equal(entry.motion.mode, "normal");
  });

  assert.equal(stops.length, 3);
  assert.equal(session.getStatus().active, false);
  assert.equal(session.requestSpeedUp(), false);
  assert.equal(session.requestSlamStop(), false);
});

test("startSpin triggers anticipation when first two reels match bonus symbol", async function () {
  const reels = loadReels({
    Math: createSequenceMath([0.01, 0.02, 0.75])
  });

  const anticipationCalls = [];

  const session = reels.startSpin({
    symbols: symbols,
    reducedMotion: true,
    bonusSymbolId: "bonus",
    onAnticipation: function (payload) {
      anticipationCalls.push(payload);
    }
  });

  await session.promise;

  assert.equal(anticipationCalls.length, 1);
  assert.equal(anticipationCalls[0].symbolId, "bonus");
  assert.deepEqual(Array.from(anticipationCalls[0].reelIndexes), [0, 1]);
});

test("requestSpeedUp and requestSlamStop update status during active animated spin", async function () {
  const reels = loadReels();

  const session = reels.startSpin({
    symbols: symbols,
    reelCount: 1,
    reducedMotion: false,
    reelDurationMs: 260
  });

  assert.equal(session.requestSpeedUp(), true);
  assert.equal(session.getStatus().speedRequested, true);
  assert.equal(session.getStatus().mode, "speed");

  assert.equal(session.requestSlamStop(), true);
  assert.equal(session.getStatus().slamRequested, true);
  assert.equal(session.getStatus().mode, "slam");

  const result = await session.promise;
  assert.equal(result.symbols.length, 1);
  assert.equal(result.stopMode, "slam");
  assert.equal(session.getStatus().active, false);
});

test("spin helper resolves directly to symbols array", async function () {
  const reels = loadReels({
    Math: createSequenceMath([0.8, 0.5, 0.2])
  });

  const spinSymbols = await reels.spin({
    symbols: symbols,
    reducedMotion: true
  });

  assert.equal(Array.isArray(spinSymbols), true);
  assert.equal(spinSymbols.length, 3);
  assert.equal(spinSymbols[0].id, "b");
  assert.equal(spinSymbols[1].id, "a");
  assert.equal(spinSymbols[2].id, "bonus");
});
