"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./test-utils");

function loadPayouts() {
  const windowObject = loadScripts(["scripts/payouts.js"]);
  return windowObject.SlotApp.Payouts;
}

function byId(symbols, id) {
  return symbols.find(function (symbol) {
    return symbol.id === id;
  });
}

test("evaluateSpin returns triple payout with correct multiplier", function () {
  const payouts = loadPayouts();
  const gary = byId(payouts.SYMBOLS, "gary");

  const outcome = payouts.evaluateSpin([gary, gary, gary], 7);

  assert.equal(outcome.kind, "triple");
  assert.equal(outcome.symbolId, "gary");
  assert.equal(outcome.multiplier, 10);
  assert.equal(outcome.payout, 70);
  assert.equal(outcome.isWin, true);
});

test("evaluateSpin returns pair payout and rounds to cents", function () {
  const payouts = loadPayouts();
  const spongebob = byId(payouts.SYMBOLS, "spongebob");
  const plankton = byId(payouts.SYMBOLS, "plankton");

  const outcome = payouts.evaluateSpin([spongebob, spongebob, plankton], 2.99);

  assert.equal(outcome.kind, "pair");
  assert.equal(outcome.symbolId, "spongebob");
  assert.equal(outcome.multiplier, 3.1);
  assert.equal(outcome.payout, 9.27);
  assert.equal(outcome.isWin, true);
});

test("evaluateSpin returns loss when all symbols are different", function () {
  const payouts = loadPayouts();
  const symbols = payouts.SYMBOLS;

  const outcome = payouts.evaluateSpin([symbols[0], symbols[1], symbols[2]], 25);

  assert.equal(outcome.kind, "loss");
  assert.equal(outcome.symbolId, null);
  assert.equal(outcome.multiplier, 0);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.isWin, false);
});

test("getPaytableRows contains a row for each symbol", function () {
  const payouts = loadPayouts();

  const rows = payouts.getPaytableRows();

  assert.equal(rows.length, payouts.SYMBOLS.length);
  rows.forEach(function (row) {
    assert.ok(row.symbol && row.symbol.id);
    assert.equal(typeof row.triple, "number");
    assert.equal(typeof row.pair, "number");
  });
});

test("getFairnessInfo returns RTP and odds summaries", function () {
  const payouts = loadPayouts();

  const info = payouts.getFairnessInfo();

  assert.match(info.rtpText, /^Theoretical RTP: \d+\.\d{2}% \(house edge -?\d+\.\d{2}%\)\.$/);
  assert.match(
    info.oddsText,
    /^Hit rates: any 3-of-a-kind \d+\.\d{2}%, any pair \d+\.\d{2}%, no-win spin \d+\.\d{2}%\.$/
  );
});
