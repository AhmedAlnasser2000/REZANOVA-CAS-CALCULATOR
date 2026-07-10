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
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import { useLinearAlgebraTableShellRuntime } from './useLinearAlgebraTableShellRuntime';

function renderVectorRuntime() {
  const currentModeRef = { current: 'vector' } as RefObject<ModeId>;
  const commitOutcome = vi.fn();
  const hook = renderHook(() => useLinearAlgebraTableShellRuntime({
    activeFieldRef: useRef(null),
    angleUnit: 'rad',
    clearReplayVariableSubstitutions: vi.fn(),
    commitOutcome,
    currentMode: 'vector',
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

describe('useLinearAlgebraTableShellRuntime multi-vector editor expressions', () => {
  it('runs arbitrary named vector compositions through the Vector editor', async () => {
    const { commitOutcome, hook } = renderVectorRuntime();

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

    let pId = '';
    let qId = '';
    let rId = '';
    act(() => {
      pId = hook.result.current.linearAlgebraRuntime.addVectorValue('p', [1, 1]);
      qId = hook.result.current.linearAlgebraRuntime.addVectorValue('q', [1, 0]);
      rId = hook.result.current.linearAlgebraRuntime.addVectorValue('r', [0, 1]);
    });

    const generalProjection = await runVectorExpression('\\operatorname{proj}\\left(p,q\\right)');
    expect(generalProjection).toMatchObject({
      kind: 'success',
      title: '\\operatorname{proj}\\left(p,q\\right)',
      sourceMode: 'vector',
      exactLatex: '\\begin{bmatrix}\\frac{1}{2}\\\\\\frac{1}{2}\\end{bmatrix}',
    });

    const composedNorm = await runVectorExpression('\\left\\lVert p-q\\right\\rVert');
    expect(composedNorm).toMatchObject({
      kind: 'success',
      title: '\\left\\lVert p-q\\right\\rVert',
      sourceMode: 'vector',
      exactLatex: '1',
    });

    const exactCombination = await runVectorExpression('2p-q/3');
    expect(exactCombination).toMatchObject({
      kind: 'success',
      title: '2p-\\frac{q}{3}',
      sourceMode: 'vector',
      exactLatex: '\\begin{bmatrix}\\frac{5}{3}\\\\2\\end{bmatrix}',
      approxText: undefined,
    });

    const composedGram = await runVectorExpression('\\operatorname{gram}\\left(p,q\\right)');
    expect(composedGram).toMatchObject({
      kind: 'success',
      title: '\\operatorname{gram}\\left(p,q\\right)',
      sourceMode: 'vector',
    });
    expect(composedGram.kind === 'success' ? composedGram.detailSections?.map((section) => section.title) : [])
      .toEqual(['Orthonormal Basis', 'Gram-Schmidt Proof']);

    const span = await runVectorExpression('span(p,q,r)');
    expect(span).toMatchObject({
      kind: 'success',
      title: '\\operatorname{span}\\left(p,q,r\\right)',
      exactLatex: '\\operatorname{span}\\left(p,q,r\\right)=\\operatorname{span}\\left\\{p,q\\right\\}',
      approxText: undefined,
    });
    expect(span.kind === 'success' ? span.detailSections?.[1]?.lines : []).toContain('p-q-r=0');

    act(() => {
      hook.result.current.linearAlgebraRuntime.resizeVectorValueById(pId, 3);
      hook.result.current.linearAlgebraRuntime.resizeVectorValueById(qId, 3);
      hook.result.current.linearAlgebraRuntime.resizeVectorValueById(rId, 3);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(pId, 0, 1);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(pId, 1, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(pId, 2, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(qId, 0, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(qId, 1, 1);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(qId, 2, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(rId, 0, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(rId, 1, 0);
      hook.result.current.linearAlgebraRuntime.setVectorValueCell(rId, 2, 2);
    });

    const cross = await runVectorExpression('\\operatorname{cross}\\left(p,q\\right)');
    expect(cross).toMatchObject({
      kind: 'success',
      title: 'p\\times q',
      sourceMode: 'vector',
      exactLatex: '\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}',
    });

    const triple = await runVectorExpression('\\operatorname{triple}\\left(p,q,r\\right)');
    expect(triple).toMatchObject({
      kind: 'success',
      title: '\\operatorname{triple}\\left(p,q,r\\right)',
      sourceMode: 'vector',
      exactLatex: '2',
    });
  });
});
