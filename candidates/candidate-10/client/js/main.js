/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { createReelRenderer } from "./reels.js";
import {
  createSoundEngine,
  formatTokens,
  renderPaytable,
  setSpinDurationVariable,
  setupAgeGate,
  setupRealityCheck,
  updateProgressionUi
} from "./ui.js";
import { verifySignedSpin } from "./verify.js";

const STORAGE_KEYS = {
  ageConfirmed: "ai_satire_slots_age_confirmed"
};

const ENDPOINTS = {
  createSession: "/api/session/create",
  spin: "/api/spin",
  deposit: "/api/deposit",
  selfExclude: "/api/self-exclude",
  paytable: "/api/paytable"
};

const ui = {
  appShell: document.querySelector("#app-shell"),
  tierBadge: document.querySelector("#tier-badge"),
  xpFill: document.querySelector("#xp-fill"),
  xpText: document.querySelector("#xp-text"),
  balance: document.querySelector("#balance-display"),
  jackpot: document.querySelector("#jackpot-display"),
  spend: document.querySelector("#spend-display"),
  message: document.querySelector("#result-message"),
  reelGrid: document.querySelector("#reel-grid"),
  betSlider: document.querySelector("#bet-slider"),
  betOutput: document.querySelector("#bet-output"),
  spinButton: document.querySelector("#spin-btn"),
  turboToggle: document.querySelector("#turbo-toggle"),
  autoplayCount: document.querySelector("#autoplay-count"),
  autoplayButton: document.querySelector("#autoplay-btn"),
  depositInput: document.querySelector("#deposit-input"),
  depositButton: document.querySelector("#deposit-btn"),
  ambientToggle: document.querySelector("#ambient-toggle"),
  excludeButton: document.querySelector("#exclude-btn"),
  infoButton: document.querySelector("#info-btn"),
  ageGateModal: document.querySelector("#age-gate-modal"),
  ageConfirmButton: document.querySelector("#age-confirm-btn"),
  realityModal: document.querySelector("#reality-modal"),
  realityAckButton: document.querySelector("#reality-ack-btn"),
  paytableModal: document.querySelector("#paytable-modal"),
  paytableBody: document.querySelector("#paytable-body"),
  paytableCloseButton: document.querySelector("#paytable-close-btn")
};

const appState = {
  token: "",
  stateSignature: "",
  publicConfig: null,
  verifyKey: "",
  sessionState: null,
  reelRenderer: null,
  soundEngine: null,
  ws: null,
  isBusy: false,
  isAutoplaying: false,
  realityBlocked: false,
  activeSpinDurationMs: 0
};

const wait = (durationMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const setMessage = (message) => {
  ui.message.textContent = message;
};

const applyBusyState = () => {
  const blocked = appState.isBusy || appState.realityBlocked || appState.sessionState?.selfExcluded;
  ui.spinButton.disabled = Boolean(blocked);
  ui.autoplayButton.disabled = Boolean(blocked);
  ui.depositButton.disabled = Boolean(blocked);
  ui.excludeButton.disabled = Boolean(appState.sessionState?.selfExcluded);
};

const updateDisplays = (sessionState) => {
  appState.sessionState = sessionState;
  ui.balance.textContent = formatTokens(sessionState.balance);
  ui.jackpot.textContent = formatTokens(sessionState.jackpotPool);
  ui.spend.textContent = `${formatTokens(sessionState.spent)} tokens spent`;
  updateProgressionUi({
    state: sessionState,
    tierBadgeElement: ui.tierBadge,
    xpFillElement: ui.xpFill,
    xpTextElement: ui.xpText
  });
  applyBusyState();
};

const authHeaders = () => ({
  Authorization: `Bearer ${appState.token}`,
  "X-State-Signature": appState.stateSignature,
  "Content-Type": "application/json"
});

const apiPost = async (url, body, includeAuth) => {
  const headers = includeAuth ? authHeaders() : { "Content-Type": "application/json" };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
};

const connectWebSocket = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(
    `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(appState.token)}`
  );

  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (_error) {
      return;
    }

    if (message.type === "session-state") {
      appState.stateSignature = message.stateSignature;
      updateDisplays(message.state);
      return;
    }

    if (message.type === "jackpot") {
      ui.jackpot.textContent = formatTokens(message.jackpotPool);
    }
  });

  appState.ws = socket;
};

