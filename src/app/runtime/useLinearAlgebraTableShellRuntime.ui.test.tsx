import {
  act,
  renderHook,
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
  const setClipboardNotice = vi.fn();
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
        setClipboardNotice,
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
    setClipboardNotice,
    setRuntimeStatusOverride,
  };
}

describe('useLinearAlgebraTableShellRuntime', () => {
  it('builds host props for the active Linear/Table workspace', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'table' });
    const onCopyText = vi.fn();
    const onOpenGuideArticle = vi.fn();
    const onOpenGuideMode = vi.fn();

    const props = hook.result.current.buildWorkspaceHostProps({
      onCopyText,
      onOpenGuideArticle,
      onOpenGuideMode,
    });

    expect(props.currentMode).toBe('table');
    expect(props.tableRuntime.tablePrimaryLatex).toBe('x^2');
    expect(props.matrixKeyboardLayouts.length).toBeGreaterThan(0);
    expect(props.tableKeyboardLayouts.length).toBeGreaterThan(0);
    expect(props.vectorKeyboardLayouts.length).toBeGreaterThan(0);
    expect(props.onCopyText).toBe(onCopyText);
    expect(props.onOpenGuideArticle).toBe(onOpenGuideArticle);
    expect(props.onOpenGuideMode).toBe(onOpenGuideMode);
  });

  it('clears the active draft for Table, Matrix, and Vector modes', () => {
    const { hook } = renderLinearAlgebraTableShell({ currentMode: 'matrix' });

    act(() => {
      hook.result.current.linearAlgebraRuntime.setMatrixNotationLatex('A+B');
      hook.result.current.clearActiveLinearAlgebraTableDraft();
    });

    expect(hook.result.current.linearAlgebraRuntime.matrixNotationLatex).toBe('');

    act(() => {
      hook.result.current.linearAlgebraRuntime.setVectorNotationLatex('u+v');
    });
    hook.rerender({ currentMode: 'vector' });
    act(() => {
      hook.result.current.clearActiveLinearAlgebraTableDraft();
    });

    expect(hook.result.current.linearAlgebraRuntime.vectorNotationLatex).toBe('');

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
