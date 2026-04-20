import { animateSpin, collectWinningPositions, playCascades, renderGrid } from "./reels.js";
import { AudioEngine, buildPaytableMarkup, toggleModal, updateDashboard } from "./ui.js";
import { signRequestBody, verifySpinPayloadSignature } from "./verify.js";

const state = {
  config: null,
  token: "",
  requestSigningKey: "",
  spinVerificationKey: "",
  requestCounter: 0,
  symbolsById: new Map(),
  spinLocked: false,
  autoplayRemaining: 0,
  jackpotPool: 0,
  balance: 0,
  freeSpinsRemaining: 0,
  sessionSpend: 0,
  xp: 0,
  tier: "Bronze",
  socket: null,
};

const audio = new AudioEngine();

const elements = {
  app: document.getElementById("app"),
  reelGrid: document.getElementById("reelGrid"),
  winBanner: document.getElementById("winBanner"),
  balanceValue: document.getElementById("balanceValue"),
  jackpotValue: document.getElementById("jackpotValue"),
  freeSpinsValue: document.getElementById("freeSpinsValue"),
  sessionSpend: document.getElementById("sessionSpend"),
  xpFill: document.getElementById("xpFill"),
  xpLabel: document.getElementById("xpLabel"),
  tierBadge: document.getElementById("tierBadge"),
  betSlider: document.getElementById("betSlider"),
  betValue: document.getElementById("betValue"),
  autoplayLimitInput: document.getElementById("autoplayLimitInput"),
  spinButton: document.getElementById("spinButton"),
  autoplayButton: document.getElementById("autoplayButton"),
  infoButton: document.getElementById("infoButton"),
  closePaytableButton: document.getElementById("closePaytableButton"),
  paytableContent: document.getElementById("paytableContent"),
  turboToggle: document.getElementById("turboToggle"),
  ambientToggle: document.getElementById("ambientToggle"),
  ageGateModal: document.getElementById("ageGateModal"),
  paytableModal: document.getElementById("paytableModal"),
  realityCheckModal: document.getElementById("realityCheckModal"),
  ageConfirmButton: document.getElementById("ageConfirmButton"),
  realityCheckButton: document.getElementById("realityCheckButton"),
  depositLimitInput: document.getElementById("depositLimitInput"),
};

const setSpinDuration = (durationMs) => {
  document.documentElement.style.setProperty("--spin-duration", `${durationMs}ms`);
};

const setLocked = (locked) => {
  state.spinLocked = locked;
  elements.spinButton.disabled = locked;
};

const getCurrentBet = () => Number(elements.betSlider.value);

const refreshDashboard = () => {
  updateDashboard({
    state,
    config: state.config,
    elements,
  });
};

const applyStateFromSpin = (spinResult) => {
  state.balance = spinResult.balance;
  state.jackpotPool = spinResult.jackpotPool;
  state.freeSpinsRemaining = spinResult.freeSpinsRemaining;
  state.sessionSpend = spinResult.sessionSpend;
  state.xp = spinResult.xp;
  state.tier = spinResult.tier;
  refreshDashboard();
};

