/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { CONFIG } from "./config.js";

const REQUEST_SIGNATURE_HEADER = "x-request-signature";
const REQUEST_TIMESTAMP_HEADER = "x-request-timestamp";

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const keyPairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${keyPairs.join(",")}}`;
};

const hashHex = (input, algorithm) => crypto.createHash(algorithm).update(input).digest("hex");

const hmacHex = (key, input, algorithm) =>
  crypto.createHmac(algorithm, key).update(input).digest("hex");

const nowMs = () => Date.now();

const createSessionId = () => crypto.randomUUID();
const createSessionKey = () => crypto.randomBytes(32).toString("hex");

const getIpFromRequest = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "0.0.0.0";
};

const getUserAgentFromRequest = (req) => {
  const userAgent = req.headers["user-agent"];
  if (typeof userAgent !== "string") {
    return "unknown-agent";
  }
  return userAgent;
};

const buildFingerprintSource = (req) => `${getIpFromRequest(req)}|${getUserAgentFromRequest(req)}`;

const createFingerprint = (req) =>
  hashHex(buildFingerprintSource(req), CONFIG.SECURITY.FINGERPRINT_HASH_ALGORITHM);

const createJwt = (jwtSecret, sessionId, fingerprint) =>
  jwt.sign({ sid: sessionId, fp: fingerprint }, jwtSecret, {
    expiresIn: CONFIG.SECURITY.JWT_EXPIRY_SECONDS,
  });

const verifyJwt = (token, jwtSecret) => jwt.verify(token, jwtSecret);

const parseAuthHeader = (headerValue) => {
  if (typeof headerValue !== "string") {
    return null;
  }
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
};

const normalizeCurrency = (value) => {
  const precision = CONFIG.GAME.CURRENCY_PRECISION;
  return Number(value.toFixed(precision));
};

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createSession(req, { depositLimit, ageConfirmed }) {
    const sessionId = createSessionId();
    const fingerprint = createFingerprint(req);
    const requestSigningKey = createSessionKey();
    const spinVerificationKey = createSessionKey();
    const jwtToken = createJwt(process.env.JWT_SECRET, sessionId, fingerprint);
    const createdAt = nowMs();

    const session = {
      id: sessionId,
      fingerprint,
      createdAt,
      updatedAt: createdAt,
      ageVerified: Boolean(ageConfirmed),
      balance: CONFIG.GAME.STARTING_BALANCE,
      depositLimit,
      sessionSpend: 0,
      totalWagered: 0,
      totalWon: 0,
      xp: 0,
      freeSpinsRemaining: 0,
      freeSpinMultiplier: CONFIG.GAME.FREE_SPIN_MULTIPLIER,
      jackpotWins: 0,
      lastSpinAt: 0,
      selfExcluded: false,
      requestSigningKey,
      spinVerificationKey,
      requestCounter: 0,
      realityCheckAcknowledgedAt: createdAt,
      websocketMessageCount: 0,
      websocketWindowStartMs: createdAt,
    };

    this.sessions.set(sessionId, session);
    return {
      jwtToken,
      session,
    };
  }

  getById(sessionId) {
    return this.sessions.get(sessionId) ?? null;
  }

  update(sessionId, nextValues) {
    const current = this.getById(sessionId);
    if (!current) {
      return null;
    }
    const updated = {
      ...current,
      ...nextValues,
      updatedAt: nowMs(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  authenticateRequest(req) {
    const token = parseAuthHeader(req.headers.authorization);
    if (!token) {
      return { ok: false, status: 401, message: "Missing bearer token." };
    }

    let payload;
    try {
      payload = verifyJwt(token, process.env.JWT_SECRET);
    } catch {
      return { ok: false, status: 401, message: "Invalid or expired session token." };
    }

    const session = this.getById(payload.sid);
    if (!session) {
      return { ok: false, status: 401, message: "Session not found." };
    }

    const fingerprint = createFingerprint(req);
    if (fingerprint !== payload.fp || fingerprint !== session.fingerprint) {
      return { ok: false, status: 401, message: "Fingerprint mismatch." };
    }

    return { ok: true, session, token };
  }

  verifySignedRequest(req, session) {
    const signature = req.headers[REQUEST_SIGNATURE_HEADER];
    const timestamp = req.headers[REQUEST_TIMESTAMP_HEADER];

    if (typeof signature !== "string" || typeof timestamp !== "string") {
      return { ok: false, status: 400, message: "Missing request signature headers." };
    }

    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
      return { ok: false, status: 400, message: "Invalid request timestamp." };
    }

    const ageMs = Math.abs(nowMs() - timestampNumber);
    if (ageMs > CONFIG.SECURITY.REQUEST_SIGNATURE_WINDOW_MS) {
      return { ok: false, status: 400, message: "Request signature expired." };
    }

    const canonicalBody = stableStringify(req.body ?? {});
    const expected = hmacHex(
      session.requestSigningKey,
      `${timestamp}.${canonicalBody}.${session.requestCounter + 1}`,
      CONFIG.SECURITY.SIGNATURE_ALGORITHM
    );
    if (expected !== signature) {
      return { ok: false, status: 400, message: "Invalid request HMAC signature." };
    }

    this.update(session.id, { requestCounter: session.requestCounter + 1 });
    return { ok: true };
  }
}

const createPublicSessionView = (session, jwtToken) => ({
  token: jwtToken,
  requestSigningKey: session.requestSigningKey,
  spinVerificationKey: session.spinVerificationKey,
  profile: {
    balance: normalizeCurrency(session.balance),
    depositLimit: normalizeCurrency(session.depositLimit),
    sessionSpend: normalizeCurrency(session.sessionSpend),
    xp: session.xp,
    freeSpinsRemaining: session.freeSpinsRemaining,
    freeSpinMultiplier: session.freeSpinMultiplier,
    tier: CONFIG.GAME.XP_TIERS[0].label,
  },
});

const sanitizeDepositLimit = (rawLimit) => {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    return CONFIG.GAME.SESSION_DEPOSIT_LIMIT_DEFAULT;
  }
  const bounded = Math.min(
    CONFIG.GAME.SESSION_DEPOSIT_LIMIT_MAX,
    Math.max(CONFIG.GAME.SESSION_DEPOSIT_LIMIT_MIN, parsed)
  );
  return normalizeCurrency(bounded);
};

export {
  SessionStore,
  createPublicSessionView,
  sanitizeDepositLimit,
  normalizeCurrency,
  stableStringify,
  hmacHex,
};
