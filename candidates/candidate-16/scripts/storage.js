const STORAGE_KEY = "prompt-palace-slots-v1";

/**
 * Persistence wrapper around localStorage.
 * Keeps browser interaction isolated from game logic.
 */
export function createStorage(key = STORAGE_KEY) {
  return {
    loadState() {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn("Unable to load saved slot state.", error);
        return null;
      }
    },

    saveState(state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn("Unable to save slot state.", error);
      }
    },

    clearState() {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn("Unable to clear slot state.", error);
      }
    },
  };
}
