/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from 'crypto';

export const CONFIG = {
  APP: {
    NAME: 'AI Satire Slots',
    VERSION: '1.0.0',
    PORT: Number(process.env.PORT || 3000),
    NODE_ENV: process.env.NODE_ENV || 'development'
  },
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
    JWT_EXPIRY_SECONDS: Number(process.env.JWT_EXPIRY_SECONDS || 900),
    FINGERPRINT_SALT: process.env.FINGERPRINT_SALT || 'dev-fingerprint-salt-change-me',
    REQUEST_SIGNATURE_WINDOW_MS: Number(process.env.REQUEST_SIGNATURE_WINDOW_MS || 300000),
    NONCE_TTL_MS: Number(process.env.NONCE_TTL_MS || 600000),
    CORS_WHITELIST: (process.env.CORS_WHITELIST || 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    WS_RATE_LIMIT_PER_MINUTE: Number(process.env.WS_RATE_LIMIT_PER_MINUTE || 30)
  },
  GAME: {
    GRID_ROWS: 3,
    GRID_REELS: 5,
    PAYLINES: [
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
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
      [1, 0, 1, 2, 1],
      [1, 2, 1, 0, 1],
      [0, 2, 1, 2, 0]
    ],
    RTP_TARGET: Number(process.env.RTP_TARGET || 0.96),
    NEAR_MISS_FREQUENCY: Number(process.env.NEAR_MISS_FREQUENCY || 0.14),
    MAX_CASCADES: Number(process.env.MAX_CASCADES || 6),
    JACKPOT: {
      CONTRIBUTION_RATE: Number(process.env.JACKPOT_CONTRIBUTION_RATE || 0.01),
      SEED_POOL: Number(process.env.JACKPOT_SEED_POOL || 500),
      RESET_POOL: Number(process.env.JACKPOT_RESET_POOL || 500)
    },
    FREE_SPINS: {
      SCATTER_COUNT: Number(process.env.FREE_SPINS_SCATTER_COUNT || 3),
      AWARD_COUNT: Number(process.env.FREE_SPINS_AWARD_COUNT || 10),
      MULTIPLIER: Number(process.env.FREE_SPINS_MULTIPLIER || 2)
    },
    BET: {
      MIN: Number(process.env.BET_MIN || 0.1),
      MAX: Number(process.env.BET_MAX || 10),
      STEP: Number(process.env.BET_STEP || 0.1)
    },
    SPIN_FLOOR_MS: Number(process.env.SPIN_FLOOR_MS || 2500),
    NORMAL_ANIMATION_MS: Number(process.env.NORMAL_ANIMATION_MS || 2500),
    TURBO_ANIMATION_MS: Number(process.env.TURBO_ANIMATION_MS || 1000),
    AUTOPLAY_MAX: Number(process.env.AUTOPLAY_MAX || 50),
    STARTING_BALANCE: Number(process.env.STARTING_BALANCE || 100),
    DEPOSIT_LIMIT: Number(process.env.DEPOSIT_LIMIT || 1000),
    XP_PER_TOKEN: Number(process.env.XP_PER_TOKEN || 12),
    DEPOSIT_TOP_UP_AMOUNT: Number(process.env.DEPOSIT_TOP_UP_AMOUNT || 10),
    CASCADE_STEP_MS: Number(process.env.CASCADE_STEP_MS || 420),
    TIER_THRESHOLDS: {
      BRONZE: Number(process.env.TIER_BRONZE || 0),
      SILVER: Number(process.env.TIER_SILVER || 1500),
      GOLD: Number(process.env.TIER_GOLD || 4000),
      PLATINUM: Number(process.env.TIER_PLATINUM || 9000),
      VIP: Number(process.env.TIER_VIP || 18000)
    },
    SYMBOLS: [
      {
        id: 'GPT5',
        label: 'GPT-5',
        emoji: '🧠',
        weight: 7,
        payout: { 3: 5, 4: 20, 5: 120 }
      },
      {
        id: 'CLAUDE',
        label: 'Claude',
        emoji: '🪶',
        weight: 9,
        payout: { 3: 4, 4: 16, 5: 80 }
      },
      {
        id: 'GEMINI',
        label: 'Gemini',
        emoji: '♊',
        weight: 9,
        payout: { 3: 4, 4: 14, 5: 70 }
      },
      {
        id: 'GROK',
        label: 'Grok',
        emoji: '⚡',
        weight: 10,
        payout: { 3: 3, 4: 12, 5: 55 }
      },
      {
        id: 'DISRUPTION',
        label: 'Disruption',
        emoji: '💥',
        weight: 12,
        payout: { 3: 3, 4: 10, 5: 45 }
      },
      {
        id: 'TEN_X',
        label: '10x Engineer',
        emoji: '🔧',
        weight: 11,
        payout: { 3: 2, 4: 8, 5: 35 }
      },
      {
        id: 'PIVOT',
        label: 'Pivot',
        emoji: '🔄',
        weight: 11,
        payout: { 3: 2, 4: 7, 5: 30 }
      },
      {
        id: 'AGI_SOON',
        label: 'AGI Soon',
        emoji: '🚀',
        weight: 11,
        payout: { 3: 2, 4: 7, 5: 28 }
      },
      {
        id: 'WILD',
        label: 'Hallucination',
        emoji: '🌀',
        weight: 6,
        payout: { 3: 0, 4: 0, 5: 0 }
      },
      {
        id: 'SCATTER',
        label: 'Prompt',
        emoji: '📝',
        weight: 8,
        payout: { 3: 1, 4: 3, 5: 8 }
      }
    ]
  },
  COMPLIANCE: {
    REALITY_CHECK_MS: Number(process.env.REALITY_CHECK_MS || 3600000),
    AGE_GATE_REQUIRED: true,
    AUTOPLAY_HARD_CAP: Number(process.env.AUTOPLAY_HARD_CAP || 50),
    ENFORCE_NET_LOSS_NO_CELEBRATION: true
  },
  AUDIO: {
    AMBIENT_FREQUENCY_HZ: Number(process.env.AMBIENT_FREQUENCY_HZ || 58),
    WIN_BASE_FREQ_HZ: Number(process.env.WIN_BASE_FREQ_HZ || 240),
    WIN_STEPS: Number(process.env.WIN_STEPS || 4),
    NEAR_MISS_START_FREQ_HZ: Number(process.env.NEAR_MISS_START_FREQ_HZ || 190),
    NEAR_MISS_END_FREQ_HZ: Number(process.env.NEAR_MISS_END_FREQ_HZ || 420),
    TONE_DURATION_MS: Number(process.env.TONE_DURATION_MS || 120)
  }
};

