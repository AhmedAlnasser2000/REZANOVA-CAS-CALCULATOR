// UI scale steps (GRAPHING-UI1). On the desktop the setting is the webview's
// native zoom, so the whole app scales exactly like browser zoom; in a browser
// the browser's own zoom does the same. The steps follow browsers' zoom levels.

export const UI_SCALE_STEPS = [80, 90, 100, 110, 125, 150, 175, 200] as const;
export type UiScale = typeof UI_SCALE_STEPS[number];

/** Settings saved before the native scale used 100/115/130/145; each maps to the nearest current step. */
export function normalizeUiScale(value: unknown): UiScale {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 100;
  return UI_SCALE_STEPS.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best), UI_SCALE_STEPS[0]);
}

/** The next step up (+1) or down (−1), staying at the ends; 0 resets to 100 %. */
export function nextUiScale(current: UiScale, direction: -1 | 0 | 1): UiScale {
  if (direction === 0) return 100;
  const index = UI_SCALE_STEPS.indexOf(current);
  const next = Math.min(UI_SCALE_STEPS.length - 1, Math.max(0, (index < 0 ? UI_SCALE_STEPS.indexOf(100) : index) + direction));
  return UI_SCALE_STEPS[next]!;
}

/** The packaged desktop app, where the setting drives the webview's native zoom; a browser uses its own zoom. */
export function isNativeUiScaleHost() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
