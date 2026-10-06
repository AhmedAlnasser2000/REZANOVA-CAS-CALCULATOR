import { useEffect, useRef } from 'react';
import { isNativeUiScaleHost, nextUiScale, type UiScale } from '../../lib/app-state/persistence';

// The desktop app's UI scale is the webview's native zoom (GRAPHING-UI1): the
// whole app scales exactly like browser zoom, so CSS pixels, viewport units,
// media queries, measured sizes and pointer positions all stay consistent.
// Ctrl/Cmd + = / − / 0 step the same setting (Tauri's own zoom hotkeys stay
// off so the two never disagree). In a browser the browser's zoom does this.

/** Ctrl/Cmd with =, +, − or 0: the step it asks for, or null. */
export function uiScaleShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): -1 | 0 | 1 | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  if (event.key === '=' || event.key === '+') return 1;
  if (event.key === '-' || event.key === '_') return -1;
  if (event.key === '0') return 0;
  return null;
}

export function useNativeUiScale(uiScale: UiScale, setUiScale: (value: UiScale) => void) {
  const latest = useRef({ uiScale, setUiScale });
  useEffect(() => { latest.current = { uiScale, setUiScale }; });

  useEffect(() => {
    if (!isNativeUiScaleHost()) return;
    void import('@tauri-apps/api/webview')
      .then(({ getCurrentWebview }) => getCurrentWebview().setZoom(uiScale / 100))
      .catch(() => { /* the setting stays saved; the next change retries */ });
  }, [uiScale]);

  useEffect(() => {
    if (!isNativeUiScaleHost()) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const step = uiScaleShortcut(event);
      if (step === null) return;
      // Like a browser's zoom keys, these win over a focused field.
      event.preventDefault();
      event.stopPropagation();
      const next = nextUiScale(latest.current.uiScale, step);
      if (next !== latest.current.uiScale) latest.current.setUiScale(next);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
