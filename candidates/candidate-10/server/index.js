import crypto from "crypto";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { APP_CONFIG, PUBLIC_CONFIG } from "./config.js";
import {
  createFingerprint,
  createSessionId,
  createSessionToken,
  getClientIp,
  validateSessionToken
} from "./session.js";
import { createSignedPayload, signSerialized, spinOutcome } from "./game.js";

const app = express();
const httpServer = http.createServer(app);
const wsServer = new WebSocketServer({ noServer: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, "../client");

const sessions = new Map();
const wsConnections = new Map();

let jackpotPool = APP_CONFIG.game.jackpotSeed;

const cspHeader = Object.entries(APP_CONFIG.server.csp)
  .map(([key, value]) => {
    const kebab = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return `${kebab} ${value}`;
  })
  .join("; ");

const roundCurrency = (value) => {
  const precision = 100;
  return Math.round(value * precision) / precision;
};

const createTierSnapshot = (xp) => {
  const tiers = APP_CONFIG.progression.tiers;
  let activeTier = tiers[0];
  let nextTier = tiers[tiers.length - 1];

  for (let index = 0; index < tiers.length; index += 1) {
    if (xp >= tiers[index].threshold) {
      activeTier = tiers[index];
      nextTier = tiers[Math.min(index + 1, tiers.length - 1)];
    }
  }

  const tierRange = Math.max(nextTier.threshold - activeTier.threshold, 1);
  const xpInTier = Math.max(xp - activeTier.threshold, 0);
  const progressRatio = Math.min(xpInTier / tierRange, 1);

  return {
    badge: activeTier.badge,
    xp,
    progressRatio: roundCurrency(progressRatio)
  };
};

const buildSessionState = (session) => ({
  balance: roundCurrency(session.balance),
  deposited: roundCurrency(session.deposited),
  spent: roundCurrency(session.spent),
  totalWagered: roundCurrency(session.totalWagered),
  totalWon: roundCurrency(session.totalWon),
  freeSpinsRemaining: session.freeSpinsRemaining,
  selfExcluded: session.selfExcluded,
  jackpotPool: roundCurrency(jackpotPool),
  progression: createTierSnapshot(session.xp)
});

const buildSignatureState = (session) => ({
  balance: roundCurrency(session.balance),
  deposited: roundCurrency(session.deposited),
  spent: roundCurrency(session.spent),
  totalWagered: roundCurrency(session.totalWagered),
  totalWon: roundCurrency(session.totalWon),
  freeSpinsRemaining: session.freeSpinsRemaining,
  selfExcluded: session.selfExcluded,
  progression: createTierSnapshot(session.xp)
});

const getStateSignature = (session) =>
  signSerialized({
    serialized: JSON.stringify(buildSignatureState(session)),
    secret: APP_CONFIG.security.stateHmacSecret
  });

const sanitizePostBody = (body, schema) => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const sanitized = {};
  for (const [field, rule] of Object.entries(schema)) {
    const raw = body[field];
    if (raw === undefined || raw === null) {
      if (rule.required) {
        return { ok: false, error: `Missing field: ${field}` };
      }
      continue;
    }

    if (rule.type === "boolean") {
      if (typeof raw !== "boolean") {
        return { ok: false, error: `Invalid boolean for ${field}` };
      }
      sanitized[field] = raw;
      continue;
    }

    if (rule.type === "number") {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        return { ok: false, error: `Invalid number for ${field}` };
      }
      if (rule.min !== undefined && numeric < rule.min) {
        return { ok: false, error: `${field} below minimum` };
      }
      if (rule.max !== undefined && numeric > rule.max) {
        return { ok: false, error: `${field} above maximum` };
      }
      sanitized[field] = roundCurrency(numeric);
      continue;
    }

    if (rule.type === "string") {
      if (typeof raw !== "string") {
        return { ok: false, error: `Invalid string for ${field}` };
      }
      const trimmed = raw.trim();
      if (rule.maxLength !== undefined && trimmed.length > rule.maxLength) {
        return { ok: false, error: `${field} too long` };
      }
      sanitized[field] = trimmed;
    }
  }

  return { ok: true, value: sanitized };
};

