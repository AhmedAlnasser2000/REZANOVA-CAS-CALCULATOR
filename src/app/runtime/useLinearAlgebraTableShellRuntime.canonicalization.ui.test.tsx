import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  useRef,
  type RefObject,
} from 'react';
import type { ModeId } from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderLinearAlgebraTableShell(initialMode: ModeId) {
  const currentModeRef = { current: initialMode } as RefObject<ModeId>;
  const commitOutcome = vi.fn();
  const hook = renderHook(
    (props: { currentMode: ModeId }) => {
      currentModeRef.current = props.currentMode;
      return useLinearAlgebraTableShellRuntime({
        activeFieldRef: useRef(null),
        angleUnit: 'rad',
        clearReplayVariableSubstitutions: vi.fn(),
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket: vi.fn(),
        isLauncherOpen: false,
        patchSettings: vi.fn(),
        replayVariableSubstitutions: null,
        reserveHistoryTicket: vi.fn(() => null),
        setRuntimeStatusOverride: vi.fn(),
        storedVariables: [],
      });
    },
    { initialProps: { currentMode: initialMode } },
  );

  return { commitOutcome, hook };
}

describe('useLinearAlgebraTableShellRuntime editor canonicalization', () => {
  it('canonicalizes friendly Matrix and Vector list input before committing history', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell('matrix');
    const canonicalEigen = '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)';

    await expect(hook.result.current.linearAlgebraRuntime.canonicalizeMatrixEditorPaste(
      'eigen([[2,1],[1,2]])',
    )).resolves.toBe(canonicalEigen);
    await expect(hook.result.current.linearAlgebraRuntime.canonicalizeMatrixEditorPaste(
      'eigen([[2,1],[bad]])',
    )).resolves.toBeNull();

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('eigen([[2,1],[1,2]])');
    });
    await act(async () => {
      await hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe(canonicalEigen));
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        canonicalResult: expect.objectContaining({
          title: canonicalEigen,
        }),
      }),
      canonicalEigen,
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({
          operation: 'eigenA',
          editorExpressionLatex: canonicalEigen,
          matrixOperandLatexA: '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}',
        }),
      }),
    ));

    commitOutcome.mockClear();
    hook.rerender({ currentMode: 'vector' });
    const canonicalGram = '\\operatorname{gram}\\left(\\begin{bmatrix}1\\\\1\\end{bmatrix},\\begin{bmatrix}1\\\\0\\end{bmatrix}\\right)';
    await expect(hook.result.current.linearAlgebraRuntime.canonicalizeVectorEditorPaste(
      'gram([1,1],[1,0])',
    )).resolves.toBe(canonicalGram);
    await expect(hook.result.current.linearAlgebraRuntime.canonicalizeVectorEditorPaste(
      'gram([1,bad],[1,0])',
    )).resolves.toBeNull();
    await expect(hook.result.current.linearAlgebraRuntime.canonicalizeVectorEditorPaste(
      '2u-v/3',
    )).resolves.toBe('2u-\\frac{v}{3}');

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('gram([1,1],[1,0])');
    });
    await act(async () => {
      await hook.result.current.runVectorEditorAction();
    });

    await waitFor(() => expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe(canonicalGram));
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        canonicalResult: expect.objectContaining({
          title: canonicalGram,
        }),
      }),
      canonicalGram,
      'vector',
      expect.objectContaining({
        vectorSeed: expect.objectContaining({
          operation: 'gramSchmidtUV',
          editorExpressionLatex: canonicalGram,
          vectorOperandLatexA: '\\begin{bmatrix}1\\\\1\\end{bmatrix}',
          vectorOperandLatexB: '\\begin{bmatrix}1\\\\0\\end{bmatrix}',
        }),
      }),
    ));
  });
});
