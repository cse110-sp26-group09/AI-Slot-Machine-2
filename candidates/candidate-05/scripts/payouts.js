/**
 * @fileoverview Payout and fairness calculations for spin outcomes.
 * @typedef {{payout: number, multiplier: number, line: string}} PayoutInfo
 */
import { getReelDistributions } from "./reels.js";

const THREE_OF_A_KIND_MULTIPLIERS = Object.freeze({
  gpt: 18,
  token: 12,
  prompt: 10,
  vector: 8,
  credit: 6,
  cache: 5,
  bug: 9
});

const TWO_OF_A_KIND_MULTIPLIERS = Object.freeze({
  gpt: 3,
  token: 2,
  prompt: 2,
  vector: 2,
  credit: 1,
  cache: 1,
  bug: 2
});

const SPECIAL_COMBOS = Object.freeze([
  {
    id: "full-stack",
    pattern: ["gpt", "token", "prompt"],
    label: "Full Stack Inference",
    multiplier: 25
  }
]);

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
      line: `Triple ${symbolId.toUpperCase()}`
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
      line: `Pair ${symbolId.toUpperCase()}`
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
    { combo: "GPT TOKEN PROMPT", payout: "25x", note: "Special sequence" },
    { combo: "Any triple GPT", payout: "18x", note: "Top classic hit" },
    { combo: "Any triple TOKEN", payout: "12x", note: "High-value line" },
    { combo: "Any triple PROMPT", payout: "10x", note: "Strong line" },
    { combo: "Any triple VECTOR", payout: "8x", note: "Good line" },
    { combo: "Any triple BUG", payout: "9x", note: "Satire bonus" },
    { combo: "Any triple CREDIT", payout: "6x", note: "Stable return" },
    { combo: "Any triple CACHE", payout: "5x", note: "Small hit" },
    { combo: "Any pair GPT", payout: "3x", note: "Solid pair" },
    { combo: "Any pair TOKEN/PROMPT/VECTOR/BUG", payout: "2x", note: "Medium pair" },
    { combo: "Any pair CREDIT/CACHE", payout: "1x", note: "Break-even pair" }
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
    note: "Outcomes are sampled with browser crypto randomness when available."
  };
}
