/**
 * @fileoverview Client-side slot machine module bootstrap.
 */

(function bootstrapApp(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const LEGAL_MAX_BIRTHDATE = new Date("2005-04-22T23:59:59");

  global.document.addEventListener("DOMContentLoaded", () => {
    const ui = root.UI.createUI();
    const game = new root.Game.GameController(ui);
    game.init();

    ui.setFlowHandlers({
      onPlay: () => {
        root.Audio.startBackgroundMusic();
        ui.showScreen("ageGate");
        ui.showAgeGateMessage("", "neutral");
        ui.focusAgeInput();
      },
      onSubmitAge: (dobValue) => {
        const result = validateDobInput(dobValue);
        if (!result.valid) {
          ui.showAgeGateMessage(result.message, "bad");
          return;
        }

        const isEligible = result.birthDate.getTime() <= LEGAL_MAX_BIRTHDATE.getTime();
        if (!isEligible) {
          ui.showAgeGateMessage(
            result.message || "Entry denied. You must be 21+ to access this game.",
            "bad"
          );
          return;
        }

        ui.showAgeGateMessage("Verification successful. Entering the game...", "good");
        root.Audio.playWelcome();
        global.setTimeout(() => {
          ui.showScreen("gameplay");
        }, 420);
      },
      onOpenInfo: () => {
        ui.showInfoModal(true);
      },
      onCloseInfo: () => {
        ui.showInfoModal(false);
      },
      onLeverPull: () => {
        ui.triggerLeverPull();
      },
      onMainMenu: () => {
        ui.showInfoModal(false);
        ui.showScreen("intro");
      }
    });

    ui.showScreen("intro");
    ui.showInfoModal(false);
  });

  function validateDobInput(rawInput) {
    const value = String(rawInput || "").trim();
    const pattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;
    const matched = value.match(pattern);
    if (!matched) {
      return {
        valid: false,
        message: "Please enter date of birth in MM/DD/YYYY format."
      };
    }

    const month = Number(matched[1]);
    const day = Number(matched[2]);
    const year = Number(matched[3]);

    const birthDate = new Date(year, month - 1, day, 12, 0, 0);
    const validDate =
      birthDate.getFullYear() === year &&
      birthDate.getMonth() === month - 1 &&
      birthDate.getDate() === day;

    if (!validDate) {
      return {
        valid: false,
        message: "Please enter a real calendar date."
      };
    }

    if (birthDate.getTime() > LEGAL_MAX_BIRTHDATE.getTime()) {
      return {
        valid: true,
        birthDate,
        message: "Entry denied. You must be born on or before 04/22/2005."
      };
    }

    return {
      valid: true,
      birthDate
    };
  }
})(window);
