import { buildSymbolLookup, renderGrid, animateSpinOutcome } from "./reels.js";
import { createUiController } from "./ui.js";
import { importClientVerifyKey, verifySignedPayload } from "./verify.js";

const state = {
  config: null,
  symbolLookup: null,
  ui: null,
  token: "",
  verifyKey: null,
  requestNonce: 0,
  requestGuard: "",
  ws: null,
  isSpinning: false,
  autoplayRemaining: 0,
  realityCheckBlocked: false,
  selfExcluded: false,
  nextSpinAllowedAt: 0,
  lastBalance: 0,
  lastSessionSpend: 0
};

const wait = (durationMs) => new Promise((resolve) => window.setTimeout(resolve, durationMs));

const toWsUrl = (path) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
};

const fetchJson = async ({ path, method, token, body }) => {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = {
    method,
    headers
  };

  if (body !== null && body !== undefined) {
    request.body = JSON.stringify(body);
  }

  const response = await fetch(path, request);

  const payload = await response.json();

  if (!response.ok) {
    const requestError = new Error(payload.error ?? "Request failed");
    requestError.waitMs = payload.waitMs;
    throw requestError;
  }

  return payload;
};

const applySignedState = (verifiedPayload) => {
  state.requestNonce = verifiedPayload.requestNonce;
  state.requestGuard = verifiedPayload.requestGuard;

  state.ui.updateStatus({
    balance: verifiedPayload.balance,
    jackpotPool: verifiedPayload.jackpotPool,
    sessionSpend: verifiedPayload.sessionSpend
  });
  state.lastBalance = verifiedPayload.balance;
  state.lastSessionSpend = verifiedPayload.sessionSpend;

  state.ui.updateXp({ xpValue: verifiedPayload.xp });
};

const postSigned = async (path, body) => {
  const payload = await fetchJson({
    path,
    method: "POST",
    token: state.token,
    body: {
      ...body,
      nonce: state.requestNonce,
      requestGuard: state.requestGuard
    }
  });

  const verified = await verifySignedPayload({
    signedPayload: payload.signedPayload,
    signature: payload.signature,
    key: state.verifyKey
  });

  applySignedState(verified);
  return verified;
};

const applySpinDuration = (timing, turboEnabled) => {
  const duration = turboEnabled ? timing.turboSpinMs : timing.normalSpinMs;
  document.documentElement.style.setProperty("--spin-duration", `${duration}ms`);
  document.documentElement.style.setProperty("--cascade-duration", `${timing.cascadeStepMs}ms`);
};

const runSpin = async ({ autoplay = false } = {}) => {
  if (state.isSpinning || state.realityCheckBlocked || state.selfExcluded) {
    return;
  }

  const now = Date.now();
  if (now < state.nextSpinAllowedAt) {
    const waitMs = state.nextSpinAllowedAt - now;
    if (autoplay) {
      await wait(waitMs);
    } else {
      state.ui.setWinMessage(`Spin floor active. Wait ${Math.ceil(waitMs / 1000)}s.`, false);
      return;
    }
  }

  state.isSpinning = true;
  state.ui.setSpinEnabled(false);
  state.ui.setAutoplayEnabled(false);

  try {
    const startedAt = Date.now();
    const betAmount = Number(state.ui.elements.betSlider.value);
    const outcome = await postSigned("/api/spin", { betAmount });
    state.nextSpinAllowedAt = startedAt + outcome.timing.spinFloorMs;

    applySpinDuration(outcome.timing, state.ui.elements.turboToggle.checked);

    await animateSpinOutcome({
      container: state.ui.elements.reelGrid,
      symbolLookup: state.symbolLookup,
      outcome
    });

    state.ui.setWinMessage(outcome.winMessage, !outcome.isNetLoss);

    if (outcome.isNetLoss && outcome.nearMiss) {
      state.ui.audio.playNearMissTone();
    }

    if (!outcome.isNetLoss && outcome.totalWin > 0) {
      state.ui.audio.playWinFanfare({
        winAmount: outcome.totalWin,
        betAmount
      });
    }
  } catch (error) {
    if (error.waitMs) {
      state.nextSpinAllowedAt = Date.now() + error.waitMs;
    }
    state.ui.setWinMessage(error.message, false);
  } finally {
    state.isSpinning = false;

    if (state.autoplayRemaining <= 0) {
      state.ui.setSpinEnabled(!state.selfExcluded && !state.realityCheckBlocked);
      state.ui.setAutoplayEnabled(!state.selfExcluded && !state.realityCheckBlocked);
    }
  }
};

