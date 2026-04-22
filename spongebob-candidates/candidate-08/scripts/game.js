import { evaluateSpin } from "./payouts.js";

const TIER_STEPS = [
  { tier: "Bronze", minXp: 0, nextXp: 200 },
  { tier: "Silver", minXp: 200, nextXp: 600 },
  { tier: "Gold", minXp: 600, nextXp: 1200 },
  { tier: "Platinum", minXp: 1200, nextXp: null }
];

/**
 * @typedef {{ id: string, label: string, icon: string, imagePath: string, weight: number }} SymbolDef
 */

/**
 * Core game/session state container.
 */
export class SlotGame {
  /**
   * @param {{ initialBalance?: number, initialBet?: number, minBet?: number, maxBet?: number, lossLimit?: number }} options
   */
  constructor(options = {}) {
    this.balance = options.initialBalance ?? 300;
    this.bet = options.initialBet ?? 5;
    this.minBet = options.minBet ?? 1;
    this.maxBet = options.maxBet ?? 20;
    this.totalSpend = 0;
    this.totalPayout = 0;
    this.netResult = 0;
    this.spins = 0;
    this.lossLimit = Math.max(0, options.lossLimit ?? 100);
    this.isPaused = false;
    this.pauseReason = "";
    this.xp = 0;
  }

  /**
   * @returns {{ tier: string, progressPercent: number, currentXp: number, nextXp: number | null }}
   */
  getLoyalty() {
    let current = TIER_STEPS[0];

    for (const step of TIER_STEPS) {
      if (this.xp >= step.minXp) {
        current = step;
      }
    }

    if (current.nextXp === null) {
      return {
        tier: current.tier,
        progressPercent: 100,
        currentXp: this.xp,
        nextXp: null
      };
    }

    const span = current.nextXp - current.minXp;
    const progress = (this.xp - current.minXp) / span;

    return {
      tier: current.tier,
      progressPercent: Math.max(0, Math.min(100, progress * 100)),
      currentXp: this.xp,
      nextXp: current.nextXp
    };
  }

  /**
   * @returns {{ balance: number, bet: number, totalSpend: number, totalPayout: number, netResult: number, spins: number, lossLimit: number, isPaused: boolean, pauseReason: string, loyalty: { tier: string, progressPercent: number, currentXp: number, nextXp: number | null } }}
   */
  getState() {
    return {
      balance: this.balance,
      bet: this.bet,
      totalSpend: this.totalSpend,
      totalPayout: this.totalPayout,
      netResult: this.netResult,
      spins: this.spins,
      lossLimit: this.lossLimit,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
      loyalty: this.getLoyalty()
    };
  }

  /**
   * @param {number} value
   * @returns {number}
   */
  setBet(value) {
    const safeValue = Number.isFinite(value) ? Math.round(value) : this.bet;
    this.bet = Math.max(this.minBet, Math.min(this.maxBet, safeValue));
    return this.bet;
  }

  /**
   * @param {number} delta
   * @returns {number}
   */
  adjustBet(delta) {
    return this.setBet(this.bet + delta);
  }

  /**
   * @param {number} amount
   * @returns {number}
   */
  setLossLimit(amount) {
    const safe = Number.isFinite(amount) ? Math.round(amount) : this.lossLimit;
    this.lossLimit = Math.max(0, safe);
    if (this.lossLimit === 0) {
      this.isPaused = false;
      this.pauseReason = "";
      return this.lossLimit;
    }

    if (this.netResult > -this.lossLimit) {
      this.isPaused = false;
      this.pauseReason = "";
    } else {
      this.isPaused = true;
      this.pauseReason = `Loss limit reached (${this.lossLimit} credits). Reset session summary or change the limit.`;
    }
    return this.lossLimit;
  }

  /**
   * @param {number} amount
   */
  addCredits(amount) {
    const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
    if (safe > 0) {
      this.balance += safe;
    }
  }

  /**
   * Reset spend/payout history for a fresh session summary.
   */
  resetSessionSummary() {
    this.totalSpend = 0;
    this.totalPayout = 0;
    this.netResult = 0;
    this.spins = 0;
    this.xp = 0;
    this.isPaused = false;
    this.pauseReason = "";
  }

