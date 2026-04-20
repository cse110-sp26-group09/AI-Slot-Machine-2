/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from "crypto";
import { APP_CONFIG, SYMBOLS, SYMBOL_IDS } from "./config.js";

const EMPTY_MARKER = "__EMPTY__";

const symbolById = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));
const weightedSymbols = SYMBOLS.map((symbol) => ({
  id: symbol.id,
  weight: symbol.weight
}));

const totalWeight = weightedSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);

const createEmptyGrid = () =>
  Array.from({ length: APP_CONFIG.game.gridRows }, () =>
    Array.from({ length: APP_CONFIG.game.gridCols }, () => SYMBOL_IDS.DISRUPTION)
  );

const cloneGrid = (grid) => grid.map((row) => row.slice());

const pickWeightedSymbol = () => {
  const roll = crypto.randomInt(totalWeight);
  let cursor = 0;

  for (const symbol of weightedSymbols) {
    cursor += symbol.weight;
    if (roll < cursor) {
      return symbol.id;
    }
  }

  return weightedSymbols[weightedSymbols.length - 1].id;
};

const generateGrid = () => {
  const grid = createEmptyGrid();

  for (let row = 0; row < APP_CONFIG.game.gridRows; row += 1) {
    for (let col = 0; col < APP_CONFIG.game.gridCols; col += 1) {
      grid[row][col] = pickWeightedSymbol();
    }
  }

  return grid;
};

const resolveLineBaseSymbol = (lineSymbols) => {
  for (const symbolId of lineSymbols) {
    if (symbolId === SYMBOL_IDS.PROMPT_SCATTER) {
      return null;
    }

    if (symbolId !== SYMBOL_IDS.HALLUCINATION_WILD) {
      return symbolId;
    }
  }

  return SYMBOL_IDS.HALLUCINATION_WILD;
};

const evaluatePayline = ({ grid, lineIndex, linePattern, bet, multiplier }) => {
  const lineSymbols = linePattern.map((rowIndex, colIndex) => grid[rowIndex][colIndex]);
  const baseSymbol = resolveLineBaseSymbol(lineSymbols);

  if (!baseSymbol) {
    return null;
  }

  let matchCount = 0;

  for (const symbolId of lineSymbols) {
    const isWild = symbolId === SYMBOL_IDS.HALLUCINATION_WILD;
    const isScatter = symbolId === SYMBOL_IDS.PROMPT_SCATTER;
    if (isScatter) {
      break;
    }

    if (isWild || symbolId === baseSymbol) {
      matchCount += 1;
      continue;
    }

    break;
  }

  const symbol = symbolById.get(baseSymbol);
  const payoutMultiplier = symbol?.payout?.[matchCount] ?? 0;
  if (payoutMultiplier <= 0) {
    return null;
  }

  const payout = bet * payoutMultiplier * multiplier * APP_CONFIG.game.rtp;
  const coordinates = Array.from({ length: matchCount }, (_, index) => ({
    row: linePattern[index],
    col: index
  }));

  return {
    lineIndex,
    symbolId: baseSymbol,
    symbolLabel: symbol.label,
    count: matchCount,
    payoutMultiplier,
    payout,
    coordinates
  };
};

const evaluateGridLines = ({ grid, bet, multiplier }) => {
  const lineWins = [];
  let totalLineWin = 0;
  let gpt5FiveOfKindHit = false;
  const winningCoordinateSet = new Set();

  for (let index = 0; index < APP_CONFIG.game.paylines.length; index += 1) {
    const linePattern = APP_CONFIG.game.paylines[index];
    const win = evaluatePayline({
      grid,
      lineIndex: index,
      linePattern,
      bet,
      multiplier
    });

    if (!win) {
      continue;
    }

    totalLineWin += win.payout;
    lineWins.push(win);

    if (
      win.symbolId === SYMBOL_IDS.GPT5 &&
      win.count === APP_CONFIG.game.gridCols
    ) {
      gpt5FiveOfKindHit = true;
    }

    for (const coordinate of win.coordinates) {
      winningCoordinateSet.add(`${coordinate.row}:${coordinate.col}`);
    }
  }

  return {
    lineWins,
    totalLineWin,
    gpt5FiveOfKindHit,
    winningCoordinates: [...winningCoordinateSet].map((value) => {
      const [row, col] = value.split(":");
      return { row: Number(row), col: Number(col) };
    })
  };
};

const evaluateScatter = ({ grid, bet, multiplier }) => {
  let scatterCount = 0;
  for (let row = 0; row < APP_CONFIG.game.gridRows; row += 1) {
    for (let col = 0; col < APP_CONFIG.game.gridCols; col += 1) {
      if (grid[row][col] === SYMBOL_IDS.PROMPT_SCATTER) {
        scatterCount += 1;
      }
    }
  }

  const scatterSymbol = symbolById.get(SYMBOL_IDS.PROMPT_SCATTER);
  const scatterMultiplier = scatterSymbol.payout[scatterCount] ?? 0;
  const scatterWin = bet * scatterMultiplier * multiplier * APP_CONFIG.game.rtp;
  const freeSpinsAwarded =
    scatterCount >= 3 ? APP_CONFIG.game.freeSpinsAwarded : 0;

  return {
    scatterCount,
    scatterWin,
    freeSpinsAwarded
  };
};

