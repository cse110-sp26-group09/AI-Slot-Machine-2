import crypto from "node:crypto";
import { CONFIG } from "./config.js";
import { hmacHex, normalizeCurrency, stableStringify } from "./session.js";

const symbolById = new Map(CONFIG.GAME.SYMBOLS.map((symbol) => [symbol.id, symbol]));
const weightedSymbols = CONFIG.GAME.SYMBOLS.flatMap((symbol) =>
  Array.from({ length: symbol.weight }, () => symbol.id)
);

const randomIndex = (exclusiveMax) => crypto.randomInt(0, exclusiveMax);
const randomFloat = () => {
  const denominator = CONFIG.GAME.RANDOM_FLOAT_DENOMINATOR;
  return randomIndex(denominator) / denominator;
};

const cloneGrid = (grid) => grid.map((row) => [...row]);

const pickSymbolId = () => weightedSymbols[randomIndex(weightedSymbols.length)];

const createGrid = () => {
  const rows = CONFIG.GAME.GRID_ROWS;
  const reels = CONFIG.GAME.GRID_REELS;
  return Array.from({ length: rows }, () =>
    Array.from({ length: reels }, () => pickSymbolId())
  );
};

const getTierForXp = (xp) => {
  const tiers = CONFIG.GAME.XP_TIERS;
  const fallbackTier = tiers[0];
  return tiers.reduce(
    (current, tier) => (xp >= tier.minXp ? tier : current),
    fallbackTier
  );
};

const toPosKey = (row, reel) => `${row}-${reel}`;

const buildLineSymbols = (grid, payline) =>
  payline.map((row, reel) => ({
    row,
    reel,
    id: grid[row][reel],
  }));

const evaluateLine = (lineSymbols, bet, spinMultiplier) => {
  const wildId = CONFIG.GAME.WILD_SYMBOL_ID;
  const scatterId = CONFIG.GAME.SCATTER_SYMBOL_ID;
  let targetId = null;
  let matches = 0;
  const matchedPositions = [];

  for (const symbol of lineSymbols) {
    if (symbol.id === scatterId) {
      break;
    }

    if (!targetId) {
      if (symbol.id === wildId) {
        matches += 1;
        matchedPositions.push(toPosKey(symbol.row, symbol.reel));
        continue;
      }
      targetId = symbol.id;
      matches += 1;
      matchedPositions.push(toPosKey(symbol.row, symbol.reel));
      continue;
    }

    if (symbol.id === targetId || symbol.id === wildId) {
      matches += 1;
      matchedPositions.push(toPosKey(symbol.row, symbol.reel));
      continue;
    }
    break;
  }

  if (!targetId && matches > 0) {
    targetId = wildId;
  }

  const targetSymbol = targetId ? symbolById.get(targetId) : null;
  const payoutMultiplier = targetSymbol?.payout?.[matches] ?? 0;
  if (matches < 3 || payoutMultiplier <= 0 || !targetSymbol) {
    return {
      payout: 0,
      matches: 0,
      symbolId: null,
      matchedPositions: [],
    };
  }

  const rtpAdjustedMultiplier = payoutMultiplier * CONFIG.GAME.RTP_TARGET * spinMultiplier;
  const payout = normalizeCurrency(bet * rtpAdjustedMultiplier);
  return {
    payout,
    matches,
    symbolId: targetSymbol.id,
    matchedPositions,
  };
};

const countScatterSymbols = (grid) => {
  const scatterId = CONFIG.GAME.SCATTER_SYMBOL_ID;
  return grid.flat().reduce((count, symbolId) => count + (symbolId === scatterId ? 1 : 0), 0);
};