  /**
   * @returns {{ ok: boolean, reason: string }}
   */
  canSpin() {
    if (this.isPaused) {
      return { ok: false, reason: this.pauseReason || "Session is paused." };
    }
    if (this.bet < this.minBet || this.bet > this.maxBet) {
      return { ok: false, reason: "Bet is out of range." };
    }
    if (this.balance < this.bet) {
      return { ok: false, reason: "Not enough credits. Add credits or lower your bet." };
    }
    return { ok: true, reason: "" };
  }

  /**
   * @param {number} payout
   */
  recordLoyaltyXp(payout) {
    const baseXp = 10;
    const payoutBonus = payout > 0 ? Math.min(20, Math.floor(payout / 2)) : 0;
    this.xp += baseXp + payoutBonus;
  }

  /**
   * @param {number} netChange
   * @returns {"win" | "neutral" | "loss"}
   */
  classifyOutcome(netChange) {
    if (netChange > 0) {
      return "win";
    }
    if (netChange === 0) {
      return "neutral";
    }
    return "loss";
  }

  /**
   * @param {{ matchType: "triple" | "pair" | "none", payout: number }} payoutResult
   * @returns {"major" | "minor" | "none"}
   */
  getWinTier(payoutResult) {
    if (payoutResult.matchType === "triple") {
      return "major";
    }
    if (payoutResult.payout > 0) {
      return "minor";
    }
    return "none";
  }

  /**
   * @param {{ netChange: number }} outcome
   * @returns {string}
   */
  getResponsiblePrompt(outcome) {
    if (this.isPaused) {
      return "Session paused: your configured loss limit was reached. Take a break before continuing.";
    }

    if (this.lossLimit > 0) {
      const used = Math.max(0, -this.netResult);
      const ratio = used / this.lossLimit;
      if (ratio >= 0.75) {
        return `You have used ${Math.round(ratio * 100)}% of your session loss limit.`;
      }
    }

    if (this.spins > 0 && this.spins % 10 === 0) {
      return "Quick check-in: 10 spins completed. Consider a short pause and review your net result.";
    }

    if (outcome.netChange < 0 && this.spins % 5 === 0) {
      return "Reminder: outcomes are random each spin. Set a comfortable limit and stick to it.";
    }

    return "";
  }

  /**
   * @param {SymbolDef[]} symbols
   * @param {{ payout: number, multiplier: number, line: string }} payoutResult
   * @param {number} netChange
   * @returns {string}
   */
  buildOutcomeText(symbols, payoutResult, netChange) {
    const line = symbols.map((symbol) => `${symbol.icon} ${symbol.label}`).join(" | ");

    if (netChange > 0) {
      return `Net win +${netChange} credits. ${payoutResult.line}. [${line}]`;
    }
    if (netChange === 0) {
      return `Break-even spin. ${payoutResult.line}. [${line}]`;
    }
    return `Net loss ${netChange} credits. ${payoutResult.line}. [${line}]`;
  }

  /**
   * @param {() => SymbolDef[]} spinFn
   * @returns {{ ok: boolean, reason?: string, symbols?: SymbolDef[], payout?: number, netChange?: number, outcomeClass?: "win" | "neutral" | "loss", outcomeText?: string, responsiblePrompt?: string, limitReached?: boolean, winTier?: "major" | "minor" | "none" }}
   */
  spin(spinFn) {
    const permission = this.canSpin();
    if (!permission.ok) {
      return { ok: false, reason: permission.reason };
    }

    this.balance -= this.bet;
    this.totalSpend += this.bet;

    const symbols = spinFn();
    const payoutResult = evaluateSpin(symbols, this.bet);

    this.balance += payoutResult.payout;
    this.totalPayout += payoutResult.payout;
    this.netResult = this.totalPayout - this.totalSpend;
    this.spins += 1;
    this.recordLoyaltyXp(payoutResult.payout);

    const netChange = payoutResult.payout - this.bet;

    let limitReached = false;
    if (this.lossLimit > 0 && this.netResult <= -this.lossLimit) {
      this.isPaused = true;
      this.pauseReason = `Loss limit reached (${this.lossLimit} credits). Reset session summary or change the limit.`;
      limitReached = true;
    }

    const outcomeText = this.buildOutcomeText(symbols, payoutResult, netChange);
    const responsiblePrompt = this.getResponsiblePrompt({ netChange });

    return {
      ok: true,
      symbols,
      payout: payoutResult.payout,
      netChange,
      outcomeClass: this.classifyOutcome(netChange),
      outcomeText,
      responsiblePrompt,
      limitReached,
      winTier: this.getWinTier(payoutResult)
    };
  }
}
