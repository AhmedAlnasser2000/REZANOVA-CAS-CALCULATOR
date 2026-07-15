import { act, renderHook } from '@testing-library/react';
import { useRef, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ModeId } from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';
import { historyEntryFixture } from '../../test-utils/history-result-document';

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
  it('restores symbolic source cells and the recorded substitution snapshot without reading live Variables', () => {
    const { hook } = renderLinearAlgebraTableShell('matrix');
    const source = { version: 1 as const, canonicalLatex: 'a', mathJson: 'a' as const };
    const resolved = {
      version: 1 as const,
      canonicalLatex: '2',
      mathJson: 2 as const,
      exactRational: { numerator: 2, denominator: 1 },
      exactComplexRational: {
        re: { numerator: 2, denominator: 1 },
        im: { numerator: 0, denominator: 1 },
      },
    };
    const entry = historyEntryFixture({
      id: 'history.matrix.scalar',
      mode: 'matrix',
      inputLatex: '\\det(A)',
      resultLatex: '2',
      matrixSeed: {
        operation: 'detA',
        operandEncoding: 'scalar-v1',
        matrixA: { encoding: 'scalar-v1', source: [[source]], resolved: [[resolved]] },
        matrixValues: [{ id: 'matrix-a', name: 'A', encoding: 'scalar-v1', value: [[source]] }],
        activeMatrixLeftId: 'matrix-a',
        activeMatrixRightId: 'matrix-a',
        domain: 'complex',
        substitutionMode: 'use-stored-values',
        substitutionSnapshot: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
        complexExactForm: 'cis',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    });

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(entry);
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixValues[0]).toMatchObject({
      encoding: 'scalar-v1',
      value: [[{ canonicalLatex: 'a' }]],
    });
    expect(hook.result.current.linearAlgebraRuntime.matrixDomain).toBe('complex');
    expect(hook.result.current.linearAlgebraRuntime.matrixSubstitutionMode).toBe('use-stored-values');
    expect(hook.result.current.linearAlgebraRuntime.matrixStoredVariables).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
  });

  it('restores the original Complex Vector domain and recorded substitution snapshot', () => {
    const { hook } = renderLinearAlgebraTableShell('vector');
    const source = { version: 1 as const, canonicalLatex: 'a', mathJson: 'a' as const };
    const resolved = {
      version: 1 as const,
      canonicalLatex: '2',
      mathJson: 2 as const,
      exactRational: { numerator: 2, denominator: 1 },
      exactComplexRational: {
        re: { numerator: 2, denominator: 1 },
        im: { numerator: 0, denominator: 1 },
      },
    };
    const entry = historyEntryFixture({
      id: 'history.vector.scalar',
      mode: 'vector',
      inputLatex: 'u·v',
      resultLatex: '4',
      vectorSeed: {
        operation: 'dot',
        operandEncoding: 'scalar-v1',
        vectorA: { encoding: 'scalar-v1', source: [source], resolved: [resolved] },
        vectorB: { encoding: 'scalar-v1', source: [source], resolved: [resolved] },
        vectorValues: [
          { id: 'vector-u', name: 'u', encoding: 'scalar-v1', value: [source] },
          { id: 'vector-v', name: 'v', encoding: 'scalar-v1', value: [source] },
        ],
        activeVectorLeftId: 'vector-u',
        activeVectorRightId: 'vector-v',
        angleUnit: 'rad',
        domain: 'complex',
        substitutionMode: 'use-stored-values',
        substitutionSnapshot: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
        complexExactForm: 'cis',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    });

    act(() => {
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(entry);
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorValues[0]).toMatchObject({
      encoding: 'scalar-v1',
      value: [{ canonicalLatex: 'a' }],
    });
    expect(hook.result.current.linearAlgebraRuntime.vectorDomain).toBe('complex');
    expect(hook.result.current.linearAlgebraRuntime.vectorSubstitutionMode).toBe('use-stored-values');
    expect(hook.result.current.linearAlgebraRuntime.vectorStoredVariables).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
  });

  it('restores named Matrix and Vector history snapshots after live names changed', () => {
    const { hook } = renderLinearAlgebraTableShell('matrix');
    const matrixEntry = historyEntryFixture({
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
    });
    const vectorEntry = historyEntryFixture({
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
    });

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

  it('restores a variadic Vector family snapshot after live values are replaced', () => {
    const { hook } = renderLinearAlgebraTableShell('vector');
    const familyEntry = historyEntryFixture({
      id: 'history.vector.family',
      mode: 'vector',
      inputLatex: '\\operatorname{span}\\left(p,q,r\\right)',
      resultLatex: '\\operatorname{span}\\left(p,q,r\\right)=\\operatorname{span}\\left\\{p,q\\right\\}',
      vectorSeed: {
        operation: 'span',
        vectorA: [1, 0],
        vectorB: [0, 1],
        vectorOperands: [[1, 0], [0, 1], [1, 1]],
        exactVectorOperands: [
          [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
        ],
        vectorOperandLatexList: ['p', 'q', 'r'],
        editorExpressionLatex: '\\operatorname{span}\\left(p,q,r\\right)',
        vectorValues: [
          { id: 'vector-p', name: 'p', value: [1, 0] },
          { id: 'vector-q', name: 'q', value: [0, 1] },
          { id: 'vector-r', name: 'r', value: [1, 1] },
        ],
        activeVectorLeftId: 'vector-p',
        activeVectorRightId: 'vector-q',
        angleUnit: 'rad',
      },
      timestamp: '2026-07-10T00:00:00.000Z',
    });

    act(() => {
      hook.result.current.linearAlgebraRuntime.addVectorValue('p', [9, 9]);
      hook.result.current.restoreLinearAlgebraTableHistoryEntry(familyEntry);
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorValues)
      .toEqual(familyEntry.vectorSeed?.vectorValues);
    expect(hook.result.current.linearAlgebraRuntime.vectorEditorLatex).toBe(familyEntry.inputLatex);
    expect(hook.result.current.linearAlgebraRuntime.activeVectorLeftId).toBe('vector-p');
    expect(hook.result.current.linearAlgebraRuntime.activeVectorRightId).toBe('vector-q');
  });
});