const isBetStepValid = (bet) => {
  const delta = (bet - APP_CONFIG.game.minBet) / APP_CONFIG.game.betStep;
  const roundedDelta = Math.round(delta);
  const tolerance = 1e-9;
  return Math.abs(delta - roundedDelta) <= tolerance;
};

const secureEqualHex = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (APP_CONFIG.server.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin denied"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-State-Signature"]
  })
);

app.use(
  express.json({
    limit: `${APP_CONFIG.compliance.maxBodyBytes}b`
  })
);

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", cspHeader);
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use("/css", express.static(path.join(clientRoot, "css")));
app.use("/js", express.static(path.join(clientRoot, "js")));
app.get("/", (_req, res) => {
  res.sendFile(path.join(clientRoot, "index.html"));
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing session token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const fingerprint = createFingerprint(ip, userAgent);

  let decoded;
  try {
    decoded = validateSessionToken({ token, fingerprint });
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }

  const session = sessions.get(decoded.sub);
  if (!session || session.fingerprint !== fingerprint) {
    res.status(401).json({ error: "Session not found" });
    return;
  }

  req.session = session;
  req.sessionId = decoded.sub;
  next();
};

const requireStateSignature = (req, res, next) => {
  const providedSignature = req.header("X-State-Signature");
  const expectedSignature = getStateSignature(req.session);

  if (!secureEqualHex(providedSignature, expectedSignature)) {
    res.status(403).json({ error: "Invalid HMAC signature" });
    return;
  }

  next();
};

const sendSignedState = (res, session) => {
  const state = buildSessionState(session);
  const stateSignature = getStateSignature(session);
  res.json({ state, stateSignature });
};

const pushSessionUpdate = (sessionId) => {
  const session = sessions.get(sessionId);
  const socket = wsConnections.get(sessionId);
  if (!session || !socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const payload = {
    type: "session-state",
    state: buildSessionState(session),
    stateSignature: getStateSignature(session)
  };
  socket.send(JSON.stringify(payload));
};

const pushJackpotUpdate = () => {
  const payload = JSON.stringify({
    type: "jackpot",
    jackpotPool: roundCurrency(jackpotPool)
  });

  for (const socket of wsConnections.values()) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
};

app.post("/api/session/create", (req, res) => {
  const { ok, value, error } = sanitizePostBody(req.body, {
    ageConfirmed: { type: "boolean", required: true },
    deposit: {
      type: "number",
      required: false,
      min: APP_CONFIG.game.minBet,
      max: APP_CONFIG.compliance.sessionDepositLimit
    }
  });

  if (!ok) {
    res.status(400).json({ error });
    return;
  }

  if (!value.ageConfirmed) {
    res.status(403).json({ error: "Age gate not confirmed" });
    return;
  }

  const deposit = value.deposit ?? APP_CONFIG.session.defaultDeposit;
  if (deposit > APP_CONFIG.compliance.sessionDepositLimit) {
    res.status(400).json({ error: "Deposit limit exceeded" });
    return;
  }

  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const fingerprint = createFingerprint(ip, userAgent);
  const sessionId = createSessionId();

  const session = {
    id: sessionId,
    fingerprint,
    createdAt: Date.now(),
    balance: roundCurrency(deposit),
    deposited: roundCurrency(deposit),
    spent: 0,
    totalWagered: 0,
    totalWon: 0,
    freeSpinsRemaining: 0,
    selfExcluded: false,
    xp: 0,
    lastSpinAt: 0
  };
  sessions.set(sessionId, session);

  const token = createSessionToken({ sessionId, fingerprint });
  const state = buildSessionState(session);
  const stateSignature = getStateSignature(session);

  res.json({
    token,
    publicConfig: PUBLIC_CONFIG,
    resultVerificationKey: APP_CONFIG.security.resultHmacSecret,
    state,
    stateSignature
  });
});

app.get("/api/state", authMiddleware, (req, res) => {
  sendSignedState(res, req.session);
});

app.get("/api/paytable", (_req, res) => {
  res.json({
    symbols: PUBLIC_CONFIG.symbols,
    paylines: PUBLIC_CONFIG.game.paylines,
    freeSpinsAwarded: PUBLIC_CONFIG.game.freeSpinsAwarded,
    freeSpinsMultiplier: PUBLIC_CONFIG.game.freeSpinsMultiplier,
    jackpotContributionRate: APP_CONFIG.game.jackpotContributionRate
  });
});

app.post("/api/deposit", authMiddleware, requireStateSignature, (req, res) => {
  const { ok, value, error } = sanitizePostBody(req.body, {
    amount: {
      type: "number",
      required: true,
      min: APP_CONFIG.game.minBet,
      max: APP_CONFIG.compliance.sessionDepositLimit
    }
  });

  if (!ok) {
    res.status(400).json({ error });
    return;
  }

  const remainingLimit =
    APP_CONFIG.compliance.sessionDepositLimit - req.session.deposited;
  if (value.amount > remainingLimit) {
    res.status(400).json({ error: "Session deposit limit exceeded" });
    return;
  }

  req.session.balance = roundCurrency(req.session.balance + value.amount);
  req.session.deposited = roundCurrency(req.session.deposited + value.amount);
  pushSessionUpdate(req.sessionId);
  sendSignedState(res, req.session);
});

app.post(
  "/api/self-exclude",
  authMiddleware,
  requireStateSignature,
  (req, res) => {
    const { ok, error } = sanitizePostBody(req.body, {});
    if (!ok) {
      res.status(400).json({ error });
      return;
    }

    req.session.selfExcluded = true;
    pushSessionUpdate(req.sessionId);
    sendSignedState(res, req.session);
  }
);

app.post("/api/spin", authMiddleware, requireStateSignature, (req, res) => {
  const { ok, value, error } = sanitizePostBody(req.body, {
    bet: {
      type: "number",
      required: true,
      min: APP_CONFIG.game.minBet,
      max: APP_CONFIG.game.maxBet
    }
  });

  if (!ok) {
    res.status(400).json({ error });
    return;
  }

  if (req.session.selfExcluded) {
    res.status(403).json({ error: "Self-exclusion is active for this session" });
    return;
  }

  if (!isBetStepValid(value.bet)) {
    res.status(400).json({ error: "Bet increment is invalid" });
    return;
  }

  const now = Date.now();
  const elapsedSinceLastSpin = now - req.session.lastSpinAt;
  if (elapsedSinceLastSpin < APP_CONFIG.game.spinFloorMs) {
    res.status(429).json({ error: "Spin floor active. Slow down." });
    return;
  }

  const isFreeSpin = req.session.freeSpinsRemaining > 0;
  const multiplier = isFreeSpin ? APP_CONFIG.game.freeSpinsMultiplier : 1;
  const wager = isFreeSpin ? 0 : value.bet;

  if (!isFreeSpin && req.session.balance < value.bet) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  if (!isFreeSpin) {
    req.session.balance = roundCurrency(req.session.balance - value.bet);
    req.session.spent = roundCurrency(req.session.spent + value.bet);
    req.session.totalWagered = roundCurrency(req.session.totalWagered + value.bet);
    jackpotPool = roundCurrency(
      jackpotPool + value.bet * APP_CONFIG.game.jackpotContributionRate
    );
  } else {
    req.session.freeSpinsRemaining -= 1;
  }

  const outcome = spinOutcome({
    bet: value.bet,
    multiplier,
    jackpotPoolBefore: jackpotPool
  });

  jackpotPool = outcome.jackpotPoolAfter;

  req.session.freeSpinsRemaining += outcome.freeSpinsAwarded;
  req.session.balance = roundCurrency(req.session.balance + outcome.totalWin);
  req.session.totalWon = roundCurrency(req.session.totalWon + outcome.totalWin);
  req.session.xp = roundCurrency(
    req.session.xp + wager * APP_CONFIG.progression.xpPerTokenWagered
  );
  req.session.lastSpinAt = now;

  const spinPayload = {
    createdAt: Date.now(),
    bet: value.bet,
    isFreeSpin,
    freeSpinsRemaining: req.session.freeSpinsRemaining,
    multiplier,
    rounds: outcome.rounds,
    scatterCount: outcome.scatterCount,
    freeSpinsAwarded: outcome.freeSpinsAwarded,
    totalWin: outcome.totalWin,
    nearMiss: outcome.nearMiss,
    jackpotWon: outcome.jackpotWon,
    jackpotPool: roundCurrency(jackpotPool),
    message: outcome.message,
    stateAfter: buildSessionState(req.session)
  };

  const signedSpin = createSignedPayload({
    payload: spinPayload,
    secret: APP_CONFIG.security.resultHmacSecret
  });

  pushSessionUpdate(req.sessionId);
  pushJackpotUpdate();

  res.json({
    signedSpin,
    state: buildSessionState(req.session),
    stateSignature: getStateSignature(req.session)
  });
});

app.use((err, _req, res, _next) => {
  if (err?.message === "CORS origin denied") {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  res.status(500).json({ error: "Server error" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

httpServer.on("upgrade", (req, socket, head) => {
  const host = req.headers.host ?? `localhost:${APP_CONFIG.server.port}`;
  const url = new URL(req.url ?? "", `http://${host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token");
  if (!token) {
    socket.destroy();
    return;
  }

  const ip = req.socket.remoteAddress ?? "0.0.0.0";
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const fingerprint = createFingerprint(ip, userAgent);

  let decoded;
  try {
    decoded = validateSessionToken({ token, fingerprint });
  } catch (_error) {
    socket.destroy();
    return;
  }

  const session = sessions.get(decoded.sub);
  if (!session || session.fingerprint !== fingerprint) {
    socket.destroy();
    return;
  }

  wsServer.handleUpgrade(req, socket, head, (ws) => {
    ws.sessionId = decoded.sub;
    wsServer.emit("connection", ws);
  });
});

wsServer.on("connection", (ws) => {
  wsConnections.set(ws.sessionId, ws);
  ws.rateWindowStart = Date.now();
  ws.rateCount = 0;

  ws.send(
    JSON.stringify({
      type: "session-state",
      state: buildSessionState(sessions.get(ws.sessionId)),
      stateSignature: getStateSignature(sessions.get(ws.sessionId))
    })
  );

  ws.on("message", (rawMessage) => {
    const now = Date.now();
    const minuteMs = 60 * 1000;

    if (now - ws.rateWindowStart >= minuteMs) {
      ws.rateWindowStart = now;
      ws.rateCount = 0;
    }

    if (ws.rateCount >= APP_CONFIG.compliance.wsRateLimitPerMinute) {
      ws.close(4408, "Rate limit exceeded");
      return;
    }
    ws.rateCount += 1;

    let parsed;
    try {
      parsed = JSON.parse(rawMessage.toString());
    } catch (_error) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message JSON" }));
      return;
    }

    const messageType = typeof parsed.type === "string" ? parsed.type : "";
    if (messageType === "ping") {
      ws.send(JSON.stringify({ type: "pong", timestamp: now }));
      return;
    }

    if (messageType === "state") {
      const session = sessions.get(ws.sessionId);
      ws.send(
        JSON.stringify({
          type: "session-state",
          state: buildSessionState(session),
          stateSignature: getStateSignature(session)
        })
      );
      return;
    }

    ws.send(JSON.stringify({ type: "error", message: "Unsupported message type" }));
  });

  ws.on("close", () => {
    wsConnections.delete(ws.sessionId);
  });
});

httpServer.listen(APP_CONFIG.server.port, () => {
  console.log(
    `AI Satire Slot server listening on http://localhost:${APP_CONFIG.server.port}`
  );
});
