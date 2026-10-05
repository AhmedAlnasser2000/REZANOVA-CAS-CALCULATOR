import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutputStyle } from '../../types/calculator';
import { autoTargets, checkRows, parseRow } from '../../lib/new-equation/parse';
import { equationFailure, runEquationJob } from '../../lib/new-equation/runtime';
import type { EquationDraft, EquationRequest, EquationResponse } from '../../lib/new-equation/types';
import { blankEquationDraft, loadEquationDrafts, readEquationDraft, saveEquationDrafts } from './new-equation-drafts';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { workspaceInstanceRuntimeContext } from './workspace-instances';

export type EquationViewState = { response?: EquationResponse; running?: boolean; notice?: string };
export interface EquationSettings { readonly outputStyle: OutputStyle; readonly approxDigits: number }

/** The unknowns a draft solves for: the user's chips, or the automatic pick from the rows. */
export function resolvedTargets(draft: EquationDraft): string[] {
  return draft.targets ?? autoTargets(draft.rows.map(parseRow));
}

/** Whether an answer was computed for different rows, unknowns or numbers than the draft now holds. */
export function answerOutdated(draft: EquationDraft, response: EquationResponse | undefined): boolean {
  if (!response) return false;
  const r = response.request, rows = (v: readonly string[]) => v.filter(x => parseRow(x).kind !== 'empty');
  return JSON.stringify(rows(r.rows)) !== JSON.stringify(rows(draft.rows)) || JSON.stringify(r.targets) !== JSON.stringify(resolvedTargets(draft)) || r.domain !== draft.domain;
}

/**
 * New Equation tabs: drafts per tab (restored on return, answers never stored), one worker job per tab, Stop,
 * and cancellation when a tab closes. Nothing recomputes on its own: an edit leaves the previous answer, outdated.
 */
export function useNewEquationRuntime(workspaces: ReturnType<typeof useWorkspaceInstancesRuntime>, settings: EquationSettings) {
  const current = useRef(workspaces);
  current.current = workspaces;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [views, setViews] = useState<Record<string, EquationViewState>>({});
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const jobs = useRef(new Map<string, AbortController>()), revisions = useRef(new Map<string, number>());
  const setView = useCallback((id: string, patch: Partial<EquationViewState>) => setViews(v => ({ ...v, [id]: { ...v[id], ...patch } })), []);
  const find = (id: string) => current.current.workspaceInstances.find(v => v.id === id);

  const stop = useCallback((id: string) => {
    jobs.current.get(id)?.abort();
    jobs.current.delete(id);
    setView(id, { running: false, notice: 'Stopped.' });
  }, [setView]);

  const open = useCallback(() => {
    if (!enteredRef.current) {
      enteredRef.current = true;
      setEntered(true);
      const saved = loadEquationDrafts(localStorage);
      if (saved.length) { current.current.createNewEquationTabs(saved.map(v => ({ title: v.title, state: { ...v.draft } }))); return; }
    }
    current.current.createNewEquationTabs([{ title: 'New Equation', state: { ...blankEquationDraft(settingsRef.current.outputStyle) } }]);
  }, []);

  const draftOf = useCallback((id: string) => readEquationDraft(find(id)?.surfaceState, settingsRef.current.outputStyle), []);

  const change = useCallback((id: string, draft: EquationDraft) => {
    const before = draftOf(id);
    const affectsRun = JSON.stringify({ ...before, style: '' }) !== JSON.stringify({ ...draft, style: '' });
    if (affectsRun && jobs.current.has(id)) {
      jobs.current.get(id)?.abort();
      jobs.current.delete(id);
      revisions.current.set(id, (revisions.current.get(id) ?? 0) + 1);
      setView(id, { running: false });
    }
    current.current.updateInstanceSurfaceState(id, { ...draft });
    if (affectsRun) setView(id, { notice: undefined });
  }, [draftOf, setView]);

  const run = useCallback(async (id: string) => {
    const instance = find(id);
    if (!instance) return;
    const workspace = workspaceInstanceRuntimeContext(instance);
    if (!workspace) return;
    const draft = draftOf(id), targets = resolvedTargets(draft);
    const check = checkRows(draft.rows.map(parseRow), targets, draft.domain);
    if (!check.ready) {
      setView(id, { notice: check.orderOverComplex ? 'Inequalities need real numbers.' : check.missingTargets.length ? `${check.missingTargets.join(', ')} ${check.missingTargets.length > 1 ? 'do' : 'does'} not appear in an equation row.` : 'Fix the marked rows first.' });
      return;
    }
    jobs.current.get(id)?.abort();
    const abort = new AbortController();
    jobs.current.set(id, abort);
    const revision = (revisions.current.get(id) ?? 0) + 1;
    revisions.current.set(id, revision);
    const request: EquationRequest = { rows: [...draft.rows], targets, domain: draft.domain, limits: { ...draft.limits }, digits: settingsRef.current.approxDigits };
    setView(id, { running: true, notice: undefined });
    try {
      const result = await runEquationJob(request, workspace, revision, () => revisions.current.get(id) ?? 0,
        () => current.current.workspaceInstances.some(v => v.id === id), abort.signal);
      if (result && !abort.signal.aborted) setView(id, { response: result });
    } catch (e) {
      if (!abort.signal.aborted && current.current.workspaceInstances.some(v => v.id === id)) {
        setView(id, { response: equationFailure(request, e instanceof Error ? e.message : String(e)) });
      }
    } finally {
      if (jobs.current.get(id) === abort) { jobs.current.delete(id); setView(id, { running: false }); }
    }
  }, [draftOf, setView]);

  useEffect(() => {
    const ids = new Set(workspaces.workspaceInstances.map(v => v.id));
    for (const [id, job] of jobs.current) if (!ids.has(id)) { job.abort(); jobs.current.delete(id); revisions.current.delete(id); }
    setViews(previous => {
      const removed = Object.keys(previous).filter(id => !ids.has(id));
      if (!removed.length) return previous;
      const next = { ...previous };
      for (const id of removed) delete next[id];
      return next;
    });
    if (!entered) return;
    try {
      saveEquationDrafts(localStorage, workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-equation')
        .map(v => ({ title: v.title, draft: readEquationDraft(v.surfaceState, settingsRef.current.outputStyle) })));
    } catch (e) {
      setView(workspaces.activeInstanceId, { notice: e instanceof Error ? e.message : 'Drafts cannot be saved here.' });
    }
  }, [entered, workspaces.workspaceInstances, workspaces.activeInstanceId, setView]);

  useEffect(() => {
    const running = jobs.current;
    return () => { for (const job of running.values()) job.abort(); running.clear(); };
  }, []);

  return { views, open, change, run, stop, draftOf };
}
export type NewEquationRuntime = ReturnType<typeof useNewEquationRuntime>;