const evaluateGridWins = (grid, bet, spinMultiplier) => {
  const lineWins = [];
  const winPositions = new Set();
  let totalPayout = 0;
  let jackpotTriggered = false;

  CONFIG.GAME.PAYLINES.forEach((payline, lineIndex) => {
    const lineSymbols = buildLineSymbols(grid, payline);
    const lineResult = evaluateLine(lineSymbols, bet, spinMultiplier);
    if (lineResult.payout <= 0) {
      return;
    }

    lineResult.matchedPositions.forEach((position) => winPositions.add(position));
    totalPayout += lineResult.payout;

    const isJackpotMatch =
      lineResult.symbolId === CONFIG.GAME.JACKPOT_TRIGGER_SYMBOL_ID &&
      lineResult.matches === CONFIG.GAME.JACKPOT_TRIGGER_MATCH_COUNT;
    if (isJackpotMatch) {
      jackpotTriggered = true;
    }

    lineWins.push({
      lineIndex,
      symbolId: lineResult.symbolId,
      matches: lineResult.matches,
      payout: lineResult.payout,
    });
  });

  const scatterCount = countScatterSymbols(grid);
  const scatterSymbol = symbolById.get(CONFIG.GAME.SCATTER_SYMBOL_ID);
  const scatterMultiplier = scatterSymbol?.payout?.[scatterCount] ?? 0;
  const scatterPayout = scatterMultiplier
    ? normalizeCurrency(bet * scatterMultiplier * CONFIG.GAME.RTP_TARGET * spinMultiplier)
    : 0;
  if (scatterPayout > 0) {
    totalPayout += scatterPayout;
  }

  return {
    lineWins,
    scatterCount,
    scatterPayout,
    freeSpinsAwarded:
      scatterCount >= CONFIG.GAME.SCATTER_TRIGGER_COUNT ? CONFIG.GAME.FREE_SPINS_AWARDED : 0,
    totalPayout: normalizeCurrency(totalPayout),
    winPositions: [...winPositions],
    jackpotTriggered,
  };
};

const collapseGrid = (grid, winPositions) => {
  const rows = CONFIG.GAME.GRID_ROWS;
  const reels = CONFIG.GAME.GRID_REELS;
  const nextGrid = cloneGrid(grid);
  const positionSet = new Set(winPositions);

  for (let row = 0; row < rows; row += 1) {
    for (let reel = 0; reel < reels; reel += 1) {
      if (positionSet.has(toPosKey(row, reel))) {
        nextGrid[row][reel] = null;
      }
    }
  }

  for (let reel = 0; reel < reels; reel += 1) {
    const stack = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      const symbolId = nextGrid[row][reel];
      if (symbolId !== null) {
        stack.push(symbolId);
      }
    }
    while (stack.length < rows) {
      stack.push(pickSymbolId());
    }
    for (let row = rows - 1; row >= 0; row -= 1) {
      const stackIndex = rows - 1 - row;
      nextGrid[row][reel] = stack[stackIndex];
    }
  }

  return nextGrid;
};

const applyNearMissIfNeeded = (grid, shouldApplyNearMiss) => {
  if (!shouldApplyNearMiss) {
    return grid;
  }

  const mutableGrid = cloneGrid(grid);
  const payline = CONFIG.GAME.PAYLINES[randomIndex(CONFIG.GAME.PAYLINES.length)];
  const targetSymbolId = CONFIG.GAME.JACKPOT_TRIGGER_SYMBOL_ID;
  const wildId = CONFIG.GAME.WILD_SYMBOL_ID;
  const scatterId = CONFIG.GAME.SCATTER_SYMBOL_ID;

  for (let reel = 0; reel < CONFIG.GAME.GRID_REELS - 1; reel += 1) {
    const row = payline[reel];
    mutableGrid[row][reel] = targetSymbolId;
  }

  const lastReel = CONFIG.GAME.GRID_REELS - 1;
  const lastRow = payline[lastReel];
  let blockerId = pickSymbolId();
  while (blockerId === targetSymbolId || blockerId === wildId || blockerId === scatterId) {
    blockerId = pickSymbolId();
  }
  mutableGrid[lastRow][lastReel] = blockerId;
  return mutableGrid;
};

const signSpinResult = (spinResult, verificationKey) =>
  hmacHex(verificationKey, stableStringify(spinResult), CONFIG.SECURITY.SIGNATURE_ALGORITHM);

