import { getFairnessReport, getPaytableRows } from './payouts.js';
import { getAllSymbols, getSymbolById } from './reels.js';

const AGE_GATE_MAX_BIRTHDATE = new Date(2005, 3, 22);
const AGE_GATE_MAX_BIRTHDATE_LABEL = '04/22/2005';

/**
 * @param {number} value
 * @returns {string}
 */
function formatCredits(value) {
  return `${Math.floor(value)} cr`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatSigned(value) {
  if (value > 0) {
    return `+${Math.floor(value)} cr`;
  }

  return `${Math.floor(value)} cr`;
}

/**
 * @param {string} value
 * @returns {Date|null}
 */
function parseBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  const isValidDate =
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;

  return isValidDate ? parsed : null;
}

/**
 * @returns {Record<string, HTMLElement>}
 */
function collectElements() {
  return {
    introScreen: document.getElementById('intro-screen'),
    ageScreen: document.getElementById('age-screen'),
    gameScreen: document.getElementById('game-screen'),
    playButton: document.getElementById('play-button'),
    infoButton: document.getElementById('info-button'),
    infoModal: document.getElementById('info-modal'),
    closeInfo: document.getElementById('close-info'),
    verifyAge: document.getElementById('verify-age'),
    ageBack: document.getElementById('age-back'),
    birthdateInput: document.getElementById('birthdate-input'),
    ageMessage: document.getElementById('age-message'),
    entrySoundToggle: document.getElementById('entry-sound-toggle'),
    entryVolume: document.getElementById('entry-volume'),
    bigWinOverlay: document.getElementById('big-win-overlay'),
    bigWinText: document.getElementById('big-win-text'),
    reel0: document.getElementById('reel-0'),
    reel1: document.getElementById('reel-1'),
    reel2: document.getElementById('reel-2'),
    betValue: document.getElementById('bet-value'),
    hudBetValue: document.getElementById('hud-bet-value'),
    balanceValue: document.getElementById('balance-value'),
    spentValue: document.getElementById('spent-value'),
    wonValue: document.getElementById('won-value'),
    netValue: document.getElementById('net-value'),
    spinsValue: document.getElementById('spins-value'),
    outcomeMessage: document.getElementById('outcome-message'),
    statusMessage: document.getElementById('status-message'),
    responsibleNote: document.getElementById('responsible-note'),
    tierValue: document.getElementById('tier-value'),
    xpValue: document.getElementById('xp-value'),
    xpNext: document.getElementById('xp-next'),
    xpProgress: document.getElementById('xp-progress'),
    xpProgressFill: document.getElementById('xp-progress-fill'),
    spinButton: document.getElementById('spin-button'),
    leverButton: document.getElementById('lever-button'),
    betDown: document.getElementById('bet-down'),
    betUp: document.getElementById('bet-up'),
    budgetLimit: document.getElementById('budget-limit'),
    lossLimit: document.getElementById('loss-limit'),
    applyLimits: document.getElementById('apply-limits'),
    resetSession: document.getElementById('reset-session'),
    highContrastToggle: document.getElementById('high-contrast-toggle'),
    largePrintToggle: document.getElementById('large-print-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    soundLevel: document.getElementById('sound-level'),
    paytableBody: document.getElementById('paytable-body'),
    infoPaytableBody: document.getElementById('info-paytable-body'),
    rtpLine: document.getElementById('rtp-line'),
    houseEdgeLine: document.getElementById('house-edge-line'),
    randomLine: document.getElementById('random-line')
  };
}

/**
 * @param {Record<string, HTMLElement>} elements
 * @param {'intro'|'age'|'game'} target
 */
function setActiveScreen(elements, target) {
  const screens = {
    intro: elements.introScreen,
    age: elements.ageScreen,
    game: elements.gameScreen
  };

  for (const [name, screenElement] of Object.entries(screens)) {
    const isMatch = name === target;
    screenElement.hidden = !isMatch;
    screenElement.classList.toggle('is-active', isMatch);
  }
}

/**
 * @param {HTMLElement} element
 * @param {string} symbolId
 */
function renderReelSymbol(element, symbolId) {
  const symbol = getSymbolById(symbolId);
  const safeLabel = symbol?.label ?? symbolId.toUpperCase();

  element.textContent = '';

  const icon = document.createElement('img');
  icon.className = 'reel-icon';
  icon.src = symbol?.iconPath ?? '';
  icon.alt = `${safeLabel} symbol`;

  const label = document.createElement('span');
  label.className = 'reel-label';
  label.textContent = safeLabel;

  element.append(icon, label);
  element.setAttribute('aria-label', safeLabel);
}

/**
 * @param {string[]} reels
 * @param {HTMLElement[]} reelElements
 */
function renderReels(reels, reelElements) {
  reels.forEach((symbolId, index) => {
    renderReelSymbol(reelElements[index], symbolId);
  });
}

/**
 * @param {HTMLElement[]} reelElements
 * @param {string[]} targetReels
 * @param {boolean} reduceMotion
 * @returns {Promise<void>}
 */
async function animateReels(reelElements, targetReels, reduceMotion) {
  if (reduceMotion) {
    renderReels(targetReels, reelElements);
    return;
  }

  const symbolIds = getAllSymbols().map((symbol) => symbol.id);

  await Promise.all(
    reelElements.map((element, index) => {
      return new Promise((resolve) => {
        let tick = 0;
        const maxTicks = 12 + index * 3;

        const intervalId = window.setInterval(() => {
          tick += 1;
          const randomId = symbolIds[Math.floor(Math.random() * symbolIds.length)];

          renderReelSymbol(element, randomId);
          element.classList.add('reel-spin');

          window.setTimeout(() => {
            element.classList.remove('reel-spin');
          }, 90);

          if (tick >= maxTicks) {
            window.clearInterval(intervalId);
            renderReelSymbol(element, targetReels[index]);
            resolve();
          }
        }, 72);
      });
    })
  );
}

/**
 * @param {ReturnType<import('./game.js').SlotGame['getState']>} state
 * @returns {{text:string, tone:'jackpot'|'win'|'push'|'loss'|'neutral'}}
 */
function buildOutcomeMessage(state) {
  if (!state.lastOutcome) {
    return {
      text: 'Ready to spin.',
      tone: 'neutral'
    };
  }

  const { payout, bet, spinNet, ruleLabel, result, isJackpot } = state.lastOutcome;

  if (isJackpot) {
    return {
      text: `Major win ${formatSigned(spinNet)} (payout ${formatCredits(payout)}). ${ruleLabel}`,
      tone: 'jackpot'
    };
  }

  if (result === 'win') {
    return {
      text: `Win ${formatSigned(spinNet)} (payout ${formatCredits(payout)}). ${ruleLabel}`,
      tone: 'win'
    };
  }

  if (result === 'push') {
    return {
      text: `Break-even spin. Payout ${formatCredits(payout)}. ${ruleLabel}`,
      tone: 'push'
    };
  }

  return {
    text: `No payout this spin. You spent ${formatCredits(bet)}.`,
    tone: 'loss'
  };
}

/**
 * @param {ReturnType<import('./game.js').SlotGame['getState']>} state
 * @returns {string}
 */
function buildResponsiblePrompt(state) {
  if (state.paused) {
    return `Gameplay paused: ${state.pauseReason} You can adjust limits or reset for a fresh session.`;
  }

  if (state.budgetLimit !== null && state.totalSpent >= state.budgetLimit * 0.8) {
    return `You are close to your budget limit (${state.totalSpent}/${state.budgetLimit} spent).`;
  }

  const netLoss = Math.max(0, -state.sessionNet);
  if (state.lossLimit !== null && netLoss >= state.lossLimit * 0.8) {
    return `You are close to your loss limit (${netLoss}/${state.lossLimit} net loss).`;
  }

  if (state.spinCount > 0 && state.spinCount % 10 === 0) {
    return `${state.spinCount} spins completed. Consider taking a short break before continuing.`;
  }

  return 'You can pause at any time. No streak guarantees, no hidden modes.';
}

/**
 * @param {HTMLElement} tbody
 */
function fillPaytableBody(tbody) {
  const rows = getPaytableRows();
  tbody.innerHTML = '';

  for (const row of rows) {
    const tr = document.createElement('tr');
    const comboCell = document.createElement('td');
    const payoutCell = document.createElement('td');

    comboCell.textContent = row.combination;
    payoutCell.textContent = row.payout;

    tr.append(comboCell, payoutCell);
    tbody.append(tr);
  }
}

/**
 * @param {Record<string, HTMLElement>} elements
 */
function renderPaytables(elements) {
  fillPaytableBody(elements.paytableBody);
  fillPaytableBody(elements.infoPaytableBody);
}

/**
 * @param {Record<string, HTMLElement>} elements
 */
function renderFairness(elements) {
  const fairness = getFairnessReport();

  elements.rtpLine.textContent =
    `Estimated RTP: ${fairness.rtpPercent.toFixed(2)}% (${fairness.method})`;
  elements.houseEdgeLine.textContent =
    `Estimated House Edge: ${fairness.houseEdgePercent.toFixed(2)}%`;
  elements.randomLine.textContent = `Randomness source: ${fairness.randomSource}`;
}

/**
 * @param {Record<string, HTMLElement>} elements
 * @param {string} message
 */
function setStatus(elements, message) {
  elements.statusMessage.textContent = message;
}

/**
 * @param {Record<string, HTMLElement>} elements
 * @param {import('./game.js').SlotGame} game
 */
function renderState(elements, game) {
  const state = game.getState();
  const outcome = buildOutcomeMessage(state);

  renderReels(state.reels, [elements.reel0, elements.reel1, elements.reel2]);

  elements.betValue.textContent = String(state.bet);
  elements.hudBetValue.textContent = formatCredits(state.bet);
  elements.balanceValue.textContent = formatCredits(state.balance);
  elements.spentValue.textContent = formatCredits(state.totalSpent);
  elements.wonValue.textContent = formatCredits(state.totalWon);
  elements.spinsValue.textContent = String(state.spinCount);

  elements.netValue.textContent = formatSigned(state.sessionNet);
  elements.netValue.classList.remove('net-positive', 'net-negative', 'net-neutral');
  if (state.sessionNet > 0) {
    elements.netValue.classList.add('net-positive');
  } else if (state.sessionNet < 0) {
    elements.netValue.classList.add('net-negative');
  } else {
    elements.netValue.classList.add('net-neutral');
  }

  elements.outcomeMessage.textContent =
    state.sessionNet < 0 && outcome.tone !== 'loss' && outcome.tone !== 'neutral'
      ? `${outcome.text} Session still down ${formatCredits(Math.abs(state.sessionNet))}.`
      : outcome.text;

  elements.outcomeMessage.className = `outcome ${outcome.tone}`;

  elements.responsibleNote.textContent = buildResponsiblePrompt(state);

  elements.tierValue.textContent = state.loyalty.tier;
  elements.xpValue.textContent = String(state.loyalty.xp);
  elements.xpProgressFill.style.width = `${state.loyalty.progressPercent}%`;
  elements.xpProgress.setAttribute('aria-valuenow', String(state.loyalty.progressPercent));

  elements.xpNext.textContent =
    state.loyalty.nextTier === null
      ? 'Max tier reached'
      : `${state.loyalty.xpToNext} XP to ${state.loyalty.nextTier}`;

  if (document.activeElement !== elements.budgetLimit) {
    elements.budgetLimit.value = state.budgetLimit === null ? '' : String(state.budgetLimit);
  }

  if (document.activeElement !== elements.lossLimit) {
    elements.lossLimit.value = state.lossLimit === null ? '' : String(state.lossLimit);
  }

  const readiness = game.canSpin();
  elements.spinButton.disabled = !readiness.ok;
  elements.leverButton.disabled = !readiness.ok;
  elements.betDown.disabled = state.bet <= game.minBet;
  elements.betUp.disabled = state.bet >= Math.min(game.maxBet, state.balance);

  if (!readiness.ok && state.spinCount > 0) {
    setStatus(elements, readiness.reason ?? 'Cannot spin right now.');
  }
}

/**
 * @param {Record<string, HTMLElement>} elements
 * @param {import('./audio.js').AudioController} audio
 */
function syncSoundControls(elements, audio) {
  const enabled = audio.isEnabled();
  const volumePercent = Math.round(audio.getVolume() * 100);

  elements.soundToggle.checked = enabled;
  elements.entrySoundToggle.checked = enabled;
  elements.soundLevel.value = String(volumePercent);
  elements.entryVolume.value = String(volumePercent);
}

/**
 * @param {Record<string, HTMLElement>} elements
 */
function showInfoModal(elements) {
  elements.infoModal.hidden = false;
}

/**
 * @param {Record<string, HTMLElement>} elements
 */
function hideInfoModal(elements) {
  elements.infoModal.hidden = true;
}

/**
 * @param {Record<string, HTMLElement>} elements
 * @param {ReturnType<import('./game.js').SlotGame['getState']['lastOutcome']} outcome
 */
function showBigWinOverlay(elements, outcome) {
  const symbolId = outcome?.reels?.[0] ?? 'unknown';
  const symbolLabel = getSymbolById(symbolId)?.label ?? symbolId;
  const payout = outcome?.payout ?? 0;

  elements.bigWinText.textContent = `${symbolLabel} full match. Payout ${formatCredits(payout)}.`;
  elements.bigWinOverlay.hidden = false;

  window.setTimeout(() => {
    elements.bigWinOverlay.hidden = true;
  }, 2200);
}

/**
 * @param {HTMLInputElement} input
 */
function normalizeBirthdateInput(input) {
  const digitsOnly = input.value.replace(/[^\d]/g, '').slice(0, 8);
  const first = digitsOnly.slice(0, 2);
  const second = digitsOnly.slice(2, 4);
  const third = digitsOnly.slice(4, 8);

  if (digitsOnly.length <= 2) {
    input.value = first;
    return;
  }

  if (digitsOnly.length <= 4) {
    input.value = `${first}/${second}`;
    return;
  }

  input.value = `${first}/${second}/${third}`;
}

/**
 * @param {{
 *  game: import('./game.js').SlotGame,
 *  audio: import('./audio.js').AudioController,
 *  accessibility: import('./accessibility.js').AccessibilityController
 * }} dependencies
 */
export function initializeUI(dependencies) {
  const { game, audio, accessibility } = dependencies;
  const elements = collectElements();
  const reelElements = [elements.reel0, elements.reel1, elements.reel2];

  const prefs = accessibility.initialize();
  elements.highContrastToggle.checked = prefs.highContrast;
  elements.largePrintToggle.checked = prefs.largePrint;

  renderPaytables(elements);
  renderFairness(elements);
  renderState(elements, game);
  syncSoundControls(elements, audio);
  setActiveScreen(elements, 'intro');

  let spinInProgress = false;

  const beginAudio = () => {
    audio.activateFromGesture();
  };

  window.addEventListener('pointerdown', beginAudio, { once: true });

  elements.playButton.addEventListener('click', () => {
    beginAudio();
    elements.birthdateInput.value = '';
    elements.ageMessage.textContent = '';
    setActiveScreen(elements, 'age');
    elements.birthdateInput.focus();
  });

  elements.infoButton.addEventListener('click', () => {
    beginAudio();
    showInfoModal(elements);
  });

  elements.closeInfo.addEventListener('click', () => {
    hideInfoModal(elements);
  });

  elements.infoModal.addEventListener('click', (event) => {
    if (event.target === elements.infoModal) {
      hideInfoModal(elements);
    }
  });

  elements.ageBack.addEventListener('click', () => {
    setActiveScreen(elements, 'intro');
  });

  elements.birthdateInput.addEventListener('input', () => {
    normalizeBirthdateInput(elements.birthdateInput);
  });

  elements.verifyAge.addEventListener('click', () => {
    beginAudio();
    const parsedBirthDate = parseBirthDate(elements.birthdateInput.value);

    if (!parsedBirthDate) {
      elements.ageMessage.textContent =
        'Invalid date format. Please use MM/DD/YYYY and enter a valid calendar date.';
      return;
    }

    if (parsedBirthDate > AGE_GATE_MAX_BIRTHDATE) {
      elements.ageMessage.textContent =
        `Access denied. You must be 21 or older to enter. Latest eligible birth date is ${AGE_GATE_MAX_BIRTHDATE_LABEL}.`;
      return;
    }

    elements.ageMessage.textContent = 'Age verified. Entering game...';
    setActiveScreen(elements, 'game');
    audio.playWelcome();
    setStatus(elements, 'Welcome to Bikini Bottom Slots. Good luck.');
    window.setTimeout(() => {
      elements.spinButton.focus();
    }, 50);
  });

  /**
   * @param {'button'|'lever'} source
   */
  const triggerSpin = async (source) => {
    if (spinInProgress) {
      return;
    }

    const readiness = game.canSpin();
    if (!readiness.ok) {
      renderState(elements, game);
      setStatus(elements, readiness.reason ?? 'Cannot spin right now.');
      return;
    }

    spinInProgress = true;
    elements.spinButton.disabled = true;
    elements.leverButton.disabled = true;

    if (source === 'lever') {
      elements.leverButton.classList.add('lever-spin');
      window.setTimeout(() => {
        elements.leverButton.classList.remove('lever-spin');
      }, 370);
    }

    setStatus(elements, 'Spinning...');
    audio.playSpin();

    const spinResult = game.spin();
    if (!spinResult.ok || !spinResult.outcome) {
      spinInProgress = false;
      renderState(elements, game);
      setStatus(elements, spinResult.reason ?? 'Unable to complete spin.');
      return;
    }

    await animateReels(reelElements, spinResult.outcome.reels, accessibility.getPreferences().reducedMotion);
    audio.playOutcome(spinResult.outcome);

    renderState(elements, game);

    if (spinResult.outcome.isJackpot) {
      showBigWinOverlay(elements, spinResult.outcome);
    }

    if (spinResult.state?.paused) {
      setStatus(elements, `Spin complete. ${spinResult.state.pauseReason}`);
    } else {
      setStatus(elements, 'Spin complete.');
    }

    spinInProgress = false;
    renderState(elements, game);
  };

  elements.betDown.addEventListener('click', () => {
    game.changeBet(-1);
    renderState(elements, game);
    setStatus(elements, 'Bet decreased.');
  });

  elements.betUp.addEventListener('click', () => {
    game.changeBet(1);
    renderState(elements, game);
    setStatus(elements, 'Bet increased.');
  });

  elements.spinButton.addEventListener('click', async () => {
    beginAudio();
    await triggerSpin('button');
  });

  elements.leverButton.addEventListener('click', async () => {
    beginAudio();
    await triggerSpin('lever');
  });

  elements.applyLimits.addEventListener('click', () => {
    const response = game.updateLimits({
      budgetLimit: elements.budgetLimit.value,
      lossLimit: elements.lossLimit.value
    });

    renderState(elements, game);

    if (response.paused) {
      setStatus(elements, `Limits saved. ${response.pauseReason}`);
      return;
    }

    setStatus(elements, 'Limits saved.');
  });

  elements.resetSession.addEventListener('click', () => {
    game.resetSession();
    renderState(elements, game);
    setStatus(elements, 'Session reset to starting balance.');
  });

  elements.highContrastToggle.addEventListener('change', () => {
    accessibility.setHighContrast(elements.highContrastToggle.checked);
  });

  elements.largePrintToggle.addEventListener('change', () => {
    accessibility.setLargePrint(elements.largePrintToggle.checked);
  });

  const applySoundEnabled = (enabled) => {
    beginAudio();
    audio.setEnabled(enabled);
    syncSoundControls(elements, audio);
    setStatus(elements, enabled ? 'Sound enabled.' : 'Sound muted.');
  };

  const applySoundVolume = (inputValue) => {
    beginAudio();
    const parsed = Number(inputValue);
    const volume = Number.isFinite(parsed) ? parsed / 100 : 0.4;
    audio.setVolume(volume);
    syncSoundControls(elements, audio);
    setStatus(elements, `Volume set to ${Math.round(audio.getVolume() * 100)}%.`);
  };

  elements.soundToggle.addEventListener('change', () => {
    applySoundEnabled(elements.soundToggle.checked);
  });

  elements.entrySoundToggle.addEventListener('change', () => {
    applySoundEnabled(elements.entrySoundToggle.checked);
  });

  elements.soundLevel.addEventListener('input', () => {
    applySoundVolume(elements.soundLevel.value);
  });

  elements.entryVolume.addEventListener('input', () => {
    applySoundVolume(elements.entryVolume.value);
  });
}
