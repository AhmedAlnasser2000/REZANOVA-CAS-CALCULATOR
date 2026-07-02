import { describe, expect, it } from 'vitest';
import { runVectorMode } from './vector';

describe('runVectorMode', () => {
  it('keeps vector operation ids working with u/v readback labels', () => {
    expect(runVectorMode({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).title).toBe('u·v');
    expect(runVectorMode({
      operation: 'normA',
      vectorA: [3, 4],
      vectorB: [0, 0],
      angleUnit: 'deg',
    }).title).toBe('‖u‖');
    expect(runVectorMode({
      operation: 'add',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    }).title).toBe('u+v');
  });
});
