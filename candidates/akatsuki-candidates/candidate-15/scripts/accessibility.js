/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachAccessibilityModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  function applySettings(settings) {
    const body = global.document.body;
    toggleClass(body, "a11y-high-contrast", Boolean(settings.highContrast));
    toggleClass(body, "a11y-large-text", Boolean(settings.highContrast));
    toggleClass(body, "reduced-motion", Boolean(settings.reducedMotion));
  }

  function toggleClass(element, className, enabled) {
    if (enabled) {
      element.classList.add(className);
      return;
    }
    element.classList.remove(className);
  }

  root.Accessibility = {
    applySettings
  };
})(window);
