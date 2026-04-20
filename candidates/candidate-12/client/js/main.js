/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { createReelRenderer } from './reels.js';
import { createUiController } from './ui.js';
import { createRequestSignature, createSignedRequestPayload, verifyResultSignature } from './verify.js';

const STORAGE_AGE_KEY = 'ai_satire_slots_age_confirmed';
const STORAGE_TURBO_KEY = 'ai_satire_slots_turbo_enabled';
const API_CONFIG_PATH = '/api/config';
const API_START_SESSION_PATH = '/api/session/start';
const API_SPIN_PATH = '/api/spin';
const API_DEPOSIT_PATH = '/api/session/deposit';
const API_SELF_EXCLUSION_PATH = '/api/session/self-exclusion';

function delay(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function parseJsonResponse(response) {
  const text = await response.text();
  const safeText = text && text.length > 0 ? text : '{}';
  const data = JSON.parse(safeText);

  if (!response.ok) {
    const message = data.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}

async function fetchConfig() {
  const response = await fetch(API_CONFIG_PATH, { method: 'GET', credentials: 'same-origin' });
  return parseJsonResponse(response);
}

async function boot() {
  const publicConfig = await fetchConfig();
  const ui = createUiController({ publicConfig });
  const reelRenderer = createReelRenderer({
    container: ui.elements.reelGrid,
    symbols: publicConfig.game.symbols,
    cascadeStepMs: publicConfig.game.cascadeStepMs
  });

  reelRenderer.mountGrid(publicConfig.game.gridRows, publicConfig.game.gridReels);
  ui.renderPaytable(publicConfig.game.symbols);

  const runtime = {
    config: publicConfig,
    ui,
    reelRenderer,
    token: '',
    requestSigningKey: '',
    resultVerificationKey: '',
    spinning: false,
    autoplayActive: false,
    realityCheckBlocked: false,
    selfExcluded: false,
    ws: null,
    wsReconnectTimer: null,
    realityCheckTimer: null,
    latestWin: 0,
    turboEnabled: window.localStorage.getItem(STORAGE_TURBO_KEY) === 'true'
  };

  function updateStatus(state) {
    runtime.selfExcluded = Boolean(state.selfExcluded);
    ui.updateStatus({
      balance: state.balance,
      sessionSpend: state.sessionSpend,
      winValue: runtime.latestWin,
      tier: state.tier,
      xp: state.xp,
      tierThresholds: runtime.config.game.tierThresholds
    });
  }

  function scheduleRealityCheck() {
    if (runtime.realityCheckTimer) {
      window.clearInterval(runtime.realityCheckTimer);
    }

    runtime.realityCheckTimer = window.setInterval(() => {
      runtime.realityCheckBlocked = true;
      ui.setRealityCheckVisible(true);
      ui.setControlsDisabled(true);
      ui.setMessage('Reality check required. Confirm to continue.');
    }, runtime.config.compliance.realityCheckMs);
  }

  function clearWsReconnect() {
    if (runtime.wsReconnectTimer) {
      window.clearTimeout(runtime.wsReconnectTimer);
      runtime.wsReconnectTimer = null;
    }
  }

  function connectWebSocket() {
    if (!runtime.token) {
      return;
    }

    if (runtime.ws && runtime.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(runtime.token)}`;
    const socket = new WebSocket(wsUrl);
    runtime.ws = socket;

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data || '{}'));
        if (payload.type === 'state' || payload.type === 'welcome') {
          updateStatus(payload.state);
        }
      } catch (_error) {
        ui.setMessage('State feed parse warning.');
      }
    });

    socket.addEventListener('close', () => {
      if (!runtime.token || runtime.selfExcluded) {
        return;
      }
      clearWsReconnect();
      runtime.wsReconnectTimer = window.setTimeout(connectWebSocket, runtime.config.game.spinFloorMs);
    });
  }

  async function signedPost(path, bodyPayload) {
    const signedPayload = createSignedRequestPayload('POST', path, bodyPayload);
    const signature = await createRequestSignature(signedPayload, runtime.requestSigningKey);

    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtime.token}`,
        'X-Request-Signature': signature,
        'X-Request-Nonce': signedPayload.nonce,
        'X-Request-TS': String(signedPayload.ts)
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await parseJsonResponse(response);
    if (data.token) {
      runtime.token = data.token;
    }

    return data;
  }

  async function startSession() {
    const response = await fetch(API_START_SESSION_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ageConfirmed: true })
    });

    const data = await parseJsonResponse(response);
    runtime.token = data.token;
    runtime.requestSigningKey = data.requestSigningKey;
    runtime.resultVerificationKey = data.resultVerificationKey;
    runtime.latestWin = 0;

    updateStatus(data.state);
    ui.setMessage('Session authenticated. Awaiting your spin.');
    ui.revealApp();
    ui.setAgeGateVisible(false);

    scheduleRealityCheck();
    connectWebSocket();
  }

  async function performSpin() {
    if (runtime.spinning || runtime.realityCheckBlocked || runtime.selfExcluded) {
      return false;
    }

    runtime.spinning = true;
    ui.setControlsDisabled(true);

    const selectedBet = ui.getSelectedBet();
    const mode = runtime.turboEnabled ? 'turbo' : 'normal';
    const spinStartTime = Date.now();

    try {
      const responseData = await signedPost(API_SPIN_PATH, {
        betAmount: selectedBet,
        mode
      });

      const resultValid = await verifyResultSignature(
        responseData.result,
        responseData.signature,
        runtime.resultVerificationKey
      );

      if (!resultValid) {
        throw new Error('Spin signature validation failed on client.');
      }

      const celebrateWin = !responseData.result.netLossSpin && responseData.result.totalWin > 0;
      await runtime.reelRenderer.playResult(
        responseData.result,
        runtime.turboEnabled ? runtime.config.game.turboAnimationMs : runtime.config.game.normalAnimationMs,
        celebrateWin
      );

      runtime.latestWin = responseData.result.totalWin;
      updateStatus(responseData.state || responseData.result);
      ui.setMessage(responseData.result.message);

      if (celebrateWin) {
        const scale = clamp(responseData.result.totalWin / runtime.config.game.bet.max, 0, 1);
        await ui.audioEngine.playWinFanfare(scale);
      } else if (responseData.result.nearMiss) {
        await ui.audioEngine.playNearMissTone();
      }

      const elapsed = Date.now() - spinStartTime;
      const floorWait = Math.max(runtime.config.game.spinFloorMs - elapsed, 0);
      if (floorWait > 0) {
        await delay(floorWait);
      }

      return true;
    } catch (error) {
      ui.setMessage(String(error.message || error));
      return false;
    } finally {
      runtime.spinning = false;
      ui.setControlsDisabled(runtime.selfExcluded || runtime.realityCheckBlocked);
    }
  }

  async function runAutoplay() {
    if (runtime.autoplayActive) {
      runtime.autoplayActive = false;
      ui.elements.autoplayButton.textContent = 'Autoplay';
      ui.setMessage('Autoplay cancelled. Human oversight restored.');
      return;
    }

    const explicitLimit = Math.floor(ui.getAutoplayLimit());
    const minSpins = 1;
    const maxSpins = runtime.config.compliance.autoplayHardCap;
    if (explicitLimit < minSpins || explicitLimit > maxSpins) {
      ui.setMessage(`Enter autoplay limit ${minSpins}-${maxSpins}.`);
      return;
    }

    runtime.autoplayActive = true;
    ui.elements.autoplayButton.textContent = 'Stop';

    let remaining = explicitLimit;
    while (runtime.autoplayActive && remaining > 0 && !runtime.realityCheckBlocked && !runtime.selfExcluded) {
      const ok = await performSpin();
      if (!ok) {
        break;
      }
      remaining -= 1;
      ui.setMessage(`Autoplay running. Spins left: ${remaining}.`);
    }

    runtime.autoplayActive = false;
    ui.elements.autoplayButton.textContent = 'Autoplay';
  }

  function applyTurboState(enabled) {
    runtime.turboEnabled = enabled;
    window.localStorage.setItem(STORAGE_TURBO_KEY, String(enabled));
    ui.elements.turboToggle.checked = enabled;
    ui.setTurboVisual(enabled, runtime.config.game.normalAnimationMs, runtime.config.game.turboAnimationMs);
  }

  function bindEvents() {
    ui.elements.ageConfirmButton.addEventListener('click', async () => {
      try {
        window.localStorage.setItem(STORAGE_AGE_KEY, 'true');
        await ui.audioEngine.resumeContext();
        await startSession();
      } catch (error) {
        ui.setMessage(String(error.message || error));
      }
    });

    ui.elements.spinButton.addEventListener('click', async () => {
      await ui.audioEngine.resumeContext();
      await performSpin();
    });

    ui.elements.autoplayButton.addEventListener('click', async () => {
      await ui.audioEngine.resumeContext();
      await runAutoplay();
    });

    ui.elements.betRange.addEventListener('input', () => {
      ui.setBetValue(Number(ui.elements.betRange.value));
    });

    ui.elements.paytableButton.addEventListener('click', () => {
      ui.setPaytableVisible(true);
    });

    ui.elements.closePaytableButton.addEventListener('click', () => {
      ui.setPaytableVisible(false);
    });

    ui.elements.realityAcknowledgeButton.addEventListener('click', () => {
      runtime.realityCheckBlocked = false;
      ui.setRealityCheckVisible(false);
      ui.setControlsDisabled(runtime.selfExcluded);
      ui.setMessage('Reality check acknowledged. Continue responsibly.');
    });

    ui.elements.turboToggle.addEventListener('change', () => {
      applyTurboState(ui.elements.turboToggle.checked);
    });

    ui.elements.humToggle.addEventListener('change', async () => {
      if (ui.elements.humToggle.checked) {
        await ui.audioEngine.startAmbientHum();
      } else {
        await ui.audioEngine.stopAmbientHum();
      }
    });

    ui.elements.depositButton.addEventListener('click', async () => {
      try {
        const response = await signedPost(API_DEPOSIT_PATH, {
          amount: runtime.config.game.depositTopUpAmount
        });
        updateStatus(response.state);
        ui.setMessage('Deposit accepted. Liquidity restored.');
      } catch (error) {
        ui.setMessage(String(error.message || error));
      }
    });

    ui.elements.selfExcludeButton.addEventListener('click', async () => {
      try {
        const response = await signedPost(API_SELF_EXCLUSION_PATH, { enabled: true });
        updateStatus(response.state);
        runtime.autoplayActive = false;
        ui.elements.autoplayButton.textContent = 'Autoplay';
        ui.setControlsDisabled(true);
        ui.setMessage('Self-exclusion enabled. Spins are now blocked server-side.');
      } catch (error) {
        ui.setMessage(String(error.message || error));
      }
    });
  }

  bindEvents();
  applyTurboState(runtime.turboEnabled);
  ui.setBetValue(runtime.config.game.bet.min);

  const agePreviouslyConfirmed = window.localStorage.getItem(STORAGE_AGE_KEY) === 'true';
  if (agePreviouslyConfirmed) {
    try {
      await startSession();
    } catch (error) {
      window.localStorage.removeItem(STORAGE_AGE_KEY);
      ui.setAgeGateVisible(true);
      ui.setMessage(String(error.message || error));
    }
  } else {
    ui.setAgeGateVisible(true);
  }
}

boot().catch((error) => {
  const fallback = document.createElement('pre');
  fallback.textContent = `Boot failure: ${String(error.message || error)}`;
  document.body.innerHTML = '';
  document.body.appendChild(fallback);
});
