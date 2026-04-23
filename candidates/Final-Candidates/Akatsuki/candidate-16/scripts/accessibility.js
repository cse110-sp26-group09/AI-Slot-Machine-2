/**
 * Applies accessibility preferences to the page root.
 */
export function createAccessibilityController() {
  /**
   * @param {{highContrast: boolean, largeText: boolean, reducedMotion: boolean}} settings
   */
  function apply(settings) {
    document.body.classList.toggle("a11y-high-contrast", Boolean(settings.highContrast));
    document.body.classList.toggle("a11y-large-print", Boolean(settings.largeText));
    document.body.classList.toggle("reduce-motion", Boolean(settings.reducedMotion));
  }

  return { apply };
}
