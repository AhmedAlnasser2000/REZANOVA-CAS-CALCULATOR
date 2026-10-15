import {EventEmitter} from 'node:events';
import type {ChildProcess} from 'node:child_process';
import {it,expect,vi,afterEach} from 'vitest';
import {watchPerformanceProcess} from './__tests__/performance-watchdog';
afterEach(()=>vi.useRealTimers());
it('stops a synchronous child at the development deadline and keeps prior stage records',async()=>{
  vi.useFakeTimers();const child=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined}),progress=vi.fn();
  const watched=watchPerformanceProcess(child as unknown as ChildProcess,progress);
  child.emit('message',{event:'sample',fixture:'test',stage:'construction',sample:0,milliseconds:1,work:10,allocation:20});
  child.emit('message',{event:'started',fixture:'test',stage:'checking',sample:0});await vi.advanceTimersByTimeAsync(60000);
  const result=await watched;expect(child.kill).toHaveBeenCalledWith('SIGKILL');expect(result.status).toBe('watchdog-stopped');expect(result.stage).toBe('checking');
  expect(result.events).toHaveLength(2);expect(result.mathematicalDecision).toBe(false);expect(result.developmentOnly).toBe(true);
});
it('requires completed sample coverage and reports failure without mathematical authority',async()=>{
  const child=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined});const watched=watchPerformanceProcess(child as unknown as ChildProcess,()=>{});
  child.emit('exit',0);expect((await watched).status).toBe('failed');
  const completed=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined});const run=watchPerformanceProcess(completed as unknown as ChildProcess,()=>{});
  completed.emit('message',{event:'finished',fixture:'test'});completed.emit('exit',0);expect((await run).status).toBe('completed');
});
it('enforces the complete-cycle deadline even when each operation keeps resetting its own timer',async()=>{
  vi.useFakeTimers();const child=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined});
  const run=watchPerformanceProcess(child as unknown as ChildProcess,()=>{});
  child.emit('message',{event:'cycle-started',fixture:'test',sample:0});
  child.emit('message',{event:'started',fixture:'test',stage:'construction',sample:0});await vi.advanceTimersByTimeAsync(30000);
  child.emit('message',{event:'started',fixture:'test',stage:'solving',sample:0});await vi.advanceTimersByTimeAsync(30000);
  const result=await run;expect(result.status).toBe('watchdog-stopped');expect(result.stoppedScope).toBe('cycle');
  expect(result.stage).toBe('solving');expect(child.kill).toHaveBeenCalledWith('SIGKILL');expect(result.events).toHaveLength(3);
});
it('requires matching completed cycle coverage and never accepts restart messages to replenish the deadline',async()=>{
  const child=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined}), run=watchPerformanceProcess(child as unknown as ChildProcess,()=>{});
  child.emit('message',{event:'cycle-started',fixture:'test',sample:0});child.emit('message',{event:'cycle-started',fixture:'test',sample:1});
  expect((await run).status).toBe('failed');expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  const complete=Object.assign(new EventEmitter(),{kill:vi.fn(),pid:undefined}), good=watchPerformanceProcess(complete as unknown as ChildProcess,()=>{});
  complete.emit('message',{event:'cycle-started',fixture:'test',sample:0});complete.emit('message',{event:'cycle-finished',fixture:'test',sample:0});
  complete.emit('message',{event:'finished',fixture:'test'});complete.emit('exit',0);expect((await good).status).toBe('completed');
});