const pickWinMessage = () => {
  const messageIndex = randomIndex(CONFIG.GAME.WIN_MESSAGES.length);
  return CONFIG.GAME.WIN_MESSAGES[messageIndex];
};

const createSpinResult = ({ session, bet, jackpotPool }) => {
  const isFreeSpin = session.freeSpinsRemaining > 0;
  const spinMultiplier = isFreeSpin ? session.freeSpinMultiplier : 1;
  const betDebit = isFreeSpin ? 0 : bet;
  const jackpotContribution = isFreeSpin
    ? 0
    : normalizeCurrency(bet * CONFIG.GAME.JACKPOT_CONTRIBUTION_RATE);
  const nearMissEnabled = randomFloat() < CONFIG.GAME.NEAR_MISS_FREQUENCY;
  const spinStartedAt = Date.now();

  let workingGrid = createGrid();
  let totalPayout = 0;
  let totalFreeSpinsAwarded = 0;
  let jackpotWin = 0;
  const cascades = [];
  let winLines = [];
  let scatterCount = 0;
  let scatterPayout = 0;
  let jackpotTriggered = false;

  workingGrid = applyNearMissIfNeeded(workingGrid, nearMissEnabled);

  for (let cascadeIndex = 0; cascadeIndex < CONFIG.GAME.CASCADE_MAX_STEPS; cascadeIndex += 1) {
    const evaluated = evaluateGridWins(workingGrid, bet, spinMultiplier);
    if (evaluated.totalPayout <= 0) {
      break;
    }

    totalPayout = normalizeCurrency(totalPayout + evaluated.totalPayout);
    totalFreeSpinsAwarded += evaluated.freeSpinsAwarded;
    scatterCount = Math.max(scatterCount, evaluated.scatterCount);
    scatterPayout = normalizeCurrency(scatterPayout + evaluated.scatterPayout);
    winLines = [...winLines, ...evaluated.lineWins];
    jackpotTriggered = jackpotTriggered || evaluated.jackpotTriggered;

    cascades.push({
      index: cascadeIndex + 1,
      grid: cloneGrid(workingGrid),
      lineWins: evaluated.lineWins,
      scatterCount: evaluated.scatterCount,
      scatterPayout: evaluated.scatterPayout,
      subtotal: evaluated.totalPayout,
    });

    if (evaluated.winPositions.length === 0) {
      break;
    }
    workingGrid = collapseGrid(workingGrid, evaluated.winPositions);
  }

  const nextFreeSpins = Math.max(0, session.freeSpinsRemaining - (isFreeSpin ? 1 : 0));
  const freeSpinsRemaining = nextFreeSpins + totalFreeSpinsAwarded;
  const baseJackpotPool = normalizeCurrency(jackpotPool + jackpotContribution);

  let nextJackpotPool = baseJackpotPool;
  if (jackpotTriggered) {
    jackpotWin = baseJackpotPool;
    nextJackpotPool = CONFIG.GAME.STARTING_JACKPOT_POOL;
  }

  const grossWin = normalizeCurrency(totalPayout + jackpotWin);
  const netDelta = normalizeCurrency(grossWin - betDebit);
  const nextBalance = normalizeCurrency(session.balance - betDebit + grossWin);
  const nextSessionSpend = normalizeCurrency(session.sessionSpend + betDebit);
  const xpGain = Math.round(
    CONFIG.GAME.XP_BASE_PER_SPIN + grossWin * CONFIG.GAME.XP_WIN_MULTIPLIER
  );
  const nextXp = session.xp + xpGain;
  const tier = getTierForXp(nextXp);

  const result = {
    spinId: crypto.randomUUID(),
    startedAt: spinStartedAt,
    completedAt: Date.now(),
    bet: normalizeCurrency(bet),
    betDebit,
    isFreeSpin,
    spinMultiplier,
    grid: cloneGrid(workingGrid),
    cascades,
    winLines,
    scatterCount,
    scatterPayout,
    freeSpinsAwarded: totalFreeSpinsAwarded,
    freeSpinsRemaining,
    jackpotContribution,
    jackpotWin,
    jackpotPool: normalizeCurrency(nextJackpotPool),
    grossWin,
    netDelta,
    isNetLoss: netDelta <= 0,
    nearMiss: nearMissEnabled && grossWin === 0,
    winMessage: grossWin > 0 ? pickWinMessage() : "No hype cycle survives contact with variance.",
    realityCheckRequired:
      Date.now() - session.realityCheckAcknowledgedAt >= CONFIG.GAME.REALITY_CHECK_INTERVAL_MS,
    xp: nextXp,
    tier: tier.label,
    balance: nextBalance,
    sessionSpend: nextSessionSpend,
  };

  result.signature = signSpinResult(result, session.spinVerificationKey);
  return { result, nextJackpotPool };
};

