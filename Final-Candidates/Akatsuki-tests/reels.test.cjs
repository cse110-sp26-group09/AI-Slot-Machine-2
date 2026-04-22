"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { importCandidateModule, withMockedRandom, withMockedWindow } = require("./test-utils.cjs");

test("drawWeightedSymbolId maps low and high random bounds to expected symbols", async function () {
  const reels = await importCandidateModule("scripts/reels.js");

  assert.equal(reels.drawWeightedSymbolId(function () { return 0; }), "NAGATO");
  assert.equal(reels.drawWeightedSymbolId(function () { return 0.999999; }), "YAHIKO");
});

test("spinReels reducedMotion resolves deterministic symbols and emits final callbacks", async function () {
  await withMockedWindow({}, async function () {
    const reels = await importCandidateModule("scripts/reels.js");
    const starts = [];
    const updates = [];
    const stops = [];

    const symbols = await withMockedRandom([0.1, 0.2, 0.3], function () {
      return reels.spinReels({
        reducedMotion: true,
        onReelStart: function (reelIndex) {
          starts.push(reelIndex);
        },
        onReelUpdate: function (reelIndex, symbolId, isFinal) {
          updates.push({ reelIndex: reelIndex, symbolId: symbolId, isFinal: isFinal });
        },
        onReelStop: function (reelIndex, symbolId) {
          stops.push({ reelIndex: reelIndex, symbolId: symbolId });
        },
      });
    });

    assert.deepEqual(symbols, ["NAGATO", "KONAN", "ITACHI"]);
    assert.deepEqual(starts, [0, 1, 2]);
    assert.equal(updates.length, 3);
    updates.forEach(function (entry, index) {
      assert.equal(entry.reelIndex, index);
      assert.equal(entry.isFinal, true);
    });

    assert.equal(stops.length, 3);
    assert.deepEqual(stops.map(function (entry) { return entry.symbolId; }), symbols);
  });
});

