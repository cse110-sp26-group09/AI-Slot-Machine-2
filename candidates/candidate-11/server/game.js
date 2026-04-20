/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

﻿import crypto from "node:crypto";
import { CONFIG } from "./config.js";
import { signClientPayload } from "./session.js";

const { GRID, SYMBOLS, SPECIAL_SYMBOLS, LIMITS, NEAR_MISS, HUMOR, RTP, XP } = CONFIG;
const SYMBOL_MAP = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
const FIRST_REEL_INDEX = 0;
const SECOND_REEL_INDEX = 1;
const THIRD_REEL_INDEX = 2;
const CHANCE_SCALE = 10000;

const roundCurrency = (value) => Number(value.toFixed(LIMITS.MONEY_DECIMALS));

const randomIndex = (maxExclusive) => crypto.randomInt(maxExclusive);

const randomFrom = (items) => items[randomIndex(items.length)];

const hitChance = (frequency) => {
  const boundedFrequency = Math.max(0, Math.min(1, frequency));
  const threshold = Math.floor(boundedFrequency * CHANCE_SCALE);
  return randomIndex(CHANCE_SCALE) < threshold;
};

const chooseSymbolByWeight = () => {
  const stopValue = randomIndex(TOTAL_WEIGHT);
  let cursor = 0;

  for (const symbol of SYMBOLS) {
    cursor += symbol.weight;
    if (stopValue < cursor) {
      return symbol.id;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1].id;
};

const buildEmptyGrid = () => {
  return Array.from({ length: GRID.ROWS }, () => Array.from({ length: GRID.REELS }, () => ""));
};

const cloneGrid = (grid) => grid.map((row) => [...row]);

const createRandomGrid = () => {
  const grid = buildEmptyGrid();

  for (let rowIndex = 0; rowIndex < GRID.ROWS; rowIndex += 1) {
    for (let reelIndex = 0; reelIndex < GRID.REELS; reelIndex += 1) {
      grid[rowIndex][reelIndex] = chooseSymbolByWeight();
    }
  }

  return grid;
};

const collectScatterCount = (grid) => {
  let scatterCount = 0;

  for (let rowIndex = 0; rowIndex < GRID.ROWS; rowIndex += 1) {
    for (let reelIndex = 0; reelIndex < GRID.REELS; reelIndex += 1) {
      if (grid[rowIndex][reelIndex] === SPECIAL_SYMBOLS.SCATTER) {
        scatterCount += 1;
      }
    }
  }

  return scatterCount;
};

const resolveLineCandidate = (lineSymbols) => {
  for (const symbolId of lineSymbols) {
    if (symbolId === SPECIAL_SYMBOLS.WILD) {
      continue;
    }

    if (symbolId === SPECIAL_SYMBOLS.SCATTER) {
      return null;
    }

    return symbolId;
  }

  return SPECIAL_SYMBOLS.WILD;
};

const evaluateLine = ({ lineSymbols, lineIndex, lineRows, betAmount, multiplier }) => {
  const candidateId = resolveLineCandidate(lineSymbols);

  if (!candidateId) {
    return null;
  }

  let matchCount = 0;

  for (let reelIndex = 0; reelIndex < GRID.REELS; reelIndex += 1) {
    const symbolId = lineSymbols[reelIndex];

    if (symbolId === SPECIAL_SYMBOLS.SCATTER) {
      break;
    }

    if (candidateId === SPECIAL_SYMBOLS.WILD && symbolId === SPECIAL_SYMBOLS.WILD) {
      matchCount += 1;
      continue;
    }

    if (candidateId !== SPECIAL_SYMBOLS.WILD && (symbolId === candidateId || symbolId === SPECIAL_SYMBOLS.WILD)) {
      matchCount += 1;
      continue;
    }

    break;
  }

  if (matchCount < 3) {
    return null;
  }

  const payoutMultiplier = SYMBOL_MAP.get(candidateId)?.payout?.[matchCount];

  if (!payoutMultiplier) {
    return null;
  }

  const winValue = roundCurrency(betAmount * payoutMultiplier * multiplier * RTP);
  const positions = [];

  for (let reelIndex = 0; reelIndex < matchCount; reelIndex += 1) {
    positions.push({ row: lineRows[reelIndex], reel: reelIndex });
  }

  const jackpotTriggered =
    candidateId === SPECIAL_SYMBOLS.JACKPOT &&
    matchCount === GRID.REELS &&
    positions.every(({ row, reel }) => {
      const symbolId = lineSymbols[reel];
      return symbolId === SPECIAL_SYMBOLS.JACKPOT || symbolId === SPECIAL_SYMBOLS.WILD;
    });

  return {
    lineIndex,
    symbolId: candidateId,
    count: matchCount,
    winValue,
    positions,
    jackpotTriggered
  };
};

const evaluateGrid = ({ grid, betAmount, multiplier }) => {
  const lineWins = [];
  const winPositionMap = new Map();

  for (let lineIndex = 0; lineIndex < GRID.PAYLINES.length; lineIndex += 1) {
    const lineRows = GRID.PAYLINES[lineIndex];
    const lineSymbols = lineRows.map((rowIndex, reelIndex) => grid[rowIndex][reelIndex]);

    const evaluatedLine = evaluateLine({
      lineSymbols,
      lineIndex,
      lineRows,
      betAmount,
      multiplier
    });

    if (!evaluatedLine) {
      continue;
    }

    lineWins.push(evaluatedLine);

    for (const position of evaluatedLine.positions) {
      winPositionMap.set(`${position.row}:${position.reel}`, position);
    }
  }

  const scatterCount = collectScatterCount(grid);
  const scatterSymbol = SYMBOL_MAP.get(SPECIAL_SYMBOLS.SCATTER);
  const scatterPayoutMultiplier = scatterSymbol?.payout?.[scatterCount] ?? 0;
  const scatterWin = roundCurrency(betAmount * scatterPayoutMultiplier * multiplier * RTP);
  const totalLineWin = lineWins.reduce((sum, lineWin) => sum + lineWin.winValue, 0);

  return {
    lineWins,
    scatterCount,
    scatterWin,
    totalWin: roundCurrency(totalLineWin + scatterWin),
    winPositions: Array.from(winPositionMap.values())
  };
};

const collapseGrid = ({ grid, removedPositions }) => {
  const mutableGrid = cloneGrid(grid);

  for (const position of removedPositions) {
    mutableGrid[position.row][position.reel] = null;
  }

  for (let reelIndex = 0; reelIndex < GRID.REELS; reelIndex += 1) {
    const compactedSymbols = [];

    for (let rowIndex = GRID.ROWS - 1; rowIndex >= 0; rowIndex -= 1) {
      const symbolId = mutableGrid[rowIndex][reelIndex];
      if (symbolId) {
        compactedSymbols.push(symbolId);
      }
    }

    while (compactedSymbols.length < GRID.ROWS) {
      compactedSymbols.push(chooseSymbolByWeight());
    }

    for (let rowIndex = GRID.ROWS - 1; rowIndex >= 0; rowIndex -= 1) {
      const targetIndex = GRID.ROWS - 1 - rowIndex;
      mutableGrid[rowIndex][reelIndex] = compactedSymbols[targetIndex];
    }
  }

  return mutableGrid;
};

const maybeInjectNearMiss = ({ grid, hasWin }) => {
  const shouldInjectNearMiss = !hasWin && hitChance(NEAR_MISS.FREQUENCY);

  if (!shouldInjectNearMiss) {
    return { grid, nearMiss: false };
  }

  const nearMissGrid = cloneGrid(grid);
  const scatterTargetCount = NEAR_MISS.TARGET_SCATTERS;

  for (let targetIndex = 0; targetIndex < scatterTargetCount; targetIndex += 1) {
    const reelIndex = targetIndex === 0 ? FIRST_REEL_INDEX : SECOND_REEL_INDEX;
    const rowIndex = randomIndex(GRID.ROWS);
    nearMissGrid[rowIndex][reelIndex] = SPECIAL_SYMBOLS.SCATTER;
  }

  const blockerRow = randomIndex(GRID.ROWS);
  const blockerCurrent = nearMissGrid[blockerRow][THIRD_REEL_INDEX];
  if (blockerCurrent === SPECIAL_SYMBOLS.SCATTER) {
    const fallbackSymbol = SYMBOLS.find(
      (symbol) => symbol.id !== SPECIAL_SYMBOLS.SCATTER && symbol.id !== SPECIAL_SYMBOLS.WILD
    )?.id;
    nearMissGrid[blockerRow][THIRD_REEL_INDEX] = fallbackSymbol ?? SYMBOLS[0].id;
  }

  const nearMissScatterCount = collectScatterCount(nearMissGrid);
  const nearMiss = nearMissScatterCount === scatterTargetCount;

  return {
    grid: nearMissGrid,
    nearMiss
  };
};

const resolveTier = (xpValue) => {
  let resolvedTier = XP.TIER_SEQUENCE[0];

  for (const tier of XP.TIER_SEQUENCE) {
    if (xpValue >= XP.TIER_THRESHOLDS[tier]) {
      resolvedTier = tier;
    }
  }

  return resolvedTier;
};

const chooseHumorLine = ({ netDelta, totalWin }) => {
  if (netDelta <= 0) {
    return randomFrom(HUMOR.LOSS_LINES);
  }

  if (totalWin >= LIMITS.BET_MAX * 5) {
    return randomFrom(HUMOR.BIG_WIN_LINES);
  }

  return randomFrom(HUMOR.SMALL_WIN_LINES);
};

export const normalizeBet = (rawBet) => {
  const numericBet = Number(rawBet);

  if (!Number.isFinite(numericBet)) {
    return null;
  }

  if (numericBet < LIMITS.BET_MIN || numericBet > LIMITS.BET_MAX) {
    return null;
  }

  const steps = Math.round((numericBet - LIMITS.BET_MIN) / LIMITS.BET_STEP);
  const normalizedBet = roundCurrency(LIMITS.BET_MIN + steps * LIMITS.BET_STEP);

  if (normalizedBet < LIMITS.BET_MIN || normalizedBet > LIMITS.BET_MAX) {
    return null;
  }

  return normalizedBet;
};

export const runSpin = ({ betAmount, sessionState, jackpotPool }) => {
  const isFreeSpin = sessionState.freeSpinsRemaining > 0;
  const multiplier = isFreeSpin ? LIMITS.FREE_SPIN_MULTIPLIER : 1;
  const stakeCost = isFreeSpin ? 0 : betAmount;
  const jackpotFeed = isFreeSpin ? 0 : roundCurrency(betAmount * LIMITS.JACKPOT_FEED_RATIO);

  if (isFreeSpin) {
    sessionState.freeSpinsRemaining -= 1;
  }

  let workingGrid = createRandomGrid();
  let cascadeIndex = 0;
  let aggregateWin = 0;
  let jackpotTriggered = false;
  let maxScatterCount = 0;
  const cascadeEvents = [];

  while (cascadeIndex < LIMITS.MAX_CASCADES) {
    let evaluation = evaluateGrid({
      grid: workingGrid,
      betAmount,
      multiplier
    });

    if (cascadeIndex === 0 && evaluation.totalWin === 0) {
      const nearMissAttempt = maybeInjectNearMiss({ grid: workingGrid, hasWin: false });
      workingGrid = nearMissAttempt.grid;
      evaluation = evaluateGrid({
        grid: workingGrid,
        betAmount,
        multiplier
      });
    }

    maxScatterCount = Math.max(maxScatterCount, evaluation.scatterCount);

    if (evaluation.totalWin <= 0) {
      break;
    }

    aggregateWin = roundCurrency(aggregateWin + evaluation.totalWin);
    jackpotTriggered = jackpotTriggered || evaluation.lineWins.some((lineWin) => lineWin.jackpotTriggered);

    const cascadeEvent = {
      cascadeIndex,
      grid: cloneGrid(workingGrid),
      winPositions: evaluation.winPositions,
      lineWins: evaluation.lineWins,
      scatterCount: evaluation.scatterCount,
      scatterWin: evaluation.scatterWin,
      totalWin: evaluation.totalWin
    };

    if (evaluation.winPositions.length === 0) {
      cascadeEvents.push(cascadeEvent);
      break;
    }

    const collapsedGrid = collapseGrid({
      grid: workingGrid,
      removedPositions: evaluation.winPositions
    });

    cascadeEvent.nextGrid = cloneGrid(collapsedGrid);
    cascadeEvents.push(cascadeEvent);
    workingGrid = collapsedGrid;
    cascadeIndex += 1;
  }

  const nearMiss = aggregateWin === 0 && maxScatterCount === NEAR_MISS.TARGET_SCATTERS;
  const freeSpinsAwarded = maxScatterCount >= 3 ? LIMITS.FREE_SPINS_AWARDED : 0;

  if (freeSpinsAwarded > 0) {
    sessionState.freeSpinsRemaining += freeSpinsAwarded;
  }

  const jackpotWin = jackpotTriggered ? jackpotPool : 0;
  const totalWin = roundCurrency(aggregateWin + jackpotWin);
  const netDelta = roundCurrency(totalWin - stakeCost);
  const nextJackpotPool = jackpotTriggered
    ? LIMITS.JACKPOT_START_POOL
    : roundCurrency(jackpotPool + jackpotFeed);

  sessionState.balance = roundCurrency(sessionState.balance + netDelta);
  sessionState.totalWagered = roundCurrency(sessionState.totalWagered + stakeCost);
  sessionState.totalWon = roundCurrency(sessionState.totalWon + totalWin);
  sessionState.sessionSpend = roundCurrency(sessionState.sessionSpend + stakeCost - totalWin);
  sessionState.xp = roundCurrency(sessionState.xp + XP.PER_SPIN + totalWin * XP.PER_WIN_UNIT);
  sessionState.tier = resolveTier(sessionState.xp);

  const payload = {
    gridRows: GRID.ROWS,
    gridReels: GRID.REELS,
    betAmount,
    stakeCost,
    multiplier,
    totalWin,
    netDelta,
    isNetLoss: netDelta <= 0,
    nearMiss,
    jackpotFeed,
    jackpotTriggered,
    jackpotWin,
    jackpotPool: nextJackpotPool,
    freeSpinsAwarded,
    freeSpinsRemaining: sessionState.freeSpinsRemaining,
    balance: sessionState.balance,
    sessionSpend: sessionState.sessionSpend,
    xp: sessionState.xp,
    tier: sessionState.tier,
    winMessage: chooseHumorLine({ netDelta, totalWin }),
    cascades: cascadeEvents,
    finalGrid: cloneGrid(workingGrid),
    generatedAt: Date.now()
  };

  return {
    payload,
    nextJackpotPool
  };
};

export const signPayloadForClient = ({ payload, clientVerifyKey }) => {
  const payloadString = JSON.stringify(payload);
  const signature = signClientPayload({ payloadString, clientVerifyKey });

  return {
    payloadString,
    signature
  };
};
