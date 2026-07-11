import type {
  MathClipboardReadResult,
  MathClipboardWriteRequest,
  MathClipboardWriteResult,
} from './contracts';
import {
  readBrowserMathClipboard,
  writeBrowserTextClipboard,
  writeBrowserMathClipboard,
  type BrowserClipboardEnvironment,
} from './browser-adapter';
import {
  readTauriMathClipboard,
  writeTauriTextClipboard,
  writeTauriMathClipboard,
  type TauriClipboardPort,
} from './tauri-adapter';

export function isTauriClipboardHost() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type SystemClipboardDependencies = {
  host?: 'browser' | 'tauri';
  browser?: BrowserClipboardEnvironment;
  tauri?: TauriClipboardPort;
};

export function writeMathClipboard(
  request: MathClipboardWriteRequest,
  dependencies: SystemClipboardDependencies = {},
): Promise<MathClipboardWriteResult> {
  const host = dependencies.host ?? (isTauriClipboardHost() ? 'tauri' : 'browser');
  return host === 'tauri'
    ? writeTauriMathClipboard(request, dependencies.tauri)
    : writeBrowserMathClipboard(request, dependencies.browser);
}

export function readMathClipboard(
  dependencies: SystemClipboardDependencies = {},
): Promise<MathClipboardReadResult> {
  const host = dependencies.host ?? (isTauriClipboardHost() ? 'tauri' : 'browser');
  return host === 'tauri'
    ? readTauriMathClipboard(dependencies.tauri)
    : readBrowserMathClipboard(dependencies.browser);
}

export async function writeTextClipboard(
  text: string,
  dependencies: SystemClipboardDependencies = {},
) {
  const host = dependencies.host ?? (isTauriClipboardHost() ? 'tauri' : 'browser');
  try {
    if (host === 'tauri') {
      return await writeTauriTextClipboard(text, dependencies.tauri);
    }
    const environment = dependencies.browser ?? {
      clipboard: typeof navigator === 'undefined' ? undefined : navigator.clipboard,
      document: typeof document === 'undefined' ? undefined : document,
    };
    return await writeBrowserTextClipboard(text, environment);
  } catch {
    return false;
  }
}
