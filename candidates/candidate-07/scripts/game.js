import { spinReels } from './reels.js';
import { evaluateSpin } from './payouts.js';

const TIER_STEPS = Object.freeze([
  { name: 'Bronze', minXp: 0, nextXp: 300, nextTier: 'Silver' },
  { name: 'Silver', minXp: 300, nextXp: 700, nextTier: 'Gold' },
  { name: 'Gold', minXp: 700, nextXp: 1200, nextTier: 'Platinum' },
  { name: 'Platinum', minXp: 1200, nextXp: null, nextTier: null }
]);

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parseOptionalPositiveInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

/**
 * @param {number} xp
 * @returns {{tier:string, progressPercent:number, xpToNext:number|null, nextTier:string|null}}
 */
function getTierProgress(xp) {
  for (let index = TIER_STEPS.length - 1; index >= 0; index -= 1) {
    const tier = TIER_STEPS[index];

    if (xp >= tier.minXp) {
      if (tier.nextXp === null) {
        return {
          tier: tier.name,
          progressPercent: 100,
          xpToNext: null,
          nextTier: null
        };
      }

      const span = tier.nextXp - tier.minXp;
      const earned = xp - tier.minXp;
      return {
        tier: tier.name,
        progressPercent: clamp(Math.round((earned / span) * 100), 0, 100),
        xpToNext: Math.max(0, tier.nextXp - xp),
        nextTier: tier.nextTier
      };
    }
  }

  return {
    tier: 'Bronze',
    progressPercent: 0,
    xpToNext: 300,
    nextTier: 'Silver'
  };
}

export class SlotGame {
  /**
   * @param {{initialBalance?: number, initialBet?: number, minBet?: number, maxBet?: number}} options
   */
  constructor(options = {}) {
    this.initialBalance = Number.isFinite(options.initialBalance) ? Math.floor(options.initialBalance) : 200;
    this.minBet = Number.isFinite(options.minBet) ? Math.floor(options.minBet) : 1;
    this.maxBet = Number.isFinite(options.maxBet) ? Math.floor(options.maxBet) : 25;

    const requestedBet = Number.isFinite(options.initialBet) ? Math.floor(options.initialBet) : 5;

    this.state = {
      balance: this.initialBalance,
      bet: clamp(requestedBet, this.minBet, this.maxBet),
      totalSpent: 0,
      totalWon: 0,
      spinCount: 0,
      reels: ['prompt', 'token', 'model'],
      lastOutcome: null,
      paused: false,
      pauseReason: '',
      budgetLimit: null,
      lossLimit: null,
      xp: 0
    };
  }

  /**
   * @returns {number}
   */
  getSessionNet() {
    return this.state.totalWon - this.state.totalSpent;
  }

  /**
   * @returns {boolean}
   */
  isPaused() {
    return this.state.paused;
  }

  /**
   * @param {number} nextBet
   * @returns {number}
   */
  setBet(nextBet) {
    const sanitized = Number.isFinite(nextBet) ? Math.floor(nextBet) : this.state.bet;
    const maxAffordableBet = Math.min(this.maxBet, Math.max(this.minBet, this.state.balance));
    this.state.bet = clamp(sanitized, this.minBet, maxAffordableBet);
    return this.state.bet;
  }

  /**
   * @param {number} delta
   * @returns {number}
   */
  changeBet(delta) {
    const currentBet = this.state.bet;
    const numericDelta = Number.isFinite(delta) ? Math.floor(delta) : 0;
    return this.setBet(currentBet + numericDelta);
  }

  /**
   * @param {{budgetLimit?: number|string|null, lossLimit?: number|string|null}} limits
   * @returns {{paused:boolean, pauseReason:string}}
   */
  updateLimits(limits = {}) {
    this.state.budgetLimit = parseOptionalPositiveInteger(limits.budgetLimit);
    this.state.lossLimit = parseOptionalPositiveInteger(limits.lossLimit);
    this.recalculatePauseState();

    return {
      paused: this.state.paused,
      pauseReason: this.state.pauseReason
    };
  }

