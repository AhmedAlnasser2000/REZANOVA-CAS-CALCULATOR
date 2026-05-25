import { describe, expect, it, vi } from 'vitest';
import {
  EDITOR_ANALYSIS_DEBOUNCE_MS,
  EditorAnalysisRuntime,
} from './editor-analysis-runtime';

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
});
