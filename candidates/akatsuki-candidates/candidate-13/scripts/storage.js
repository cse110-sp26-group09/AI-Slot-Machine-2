/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

const STORAGE_KEY = "inference-jackpot-session-v1";

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.state) {
      return null;
    }
    return parsed.state;
  } catch (error) {
    console.warn("Failed to load saved session:", error);
    return null;
  }
}

export function saveSession(state) {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    state
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
