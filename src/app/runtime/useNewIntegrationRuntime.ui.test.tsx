import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useNewIntegrationRuntime } from './useNewIntegrationRuntime';
import { readIntegrationDraft } from './new-integration-drafts';
import { runIntegrationJob } from '../../lib/calculus/new-integration/runtime';
import type { IntegrationResponse, IntegrationPreview, IntegrationJobCallbacks } from '../../lib/calculus/new-integration/types';
import {buildCanonicalResultDocument} from '../../lib/result-contract/current';
import {exactIntegrationMathLatex} from '../../lib/result-contract/current/integration-schema';
import { integrationError } from '../../lib/calculus/new-integration/error';
vi.mock('../../lib/calculus/new-integration/runtime', () => ({runIntegrationJob: vi.fn()}));
beforeEach(() => {localStorage.clear(); vi.mocked(runIntegrationJob).mockReset();});
function hook() {return renderHook(() => {const workspaces = useWorkspaceInstancesRuntime(); const integration = useNewIntegrationRuntime(workspaces); return {workspaces, integration};});}
it('keeps tabs independent, restores drafts and limits, and does not restore proof status', async () => {
  const h = hook(); act(() => h.result.current.integration.open());
  const first = h.result.current.workspaces.activeInstanceId;
  const draft = readIntegrationDraft(null); draft.source = '\\int x\\,dx'; draft.limits.work = 1234;
  act(() => h.result.current.integration.change(first, draft));
  act(() => h.result.current.integration.open());
  const second = h.result.current.workspaces.activeInstanceId; expect(first).not.toBe(second);
  expect(readIntegrationDraft(h.result.current.workspaces.activeInstance?.surfaceState).source).toBe('');
  act(() => h.result.current.workspaces.focusInstance(first));
  expect(readIntegrationDraft(h.result.current.workspaces.activeInstance?.surfaceState)).toEqual(draft);
  h.unmount(); const restored = hook(); act(() => restored.result.current.integration.open());
  expect(restored.result.current.workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-integration')).toHaveLength(2);
  expect(restored.result.current.integration.views).toEqual({}); expect(runIntegrationJob).not.toHaveBeenCalled();
});
it('switching leaves work running; editing or closing aborts and drops late replies', async () => {
  const pending: {signal: AbortSignal; resolve: (v: IntegrationResponse) => void}[] = [];
  vi.mocked(runIntegrationJob).mockImplementation((_j, _w, _r, _c, _o, signal) => new Promise(resolve => pending.push({signal, resolve})));
  const h = hook(); act(() => h.result.current.integration.open()); const first = h.result.current.workspaces.activeInstanceId;
  act(() => {void h.result.current.integration.run(first);});
  act(() => h.result.current.integration.open()); expect(pending[0].signal.aborted).toBe(false);
  act(() => h.result.current.integration.change(first, {...readIntegrationDraft(null), source: 'changed'}));
  expect(pending[0].signal.aborted).toBe(true);
  await act(async () => pending[0].resolve({document: integrationError('Late'), request: readIntegrationDraft(null), elapsedMs: 1, usage: {work: 1, allocation: 1}, checks: []}));
  expect(h.result.current.integration.views[first]?.response).toBeUndefined();
  act(() => {void h.result.current.integration.run(first);}); act(() => h.result.current.workspaces.closeInstance(first));
  await waitFor(() => expect(pending[1].signal.aborted).toBe(true));
});
it('persists per-tab formula view without changing a running request or its revision', async () => {
  let resolve!: (v: IntegrationResponse) => void;
  vi.mocked(runIntegrationJob).mockImplementation(() => new Promise(r => {resolve = r;}));
  const h = hook(); act(() => h.result.current.integration.open()); const first = h.result.current.workspaces.activeInstanceId;
  act(() => {void h.result.current.integration.run(first);});
  const call = vi.mocked(runIntegrationJob).mock.calls[0], revision = call[3]();
  act(() => h.result.current.integration.setFormulaView(first, 'full'));
  expect(call[5].aborted).toBe(false); expect(call[3]()).toBe(revision);
  expect(call[0].request).not.toHaveProperty('formulaView');
  const response = {document: integrationError('Fixture'), request: readIntegrationDraft(null), elapsedMs: 1, usage: {work: 1, allocation: 1}, checks: []};
  await act(async () => resolve(response));
  expect(h.result.current.integration.views[first].response).toBe(response);
  act(() => h.result.current.integration.change(first, {...readIntegrationDraft(null), source: 'x'}));
  expect(h.result.current.workspaces.activeInstance?.surfaceState).toHaveProperty('formulaView', 'full');
  act(() => h.result.current.integration.open());
  expect(h.result.current.workspaces.activeInstance?.surfaceState).toHaveProperty('formulaView', 'compact');
  h.unmount(); const restored = hook(); act(() => restored.result.current.integration.open());
  const tabs = restored.result.current.workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-integration');
  expect(tabs.map(t => (t.surfaceState as {formulaView: string}).formulaView)).toEqual(['full', 'compact']);
  expect(restored.result.current.integration.views).toEqual({});
});
it('failed artifact verification preserves the current draft and prior result', async () => {
  const h = hook(); act(() => h.result.current.integration.open()); const id = h.result.current.workspaces.activeInstanceId;
  const draft = {...readIntegrationDraft(null), source: '\\int e^x\\,dx'};
  act(() => h.result.current.integration.change(id, draft));
  const prior: IntegrationResponse = {document: integrationError('Prior fixture'), request: draft, elapsedMs: 1, usage: {work: 1, allocation: 1}, checks: []};
  vi.mocked(runIntegrationJob).mockResolvedValueOnce(prior);
  await act(async () => h.result.current.integration.run(id));
  const failed = {...prior, document: integrationError('saved integrand differs from current problem')};
  vi.mocked(runIntegrationJob).mockResolvedValueOnce(failed);
  await act(async () => h.result.current.integration.run(id, '{}', 'verify'));
  expect(h.result.current.integration.views[id].response).toBe(prior);
  expect(h.result.current.integration.views[id].notice).toContain('saved integrand differs');
  expect(readIntegrationDraft(h.result.current.workspaces.activeInstance?.surfaceState)).toEqual(draft);
  expect(h.result.current.workspaces.workspaceInstances.filter(v => v.workspaceKind === 'new-integration')).toHaveLength(1);
});

function phases() {
  let callbacks!: IntegrationJobCallbacks, signal!: AbortSignal, resolve!: (v: IntegrationResponse | null) => void;
  vi.mocked(runIntegrationJob).mockImplementation((_j,_w,_r,_c,_o,s,_factory,c) => {callbacks=c!;signal=s;return new Promise(r=>{resolve=r;});});
  const request={...readIntegrationDraft(null),source:'\\int x\\,dx'};
  const document=buildCanonicalResultDocument({outcomeKind:'success',title:'Verified antiderivative',warnings:[],primary:{
    kind:'rational-antiderivative',semantics:'formal-local-complex',variable:'x',integrationConstant:'C',
    rationalPart:{mathJson:['Divide',['Power','x',2],2],canonicalLatex:exactIntegrationMathLatex(['Divide',['Power','x',2],2])},terms:[],restrictions:[]}});
  const response:IntegrationResponse={request,document,elapsedMs:1,usage:{work:1,allocation:1},checks:[]};
  const preview:IntegrationPreview={request,elapsedMs:1,usage:response.usage,presentation:{compact:'x^2/2+C',full:'x^2/2+C',copy:'x^2/2+C',negative:false,terms:[],conditions:[],originals:[]}};
  return {get callbacks(){return callbacks;},get signal(){return signal;},resolve:(v:IntegrationResponse|null)=>resolve(v),preview,response};
}
it('publishes unchecked mathematics, then verified mathematics while export is pending; stopping export retains it',async()=>{
  const p=phases(),h=hook();act(()=>h.result.current.integration.open());const id=h.result.current.workspaces.activeInstanceId;
  act(()=>{void h.result.current.integration.run(id);});
  act(()=>p.callbacks.candidate!(p.preview));expect(h.result.current.integration.views[id].phase).toBe('checking');expect(h.result.current.integration.views[id].preview).toBe(p.preview);
  act(()=>{p.callbacks.verified!(p.response);p.callbacks.exporting!();});
  expect(h.result.current.integration.views[id].response).toBe(p.response);expect(h.result.current.integration.views[id].preview).toBeUndefined();expect(h.result.current.integration.views[id].phase).toBe('exporting');
  act(()=>h.result.current.integration.stop(id));expect(p.signal.aborted).toBe(true);expect(h.result.current.integration.views[id].response?.document).toBe(p.response.document);
  await act(async()=>p.resolve({...p.response,artifact:'late'}));expect(h.result.current.integration.views[id].response?.artifact).toBeUndefined();
});
it.each(['stop','exhaust','failure'])('retains or withdraws the unchecked candidate appropriately on %s',async mode=>{
  const p=phases(),h=hook();act(()=>h.result.current.integration.open());const id=h.result.current.workspaces.activeInstanceId;
  act(()=>{void h.result.current.integration.run(id);p.callbacks.candidate!(p.preview);});
  if(mode==='stop'){act(()=>h.result.current.integration.stop(id));await act(async()=>p.resolve(null));}
  else await act(async()=>p.resolve({...p.response,document:integrationError('check stopped'),failedStage:'verify',...(mode==='exhaust'?{stop:'work'}:{})}));
  const view=h.result.current.integration.views[id];
  if(mode==='failure'){expect(view.preview).toBeUndefined();expect(view.withdrawn).toBe(true);}
  else {expect(view.preview).toBe(p.preview);expect(view.unchecked).toBe(mode==='stop'?'cancelled':'work');}
  expect(view.running).toBe(false);
});
it.each(['edit','close','restart'])('drops late candidate/verified/export delivery after %s',async mode=>{
  const p=phases(),h=hook();act(()=>h.result.current.integration.open());const id=h.result.current.workspaces.activeInstanceId;
  act(()=>{void h.result.current.integration.run(id);p.callbacks.candidate!(p.preview);});
  const old=p.callbacks;
  act(()=>{if(mode==='edit')h.result.current.integration.change(id,{...p.response.request,source:'changed'});
    else if(mode==='close')h.result.current.workspaces.closeInstance(id);else void h.result.current.integration.run(id);});
  await waitFor(()=>{if(mode==='close')expect(h.result.current.integration.views[id]).toBeUndefined();});
  act(()=>{old.candidate!(p.preview);old.verified!(p.response);old.exporting!();});
  expect(h.result.current.integration.views[id]?.response).toBeUndefined();
  if(mode==='restart')act(()=>h.result.current.integration.stop(id));h.unmount();
});
it('opens saved output only at verified delivery and cancels export if its new tab closes',async()=>{
  const p=phases(),h=hook();act(()=>h.result.current.integration.open());const id=h.result.current.workspaces.activeInstanceId;
  act(()=>{void h.result.current.integration.run(id,'{}','open');});
  expect(h.result.current.workspaces.workspaceInstances.filter(t=>t.workspaceKind==='new-integration')).toHaveLength(1);
  act(()=>{p.callbacks.verified!(p.response);p.callbacks.exporting!();});const target=h.result.current.workspaces.activeInstanceId;expect(target).not.toBe(id);
  expect(h.result.current.integration.views[target].response).toBe(p.response);
  act(()=>h.result.current.workspaces.closeInstance(target));await waitFor(()=>expect(p.signal.aborted).toBe(true));
  await act(async()=>p.resolve({...p.response,artifact:'late'}));expect(h.result.current.integration.views[target]).toBeUndefined();
});
