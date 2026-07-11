import {
  MATH_CLIPBOARD_CONTENT_TYPE,
  MATH_CLIPBOARD_MIME,
  type MathClipboardReadResult,
  type MathClipboardWriteRequest,
  type MathClipboardWriteResult,
} from './contracts';
import {
  buildMathClipboardHtml,
  boundedMathClipboardVisibleText,
  createMathClipboardEnvelope,
  parseMathClipboardEnvelope,
  parseMathClipboardHtml,
} from './envelope';

export type BrowserClipboardEnvironment = {
  clipboard?: Pick<Clipboard, 'read' | 'readText' | 'write' | 'writeText'>;
  ClipboardItem?: typeof globalThis.ClipboardItem;
  document?: Document;
};

function defaultEnvironment(): BrowserClipboardEnvironment {
  return {
    clipboard: typeof navigator === 'undefined' ? undefined : navigator.clipboard,
    ClipboardItem: globalThis.ClipboardItem,
    document: typeof document === 'undefined' ? undefined : document,
  };
}

function fallbackCopyText(text: string, documentValue: Document | undefined) {
  if (!documentValue?.body || typeof documentValue.execCommand !== 'function') return false;
  const textarea = documentValue.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-10000px';
  documentValue.body.appendChild(textarea);
  textarea.select();
  const copied = documentValue.execCommand('copy');
  textarea.remove();
  return copied;
}

export async function writeBrowserTextClipboard(
  text: string,
  environment: BrowserClipboardEnvironment = defaultEnvironment(),
) {
  if (environment.clipboard?.writeText) {
    await environment.clipboard.writeText(text);
    return true;
  }
  return fallbackCopyText(text, environment.document);
}

function supportsMultiFormat(environment: BrowserClipboardEnvironment) {
  const ClipboardItemValue = environment.ClipboardItem;
  return Boolean(
    ClipboardItemValue
    && environment.clipboard?.write
    && (!ClipboardItemValue.supports || ClipboardItemValue.supports(MATH_CLIPBOARD_MIME)),
  );
}

export async function writeBrowserMathClipboard(
  request: MathClipboardWriteRequest,
  environment: BrowserClipboardEnvironment = defaultEnvironment(),
): Promise<MathClipboardWriteResult> {
  const created = createMathClipboardEnvelope(request);
  if (!created.ok) return { ok: false, host: 'browser', reason: 'invalid' };
  const visibleText = boundedMathClipboardVisibleText(
    request.visibleText,
    request.canonicalLatex,
  );

  if (supportsMultiFormat(environment)) {
    try {
      const ClipboardItemValue = environment.ClipboardItem as typeof ClipboardItem;
      const item = new ClipboardItemValue({
        [MATH_CLIPBOARD_MIME]: new Blob(
          [created.serialized],
          { type: MATH_CLIPBOARD_CONTENT_TYPE },
        ),
        'text/html': new Blob([
          buildMathClipboardHtml(created.serialized, visibleText),
        ], { type: 'text/html' }),
        'text/plain': new Blob([visibleText], { type: 'text/plain' }),
      });
      await environment.clipboard?.write?.([item]);
      return { ok: true, host: 'browser', fidelity: 'custom-mime' };
    } catch {
      // Fall through to exact canonical text when a browser blocks rich clipboard access.
    }
  }

  try {
    return await writeBrowserTextClipboard(request.canonicalLatex, environment)
      ? { ok: true, host: 'browser', fidelity: 'canonical-text' }
      : { ok: false, host: 'browser', reason: 'blocked' };
  } catch {
    return { ok: false, host: 'browser', reason: 'blocked' };
  }
}

function readParsedEnvelope(
  customSerialized: string | undefined,
  html: string | undefined,
  text: string | undefined,
): MathClipboardReadResult {
  const custom = customSerialized ? parseMathClipboardEnvelope(customSerialized) : undefined;
  const embedded = html ? parseMathClipboardHtml(html) : undefined;
  if (custom?.ok && embedded?.ok && custom.serialized !== embedded.serialized) {
    return { ok: false, reason: 'mismatched', textFallback: text };
  }
  const parsed = custom?.ok ? custom : embedded?.ok ? embedded : undefined;
  if (parsed?.ok) {
    return {
      ok: true,
      canonicalLatex: parsed.envelope.canonicalLatex,
      ...(parsed.envelope.mathJson === undefined ? {} : { mathJson: parsed.envelope.mathJson }),
      metadata: parsed.envelope.metadata,
      source: custom?.ok ? 'custom-mime' : 'html-envelope',
    };
  }
  if (text?.trim()) return { ok: true, canonicalLatex: text, source: 'text' };
  if (customSerialized || html) return { ok: false, reason: 'malformed' };
  return { ok: false, reason: 'empty' };
}

async function blobText(item: ClipboardItem, type: string) {
  return item.types.includes(type) ? (await item.getType(type)).text() : undefined;
}

export async function readBrowserMathClipboard(
  environment: BrowserClipboardEnvironment = defaultEnvironment(),
): Promise<MathClipboardReadResult> {
  try {
    if (environment.clipboard?.read) {
      const items = await environment.clipboard.read();
      for (const item of items) {
        const result = readParsedEnvelope(
          await blobText(item, MATH_CLIPBOARD_MIME),
          await blobText(item, 'text/html'),
          await blobText(item, 'text/plain'),
        );
        if (result.ok || result.reason !== 'empty') return result;
      }
    }
    const text = await environment.clipboard?.readText?.();
    return text?.trim()
      ? { ok: true, canonicalLatex: text, source: 'text' }
      : { ok: false, reason: 'empty' };
  } catch {
    return { ok: false, reason: 'blocked' };
  }
}

export function readMathClipboardData(data: DataTransfer | null): MathClipboardReadResult {
  if (!data) return { ok: false, reason: 'empty' };
  return readParsedEnvelope(
    data.getData(MATH_CLIPBOARD_MIME) || undefined,
    data.getData('text/html') || undefined,
    data.getData('text/plain') || undefined,
  );
}

export function readMathClipboardEvent(
  event: Pick<ClipboardEvent, 'clipboardData'>,
): MathClipboardReadResult {
  return readMathClipboardData(event.clipboardData);
}
