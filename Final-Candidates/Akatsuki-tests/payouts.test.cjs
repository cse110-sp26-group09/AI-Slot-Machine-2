"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { importCandidateModule } = require("./test-utils.cjs");

test("evaluateSpin returns jackpot details for YAHIKO triple", async function () {
  const payouts = await importCandidateModule("scripts/payouts.js");

  const outcome = payouts.evaluateSpin(["YAHIKO", "YAHIKO", "YAHIKO"], 10);

  assert.equal(outcome.multiplier, 140);
  assert.equal(outcome.payout, 1400);
  assert.equal(outcome.spinNet, 1390);
  assert.equal(outcome.lineType, "jackpot");
});

test("evaluateSpin recognizes Akatsuki alignment combo in any order", async function () {
  const payouts = await importCandidateModule("scripts/payouts.js");

  const outcome = payouts.evaluateSpin(["OBITO", "NAGATO", "KONAN"], 5);

  assert.equal(outcome.multiplier, 18);
  assert.equal(outcome.payout, 90);
  assert.equal(outcome.spinNet, 85);
  assert.equal(outcome.title, "Akatsuki alignment combo");
  assert.equal(outcome.lineType, "win");
});

test("evaluateSpin applies pair multiplier with floor rounding", async function () {
  const payouts = await importCandidateModule("scripts/payouts.js");

  const outcome = payouts.evaluateSpin(["NAGATO", "NAGATO", "ITACHI"], 25);

  assert.equal(outcome.multiplier, 1.1);
  assert.equal(outcome.payout, 27);
  assert.equal(outcome.spinNet, 2);
  assert.equal(outcome.lineType, "win");
});

test("paytable rows include each symbol plus alignment and pair rules", async function () {
  const reels = await importCandidateModule("scripts/reels.js");
  const payouts = await importCandidateModule("scripts/payouts.js");

  assert.equal(payouts.PAYTABLE_ROWS.length, reels.REEL_SYMBOLS.length + 2);
  assert.equal(payouts.PAYTABLE_ROWS.some(function (row) { return row.key === "ALIGNMENT"; }), true);
  assert.equal(payouts.PAYTABLE_ROWS.some(function (row) { return row.key === "PAIR"; }), true);
});

test("calculateTheoreticalRtp returns a finite positive RTP value", async function () {
  const reels = await importCandidateModule("scripts/reels.js");
  const payouts = await importCandidateModule("scripts/payouts.js");

  const rtp = payouts.calculateTheoreticalRtp(reels.REEL_SYMBOLS);

  assert.equal(Number.isFinite(rtp), true);
  assert.equal(rtp > 0, true);
});

