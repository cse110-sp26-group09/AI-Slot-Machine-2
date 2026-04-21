import { getAllSymbols, getSymbolById, getSymbolProbabilities } from './reels.js';

const WILD_SYMBOL_ID = 'plankton';

const TRIPLE_PAYOUTS = Object.freeze({
  [WILD_SYMBOL_ID]: 20,
  spongebob: 14,
  patrick: 12,
  mrcrabs: 10,
  squidward: 9,
  sandy: 8,
  gary: 7,
  pearl: 6,
  mrspuff: 5
});

const PAIR_PAYOUTS = Object.freeze({
  spongebob: 2,
  patrick: 2,
  mrcrabs: 2,
  squidward: 1,
  sandy: 1
});

const SORTED_TRIPLE_SYMBOLS = Object.entries(TRIPLE_PAYOUTS)
  .sort((left, right) => right[1] - left[1])
  .map(([symbolId]) => symbolId);

const SORTED_PAIR_SYMBOLS = Object.entries(PAIR_PAYOUTS)
  .sort((left, right) => right[1] - left[1])
  .map(([symbolId]) => symbolId);

/**
 * @param {string[]} reels
 * @returns {boolean}
 */
function isAllWild(reels) {
  return reels.every((symbolId) => symbolId === WILD_SYMBOL_ID);
}

/**
 * @param {string[]} reels
 * @param {string} targetId
 * @returns {number}
 */
function countMatchingOrWild(reels, targetId) {
  return reels.reduce(
    (count, symbolId) => count + Number(symbolId === targetId || symbolId === WILD_SYMBOL_ID),
    0
  );
}

/**
 * @param {string[]} reels
 * @returns {boolean}
 */
function isExactThreeOfAKind(reels) {
  return reels.length === 3 && reels.every((symbolId) => symbolId === reels[0]);
}

/**
 * @param {string[]} reels
 * @returns {{symbolId: string, multiplier: number, kind: string}|null}
 */
function findBestRule(reels) {
  if (isAllWild(reels)) {
    return {
      symbolId: WILD_SYMBOL_ID,
      multiplier: TRIPLE_PAYOUTS[WILD_SYMBOL_ID],
      kind: 'triple'
    };
  }

  for (const symbolId of SORTED_TRIPLE_SYMBOLS) {
    if (symbolId === WILD_SYMBOL_ID) {
      continue;
    }

    if (countMatchingOrWild(reels, symbolId) === reels.length) {
      return {
        symbolId,
        multiplier: TRIPLE_PAYOUTS[symbolId],
        kind: 'triple'
      };
    }
  }

  for (const symbolId of SORTED_PAIR_SYMBOLS) {
    if (countMatchingOrWild(reels, symbolId) >= 2) {
      return {
        symbolId,
        multiplier: PAIR_PAYOUTS[symbolId],
        kind: 'pair'
      };
    }
  }

  return null;
}

/**
 * Calculates payout outcome for one spin.
 * @param {string[]} reels
 * @param {number} bet
 * @returns {{
 *  payout:number,
 *  multiplier:number,
 *  result:'win'|'push'|'loss',
 *  isJackpot:boolean,
 *  ruleLabel:string
 * }}
 */
export function evaluateSpin(reels, bet) {
  const safeBet = Number.isFinite(bet) && bet > 0 ? Math.floor(bet) : 1;
  const matchRule = findBestRule(reels);

  if (!matchRule) {
    return {
      payout: 0,
      multiplier: 0,
      result: 'loss',
      isJackpot: false,
      ruleLabel: 'No payout this spin.'
    };
  }

  const payout = safeBet * matchRule.multiplier;
  const symbolLabel = getSymbolById(matchRule.symbolId)?.label ?? matchRule.symbolId.toUpperCase();
  const result = payout > safeBet ? 'win' : payout === safeBet ? 'push' : 'loss';
  const isJackpot = matchRule.kind === 'triple' && isExactThreeOfAKind(reels);

  if (matchRule.kind === 'triple') {
    return {
      payout,
      multiplier: matchRule.multiplier,
      result,
      isJackpot,
      ruleLabel: `3 ${symbolLabel} = ${matchRule.multiplier}x bet`
    };
  }

  return {
    payout,
    multiplier: matchRule.multiplier,
    result,
    isJackpot: false,
    ruleLabel: `2 ${symbolLabel} (Plankton WILD substitutes) = ${matchRule.multiplier}x bet`
  };
}

/**
 * Paytable rows used for UI rendering.
 * @returns {Array<{combination:string, payout:string}>}
 */
export function getPaytableRows() {
  const rows = [
    {
      combination: '3 Plankton WILD',
      payout: `${TRIPLE_PAYOUTS[WILD_SYMBOL_ID]}x`
    }
  ];

  for (const symbolId of SORTED_TRIPLE_SYMBOLS) {
    if (symbolId === WILD_SYMBOL_ID) {
      continue;
    }

    const symbol = getSymbolById(symbolId);
    rows.push({
      combination: `3 ${symbol?.label ?? symbolId.toUpperCase()} (WILD substitutes)`,
      payout: `${TRIPLE_PAYOUTS[symbolId]}x`
    });
  }

  for (const symbolId of SORTED_PAIR_SYMBOLS) {
    const symbol = getSymbolById(symbolId);
    rows.push({
      combination: `2 ${symbol?.label ?? symbolId.toUpperCase()} (WILD substitutes)`,
      payout: `${PAIR_PAYOUTS[symbolId]}x`
    });
  }

  return rows;
}

/**
 * Computes exact RTP by enumerating all reel combinations.
 * @returns {{rtpPercent:number, houseEdgePercent:number, method:string, randomSource:string}}
 */
export function getFairnessReport() {
  const probabilities = getSymbolProbabilities();
  const allSymbols = getAllSymbols();
  const probabilityById = new Map(probabilities.map((entry) => [entry.id, entry.probability]));

  let expectedReturn = 0;

  for (const first of allSymbols) {
    for (const second of allSymbols) {
      for (const third of allSymbols) {
        const reels = [first.id, second.id, third.id];
        const outcome = evaluateSpin(reels, 1);
        const probability =
          (probabilityById.get(first.id) ?? 0) *
          (probabilityById.get(second.id) ?? 0) *
          (probabilityById.get(third.id) ?? 0);

        expectedReturn += probability * outcome.payout;
      }
    }
  }

  const rtpPercent = Number((expectedReturn * 100).toFixed(2));
  const houseEdgePercent = Number((100 - rtpPercent).toFixed(2));

  return {
    rtpPercent,
    houseEdgePercent,
    method: 'Exact enumeration of all weighted 3-reel outcomes',
    randomSource: 'window.crypto.getRandomValues'
  };
}
