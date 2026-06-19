import { describe, expect, it } from 'vitest';
import {
  formatPendingRuntimeStatusLabel,
  formatReadyRuntimeElapsedLabel,
  formatRuntimeElapsedFinal,
  formatRuntimeElapsedRunning,
  runtimeElapsedMs,
} from './runtimeElapsedTime';

describe('runtime elapsed time formatting', () => {
  it('formats running durations as whole seconds', () => {
    expect(formatRuntimeElapsedRunning(0)).toBe('0s');
    expect(formatRuntimeElapsedRunning(999)).toBe('0s');
    expect(formatRuntimeElapsedRunning(1000)).toBe('1s');
    expect(formatRuntimeElapsedRunning(2400)).toBe('2s');
  });

  it('formats final durations with two decimals and a visible minimum', () => {
    expect(formatRuntimeElapsedFinal(0)).toBe('0.01s');
    expect(formatRuntimeElapsedFinal(4)).toBe('0.01s');
    expect(formatRuntimeElapsedFinal(40)).toBe('0.04s');
    expect(formatRuntimeElapsedFinal(1234)).toBe('1.23s');
  });

  it('formats status labels with calm running time and precise ready time', () => {
    expect(formatPendingRuntimeStatusLabel('computing', 1400)).toBe('Computing · 1s');
    expect(formatPendingRuntimeStatusLabel('stopping', 2400)).toBe('Stopping · 2s');
    expect(formatReadyRuntimeElapsedLabel(75)).toBe('Ready · 0.07s');
  });

  it('computes non-negative elapsed milliseconds', () => {
    expect(runtimeElapsedMs(1000, 2300)).toBe(1300);
    expect(runtimeElapsedMs(2300, 1000)).toBe(0);
  });
});
