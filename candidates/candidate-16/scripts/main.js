/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { createAccessibilityController } from "./accessibility.js";
import { createAudioController } from "./audio.js";
import { createGameController } from "./game.js";
import { createStorage } from "./storage.js";
import { createUI } from "./ui.js";

const AGE_GATE_MAX_BIRTHDATE = new Date(2005, 3, 22);

function bootstrap() {
  const storage = createStorage();
  const ui = createUI();
  const audio = createAudioController();
  const accessibility = createAccessibilityController();

  const game = createGameController({
    ui,
    audio,
    storage,
    accessibility,
  });

  game.init();
  wireScreenFlow({ ui, audio });

  // Unlock media in case the user starts with keyboard or pointer navigation.
  window.addEventListener("pointerdown", () => audio.unlockByGesture(), { once: true });
  window.addEventListener("keydown", () => audio.unlockByGesture(), { once: true });
}

/**
 * @param {{
 * ui: ReturnType<import("./ui.js").createUI>,
 * audio: ReturnType<import("./audio.js").createAudioController>
 * }} dependencies
 */
function wireScreenFlow({ ui, audio }) {
  ui.setActiveScreen("entry");
  ui.setAgeGateMessage("Verification required before entering gameplay.", "info");

  ui.bindFlowControls({
    onAnyInteraction() {
      audio.unlockByGesture();
    },
    onPlay() {
      ui.setActiveScreen("age");
      ui.focusBirthDateInput();
    },
    onBackToEntry() {
      ui.clearBirthDateInput();
      ui.setAgeGateMessage("Verification required before entering gameplay.", "info");
      ui.setActiveScreen("entry");
    },
    onSubmitAgeGate(value) {
      const validation = validateBirthDate(value);
      ui.setAgeGateMessage(validation.message, validation.tone);

      if (!validation.valid) {
        return;
      }

      ui.setActiveScreen("gameplay");
      audio.startBgm();
      audio.playWelcome();
    },
  });
}

/**
 * @param {string} value
 * @returns {{valid: boolean, message: string, tone: "info" | "warn" | "loss" | "win"}}
 */
function validateBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return {
      valid: false,
      tone: "warn",
      message: "Use MM/DD/YYYY format for date of birth.",
    };
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  const parsedDate = new Date(year, month - 1, day);
  const validDate =
    parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day;

  if (!validDate) {
    return {
      valid: false,
      tone: "warn",
      message: "The provided date is not a valid calendar date.",
    };
  }

  if (parsedDate > AGE_GATE_MAX_BIRTHDATE) {
    return {
      valid: false,
      tone: "loss",
      message:
        "Access denied: you must be at least 21 years old to enter. The latest eligible birth date is 04/22/2005.",
    };
  }

  return {
    valid: true,
    tone: "win",
    message: "Age verification complete. Access granted.",
  };
}

window.addEventListener("DOMContentLoaded", bootstrap);
