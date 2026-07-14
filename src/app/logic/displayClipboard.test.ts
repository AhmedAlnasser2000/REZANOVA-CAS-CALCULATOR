import { describe, expect, it, vi } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../lib/result-contract';
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
        canonicalResult: buildCanonicalResultDocumentFromProducer({
          outcomeKind: 'success',
          title: 'Result',
          primaryMath: canonicalMathValue(
            String.raw`x^{\frac{1}{6}}`,
            ['Power', 'x', ['Divide', 1, 6]],
          ),
          warnings: [],
        }),
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

  it('copies a canonical approximation-only result without reviving string-only fallback', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'canonical-text',
    });
    const setClipboardNotice = vi.fn();
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'success',
        canonicalResult: buildCanonicalResultDocumentFromProducer({
          outcomeKind: 'success',
          title: 'Numeric result',
          approxText: 'x ~= 2.076101',
          warnings: [],
        }),
      },
      visibleText: 'x \u2248 2.076e0',
      currentMode: 'equation',
      setClipboardNotice,
      write,
    });

    expect(write).toHaveBeenCalledWith({
      canonicalLatex: 'x \u2248 2.076e0',
      visibleText: 'x \u2248 2.076e0',
      mathJson: undefined,
      metadata: { surface: 'display', mode: 'equation' },
    });
    expect(setClipboardNotice).toHaveBeenCalledWith('Result copied');
  });

  it('refuses string-only and empty results', async () => {
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
      } as unknown as CanonicalRuntimeOutcome,
      visibleText: 'x = 1',
      currentMode: 'equation',
      setClipboardNotice,
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(setClipboardNotice).toHaveBeenLastCalledWith('Result unavailable');

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

  it('does not fall back from malformed canonical authority', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'canonical-text',
    });
    const setClipboardNotice = vi.fn();
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'success',
        canonicalResult: {
          version: 1,
          outcomeKind: 'error',
          title: 'Result',
          error: 'Mismatched kind',
          warnings: [],
        },
      } as unknown as CanonicalRuntimeOutcome,
      visibleText: 'x = 1',
      currentMode: 'equation',
      setClipboardNotice,
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(setClipboardNotice).toHaveBeenCalledWith('Result unavailable');
  });

  it('copies native canonical truth when compatibility fields disagree', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: true,
      host: 'browser',
      fidelity: 'custom-mime',
    });
    await copyDisplayResultWithDeps({
      displayOutcome: {
        kind: 'success',
        canonicalResult: buildCanonicalResultDocumentFromProducer({
          outcomeKind: 'success',
          title: 'Canonical result',
          primaryMath: canonicalMathValue('x=1', ['Equal', 'x', 1]),
          warnings: [],
        }),
      },
      visibleText: 'x = 1',
      currentMode: 'equation',
      setClipboardNotice: vi.fn(),
      write,
    });

    expect(write).toHaveBeenCalledWith(expect.objectContaining({
      canonicalLatex: 'x=1',
      mathJson: ['Equal', 'x', 1],
    }));
  });
});
