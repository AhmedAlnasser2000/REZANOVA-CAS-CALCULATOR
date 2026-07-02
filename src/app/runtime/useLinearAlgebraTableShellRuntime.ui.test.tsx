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
import type {
  HistoryEntry,
  ModeId,
} from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderLinearAlgebraTableShell(
  initialProps: {
    currentMode?: ModeId;
  } = {},
) {
  const currentModeRef = {
    current: initialProps.currentMode ?? 'matrix',
  } as MutableRefObject<ModeId>;
  const clearReplayVariableSubstitutions = vi.fn();
  const commitOutcome = vi.fn();
  const discardHistoryTicket = vi.fn();
  const patchSettings = vi.fn();
  const reserveHistoryTicket = vi.fn(() => null);
  const setRuntimeStatusOverride = vi.fn();

  const hook = renderHook(
    (props: { currentMode: ModeId }) => {
      currentModeRef.current = props.currentMode;
      const activeFieldRef = useRef(null);

      return useLinearAlgebraTableShellRuntime({
        activeFieldRef,
        angleUnit: 'rad',
        clearReplayVariableSubstitutions,
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket,
        isLauncherOpen: false,
        patchSettings,
        replayVariableSubstitutions: null,
        reserveHistoryTicket,
        setRuntimeStatusOverride,
        storedVariables: [],
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'matrix',
      },
    },
  );

  return {
    clearReplayVariableSubstitutions,
    commitOutcome,
    discardHistoryTicket,
    hook,
    patchSettings,
    reserveHistoryTicket,
    setRuntimeStatusOverride,
  };
}

describe('useLinearAlgebraTableShellRuntime', () => {
  it('builds host props for the active Linear/Table workspace', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'table' });
    const onOpenGuideArticle = vi.fn();
    const onOpenGuideMode = vi.fn();

    const props = hook.result.current.buildWorkspaceHostProps({
      onOpenGuideArticle,
      onOpenGuideMode,
    });

    expect(props.currentMode).toBe('table');
    expect(props.tableRuntime.tablePrimaryLatex).toBe('x^2');
    expect(props.tableKeyboardLayouts.length).toBeGreaterThan(0);
    expect(props.onOpenGuideArticle).toBe(onOpenGuideArticle);
    expect(props.onOpenGuideMode).toBe(onOpenGuideMode);
    expect(hook.result.current.matrixKeyboardLayouts.length).toBeGreaterThan(0);
    expect(hook.result.current.vectorKeyboardLayouts.length).toBeGreaterThan(0);
  });

  it('clears the active draft for Table, Matrix, and Vector modes', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('A+B');
      hook.result.current.clearActiveLinearAlgebraTableDraft();
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe('');

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('u+v');
    });
    hook.rerender({ currentMode: 'vector' });
    act(() => {
      hook.result.current.clearActiveLinearAlgebraTableDraft();
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe('');

    act(() => {
      hook.result.current.tableRuntime.setTablePrimaryLatex('x+1');
      hook.result.current.tableRuntime.setTableSecondaryLatex('x-1');
    });
    hook.rerender({ currentMode: 'table' });
    act(() => {
      hook.result.current.clearActiveLinearAlgebraTableDraft();
    });

    expect(hook.result.current.tableRuntime.tablePrimaryLatex).toBe('');
    expect(hook.result.current.tableRuntime.tableSecondaryLatex).toBe('');
  });

  it('resets Table, Matrix, and Vector state through the shell', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.tableRuntime.setTablePrimaryLatex('x+9');
      hook.result.current.tableRuntime.setTableSecondaryEnabled(true);
      hook.result.current.linearAlgebraRuntime.setMatrixA([[9, 9], [9, 9]]);
      hook.result.current.linearAlgebraRuntime.setVectorA([9, 9, 9]);
      hook.result.current.resetLinearAlgebraTableRuntime();
    });

    expect(hook.result.current.tableRuntime.tablePrimaryLatex).toBe('');
    expect(hook.result.current.tableRuntime.tableSecondaryEnabled).toBe(false);
    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 2, 3]);
  });

  it('captures and restores Matrix and Vector surface snapshots independently', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixA([[9, 8], [7, 6]]);
      hook.result.current.linearAlgebraRuntime.setMatrixB([[5, 4], [3, 2]]);
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('A+B');
    });
    const matrixSnapshot = hook.result.current.captureMatrixSurfaceState();

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorA([4, 5, 6]);
      hook.result.current.linearAlgebraRuntime.setVectorB([7, 8, 9]);
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('u\\cdot v');
    });
    const vectorSnapshot = hook.result.current.captureVectorSurfaceState();

    act(() => {
      hook.result.current.restoreMatrixSurfaceState(null);
      hook.result.current.restoreVectorSurfaceState(null);
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe('');
    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 2, 3]);
    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe('');

    act(() => {
      hook.result.current.restoreMatrixSurfaceState(matrixSnapshot);
      hook.result.current.restoreVectorSurfaceState(vectorSnapshot);
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([[9, 8], [7, 6]]);
    expect(hook.result.current.linearAlgebraRuntime.matrixB).toEqual([[5, 4], [3, 2]]);
    expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe('A+B');
    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([4, 5, 6]);
    expect(hook.result.current.linearAlgebraRuntime.vectorB).toEqual([7, 8, 9]);
    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe('u\\cdot v');
  });

  it('runs Matrix and Vector editor expressions through existing operations', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('A+B');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '\\begin{bmatrix}6 & 8\\\\10 & 12\\end{bmatrix}',
      }),
      'A+B',
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({ operation: 'add' }),
      }),
    ));

    commitOutcome.mockClear();
    hook.rerender({ currentMode: 'vector' });
    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('u\\cdot v');
    });
    act(() => {
      hook.result.current.runVectorEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '32',
      }),
      'u\\cdot v',
      'vector',
      expect.objectContaining({
        vectorSeed: expect.objectContaining({ operation: 'dot' }),
      }),
    ));
  });

  it('runs structured Matrix systems from the main editor', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: 'x=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
        solveSummaryText: 'Exactly one solution. Only this vector x satisfies the system.',
      }),
      'A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}',
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({
          operation: 'linearSystem',
          systemRhs: [5, 11],
          systemForm: 'Ax=b',
        }),
      }),
    ));
  });

  it('commits controlled errors for unsupported Matrix editor expressions', () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('\\operatorname{rank}\\left(A\\right)');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        title: 'Matrix',
        error: expect.stringContaining('Rank and RREF'),
      }),
      '\\operatorname{rank}\\left(A\\right)',
      'matrix',
    );
  });

  it('offers explicit Equation handoff for unsupported Matrix equations', () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('A=b');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        title: 'Matrix',
        error: expect.stringContaining('Open it in Equation'),
        actions: [{ kind: 'send', target: 'equation', latex: 'A=b' }],
      }),
      'A=b',
      'matrix',
    );
  });

  it('restores Table and Matrix history entries through the shell', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'table' });
    const tableEntry = {
      id: 'history.table',
      mode: 'table',
      inputLatex: 'x^3',
      resultLatex: 'table',
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;
    const matrixEntry = {
      id: 'history.matrix',
      mode: 'matrix',
      inputLatex: 'det(A)',
      resultLatex: 'det',
      matrixSeed: {
        operation: 'detA',
        matrixA: [[2, 0], [0, 2]],
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(tableEntry);
    });
    expect(hook.result.current.tableRuntime.tablePrimaryLatex).toBe('x^3');

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(matrixEntry);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([[2, 0], [0, 2]]);
  });

  it('restores Vector history and patches the saved angle unit', () => {
    const { hook, patchSettings } = renderLinearAlgebraTableShell({ currentMode: 'vector' });
    const vectorEntry = {
      id: 'history.vector',
      mode: 'vector',
      inputLatex: 'angle',
      resultLatex: '90',
      vectorSeed: {
        operation: 'angle',
        vectorA: [1, 0, 0],
        vectorB: [0, 1, 0],
        angleUnit: 'deg',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(vectorEntry);
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 0, 0]);
    expect(hook.result.current.linearAlgebraRuntime.vectorB).toEqual([0, 1, 0]);
    expect(patchSettings).toHaveBeenCalledWith({ angleUnit: 'deg' });
  });
});
