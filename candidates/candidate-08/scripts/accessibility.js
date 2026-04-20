const STORAGE_KEY = "prompt-palace-a11y";

const DEFAULT_SETTINGS = {
  highContrast: false,
  largePrint: false,
  reduceMotion: false
};

/**
 * @returns {{ highContrast: boolean, largePrint: boolean, reduceMotion: boolean }}
 */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      highContrast: Boolean(parsed.highContrast),
      largePrint: Boolean(parsed.largePrint),
      reduceMotion: Boolean(parsed.reduceMotion)
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * @param {{ highContrast: boolean, largePrint: boolean, reduceMotion: boolean }} settings
 */
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * @param {{ highContrast: boolean, largePrint: boolean, reduceMotion: boolean }} settings
 */
function applyDocumentSettings(settings) {
  document.body.classList.toggle("high-contrast", settings.highContrast);
  document.body.classList.toggle("large-print", settings.largePrint);
  document.body.classList.toggle("reduce-motion", settings.reduceMotion);
}

/**
 * @param {{ highContrastToggle: HTMLInputElement, largeTextToggle: HTMLInputElement, reduceMotionToggle: HTMLInputElement }} controls
 * @param {(settings: { highContrast: boolean, largePrint: boolean, reduceMotion: boolean }) => void} onChange
 */
export function initAccessibility(controls, onChange) {
  let settings = loadSettings();

  controls.highContrastToggle.checked = settings.highContrast;
  controls.largeTextToggle.checked = settings.largePrint;
  controls.reduceMotionToggle.checked = settings.reduceMotion;

  applyDocumentSettings(settings);
  onChange(settings);

  const handleChange = () => {
    settings = {
      highContrast: controls.highContrastToggle.checked,
      largePrint: controls.largeTextToggle.checked,
      reduceMotion: controls.reduceMotionToggle.checked
    };

    saveSettings(settings);
    applyDocumentSettings(settings);
    onChange(settings);
  };

  controls.highContrastToggle.addEventListener("change", handleChange);
  controls.largeTextToggle.addEventListener("change", handleChange);
  controls.reduceMotionToggle.addEventListener("change", handleChange);

  return {
    getSettings: () => ({ ...settings })
  };
}
