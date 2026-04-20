(function attachGameModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  const TIER_LEVELS = [
    { name: "Bronze", minXp: 0 },
    { name: "Silver", minXp: 200 },
    { name: "Gold", minXp: 500 },
    { name: "Platinum", minXp: 900 }
  ];

  function toNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundToCents(value) {
    return Math.round(value * 100) / 100;
  }

  function resolveTierInfo(xp) {
    let currentIndex = 0;

    for (let i = 0; i < TIER_LEVELS.length; i += 1) {
      if (xp >= TIER_LEVELS[i].minXp) {
        currentIndex = i;
      }
    }

    const currentTier = TIER_LEVELS[currentIndex];
    const nextTier = TIER_LEVELS[currentIndex + 1] || null;

    let progressPercent = 100;
    let toNext = 0;

    if (nextTier) {
      const tierSpan = nextTier.minXp - currentTier.minXp;
      const xpIntoTier = xp - currentTier.minXp;
      progressPercent = clamp((xpIntoTier / tierSpan) * 100, 0, 100);
      toNext = Math.max(0, nextTier.minXp - xp);
    }

    return {
      tier: currentTier.name,
      nextTier: nextTier ? nextTier.name : "Top Tier",
      progressPercent: progressPercent,
      xpToNextTier: toNext
    };
  }

  function createGame(initial) {
    const config = initial || {};
    const state = {
      minBet: 1,
      maxBet: 100,
      isSpinning: false,
      isPaused: false,
      pauseReason: "",
      spins: 0,
      wins: 0,
      totalSpend: 0,
      totalReturned: 0,
      netResult: 0,
      xp: 0,
      currentSymbols: [],
      lastOutcome: "Session ready.",
      responsiblePrompt:
        "Set your limits, keep bets comfortable, and take short breaks during longer sessions."
    };

    function applySessionValues(session) {
      const startingBalance = Math.max(10, toNumber(session.startingBalance, 200));
      state.startingBalance = startingBalance;
      state.balance = startingBalance;
      state.budgetCap = Math.max(0, toNumber(session.budgetCap, 250));
      state.lossLimit = Math.max(0, toNumber(session.lossLimit, 100));

      const incomingBet = toNumber(session.currentBet, 5);
      state.currentBet = clamp(incomingBet, state.minBet, Math.min(state.maxBet, state.balance));
    }

    function updateLoyalty() {
      const tierInfo = resolveTierInfo(state.xp);
      state.tier = tierInfo.tier;
      state.nextTier = tierInfo.nextTier;
      state.tierProgressPercent = tierInfo.progressPercent;
      state.xpToNextTier = tierInfo.xpToNextTier;
    }

    function setPrompt(message) {
      state.responsiblePrompt = message;
    }

    function updateLimitPrompt() {
      const budgetRatio = state.budgetCap > 0 ? state.totalSpend / state.budgetCap : 0;
      const lossRatio = state.lossLimit > 0 ? -state.netResult / state.lossLimit : 0;
      const stressRatio = Math.max(budgetRatio, lossRatio);

      if (state.isPaused) {
        setPrompt("Session paused. Review your limits and start a new session when ready.");
        return;
      }

      if (stressRatio >= 0.8) {
        setPrompt("You are close to a session limit. Consider lowering your bet or ending soon.");
        return;
      }

      if (state.spins > 0 && state.spins % 20 === 0) {
        setPrompt("20 spins completed. A short break can help keep decisions clear.");
        return;
      }

      if (state.currentBet > Math.max(1, state.balance * 0.2)) {
        setPrompt("This bet is a large share of your balance. Lower stakes may feel steadier.");
        return;
      }

      setPrompt("Limits are active. You can adjust them anytime in Session Guardrails.");
    }

    function evaluatePauseConditions() {
      if (state.budgetCap > 0 && state.totalSpend >= state.budgetCap) {
        state.isPaused = true;
        state.pauseReason = "Spend budget reached. Start a new session to continue.";
        return;
      }

      if (state.lossLimit > 0 && -state.netResult >= state.lossLimit) {
        state.isPaused = true;
        state.pauseReason = "Loss limit reached. Session is paused for your plan.";
        return;
      }

      if (state.balance < state.minBet) {
        state.isPaused = true;
        state.pauseReason = "Balance is below minimum bet. Start a new session to continue.";
        return;
      }

      state.pauseReason = "";
    }

    function resetProgress() {
      state.isPaused = false;
      state.pauseReason = "";
      state.isSpinning = false;
      state.spins = 0;
      state.wins = 0;
      state.totalSpend = 0;
      state.totalReturned = 0;
      state.netResult = 0;
      state.xp = 0;
      state.currentSymbols = [];
      state.lastOutcome = "Session ready.";
      updateLoyalty();
      updateLimitPrompt();
    }

    function getCanSpin() {
      if (state.isSpinning) {
        return { ok: false, reason: "Reels are spinning." };
      }
      if (state.isPaused) {
        return { ok: false, reason: state.pauseReason || "Session paused." };
      }
      if (state.balance < state.currentBet) {
        return { ok: false, reason: "Not enough balance for this bet." };
      }
      return { ok: true, reason: "" };
    }

    function setBet(newBet) {
      const bounded = clamp(toNumber(newBet, state.currentBet), state.minBet, state.maxBet);
      state.currentBet = Math.min(bounded, Math.max(state.minBet, Math.floor(state.balance)));
      updateLimitPrompt();
    }

    function adjustBet(delta) {
      setBet(state.currentBet + delta);
    }

    function setSpinning(isSpinning) {
      state.isSpinning = isSpinning;
    }

    function applyOutcome(params) {
      const outcome = params.outcome;
      const symbols = params.symbols;
      const bet = state.currentBet;

      state.totalSpend = roundToCents(state.totalSpend + bet);
      state.totalReturned = roundToCents(state.totalReturned + outcome.payout);
      state.netResult = roundToCents(state.totalReturned - state.totalSpend);
      state.balance = roundToCents(state.balance + outcome.payout - bet);
      state.spins += 1;
      state.currentSymbols = symbols.slice();

      if (outcome.payout > 0) {
        state.wins += 1;
      }

      state.xp += outcome.payout > 0 ? 15 : 5;
      updateLoyalty();
      evaluatePauseConditions();
      updateLimitPrompt();

      const netChange = roundToCents(outcome.payout - bet);
      return {
        bet: bet,
        payout: outcome.payout,
        netChange: netChange,
        isPaused: state.isPaused,
        pauseReason: state.pauseReason
      };
    }

    function updateSessionSettings(settings) {
      state.budgetCap = Math.max(0, toNumber(settings.budgetCap, state.budgetCap));
      state.lossLimit = Math.max(0, toNumber(settings.lossLimit, state.lossLimit));
      state.currentBet = clamp(
        toNumber(settings.currentBet, state.currentBet),
        state.minBet,
        Math.max(state.minBet, Math.min(state.maxBet, state.balance))
      );

      state.isPaused = false;
      state.pauseReason = "";
      evaluatePauseConditions();
      updateLimitPrompt();
    }

    function startNewSession(settings) {
      applySessionValues(settings);
      resetProgress();
    }

    function getState() {
      const canSpin = getCanSpin();
      return {
        minBet: state.minBet,
        maxBet: state.maxBet,
        currentBet: state.currentBet,
        startingBalance: state.startingBalance,
        balance: state.balance,
        budgetCap: state.budgetCap,
        lossLimit: state.lossLimit,
        isSpinning: state.isSpinning,
        isPaused: state.isPaused,
        pauseReason: state.pauseReason,
        canSpin: canSpin.ok,
        canSpinReason: canSpin.reason,
        spins: state.spins,
        wins: state.wins,
        totalSpend: state.totalSpend,
        totalReturned: state.totalReturned,
        netResult: state.netResult,
        xp: state.xp,
        tier: state.tier,
        nextTier: state.nextTier,
        tierProgressPercent: state.tierProgressPercent,
        xpToNextTier: state.xpToNextTier,
        currentSymbols: state.currentSymbols.slice(),
        responsiblePrompt: state.responsiblePrompt,
        lastOutcome: state.lastOutcome
      };
    }

    startNewSession({
      startingBalance: config.startingBalance,
      budgetCap: config.budgetCap,
      lossLimit: config.lossLimit,
      currentBet: config.currentBet
    });

    return {
      getState: getState,
      setBet: setBet,
      adjustBet: adjustBet,
      setSpinning: setSpinning,
      getCanSpin: getCanSpin,
      applyOutcome: applyOutcome,
      updateSessionSettings: updateSessionSettings,
      startNewSession: startNewSession
    };
  }

  SlotApp.Game = {
    createGame: createGame
  };
})(window);
