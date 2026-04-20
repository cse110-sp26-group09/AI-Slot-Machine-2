import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { CONFIG } from "./config.js";

const toBase64Url = (buffer) => buffer.toString("base64url");

const hmac = (namespace, payload) => {
  return crypto
    .createHmac("sha256", CONFIG.SECURITY.SERVER_HMAC_SECRET)
    .update(namespace)
    .update(":")
    .update(payload)
    .digest("base64url");
};

export const computeFingerprint = (ipAddress, userAgent) => {
  const normalizedIp = ipAddress ?? "unknown-ip";
  const normalizedUa = userAgent ?? "unknown-ua";
  const raw = `${normalizedIp}|${normalizedUa}|${CONFIG.SECURITY.FINGERPRINT_SALT}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export const createSessionToken = ({ sessionId, fingerprint }) => {
  return jwt.sign(
    {
      sid: sessionId,
      fp: fingerprint
    },
    CONFIG.SECURITY.JWT_SECRET,
    {
      expiresIn: `${CONFIG.LIMITS.JWT_EXPIRY_MINUTES}m`
    }
  );
};

export const validateSessionToken = ({ token, ipAddress, userAgent }) => {
  const decoded = jwt.verify(token, CONFIG.SECURITY.JWT_SECRET);
  const liveFingerprint = computeFingerprint(ipAddress, userAgent);

  if (decoded.fp !== liveFingerprint) {
    throw new Error("Session fingerprint mismatch");
  }

  return decoded;
};

export const createClientVerifyKey = () => {
  const randomBytes = crypto.randomBytes(32);
  return toBase64Url(randomBytes);
};

export const signClientPayload = ({ payloadString, clientVerifyKey }) => {
  return crypto
    .createHmac("sha256", clientVerifyKey)
    .update(payloadString)
    .digest("base64url");
};

export const createRequestGuard = ({ sessionId, nonce, balance }) => {
  const payload = JSON.stringify({ sessionId, nonce, balance });
  return hmac(CONFIG.SECURITY.REQUEST_GUARD_NAMESPACE, payload);
};

export const validateRequestGuard = ({ sessionId, nonce, balance, suppliedGuard }) => {
  const expectedGuard = createRequestGuard({ sessionId, nonce, balance });
  const expectedBuffer = Buffer.from(expectedGuard);
  const suppliedBuffer = Buffer.from(suppliedGuard ?? "");

  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
};

export const buildSessionState = ({ ipAddress, userAgent, depositLimit }) => {
  const sessionId = crypto.randomUUID();
  const fingerprint = computeFingerprint(ipAddress, userAgent);
  const token = createSessionToken({ sessionId, fingerprint });
  const clientVerifyKey = createClientVerifyKey();

  return {
    token,
    session: {
      id: sessionId,
      fingerprint,
      balance: CONFIG.LIMITS.SESSION_INITIAL_BALANCE,
      depositLimit,
      lastSpinAt: 0,
      totalWagered: 0,
      totalWon: 0,
      sessionSpend: 0,
      freeSpinsRemaining: 0,
      selfExcluded: false,
      ageConfirmed: true,
      xp: 0,
      tier: CONFIG.XP.TIER_SEQUENCE[0],
      expectedNonce: 1,
      clientVerifyKey,
      createdAt: Date.now()
    }
  };
};
