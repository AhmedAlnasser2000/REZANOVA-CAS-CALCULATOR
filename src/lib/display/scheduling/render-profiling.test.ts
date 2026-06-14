import { describe, expect, it, vi } from 'vitest';
import {
  isDisplayRenderProfilingEnabled,
  logDisplayRenderProfile,
} from './render-profiling';

describe('display render profiling', () => {
  it('is dev gated behind VITE_DISPLAY_RENDER_PROFILING', () => {
    expect(isDisplayRenderProfilingEnabled({ DEV: true, VITE_DISPLAY_RENDER_PROFILING: '1' })).toBe(true);
    expect(isDisplayRenderProfilingEnabled({ DEV: true, VITE_DISPLAY_RENDER_PROFILING: '0' })).toBe(false);
    expect(isDisplayRenderProfilingEnabled({ DEV: false, VITE_DISPLAY_RENDER_PROFILING: '1' })).toBe(false);
    expect(isDisplayRenderProfilingEnabled(undefined)).toBe(false);
  });

  it('logs samples only when profiling is enabled', () => {
    const logger = vi.fn();

    logDisplayRenderProfile(
      {
        phase: 'math-static-convert',
        latexLength: 42,
      },
      {
        env: { DEV: false, VITE_DISPLAY_RENDER_PROFILING: '1' },
        logger,
      },
    );

    expect(logger).not.toHaveBeenCalled();

    logDisplayRenderProfile(
      {
        phase: 'math-static-convert',
        durationMs: 3,
        latexLength: 42,
      },
      {
        env: { DEV: true, VITE_DISPLAY_RENDER_PROFILING: '1' },
        logger,
      },
    );

    expect(logger).toHaveBeenCalledWith(
      '[display-render-profile]',
      expect.objectContaining({
        phase: 'math-static-convert',
        durationMs: 3,
        latexLength: 42,
        timestampMs: expect.any(Number),
      }),
    );
  });
});
