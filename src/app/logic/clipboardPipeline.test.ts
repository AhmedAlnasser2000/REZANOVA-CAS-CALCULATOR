import { describe, expect, it, vi } from 'vitest';
import { copyCanonicalMathWithDeps } from './clipboardPipeline';

describe('canonical clipboard pipeline', () => {
  it('routes canonical workspace math with explicit source metadata', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'custom-mime',
    });
    const setClipboardNotice = vi.fn();

    await copyCanonicalMathWithDeps({
      canonicalLatex: String.raw`x^{\frac{1}{6}}`,
      successNotice: 'Expression copied',
      surface: 'workspace-expression',
      mode: 'calculate',
      setClipboardNotice,
      write,
    });

    expect(write).toHaveBeenCalledWith({
      canonicalLatex: String.raw`x^{\frac{1}{6}}`,
      visibleText: String.raw`x^{\frac{1}{6}}`,
      mathJson: undefined,
      metadata: { surface: 'workspace-expression', mode: 'calculate' },
    });
    expect(setClipboardNotice).toHaveBeenCalledWith('Expression copied');
  });

  it('keeps History metadata coarse and refuses empty math', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'tauri',
      fidelity: 'canonical-text',
    });
    const setClipboardNotice = vi.fn();

    await copyCanonicalMathWithDeps({
      canonicalLatex: 'x=2',
      successNotice: 'Result copied',
      surface: 'history',
      setClipboardNotice,
      write,
    });
    expect(write).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { surface: 'history' },
    }));

    write.mockClear();
    await copyCanonicalMathWithDeps({
      canonicalLatex: ' ',
      successNotice: 'Result copied',
      surface: 'history',
      setClipboardNotice,
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(setClipboardNotice).toHaveBeenLastCalledWith('Nothing to copy');
  });
});