  /**
   * @returns {{ok:boolean, reason?:string}}
   */
  canSpin() {
    this.recalculatePauseState();

    if (this.state.paused) {
      return {
        ok: false,
        reason: this.state.pauseReason
      };
    }

    if (this.state.balance < this.minBet) {
      return {
        ok: false,
        reason: 'Balance too low. Reset session to continue.'
      };
    }

    if (this.state.bet > this.state.balance) {
      this.setBet(this.state.balance);
    }

    if (this.state.bet < this.minBet) {
      return {
        ok: false,
        reason: `Minimum bet is ${this.minBet}.`
      };
    }

    return { ok: true };
  }

  /**
   * @returns {{ok:boolean, reason?:string, outcome?:object, state?:object}}
   */
  spin() {
    const readiness = this.canSpin();
    if (!readiness.ok) {
      return readiness;
    }

    this.state.balance -= this.state.bet;
    this.state.totalSpent += this.state.bet;

    const reels = spinReels(3);
    const payoutOutcome = evaluateSpin(reels, this.state.bet);

    this.state.balance += payoutOutcome.payout;
    this.state.totalWon += payoutOutcome.payout;
    this.state.spinCount += 1;
    this.state.reels = reels;

    const outcome = {
      ...payoutOutcome,
      reels,
      bet: this.state.bet,
      spinNet: payoutOutcome.payout - this.state.bet
    };

    this.state.lastOutcome = outcome;
    this.applyLoyaltyXp(outcome);
    this.recalculatePauseState();

    return {
      ok: true,
      outcome,
      state: this.getState()
    };
  }

  /**
   * @returns {object}
   */
  resetSession() {
    const previousBet = this.state.bet;

    this.state.balance = this.initialBalance;
    this.state.bet = clamp(previousBet, this.minBet, this.maxBet);
    this.state.totalSpent = 0;
    this.state.totalWon = 0;
    this.state.spinCount = 0;
    this.state.reels = ['prompt', 'token', 'model'];
    this.state.lastOutcome = null;
    this.state.paused = false;
    this.state.pauseReason = '';
    this.state.xp = 0;

    return this.getState();
  }

  /**
   * @param {{result:'win'|'push'|'loss', isJackpot:boolean}} outcome
   */
  applyLoyaltyXp(outcome) {
    let earnedXp = 10;

    if (outcome.result === 'win') {
      earnedXp += 20;
    } else if (outcome.result === 'push') {
      earnedXp += 8;
    }

    if (outcome.isJackpot) {
      earnedXp += 30;
    }

    this.state.xp += earnedXp;
  }

  recalculatePauseState() {
    const netLoss = Math.max(0, -this.getSessionNet());

    if (this.state.budgetLimit !== null && this.state.totalSpent >= this.state.budgetLimit) {
      this.state.paused = true;
      this.state.pauseReason =
        `Budget limit reached (${this.state.totalSpent}/${this.state.budgetLimit} spent).`;
      return;
    }

    if (this.state.lossLimit !== null && netLoss >= this.state.lossLimit) {
      this.state.paused = true;
      this.state.pauseReason =
        `Loss limit reached (${netLoss}/${this.state.lossLimit} net loss).`;
      return;
    }

    this.state.paused = false;
    this.state.pauseReason = '';
  }

  /**
   * @returns {{
   *  balance:number,
   *  bet:number,
   *  totalSpent:number,
   *  totalWon:number,
   *  sessionNet:number,
   *  spinCount:number,
   *  reels:string[],
   *  lastOutcome:object|null,
   *  paused:boolean,
   *  pauseReason:string,
   *  budgetLimit:number|null,
   *  lossLimit:number|null,
   *  loyalty:{xp:number,tier:string,progressPercent:number,xpToNext:number|null,nextTier:string|null}
   * }}
   */
  getState() {
    const loyalty = getTierProgress(this.state.xp);

    return {
      balance: this.state.balance,
      bet: this.state.bet,
      totalSpent: this.state.totalSpent,
      totalWon: this.state.totalWon,
      sessionNet: this.getSessionNet(),
      spinCount: this.state.spinCount,
      reels: this.state.reels.slice(),
      lastOutcome: this.state.lastOutcome,
      paused: this.state.paused,
      pauseReason: this.state.pauseReason,
      budgetLimit: this.state.budgetLimit,
      lossLimit: this.state.lossLimit,
      loyalty: {
        xp: this.state.xp,
        tier: loyalty.tier,
        progressPercent: loyalty.progressPercent,
        xpToNext: loyalty.xpToNext,
        nextTier: loyalty.nextTier
      }
    };
  }
}
