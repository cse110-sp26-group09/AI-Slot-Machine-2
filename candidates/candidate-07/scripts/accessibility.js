const STORAGE_KEY = 'prompt-palace-accessibility';

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        highContrast: false,
        largePrint: false
      };
    }

    const parsed = JSON.parse(raw);
    return {
      highContrast: Boolean(parsed.highContrast),
      largePrint: Boolean(parsed.largePrint)
    };
  } catch {
    return {
      highContrast: false,
      largePrint: false
    };
  }
}

export class AccessibilityController {
  constructor() {
    this.preferences = loadPreferences();
    this.prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {
      // Ignore storage persistence errors.
    }
  }

  applyToDocument() {
    document.body.classList.toggle('high-contrast', this.preferences.highContrast);
    document.body.classList.toggle('large-print', this.preferences.largePrint);
  }

  setHighContrast(enabled) {
    this.preferences.highContrast = Boolean(enabled);
    this.persist();
    this.applyToDocument();
  }

  setLargePrint(enabled) {
    this.preferences.largePrint = Boolean(enabled);
    this.persist();
    this.applyToDocument();
  }

  getPreferences() {
    return {
      ...this.preferences,
      reducedMotion: this.prefersReducedMotion
    };
  }

  initialize() {
    this.applyToDocument();
    return this.getPreferences();
  }
}
