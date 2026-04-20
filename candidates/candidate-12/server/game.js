import crypto from 'crypto';
import { CONFIG } from './config.js';
import { getTierFromXp } from './session.js';

const SYMBOLS_BY_ID = new Map(CONFIG.GAME.SYMBOLS.map((symbol) => [symbol.id, symbol]));
const WEIGHTED_SYMBOL_TOTAL = CONFIG.GAME.SYMBOLS.reduce((total, symbol) => total + symbol.weight, 0);
const SAFE_CURRENCY_DECIMALS = 2;
const gameRuntimeState = {
  jackpotPool: CONFIG.GAME.JACKPOT.SEED_POOL
};

function roundCurrency(value) {
  return Number(value.toFixed(SAFE_CURRENCY_DECIMALS));
}

function randomUnit() {
  const granularity = 1000000;
  return crypto.randomInt(granularity) / granularity;
}

function randomSymbolId(excludedIds = []) {
  const excluded = new Set(excludedIds);
  let roll = crypto.randomInt(WEIGHTED_SYMBOL_TOTAL);

  for (const symbol of CONFIG.GAME.SYMBOLS) {
    roll -= symbol.weight;
    if (roll < 0) {
      if (!excluded.has(symbol.id)) {
        return symbol.id;
      }
      return randomSymbolId(excludedIds);
    }
  }

  return CONFIG.GAME.SYMBOLS[0].id;
}

