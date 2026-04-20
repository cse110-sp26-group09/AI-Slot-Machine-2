const parseList = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const SYMBOL_IDS = {
  GPT5: "GPT5",
  CLAUDE: "CLAUDE",
  GEMINI: "GEMINI",
  GROK: "GROK",
  DISRUPTION: "DISRUPTION",
  TEN_X: "TEN_X",
  PIVOT: "PIVOT",
  AGI_SOON: "AGI_SOON",
  HALLUCINATION_WILD: "HALLUCINATION_WILD",
  PROMPT_SCATTER: "PROMPT_SCATTER"
};

export const APP_CONFIG = {
  server: {
    port: Number(process.env.PORT ?? "3000"),
    corsOrigins: parseList(
      process.env.CORS_ORIGINS,
      ["http://localhost:3000", "http://127.0.0.1:3000"]
    ),
    csp: {
      defaultSrc: "'self'",
      scriptSrc: "'self'",
      styleSrc: "'self'",
      connectSrc: "'self' ws: wss:",
      imgSrc: "'self' data:",
      objectSrc: "'none'",
      baseUri: "'self'",
      frameAncestors: "'none'"
    }
  },
  security: {
    jwtSecret: process.env.JWT_SECRET ?? "replace-this-jwt-secret-in-env",
    jwtExpiryMinutes: Number(process.env.JWT_EXPIRY_MINUTES ?? "15"),
    fingerprintPepper:
      process.env.FINGERPRINT_PEPPER ?? "replace-this-fingerprint-pepper-in-env",
    stateHmacSecret:
      process.env.STATE_HMAC_SECRET ?? "replace-this-state-hmac-secret-in-env",
    resultHmacSecret:
      process.env.RESULT_HMAC_SECRET ?? "replace-this-result-hmac-secret-in-env"
  },
  game: {
    rtp: Number(process.env.RTP ?? "0.96"),
    gridRows: 3,
    gridCols: 5,
    paylines: [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [0, 1, 2, 1, 0],
      [2, 1, 0, 1, 2],
      [0, 0, 1, 0, 0],
      [2, 2, 1, 2, 2],
      [1, 0, 0, 0, 1],
      [1, 2, 2, 2, 1],
      [0, 1, 1, 1, 0],
      [2, 1, 1, 1, 2],
      [1, 1, 0, 1, 1],
      [1, 1, 2, 1, 1],
      [0, 1, 0, 1, 0],
      [2, 1, 2, 1, 2],
      [0, 2, 0, 2, 0],
      [2, 0, 2, 0, 2],
      [1, 0, 1, 0, 1],
      [1, 2, 1, 2, 1],
      [0, 2, 1, 2, 0]
    ],
    minBet: Number(process.env.MIN_BET ?? "0.1"),
    maxBet: Number(process.env.MAX_BET ?? "10"),
    betStep: Number(process.env.BET_STEP ?? "0.1"),
    spinFloorMs: Number(process.env.SPIN_FLOOR_MS ?? "2500"),
    turboSpinMs: Number(process.env.TURBO_SPIN_MS ?? "1000"),
    cascadeStepMs: Number(process.env.CASCADE_STEP_MS ?? "350"),
    autoplayMinSpins: Number(process.env.AUTOPLAY_MIN_SPINS ?? "1"),
    autoplayMaxSpins: Number(process.env.AUTOPLAY_MAX_SPINS ?? "50"),
    nearMissFrequency: Number(process.env.NEAR_MISS_FREQUENCY ?? "0.15"),
    jackpotContributionRate: Number(process.env.JACKPOT_RATE ?? "0.01"),
    jackpotSeed: Number(process.env.JACKPOT_SEED ?? "250"),
    freeSpinsAwarded: Number(process.env.FREE_SPINS_AWARDED ?? "10"),
    freeSpinsMultiplier: Number(process.env.FREE_SPINS_MULTIPLIER ?? "2"),
    maxCascadeCount: Number(process.env.MAX_CASCADE_COUNT ?? "6")
  },
  compliance: {
    realityCheckMinutes: Number(process.env.REALITY_CHECK_MINUTES ?? "60"),
    sessionDepositLimit: Number(process.env.SESSION_DEPOSIT_LIMIT ?? "500"),
    minimumAge: Number(process.env.MINIMUM_AGE ?? "18"),
    wsRateLimitPerMinute: Number(process.env.WS_RATE_LIMIT_PER_MINUTE ?? "30"),
    maxBodyBytes: Number(process.env.MAX_BODY_BYTES ?? "4096")
  },
  progression: {
    xpPerTokenWagered: Number(process.env.XP_PER_TOKEN_WAGERED ?? "10"),
    tiers: [
      { badge: "Bronze", threshold: 0 },
      { badge: "Silver", threshold: 600 },
      { badge: "Gold", threshold: 1400 },
      { badge: "Platinum", threshold: 2600 },
      { badge: "VIP", threshold: 4000 }
    ]
  },
  audio: {
    winBaseFrequency: Number(process.env.WIN_BASE_FREQUENCY ?? "220"),
    maxWinSoundScale: Number(process.env.MAX_WIN_SOUND_SCALE ?? "20"),
    nearMissStartFrequency: Number(process.env.NEAR_MISS_START_FREQUENCY ?? "300"),
    nearMissEndFrequency: Number(process.env.NEAR_MISS_END_FREQUENCY ?? "720"),
    nearMissStepCount: Number(process.env.NEAR_MISS_STEP_COUNT ?? "5"),
    nearMissStepSeconds: Number(process.env.NEAR_MISS_STEP_SECONDS ?? "0.07"),
    humFrequency: Number(process.env.HUM_FREQUENCY ?? "110"),
    minimumBetForSound: Number(process.env.MINIMUM_BET_FOR_SOUND ?? "0.1"),
    winFrequencyScaleFactor: Number(process.env.WIN_FREQUENCY_SCALE_FACTOR ?? "12"),
    winDurationBaseSeconds: Number(process.env.WIN_DURATION_BASE_SECONDS ?? "0.18"),
    winDurationScaleSeconds: Number(process.env.WIN_DURATION_SCALE_SECONDS ?? "0.02"),
    winGain: Number(process.env.WIN_GAIN ?? "0.05"),
    nearMissGain: Number(process.env.NEAR_MISS_GAIN ?? "0.03")
  },
  session: {
    defaultDeposit: Number(process.env.DEFAULT_DEPOSIT ?? "100")
  }
};