const apiRequest = async ({ path, method = "GET", body = null, signed = false }) => {
  const headers = { "Content-Type": "application/json" };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  if (signed) {
    const signatureHeaders = await signRequestBody({
      requestSigningKey: state.requestSigningKey,
      body,
      requestCounter: state.requestCounter,
    });
    headers["X-Request-Signature"] = signatureHeaders.signature;
    headers["X-Request-Timestamp"] = signatureHeaders.timestamp;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  if (signed) {
    state.requestCounter += 1;
  }
  return payload;
};

const connectWebSocket = () => {
  if (state.socket) {
    state.socket.close();
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const endpoint = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(state.token)}`;
  const socket = new WebSocket(endpoint);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type !== "state") {
      return;
    }
    state.balance = message.payload.balance;
    state.sessionSpend = message.payload.sessionSpend;
    state.freeSpinsRemaining = message.payload.freeSpinsRemaining;
    state.xp = message.payload.xp;
    refreshDashboard();
  });
  state.socket = socket;
};

const showBanner = (message, nearMiss = false) => {
  elements.winBanner.textContent = message;
  elements.winBanner.classList.toggle("near-miss", nearMiss);
};

const spinOnce = async () => {
  if (state.spinLocked) {
    return;
  }
  setLocked(true);
  try {
    const bet = getCurrentBet();
    const spinResult = await apiRequest({
      path: "/api/spin",
      method: "POST",
      body: { bet },
      signed: true,
    });

    const validSignature = await verifySpinPayloadSignature({
      spinVerificationKey: state.spinVerificationKey,
      payload: spinResult,
    });
    if (!validSignature) {
      throw new Error("Spin signature verification failed.");
    }

    const durationMs = elements.turboToggle.checked
      ? state.config.game.turboSpinMs
      : state.config.game.normalSpinMs;
    setSpinDuration(durationMs);
    await animateSpin({ container: elements.reelGrid, durationMs });

    if (!spinResult.isNetLoss && spinResult.grossWin > 0) {
      await playCascades({
        container: elements.reelGrid,
        cascades: spinResult.cascades,
        symbolsById: state.symbolsById,
        paylines: state.config.game.paylines,
        durationMs,
      });
    }

    const winningPositions =
      spinResult.isNetLoss || spinResult.grossWin <= 0
        ? []
        : collectWinningPositions(spinResult, state.config.game.paylines);
    renderGrid({
      container: elements.reelGrid,
      grid: spinResult.grid,
      symbolsById: state.symbolsById,
      winningPositions,
    });

    applyStateFromSpin(spinResult);
    showBanner(spinResult.winMessage, spinResult.nearMiss);

    if (!spinResult.isNetLoss && spinResult.grossWin > 0) {
      audio.playWinFanfare(spinResult.grossWin);
    }
    if (spinResult.nearMiss) {
      audio.playNearMissTone();
    }
    if (spinResult.realityCheckRequired) {
      toggleModal(elements.realityCheckModal, true);
    }
  } catch (error) {
    showBanner(error.message, false);
  } finally {
    setLocked(false);
  }
};

const runAutoplay = async () => {
  while (state.autoplayRemaining > 0) {
    if (elements.realityCheckModal.classList.contains("visible")) {
      break;
    }
    // Compliance floor is enforced server-side; this delay keeps client cadence aligned.
    // eslint-disable-next-line no-await-in-loop
    await spinOnce();
    state.autoplayRemaining -= 1;
    elements.autoplayButton.textContent =
      state.autoplayRemaining > 0 ? `Autoplay (${state.autoplayRemaining})` : "Autoplay";
    if (state.autoplayRemaining > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => window.setTimeout(resolve, state.config.game.spinFloorMs));
    }
  }
  state.autoplayRemaining = 0;
  elements.autoplayButton.textContent = "Autoplay";
};

const configureControls = () => {
  elements.betSlider.min = state.config.game.betMin;
  elements.betSlider.max = state.config.game.betMax;
  elements.betSlider.step = state.config.game.betStep;
  elements.betSlider.value = state.config.game.betDefault;
  elements.betValue.textContent = Number(elements.betSlider.value).toFixed(2);
  elements.autoplayLimitInput.min = state.config.client.autoplayMinSpins;
  elements.autoplayLimitInput.max = state.config.game.autoplayMaxSpins;
  elements.autoplayLimitInput.value = state.config.game.autoplayMaxSpins;
  elements.depositLimitInput.min = state.config.game.depositLimitMin;
  elements.depositLimitInput.max = state.config.game.depositLimitMax;
  elements.depositLimitInput.value = state.config.game.depositLimitMax;
  elements.paytableContent.innerHTML = buildPaytableMarkup(state.config.game.symbols);
};

const startSession = async () => {
  const depositLimit = Number(elements.depositLimitInput.value);
  const sessionPayload = await apiRequest({
    path: "/api/session/start",
    method: "POST",
    body: { ageConfirmed: true, depositLimit },
    signed: false,
  });
  state.token = sessionPayload.token;
  state.requestSigningKey = sessionPayload.requestSigningKey;
  state.spinVerificationKey = sessionPayload.spinVerificationKey;
  state.balance = sessionPayload.profile.balance;
  state.sessionSpend = sessionPayload.profile.sessionSpend;
  state.freeSpinsRemaining = sessionPayload.profile.freeSpinsRemaining;
  state.xp = sessionPayload.profile.xp;
  state.tier = sessionPayload.profile.tier;
  state.jackpotPool = sessionPayload.jackpotPool;
  state.requestCounter = 0;

  toggleModal(elements.ageGateModal, false);
  elements.app.hidden = false;
  refreshDashboard();
  connectWebSocket();
};

const bindEvents = () => {
  elements.betSlider.addEventListener("input", () => {
    elements.betValue.textContent = Number(elements.betSlider.value).toFixed(2);
  });

  elements.spinButton.addEventListener("click", async () => {
    await spinOnce();
  });

  elements.autoplayButton.addEventListener("click", async () => {
    if (state.autoplayRemaining > 0) {
      state.autoplayRemaining = 0;
      elements.autoplayButton.textContent = "Autoplay";
      return;
    }
    const requested = Number(elements.autoplayLimitInput.value);
    if (!Number.isFinite(requested) || requested < state.config.client.autoplayMinSpins) {
      showBanner("Enter an autoplay limit before starting.", false);
      return;
    }
    const safeLimit = Math.min(requested, state.config.game.autoplayMaxSpins);
    state.autoplayRemaining = safeLimit;
    elements.autoplayButton.textContent = `Autoplay (${safeLimit})`;
    await runAutoplay();
  });

  elements.turboToggle.addEventListener("change", () => {
    const nextDuration = elements.turboToggle.checked
      ? state.config.game.turboSpinMs
      : state.config.game.normalSpinMs;
    setSpinDuration(nextDuration);
  });

  elements.ambientToggle.addEventListener("change", () => {
    audio.setAmbient(elements.ambientToggle.checked);
  });

  elements.infoButton.addEventListener("click", () => {
    toggleModal(elements.paytableModal, true);
  });

  elements.closePaytableButton.addEventListener("click", () => {
    toggleModal(elements.paytableModal, false);
  });

  elements.realityCheckButton.addEventListener("click", async () => {
    await apiRequest({
      path: "/api/session/reality-check",
      method: "POST",
      body: { acknowledged: true },
      signed: true,
    });
    toggleModal(elements.realityCheckModal, false);
  });

  elements.ageConfirmButton.addEventListener("click", async () => {
    try {
      await startSession();
      showBanner("Age gate complete. Satire enabled.", false);
    } catch (error) {
      showBanner(error.message, false);
    }
  });
};

const bootstrap = async () => {
  elements.app.hidden = true;
  const config = await apiRequest({ path: "/api/config" });
  state.config = config;
  state.symbolsById = new Map(config.game.symbols.map((symbol) => [symbol.id, symbol]));
  audio.setProfile({
    gainFloor: config.client.audio.GAIN_FLOOR,
    nearMissStartHz: config.client.audio.NEAR_MISS_START_HZ,
    nearMissEndHz: config.client.audio.NEAR_MISS_END_HZ,
    nearMissAttackSec: config.client.audio.NEAR_MISS_ATTACK_SEC,
    nearMissDurationSec: config.client.audio.NEAR_MISS_DURATION_SEC,
    nearMissGainPeak: config.client.audio.NEAR_MISS_GAIN_PEAK,
    winFanfareNotes: config.client.audio.WIN_FANFARE_NOTES,
    noteStaggerSec: config.client.audio.WIN_FANFARE_NOTE_STAGGER_SEC,
    noteAttackSec: config.client.audio.WIN_FANFARE_NOTE_ATTACK_SEC,
    noteDecaySec: config.client.audio.WIN_FANFARE_NOTE_DECAY_SEC,
    noteTailSec: config.client.audio.NOTE_TAIL_SEC,
    winGainMin: config.client.audio.WIN_FANFARE_GAIN_MIN,
    winGainMax: config.client.audio.WIN_FANFARE_GAIN_MAX,
    winGainDivisor: config.client.audio.WIN_FANFARE_GAIN_DIVISOR,
    ambientHz: config.client.audio.AMBIENT_HZ,
    ambientGain: config.client.audio.AMBIENT_GAIN,
  });
  configureControls();
  setSpinDuration(state.config.game.normalSpinMs);
  renderGrid({
    container: elements.reelGrid,
    grid: Array.from({ length: config.game.rows }, () =>
      Array.from({ length: config.game.reels }, () => config.game.symbols[0].id)
    ),
    symbolsById: state.symbolsById,
    winningPositions: [],
  });
  bindEvents();
};

bootstrap().catch((error) => {
  showBanner(`Bootstrap failed: ${error.message}`, false);
});
