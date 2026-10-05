import { beforeEach, describe, expect, it } from 'vitest';
import { equationFailure, runEquationJob } from './runtime';
import { DEFAULT_EQUATION_LIMITS as limits, type EquationRequest } from './types';
import { clearOoeJobRegistry, listActiveOoeJobs, requestOoeJobCancellation } from '../ooe/job-launch/active-job-registry';

const request: EquationRequest = { rows: ['x^2=1'], targets: ['x'], domain: 'real', limits, digits: 6 };
const workspace = { workspaceInstanceId: 'test.new-equation.1', workspaceInstanceLabel: 'New Equation', compartmentId: 'equation' };
class FakeWorker {
  onmessage: Worker['onmessage'] = null; onerror: Worker['onerror'] = null; onmessageerror: Worker['onmessageerror'] = null;
  terminated = false;
  posted: unknown[] = [];
  postMessage(m: unknown) { this.posted.push(m); }
  terminate() { this.terminated = true; }
  reply(data: unknown = equationFailure(request, 'Test reply')) { this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent); }
}
const eventually = async (f: () => boolean) => { for (let i = 0; i < 100 && !f(); i++) await new Promise(r => setTimeout(r, 1)); expect(f()).toBe(true); };
const start = (worker: FakeWorker, revision: () => number, open: () => boolean, signal = new AbortController().signal) => {
  let started = false;
  const promise = runEquationJob(request, workspace, 1, revision, open, signal, () => { started = true; return worker as unknown as Worker; });
  return { promise, started: () => started };
};
beforeEach(() => clearOoeJobRegistry());

describe('New Equation worker shell', () => {
  it('requires a worker: an unavailable worker is a controlled error, never a main-thread run', async () => {
    const r = await runEquationJob(request, workspace, 1, () => 1, () => true, new AbortController().signal, () => { throw Error('Worker execution is unavailable.'); });
    expect(r?.document.outcomeKind).toBe('error');
    expect(r?.document.error).toBe('Worker execution is unavailable.');
  });

  it('refuses invalid requests before starting a worker', async () => {
    let created = false;
    const r = await runEquationJob({ ...request, targets: [] }, workspace, 1, () => 1, () => true, new AbortController().signal, () => { created = true; return new FakeWorker() as unknown as Worker; });
    expect(created).toBe(false);
    expect(r?.document.outcomeKind).toBe('error');
  });

  it('sends a copy of the request, terminates on reply, and drops stale and closed-tab replies', async () => {
    for (const mode of ['success', 'stale', 'closed']) {
      const worker = new FakeWorker();
      let revision = 1, open = true;
      const run = start(worker, () => revision, () => open);
      await eventually(run.started);
      expect(worker.posted).toEqual([request]);
      if (mode === 'stale') revision = 2;
      if (mode === 'closed') open = false;
      worker.reply();
      const result = await run.promise;
      expect(result === null).toBe(mode !== 'success');
      expect(worker.terminated).toBe(true);
    }
  });

  it('hard-stops via the Stop button (AbortSignal) and OOE cancellation', async () => {
    for (const mode of ['signal', 'ooe']) {
      const worker = new FakeWorker(), abort = new AbortController();
      const run = start(worker, () => 1, () => true, abort.signal);
      const rejected = expect(run.promise).rejects.toThrow('stopped');
      await eventually(run.started);
      if (mode === 'signal') abort.abort(); else requestOoeJobCancellation(listActiveOoeJobs()[0].registryId);
      await rejected;
      expect(worker.terminated).toBe(true);
      expect(listActiveOoeJobs()).toHaveLength(0);
    }
  });

  it('rejects malformed worker documents without hanging', async () => {
    const worker = new FakeWorker();
    const run = start(worker, () => 1, () => true);
    const rejected = expect(run.promise).rejects.toThrow();
    await eventually(run.started);
    worker.reply({ document: { version: 6, outcomeKind: 'success' } });
    await rejected;
    expect(worker.terminated).toBe(true);
  });
});
