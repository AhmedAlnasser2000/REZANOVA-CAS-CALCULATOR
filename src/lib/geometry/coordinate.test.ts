import { describe, expect, it } from 'vitest';
import {
  solveDistance,
  solveLineEquation,
  solveMidpoint,
  solveSlope,
} from './coordinate';

describe('geometry coordinate', () => {
  it('solves distance and midpoint', () => {
    expect(solveDistance({
      p1: { x: '0', y: '0' },
      p2: { x: '3', y: '4' },
    }).exactLatex).toContain('d=5');

    expect(solveMidpoint({
      p1: { x: '1', y: '2' },
      p2: { x: '5', y: '8' },
    }).exactLatex).toContain('M=');
  });

  it('reports undefined slope for vertical lines', () => {
    const result = solveSlope({
      p1: { x: '2', y: '1' },
      p2: { x: '2', y: '8' },
    });
    expect(result.exactLatex).toContain('\\text{undefined}');
    expect(result.warnings[0]).toContain('Vertical');
  });

  it('builds line equations in the selected form', () => {
    expect(solveLineEquation({
      p1: { x: '1', y: '2' },
      p2: { x: '3', y: '6' },
      form: 'slope-intercept',
    }).exactLatex).toContain('y=2x');

    expect(solveLineEquation({
      p1: { x: '1', y: '2' },
      p2: { x: '3', y: '6' },
      form: 'standard',
    }).exactLatex).toContain('2x-y=0');
  });
});
