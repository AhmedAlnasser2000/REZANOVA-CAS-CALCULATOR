import { describe, expect, it, vi } from 'vitest';
import {
  EDITOR_ANALYSIS_DEBOUNCE_MS,
  EditorAnalysisRuntime,
} from './editor-analysis-runtime';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from '../ooe/active-job-registry';

async function flushAnalysisPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe('EditorAnalysisRuntime', () => {
  it('debounces analysis updates', () => {
    vi.useFakeTimers();
    const analyze = vi.fn((source: string) => source.toUpperCase());
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: '',
      analyze,
    });

    runtime.updateSource('x+1');

    expect(runtime.getSnapshot()).toMatchObject({
      value: '',
      status: 'analyzing',
      stale: true,
    });
    expect(analyze).not.toHaveBeenCalled();

    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS - 1);
    expect(analyze).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(analyze).toHaveBeenCalledWith('x+1');
    expect(runtime.getSnapshot()).toMatchObject({
      value: 'X+1',
      status: 'ready',
      stale: false,
      analyzedSource: 'x+1',
    });

    runtime.dispose();
    vi.useRealTimers();
  });

  it('stops pending analysis and keeps the last safe value', () => {
    vi.useFakeTimers();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      analyze: (source: string) => source,
    });

    runtime.updateSource('new-value');
    runtime.stop();
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      status: 'stopped',
      stale: true,
    });

    runtime.dispose();
    vi.useRealTimers();
  });

  it('restarts stopped analysis from the current source', () => {
    vi.useFakeTimers();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: '',
      analyze: (source: string) => `${source}!`,
    });

    runtime.updateSource('x');
    runtime.stop();
    runtime.restart();
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'x!',
      status: 'ready',
      stale: false,
      analyzedSource: 'x',
    });

    runtime.dispose();
    vi.useRealTimers();
  });

  it('guards huge inputs and preserves the last safe value', () => {
    vi.useFakeTimers();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      maxLatexLength: 3,
      analyze: (source: string) => source,
    });

    runtime.updateSource('abcd');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      status: 'guarded',
      stale: true,
    });
    expect(runtime.getSnapshot().message).toContain('over 3 characters');

    runtime.dispose();
    vi.useRealTimers();
  });

  it('clears analysis output when the source becomes empty', () => {
    vi.useFakeTimers();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'EMPTY',
      analyze: (source: string) => source.toUpperCase(),
    });

    runtime.updateSource('abc');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    expect(runtime.getSnapshot().value).toBe('ABC');

    runtime.updateSource('');

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'EMPTY',
      status: 'idle',
      stale: false,
      analyzedSource: '',
    });

    runtime.dispose();
    vi.useRealTimers();
  });

  it('contains analysis errors locally and preserves the last safe value', () => {
    vi.useFakeTimers();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      analyze: () => {
        throw new Error('boom');
      },
    });

    runtime.updateSource('bad');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      status: 'error',
      stale: true,
      message: 'boom',
    });

    runtime.dispose();
    vi.useRealTimers();
  });

  it('starts an OOE editor analysis job only after debounce fires', async () => {
    vi.useFakeTimers();
    clearOoeJobRegistry();
    const analyze = vi.fn((source: string) => source.toUpperCase());
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: '',
      analyze,
      ooe: {
        lane: 'variableHints',
        contextKey: 'calculate::standard',
      },
    });

    runtime.updateSource('x+1');

    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toEqual([]);

    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    expect(listActiveOoeJobs()).toMatchObject([
      {
        capabilityId: 'editor.variableHints',
        routeLabel: 'editor.variableHints',
        status: 'started',
      },
    ]);

    await vi.waitFor(() => {
      expect(runtime.getSnapshot()).toMatchObject({
        value: 'X+1',
        status: 'ready',
        stale: false,
      });
    });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toMatchObject([
      {
        capabilityId: 'editor.variableHints',
        status: 'completed',
      },
    ]);

    runtime.dispose();
    vi.useRealTimers();
  });

  it('does not start OOE jobs for rapid edits cancelled before debounce', async () => {
    vi.useFakeTimers();
    clearOoeJobRegistry();
    const analyze = vi.fn((source: string) => source);
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: '',
      analyze,
      ooe: {
        lane: 'previewRender',
        contextKey: 'calculate',
      },
    });

    runtime.updateSource('x');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS - 1);
    runtime.updateSource('x+1');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    await flushAnalysisPromises();

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith('x+1');
    expect(listRecentOoeJobs()).toHaveLength(1);

    runtime.dispose();
    vi.useRealTimers();
  });

  it('stale-drops in-flight editor analysis and preserves the last safe value', async () => {
    vi.useFakeTimers();
    clearOoeJobRegistry();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      analyze: (source: string) => {
        runtime.updateSource('fresh');
        return `${source}!`;
      },
      ooe: {
        lane: 'equationTargetDiscovery',
        contextKey: 'x',
      },
    });

    runtime.updateSource('old');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    await flushAnalysisPromises();

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      source: 'fresh',
      status: 'analyzing',
      stale: true,
    });
    expect(listRecentOoeJobs()).toMatchObject([
      {
        capabilityId: 'editor.equationTargetDiscovery',
        status: 'staleDropped',
      },
    ]);

    runtime.dispose();
    vi.useRealTimers();
  });

  it('skips editor analysis commits when stopped during a run', async () => {
    vi.useFakeTimers();
    clearOoeJobRegistry();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      analyze: (source: string) => {
        runtime.stop();
        return `${source}!`;
      },
      ooe: {
        lane: 'calculateTransformEligibility',
        contextKey: 'standard',
      },
    });

    runtime.updateSource('x');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    await flushAnalysisPromises();

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      status: 'stopped',
      stale: true,
    });
    expect(listRecentOoeJobs()).toMatchObject([
      {
        capabilityId: 'editor.calculateTransformEligibility',
        status: 'skipped',
      },
    ]);

    runtime.dispose();
    vi.useRealTimers();
  });

  it('does not start OOE editor jobs for guarded huge inputs', () => {
    vi.useFakeTimers();
    clearOoeJobRegistry();
    const runtime = new EditorAnalysisRuntime({
      source: '',
      initialValue: 'SAFE',
      maxLatexLength: 3,
      analyze: (source: string) => source,
      ooe: {
        lane: 'equationTransformEligibility',
        contextKey: 'symbolic',
      },
    });

    runtime.updateSource('abcd');
    vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);

    expect(runtime.getSnapshot()).toMatchObject({
      value: 'SAFE',
      status: 'guarded',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toEqual([]);

    runtime.dispose();
    vi.useRealTimers();
  });
});