const validateBetAmount = (betValue) => {
  const bet = Number(betValue);
  if (!Number.isFinite(bet)) {
    return { ok: false, message: "Bet must be numeric." };
  }
  if (bet < CONFIG.GAME.BET_MIN || bet > CONFIG.GAME.BET_MAX) {
    return {
      ok: false,
      message: `Bet must be between ${CONFIG.GAME.BET_MIN} and ${CONFIG.GAME.BET_MAX}.`,
    };
  }
  const normalizedStep = Math.round((bet - CONFIG.GAME.BET_MIN) / CONFIG.GAME.BET_STEP);
  const rebuilt = normalizeCurrency(CONFIG.GAME.BET_MIN + normalizedStep * CONFIG.GAME.BET_STEP);
  const precisionGap = Number(Math.abs(rebuilt - bet).toFixed(CONFIG.GAME.CURRENCY_PRECISION));
  if (precisionGap > 0) {
    return {
      ok: false,
      message: `Bet must follow step increments of ${CONFIG.GAME.BET_STEP}.`,
    };
  }
  return { ok: true, bet: normalizeCurrency(bet) };
};

const createClientConfigPayload = () => ({
  app: CONFIG.APP,
  client: {
    autoplayMinSpins: CONFIG.CLIENT.AUTOPLAY_MIN_SPINS,
    audio: CONFIG.CLIENT.AUDIO,
  },
  game: {
    rows: CONFIG.GAME.GRID_ROWS,
    reels: CONFIG.GAME.GRID_REELS,
    paylines: CONFIG.GAME.PAYLINES,
    rtpTarget: CONFIG.GAME.RTP_TARGET,
    symbols: CONFIG.GAME.SYMBOLS,
    betMin: CONFIG.GAME.BET_MIN,
    betMax: CONFIG.GAME.BET_MAX,
    betStep: CONFIG.GAME.BET_STEP,
    betDefault: CONFIG.GAME.BET_DEFAULT,
    spinFloorMs: CONFIG.GAME.SPIN_FLOOR_MS,
    normalSpinMs: CONFIG.GAME.NORMAL_SPIN_MS,
    turboSpinMs: CONFIG.GAME.TURBO_SPIN_MS,
    autoplayMaxSpins: CONFIG.GAME.AUTOPLAY_MAX_SPINS,
    freeSpinsAwarded: CONFIG.GAME.FREE_SPINS_AWARDED,
    freeSpinMultiplier: CONFIG.GAME.FREE_SPIN_MULTIPLIER,
    realityCheckIntervalMs: CONFIG.GAME.REALITY_CHECK_INTERVAL_MS,
    xpTiers: CONFIG.GAME.XP_TIERS,
    depositLimitMin: CONFIG.GAME.SESSION_DEPOSIT_LIMIT_MIN,
    depositLimitMax: CONFIG.GAME.SESSION_DEPOSIT_LIMIT_MAX,
    winMessages: CONFIG.GAME.WIN_MESSAGES,
  },
});

export { createSpinResult, validateBetAmount, createClientConfigPayload };
