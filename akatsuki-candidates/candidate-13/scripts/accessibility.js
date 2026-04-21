/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

export function applyAccessibility(settings) {
  const root = document.documentElement;
  root.classList.toggle("high-contrast", Boolean(settings.highContrast));
  root.classList.toggle("large-print", Boolean(settings.largePrint));
  root.classList.toggle("reduced-motion", Boolean(settings.reducedMotion));
}

export function setAccessibilityMode(settings, enabled) {
  settings.highContrast = Boolean(enabled);
  settings.largePrint = Boolean(enabled);
}
