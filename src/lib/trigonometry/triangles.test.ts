import { describe, expect, it } from 'vitest';
import { solveCosineRule, solveRightTriangle, solveSineRule } from './triangles';

describe('trigonometry triangles', () => {
  it('solves a right triangle from two sides', () => {
    const result = solveRightTriangle({
      knownSideA: '3',
      knownSideB: '4',
      knownSideC: '',
      knownAngleA: '',
      knownAngleB: '',
    });
    expect(result.exactLatex).toContain('c=5');
    expect(result.approxText).toContain('A=');
  });

  it('solves a sine-rule triangle from a matched pair and another side', () => {
    const result = solveSineRule({
      sideA: '7',
      sideB: '10',
      sideC: '',
      angleA: '30',
      angleB: '',
      angleC: '',
    });
    expect(result.error).toBeUndefined();
    expect(result.approxText).toContain('B=');
  });

  it('solves a cosine-rule SAS triangle', () => {
    const result = solveCosineRule({
      sideA: '5',
      sideB: '7',
      sideC: '',
      angleA: '',
      angleB: '',
      angleC: '60',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('c=');
  });
});
