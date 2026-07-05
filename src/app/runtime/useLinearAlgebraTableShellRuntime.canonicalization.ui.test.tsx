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
  type MutableRefObject,
} from 'react';
import type { ModeId } from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderLinearAlgebraTableShell(initialMode: ModeId) {
  const currentModeRef = { current: initialMode } as MutableRefObject<ModeId>;
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

    expect(hook.result.current.linearAlgebraRuntime.canonicalizeMatrixEditorPaste(
      'eigen([[2,1],[1,2]])',
    )).toBe(canonicalEigen);
    expect(hook.result.current.linearAlgebraRuntime.canonicalizeMatrixEditorPaste(
      'eigen([[2,1],[bad]])',
    )).toBeNull();

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('eigen([[2,1],[1,2]])');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe(canonicalEigen));
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        title: canonicalEigen,
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
    expect(hook.result.current.linearAlgebraRuntime.canonicalizeVectorEditorPaste(
      'gram([1,1],[1,0])',
    )).toBe(canonicalGram);
    expect(hook.result.current.linearAlgebraRuntime.canonicalizeVectorEditorPaste(
      'gram([1,bad],[1,0])',
    )).toBeNull();

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('gram([1,1],[1,0])');
    });
    act(() => {
      hook.result.current.runVectorEditorAction();
    });

    await waitFor(() => expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe(canonicalGram));
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        title: canonicalGram,
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
