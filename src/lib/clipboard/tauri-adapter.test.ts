import { describe, expect, it, vi } from 'vitest';
import {
  readMathClipboard,
  writeMathClipboard,
  writeTextClipboard,
  type TauriClipboardPort,
} from './index';

const request = {
  canonicalLatex: String.raw`x^{\frac{1}{6}}`,
  visibleText: 'x^(1/6)',
  metadata: { surface: 'display' as const, mode: 'calculate' as const },
};

function port(): TauriClipboardPort {
  return {
    readText: vi.fn(),
    writeText: vi.fn(),
    writeHtml: vi.fn(),
  };
}

describe('Tauri math clipboard adapter', () => {
  it('writes an HTML envelope with canonical LaTeX as the native text fallback', async () => {
    const tauri = port();
    await expect(writeMathClipboard(request, { host: 'tauri', tauri })).resolves.toEqual({
      ok: true,
      host: 'tauri',
      fidelity: 'html-envelope',
    });
    expect(tauri.writeHtml).toHaveBeenCalledWith(
      expect.stringContaining('data-calcwiz-math-envelope='),
      request.canonicalLatex,
    );
    expect(tauri.writeText).not.toHaveBeenCalled();
  });

  it('retains canonical text when HTML writing is unavailable', async () => {
    const tauri = port();
    vi.mocked(tauri.writeHtml).mockRejectedValue(new Error('unsupported'));
    await expect(writeMathClipboard(request, { host: 'tauri', tauri })).resolves.toEqual({
      ok: true,
      host: 'tauri',
      fidelity: 'canonical-text',
    });
    expect(tauri.writeText).toHaveBeenCalledWith(request.canonicalLatex);
  });

  it('reads only exact text because the official plugin exposes no HTML read API', async () => {
    const tauri = port();
    vi.mocked(tauri.readText).mockResolvedValue(request.canonicalLatex);
    await expect(readMathClipboard({ host: 'tauri', tauri })).resolves.toEqual({
      ok: true,
      canonicalLatex: request.canonicalLatex,
      source: 'text',
    });
  });

  it('routes non-math text through the same restricted Tauri write-text port', async () => {
    const tauri = port();
    await expect(writeTextClipboard('diagnostic', { host: 'tauri', tauri })).resolves.toBe(true);
    expect(tauri.writeText).toHaveBeenCalledWith('diagnostic');
  });
});
