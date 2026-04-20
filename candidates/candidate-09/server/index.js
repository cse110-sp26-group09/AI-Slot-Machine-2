import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { CONFIG } from "./config.js";
import {
  SessionStore,
  createPublicSessionView,
  sanitizeDepositLimit,
} from "./session.js";
import { createClientConfigPayload, createSpinResult, validateBetAmount } from "./game.js";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = CONFIG.SECURITY.DEV_JWT_SECRET;
}

const app = express();
const server = http.createServer(app);
const sessionStore = new SessionStore();
const wss = new WebSocketServer({ noServer: true });

let jackpotPool = CONFIG.GAME.STARTING_JACKPOT_POOL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? CONFIG.SERVER.DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value
      .slice(0, CONFIG.SANITIZE.MAX_STRING_LENGTH)
      .replace(CONFIG.SANITIZE.REPLACE_PATTERN, CONFIG.SANITIZE.REPLACE_WITH);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
    );
  }
  return value;
};

const getRequestFingerprint = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string" && forwardedFor.length > 0
      ? forwardedFor.split(",")[0].trim()
      : req.socket?.remoteAddress ?? "0.0.0.0";
  const userAgent =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"]
      : "unknown-agent";
  return `${ip}|${userAgent}`;
};

const getRequestFingerprintHash = (req) =>
  crypto
    .createHash(CONFIG.SECURITY.FINGERPRINT_HASH_ALGORITHM)
    .update(getRequestFingerprint(req))
    .digest("hex");

const withSecurityHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      res.status(403).json({ error: "Origin not allowed by CORS policy." });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Signature, X-Request-Timestamp");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  res.setHeader("Content-Security-Policy", CONFIG.SECURITY.CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
};

const requireSession = (req, res, next) => {
  const authResult = sessionStore.authenticateRequest(req);
  if (!authResult.ok) {
    res.status(authResult.status).json({ error: authResult.message });
    return;
  }
  req.session = authResult.session;
  next();
};

const requireSignedPost = (req, res, next) => {
  if (req.method !== "POST") {
    next();
    return;
  }
  const check = sessionStore.verifySignedRequest(req, req.session);
  if (!check.ok) {
    res.status(check.status).json({ error: check.message });
    return;
  }
  next();
};

const buildStatePayload = (session) => ({
  type: "state",
  payload: {
    balance: session.balance,
    sessionSpend: session.sessionSpend,
    depositLimit: session.depositLimit,
    freeSpinsRemaining: session.freeSpinsRemaining,
    xp: session.xp,
  },
});

const sendSessionStateOverSocket = (session) => {
  const message = JSON.stringify(buildStatePayload(session));
  wss.clients.forEach((socket) => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (socket.sessionId === session.id) {
      socket.send(message);
    }
  });
};

app.use(withSecurityHeaders);
app.use(express.json({ limit: CONFIG.SERVER.JSON_LIMIT }));
app.use((req, _res, next) => {
  if (req.method === "POST" && req.body) {
    req.body = sanitizeValue(req.body);
  }
  next();
});
app.use(express.static(clientRoot));

app.get("/api/config", (_req, res) => {
  res.json(createClientConfigPayload());
});

app.post("/api/session/start", (req, res) => {
  const ageConfirmed = req.body?.ageConfirmed === true;
  if (!ageConfirmed) {
    res.status(403).json({ error: "Age confirmation is required." });
    return;
  }

  const depositLimit = sanitizeDepositLimit(req.body?.depositLimit);
  const { jwtToken, session } = sessionStore.createSession(req, {
    depositLimit,
    ageConfirmed,
  });
  const sessionView = createPublicSessionView(session, jwtToken);
  res.json({
    ...sessionView,
    websocketUrl: "/ws",
    jackpotPool,
  });
});

app.post("/api/session/reality-check", requireSession, requireSignedPost, (req, res) => {
  const acknowledged = req.body?.acknowledged === true;
  if (!acknowledged) {
    res.status(400).json({ error: "Reality check acknowledgment required." });
    return;
  }
  const session = sessionStore.update(req.session.id, {
    realityCheckAcknowledgedAt: Date.now(),
  });
  sendSessionStateOverSocket(session);
  res.json({ ok: true });
});

