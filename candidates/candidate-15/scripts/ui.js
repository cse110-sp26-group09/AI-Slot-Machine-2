(function attachUiModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  function createUI() {
    const elements = getElements();
    const handlers = {};

    bindStaticHandlers(elements, handlers);

    function setHandlers(nextHandlers) {
      Object.assign(handlers, nextHandlers);
    }

    function render(viewModel) {
      renderReels(elements.reels, viewModel.reelSymbols);
      elements.balanceValue.textContent = formatTokens(viewModel.balance);
      elements.betValue.textContent = formatTokens(viewModel.bet);
      elements.spendValue.textContent = formatTokens(viewModel.spend);
      elements.wonValue.textContent = formatTokens(viewModel.won);
      elements.netValue.textContent = formatSignedTokens(viewModel.net);
      elements.netValue.className = classForNet(viewModel.net, "summary-value");
      elements.winRateValue.textContent = `${viewModel.winRatePercent}%`;
      elements.outcomeText.textContent = viewModel.outcomeText;
      elements.outcomeText.className = classForOutcome(viewModel.outcomeType);
      elements.responsibleText.textContent = viewModel.responsibleMessage;
      elements.statusChip.textContent = viewModel.statusChip;
      elements.spinBtn.disabled = viewModel.spinDisabled;
      elements.decreaseBetBtn.disabled = viewModel.betDecrementDisabled;
      elements.increaseBetBtn.disabled = viewModel.betIncrementDisabled;
      elements.lossLimitToggle.checked = viewModel.lossLimitEnabled;
      elements.lossLimitInput.value = String(viewModel.lossLimit);
      elements.soundToggle.checked = viewModel.soundEnabled;
      elements.volumeRange.value = String(Math.round(viewModel.volume * 100));
      elements.contrastToggle.checked = viewModel.highContrast;
      elements.motionToggle.checked = viewModel.reducedMotion;
      elements.dailyRewardText.textContent = viewModel.dailyText;
      elements.claimDailyBtn.disabled = !viewModel.dailyAvailable;
      elements.loyaltyText.textContent = viewModel.loyaltyText;
      elements.loyaltyProgress.style.width = `${viewModel.loyaltyProgressPercent}%`;
    }

    function renderPaytable(symbols, metrics) {
      elements.paytableBody.innerHTML = "";
      symbols.forEach((symbol) => {
        const row = global.document.createElement("tr");
        row.innerHTML = `<td>${symbol.icon} ${symbol.label}</td><td>x${symbol.tripleMultiplier}</td>`;
        elements.paytableBody.appendChild(row);
      });

      elements.rtpText.textContent =
        `Theoretical RTP: ${(metrics.rtp * 100).toFixed(1)}% | ` +
        `Hit rate: ${(metrics.winRate * 100).toFixed(1)}%.` +
        ` Long runs trend toward this; short sessions vary.`;
    }

    /**
     * Animates a spin and resolves when all reels stop.
     * @param {{reelPlans:Object[],anticipation:boolean}} spinData
     * @param {{reducedMotion:boolean,onTick:function,onReelStop:function,onAnticipation:function}} options
     * @returns {Promise<void>}
     */
    function animateSpin(spinData, options) {
      const { reelPlans, anticipation } = spinData;
      const { reducedMotion, onTick, onReelStop, onAnticipation } = options;

      elements.machine.classList.add("spinning");
      if (anticipation && !reducedMotion) {
        elements.machine.classList.add("anticipation");
        if (typeof onAnticipation === "function") {
          onAnticipation();
        }
      }

      if (reducedMotion) {
        reelPlans.forEach((plan, index) => {
          setReel(elements.reels[index], plan.final);
        });

        return wait(160).then(() => {
          finishSpinAnimation();
        });
      }

      const reelPromises = reelPlans.map((plan, reelIndex) => {
        return new Promise((resolve) => {
          let frameIndex = 0;
          const interval = global.setInterval(() => {
            const frame = plan.frames[frameIndex % plan.frames.length];
            setReel(elements.reels[reelIndex], frame);
            frameIndex += 1;
            if (typeof onTick === "function") {
              onTick(reelIndex);
            }
          }, 82);

          global.setTimeout(() => {
            global.clearInterval(interval);
            setReel(elements.reels[reelIndex], plan.final);
            if (typeof onReelStop === "function") {
              onReelStop(reelIndex);
            }
            resolve();
          }, plan.stopDelayMs);
        });
      });

      return Promise.all(reelPromises).then(() => {
        finishSpinAnimation();
      });
    }

    function finishSpinAnimation() {
      elements.machine.classList.remove("spinning");
      elements.machine.classList.remove("anticipation");
    }

    return {
      setHandlers,
      render,
      renderPaytable,
      animateSpin
    };
  }

  function getElements() {
    return {
      machine: byId("machineRoot", true) || global.document.querySelector(".machine"),
      reels: [byId("reel0"), byId("reel1"), byId("reel2")],
      balanceValue: byId("balanceValue"),
      betValue: byId("betValue"),
      spendValue: byId("spendValue"),
      wonValue: byId("wonValue"),
      netValue: byId("netValue"),
      winRateValue: byId("winRateValue"),
      statusChip: byId("statusChip"),
      outcomeText: byId("outcomeText"),
      responsibleText: byId("responsibleText"),
      paytableBody: global.document.querySelector("#paytableBody tbody"),
      rtpText: byId("rtpText"),
      decreaseBetBtn: byId("decreaseBetBtn"),
      increaseBetBtn: byId("increaseBetBtn"),
      spinBtn: byId("spinBtn"),
      contrastToggle: byId("contrastToggle"),
      motionToggle: byId("motionToggle"),
      soundToggle: byId("soundToggle"),
      volumeRange: byId("volumeRange"),
      lossLimitToggle: byId("lossLimitToggle"),
      lossLimitInput: byId("lossLimitInput"),
      applyLossLimitBtn: byId("applyLossLimitBtn"),
      dailyRewardText: byId("dailyRewardText"),
      claimDailyBtn: byId("claimDailyBtn"),
      loyaltyText: byId("loyaltyText"),
      loyaltyProgress: byId("loyaltyProgress"),
      resetSessionBtn: byId("resetSessionBtn")
    };
  }

  function byId(id, optional) {
    const element = global.document.getElementById(id);
    if (!element && !optional) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }

  function bindStaticHandlers(elements, handlers) {
    elements.spinBtn.addEventListener("click", () => {
      if (handlers.onSpin) {
        handlers.onSpin();
      }
    });

    elements.decreaseBetBtn.addEventListener("click", () => {
      if (handlers.onChangeBet) {
        handlers.onChangeBet(-1);
      }
    });

    elements.increaseBetBtn.addEventListener("click", () => {
      if (handlers.onChangeBet) {
        handlers.onChangeBet(1);
      }
    });

    elements.lossLimitToggle.addEventListener("change", (event) => {
      if (handlers.onToggleLossLimit) {
        handlers.onToggleLossLimit(event.target.checked);
      }
    });

    elements.applyLossLimitBtn.addEventListener("click", () => {
      if (handlers.onApplyLossLimit) {
        handlers.onApplyLossLimit(parseInt(elements.lossLimitInput.value, 10));
      }
    });

    elements.soundToggle.addEventListener("change", (event) => {
      if (handlers.onToggleSound) {
        handlers.onToggleSound(event.target.checked);
      }
    });

    elements.volumeRange.addEventListener("input", (event) => {
      if (handlers.onSetVolume) {
        handlers.onSetVolume(Number(event.target.value) / 100);
      }
    });

    elements.contrastToggle.addEventListener("change", (event) => {
      if (handlers.onToggleContrast) {
        handlers.onToggleContrast(event.target.checked);
      }
    });

    elements.motionToggle.addEventListener("change", (event) => {
      if (handlers.onToggleReducedMotion) {
        handlers.onToggleReducedMotion(event.target.checked);
      }
    });

    elements.claimDailyBtn.addEventListener("click", () => {
      if (handlers.onClaimDaily) {
        handlers.onClaimDaily();
      }
    });

    elements.resetSessionBtn.addEventListener("click", () => {
      if (handlers.onResetSession) {
        handlers.onResetSession();
      }
    });
  }

  function renderReels(reelElements, reelSymbols) {
    reelSymbols.forEach((symbol, index) => {
      setReel(reelElements[index], symbol);
    });
  }

  function setReel(reelElement, symbol) {
    if (!reelElement || !symbol) {
      return;
    }
    const icon = reelElement.querySelector(".reel-icon");
    const label = reelElement.querySelector(".reel-label");
    icon.textContent = symbol.icon;
    label.textContent = symbol.label;
  }

  function formatTokens(value) {
    return `${Number(value).toLocaleString()} credits`;
  }

  function formatSignedTokens(value) {
    const amount = Math.abs(value).toLocaleString();
    return `${value >= 0 ? "+" : "-"}${amount} credits`;
  }

  function classForNet(value, baseClass) {
    const tone = value > 0 ? "is-good" : value < 0 ? "is-bad" : "is-neutral";
    return `${baseClass} ${tone}`;
  }

  function classForOutcome(outcomeType) {
    if (outcomeType === "loss") {
      return "outcome is-bad";
    }
    if (outcomeType === "partial") {
      return "outcome is-neutral";
    }
    if (outcomeType === "win") {
      return "outcome is-good";
    }
    return "outcome is-neutral";
  }

  function wait(ms) {
    return new Promise((resolve) => {
      global.setTimeout(resolve, ms);
    });
  }

  root.UI = {
    createUI
  };
})(window);
