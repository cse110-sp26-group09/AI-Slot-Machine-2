/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

﻿import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import cors from "cors";
import { WebSocket, WebSocketServer } from "ws";
import { CONFIG, PUBLIC_CONFIG } from "./config.js";
import { normalizeBet, runSpin, signPayloadForClient } from "./game.js";
import {
  buildSessionState,
  validateSessionToken,
  validateRequestGuard,
  createRequestGuard
} from "./session.js";

const app = express();
const server = http.createServer(app);
const sessions = new Map();
let jackpotPool = CONFIG.LIMITS.JACKPOT_START_POOL;

const getIpAddress = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket.remoteAddress ?? req.ip ?? "0.0.0.0";
};

const sanitizeString = (value) => value.replace(/[<>`"']/g, "").trim();

const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map((entry) => sanitizeInput(entry));
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, sanitizeInput(value)]));
  }

  return input;
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin || CONFIG.SECURITY.CORS_WHITELIST.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS policy"));
  },
  methods: ["GET", "POST"],
  credentials: false
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));
app.use((req, _res, next) => {
  if (req.method === "POST") {
    req.body = sanitizeInput(req.body);
  }
  next();
});

app.use((req, res, next) => {
  const isDevelopmentPort = CONFIG.APP_PORT;
  const cspConnect = `'self' ws://localhost:${isDevelopmentPort}`;

  res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self'; style-src 'self'; connect-src ${cspConnect}; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

const authenticateHttpSession = (req, res, next) => {
  try {
    const authorization = req.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

    if (!token) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }

    const decoded = validateSessionToken({
      token,
      ipAddress: getIpAddress(req),
      userAgent: req.get("user-agent") ?? ""
    });

    const sessionState = sessions.get(decoded.sid);

    if (!sessionState) {
      res.status(401).json({ error: "Unknown session" });
      return;
    }

    req.sessionId = decoded.sid;
    req.sessionState = sessionState;
    next();
  } catch (error) {
    res.status(401).json({ error: "Session validation failed" });
  }
};

const verifyRequestSignature = (req, res, next) => {
  const { nonce, requestGuard } = req.body ?? {};

  if (!Number.isInteger(nonce) || typeof requestGuard !== "string") {
    res.status(400).json({ error: "Request signature missing or malformed" });
    return;
  }

  if (nonce !== req.sessionState.expectedNonce) {
    res.status(401).json({ error: "Invalid request nonce" });
    return;
  }

  const isValid = validateRequestGuard({
    sessionId: req.sessionId,
    nonce,
    balance: req.sessionState.balance,
    suppliedGuard: requestGuard
  });

  if (!isValid) {
    res.status(401).json({ error: "Invalid HMAC signature" });
    return;
  }

  next();
};

const signedPayloadResponse = ({ payload, sessionState, sessionId }) => {
  const responsePayload = {
    ...payload,
    requestNonce: sessionState.expectedNonce,
    requestGuard: createRequestGuard({
      sessionId,
      nonce: sessionState.expectedNonce,
      balance: sessionState.balance
    }),
    timing: {
      normalSpinMs: CONFIG.TIMINGS.NORMAL_SPIN_MS,
      turboSpinMs: CONFIG.TIMINGS.TURBO_SPIN_MS,
      spinFloorMs: CONFIG.TIMINGS.SPIN_FLOOR_MS,
      cascadeStepMs: CONFIG.TIMINGS.CASCADE_STEP_MS
    }
  };

  return signPayloadForClient({
    payload: responsePayload,
    clientVerifyKey: sessionState.clientVerifyKey
  });
};

const publishJackpotUpdate = (wss) => {
  const jackpotEvent = JSON.stringify({
    type: "jackpot",
    jackpotPool: jackpotPool
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client.isAuthenticated === true) {
      client.send(jackpotEvent);
    }
  }
};

app.get("/api/bootstrap", (_req, res) => {
  res.json({
    config: PUBLIC_CONFIG,
    wsPath: "/ws"
  });
});

app.post("/api/session/start", (req, res) => {
  const { ageConfirmed, depositLimit } = req.body ?? {};

  if (ageConfirmed !== true) {
    res.status(403).json({ error: "Age confirmation required" });
    return;
  }

  const requestedDepositLimit = Number(depositLimit);
  const normalizedDepositLimit = Number.isFinite(requestedDepositLimit)
    ? Math.min(Math.max(requestedDepositLimit, CONFIG.LIMITS.BET_MIN), CONFIG.LIMITS.SESSION_DEPOSIT_LIMIT)
    : CONFIG.LIMITS.SESSION_DEPOSIT_LIMIT;

  const { token, session } = buildSessionState({
    ipAddress: getIpAddress(req),
    userAgent: req.get("user-agent") ?? "",
    depositLimit: normalizedDepositLimit
  });

  sessions.set(session.id, session);

  const payload = signedPayloadResponse({
    payload: {
      event: "session_started",
      balance: session.balance,
      sessionSpend: session.sessionSpend,
      freeSpinsRemaining: session.freeSpinsRemaining,
      xp: session.xp,
      tier: session.tier,
      jackpotPool,
      depositLimit: session.depositLimit
    },
    sessionState: session,
    sessionId: session.id
  });

  res.status(201).json({
    token,
    clientVerifyKey: session.clientVerifyKey,
    signedPayload: payload.payloadString,
    signature: payload.signature
  });
});

app.post("/api/state", authenticateHttpSession, verifyRequestSignature, (req, res) => {
  req.sessionState.expectedNonce += 1;

  const payload = signedPayloadResponse({
    payload: {
      event: "state",
      balance: req.sessionState.balance,
      sessionSpend: req.sessionState.sessionSpend,
      freeSpinsRemaining: req.sessionState.freeSpinsRemaining,
      xp: req.sessionState.xp,
      tier: req.sessionState.tier,
      jackpotPool,
      selfExcluded: req.sessionState.selfExcluded
    },
    sessionState: req.sessionState,
    sessionId: req.sessionId
  });

  res.json({
    signedPayload: payload.payloadString,
    signature: payload.signature
  });
});

app.post("/api/spin", authenticateHttpSession, verifyRequestSignature, (req, res) => {
  if (req.sessionState.selfExcluded) {
    res.status(403).json({ error: "Self-exclusion active" });
    return;
  }

  const now = Date.now();
  const elapsedSinceLastSpin = now - req.sessionState.lastSpinAt;

  if (elapsedSinceLastSpin < CONFIG.TIMINGS.SPIN_FLOOR_MS) {
    res.status(429).json({ error: "Spin floor not reached", waitMs: CONFIG.TIMINGS.SPIN_FLOOR_MS - elapsedSinceLastSpin });
    return;
  }

  const betAmount = normalizeBet(req.body?.betAmount);

  if (betAmount === null) {
    res.status(400).json({ error: "Bet amount out of range" });
    return;
  }

  const isPaidSpin = req.sessionState.freeSpinsRemaining === 0;

  if (isPaidSpin && req.sessionState.balance < betAmount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  if (isPaidSpin && req.sessionState.totalWagered + betAmount > req.sessionState.depositLimit) {
    res.status(403).json({ error: "Session deposit limit reached" });
    return;
  }

  req.sessionState.lastSpinAt = now;

  const outcome = runSpin({
    betAmount,
    sessionState: req.sessionState,
    jackpotPool
  });

  jackpotPool = outcome.nextJackpotPool;
  publishJackpotUpdate(wss);
  req.sessionState.expectedNonce += 1;

  const payload = signedPayloadResponse({
    payload: {
      event: "spin",
      ...outcome.payload
    },
    sessionState: req.sessionState,
    sessionId: req.sessionId
  });

  res.json({
    signedPayload: payload.payloadString,
    signature: payload.signature
  });
});

app.post("/api/self-exclude", authenticateHttpSession, verifyRequestSignature, (req, res) => {
  req.sessionState.selfExcluded = true;
  req.sessionState.expectedNonce += 1;

  const payload = signedPayloadResponse({
    payload: {
      event: "self_excluded",
      selfExcluded: true,
      balance: req.sessionState.balance,
      sessionSpend: req.sessionState.sessionSpend,
      freeSpinsRemaining: req.sessionState.freeSpinsRemaining,
      xp: req.sessionState.xp,
      tier: req.sessionState.tier,
      jackpotPool
    },
    sessionState: req.sessionState,
    sessionId: req.sessionId
  });

  res.json({
    signedPayload: payload.payloadString,
    signature: payload.signature
  });
});

const buildRoot = path.join(CONFIG.BUILD_DIR, "index.html");
const staticRoot = fs.existsSync(buildRoot) ? CONFIG.BUILD_DIR : CONFIG.CLIENT_DIR;

app.use(express.static(staticRoot));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

const wss = new WebSocketServer({
  server,
  path: "/ws"
});

wss.on("connection", (socket, req) => {
  socket.isAuthenticated = false;
  socket.sessionId = null;
  socket.windowStartedAt = Date.now();
  socket.windowMessageCount = 0;

  socket.on("message", (rawMessage) => {
    try {
      const now = Date.now();
      if (now - socket.windowStartedAt >= CONFIG.TIMINGS.WS_RATE_WINDOW_MS) {
        socket.windowStartedAt = now;
        socket.windowMessageCount = 0;
      }

      socket.windowMessageCount += 1;
      if (socket.windowMessageCount > CONFIG.LIMITS.WS_RATE_PER_MINUTE) {
        socket.send(JSON.stringify({ type: "error", message: "WebSocket rate limit exceeded" }));
        return;
      }

      const parsed = sanitizeInput(JSON.parse(rawMessage.toString()));

      if (socket.isAuthenticated !== true) {
        if (parsed.type !== "auth" || typeof parsed.token !== "string") {
          socket.close();
          return;
        }

        const decoded = validateSessionToken({
          token: parsed.token,
          ipAddress: req.socket.remoteAddress ?? "0.0.0.0",
          userAgent: req.headers["user-agent"] ?? ""
        });

        if (!sessions.has(decoded.sid)) {
          socket.close();
          return;
        }

        socket.isAuthenticated = true;
        socket.sessionId = decoded.sid;
        socket.send(JSON.stringify({ type: "auth_ok", jackpotPool }));
        return;
      }

      const linkedSession = sessions.get(socket.sessionId);
      if (!linkedSession) {
        socket.close();
        return;
      }

      if (parsed.type === "state") {
        socket.send(
          JSON.stringify({
            type: "state",
            balance: linkedSession.balance,
            sessionSpend: linkedSession.sessionSpend,
            freeSpinsRemaining: linkedSession.freeSpinsRemaining,
            xp: linkedSession.xp,
            tier: linkedSession.tier,
            jackpotPool
          })
        );
      }

      if (parsed.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", at: Date.now() }));
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: "error", message: "Malformed WebSocket payload" }));
    }
  });
});

server.listen(CONFIG.APP_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`${CONFIG.APP_NAME} listening on http://localhost:${CONFIG.APP_PORT}`);
});

setInterval(() => {
  publishJackpotUpdate(wss);
}, CONFIG.TIMINGS.WS_RATE_WINDOW_MS);
