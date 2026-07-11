import { describe, expect, it, vi } from 'vitest';
import { copyDisplayResultWithDeps } from './displayClipboard';

describe('Display canonical clipboard routing', () => {
  it('keeps visible text beside a proven canonical payload', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'custom-mime',
    });
    const setClipboardNotice = vi.fn();
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'success',
        title: 'Result',
        exactLatex: String.raw`x^{\frac{1}{6}}`,
        canonicalMath: {
          version: 1,
          canonicalLatex: String.raw`x^{\frac{1}{6}}`,
          mathJson: ['Power', 'x', ['Divide', 1, 6]],
        },
        warnings: [],
      },
      visibleText: 'x^(1/6)',
      currentMode: 'calculate',
      setClipboardNotice,
      write,
    });

    expect(write).toHaveBeenCalledWith({
      canonicalLatex: String.raw`x^{\frac{1}{6}}`,
      visibleText: 'x^(1/6)',
      mathJson: ['Power', 'x', ['Divide', 1, 6]],
      metadata: { surface: 'display', mode: 'calculate' },
    });
    expect(setClipboardNotice).toHaveBeenCalledWith('Result copied');
  });

  it('uses compatibility exact LaTeX and refuses an empty result', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'canonical-text',
    });
    const setClipboardNotice = vi.fn();
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'error',
        title: 'Boundary',
        error: 'Controlled stop',
        exactLatex: 'x=1',
        warnings: [],
      },
      visibleText: 'x = 1',
      currentMode: 'equation',
      setClipboardNotice,
      write,
    });
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ canonicalLatex: 'x=1' }));

    write.mockClear();
    await copyDisplayResultWithDeps({
      displayOutcome: null,
      visibleText: ' ',
      currentMode: 'calculate',
      setClipboardNotice,
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(setClipboardNotice).toHaveBeenLastCalledWith('Nothing to copy');
  });

  it('drops a mismatched canonical payload and falls back to compatibility exact LaTeX', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'canonical-text',
    });
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'success',
        title: 'Result',
        exactLatex: 'x=1',
        canonicalMath: {
          version: 1,
          canonicalLatex: 'x=2',
          mathJson: ['Equal', 'x', 2],
        },
        warnings: [],
      },
      visibleText: 'x = 1',
      currentMode: 'equation',
      setClipboardNotice: vi.fn(),
      write,
    });
    expect(write).toHaveBeenCalledWith({
      canonicalLatex: 'x=1',
      visibleText: 'x = 1',
      mathJson: undefined,
      metadata: { surface: 'display', mode: 'equation' },
    });
  });
});