app.post("/api/session/self-exclude", requireSession, requireSignedPost, (req, res) => {
  const enabled = req.body?.enabled === true;
  const session = sessionStore.update(req.session.id, { selfExcluded: enabled });
  sendSessionStateOverSocket(session);
  res.json({ ok: true, selfExcluded: session.selfExcluded });
});

app.get("/api/session/state", requireSession, (req, res) => {
  res.json(buildStatePayload(req.session).payload);
});

app.post("/api/spin", requireSession, requireSignedPost, (req, res) => {
  const session = req.session;
  if (session.selfExcluded) {
    res.status(403).json({ error: "Self-exclusion is active for this session." });
    return;
  }
  if (!session.ageVerified) {
    res.status(403).json({ error: "Age verification is required." });
    return;
  }

  const elapsedMs = Date.now() - session.lastSpinAt;
  if (session.lastSpinAt > 0 && elapsedMs < CONFIG.GAME.SPIN_FLOOR_MS) {
    res.status(429).json({ error: `Spin floor active: wait ${CONFIG.GAME.SPIN_FLOOR_MS}ms.` });
    return;
  }

  const validatedBet = validateBetAmount(req.body?.bet);
  if (!validatedBet.ok) {
    res.status(400).json({ error: validatedBet.message });
    return;
  }
  const bet = validatedBet.bet;
  const isFreeSpin = session.freeSpinsRemaining > 0;
  if (!isFreeSpin && session.balance < bet) {
    res.status(400).json({ error: "Insufficient token balance." });
    return;
  }
  if (!isFreeSpin && session.sessionSpend + bet > session.depositLimit) {
    res.status(400).json({ error: "Session deposit/spend limit reached." });
    return;
  }

  const { result, nextJackpotPool } = createSpinResult({ session, bet, jackpotPool });
  jackpotPool = nextJackpotPool;

  const updatedSession = sessionStore.update(session.id, {
    balance: result.balance,
    freeSpinsRemaining: result.freeSpinsRemaining,
    sessionSpend: result.sessionSpend,
    totalWagered: session.totalWagered + result.betDebit,
    totalWon: session.totalWon + result.grossWin,
    xp: result.xp,
    lastSpinAt: Date.now(),
  });

  sendSessionStateOverSocket(updatedSession);
  res.json(result);
});

server.on("upgrade", (request, socket, head) => {
  const requestUrl = new URL(request.url ?? "", `http://${request.headers.host}`);
  if (requestUrl.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const token = requestUrl.searchParams.get("token");
  if (!token) {
    socket.destroy();
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    socket.destroy();
    return;
  }

  const session = sessionStore.getById(payload.sid);
  if (!session) {
    socket.destroy();
    return;
  }

  const fingerprintHash = getRequestFingerprintHash(request);
  if (payload.fp !== session.fingerprint || fingerprintHash !== session.fingerprint) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    websocket.sessionId = session.id;
    websocket.send(JSON.stringify(buildStatePayload(session)));
    wss.emit("connection", websocket, request);
  });
});

wss.on("connection", (socket) => {
  socket.on("message", (rawMessage) => {
    const session = sessionStore.getById(socket.sessionId);
    if (!session) {
      socket.close();
      return;
    }

    const now = Date.now();
    if (now - session.websocketWindowStartMs >= CONFIG.SECURITY.WEBSOCKET_RATE_WINDOW_MS) {
      session.websocketWindowStartMs = now;
      session.websocketMessageCount = 0;
    }
    session.websocketMessageCount += 1;
    if (session.websocketMessageCount > CONFIG.SECURITY.WEBSOCKET_RATE_LIMIT_PER_MINUTE) {
      socket.send(JSON.stringify({ type: "error", message: "WebSocket rate limit exceeded." }));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawMessage.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid WebSocket payload." }));
      return;
    }

    if (parsed?.type === "state") {
      socket.send(JSON.stringify(buildStatePayload(session)));
    }
  });
});

const port = Number(process.env.PORT ?? CONFIG.SERVER.DEFAULT_PORT);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`${CONFIG.APP.NAME} server running at http://localhost:${port}`);
});
