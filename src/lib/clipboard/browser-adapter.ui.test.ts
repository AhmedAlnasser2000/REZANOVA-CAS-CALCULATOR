// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  MATH_CLIPBOARD_CONTENT_TYPE,
  MATH_CLIPBOARD_MIME,
  buildMathClipboardHtml,
  createMathClipboardEnvelope,
  readBrowserMathClipboard,
  readMathClipboardData,
  writeBrowserMathClipboard,
  type BrowserClipboardEnvironment,
} from './index';

class TestClipboardItem {
  static supports(type: string) {
    return type === MATH_CLIPBOARD_MIME || type === 'text/html' || type === 'text/plain';
  }

  readonly types: string[];
  readonly #items: Record<string, Blob>;

  constructor(items: Record<string, Blob>) {
    this.#items = items;
    this.types = Object.keys(items);
  }

  async getType(type: string) {
    const blob = this.#items[type];
    if (!blob) throw new Error('missing type');
    return blob;
  }
}

const request = {
  canonicalLatex: String.raw`x^{\frac{1}{6}}`,
  visibleText: 'x^(1/6)',
  mathJson: ['Power', 'x', ['Divide', 1, 6]],
  metadata: { surface: 'display' as const, mode: 'calculate' as const },
};

function environment(overrides: Partial<BrowserClipboardEnvironment> = {}) {
  return {
    ClipboardItem: TestClipboardItem as unknown as typeof ClipboardItem,
    clipboard: {
      read: vi.fn(),
      readText: vi.fn(),
      write: vi.fn(),
      writeText: vi.fn(),
    },
    document,
    ...overrides,
  } satisfies BrowserClipboardEnvironment;
}

describe('browser math clipboard adapter', () => {
  it('writes custom MIME, escaped HTML, and visible text in one lossless item', async () => {
    const env = environment();
    const result = await writeBrowserMathClipboard(request, env);
    expect(result).toEqual({ ok: true, host: 'browser', fidelity: 'custom-mime' });
    expect(env.clipboard.write).toHaveBeenCalledOnce();

    const item = vi.mocked(env.clipboard.write).mock.calls[0][0][0];
    expect(item.types).toEqual([MATH_CLIPBOARD_MIME, 'text/html', 'text/plain']);
    expect((await item.getType(MATH_CLIPBOARD_MIME)).type).toBe(MATH_CLIPBOARD_CONTENT_TYPE);
    expect(await (await item.getType('text/plain')).text()).toBe(request.visibleText);

    vi.mocked(env.clipboard.read).mockResolvedValue([item]);
    await expect(readBrowserMathClipboard(env)).resolves.toMatchObject({
      ok: true,
      canonicalLatex: request.canonicalLatex,
      source: 'custom-mime',
    });
  });

  it('falls back to exact canonical text when rich clipboard access is blocked', async () => {
    const env = environment();
    vi.mocked(env.clipboard.write).mockRejectedValue(new Error('permission denied'));
    const result = await writeBrowserMathClipboard(request, env);
    expect(result).toEqual({ ok: true, host: 'browser', fidelity: 'canonical-text' });
    expect(env.clipboard.writeText).toHaveBeenCalledWith(request.canonicalLatex);
  });

  it('decodes native paste events and rejects mismatched rich envelopes', () => {
    const first = createMathClipboardEnvelope(request);
    const second = createMathClipboardEnvelope({ ...request, canonicalLatex: 'y' });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const data = {
      getData: (type: string) => ({
        [MATH_CLIPBOARD_MIME]: first.serialized,
        'text/html': buildMathClipboardHtml(second.serialized, 'y'),
        'text/plain': request.visibleText,
      })[type] ?? '',
    } as DataTransfer;
    expect(readMathClipboardData(data)).toEqual({
      ok: false,
      reason: 'mismatched',
      textFallback: request.visibleText,
    });
  });

  it('uses plain text when malformed rich data is accompanied by a safe fallback', () => {
    const data = {
      getData: (type: string) => ({
        [MATH_CLIPBOARD_MIME]: '{bad',
        'text/html': '<span data-calcwiz-math-envelope="bad"></span>',
        'text/plain': 'x+1',
      })[type] ?? '',
    } as DataTransfer;
    expect(readMathClipboardData(data)).toEqual({
      ok: true,
      canonicalLatex: 'x+1',
      source: 'text',
    });
  });

  it('accepts an HTML-only envelope and a programmatic text-only item', async () => {
    const created = createMathClipboardEnvelope(request);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const htmlData = {
      getData: (type: string) => ({
        'text/html': buildMathClipboardHtml(created.serialized, request.visibleText),
        'text/plain': request.visibleText,
      })[type] ?? '',
    } as DataTransfer;
    expect(readMathClipboardData(htmlData)).toMatchObject({
      ok: true,
      canonicalLatex: request.canonicalLatex,
      source: 'html-envelope',
    });

    const textItem = new TestClipboardItem({
      'text/plain': new Blob(['plain-only'], { type: 'text/plain' }),
    }) as unknown as ClipboardItem;
    const env = environment();
    vi.mocked(env.clipboard.read).mockResolvedValue([textItem]);
    await expect(readBrowserMathClipboard(env)).resolves.toEqual({
      ok: true,
      canonicalLatex: 'plain-only',
      source: 'text',
    });
  });

  it('reports blocked programmatic reads without accepting partial data', async () => {
    const env = environment();
    vi.mocked(env.clipboard.read).mockRejectedValue(new Error('permission denied'));
    await expect(readBrowserMathClipboard(env)).resolves.toEqual({
      ok: false,
      reason: 'blocked',
    });
  });
});