const createStarterGrid = ({ rows, cols, symbols }) => {
  const symbolCount = symbols.length;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => symbols[(row + col) % symbolCount].id)
  );
};

const configureControls = () => {
  const { minBet, maxBet, betStep, autoplayMinSpins, autoplayMaxSpins } =
    appState.publicConfig.game;
  const { sessionDepositLimit } = appState.publicConfig.compliance;

  ui.betSlider.min = String(minBet);
  ui.betSlider.max = String(maxBet);
  ui.betSlider.step = String(betStep);
  ui.betSlider.value = String(minBet);
  ui.betOutput.textContent = formatTokens(minBet);

  ui.autoplayCount.min = String(autoplayMinSpins);
  ui.autoplayCount.max = String(autoplayMaxSpins);
  ui.autoplayCount.step = String(1);
  ui.autoplayCount.value = String(autoplayMaxSpins);

  ui.depositInput.min = String(minBet);
  ui.depositInput.max = String(sessionDepositLimit);
  ui.depositInput.step = String(betStep);
  ui.depositInput.value = String(minBet);

  ui.betSlider.addEventListener("input", () => {
    ui.betOutput.textContent = formatTokens(ui.betSlider.value);
  });

  appState.activeSpinDurationMs = setSpinDurationVariable({
    turboEnabled: false,
    rootStyle: document.documentElement.style,
    normalMs: appState.publicConfig.game.spinFloorMs,
    turboMs: appState.publicConfig.game.turboSpinMs
  });

  ui.turboToggle.addEventListener("change", () => {
    appState.activeSpinDurationMs = setSpinDurationVariable({
      turboEnabled: ui.turboToggle.checked,
      rootStyle: document.documentElement.style,
      normalMs: appState.publicConfig.game.spinFloorMs,
      turboMs: appState.publicConfig.game.turboSpinMs
    });
  });
};

const runSpin = async () => {
  if (appState.isBusy || appState.realityBlocked || appState.sessionState?.selfExcluded) {
    return false;
  }

  appState.isBusy = true;
  applyBusyState();

  const bet = Number(ui.betSlider.value);

  try {
    const response = await apiPost(ENDPOINTS.spin, { bet }, true);
    const valid = await verifySignedSpin({
      serialized: response.signedSpin.serialized,
      signature: response.signedSpin.signature,
      secret: appState.verifyKey
    });

    if (!valid) {
      setMessage("Spin signature failed verification. Animation blocked.");
      return false;
    }

    appState.stateSignature = response.stateSignature;
    updateDisplays(response.state);

    await appState.reelRenderer.animateSignedRounds({
      rounds: response.signedSpin.payload.rounds,
      spinDurationMs: appState.activeSpinDurationMs,
      cascadeStepMs: appState.publicConfig.game.cascadeStepMs
    });

    const spinPayload = response.signedSpin.payload;
    if (spinPayload.totalWin > 0) {
      appState.soundEngine.playWin({
        totalWin: spinPayload.totalWin,
        bet,
        maxWinScale: appState.publicConfig.audio.maxWinSoundScale
      });
    } else if (spinPayload.nearMiss) {
      appState.soundEngine.playNearMiss({
        stepCount: appState.publicConfig.audio.nearMissStepCount,
        stepDurationSeconds: appState.publicConfig.audio.nearMissStepSeconds
      });
    }

    setMessage(spinPayload.message);
    return true;
  } catch (error) {
    setMessage(error.message);
    return false;
  } finally {
    appState.isBusy = false;
    applyBusyState();
  }
};

const runAutoplay = async () => {
  if (appState.isAutoplaying) {
    appState.isAutoplaying = false;
    ui.autoplayButton.textContent = "Start";
    return;
  }

  const requestedSpins = Number(ui.autoplayCount.value);
  const minSpins = appState.publicConfig.game.autoplayMinSpins;
  const maxSpins = appState.publicConfig.game.autoplayMaxSpins;
  if (
    !Number.isInteger(requestedSpins) ||
    requestedSpins < minSpins ||
    requestedSpins > maxSpins
  ) {
    setMessage(`Autoplay limit must be between ${minSpins} and ${maxSpins}.`);
    return;
  }

  appState.isAutoplaying = true;
  ui.autoplayButton.textContent = "Stop";

  for (let index = 0; index < requestedSpins; index += 1) {
    if (!appState.isAutoplaying) {
      break;
    }
    const successfulSpin = await runSpin();
    if (!successfulSpin) {
      break;
    }
    await wait(appState.publicConfig.game.spinFloorMs);
  }

  appState.isAutoplaying = false;
  ui.autoplayButton.textContent = "Start";
};