const runAutoplay = async () => {
  const requested = Number.parseInt(state.ui.elements.autoplayLimitInput.value, 10);

  if (!Number.isInteger(requested) || requested <= 0) {
    state.ui.setWinMessage("Enter an explicit autoplay count.", false);
    return;
  }

  const maxAllowed = state.config.limits.AUTOPLAY_CAP;
  state.autoplayRemaining = Math.min(requested, maxAllowed);

  while (state.autoplayRemaining > 0 && !state.selfExcluded && !state.realityCheckBlocked) {
    await runSpin({ autoplay: true });
    state.autoplayRemaining -= 1;
  }

  state.autoplayRemaining = 0;
  state.ui.setAutoplayEnabled(!state.selfExcluded && !state.realityCheckBlocked);
  state.ui.setSpinEnabled(!state.selfExcluded && !state.realityCheckBlocked);
};

const connectWs = () => {
  const ws = new WebSocket(toWsUrl(state.config.wsPath));
  state.ws = ws;

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "auth", token: state.token }));
  });

  ws.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "jackpot") {
        state.ui.updateStatus({
          balance: state.lastBalance,
          jackpotPool: message.jackpotPool,
          sessionSpend: state.lastSessionSpend
        });
      }
    } catch (_error) {
      state.ui.setWinMessage("Socket message ignored.", false);
    }
  });
};

const startRealityCheckTimer = () => {
  const realityDelay = state.config.timings.REALITY_CHECK_MINUTES * 60 * 1000;
  window.setTimeout(() => {
    state.realityCheckBlocked = true;
    state.ui.setSpinEnabled(false);
    state.ui.setAutoplayEnabled(false);
    state.ui.openRealityCheck();
  }, realityDelay);
};

const startSession = async () => {
  const depositLimit = Number(state.ui.elements.depositLimitInput.value);
  const response = await fetchJson({
    path: "/api/session/start",
    method: "POST",
    body: {
      ageConfirmed: true,
      depositLimit
    }
  });

  state.token = response.token;
  state.verifyKey = await importClientVerifyKey(response.clientVerifyKey);

  const verified = await verifySignedPayload({
    signedPayload: response.signedPayload,
    signature: response.signature,
    key: state.verifyKey
  });

  applySignedState(verified);
  state.ui.hideAgeGate();
  state.ui.showApp();
  state.ui.setSpinEnabled(true);
  state.ui.setAutoplayEnabled(true);
  state.ui.setWinMessage("Session live. Please spin responsibly.", false);

  connectWs();
  startRealityCheckTimer();

  const neutralGrid = Array.from({ length: state.config.grid.rows }, () =>
    Array.from({ length: state.config.grid.reels }, () => state.config.symbols[0].id)
  );

  renderGrid({
    container: state.ui.elements.reelGrid,
    grid: neutralGrid,
    symbolLookup: state.symbolLookup
  });
};

const bindEvents = () => {
  const { elements } = state.ui;

  elements.betSlider.addEventListener("input", state.ui.syncBetDisplay);
  elements.spinButton.addEventListener("click", runSpin);
  elements.autoplayButton.addEventListener("click", runAutoplay);
  elements.infoButton.addEventListener("click", state.ui.openPaytable);
  elements.closePaytableButton.addEventListener("click", state.ui.closePaytable);

  elements.ambientToggle.addEventListener("change", () => {
    state.ui.audio.setAmbientEnabled(elements.ambientToggle.checked);
  });

  elements.realityAcknowledgeButton.addEventListener("click", () => {
    state.realityCheckBlocked = false;
    state.ui.closeRealityCheck();
    state.ui.setSpinEnabled(!state.selfExcluded);
    state.ui.setAutoplayEnabled(!state.selfExcluded);
  });

  elements.selfExcludeButton.addEventListener("click", async () => {
    try {
      await postSigned("/api/self-exclude", {});
      state.selfExcluded = true;
      state.ui.setSpinEnabled(false);
      state.ui.setAutoplayEnabled(false);
      state.ui.setWinMessage("Self-exclusion enabled for this session.", false);
    } catch (error) {
      state.ui.setWinMessage(error.message, false);
    }
  });

  elements.ageConfirmButton.addEventListener("click", async () => {
    try {
      await startSession();
    } catch (error) {
      state.ui.setWinMessage(error.message, false);
    }
  });
};

const initialize = async () => {
  const bootstrap = await fetchJson({
    path: "/api/bootstrap",
    method: "GET",
    body: null
  });

  state.config = bootstrap.config;
  state.config.wsPath = bootstrap.wsPath;
  state.symbolLookup = buildSymbolLookup(state.config.symbols);
  state.ui = createUiController({ config: state.config });

  state.ui.configureBet();
  state.ui.renderPaytable();
  bindEvents();
};

initialize().catch((error) => {
  const message = error instanceof Error ? error.message : "Initialization failed";
  const winMessage = document.querySelector("#winMessage");
  if (winMessage) {
    winMessage.textContent = message;
  }
});
