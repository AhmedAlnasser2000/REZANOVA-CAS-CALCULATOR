import { describe, expect, it } from 'vitest';
import { solveTriangleArea, solveTriangleHeron } from './triangles';

describe('geometry triangles', () => {
  it('solves triangle area from base and height', () => {
    const result = solveTriangleArea({ base: '10', height: '6' });
    expect(result.exactLatex).toContain('A=30');
  });

  it('solves Heron formula from three sides', () => {
    const result = solveTriangleHeron({ a: '5', b: '6', c: '7' });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('s=9');
  });
});

