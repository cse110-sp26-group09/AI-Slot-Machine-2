const STORAGE_KEY = "ai-slot-a11y-v1";

const DEFAULT_SETTINGS = Object.freeze({
  highContrast: false,
  largePrint: false,
  reducedMotion: false
});

function loadSavedSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw);

    return {
      highContrast: Boolean(parsed.highContrast),
      largePrint: Boolean(parsed.largePrint),
      reducedMotion: Boolean(parsed.reducedMotion)
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyToDocument(settings, root) {
  root.classList.toggle("theme-high-contrast", settings.highContrast);
  root.classList.toggle("theme-large-print", settings.largePrint);
  root.classList.toggle("reduce-motion", settings.reducedMotion);
}

export function createAccessibilityController(root = document.body) {
  let settings = loadSavedSettings();
  applyToDocument(settings, root);

  function setSetting(key, enabled) {
    settings = {
      ...settings,
      [key]: Boolean(enabled)
    };

    applyToDocument(settings, root);
    saveSettings(settings);

    return { ...settings };
  }

  function getSettings() {
    return { ...settings };
  }

  return {
    getSettings,
    setSetting
  };
}
