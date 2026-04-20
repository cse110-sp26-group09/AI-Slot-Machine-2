/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

(function attachStorageModule(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});
  const STORAGE_KEY = "prompt-palace-slot-session-v1";

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clear() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  root.Storage = {
    load,
    save,
    clear
  };
})(window);
