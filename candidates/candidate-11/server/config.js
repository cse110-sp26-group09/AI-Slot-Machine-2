import path from "node:path";

const ROW_TOP = 0;
const ROW_MIDDLE = 1;
const ROW_BOTTOM = 2;

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const CONFIG = {
  APP_NAME: "AI Satire Slot Machine",
  APP_PORT: parseNumber(process.env.PORT, 3000),
  RTP: parseNumber(process.env.RTP, 0.96),
  ROOT_DIR: process.cwd(),
  CLIENT_DIR: path.join(process.cwd(), "client"),
  BUILD_DIR: path.join(process.cwd(), "build"),
  TIMINGS: {
    NORMAL_SPIN_MS: parseNumber(process.env.NORMAL_SPIN_MS, 2500),
    TURBO_SPIN_MS: parseNumber(process.env.TURBO_SPIN_MS, 1000),
    SPIN_FLOOR_MS: parseNumber(process.env.SPIN_FLOOR_MS, 2500),
    CASCADE_STEP_MS: parseNumber(process.env.CASCADE_STEP_MS, 600),
    WIN_FLASH_MS: parseNumber(process.env.WIN_FLASH_MS, 800),
    REALITY_CHECK_MINUTES: parseNumber(process.env.REALITY_CHECK_MINUTES, 60),
    WS_RATE_WINDOW_MS: parseNumber(process.env.WS_RATE_WINDOW_MS, 60000)
  },
  LIMITS: {
    BET_MIN: parseNumber(process.env.BET_MIN, 0.1),
    BET_MAX: parseNumber(process.env.BET_MAX, 10),
    BET_STEP: parseNumber(process.env.BET_STEP, 0.1),
    AUTOPLAY_CAP: parseNumber(process.env.AUTOPLAY_CAP, 50),
    SESSION_INITIAL_BALANCE: parseNumber(process.env.SESSION_INITIAL_BALANCE, 100),
    SESSION_DEPOSIT_LIMIT: parseNumber(process.env.SESSION_DEPOSIT_LIMIT, 500),
    WS_RATE_PER_MINUTE: parseNumber(process.env.WS_RATE_PER_MINUTE, 30),
    JWT_EXPIRY_MINUTES: parseNumber(process.env.JWT_EXPIRY_MINUTES, 15),
    MAX_CASCADES: parseNumber(process.env.MAX_CASCADES, 6),
    FREE_SPINS_AWARDED: parseNumber(process.env.FREE_SPINS_AWARDED, 10),
    FREE_SPIN_MULTIPLIER: parseNumber(process.env.FREE_SPIN_MULTIPLIER, 2),
    JACKPOT_FEED_RATIO: parseNumber(process.env.JACKPOT_FEED_RATIO, 0.01),
    JACKPOT_START_POOL: parseNumber(process.env.JACKPOT_START_POOL, 250),
    MONEY_DECIMALS: parseNumber(process.env.MONEY_DECIMALS, 2)
  },
  GRID: {
    ROWS: 3,
    REELS: 5,
    PAYLINES: [
      [ROW_TOP, ROW_TOP, ROW_TOP, ROW_TOP, ROW_TOP],
      [ROW_MIDDLE, ROW_MIDDLE, ROW_MIDDLE, ROW_MIDDLE, ROW_MIDDLE],
      [ROW_BOTTOM, ROW_BOTTOM, ROW_BOTTOM, ROW_BOTTOM, ROW_BOTTOM],
      [ROW_TOP, ROW_MIDDLE, ROW_BOTTOM, ROW_MIDDLE, ROW_TOP],
      [ROW_BOTTOM, ROW_MIDDLE, ROW_TOP, ROW_MIDDLE, ROW_BOTTOM],
      [ROW_TOP, ROW_TOP, ROW_MIDDLE, ROW_TOP, ROW_TOP],
      [ROW_BOTTOM, ROW_BOTTOM, ROW_MIDDLE, ROW_BOTTOM, ROW_BOTTOM],
      [ROW_MIDDLE, ROW_TOP, ROW_TOP, ROW_TOP, ROW_MIDDLE],
      [ROW_MIDDLE, ROW_BOTTOM, ROW_BOTTOM, ROW_BOTTOM, ROW_MIDDLE],
      [ROW_TOP, ROW_MIDDLE, ROW_MIDDLE, ROW_MIDDLE, ROW_TOP],
      [ROW_BOTTOM, ROW_MIDDLE, ROW_MIDDLE, ROW_MIDDLE, ROW_BOTTOM],
      [ROW_MIDDLE, ROW_TOP, ROW_MIDDLE, ROW_BOTTOM, ROW_MIDDLE],
      [ROW_MIDDLE, ROW_BOTTOM, ROW_MIDDLE, ROW_TOP, ROW_MIDDLE],
      [ROW_TOP, ROW_BOTTOM, ROW_TOP, ROW_BOTTOM, ROW_TOP],
      [ROW_BOTTOM, ROW_TOP, ROW_BOTTOM, ROW_TOP, ROW_BOTTOM],
      [ROW_TOP, ROW_BOTTOM, ROW_MIDDLE, ROW_TOP, ROW_BOTTOM],
      [ROW_BOTTOM, ROW_TOP, ROW_MIDDLE, ROW_BOTTOM, ROW_TOP],
      [ROW_MIDDLE, ROW_TOP, ROW_BOTTOM, ROW_TOP, ROW_MIDDLE],
      [ROW_MIDDLE, ROW_BOTTOM, ROW_TOP, ROW_BOTTOM, ROW_MIDDLE],
      [ROW_TOP, ROW_MIDDLE, ROW_TOP, ROW_MIDDLE, ROW_TOP]
    ]
  },
  SYMBOLS: [
    { id: "gpt5", label: "GPT-5", emoji: "🧠", weight: 12, payout: { 3: 10, 4: 30, 5: 120 } },
    { id: "claude", label: "Claude", emoji: "🤵", weight: 14, payout: { 3: 8, 4: 24, 5: 85 } },
    { id: "gemini", label: "Gemini", emoji: "♊", weight: 14, payout: { 3: 8, 4: 22, 5: 80 } },
    { id: "grok", label: "Grok", emoji: "🚀", weight: 14, payout: { 3: 7, 4: 20, 5: 75 } },
    { id: "disruption", label: "Disruption", emoji: "⚡", weight: 16, payout: { 3: 6, 4: 18, 5: 60 } },
    { id: "tenx", label: "10x Engineer", emoji: "💻", weight: 16, payout: { 3: 6, 4: 16, 5: 55 } },
    { id: "pivot", label: "Pivot", emoji: "🔁", weight: 18, payout: { 3: 5, 4: 14, 5: 45 } },
    { id: "agiSoon", label: "AGI Soon", emoji: "🛰️", weight: 18, payout: { 3: 5, 4: 12, 5: 40 } },
    { id: "hallucination", label: "Hallucination", emoji: "🫥", weight: 10, payout: { 3: 12, 4: 32, 5: 100 }, wild: true },
    { id: "prompt", label: "Prompt", emoji: "🧾", weight: 8, payout: { 3: 3, 4: 6, 5: 10 }, scatter: true }
  ],
  SPECIAL_SYMBOLS: {
    WILD: "hallucination",
    SCATTER: "prompt",
    JACKPOT: "gpt5"
  },
  NEAR_MISS: {
    FREQUENCY: parseNumber(process.env.NEAR_MISS_FREQUENCY, 0.2),
    TARGET_SCATTERS: 2
  },
  XP: {
    TIER_SEQUENCE: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "VIP"],
    TIER_THRESHOLDS: {
      Bronze: 0,
      Silver: 120,
      Gold: 300,
      Platinum: 600,
      Diamond: 1000,
      VIP: 1500
    },
    PER_SPIN: parseNumber(process.env.XP_PER_SPIN, 12),
    PER_WIN_UNIT: parseNumber(process.env.XP_PER_WIN_UNIT, 0.25)
  },
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET ?? "change-this-jwt-secret",
    FINGERPRINT_SALT: process.env.FINGERPRINT_SALT ?? "change-this-fingerprint-salt",
    SERVER_HMAC_SECRET: process.env.SERVER_HMAC_SECRET ?? "change-this-server-hmac",
    RESULT_HMAC_NAMESPACE: process.env.RESULT_HMAC_NAMESPACE ?? "ai-slot-result-v1",
    REQUEST_GUARD_NAMESPACE: process.env.REQUEST_GUARD_NAMESPACE ?? "ai-slot-guard-v1",
    CORS_WHITELIST: (process.env.CORS_WHITELIST ?? "http://localhost:3000,http://127.0.0.1:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  },
  HUMOR: {
    BIG_WIN_LINES: [
      "You have achieved AGI... of profits.",
      "Your startup pitch deck just got Series A'd.",
      "Disruption deployed. Reality deprecated.",
      "Your GPU cluster just applauded.",
      "Another day, another synthetic moonshot."
    ],
    SMALL_WIN_LINES: [
      "Incremental innovation detected.",
      "Mildly impressive benchmark score.",
      "Tiny uplift. Massive slide deck.",
      "You pivoted directly into green.",
      "Prompt engineering paid rent today."
    ],
    LOSS_LINES: [
      "Model drift. Budget shift.",
      "No moat was harmed in this spin.",
      "The roadmap remains aspirational.",
      "No signal. Plenty of noise.",
      "Try adding more buzzwords."
    ]
  }
};

export const PUBLIC_CONFIG = {
  appName: CONFIG.APP_NAME,
  rtp: CONFIG.RTP,
  timings: CONFIG.TIMINGS,
  limits: CONFIG.LIMITS,
  grid: {
    rows: CONFIG.GRID.ROWS,
    reels: CONFIG.GRID.REELS,
    paylines: CONFIG.GRID.PAYLINES
  },
  symbols: CONFIG.SYMBOLS,
  specialSymbols: CONFIG.SPECIAL_SYMBOLS,
  xp: CONFIG.XP,
  humor: CONFIG.HUMOR,
  nearMiss: CONFIG.NEAR_MISS
};
