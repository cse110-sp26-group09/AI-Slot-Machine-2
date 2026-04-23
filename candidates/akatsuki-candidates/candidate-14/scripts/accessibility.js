const HIGH_CONTRAST_CLASS = "high-contrast";
const LARGE_TEXT_CLASS = "large-text";

/**
 * Apply accessibility display modes to the page root.
 * @param {HTMLElement} root
 * @param {{highContrast: boolean, largeText: boolean}} settings
 */
export function applyAccessibility(root, settings) {
  if (!root || !settings) {
    return;
  }
  root.classList.toggle(HIGH_CONTRAST_CLASS, Boolean(settings.highContrast));
  root.classList.toggle(LARGE_TEXT_CLASS, Boolean(settings.largeText));
}

