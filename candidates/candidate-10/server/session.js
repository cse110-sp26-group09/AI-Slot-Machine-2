/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { APP_CONFIG } from "./config.js";

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    const [first] = forwarded.split(",");
    return first.trim();
  }

  return req.socket?.remoteAddress ?? "0.0.0.0";
};

export const createFingerprint = (ip, userAgent) =>
  crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent}|${APP_CONFIG.security.fingerprintPepper}`)
    .digest("hex");

export const createSessionToken = ({ sessionId, fingerprint }) =>
  jwt.sign(
    {
      sub: sessionId,
      fp: fingerprint
    },
    APP_CONFIG.security.jwtSecret,
    {
      expiresIn: `${APP_CONFIG.security.jwtExpiryMinutes}m`
    }
  );

export const validateSessionToken = ({ token, fingerprint }) => {
  const decoded = jwt.verify(token, APP_CONFIG.security.jwtSecret);
  if (!decoded || decoded.fp !== fingerprint) {
    throw new Error("Fingerprint mismatch");
  }

  return decoded;
};

export const createSessionId = () => crypto.randomUUID();
