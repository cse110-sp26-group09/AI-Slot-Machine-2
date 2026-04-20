/**
 * @fileoverview Server-side slot machine module.
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 */

import crypto from 'crypto';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { CONFIG, CSP_HEADER, getPublicConfig } from './config.js';
import {
  buildFingerprint,
  createSession,
  createToken,
  hasNonce,
  markNonce,
  parseTokenFromRequest,
  removeExpiredNonces,
  validateToken
} from './session.js';
import { runSpin, signPayload, stableStringify, verifyPayloadSignature } from './game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const app = express();
const httpServer = http.createServer(app);

const ONE_MINUTE_MS = 60000;
const EMPTY_BODY_STRING = '{}';
const FLOAT_TOLERANCE = 1e-9;
const SAFE_STRING_MAX_LENGTH = 240;
const SAFE_ARRAY_MAX_ITEMS = 40;
const SAFE_OBJECT_MAX_KEYS = 40;

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function sanitizeString(value) {
  return String(value)
    .slice(0, SAFE_STRING_MAX_LENGTH)
    .replace(/[^a-zA-Z0-9 .,_\-:/]/g, '')
    .trim();
}

function sanitizeInput(value, depth = 0) {
  if (depth > 6) {
    return null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, SAFE_ARRAY_MAX_ITEMS).map((item) => sanitizeInput(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output = {};
    const keys = Object.keys(value).slice(0, SAFE_OBJECT_MAX_KEYS);
    for (const key of keys) {
      const safeKey = sanitizeString(key);
      output[safeKey] = sanitizeInput(value[key], depth + 1);
    }
    return output;
  }

  return null;
}

function boolFromBody(body, key, fallback = false) {
  const value = body?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function numberFromBody(body, key, fallback = 0) {
  const value = body?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function integerFromBody(body, key, fallback = 0) {
  const value = numberFromBody(body, key, fallback);
  return Number.isInteger(value) ? value : fallback;
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }
  return CONFIG.SECURITY.CORS_WHITELIST.includes(origin);
}

function toStatePayload(session) {
  return {
    balance: session.balance,
    sessionSpend: session.sessionSpend,
    freeSpinsRemaining: session.freeSpinsRemaining,
    xp: session.xp,
    tier: session.tier,
    selfExcluded: session.selfExcluded
  };
}

function broadcastState(session) {
  const payload = JSON.stringify({
    type: 'state',
    state: toStatePayload(session),
    sentAt: Date.now()
  });

  for (const socket of session.wsSockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}

function verifySignedRequest(request, response, next) {
  const session = request.session;
  const signature = String(request.headers['x-request-signature'] || '');
  const nonce = String(request.headers['x-request-nonce'] || '');
  const timestamp = Number(request.headers['x-request-ts'] || 0);
  const now = Date.now();

  if (!signature || !nonce || !timestamp) {
    response.status(401).json({ error: 'Missing request signature headers.' });
    return;
  }

  if (Math.abs(now - timestamp) > CONFIG.SECURITY.REQUEST_SIGNATURE_WINDOW_MS) {
    response.status(401).json({ error: 'Request signature expired.' });
    return;
  }

  removeExpiredNonces(session, now);
  if (hasNonce(session, nonce)) {
    response.status(401).json({ error: 'Replay detected.' });
    return;
  }

  const payload = {
    method: request.method,
    path: request.path,
    ts: timestamp,
    nonce,
    body: request.sanitizedBody || {}
  };

  const valid = verifyPayloadSignature(payload, session.requestSigningKey, signature);
  if (!valid) {
    response.status(401).json({ error: 'Invalid request signature.' });
    return;
  }

  markNonce(session, nonce, now);
  next();
}

function requireSession(request, response, next) {
  try {
    const token = parseTokenFromRequest(request);
    const session = validateToken(token, request);
    request.session = session;
    request.token = token;
    next();
  } catch (error) {
    response.status(401).json({ error: String(error.message || error) });
  }
}

function sanitizeBodyMiddleware(request, _response, next) {
  if (request.method === 'POST') {
    request.sanitizedBody = sanitizeInput(request.body || {}) || {};
  } else {
    request.sanitizedBody = {};
  }
  next();
}

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeBodyMiddleware);

app.use((request, response, next) => {
  const origin = String(request.headers.origin || '');
  if (!isAllowedOrigin(origin)) {
    response.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }

  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Signature,X-Request-Nonce,X-Request-TS');
  response.setHeader('Access-Control-Max-Age', String(ONE_MINUTE_MS));

  response.setHeader('Content-Security-Policy', CSP_HEADER);
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
});

app.get('/api/config', (_request, response) => {
  response.json(getPublicConfig());
});

app.post('/api/session/start', (request, response) => {
  try {
    const ageConfirmed = boolFromBody(request.sanitizedBody, 'ageConfirmed', false);
    const session = createSession(ageConfirmed, request);
    const token = createToken(session);

    response.json({
      token,
      requestSigningKey: session.requestSigningKey,
      resultVerificationKey: session.resultVerificationKey,
      state: toStatePayload(session),
      fingerprint: buildFingerprint(request),
      publicConfig: getPublicConfig()
    });
  } catch (error) {
    response.status(403).json({ error: String(error.message || error) });
  }
});

app.get('/api/session/state', requireSession, (request, response) => {
  const token = createToken(request.session);
  response.json({ token, state: toStatePayload(request.session) });
});

app.post('/api/session/deposit', requireSession, verifySignedRequest, (request, response) => {
  const session = request.session;
  const amount = roundCurrency(numberFromBody(request.sanitizedBody, 'amount', 0));

  if (session.selfExcluded) {
    response.status(403).json({ error: 'Self-exclusion active.' });
    return;
  }

  if (amount <= 0) {
    response.status(400).json({ error: 'Invalid deposit amount.' });
    return;
  }

  if (roundCurrency(session.depositTotal + amount) > session.depositLimit) {
    response.status(400).json({ error: 'Session deposit limit reached.' });
    return;
  }

  session.depositTotal = roundCurrency(session.depositTotal + amount);
  session.balance = roundCurrency(session.balance + amount);
  session.updatedAt = Date.now();
  broadcastState(session);

  response.json({ token: createToken(session), state: toStatePayload(session) });
});

app.post('/api/session/self-exclusion', requireSession, verifySignedRequest, (request, response) => {
  const session = request.session;
  session.selfExcluded = boolFromBody(request.sanitizedBody, 'enabled', true);
  session.updatedAt = Date.now();
  broadcastState(session);

  response.json({ token: createToken(session), state: toStatePayload(session) });
});

function validateBet(betAmount) {
  const min = CONFIG.GAME.BET.MIN;
  const max = CONFIG.GAME.BET.MAX;
  const step = CONFIG.GAME.BET.STEP;

  if (betAmount < min || betAmount > max) {
    return false;
  }

  const stepsFromMin = (betAmount - min) / step;
  return Math.abs(stepsFromMin - Math.round(stepsFromMin)) < FLOAT_TOLERANCE;
}

app.post('/api/spin', requireSession, verifySignedRequest, (request, response) => {
  const session = request.session;

  if (session.selfExcluded) {
    response.status(403).json({ error: 'Self-exclusion active.' });
    return;
  }

  const now = Date.now();
  if (session.lastSpinAt > 0 && now - session.lastSpinAt < CONFIG.GAME.SPIN_FLOOR_MS) {
    response.status(429).json({ error: 'Spin floor active. Slow down.' });
    return;
  }

  const mode = sanitizeString(String(request.sanitizedBody.mode || 'normal')) || 'normal';
  const requestedBet = roundCurrency(numberFromBody(request.sanitizedBody, 'betAmount', session.activeBet));
  const isFreeSpin = session.freeSpinsRemaining > 0;

  if (!validateBet(requestedBet)) {
    response.status(400).json({ error: 'Invalid bet amount.' });
    return;
  }

  if (!isFreeSpin && session.balance < requestedBet) {
    response.status(400).json({ error: 'Insufficient balance.' });
    return;
  }

  session.lastSpinAt = now;
  session.updatedAt = now;

  const spinId = crypto.randomUUID();
  const result = runSpin({
    session,
    betAmount: requestedBet,
    spinId,
    requestMode: mode
  });

  const signature = signPayload(result, session.resultVerificationKey);
  const token = createToken(session);
  broadcastState(session);

  response.json({ result, signature, token, state: toStatePayload(session) });
});

const staticDirectory = CONFIG.APP.NODE_ENV === 'production'
  ? path.join(projectRoot, 'build')
  : path.join(projectRoot, 'client');

app.use(express.static(staticDirectory));

app.get('*', (request, response) => {
  if (request.path.startsWith('/api/')) {
    response.status(404).json({ error: 'Not found.' });
    return;
  }

  response.sendFile(path.join(staticDirectory, 'index.html'));
});

const wsServer = new WebSocketServer({ noServer: true });

wsServer.on('connection', (socket, request, session) => {
  const limiter = {
    resetAt: Date.now() + ONE_MINUTE_MS,
    count: 0
  };

  session.wsSockets.add(socket);

  socket.send(JSON.stringify({
    type: 'welcome',
    state: toStatePayload(session),
    sentAt: Date.now()
  }));

  socket.on('message', (rawMessage) => {
    const now = Date.now();
    if (now > limiter.resetAt) {
      limiter.resetAt = now + ONE_MINUTE_MS;
      limiter.count = 0;
    }

    limiter.count += 1;
    if (limiter.count > CONFIG.SECURITY.WS_RATE_LIMIT_PER_MINUTE) {
      socket.send(JSON.stringify({ type: 'error', error: 'Rate limit exceeded.' }));
      socket.close(1008, 'Rate limit exceeded');
      return;
    }

    let payload = {};
    try {
      payload = JSON.parse(String(rawMessage || EMPTY_BODY_STRING));
    } catch (_error) {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid message.' }));
      return;
    }

    const action = sanitizeString(String(payload.action || 'ping'));

    if (action === 'ping') {
      socket.send(JSON.stringify({ type: 'pong', sentAt: Date.now() }));
      return;
    }

    if (action === 'state') {
      socket.send(JSON.stringify({ type: 'state', state: toStatePayload(session), sentAt: Date.now() }));
      return;
    }

    socket.send(JSON.stringify({ type: 'error', error: 'Unsupported action.' }));
  });

  socket.on('close', () => {
    session.wsSockets.delete(socket);
  });
});

httpServer.on('upgrade', (request, socket, head) => {
  try {
    const base = `http://${request.headers.host || 'localhost'}`;
    const parsedUrl = new URL(request.url || '/', base);

    if (parsedUrl.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = parsedUrl.searchParams.get('token') || '';
    request.query = { token };

    const session = validateToken(token, request);

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit('connection', ws, request, session);
    });
  } catch (_error) {
    socket.destroy();
  }
});

httpServer.listen(CONFIG.APP.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`${CONFIG.APP.NAME} running on http://localhost:${CONFIG.APP.PORT}`);
});
