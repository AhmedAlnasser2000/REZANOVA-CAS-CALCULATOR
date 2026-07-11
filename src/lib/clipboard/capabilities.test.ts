import { describe, expect, it } from 'vitest';
import {
  MATH_CLIPBOARD_MIME,
  TAURI_CLIPBOARD_CAPABILITIES,
  auditBrowserClipboardCapabilities,
} from './index';

describe('clipboard capability contracts', () => {
  it('reports browser rich formats only when read/write and custom MIME are available', () => {
    class Item {
      static supports(type: string) {
        return type === MATH_CLIPBOARD_MIME;
      }
    }
    expect(auditBrowserClipboardCapabilities({
      clipboard: {
        read: async () => [],
        readText: async () => '',
        write: async () => undefined,
        writeText: async () => undefined,
      },
      ClipboardItem: Item as unknown as typeof ClipboardItem,
    })).toMatchObject({
      host: 'browser',
      readCustomMime: true,
      writeCustomMime: true,
      readHtml: true,
      writeHtml: true,
      canonicalTextFallback: true,
    });
  });

  it('pins the official Tauri plugin boundary without claiming HTML or custom reads', () => {
    expect(TAURI_CLIPBOARD_CAPABILITIES).toEqual({
      host: 'tauri',
      readText: true,
      writeText: true,
      readHtml: false,
      writeHtml: true,
      readCustomMime: false,
      writeCustomMime: false,
      nativePasteEventFormats: true,
      canonicalTextFallback: true,
    });
  });
});
