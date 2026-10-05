import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { answerOutdated, resolvedTargets, useNewEquationRuntime } from './useNewEquationRuntime';
import { blankEquationDraft, readEquationDraft } from './new-equation-drafts';
import { equationFailure, runEquationJob } from '../../lib/new-equation/runtime';
import type { EquationResponse } from '../../lib/new-equation/types';

vi.mock('../../lib/new-equation/runtime', async importOriginal => ({ ...await importOriginal<object>(), runEquationJob: vi.fn() }));
beforeEach(() => { localStorage.clear(); vi.mocked(runEquationJob).mockReset(); });
const settings = { outputStyle: 'both' as const, approxDigits: 8 };
function hook() {
  return renderHook(() => { const workspaces = useWorkspaceInstancesRuntime(); const equation = useNewEquationRuntime(workspaces, settings); return { workspaces, equation }; });
}

it('starts from the settings style, keeps tabs independent and restores drafts without answers', () => {
  const h = hook();
  act(() => h.result.current.equation.open());
  const first = h.result.current.workspaces.activeInstanceId;
  expect(h.result.current.equation.draftOf(first).style).toBe('both');
  const draft = { ...blankEquationDraft('both'), rows: ['x^2=a', 'a>0'], targets: ['x'], domain: 'real' as const, style: 'exact' as const };
  act(() => h.result.current.equation.change(first, draft));
  act(() => h.result.current.equation.open());
  expect(h.result.current.workspaces.activeInstanceId).not.toBe(first);
  expect(readEquationDraft(h.result.current.workspaces.activeInstance?.surfaceState).rows).toEqual(['', '']);
  h.unmount();
  const restored = hook();
  act(() => restored.result.current.equation.open());
  const tabs = restored.result.current.workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-equation');
  expect(tabs).toHaveLength(2);
  expect(readEquationDraft(tabs[0].surfaceState)).toEqual(draft);
  expect(restored.result.current.equation.views).toEqual({});
  expect(runEquationJob).not.toHaveBeenCalled();
});

it('sends the resolved unknowns and the settings digits; refuses inequalities over ℂ without starting a job', async () => {
  vi.mocked(runEquationJob).mockImplementation(async request => equationFailure(request, 'Fixture'));
  const h = hook();
  act(() => h.result.current.equation.open());
  const id = h.result.current.workspaces.activeInstanceId;
  act(() => h.result.current.equation.change(id, { ...blankEquationDraft(), rows: ['x^2+y^2=5', 'xy=2', 'x\\ne-1'] }));
  await act(async () => { await h.result.current.equation.run(id); });
  expect(vi.mocked(runEquationJob).mock.calls[0][0]).toMatchObject({ targets: ['x', 'y'], digits: 8, domain: 'real' });
  act(() => h.result.current.equation.change(id, { ...blankEquationDraft(), rows: ['x>1'], domain: 'complex' }));
  await act(async () => { await h.result.current.equation.run(id); });
  expect(runEquationJob).toHaveBeenCalledTimes(1);
  expect(h.result.current.equation.views[id].notice).toBe('Inequalities need real numbers.');
});

it('keeps the previous answer after an edit (outdated), aborts a running job on edit and on close', async () => {
  const pending: { signal: AbortSignal; resolve: (v: EquationResponse) => void }[] = [];
  vi.mocked(runEquationJob).mockImplementation((_r, _w, _rev, _c, _o, signal) => new Promise(resolve => pending.push({ signal, resolve })));
  const h = hook();
  act(() => h.result.current.equation.open());
  const id = h.result.current.workspaces.activeInstanceId;
  const draft = { ...blankEquationDraft(), rows: ['x^2=4', ''] };
  act(() => h.result.current.equation.change(id, draft));
  act(() => { void h.result.current.equation.run(id); });
  const answer = equationFailure({ rows: draft.rows, targets: ['x'], domain: 'real', limits: draft.limits, digits: 8 }, 'Fixture');
  await act(async () => pending[0].resolve(answer));
  expect(h.result.current.equation.views[id].response).toBe(answer);
  expect(answerOutdated(draft, answer)).toBe(false);
  expect(answerOutdated({ ...draft, style: 'decimal' }, answer)).toBe(false);
  expect(answerOutdated({ ...draft, rows: ['x^2=4', '', ''] }, answer)).toBe(false);
  const edited = { ...draft, rows: ['x^2=9', ''] };
  expect(answerOutdated(edited, answer)).toBe(true);
  act(() => { void h.result.current.equation.run(id); });
  act(() => h.result.current.equation.change(id, edited));
  expect(pending[1].signal.aborted).toBe(true);
  expect(h.result.current.equation.views[id].response).toBe(answer);
  act(() => { void h.result.current.equation.run(id); });
  act(() => h.result.current.workspaces.closeInstance(id));
  await waitFor(() => expect(pending[2].signal.aborted).toBe(true));
});

it('resolves unknowns automatically or from the chips', () => {
  expect(resolvedTargets({ ...blankEquationDraft(), rows: ['ax+b=0'] })).toEqual(['x']);
  expect(resolvedTargets({ ...blankEquationDraft(), rows: ['ax+b=0'], targets: ['a'] })).toEqual(['a']);
});
