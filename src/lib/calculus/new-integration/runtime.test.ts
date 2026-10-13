import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runIntegrationJob } from './runtime';
import { DEFAULT_INTEGRATION_LIMITS as limits } from './types';
import { integrationError } from './error';
import { clearOoeJobRegistry, listActiveOoeJobs, requestOoeJobCancellation } from '../../ooe/job-launch/active-job-registry';
const job = {request: {source: '\\int x\\,dx', limits}};
const workspace = {workspaceInstanceId: 'test.new.1', workspaceInstanceLabel: 'New Integration', compartmentId: 'calculus'};
class FakeWorker {
  onmessage: Worker['onmessage'] = null; onerror: Worker['onerror'] = null; onmessageerror: Worker['onmessageerror'] = null;
  terminated = false; id=''; postMessage(message: {id:string}) {this.id=message.id;} terminate() {this.terminated = true;}
  reply() {this.onmessage?.call(this as unknown as Worker, {data: {phase:'failure',id:this.id,response:{document: integrationError('Test reply'), request: job.request, elapsedMs: 1, usage: {work: 1, allocation: 1}, checks: []}}} as MessageEvent);}
}
const eventually = async (f: () => boolean) => {for (let i = 0; i < 100 && !f(); i++) await new Promise(r => setTimeout(r, 1)); expect(f()).toBe(true);};
beforeEach(() => clearOoeJobRegistry());
describe('New Integration worker shell', () => {
  it('requires a worker and produces a controlled unavailable error', async () => {
    const r = await runIntegrationJob(job, workspace, 1, () => 1, () => true, new AbortController().signal, () => {throw Error('Unavailable');});
    expect(r?.document.outcomeKind).toBe('error'); expect(r?.document.error).toBe('Unavailable');
  });
  it('terminates on success and rejects stale and closed-tab replies', async () => {
    for (const mode of ['success', 'stale', 'closed']) {
      const worker = new FakeWorker(); let revision = 1, open = true, started = false;
      const promise = runIntegrationJob(job, workspace, 1, () => revision, () => open, new AbortController().signal, () => {started = true; return worker as unknown as Worker;});
      await eventually(() => started);
      if (mode === 'stale') revision = 2; if (mode === 'closed') open = false;
      worker.reply(); const result = await promise;
      expect(result === null).toBe(mode !== 'success'); expect(worker.terminated).toBe(true);
    }
  });
  it('hard-stops via AbortSignal and OOE tab cancellation', async () => {
    for (const mode of ['signal', 'ooe']) {
      const worker = new FakeWorker(), abort = new AbortController(); let started = false;
      const promise = runIntegrationJob(job, workspace, 1, () => 1, () => true, abort.signal, () => {started = true; return worker as unknown as Worker;});
      const rejected = expect(promise).rejects.toThrow('stopped'); await eventually(() => started);
      if (mode === 'signal') abort.abort(); else requestOoeJobCancellation(listActiveOoeJobs()[0].registryId);
      await rejected; expect(worker.terminated).toBe(true); expect(listActiveOoeJobs()).toHaveLength(0);
    }
  });
  it('rejects malformed worker documents without hanging', async () => {
    const worker = new FakeWorker(); let started = false;
    const promise = runIntegrationJob(job, workspace, 1, () => 1, () => true, new AbortController().signal, () => {started = true; return worker as unknown as Worker;});
    const rejected = expect(promise).rejects.toThrow(); await eventually(() => started);
    worker.onmessage?.call(worker as unknown as Worker, {data: {document: {version: 5, outcomeKind: 'success'}}} as MessageEvent);
    await rejected; expect(worker.terminated).toBe(true);
  });
});

it('publishes a candidate and commits verified mathematics before the export job finishes',async()=>{
  const {executeIntegration}=await import('./service');const response=executeIntegration(job);
  const {readIntegrationPresentation}=await import('../../result-contract/integration-presentation');const p=readIntegrationPresentation(response.document)!;
  const preview={request:job.request,elapsedMs:1,usage:{work:1,allocation:1},presentation:{compact:p.compact,full:p.expanded(),copy:p.copy(),negative:false,terms:p.terms,conditions:p.conditions,originals:p.originals}};
  const worker=new FakeWorker(),candidate=vi.fn(),verified=vi.fn(),exporting=vi.fn();
  const messages:{phase:string;id:string}[]=[];worker.postMessage=m=>{worker.id=m.id;messages.push(m as {phase:string;id:string});};
  const promise=runIntegrationJob(job,workspace,1,()=>1,()=>true,new AbortController().signal,()=>worker as unknown as Worker,{candidate,verified,exporting});
  await eventually(()=>messages.length===1);
  worker.onmessage?.call(worker as unknown as Worker,{data:{phase:'candidate',id:worker.id,preview}} as MessageEvent);
  expect(candidate).toHaveBeenCalledOnce();expect(verified).not.toHaveBeenCalled();
  worker.onmessage?.call(worker as unknown as Worker,{data:{phase:'verified',id:worker.id,response:{...response,artifact:undefined},exportPending:true}} as MessageEvent);
  await eventually(()=>messages.length===2);
  expect(verified).toHaveBeenCalledOnce();expect(exporting).toHaveBeenCalledOnce();expect(worker.terminated).toBe(false);
  expect(listActiveOoeJobs()).toHaveLength(1);expect(listActiveOoeJobs()[0].routeLabel).toContain('saved file');
  worker.onmessage?.call(worker as unknown as Worker,{data:{phase:'export',id:worker.id,artifact:response.artifact,elapsedMs:10,usage:response.usage}} as MessageEvent);
  expect((await promise)?.artifact).toBe(response.artifact);expect(worker.terminated).toBe(true);
});
it('retains the committed verified response when export fails and hard-stops export on cancellation',async()=>{
  const {executeIntegration}=await import('./service');const response=executeIntegration(job);
  for(const mode of ['error','abort']){
    const worker=new FakeWorker(),abort=new AbortController(),verified=vi.fn();let sent=0;
    worker.postMessage=m=>{worker.id=m.id;sent++;};
    const promise=runIntegrationJob(job,workspace,1,()=>1,()=>true,abort.signal,()=>worker as unknown as Worker,{verified});
    await eventually(()=>sent===1);
    worker.onmessage?.call(worker as unknown as Worker,{data:{phase:'verified',id:worker.id,response:{...response,artifact:undefined},exportPending:true}} as MessageEvent);
    await eventually(()=>sent===2);expect(verified).toHaveBeenCalledOnce();
    if(mode==='abort')abort.abort();else worker.onerror?.call(worker as unknown as Worker,{} as ErrorEvent);
    const result=await promise;
    if(mode==='abort')expect(result).toBeNull();else{expect(result?.document).toEqual(response.document);expect(result?.exportUnavailable).toContain('worker failed');}
    expect(worker.terminated).toBe(true);expect(listActiveOoeJobs()).toHaveLength(0);
  }
});