const wireButtons = () => {
  ui.spinButton.addEventListener("click", () => {
    runSpin();
  });

  ui.autoplayButton.addEventListener("click", () => {
    runAutoplay();
  });

  ui.depositButton.addEventListener("click", async () => {
    if (appState.isBusy) {
      return;
    }

    appState.isBusy = true;
    applyBusyState();

    try {
      const amount = Number(ui.depositInput.value);
      const response = await apiPost(ENDPOINTS.deposit, { amount }, true);
      appState.stateSignature = response.stateSignature;
      updateDisplays(response.state);
      setMessage("Fresh runway secured. Keep your burn rate honest.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      appState.isBusy = false;
      applyBusyState();
    }
  });

  ui.excludeButton.addEventListener("click", async () => {
    if (appState.isBusy) {
      return;
    }

    appState.isBusy = true;
    applyBusyState();

    try {
      const response = await apiPost(ENDPOINTS.selfExclude, {}, true);
      appState.stateSignature = response.stateSignature;
      updateDisplays(response.state);
      appState.isAutoplaying = false;
      ui.autoplayButton.textContent = "Start";
      setMessage("Self-exclusion enabled. The algorithm cannot tempt you now.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      appState.isBusy = false;
      applyBusyState();
    }
  });

  ui.ambientToggle.addEventListener("change", () => {
    appState.soundEngine.setAmbientEnabled(ui.ambientToggle.checked);
  });

  ui.infoButton.addEventListener("click", () => {
    ui.paytableModal.showModal();
  });

  ui.paytableCloseButton.addEventListener("click", () => {
    ui.paytableModal.close();
  });
};

const beginRealityChecks = () => {
  const startTimer = () =>
    setupRealityCheck({
      modalElement: ui.realityModal,
      acknowledgeButton: ui.realityAckButton,
      minutes: appState.publicConfig.compliance.realityCheckMinutes,
      onTrigger: () => {
        appState.realityBlocked = true;
        applyBusyState();
      },
      onAcknowledge: () => {
        appState.realityBlocked = false;
        applyBusyState();
        beginRealityChecks();
      }
    });

  appState.realityBlocked = false;
  applyBusyState();
  const cancelTimer = startTimer();
  ui.realityModal.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
    },
    { once: true }
  );
  ui.realityModal.addEventListener(
    "close",
    () => {
      cancelTimer();
    },
    { once: true }
  );

};

const initializeSession = async () => {
  ui.appShell.style.visibility = "hidden";
  const ageConfirmed =
    window.localStorage.getItem(STORAGE_KEYS.ageConfirmed) === "true";
  if (!ageConfirmed) {
    await setupAgeGate({
      modalElement: ui.ageGateModal,
      confirmButton: ui.ageConfirmButton
    });
    window.localStorage.setItem(STORAGE_KEYS.ageConfirmed, "true");
  }

  const sessionResponse = await apiPost(
    ENDPOINTS.createSession,
    { ageConfirmed: true },
    false
  );

  appState.token = sessionResponse.token;
  appState.publicConfig = sessionResponse.publicConfig;
  appState.verifyKey = sessionResponse.resultVerificationKey;
  appState.stateSignature = sessionResponse.stateSignature;
  updateDisplays(sessionResponse.state);

  appState.reelRenderer = createReelRenderer({
    gridElement: ui.reelGrid,
    rows: appState.publicConfig.game.gridRows,
    cols: appState.publicConfig.game.gridCols,
    symbols: appState.publicConfig.symbols
  });
  appState.reelRenderer.renderGrid(
    createStarterGrid({
      rows: appState.publicConfig.game.gridRows,
      cols: appState.publicConfig.game.gridCols,
      symbols: appState.publicConfig.symbols
    })
  );

  appState.soundEngine = createSoundEngine(appState.publicConfig.audio);

  configureControls();
  renderPaytable({
    container: ui.paytableBody,
    symbols: appState.publicConfig.symbols
  });
  wireButtons();
  connectWebSocket();
  beginRealityChecks();
  ui.appShell.style.visibility = "visible";
  setMessage("Dry run complete. Spin to disrupt absolutely nothing.");
};

initializeSession().catch((error) => {
  setMessage(`Boot failed: ${error.message}`);
});
