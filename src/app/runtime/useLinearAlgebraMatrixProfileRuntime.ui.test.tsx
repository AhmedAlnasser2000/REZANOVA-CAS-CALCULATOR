import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  useRef,
  type RefObject,
} from 'react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  CanonicalRuntimeOutcome,
  ModeId,
} from '../../types/calculator';
import { displayResultReadModelFromOutcome } from '../../lib/display/result/display-read-model';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderMatrixRuntime() {
  const currentModeRef = { current: 'matrix' } as RefObject<ModeId>;
  const commitOutcome = vi.fn();
  const hook = renderHook(() => useLinearAlgebraTableShellRuntime({
    activeFieldRef: useRef(null),
    angleUnit: 'rad',
    clearReplayVariableSubstitutions: vi.fn(),
    commitOutcome,
    currentMode: 'matrix',
    currentModeRef,
    discardHistoryTicket: vi.fn(),
    isLauncherOpen: false,
    patchSettings: vi.fn(),
    replayVariableSubstitutions: null,
    reserveHistoryTicket: vi.fn(() => null),
    setRuntimeStatusOverride: vi.fn(),
    storedVariables: [],
  }));

  return { commitOutcome, hook };
}

describe('useLinearAlgebraTableShellRuntime Matrix linear-map profile', () => {
  it('commits exact profile cards and a replayable Matrix snapshot', async () => {
    const { commitOutcome, hook } = renderMatrixRuntime();

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex(
        '\\operatorname{profile}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)',
      );
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(
      () => expect(commitOutcome).toHaveBeenCalled(),
      { timeout: 5_000 },
    );
    const outcome = commitOutcome.mock.calls.at(-1)?.[0] as CanonicalRuntimeOutcome;
    const display = displayResultReadModelFromOutcome(outcome);
    if (!display || display.outcomeKind === 'error') {
      throw new Error(display?.errorText ?? 'Expected a Matrix display result.');
    }
    expect(display).toMatchObject({
      outcomeKind: 'success',
      sourceMode: 'matrix',
      answerRows: {
        rows: [
          { latex: expect.stringContaining('\\mathbb{R}^{2}\\to\\mathbb{R}^{2}') },
          { latex: expect.stringContaining('\\operatorname{rank}') },
          { latex: expect.stringContaining('\\operatorname{nullity}') },
        ],
      },
    });
    expect(display.detailSections?.map((section) => section.title) ?? [])
      .toEqual(['Rank-Nullity Facts', 'Kernel', 'Image', 'Invertibility', 'RREF Evidence']);
    expect(display.detailSections?.[1]?.lines ?? [])
      .toContain('Nullity is 1, so nonzero vectors in the kernel map to zero.');
    expect(display.detailSections?.[2]?.lines ?? [])
      .toContain('The rank is 1, smaller than the codomain dimension 2, so some codomain directions are not reached.');

    expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success' }),
      expect.stringContaining('\\operatorname{profile}'),
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({
          operation: 'profileA',
          editorExpressionLatex: expect.stringContaining('\\operatorname{profile}'),
          exactMatrixA: [
            [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
            [{ numerator: 2, denominator: 1 }, { numerator: 2, denominator: 1 }],
          ],
        }),
      }),
    );
  });
});
