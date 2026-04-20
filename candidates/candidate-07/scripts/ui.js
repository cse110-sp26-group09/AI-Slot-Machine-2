import { getFairnessReport, getPaytableRows } from './payouts.js';
import { getAllSymbols, getSymbolById } from './reels.js';

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
 * @returns {Record<string, HTMLElement>}
 */
function collectElements() {
  return {
    reel0: document.getElementById('reel-0'),
    reel1: document.getElementById('reel-1'),
    reel2: document.getElementById('reel-2'),
    betValue: document.getElementById('bet-value'),
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
    rtpLine: document.getElementById('rtp-line'),
    houseEdgeLine: document.getElementById('house-edge-line'),
    randomLine: document.getElementById('random-line')
  };
}

/**
 * @param {string[]} reels
 * @param {HTMLElement[]} reelElements
 */
function renderReels(reels, reelElements) {
  reels.forEach((symbolId, index) => {
    const label = getSymbolById(symbolId)?.label ?? symbolId.toUpperCase();
    reelElements[index].textContent = label;
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

  const symbolLabels = getAllSymbols().map((symbol) => symbol.label);

  await Promise.all(
    reelElements.map((element, index) => {
      return new Promise((resolve) => {
        let tick = 0;
        const maxTicks = 8 + index * 2;

        const intervalId = window.setInterval(() => {
          tick += 1;
          const randomLabel = symbolLabels[Math.floor(Math.random() * symbolLabels.length)];
          element.textContent = randomLabel;
          element.classList.add('reel-spin');

          window.setTimeout(() => {
            element.classList.remove('reel-spin');
          }, 90);

          if (tick >= maxTicks) {
            window.clearInterval(intervalId);
            element.textContent = getSymbolById(targetReels[index])?.label ?? targetReels[index].toUpperCase();
            resolve();
          }
        }, 80);
      });
    })
  );
}

/**
 * @param {ReturnType<import('./game.js').SlotGame['getState']>} state
 * @returns {{text:string, tone:'win'|'push'|'loss'|'neutral'}}
 */
function buildOutcomeMessage(state) {
  if (!state.lastOutcome) {
    return {
      text: 'Ready to spin.',
      tone: 'neutral'
    };
  }

  const { payout, bet, spinNet, ruleLabel, result } = state.lastOutcome;

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
 * @param {Record<string, HTMLElement>} elements
 */
function renderPaytable(elements) {
  const rows = getPaytableRows();
  elements.paytableBody.innerHTML = '';

  for (const row of rows) {
    const tr = document.createElement('tr');
    const comboCell = document.createElement('td');
    const payoutCell = document.createElement('td');

    comboCell.textContent = row.combination;
    payoutCell.textContent = row.payout;

    tr.append(comboCell, payoutCell);
    elements.paytableBody.append(tr);
  }
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
    state.sessionNet < 0 && outcome.tone === 'win'
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
  elements.betDown.disabled = state.bet <= game.minBet;
  elements.betUp.disabled = state.bet >= Math.min(game.maxBet, state.balance);

  if (!readiness.ok && state.spinCount > 0) {
    setStatus(elements, readiness.reason ?? 'Cannot spin right now.');
  }
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

  renderPaytable(elements);
  renderFairness(elements);
  renderState(elements, game);

  let spinInProgress = false;

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
    if (spinResult.state?.paused) {
      setStatus(elements, `Spin complete. ${spinResult.state.pauseReason}`);
    } else {
      setStatus(elements, 'Spin complete.');
    }

    spinInProgress = false;
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

  elements.soundToggle.addEventListener('change', () => {
    audio.setEnabled(elements.soundToggle.checked);
    setStatus(elements, elements.soundToggle.checked ? 'Sound enabled.' : 'Sound muted.');
  });

  elements.soundLevel.addEventListener('change', () => {
    const volume = Number(elements.soundLevel.value);
    audio.setVolume(volume);
    setStatus(elements, `Sound level set to ${elements.soundLevel.selectedOptions[0].text}.`);
  });
}
