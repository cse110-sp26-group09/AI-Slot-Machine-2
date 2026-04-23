/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachAccessibilityModule(global) {
  const SlotApp = (global.SlotApp = global.SlotApp || {});

  const STORAGE_KEY = "slot_a11y_preferences_v1";

  function readPreferences() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { highContrast: false, largePrint: false, reducedMotion: false };
      }
      const parsed = JSON.parse(raw);
      return {
        highContrast: Boolean(parsed.highContrast),
        largePrint: Boolean(parsed.largePrint),
        reducedMotion: Boolean(parsed.reducedMotion)
      };
    } catch (error) {
      return { highContrast: false, largePrint: false, reducedMotion: false };
    }
  }

  function createController() {
    let preferences = readPreferences();

    function save() {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        // Local storage may be blocked; continue without persistence.
      }
    }

    function applyBodyClasses() {
      const body = global.document.body;
      body.classList.toggle("a11y-high-contrast", preferences.highContrast);
      body.classList.toggle("a11y-large-print", preferences.largePrint);
      body.classList.toggle("a11y-reduced-motion", preferences.reducedMotion);
    }

    function init(inputs, onChange) {
      const highContrastInput = inputs.highContrastInput;
      const largePrintInput = inputs.largePrintInput;
      const reducedMotionInput = inputs.reducedMotionInput;

      highContrastInput.checked = preferences.highContrast;
      largePrintInput.checked = preferences.largePrint;
      reducedMotionInput.checked = preferences.reducedMotion;

      function commitFromForm() {
        preferences = {
          highContrast: Boolean(highContrastInput.checked),
          largePrint: Boolean(largePrintInput.checked),
          reducedMotion: Boolean(reducedMotionInput.checked)
        };

        applyBodyClasses();
        save();

        if (onChange) {
          onChange(getPreferences());
        }
      }

      highContrastInput.addEventListener("change", commitFromForm);
      largePrintInput.addEventListener("change", commitFromForm);
      reducedMotionInput.addEventListener("change", commitFromForm);

      applyBodyClasses();
      if (onChange) {
        onChange(getPreferences());
      }
    }

    function getPreferences() {
      return {
        highContrast: preferences.highContrast,
        largePrint: preferences.largePrint,
        reducedMotion: preferences.reducedMotion
      };
    }

    return {
      init: init,
      getPreferences: getPreferences
    };
  }

  SlotApp.Accessibility = {
    createController: createController
  };
})(window);
