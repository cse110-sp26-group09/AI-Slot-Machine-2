(function attachGameModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const { Payouts, Reels, Storage, Accessibility, Audio } = root;

  const BET_STEPS = [10, 20, 30, 50, 75, 100];
  const LOYALTY_POINTS_PER_LEVEL = 14;

  /**
   * Main game coordinator.
   * @param {{setHandlers:function,render:function,renderPaytable:function,animateSpin:function,playRewardSequence:function}} ui
   */
  function GameController(ui) {
    this.ui = ui;
    this.state = getDefaultState();
    this.isSpinning = false;
    this.symbolById = Payouts.SYMBOLS.reduce((map, symbol) => {
      map[symbol.id] = symbol;
      return map;
    }, {});
  }

  GameController.prototype.init = function init() {
    this.restoreState();
    this.applySettingsSideEffects();
    this.updateDailyAvailability();
    this.ui.renderPaytable(Payouts.SYMBOLS, Payouts.getTheoreticalMetrics());
    this.ui.setHandlers({
      onSpin: this.handleSpin.bind(this),
      onChangeBet: this.handleBetChange.bind(this),
      onToggleLossLimit: this.handleLossLimitToggle.bind(this),
      onApplyLossLimit: this.handleLossLimitApply.bind(this),
      onToggleSound: this.handleSoundToggle.bind(this),
      onSetVolume: this.handleVolumeChange.bind(this),
      onToggleContrast: this.handleContrastToggle.bind(this),
      onToggleReducedMotion: this.handleReducedMotionToggle.bind(this),
      onClaimDaily: this.handleClaimDaily.bind(this),
      onResetSession: this.handleResetSession.bind(this)
    });
    this.persistAndRender();
  };

  GameController.prototype.restoreState = function restoreState() {
    const saved = Storage.load();
    if (!saved) {
      return;
    }

    const merged = getDefaultState();
    merged.balance = positiveInteger(saved.balance, merged.balance);
    merged.bet = normalizeBet(saved.bet);
    merged.spend = positiveInteger(saved.spend, merged.spend);
    merged.won = positiveInteger(saved.won, merged.won);
    merged.spins = positiveInteger(saved.spins, merged.spins);
    merged.wins = positiveInteger(saved.wins, merged.wins);
    merged.lossLimitEnabled = Boolean(saved.lossLimitEnabled);
    merged.lossLimit = clamp(positiveInteger(saved.lossLimit, merged.lossLimit), 50, 100000);
    merged.pausedByLimit = Boolean(saved.pausedByLimit);
    merged.outcomeText = typeof saved.outcomeText === "string" ? saved.outcomeText : merged.outcomeText;
    merged.outcomeType = typeof saved.outcomeType === "string" ? saved.outcomeType : merged.outcomeType;
    merged.responsibleMessage =
      typeof saved.responsibleMessage === "string" ? saved.responsibleMessage : merged.responsibleMessage;
    merged.reelSymbolIds = normalizeReels(saved.reelSymbolIds, merged.reelSymbolIds);
    merged.loyaltyLevel = Math.max(1, positiveInteger(saved.loyaltyLevel, merged.loyaltyLevel));
    merged.loyaltyPoints = Math.max(0, positiveInteger(saved.loyaltyPoints, merged.loyaltyPoints));
    merged.settings = {
      soundEnabled: saved.settings ? Boolean(saved.settings.soundEnabled) : merged.settings.soundEnabled,
      volume: saved.settings ? clamp(Number(saved.settings.volume), 0, 1) : merged.settings.volume,
      highContrast: saved.settings ? Boolean(saved.settings.highContrast) : merged.settings.highContrast,
      reducedMotion: saved.settings ? Boolean(saved.settings.reducedMotion) : merged.settings.reducedMotion
    };
    merged.daily = {
      lastClaimDate:
        saved.daily && typeof saved.daily.lastClaimDate === "string" ? saved.daily.lastClaimDate : "",
      streak: saved.daily ? Math.max(0, positiveInteger(saved.daily.streak, 0)) : 0,
      availableReward: saved.daily ? Math.max(0, positiveInteger(saved.daily.availableReward, 0)) : 0
    };

    this.state = merged;
    this.checkLossLimit();
  };

  GameController.prototype.handleSpin = async function handleSpin() {
    if (this.isSpinning) {
      return;
    }

    if (this.state.pausedByLimit) {
      this.state.outcomeText = "Loss limit reached. Reset session or raise your limit to continue.";
      this.state.outcomeType = "loss";
      this.state.responsibleMessage = "Gameplay is paused to respect your limit.";
      this.persistAndRender();
      Audio.playGuardrail();
      return;
    }

    if (this.state.balance < this.state.bet) {
      this.state.outcomeText = "Balance is below your bet. Lower bet or claim rewards.";
      this.state.outcomeType = "loss";
      this.persistAndRender();
      return;
    }

    this.isSpinning = true;
    try {
      this.state.balance -= this.state.bet;
      this.state.spend += this.state.bet;
      this.state.spins += 1;
      this.state.outcomeText = "Spinning...";
      this.state.outcomeType = "neutral";
      this.persistAndRender();
      Audio.playSpin();

      const spinData = Reels.buildSpin();
      await this.ui.animateSpin(spinData, {
        reducedMotion: this.state.settings.reducedMotion,
        onTick: () => Audio.playSpinTick(),
        onReelStop: (reelIndex) => Audio.playReelStop(reelIndex),
        onAnticipation: () => Audio.playAnticipation()
      });

      this.state.reelSymbolIds = spinData.result;
      const evaluation = Payouts.evaluateSpin(spinData.result, this.state.bet);
      this.state.balance += evaluation.payout;
      this.state.won += evaluation.payout;
      if (evaluation.payout > 0) {
        this.state.wins += 1;
      }

      const loyaltyBonus = this.applyLoyaltyProgress();
      this.applyOutcomeMessage(evaluation, loyaltyBonus);
      this.checkLossLimit();
      this.refreshResponsibleMessage();
      this.updateDailyAvailability();
      this.persistAndRender();

      if (evaluation.outcome === "loss" || evaluation.outcome === "partial") {
        Audio.playLoss();
      } else {
        Audio.playWin(evaluation.outcome);
      }

      await this.ui.playRewardSequence(
        evaluation.outcome,
        this.state.outcomeText,
        this.state.settings.reducedMotion
      );
    } finally {
      this.isSpinning = false;
      this.persistAndRender();
    }
  };

  GameController.prototype.handleBetChange = function handleBetChange(direction) {
    const index = BET_STEPS.indexOf(this.state.bet);
    const nextIndex = clamp(index + direction, 0, BET_STEPS.length - 1);
    this.state.bet = BET_STEPS[nextIndex];

    if (this.state.bet > this.state.balance && this.state.balance >= BET_STEPS[0]) {
      this.state.responsibleMessage = "Current bet is above balance. Lower bet before your next spin.";
    } else if (this.state.bet >= Math.max(75, Math.floor(this.state.balance * 0.25))) {
      const pct = this.state.balance > 0 ? Math.round((this.state.bet / this.state.balance) * 100) : 0;
      this.state.responsibleMessage = `Reminder: this bet is about ${pct}% of your balance.`;
    } else {
      this.refreshResponsibleMessage();
    }

    this.persistAndRender();
  };

  GameController.prototype.handleLossLimitToggle = function handleLossLimitToggle(enabled) {
    this.state.lossLimitEnabled = enabled;
    this.checkLossLimit();
    this.refreshResponsibleMessage();
    this.persistAndRender();
  };

  GameController.prototype.handleLossLimitApply = function handleLossLimitApply(rawValue) {
    const fallback = this.state.lossLimit;
    const parsed = positiveInteger(rawValue, fallback);
    this.state.lossLimit = clamp(parsed, 50, 100000);
    this.checkLossLimit();
    this.refreshResponsibleMessage();
    this.persistAndRender();
  };

  GameController.prototype.handleSoundToggle = function handleSoundToggle(enabled) {
    this.state.settings.soundEnabled = enabled;
    Audio.setEnabled(enabled);
    this.persistAndRender();
  };

  GameController.prototype.handleVolumeChange = function handleVolumeChange(volume) {
    this.state.settings.volume = clamp(volume, 0, 1);
    Audio.setVolume(this.state.settings.volume);
    this.persistAndRender();
  };

  GameController.prototype.handleContrastToggle = function handleContrastToggle(enabled) {
    this.state.settings.highContrast = enabled;
    Accessibility.applySettings(this.state.settings);
    this.persistAndRender();
  };

  GameController.prototype.handleReducedMotionToggle = function handleReducedMotionToggle(enabled) {
    this.state.settings.reducedMotion = enabled;
    Accessibility.applySettings(this.state.settings);
    this.persistAndRender();
  };

  GameController.prototype.handleClaimDaily = function handleClaimDaily() {
    if (!this.state.daily.availableReward) {
      this.state.outcomeText = "Daily reward already claimed today.";
      this.state.outcomeType = "neutral";
      this.persistAndRender();
      return;
    }

    const today = getTodayKey();
    const priorClaim = this.state.daily.lastClaimDate;
    const nextStreak = isYesterday(priorClaim, today) ? this.state.daily.streak + 1 : 1;
    const reward = this.state.daily.availableReward;

    this.state.balance += reward;
    this.state.daily.lastClaimDate = today;
    this.state.daily.streak = nextStreak;
    this.state.daily.availableReward = 0;
    this.state.outcomeText = `Daily reward claimed: +${reward} credits.`;
    this.state.outcomeType = "win";
    this.refreshResponsibleMessage();
    this.persistAndRender();
    Audio.playWin("win");
  };

  GameController.prototype.handleResetSession = function handleResetSession() {
    const accepted = global.confirm("Reset current session stats and balance?");
    if (!accepted) {
      return;
    }

    const preservedSettings = { ...this.state.settings };
    const preservedDaily = { ...this.state.daily };
    this.state = getDefaultState();
    this.state.settings = preservedSettings;
    this.state.daily = preservedDaily;
    this.state.outcomeText = "Session reset. Daily and settings were kept.";
    this.state.outcomeType = "neutral";
    this.checkLossLimit();
    this.applySettingsSideEffects();
    Storage.clear();
    this.persistAndRender();
  };

  GameController.prototype.applyOutcomeMessage = function applyOutcomeMessage(evaluation, loyaltyBonus) {
    const bet = this.state.bet;
    const payout = evaluation.payout;
    const net = payout - bet;
    const matchLabel = evaluation.matchedSymbolId ? this.symbolById[evaluation.matchedSymbolId].label : "";

    if (evaluation.outcome === "loss") {
      this.state.outcomeText = `No payout. Net -${bet} credits this spin.`;
      this.state.outcomeType = "loss";
      if (loyaltyBonus > 0) {
        this.state.outcomeText += ` Loyalty bonus +${loyaltyBonus} credits.`;
        this.state.outcomeType = "win";
      }
      return;
    }

    if (evaluation.outcome === "partial") {
      this.state.outcomeText = `Pair match (${matchLabel}). Returned ${payout} credits, net -${Math.abs(
        net
      )} credits.`;
      this.state.outcomeType = "partial";
      if (loyaltyBonus > 0) {
        this.state.outcomeText += ` Loyalty bonus +${loyaltyBonus} credits.`;
      }
      return;
    }

    const prefix = evaluation.outcome === "jackpot" ? "Legendary Jackpot!" : "Win!";
    this.state.outcomeText = `${prefix} 3 ${matchLabel}s paid ${payout} credits, net +${net} credits.`;
    this.state.outcomeType = "win";
    if (loyaltyBonus > 0) {
      this.state.outcomeText += ` Loyalty tier up bonus +${loyaltyBonus} credits.`;
    }
  };

  GameController.prototype.applyLoyaltyProgress = function applyLoyaltyProgress() {
    this.state.loyaltyPoints += 1;
    const nextGoal = this.state.loyaltyLevel * LOYALTY_POINTS_PER_LEVEL;
    if (this.state.loyaltyPoints < nextGoal) {
      return 0;
    }

    this.state.loyaltyPoints = 0;
    this.state.loyaltyLevel += 1;
    const loyaltyBonus = this.state.loyaltyLevel * 25;
    this.state.balance += loyaltyBonus;
    return loyaltyBonus;
  };

  GameController.prototype.updateDailyAvailability = function updateDailyAvailability() {
    const today = getTodayKey();
    if (this.state.daily.lastClaimDate === today) {
      this.state.daily.availableReward = 0;
      return;
    }

    const projectedStreak = isYesterday(this.state.daily.lastClaimDate, today) ? this.state.daily.streak + 1 : 1;
    this.state.daily.availableReward = computeDailyReward(projectedStreak);
  };

  GameController.prototype.checkLossLimit = function checkLossLimit() {
    const net = this.state.won - this.state.spend;
    const isLimitHit = this.state.lossLimitEnabled && net <= -this.state.lossLimit;
    this.state.pausedByLimit = isLimitHit;
    if (isLimitHit) {
      this.state.responsibleMessage = "Loss limit reached. Session is paused until you reset or adjust limit.";
    }
  };

  GameController.prototype.refreshResponsibleMessage = function refreshResponsibleMessage() {
    if (this.state.pausedByLimit) {
      this.state.responsibleMessage = "Loss limit reached. Session is paused until you reset or adjust limit.";
      return;
    }

    const net = this.state.won - this.state.spend;
    if (this.state.lossLimitEnabled && net <= -(this.state.lossLimit * 0.75)) {
      this.state.responsibleMessage = "You are near your loss limit. Consider a lower bet or a short break.";
      return;
    }

    if (this.state.spins > 0 && this.state.spins % 30 === 0) {
      this.state.responsibleMessage = "30 spins completed. Take a quick check-in before the next run.";
      return;
    }

    if (!this.state.lossLimitEnabled) {
      this.state.responsibleMessage = "Tip: Enable a loss limit to cap downside this session.";
      return;
    }

    this.state.responsibleMessage = "";
  };

  GameController.prototype.applySettingsSideEffects = function applySettingsSideEffects() {
    Accessibility.applySettings(this.state.settings);
    Audio.setEnabled(this.state.settings.soundEnabled);
    Audio.setVolume(this.state.settings.volume);
  };

  GameController.prototype.getViewModel = function getViewModel() {
    const net = this.state.won - this.state.spend;
    const winRate = this.state.spins > 0 ? (this.state.wins / this.state.spins) * 100 : 0;
    const nextGoal = this.state.loyaltyLevel * LOYALTY_POINTS_PER_LEVEL;
    const progressPercent = Math.min(100, Math.round((this.state.loyaltyPoints / nextGoal) * 100));
    const canAffordBet = this.state.balance >= this.state.bet;

    return {
      reelSymbols: this.state.reelSymbolIds.map((id) => this.symbolById[id]),
      balance: this.state.balance,
      bet: this.state.bet,
      spend: this.state.spend,
      won: this.state.won,
      net,
      winRatePercent: winRate.toFixed(1),
      outcomeText: this.state.outcomeText,
      outcomeType: this.state.outcomeType,
      responsibleMessage: this.state.responsibleMessage,
      statusChip: this.state.pausedByLimit
        ? "Paused by loss limit"
        : this.isSpinning
          ? "Spinning..."
          : "Ready to spin",
      spinDisabled: this.isSpinning || this.state.pausedByLimit || !canAffordBet,
      betDecrementDisabled: this.isSpinning || BET_STEPS.indexOf(this.state.bet) <= 0,
      betIncrementDisabled: this.isSpinning || BET_STEPS.indexOf(this.state.bet) >= BET_STEPS.length - 1,
      lossLimitEnabled: this.state.lossLimitEnabled,
      lossLimit: this.state.lossLimit,
      soundEnabled: this.state.settings.soundEnabled,
      volume: this.state.settings.volume,
      highContrast: this.state.settings.highContrast,
      reducedMotion: this.state.settings.reducedMotion,
      dailyAvailable: this.state.daily.availableReward > 0,
      dailyText:
        this.state.daily.availableReward > 0
          ? `Daily reward ready: +${this.state.daily.availableReward} credits (streak ${Math.max(
              1,
              this.state.daily.streak + 1
            )}).`
          : "Daily reward claimed today. Come back tomorrow for your next bonus.",
      loyaltyText: `Loyalty tier ${this.state.loyaltyLevel} | ${this.state.loyaltyPoints}/${nextGoal} spins to next tier`,
      loyaltyProgressPercent: progressPercent
    };
  };

  GameController.prototype.persistAndRender = function persistAndRender() {
    Storage.save(this.state);
    this.ui.render(this.getViewModel());
  };

  function getDefaultState() {
    return {
      balance: 1000,
      bet: BET_STEPS[1],
      spend: 0,
      won: 0,
      spins: 0,
      wins: 0,
      lossLimitEnabled: true,
      lossLimit: 300,
      pausedByLimit: false,
      outcomeText: "Set your bet and spin.",
      outcomeType: "neutral",
      responsibleMessage: "Tip: Enable a loss limit to cap downside this session.",
      reelSymbolIds: ["aditya", "alexis", "daniel"],
      loyaltyLevel: 1,
      loyaltyPoints: 0,
      daily: {
        lastClaimDate: "",
        streak: 0,
        availableReward: 0
      },
      settings: {
        soundEnabled: true,
        volume: 0.6,
        highContrast: false,
        reducedMotion: false
      }
    };
  }

  function normalizeBet(rawBet) {
    const fallback = BET_STEPS[1];
    const numeric = positiveInteger(rawBet, fallback);
    let closest = BET_STEPS[0];
    BET_STEPS.forEach((step) => {
      if (Math.abs(step - numeric) < Math.abs(closest - numeric)) {
        closest = step;
      }
    });
    return closest;
  }

  function normalizeReels(rawIds, fallback) {
    if (!Array.isArray(rawIds) || rawIds.length !== 3) {
      return fallback;
    }

    return rawIds.map((id, index) => {
      const valid = Payouts.SYMBOLS.some((symbol) => symbol.id === id);
      return valid ? id : fallback[index];
    });
  }

  function positiveInteger(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    return Math.round(parsed);
  }

  function computeDailyReward(streak) {
    return Math.min(50 + (Math.max(1, streak) - 1) * 15, 200);
  }

  function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isYesterday(pastDateKey, todayKey) {
    if (!pastDateKey) {
      return false;
    }
    const today = new Date(`${todayKey}T12:00:00`);
    const past = new Date(`${pastDateKey}T12:00:00`);
    const diff = today.getTime() - past.getTime();
    return Math.round(diff / 86400000) === 1;
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  root.Game = {
    GameController
  };
})(window);
