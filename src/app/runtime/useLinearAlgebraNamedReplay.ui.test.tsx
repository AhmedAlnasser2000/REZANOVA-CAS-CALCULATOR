import { act, renderHook } from '@testing-library/react';
import { useRef, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { HistoryEntry, ModeId } from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderLinearAlgebraTableShell(currentMode: ModeId = 'matrix') {
  const currentModeRef = { current: currentMode } as RefObject<ModeId>;
  const hook = renderHook(
    (props: { currentMode: ModeId }) => {
      currentModeRef.current = props.currentMode;
      return useLinearAlgebraTableShellRuntime({
        activeFieldRef: useRef(null),
        angleUnit: 'rad',
        clearReplayVariableSubstitutions: vi.fn(),
        commitOutcome: vi.fn(),
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
    { initialProps: { currentMode } },
  );
  return { hook };
}

describe('linear algebra named replay snapshots', () => {
  it('restores named Matrix and Vector history snapshots after live names changed', () => {
    const { hook } = renderLinearAlgebraTableShell('matrix');
    const matrixEntry = {
      id: 'history.matrix.named',
      mode: 'matrix',
      inputLatex: 'C+B',
      resultLatex: 'sum',
      matrixSeed: {
        operation: 'add',
        matrixA: [[9, 0], [0, 9]],
        matrixB: [[5, 6], [7, 8]],
        editorExpressionLatex: 'C+B',
        matrixOperandLatexA: 'C',
        matrixOperandLatexB: 'B',
        matrixValues: [
          { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
          { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
          { id: 'matrix-c', name: 'C', value: [[9, 0], [0, 9]] },
        ],
        activeMatrixLeftId: 'matrix-c',
        activeMatrixRightId: 'matrix-b',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;
    const vectorEntry = {
      id: 'history.vector.named',
      mode: 'vector',
      inputLatex: 'q·v',
      resultLatex: '32',
      vectorSeed: {
        operation: 'dot',
        vectorA: [10, 0, 0],
        vectorB: [4, 5, 6],
        angleUnit: 'rad',
        editorExpressionLatex: 'q·v',
        vectorOperandLatexA: 'q',
        vectorOperandLatexB: 'v',
        vectorValues: [
          { id: 'vector-u', name: 'u', value: [1, 2, 3] },
          { id: 'vector-v', name: 'v', value: [4, 5, 6] },
          { id: 'vector-q', name: 'q', value: [10, 0, 0] },
        ],
        activeVectorLeftId: 'vector-q',
        activeVectorRightId: 'vector-v',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      const liveMatrixId = hook.result.current.linearAlgebraRuntime.addMatrixValue('D', [[4]]);
      hook.result.current.linearAlgebraRuntime.setActiveMatrixValueIds(liveMatrixId, 'matrix-a');
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(matrixEntry);
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixValues.map((value) => value.name)).toEqual(['A', 'B', 'C']);
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixLeftId).toBe('matrix-c');
    expect(hook.result.current.linearAlgebraRuntime.activeMatrixRightId).toBe('matrix-b');
    expect(hook.result.current.linearAlgebraRuntime.matrixSoftActions[0].label).toBe('C+B');
    expect(hook.result.current.linearAlgebraRuntime.matrixEditorLatex).toBe('C+B');

    act(() => {
      const liveVectorId = hook.result.current.linearAlgebraRuntime.addVectorValue('p', [7]);
      hook.result.current.linearAlgebraRuntime.setActiveVectorValueIds(liveVectorId, 'vector-u');
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(vectorEntry);
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorValues.map((value) => value.name)).toEqual(['u', 'v', 'q']);
    expect(hook.result.current.linearAlgebraRuntime.activeVectorLeftId).toBe('vector-q');
    expect(hook.result.current.linearAlgebraRuntime.activeVectorRightId).toBe('vector-v');
    expect(hook.result.current.linearAlgebraRuntime.vectorSoftActions[0].label).toBe('q·v');
    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe('q·v');
  });
});
