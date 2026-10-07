import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutputStyle } from '../../types/calculator';
import { autoTargets, checkRows, isBlankRow, type ParsedRow } from '../../lib/new-equation/parse';
import { rowReader } from '../../lib/new-equation/row-reader';
import { equationFailure, runEquationJob } from '../../lib/new-equation/runtime';
import type { EquationDraft, EquationPreview, EquationRequest, EquationResponse } from '../../lib/new-equation/types';
import { blankEquationDraft, loadEquationDrafts, readEquationDraft, saveEquationDrafts } from './new-equation-drafts';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { workspaceInstanceRuntimeContext } from './workspace-instances';

/** Why a shown answer was not checked: Stop or an edit ('cancelled'), or a limit reached while verifying. */
export type UncheckedReason = 'cancelled' | 'work' | 'allocation' | 'result-size';
/**
 * A tab's answer state (NEW-EQUATION-RESPONSIVE1). `preview` is the decided answer while it is not checked yet (with
 * `unchecked` once verification can no longer finish); `response` is the last verified (or failed) run; `withdrawn`
 * marks a response whose shown preview failed verification.
 */
export type EquationViewState = {
  response?: EquationResponse; preview?: EquationPreview; unchecked?: UncheckedReason; withdrawn?: boolean; running?: boolean; notice?: string;
};
export interface EquationSettings { readonly outputStyle: OutputStyle; readonly approxDigits: number }

/** The unknowns a draft solves for: the user's chips, or the automatic pick from its read rows. */
export function resolvedTargets(draft: EquationDraft, rows: readonly ParsedRow[]): string[] {
  return draft.targets ?? autoTargets(rows);
}

/** Whether an answer was computed for different rows, unknowns or numbers than the draft (solving for `targets`) now holds. */
export function answerOutdated(draft: EquationDraft, response: { request: EquationRequest } | undefined, targets: readonly string[]): boolean {
  if (!response) return false;
  const r = response.request, rows = (v: readonly string[]) => v.filter(x => !isBlankRow(x));
  return JSON.stringify(rows(r.rows)) !== JSON.stringify(rows(draft.rows)) || JSON.stringify(r.targets) !== JSON.stringify(targets) || r.domain !== draft.domain;
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

  // A preview still being verified when its run ends without a verdict stays shown, marked as not checked.
  const leaveUnchecked = useCallback((id: string, reason: UncheckedReason) =>
    setViews(v => (v[id]?.preview && !v[id]?.unchecked ? { ...v, [id]: { ...v[id], unchecked: reason } } : v)), []);

  const stop = useCallback((id: string) => {
    jobs.current.get(id)?.abort();
    jobs.current.delete(id);
    setView(id, { running: false, notice: 'Stopped.' });
    leaveUnchecked(id, 'cancelled');
  }, [setView, leaveUnchecked]);

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
      leaveUnchecked(id, 'cancelled');
    }
    current.current.updateInstanceSurfaceState(id, { ...draft });
    if (affectsRun) setView(id, { notice: undefined });
  }, [draftOf, setView, leaveUnchecked]);

  const run = useCallback(async (id: string) => {
    const instance = find(id);
    if (!instance) return;
    const workspace = workspaceInstanceRuntimeContext(instance);
    if (!workspace) return;
    const draft = draftOf(id);
    jobs.current.get(id)?.abort();
    const abort = new AbortController();
    jobs.current.set(id, abort);
    const release = () => {
      rowReader.release(`${id}:solve`);
      if (jobs.current.get(id) === abort) { jobs.current.delete(id); setView(id, { running: false }); }
    };
    // Rows typed just before Solve may still be read in the row reader's worker; an edit or Stop abandons the wait.
    setView(id, { running: true, notice: undefined });
    let parsed: ParsedRow[];
    try {
      parsed = await rowReader.read(`${id}:solve`, draft.rows, abort.signal);
    } catch {
      release();
      return;
    }
    const targets = resolvedTargets(draft, parsed), check = checkRows(parsed, targets, draft.domain);
    if (!check.ready) {
      release();
      setView(id, { notice: check.orderOverComplex ? 'Inequalities need real numbers.' : check.missingTargets.length ? `${check.missingTargets.join(', ')} ${check.missingTargets.length > 1 ? 'do' : 'does'} not appear in an equation row.` : 'Fix the marked rows first.' });
      return;
    }
    const revision = (revisions.current.get(id) ?? 0) + 1;
    revisions.current.set(id, revision);
    const request: EquationRequest = { rows: [...draft.rows], targets, domain: draft.domain, limits: { ...draft.limits }, digits: settingsRef.current.approxDigits };
    let previewed = false;
    const settle = (response: EquationResponse) => setViews(v => {
      const now = v[id] ?? {}, primary = response.document.primary;
      const outcome = primary?.kind === 'equation-outcome' ? primary.outcome : undefined;
      // A typed stop while verifying leaves the shown answer unchecked; any other non-answer withdraws it.
      if (previewed && now.preview && outcome?.kind === 'stopped') return { ...v, [id]: { ...now, unchecked: outcome.stop } };
      const verified = response.document.outcomeKind === 'success';
      return { ...v, [id]: { ...now, response, preview: undefined, unchecked: undefined, withdrawn: previewed && !verified } };
    });
    setView(id, { preview: undefined, unchecked: undefined, withdrawn: false });
    try {
      const result = await runEquationJob(request, workspace, revision, () => revisions.current.get(id) ?? 0,
        () => current.current.workspaceInstances.some(v => v.id === id), abort.signal, undefined,
        preview => { previewed = true; setView(id, { preview, unchecked: undefined, withdrawn: false }); });
      if (result && !abort.signal.aborted) settle(result);
    } catch (e) {
      if (!abort.signal.aborted && current.current.workspaceInstances.some(v => v.id === id)) {
        settle(equationFailure(request, e instanceof Error ? e.message : String(e)));
      }
    } finally {
      release();
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
