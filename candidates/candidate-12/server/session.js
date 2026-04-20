/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CONFIG, createServerSecret } from './config.js';

const sessionStore = new Map();

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    const first = forwardedFor.split(',')[0].trim();
    if (first.length > 0) {
      return first;
    }
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0]);
  }

  return request.socket.remoteAddress || '0.0.0.0';
}

export function buildFingerprint(request) {
  const ip = getClientIp(request);
  const userAgent = String(request.headers['user-agent'] || 'unknown-agent');
  const rawFingerprint = [ip, userAgent, CONFIG.SECURITY.FINGERPRINT_SALT].join('|');
  return hashValue(rawFingerprint);
}

export function createSession(ageConfirmed, request) {
  if (!ageConfirmed) {
    throw new Error('Age confirmation required.');
  }

  const id = crypto.randomUUID();
  const fingerprint = buildFingerprint(request);
  const now = Date.now();
  const requestSigningKey = createServerSecret();
  const resultVerificationKey = createServerSecret();

  const session = {
    id,
    createdAt: now,
    updatedAt: now,
    lastSpinAt: 0,
    fingerprint,
    ageConfirmed,
    balance: CONFIG.GAME.STARTING_BALANCE,
    sessionSpend: 0,
    depositTotal: CONFIG.GAME.STARTING_BALANCE,
    depositLimit: CONFIG.GAME.DEPOSIT_LIMIT,
    selfExcluded: false,
    freeSpinsRemaining: 0,
    activeBet: CONFIG.GAME.BET.MIN,
    xp: 0,
    tier: 'Bronze',
    usedNonces: new Map(),
    wsSockets: new Set(),
    requestSigningKey,
    resultVerificationKey
  };

  sessionStore.set(id, session);
  return session;
}

export function createToken(session) {
  const payload = {
    sid: session.id,
    fp: session.fingerprint
  };

  return jwt.sign(payload, CONFIG.SECURITY.JWT_SECRET, {
    expiresIn: CONFIG.SECURITY.JWT_EXPIRY_SECONDS
  });
}

export function parseTokenFromRequest(request) {
  const authHeader = String(request.headers.authorization || '');
  const bearerPrefix = 'Bearer ';
  if (authHeader.startsWith(bearerPrefix)) {
    return authHeader.slice(bearerPrefix.length).trim();
  }

  if (typeof request.query?.token === 'string' && request.query.token.length > 0) {
    return request.query.token;
  }

  return '';
}

export function validateToken(token, request) {
  if (!token) {
    throw new Error('Missing token.');
  }

  const payload = jwt.verify(token, CONFIG.SECURITY.JWT_SECRET);
  const session = sessionStore.get(payload.sid);
  if (!session) {
    throw new Error('Session not found.');
  }

  const fingerprint = buildFingerprint(request);
  if (payload.fp !== fingerprint || session.fingerprint !== fingerprint) {
    throw new Error('Fingerprint mismatch.');
  }

  session.updatedAt = Date.now();
  return session;
}

export function removeExpiredNonces(session, now) {
  for (const [nonce, ts] of session.usedNonces.entries()) {
    if (now - ts > CONFIG.SECURITY.NONCE_TTL_MS) {
      session.usedNonces.delete(nonce);
    }
  }
}

export function markNonce(session, nonce, timestamp) {
  session.usedNonces.set(nonce, timestamp);
}

export function hasNonce(session, nonce) {
  return session.usedNonces.has(nonce);
}

export function listSessions() {
  return sessionStore;
}

export function getTierFromXp(xp) {
  const thresholds = CONFIG.GAME.TIER_THRESHOLDS;
  if (xp >= thresholds.VIP) {
    return 'VIP';
  }
  if (xp >= thresholds.PLATINUM) {
    return 'Platinum';
  }
  if (xp >= thresholds.GOLD) {
    return 'Gold';
  }
  if (xp >= thresholds.SILVER) {
    return 'Silver';
  }
  return 'Bronze';
}
