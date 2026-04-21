(function attachUiModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  function createUI() {
    const elements = getElements();
    const handlers = {};
    const flowHandlers = {};

    bindStaticHandlers(elements, handlers, flowHandlers);

    function setHandlers(nextHandlers) {
      Object.assign(handlers, nextHandlers);
    }

    function setFlowHandlers(nextHandlers) {
      Object.assign(flowHandlers, nextHandlers);
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
      elements.leverBtn.disabled = viewModel.spinDisabled;
      elements.decreaseBetBtn.disabled = viewModel.betDecrementDisabled;
      elements.increaseBetBtn.disabled = viewModel.betIncrementDisabled;
      elements.lossLimitToggle.checked = viewModel.lossLimitEnabled;
      elements.lossLimitInput.value = String(viewModel.lossLimit);
      elements.soundToggle.checked = viewModel.soundEnabled;
      elements.volumeRange.value = String(Math.round(viewModel.volume * 100));
      elements.entrySoundToggle.checked = viewModel.soundEnabled;
      elements.entryVolumeRange.value = String(Math.round(viewModel.volume * 100));
      elements.contrastToggle.checked = viewModel.highContrast;
      elements.motionToggle.checked = viewModel.reducedMotion;
      elements.dailyRewardText.textContent = viewModel.dailyText;
      elements.claimDailyBtn.disabled = !viewModel.dailyAvailable;
      elements.loyaltyText.textContent = viewModel.loyaltyText;
      elements.loyaltyProgress.style.width = `${viewModel.loyaltyProgressPercent}%`;
    }

    function renderPaytable(symbols, metrics) {
      renderPaytableRows(elements.paytableBody, symbols);
      renderPaytableRows(elements.infoPaytableBody, symbols);

      elements.rtpText.textContent =
        `Theoretical RTP: ${(metrics.rtp * 100).toFixed(1)}% | ` +
        `Hit rate: ${(metrics.winRate * 100).toFixed(1)}%.` +
        " Short sessions vary from long-run averages.";
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

        return wait(180).then(() => {
          finishSpinAnimation();
        });
      }

      const reelPromises = reelPlans.map((plan, reelIndex) => {
        return new Promise((resolve) => {
          let frameIndex = 0;
          elements.reels[reelIndex].classList.add("is-rolling");
          const interval = global.setInterval(() => {
            const frame = plan.frames[frameIndex % plan.frames.length];
            setReel(elements.reels[reelIndex], frame);
            frameIndex += 1;
            if (typeof onTick === "function") {
              onTick(reelIndex);
            }
          }, 84);

          global.setTimeout(() => {
            global.clearInterval(interval);
            elements.reels[reelIndex].classList.remove("is-rolling");
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

    function playRewardSequence(outcome, outcomeText, reducedMotion) {
      if (outcome !== "big-win" && outcome !== "jackpot") {
        return Promise.resolve();
      }

      const isJackpot = outcome === "jackpot";
      elements.majorWinOverlay.classList.add("show");
      elements.majorWinOverlay.classList.toggle("jackpot", isJackpot);
      elements.majorWinOverlay.classList.toggle("big-win", !isJackpot);
      elements.majorWinOverlay.setAttribute("aria-hidden", "false");
      elements.majorWinTitle.textContent = isJackpot ? "AKATSUKI JACKPOT" : "AKATSUKI MAJOR WIN";
      elements.majorWinText.textContent = outcomeText || "Claimed a major payout.";

      const holdMs = reducedMotion ? 850 : 1700;
      return wait(holdMs).then(() => {
        elements.majorWinOverlay.classList.remove("show", "jackpot", "big-win");
        elements.majorWinOverlay.setAttribute("aria-hidden", "true");
      });
    }

    function triggerLeverPull() {
      elements.machine.classList.add("lever-pull");
      wait(250).then(() => {
        elements.machine.classList.remove("lever-pull");
      });
    }

    function showScreen(screenKey) {
      const screens = Object.values(elements.screens);
      screens.forEach((screen) => {
        if (screen) {
          screen.classList.remove("is-active");
        }
      });

      const body = global.document.body;
      body.classList.remove("screen-intro", "screen-age-gate", "screen-gameplay");

      if (screenKey === "ageGate") {
        elements.screens.ageGate.classList.add("is-active");
        body.classList.add("screen-age-gate");
        return;
      }

      if (screenKey === "gameplay") {
        elements.screens.gameplay.classList.add("is-active");
        body.classList.add("screen-gameplay");
        return;
      }

      elements.screens.intro.classList.add("is-active");
      body.classList.add("screen-intro");
    }

    function showInfoModal(open) {
      elements.infoModal.classList.toggle("open", Boolean(open));
      elements.infoModal.setAttribute("aria-hidden", open ? "false" : "true");
    }

    function showAgeGateMessage(text, tone) {
      elements.ageGateMessage.textContent = text;
      elements.ageGateMessage.className = "age-message";
      if (tone === "bad") {
        elements.ageGateMessage.classList.add("is-bad");
      }
      if (tone === "good") {
        elements.ageGateMessage.classList.add("is-good");
      }
    }

    function focusAgeInput() {
      elements.dobInput.focus();
    }

    function finishSpinAnimation() {
      elements.machine.classList.remove("spinning");
      elements.machine.classList.remove("anticipation");
    }

    return {
      setHandlers,
      setFlowHandlers,
      render,
      renderPaytable,
      animateSpin,
      playRewardSequence,
      triggerLeverPull,
      showScreen,
      showInfoModal,
      showAgeGateMessage,
      focusAgeInput
    };
  }

  function getElements() {
    return {
      screens: {
        intro: byId("introScreen"),
        ageGate: byId("ageGateScreen"),
        gameplay: byId("gameplayScreen")
      },
      introInfoBtn: byId("introInfoBtn"),
      headerInfoBtn: byId("headerInfoBtn"),
      closeInfoBtn: byId("closeInfoBtn"),
      infoBackdrop: byId("infoBackdrop"),
      infoModal: byId("infoModal"),
      playBtn: byId("playBtn"),
      ageGateForm: byId("ageGateForm"),
      dobInput: byId("dobInput"),
      ageGateMessage: byId("ageGateMessage"),
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
      infoPaytableBody: global.document.querySelector("#infoPaytableBody tbody"),
      rtpText: byId("rtpText"),
      decreaseBetBtn: byId("decreaseBetBtn"),
      increaseBetBtn: byId("increaseBetBtn"),
      spinBtn: byId("spinBtn"),
      leverBtn: byId("leverBtn"),
      contrastToggle: byId("contrastToggle"),
      motionToggle: byId("motionToggle"),
      soundToggle: byId("soundToggle"),
      volumeRange: byId("volumeRange"),
      entrySoundToggle: byId("entrySoundToggle"),
      entryVolumeRange: byId("entryVolumeRange"),
      lossLimitToggle: byId("lossLimitToggle"),
      lossLimitInput: byId("lossLimitInput"),
      applyLossLimitBtn: byId("applyLossLimitBtn"),
      dailyRewardText: byId("dailyRewardText"),
      claimDailyBtn: byId("claimDailyBtn"),
      loyaltyText: byId("loyaltyText"),
      loyaltyProgress: byId("loyaltyProgress"),
      resetSessionBtn: byId("resetSessionBtn"),
      majorWinOverlay: byId("majorWinOverlay"),
      majorWinTitle: byId("majorWinTitle"),
      majorWinText: byId("majorWinText")
    };
  }

  function byId(id, optional) {
    const element = global.document.getElementById(id);
    if (!element && !optional) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }

  function bindStaticHandlers(elements, handlers, flowHandlers) {
    elements.spinBtn.addEventListener("click", () => {
      if (handlers.onSpin) {
        handlers.onSpin();
      }
    });

    elements.leverBtn.addEventListener("click", () => {
      if (typeof flowHandlers.onLeverPull === "function") {
        flowHandlers.onLeverPull();
      }
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

    const bindSoundToggle = (element) => {
      element.addEventListener("change", (event) => {
        if (handlers.onToggleSound) {
          handlers.onToggleSound(event.target.checked);
        }
      });
    };
    bindSoundToggle(elements.soundToggle);
    bindSoundToggle(elements.entrySoundToggle);

    const bindVolumeRange = (element) => {
      element.addEventListener("input", (event) => {
        if (handlers.onSetVolume) {
          handlers.onSetVolume(Number(event.target.value) / 100);
        }
      });
    };
    bindVolumeRange(elements.volumeRange);
    bindVolumeRange(elements.entryVolumeRange);

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

    elements.playBtn.addEventListener("click", () => {
      if (flowHandlers.onPlay) {
        flowHandlers.onPlay();
      }
    });

    elements.introInfoBtn.addEventListener("click", () => {
      if (flowHandlers.onOpenInfo) {
        flowHandlers.onOpenInfo();
      }
    });

    elements.headerInfoBtn.addEventListener("click", () => {
      if (flowHandlers.onOpenInfo) {
        flowHandlers.onOpenInfo();
      }
    });

    elements.closeInfoBtn.addEventListener("click", () => {
      if (flowHandlers.onCloseInfo) {
        flowHandlers.onCloseInfo();
      }
    });

    elements.infoBackdrop.addEventListener("click", () => {
      if (flowHandlers.onCloseInfo) {
        flowHandlers.onCloseInfo();
      }
    });

    elements.ageGateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (flowHandlers.onSubmitAge) {
        flowHandlers.onSubmitAge(elements.dobInput.value.trim());
      }
    });

    global.document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && flowHandlers.onCloseInfo) {
        flowHandlers.onCloseInfo();
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

    icon.innerHTML = "";
    if (symbol.image) {
      const image = global.document.createElement("img");
      image.src = symbol.image;
      image.alt = symbol.label;
      icon.appendChild(image);
    } else {
      icon.textContent = symbol.icon || symbol.label || "";
    }
    label.textContent = symbol.label;
  }

  function renderPaytableRows(container, symbols) {
    if (!container) {
      return;
    }

    container.innerHTML = "";
    symbols.forEach((symbol) => {
      const row = global.document.createElement("tr");
      const symbolCell = global.document.createElement("td");
      const payoutCell = global.document.createElement("td");
      const wrap = global.document.createElement("span");
      wrap.className = "pay-symbol";

      if (symbol.image) {
        const image = global.document.createElement("img");
        image.src = symbol.image;
        image.alt = symbol.label;
        wrap.appendChild(image);
      }

      const name = global.document.createElement("span");
      name.textContent = symbol.label;
      wrap.appendChild(name);
      symbolCell.appendChild(wrap);
      payoutCell.textContent = `x${symbol.tripleMultiplier}`;

      row.appendChild(symbolCell);
      row.appendChild(payoutCell);
      container.appendChild(row);
    });
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
