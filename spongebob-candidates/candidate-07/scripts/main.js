/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

import { AccessibilityController } from './accessibility.js';
import { AudioController } from './audio.js';
import { SlotGame } from './game.js';
import { initializeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new SlotGame({
    initialBalance: 200,
    initialBet: 5,
    minBet: 1,
    maxBet: 100
  });

  const audio = new AudioController();
  const accessibility = new AccessibilityController();

  initializeUI({ game, audio, accessibility });
});
