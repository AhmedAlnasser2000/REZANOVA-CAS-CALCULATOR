import { MATH_CLIPBOARD_MIME } from './contracts';

export type ClipboardCapabilityAudit = {
  host: 'browser' | 'tauri';
  readText: boolean;
  writeText: boolean;
  readHtml: boolean;
  writeHtml: boolean;
  readCustomMime: boolean;
  writeCustomMime: boolean;
  nativePasteEventFormats: boolean;
  canonicalTextFallback: true;
};

type BrowserCapabilityEnvironment = {
  clipboard?: Pick<Clipboard, 'read' | 'readText' | 'write' | 'writeText'>;
  ClipboardItem?: typeof globalThis.ClipboardItem;
};

export function auditBrowserClipboardCapabilities(
  environment: BrowserCapabilityEnvironment = {
    clipboard: typeof navigator === 'undefined' ? undefined : navigator.clipboard,
    ClipboardItem: globalThis.ClipboardItem,
  },
): ClipboardCapabilityAudit {
  const item = environment.ClipboardItem;
  const supportsCustomMime = Boolean(
    item
    && environment.clipboard?.write
    && (!item.supports || item.supports(MATH_CLIPBOARD_MIME)),
  );
  return {
    host: 'browser',
    readText: Boolean(environment.clipboard?.readText),
    writeText: Boolean(environment.clipboard?.writeText),
    readHtml: Boolean(environment.clipboard?.read),
    writeHtml: Boolean(item && environment.clipboard?.write),
    readCustomMime: Boolean(supportsCustomMime && environment.clipboard?.read),
    writeCustomMime: supportsCustomMime,
    nativePasteEventFormats: typeof ClipboardEvent !== 'undefined',
    canonicalTextFallback: true,
  };
}

export const TAURI_CLIPBOARD_CAPABILITIES: ClipboardCapabilityAudit = {
  host: 'tauri',
  readText: true,
  writeText: true,
  readHtml: false,
  writeHtml: true,
  readCustomMime: false,
  writeCustomMime: false,
  nativePasteEventFormats: true,
  canonicalTextFallback: true,
};