export const SYMBOLS = [
  {
    id: SYMBOL_IDS.GPT5,
    label: "GPT-5",
    emoji: "🧠",
    weight: 8,
    payout: { 3: 14, 4: 32, 5: 120 }
  },
  {
    id: SYMBOL_IDS.CLAUDE,
    label: "Claude",
    emoji: "🪶",
    weight: 11,
    payout: { 3: 10, 4: 24, 5: 80 }
  },
  {
    id: SYMBOL_IDS.GEMINI,
    label: "Gemini",
    emoji: "♊",
    weight: 11,
    payout: { 3: 9, 4: 20, 5: 70 }
  },
  {
    id: SYMBOL_IDS.GROK,
    label: "Grok",
    emoji: "⚡",
    weight: 12,
    payout: { 3: 8, 4: 18, 5: 64 }
  },
  {
    id: SYMBOL_IDS.DISRUPTION,
    label: "Disruption",
    emoji: "💥",
    weight: 13,
    payout: { 3: 6, 4: 14, 5: 40 }
  },
  {
    id: SYMBOL_IDS.TEN_X,
    label: "10x Engineer",
    emoji: "🔧",
    weight: 13,
    payout: { 3: 6, 4: 13, 5: 36 }
  },
  {
    id: SYMBOL_IDS.PIVOT,
    label: "Pivot",
    emoji: "🔄",
    weight: 13,
    payout: { 3: 5, 4: 11, 5: 30 }
  },
  {
    id: SYMBOL_IDS.AGI_SOON,
    label: "AGI Soon",
    emoji: "🚀",
    weight: 10,
    payout: { 3: 11, 4: 26, 5: 90 }
  },
  {
    id: SYMBOL_IDS.HALLUCINATION_WILD,
    label: "Hallucination",
    emoji: "🌀",
    weight: 6,
    payout: { 3: 18, 4: 40, 5: 150 }
  },
  {
    id: SYMBOL_IDS.PROMPT_SCATTER,
    label: "Prompt",
    emoji: "📣",
    weight: 7,
    payout: { 3: 3, 4: 8, 5: 20 }
  }
];

export const PUBLIC_CONFIG = {
  game: {
    rtp: APP_CONFIG.game.rtp,
    gridRows: APP_CONFIG.game.gridRows,
    gridCols: APP_CONFIG.game.gridCols,
    paylines: APP_CONFIG.game.paylines,
    minBet: APP_CONFIG.game.minBet,
    maxBet: APP_CONFIG.game.maxBet,
    betStep: APP_CONFIG.game.betStep,
    spinFloorMs: APP_CONFIG.game.spinFloorMs,
    turboSpinMs: APP_CONFIG.game.turboSpinMs,
    cascadeStepMs: APP_CONFIG.game.cascadeStepMs,
    autoplayMinSpins: APP_CONFIG.game.autoplayMinSpins,
    autoplayMaxSpins: APP_CONFIG.game.autoplayMaxSpins,
    freeSpinsAwarded: APP_CONFIG.game.freeSpinsAwarded,
    freeSpinsMultiplier: APP_CONFIG.game.freeSpinsMultiplier
  },
  compliance: {
    realityCheckMinutes: APP_CONFIG.compliance.realityCheckMinutes,
    sessionDepositLimit: APP_CONFIG.compliance.sessionDepositLimit,
    minimumAge: APP_CONFIG.compliance.minimumAge
  },
  audio: APP_CONFIG.audio,
  progression: APP_CONFIG.progression,
  session: APP_CONFIG.session,
  symbols: SYMBOLS.map((symbol) => ({
    id: symbol.id,
    label: symbol.label,
    emoji: symbol.emoji,
    payout: symbol.payout
  }))
};