const collapseGrid = ({ grid, winningCoordinates }) => {
  const maskedGrid = cloneGrid(grid);

  for (const coordinate of winningCoordinates) {
    maskedGrid[coordinate.row][coordinate.col] = EMPTY_MARKER;
  }

  for (let col = 0; col < APP_CONFIG.game.gridCols; col += 1) {
    const keptSymbols = [];
    for (let row = APP_CONFIG.game.gridRows - 1; row >= 0; row -= 1) {
      if (maskedGrid[row][col] !== EMPTY_MARKER) {
        keptSymbols.push(maskedGrid[row][col]);
      }
    }

    for (let row = APP_CONFIG.game.gridRows - 1; row >= 0; row -= 1) {
      const fillIndex = APP_CONFIG.game.gridRows - 1 - row;
      if (fillIndex < keptSymbols.length) {
        maskedGrid[row][col] = keptSymbols[fillIndex];
      } else {
        maskedGrid[row][col] = pickWeightedSymbol();
      }
    }
  }

  return maskedGrid;
};

const enforceNearMissPattern = (grid) => {
  const adjusted = cloneGrid(grid);
  const targetRow = 1;
  const missColumn = 2;

  adjusted[targetRow][0] = SYMBOL_IDS.GPT5;
  adjusted[targetRow][1] = SYMBOL_IDS.GPT5;

  const disallowed = new Set([
    SYMBOL_IDS.GPT5,
    SYMBOL_IDS.HALLUCINATION_WILD,
    SYMBOL_IDS.PROMPT_SCATTER
  ]);

  let replacement = pickWeightedSymbol();
  while (disallowed.has(replacement)) {
    replacement = pickWeightedSymbol();
  }

  adjusted[targetRow][missColumn] = replacement;
  return adjusted;
};

const roundCurrency = (value) => {
  const precision = 100;
  return Math.round(value * precision) / precision;
};

const pickWinMessage = ({ totalWin, jackpotWon, freeSpinsAwarded }) => {
  if (jackpotWon > 0) {
    return "You've achieved AGI... of profits.";
  }

  if (freeSpinsAwarded > 0) {
    return "Prompt engineering paid off. Free spins unlocked.";
  }

  if (totalWin > 0) {
    return "Synergy detected. Shareholder optimism intensifies.";
  }

  return "No product-market fit this spin. Please pivot.";
};

export const spinOutcome = ({
  bet,
  multiplier,
  jackpotPoolBefore
}) => {
  let grid = generateGrid();
  let roundIndex = 0;
  let totalLineWin = 0;
  let totalScatterWin = 0;
  let gpt5FiveOfKindHit = false;
  let scatterCount = 0;
  let freeSpinsAwarded = 0;

  const rounds = [];

  while (roundIndex <= APP_CONFIG.game.maxCascadeCount) {
    const lineResult = evaluateGridLines({ grid, bet, multiplier });
    const scatterResult =
      roundIndex === 0
        ? evaluateScatter({ grid, bet, multiplier })
        : { scatterCount: 0, scatterWin: 0, freeSpinsAwarded: 0 };

    totalLineWin += lineResult.totalLineWin;
    totalScatterWin += scatterResult.scatterWin;
    scatterCount = scatterResult.scatterCount || scatterCount;
    freeSpinsAwarded += scatterResult.freeSpinsAwarded;
    gpt5FiveOfKindHit = gpt5FiveOfKindHit || lineResult.gpt5FiveOfKindHit;

    rounds.push({
      roundIndex,
      grid: cloneGrid(grid),
      lineWins: lineResult.lineWins,
      roundLineWin: roundCurrency(lineResult.totalLineWin),
      winningCoordinates: lineResult.winningCoordinates
    });

    if (lineResult.winningCoordinates.length === 0) {
      break;
    }

    grid = collapseGrid({
      grid,
      winningCoordinates: lineResult.winningCoordinates
    });
    roundIndex += 1;
  }

  const baseTotalWin = roundCurrency(totalLineWin + totalScatterWin);
  let nearMiss = false;
  let displayGrid = rounds[0]?.grid ? cloneGrid(rounds[0].grid) : generateGrid();

  if (baseTotalWin <= 0) {
    const chanceRoll = crypto.randomInt(10000) / 10000;
    if (chanceRoll <= APP_CONFIG.game.nearMissFrequency) {
      nearMiss = true;
      displayGrid = enforceNearMissPattern(displayGrid);
      if (rounds.length > 0) {
        rounds[0].grid = cloneGrid(displayGrid);
      }
    }
  }

  const jackpotWon = gpt5FiveOfKindHit ? jackpotPoolBefore : 0;
  const jackpotPoolAfter = gpt5FiveOfKindHit
    ? APP_CONFIG.game.jackpotSeed
    : jackpotPoolBefore;

  const totalWin = roundCurrency(baseTotalWin + jackpotWon);

  return {
    rounds,
    scatterCount,
    freeSpinsAwarded,
    totalWin,
    jackpotWon: roundCurrency(jackpotWon),
    jackpotPoolAfter: roundCurrency(jackpotPoolAfter),
    nearMiss,
    message: pickWinMessage({ totalWin, jackpotWon, freeSpinsAwarded })
  };
};

const toSignatureBuffer = (signature) => Buffer.from(signature, "hex");

export const signSerialized = ({ serialized, secret }) =>
  crypto.createHmac("sha256", secret).update(serialized).digest("hex");

export const createSignedPayload = ({ payload, secret }) => {
  const serialized = JSON.stringify(payload);
  const signature = signSerialized({ serialized, secret });
  return { payload, serialized, signature };
};

export const verifySerializedSignature = ({ serialized, signature, secret }) => {
  const expected = signSerialized({ serialized, secret });
  const expectedBuffer = toSignatureBuffer(expected);
  const signatureBuffer = toSignatureBuffer(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};
