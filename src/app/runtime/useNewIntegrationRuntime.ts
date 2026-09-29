import { useCallback, useEffect, useRef, useState } from 'react';
import { runIntegrationJob } from '../../lib/calculus/new-integration/runtime';
import { integrationError } from '../../lib/calculus/new-integration/error';
import type { IntegrationDraft, IntegrationResponse } from '../../lib/calculus/new-integration/types';
import { loadIntegrationDrafts, readIntegrationDraft, saveIntegrationDrafts } from './new-integration-drafts';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { workspaceInstanceRuntimeContext } from './workspace-instances';
export type IntegrationViewState = {response?: IntegrationResponse; running?: boolean; notice?: string};
export function useNewIntegrationRuntime(workspaces: ReturnType<typeof useWorkspaceInstancesRuntime>) {
  const current = useRef(workspaces); current.current = workspaces;
  const [views, setViews] = useState<Record<string, IntegrationViewState>>({});
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const jobs = useRef(new Map<string, AbortController>()), revisions = useRef(new Map<string, number>());
  const setView = useCallback((id: string, patch: Partial<IntegrationViewState>) => setViews(v => ({...v, [id]: {...v[id], ...patch}})), []);
  const stop = useCallback((id: string) => {jobs.current.get(id)?.abort(); jobs.current.delete(id); setView(id, {running: false, notice: 'Stopped.'});}, [setView]);
  const create = useCallback((draft: IntegrationDraft, title = 'New Integration') => current.current.createNewIntegrationTabs([{title, state: {...draft}}])[0], []);
  const open = useCallback(() => {
    if (!enteredRef.current) {
      enteredRef.current = true; setEntered(true);
      const saved = loadIntegrationDrafts(localStorage);
      if (saved.length) {current.current.createNewIntegrationTabs(saved.map(v => ({title: v.title, state: {...v.draft}}))); return;}
    }
    create(readIntegrationDraft(null));
  }, [create]);
  const change = useCallback((id: string, draft: IntegrationDraft) => {
    jobs.current.get(id)?.abort(); jobs.current.delete(id);
    revisions.current.set(id, (revisions.current.get(id) ?? 0) + 1);
    current.current.updateInstanceSurfaceState(id, {...draft});
    setView(id, {running: false, notice: undefined});
  }, [setView]);
  const run = useCallback(async (id: string, artifact?: string, action?: 'open' | 'verify') => {
    const instance = current.current.workspaceInstances.find(v => v.id === id);
    if (!instance) return;
    const workspace = workspaceInstanceRuntimeContext(instance); if (!workspace) return;
    jobs.current.get(id)?.abort(); const abort = new AbortController(); jobs.current.set(id, abort);
    const revision = (revisions.current.get(id) ?? 0) + 1; revisions.current.set(id, revision);
    const request = readIntegrationDraft(instance.surfaceState);
    setView(id, {running: true, notice: undefined});
    try {
      const result = await runIntegrationJob({request, artifact, action}, workspace, revision, () => revisions.current.get(id) ?? 0,
        () => current.current.workspaceInstances.some(v => v.id === id), abort.signal);
      if (!result || abort.signal.aborted) return;
      if (artifact && result.document.outcomeKind === 'error') {setView(id, {notice: result.document.error ?? 'Artifact verification failed.'}); return;}
      if (action === 'open') {
        const nextId = create(result.request, 'Saved integral'); setView(nextId, {response: result});
      } else setView(id, {response: result});
    } catch (e) {
      if (!abort.signal.aborted && current.current.workspaceInstances.some(v => v.id === id)) {
        const message = e instanceof Error ? e.message : String(e);
        if (artifact) setView(id, {notice: message});
        else setView(id, {response: {request, document: integrationError(message), elapsedMs: 0, usage: {work: 0, allocation: 0}, checks: []}});
      }
    } finally {
      if (jobs.current.get(id) === abort) {jobs.current.delete(id); setView(id, {running: false});}
    }
  }, [create, setView]);
  useEffect(() => {
    const ids = new Set(workspaces.workspaceInstances.map(v => v.id));
    for (const [id, job] of jobs.current) if (!ids.has(id)) {job.abort(); jobs.current.delete(id); revisions.current.delete(id);}
    setViews(previous => {const removed = Object.keys(previous).filter(id => !ids.has(id)); if (!removed.length) return previous; const next = {...previous}; for (const id of removed) delete next[id]; return next;});
    if (entered) {
      try {saveIntegrationDrafts(localStorage, workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-integration').map(v => ({title: v.title, draft: readIntegrationDraft(v.surfaceState)})));}
      catch (e) {const id = workspaces.activeInstanceId; setView(id, {notice: e instanceof Error ? e.message : 'Draft persistence unavailable.'});}
    }
  }, [entered, workspaces.workspaceInstances, workspaces.activeInstanceId, setView]);
  useEffect(() => {const running = jobs.current; return () => {for (const job of running.values()) job.abort(); running.clear();};}, []);
  return {views, open, change, run, stop};
}
export type NewIntegrationRuntime = ReturnType<typeof useNewIntegrationRuntime>;
