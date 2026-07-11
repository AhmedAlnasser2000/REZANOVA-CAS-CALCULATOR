import {
  readText as readTauriText,
  writeHtml as writeTauriHtml,
  writeText as writeTauriText,
} from '@tauri-apps/plugin-clipboard-manager';
import type {
  MathClipboardReadResult,
  MathClipboardWriteRequest,
  MathClipboardWriteResult,
} from './contracts';
import {
  boundedMathClipboardVisibleText,
  buildMathClipboardHtml,
  createMathClipboardEnvelope,
} from './envelope';

export type TauriClipboardPort = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
  writeHtml: (html: string, altText?: string) => Promise<void>;
};

const defaultPort: TauriClipboardPort = {
  readText: readTauriText,
  writeText: writeTauriText,
  writeHtml: writeTauriHtml,
};

export async function writeTauriTextClipboard(
  text: string,
  port: TauriClipboardPort = defaultPort,
) {
  try {
    await port.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function writeTauriMathClipboard(
  request: MathClipboardWriteRequest,
  port: TauriClipboardPort = defaultPort,
): Promise<MathClipboardWriteResult> {
  const created = createMathClipboardEnvelope(request);
  if (!created.ok) return { ok: false, host: 'tauri', reason: 'invalid' };
  const visibleText = boundedMathClipboardVisibleText(
    request.visibleText,
    request.canonicalLatex,
  );
  try {
    await port.writeHtml(
      buildMathClipboardHtml(created.serialized, visibleText),
      request.canonicalLatex,
    );
    return { ok: true, host: 'tauri', fidelity: 'html-envelope' };
  } catch {
    try {
      await port.writeText(request.canonicalLatex);
      return { ok: true, host: 'tauri', fidelity: 'canonical-text' };
    } catch {
      return { ok: false, host: 'tauri', reason: 'blocked' };
    }
  }
}

export async function readTauriMathClipboard(
  port: TauriClipboardPort = defaultPort,
): Promise<MathClipboardReadResult> {
  try {
    const text = await port.readText();
    return text.trim()
      ? { ok: true, canonicalLatex: text, source: 'text' }
      : { ok: false, reason: 'empty' };
  } catch {
    return { ok: false, reason: 'blocked' };
  }
}
