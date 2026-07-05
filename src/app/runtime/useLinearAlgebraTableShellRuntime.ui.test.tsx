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
  DisplayOutcome,
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

  it('resizes Matrix and Vector named inputs while preserving existing values', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.resizeMatrix('A', 3, 4);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([
      [1, 2, 0, 0],
      [3, 4, 0, 0],
      [0, 0, 0, 0],
    ]);

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixCell('A', 2, 3, 9);
      hook.result.current.linearAlgebraRuntime.resizeMatrix('A', 2, 2);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixA).toEqual([
      [1, 2],
      [3, 4],
    ]);

    act(() => {
      hook.result.current.linearAlgebraRuntime.resizeMatrix('B', 0, 20);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixB).toEqual([[5, 6, 0, 0, 0, 0, 0, 0]]);

    act(() => {
      hook.result.current.linearAlgebraRuntime.resizeVector('A', 5);
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 2, 3, 0, 0]);

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorCell('A', 4, 9);
      hook.result.current.linearAlgebraRuntime.resizeVector('A', 2);
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 2]);

    act(() => {
      hook.result.current.linearAlgebraRuntime.resizeVector('B', 20);
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorB).toEqual([4, 5, 6, 0, 0, 0, 0, 0]);
  });

  it('manages Matrix and Vector named-value registries with stable ids', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    expect(hook.result.current.linearAlgebraRuntime.matrixValues.map((value) => value.name)).toEqual(['A', 'B']);
    expect(hook.result.current.linearAlgebraRuntime.vectorValues.map((value) => value.name)).toEqual(['u', 'v']);

    let matrixId = '';
    act(() => {
      matrixId = hook.result.current.linearAlgebraRuntime.addMatrixValue('C', [[9, 0], [0, 9]]);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues).toContainEqual({
      id: matrixId,
      name: 'C',
      value: [[9, 0], [0, 9]],
    });
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixLeftId).toBe(matrixId);

    act(() => {
      hook.result.current.linearAlgebraRuntime.renameMatrixValue(matrixId, 'D');
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues).toContainEqual({
      id: matrixId,
      name: 'D',
      value: [[9, 0], [0, 9]],
    });

    act(() => {
      hook.result.current.linearAlgebraRuntime.renameMatrixValue(matrixId, 'A');
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues.find((value) => value.id === matrixId)?.name).toBe('D');

    let duplicateMatrixId = '';
    act(() => {
      duplicateMatrixId = hook.result.current.linearAlgebraRuntime.duplicateMatrixValue(matrixId);
    });
    expect(duplicateMatrixId).not.toBe(matrixId);
    expect(hook.result.current.linearAlgebraRuntime.matrixValues.find((value) => value.id === duplicateMatrixId)).toMatchObject({
      name: 'C',
      value: [[9, 0], [0, 9]],
    });
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixLeftId).toBe(duplicateMatrixId);

    act(() => {
      hook.result.current.linearAlgebraRuntime.setActiveMatrixValueIds(matrixId, duplicateMatrixId);
      hook.result.current.linearAlgebraRuntime.deleteMatrixValue(matrixId);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues.some((value) => value.id === matrixId)).toBe(false);
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixLeftId).toBe('matrix-a');
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixRightId).toBe(duplicateMatrixId);

    let vectorId = '';
    act(() => {
      vectorId = hook.result.current.linearAlgebraRuntime.addVectorValue('p', [7, 8, 9]);
    });
    act(() => {
      hook.result.current.linearAlgebraRuntime.renameVectorValue(vectorId, 'q');
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorValues).toContainEqual({
      id: vectorId,
      name: 'q',
      value: [7, 8, 9],
    });
    expect(hook.result.current.linearAlgebraRuntime.activeVectorLeftId).toBe(vectorId);
    act(() => {
      hook.result.current.linearAlgebraRuntime.renameVectorValue(vectorId, 'u');
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorValues.find((value) => value.id === vectorId)?.name).toBe('q');
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

  it('captures registry surface state and restores old fixed A/B u/v snapshots', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    let matrixId = '';
    let vectorId = '';
    act(() => {
      matrixId = hook.result.current.linearAlgebraRuntime.addMatrixValue('C', [[3, 0], [0, 3]]);
      vectorId = hook.result.current.linearAlgebraRuntime.addVectorValue('p', [3, 4]);
      hook.result.current.linearAlgebraRuntime.setActiveMatrixValueIds(matrixId, 'matrix-b');
      hook.result.current.linearAlgebraRuntime.setActiveVectorValueIds(vectorId, 'vector-v');
    });

    const matrixSnapshot = hook.result.current.captureMatrixSurfaceState();
    const vectorSnapshot = hook.result.current.captureVectorSurfaceState();
    expect(matrixSnapshot.matrixValues?.map((value) => value.name)).toEqual(['A', 'B', 'C']);
    expect(vectorSnapshot.vectorValues?.map((value) => value.name)).toEqual(['u', 'v', 'p']);
    expect(matrixSnapshot.activeMatrixLeftId).toBe(matrixId);
    expect(vectorSnapshot.activeVectorLeftId).toBe(vectorId);

    act(() => {
      hook.result.current.restoreMatrixSurfaceState({
        matrixA: [[9]],
        matrixB: [[8]],
        matrixEditorLatex: 'A+B',
      });
      hook.result.current.restoreVectorSurfaceState({
        vectorA: [9],
        vectorB: [8],
        vectorEditorLatex: 'u+v',
      });
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixValues).toEqual([
      { id: 'matrix-a', name: 'A', value: [[9]] },
      { id: 'matrix-b', name: 'B', value: [[8]] },
    ]);
    expect(hook.result.current.linearAlgebraRuntime.vectorValues).toEqual([
      { id: 'vector-u', name: 'u', value: [9] },
      { id: 'vector-v', name: 'v', value: [8] },
    ]);

    act(() => {
      hook.result.current.restoreMatrixSurfaceState(matrixSnapshot);
      hook.result.current.restoreVectorSurfaceState(vectorSnapshot);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues.map((value) => value.name)).toEqual(['A', 'B', 'C']);
    expect(hook.result.current.linearAlgebraRuntime.vectorValues.map((value) => value.name)).toEqual(['u', 'v', 'p']);
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
        matrixSeed: expect.objectContaining({
          operation: 'add',
          editorExpressionLatex: 'A+B',
          matrixOperandLatexA: 'A',
          matrixOperandLatexB: 'B',
        }),
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
        vectorSeed: expect.objectContaining({
          operation: 'dot',
          editorExpressionLatex: 'u\\cdot v',
          vectorOperandLatexA: 'u',
          vectorOperandLatexB: 'v',
        }),
      }),
    ));
  });

  it('runs editor expressions against registry names beyond the defaults', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.addMatrixValue('C', [[1, 0], [0, 1]]);
      hook.result.current.linearAlgebraRuntime.addMatrixValue('D', [[2, 2], [3, 3]]);
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('C+D');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '\\begin{bmatrix}3 & 2\\\\3 & 4\\end{bmatrix}',
      }),
      'C+D',
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({
          operation: 'add',
          matrixOperandLatexA: 'C',
          matrixOperandLatexB: 'D',
        }),
      }),
    ));

    commitOutcome.mockClear();
    hook.rerender({ currentMode: 'vector' });
    act(() => {
      hook.result.current.linearAlgebraRuntime.addVectorValue('p', [1, 0, 0]);
      hook.result.current.linearAlgebraRuntime.addVectorValue('q', [2, 3, 4]);
      hook.result.current.linearAlgebraRuntime.setVectorEditorLatex('p\\cdot q');
    });
    act(() => {
      hook.result.current.runVectorEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '2',
      }),
      'p\\cdot q',
      'vector',
      expect.objectContaining({
        vectorSeed: expect.objectContaining({
          operation: 'dot',
          vectorOperandLatexA: 'p',
          vectorOperandLatexB: 'q',
        }),
      }),
    ));
  });

  it('runs soft-key actions against the selected active Matrix and Vector operands', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    let matrixId = '';
    act(() => {
      matrixId = hook.result.current.linearAlgebraRuntime.addMatrixValue('C', [[9, 0], [0, 9]]);
      hook.result.current.linearAlgebraRuntime.setActiveMatrixValueIds(matrixId, 'matrix-b');
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixSoftActions[0].label).toBe('C+B');
    expect(hook.result.current.linearAlgebraRuntime.matrixSoftActions[3].label).toBe('det(C)');

    act(() => {
      hook.result.current.runMatrixAction('add');
    });
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '\\begin{bmatrix}14 & 6\\\\7 & 17\\end{bmatrix}',
      }),
      'C+B',
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({
          operation: 'add',
          matrixA: [[9, 0], [0, 9]],
          matrixB: [[5, 6], [7, 8]],
          editorExpressionLatex: 'C+B',
          matrixOperandLatexA: 'C',
          matrixOperandLatexB: 'B',
          matrixValues: expect.arrayContaining([
            { id: matrixId, name: 'C', value: [[9, 0], [0, 9]] },
            { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
          ]),
          activeMatrixLeftId: matrixId,
          activeMatrixRightId: 'matrix-b',
        }),
      }),
    ));

    commitOutcome.mockClear();
    hook.rerender({ currentMode: 'vector' });

    let vectorId = '';
    act(() => {
      vectorId = hook.result.current.linearAlgebraRuntime.addVectorValue('p', [10, 0, 0]);
      hook.result.current.linearAlgebraRuntime.setActiveVectorValueIds(vectorId, 'vector-v');
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorSoftActions[0].label).toBe('p·v');
    expect(hook.result.current.linearAlgebraRuntime.vectorSoftActions[2].label).toBe('‖p‖');

    act(() => {
      hook.result.current.runVectorAction('dot');
    });
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        exactLatex: '40',
      }),
      'p·v',
      'vector',
      expect.objectContaining({
        vectorSeed: expect.objectContaining({
          operation: 'dot',
          vectorA: [10, 0, 0],
          vectorB: [4, 5, 6],
          editorExpressionLatex: 'p·v',
          vectorOperandLatexA: 'p',
          vectorOperandLatexB: 'v',
          vectorValues: expect.arrayContaining([
            { id: vectorId, name: 'p', value: [10, 0, 0] },
            { id: 'vector-v', name: 'v', value: [4, 5, 6] },
          ]),
          activeVectorLeftId: vectorId,
          activeVectorRightId: 'vector-v',
        }),
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
          editorExpressionLatex: 'A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}',
          matrixOperandLatexA: 'A',
          systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
        }),
      }),
    ));
  });

  it('runs Matrix rank from the main editor', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex('\\operatorname{rank}\\left(A\\right)');
    });
    act(() => {
      hook.result.current.runMatrixEditorAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        title: 'rank(A)',
        exactLatex: '2',
      }),
      '\\operatorname{rank}\\left(A\\right)',
      'matrix',
      expect.objectContaining({
        matrixSeed: expect.objectContaining({ operation: 'rankA' }),
      }),
    ));
  });

  it('keeps Matrix inline editor titles and cards tied to the typed expression', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    async function runMatrixExpression(latex: string) {
      commitOutcome.mockClear();
      act(() => {
        hook.result.current.linearAlgebraRuntime.setMatrixEditorLatex(latex);
      });
      act(() => {
        hook.result.current.runMatrixEditorAction();
      });

      await waitFor(() => expect(commitOutcome).toHaveBeenCalled());
      return commitOutcome.mock.calls.at(-1)?.[0] as DisplayOutcome;
    }

    const detLatex = '\\det\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&\\frac{1}{3}\\end{bmatrix}\\right)';
    const det = await runMatrixExpression(detLatex);
    expect(det).toMatchObject({
      kind: 'success',
      title: detLatex,
      exactLatex: '\\frac{1}{6}',
      sourceMode: 'matrix',
    });

    const rrefLatex = '\\operatorname{rref}\\left(\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}\\right)';
    const rref = await runMatrixExpression(rrefLatex);
    expect(rref).toMatchObject({
      kind: 'success',
      title: rrefLatex,
      exactLatex: '\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}',
    });
    expect(rref.kind === 'success' ? rref.detailSections?.[0] : undefined).toMatchObject({
      title: 'Row Reduction Steps',
      lines: ['R_{2}\\leftarrow R_{2}-2R_{1}'],
    });

    const nullLatex = '\\operatorname{null}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)';
    const nullSpace = await runMatrixExpression(nullLatex);
    expect(nullSpace.kind === 'success' ? nullSpace.exactLatex : '').toContain(
      '\\operatorname{Null}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})',
    );
    expect(nullSpace.kind === 'success' ? nullSpace.detailSections?.[0]?.lines : []).toContain(
      '\\operatorname{rank}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=1',
    );

    const colLatex = '\\operatorname{col}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)';
    const columnSpace = await runMatrixExpression(colLatex);
    expect(columnSpace.kind === 'success' ? columnSpace.exactLatex : '').toContain(
      '\\operatorname{Col}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})',
    );
    expect(columnSpace.kind === 'success' ? columnSpace.detailSections?.[1]?.lines : []).toContain(
      'The pivot columns of the original matrix form a basis for its column space.',
    );

    const basisLatex = '\\operatorname{basis}\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)';
    const basis = await runMatrixExpression(basisLatex);
    expect(basis).toMatchObject({
      kind: 'success',
      title: basisLatex,
      exactLatex: '\\operatorname{basis}(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix})=\\text{Yes}',
    });
    expect(basis.kind === 'success' ? basis.detailSections?.map((section) => section.title) : [])
      .toContain('Basis Proof');

    const qrLatex = '\\operatorname{qr}\\left(\\begin{bmatrix}3&0\\\\4&5\\end{bmatrix}\\right)';
    const qr = await runMatrixExpression(qrLatex);
    expect(qr).toMatchObject({
      kind: 'success',
      title: qrLatex,
      sourceMode: 'matrix',
    });
    expect(qr.kind === 'success' ? qr.approxText : undefined).toBeUndefined();
    expect(qr.kind === 'success' ? qr.detailSections?.map((section) => section.title) : [])
      .toEqual(['QR Factors', 'QR Proof', 'QR Column Steps']);

    const projectionLatex = '\\operatorname{projcol}\\left(\\begin{bmatrix}1&0\\\\0&1\\\\0&0\\end{bmatrix},\\begin{bmatrix}2\\\\3\\\\4\\end{bmatrix}\\right)';
    const projection = await runMatrixExpression(projectionLatex);
    expect(projection).toMatchObject({
      kind: 'success',
      title: projectionLatex,
      sourceMode: 'matrix',
    });
    expect(projection.kind === 'success' ? projection.approxText : undefined).toBeUndefined();
    expect(projection.kind === 'success' ? projection.detailSections?.map((section) => section.title) : [])
      .toEqual(['Column Projection Facts', 'Column Projection Proof']);

    const leastSquaresLatex = '\\operatorname{ls}\\left(\\begin{bmatrix}1&0\\\\0&1\\\\0&0\\end{bmatrix},\\begin{bmatrix}2\\\\3\\\\4\\end{bmatrix}\\right)';
    const leastSquares = await runMatrixExpression(leastSquaresLatex);
    expect(leastSquares).toMatchObject({
      kind: 'success',
      title: leastSquaresLatex,
      sourceMode: 'matrix',
    });
    expect(leastSquares.kind === 'success' ? leastSquares.approxText : undefined).toBeUndefined();
    expect(leastSquares.kind === 'success' ? leastSquares.detailSections?.map((section) => section.title) : [])
      .toEqual(['Least-Squares Solution', 'Residual Vector', 'Least-Squares Proof']);

    const eigenLatex = '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)';
    const eigen = await runMatrixExpression(eigenLatex);
    expect(eigen).toMatchObject({
      kind: 'success',
      title: eigenLatex,
      sourceMode: 'matrix',
    });
    expect(eigen.kind === 'success' ? eigen.approxText : undefined).toBeUndefined();
    expect(eigen.kind === 'success' ? eigen.detailSections?.map((section) => section.title) : [])
      .toContain('How Eigenvalues Were Found');
    expect(eigen.kind === 'success' ? eigen.detailSections?.map((section) => section.title) : [])
      .not.toContain('Equation Boundary');
    expect(eigen.kind === 'success' ? eigen.detailSections?.[2]?.lines : []).toContain(
      'E_{3}=\\operatorname{Null}(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}-3I)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}',
    );

    const diagonalizeLatex = '\\operatorname{diag}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)';
    const diagonalized = await runMatrixExpression(diagonalizeLatex);
    expect(diagonalized).toMatchObject({
      kind: 'success',
      title: diagonalizeLatex,
      sourceMode: 'matrix',
    });
    expect(diagonalized.kind === 'success' ? diagonalized.approxText : undefined).toBeUndefined();
    expect(diagonalized.kind === 'success' ? diagonalized.detailSections?.map((section) => section.title) : [])
      .toEqual(['Characteristic Polynomial', 'Diagonalization Factors', 'Diagonalization Proof', 'Eigenvector Columns', 'Eigenspaces']);

    const powerLatex = '\\operatorname{mpow}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix},3\\right)';
    const power = await runMatrixExpression(powerLatex);
    expect(power).toMatchObject({
      kind: 'success',
      title: powerLatex,
      sourceMode: 'matrix',
    });
    expect(power.kind === 'success' ? power.approxText : undefined).toBeUndefined();
    expect(power.kind === 'success' ? power.detailSections?.map((section) => section.title) : [])
      .toEqual(['Characteristic Polynomial', 'Power Factors', 'Power via Diagonalization', 'Diagonalization Proof']);
  });

  it('keeps Vector editor cards mode-owned and rejects Matrix-only inputs cleanly', async () => {
    const { commitOutcome, hook } = renderLinearAlgebraTableShell({ currentMode: 'vector' });

    async function runVectorExpression(latex: string) {
      commitOutcome.mockClear();
      act(() => {
        hook.result.current.linearAlgebraRuntime.setVectorEditorLatex(latex);
      });
      act(() => {
        hook.result.current.runVectorEditorAction();
      });

      await waitFor(() => expect(commitOutcome).toHaveBeenCalled());
      return commitOutcome.mock.calls.at(-1)?.[0] as DisplayOutcome;
    }

    const projection = await runVectorExpression('\\operatorname{proj}_{u}\\left(v\\right)');
    expect(projection).toMatchObject({
      kind: 'success',
      title: 'proj_u(v)',
      sourceMode: 'vector',
    });

    const gram = await runVectorExpression('\\operatorname{gram}\\left(u,v\\right)');
    expect(gram).toMatchObject({
      kind: 'success',
      title: 'gram(u,v)',
      sourceMode: 'vector',
    });
    expect(gram.kind === 'success' ? gram.approxText : undefined).toBeUndefined();
    expect(gram.kind === 'success' ? gram.detailSections?.map((section) => section.title) : [])
      .toEqual(['Orthonormal Basis', 'Gram-Schmidt Proof']);

    const unsupported = await runVectorExpression('\\operatorname{invertible}\\left(A\\right)');
    expect(unsupported).toMatchObject({
      kind: 'error',
      title: 'Vector',
      error: 'This Vector editor expression is not executable in Vector mode.',
    });
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
        editorExpressionLatex: '\\det\\left(A\\right)',
        matrixOperandLatexA: 'A',
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
    expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe('\\det\\left(A\\right)');
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
        editorExpressionLatex: '\\angle\\left(u,v\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(vectorEntry);
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorA).toEqual([1, 0, 0]);
    expect(hook.result.current.linearAlgebraRuntime.vectorB).toEqual([0, 1, 0]);
    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe('\\angle\\left(u,v\\right)');
    expect(patchSettings).toHaveBeenCalledWith({ angleUnit: 'deg' });
  });
});