export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ');

export function createServerSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

export function getPublicConfig() {
  return {
    app: {
      name: CONFIG.APP.NAME,
      version: CONFIG.APP.VERSION
    },
    game: {
      gridRows: CONFIG.GAME.GRID_ROWS,
      gridReels: CONFIG.GAME.GRID_REELS,
      paylines: CONFIG.GAME.PAYLINES,
      rtpTarget: CONFIG.GAME.RTP_TARGET,
      bet: {
        min: CONFIG.GAME.BET.MIN,
        max: CONFIG.GAME.BET.MAX,
        step: CONFIG.GAME.BET.STEP
      },
      spinFloorMs: CONFIG.GAME.SPIN_FLOOR_MS,
      normalAnimationMs: CONFIG.GAME.NORMAL_ANIMATION_MS,
      turboAnimationMs: CONFIG.GAME.TURBO_ANIMATION_MS,
      autoplayMax: CONFIG.GAME.AUTOPLAY_MAX,
      depositTopUpAmount: CONFIG.GAME.DEPOSIT_TOP_UP_AMOUNT,
      cascadeStepMs: CONFIG.GAME.CASCADE_STEP_MS,
      symbols: CONFIG.GAME.SYMBOLS,
      freeSpins: CONFIG.GAME.FREE_SPINS,
      tierThresholds: CONFIG.GAME.TIER_THRESHOLDS
    },
    compliance: {
      realityCheckMs: CONFIG.COMPLIANCE.REALITY_CHECK_MS,
      autoplayHardCap: CONFIG.COMPLIANCE.AUTOPLAY_HARD_CAP,
      ageGateRequired: CONFIG.COMPLIANCE.AGE_GATE_REQUIRED
    },
    audio: CONFIG.AUDIO
  };
}
