/**
 * @fileoverview Payout and fairness calculations for spin outcomes.
 * @typedef {{payout: number, multiplier: number, line: string}} PayoutInfo
 */
import { getReelDistributions } from "./reels.js";

const THREE_OF_A_KIND_MULTIPLIERS = Object.freeze({
  spongebob: 20,
  patrick: 14,
  sandy: 12,
  squidward: 10,
  mrkrabs: 11,
  mrspuff: 8,
  gary: 7,
  pearl: 9,
  plankton: 13
});

const TWO_OF_A_KIND_MULTIPLIERS = Object.freeze({
  spongebob: 3,
  patrick: 2,
  sandy: 2,
  squidward: 2,
  mrkrabs: 2,
  mrspuff: 1,
  gary: 1,
  pearl: 1,
  plankton: 2
});

const SPECIAL_COMBOS = Object.freeze([
  {
    id: "besties-line",
    pattern: ["spongebob", "patrick", "sandy"],
    label: "Besties Adventure",
    multiplier: 24
  }
]);

const SYMBOL_LABELS = Object.freeze({
  spongebob: "Spongebob",
  patrick: "Patrick",
  sandy: "Sandy",
  squidward: "Squidward",
  mrkrabs: "Mr. Krabs",
  mrspuff: "Mrs. Puff",
  gary: "Gary",
  pearl: "Pearl",
  plankton: "Plankton"
});

function toSymbolLabel(symbolId) {
  return SYMBOL_LABELS[symbolId] ?? symbolId;
}

/**
 * @param {string[]} symbols
 * @param {number} betAmount
 * @returns {PayoutInfo}
 */
export function evaluateSpinPayout(symbols, betAmount) {
  const matchedSpecial = SPECIAL_COMBOS.find(
    (combo) => combo.pattern.every((symbolId, index) => symbols[index] === symbolId)
  );

  if (matchedSpecial) {
    return {
      payout: betAmount * matchedSpecial.multiplier,
      multiplier: matchedSpecial.multiplier,
      line: matchedSpecial.label
    };
  }

  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    const symbolId = symbols[0];
    const multiplier = THREE_OF_A_KIND_MULTIPLIERS[symbolId] ?? 0;

    return {
      payout: betAmount * multiplier,
      multiplier,
      line: `Triple ${toSymbolLabel(symbolId)}`
    };
  }

  const symbolCountMap = symbols.reduce((countMap, symbolId) => {
    const nextMap = { ...countMap };
    nextMap[symbolId] = (nextMap[symbolId] ?? 0) + 1;
    return nextMap;
  }, {});

  const matchingPair = Object.entries(symbolCountMap).find(([, count]) => count === 2);

  if (matchingPair) {
    const [symbolId] = matchingPair;
    const multiplier = TWO_OF_A_KIND_MULTIPLIERS[symbolId] ?? 0;

    return {
      payout: betAmount * multiplier,
      multiplier,
      line: `Pair ${toSymbolLabel(symbolId)}`
    };
  }

  return {
    payout: 0,
    multiplier: 0,
    line: "No match"
  };
}

/**
 * @returns {{combo: string, payout: string, note: string}[]}
 */
export function getPaytableRows() {
  return [
    {
      combo: "Spongebob - Patrick - Sandy",
      payout: "24x",
      note: "Special Besties line"
    },
    { combo: "Any triple Spongebob", payout: "20x", note: "Top hit" },
    { combo: "Any triple Patrick", payout: "14x", note: "Big hit" },
    { combo: "Any triple Plankton", payout: "13x", note: "Sneaky high line" },
    { combo: "Any triple Sandy", payout: "12x", note: "Strong line" },
    { combo: "Any triple Mr. Krabs", payout: "11x", note: "Cash-heavy line" },
    { combo: "Any triple Squidward", payout: "10x", note: "Solid line" },
    { combo: "Any triple Pearl", payout: "9x", note: "Good line" },
    { combo: "Any triple Mrs. Puff", payout: "8x", note: "Steady line" },
    { combo: "Any triple Gary", payout: "7x", note: "Small triple" },
    { combo: "Any pair Spongebob", payout: "3x", note: "Best pair" },
    { combo: "Any pair Patrick/Sandy/Squidward/Mr. Krabs/Plankton", payout: "2x", note: "Medium pair" },
    { combo: "Any pair Gary/Pearl/Mrs. Puff", payout: "1x", note: "Break-even pair" }
  ];
}

/**
 * @param {string[]} symbols
 * @returns {number}
 */
function getMultiplierForCombo(symbols) {
  return evaluateSpinPayout(symbols, 1).multiplier;
}

/**
 * Brute-force theoretical RTP from reel distributions and payout rules.
 */
export function getFairnessReport() {
  const reelDistributions = getReelDistributions();

  const reelEntries = reelDistributions.map((distribution) =>
    Object.entries(distribution.counts).map(([symbolId, count]) => ({
      symbolId,
      probability: count / distribution.totalStops
    }))
  );

  let expectedReturn = 0;
  let hitRate = 0;

  reelEntries[0].forEach((left) => {
    reelEntries[1].forEach((center) => {
      reelEntries[2].forEach((right) => {
        const probability = left.probability * center.probability * right.probability;
        const multiplier = getMultiplierForCombo([left.symbolId, center.symbolId, right.symbolId]);

        expectedReturn += probability * multiplier;
        if (multiplier > 0) {
          hitRate += probability;
        }
      });
    });
  });

  return {
    rtpPercent: expectedReturn * 100,
    hitRatePercent: hitRate * 100,
    note: "Outcomes use browser crypto randomness when available, with weighted reel stops."
  };
}