function createGrid() {
  const rows = CONFIG.GAME.GRID_ROWS;
  const reels = CONFIG.GAME.GRID_REELS;
  const grid = [];

  for (let row = 0; row < rows; row += 1) {
    const rowValues = [];
    for (let reel = 0; reel < reels; reel += 1) {
      rowValues.push(randomSymbolId());
    }
    grid.push(rowValues);
  }

  return grid;
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function generateGridWithNearMiss() {
  const grid = createGrid();
  const middleRow = Math.floor(CONFIG.GAME.GRID_ROWS / 2);
  const firstReel = 0;
  const secondReel = 1;
  const thirdReel = 2;

  grid[middleRow][firstReel] = 'GPT5';
  grid[middleRow][secondReel] = 'GPT5';
  grid[middleRow][thirdReel] = randomSymbolId(['GPT5', 'WILD']);

  return grid;
}

function countScatter(grid) {
  let count = 0;
  for (const row of grid) {
    for (const id of row) {
      if (id === 'SCATTER') {
        count += 1;
      }
    }
  }
  return count;
}

function resolveWinningRun(lineSymbols) {
  let target = null;
  let count = 0;

  for (const symbolId of lineSymbols) {
    if (symbolId === 'SCATTER') {
      break;
    }

    if (symbolId === 'WILD') {
      count += 1;
      continue;
    }

    if (target === null) {
      target = symbolId;
      count += 1;
      continue;
    }

    if (symbolId === target) {
      count += 1;
      continue;
    }

    break;
  }

  if (target === null && count > 0) {
    target = 'GPT5';
  }

  return { target, count };
}

function evaluatePaylines(grid, betAmount, payoutMultiplier) {
  const lineWins = [];
  const winningPositions = [];
  let total = 0;

  CONFIG.GAME.PAYLINES.forEach((line, lineIndex) => {
    const lineSymbols = line.map((rowIndex, reelIndex) => grid[rowIndex][reelIndex]);
    const { target, count } = resolveWinningRun(lineSymbols);

    if (!target || count < 3) {
      return;
    }

    const symbol = SYMBOLS_BY_ID.get(target);
    const multiplier = symbol?.payout?.[count] || 0;
    if (multiplier <= 0) {
      return;
    }

    const payout = roundCurrency(betAmount * multiplier * payoutMultiplier);
    total = roundCurrency(total + payout);

    const positions = [];
    for (let reelIndex = 0; reelIndex < count; reelIndex += 1) {
      const rowIndex = line[reelIndex];
      positions.push([rowIndex, reelIndex]);
      winningPositions.push([rowIndex, reelIndex]);
    }

    lineWins.push({
      lineIndex,
      symbolId: target,
      count,
      payout,
      positions,
      jackpotEligible: target === 'GPT5' && count === CONFIG.GAME.GRID_REELS
    });
  });

  return {
    lineWins,
    winningPositions,
    total
  };
}

function collapseGrid(grid, winningPositions) {
  const rows = CONFIG.GAME.GRID_ROWS;
  const reels = CONFIG.GAME.GRID_REELS;
  const nextGrid = cloneGrid(grid);

  for (const [rowIndex, reelIndex] of winningPositions) {
    nextGrid[rowIndex][reelIndex] = null;
  }

  for (let reelIndex = 0; reelIndex < reels; reelIndex += 1) {
    const symbols = [];

    for (let rowIndex = rows - 1; rowIndex >= 0; rowIndex -= 1) {
      const value = nextGrid[rowIndex][reelIndex];
      if (value !== null) {
        symbols.push(value);
      }
    }

    for (let rowIndex = rows - 1; rowIndex >= 0; rowIndex -= 1) {
      const nextSymbol = symbols.shift() || randomSymbolId();
      nextGrid[rowIndex][reelIndex] = nextSymbol;
    }
  }

  return nextGrid;
}

function pickWinMessage(totalWin, jackpotWin, freeSpinsAwarded) {
  if (jackpotWin > 0) {
    return "You've achieved AGI... of profits.";
  }

  if (freeSpinsAwarded > 0 && totalWin > 0) {
    return 'Prompt engineering paid off. Free spins unlocked.';
  }

  if (totalWin > 0) {
    return 'Disruption delivered measurable shareholder value.';
  }

  if (freeSpinsAwarded > 0) {
    return 'You found 3 prompts. Please enjoy 10 speculative spins.';
  }

  return 'No synergy this round. Please pivot and retry.';
}

export function stableStringify(input) {
  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (input && typeof input === 'object') {
    const keys = Object.keys(input).sort();
    const content = keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(input[key])}`)
      .join(',');
    return `{${content}}`;
  }

  return JSON.stringify(input);
}

function buildHmac(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest('base64url');
}

export function signPayload(payload, key) {
  return buildHmac(stableStringify(payload), key);
}

export function verifyPayloadSignature(payload, key, signature) {
  const expected = signPayload(payload, key);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(signature || ''));

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function applySpinCostAndProgression(session, betAmount, isFreeSpin) {
  if (isFreeSpin) {
    session.freeSpinsRemaining -= 1;
    return;
  }

  session.balance = roundCurrency(session.balance - betAmount);
  session.sessionSpend = roundCurrency(session.sessionSpend + betAmount);
  session.activeBet = betAmount;
  session.xp = roundCurrency(session.xp + betAmount * CONFIG.GAME.XP_PER_TOKEN);
  session.tier = getTierFromXp(session.xp);

  const contribution = roundCurrency(betAmount * CONFIG.GAME.JACKPOT.CONTRIBUTION_RATE);
  gameRuntimeState.jackpotPool = roundCurrency(gameRuntimeState.jackpotPool + contribution);
}

function buildSpinGrid() {
  const shouldForceNearMiss = randomUnit() < CONFIG.GAME.NEAR_MISS_FREQUENCY;
  const grid = shouldForceNearMiss ? generateGridWithNearMiss() : createGrid();
  return { grid, shouldForceNearMiss };
}

export function runSpin({ session, betAmount, spinId, requestMode }) {
  const now = Date.now();
  const isFreeSpin = session.freeSpinsRemaining > 0;
  const effectiveBet = isFreeSpin ? session.activeBet : betAmount;
  const payoutMultiplier = isFreeSpin ? CONFIG.GAME.FREE_SPINS.MULTIPLIER : 1;

  applySpinCostAndProgression(session, effectiveBet, isFreeSpin);

  const { grid: initialGrid, shouldForceNearMiss } = buildSpinGrid();
  let workingGrid = cloneGrid(initialGrid);

  const initialScatterCount = countScatter(initialGrid);
  const scatterPayoutMultiplier = SYMBOLS_BY_ID.get('SCATTER')?.payout?.[Math.min(initialScatterCount, 5)] || 0;

  let totalWin = roundCurrency(effectiveBet * scatterPayoutMultiplier * payoutMultiplier);
  let jackpotWin = 0;
  let freeSpinsAwarded = 0;
  let jackpotTriggered = false;

  const cascades = [];
  const paylinesHit = [];

  for (let cascadeIndex = 0; cascadeIndex < CONFIG.GAME.MAX_CASCADES; cascadeIndex += 1) {
    const evaluation = evaluatePaylines(workingGrid, effectiveBet, payoutMultiplier);
    if (evaluation.lineWins.length === 0) {
      break;
    }

    totalWin = roundCurrency(totalWin + evaluation.total);
    paylinesHit.push(...evaluation.lineWins.map((lineWin) => lineWin.lineIndex));

    if (!jackpotTriggered && evaluation.lineWins.some((lineWin) => lineWin.jackpotEligible)) {
      jackpotTriggered = true;
      jackpotWin = roundCurrency(gameRuntimeState.jackpotPool);
      totalWin = roundCurrency(totalWin + jackpotWin);
      gameRuntimeState.jackpotPool = CONFIG.GAME.JACKPOT.RESET_POOL;
    }

    cascades.push({
      index: cascadeIndex,
      grid: cloneGrid(workingGrid),
      lineWins: evaluation.lineWins,
      cascadePayout: evaluation.total
    });

    workingGrid = collapseGrid(workingGrid, evaluation.winningPositions);
  }

  if (initialScatterCount >= CONFIG.GAME.FREE_SPINS.SCATTER_COUNT) {
    freeSpinsAwarded = CONFIG.GAME.FREE_SPINS.AWARD_COUNT;
    session.freeSpinsRemaining += freeSpinsAwarded;
  }

  session.balance = roundCurrency(session.balance + totalWin);

  const netLossSpin = !isFreeSpin && totalWin < effectiveBet;
  const nearMiss = shouldForceNearMiss && totalWin === 0 && initialScatterCount < CONFIG.GAME.FREE_SPINS.SCATTER_COUNT;

  const result = {
    spinId,
    timestamp: now,
    requestMode,
    isFreeSpin,
    betAmount: effectiveBet,
    totalWin,
    jackpotWin,
    jackpotPool: roundCurrency(gameRuntimeState.jackpotPool),
    freeSpinsAwarded,
    freeSpinsRemaining: session.freeSpinsRemaining,
    initialScatterCount,
    paylinesHit,
    nearMiss,
    netLossSpin,
    balance: session.balance,
    sessionSpend: session.sessionSpend,
    xp: session.xp,
    tier: session.tier,
    message: pickWinMessage(totalWin, jackpotWin, freeSpinsAwarded),
    initialGrid,
    cascades,
    finalGrid: workingGrid
  };

  return result;
}
