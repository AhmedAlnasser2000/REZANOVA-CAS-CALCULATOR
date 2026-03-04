import { describe, expect, it } from 'vitest';
import {
  solveCone,
  solveCube,
  solveCylinder,
  solveRectangle,
  solveSphere,
  solveSquare,
} from './shapes';

describe('geometry shapes', () => {
  it('solves square and rectangle formulas', () => {
    expect(solveSquare({ side: '4' }).exactLatex).toContain('A=16');
    expect(solveRectangle({ width: '8', height: '5' }).exactLatex).toContain('P=26');
  });

  it('solves cube and cylinder formulas', () => {
    expect(solveCube({ side: '3' }).exactLatex).toContain('V=27');
    expect(solveCylinder({ radius: '3', height: '8' }).approxText).toContain('TSA=');
  });

  it('solves cone and sphere formulas', () => {
    expect(solveCone({ radius: '3', height: '4', slantHeight: '5' }).error).toBeUndefined();
    expect(solveSphere({ radius: '5' }).exactLatex).toContain('SA=');
  });
});

