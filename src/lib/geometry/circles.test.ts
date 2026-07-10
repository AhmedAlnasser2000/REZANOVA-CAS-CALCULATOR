import { describe, expect, it } from 'vitest';
import { solveArcSector, solveCircle } from './circles';

describe('geometry circles', () => {
  it('solves a circle from radius', () => {
    const result = solveCircle({ radius: '3' });
    expect(result.exactLatex).toContain('d=6');
    expect(result.exactLatex).toContain('C=6\\pi');
    expect(result.exactLatex).toContain('A=9\\pi');
    expect(result.approxText).toContain('C=18.849556');
    expect(result.approxText).toContain('A=28.274334');
  });

  it('solves arc length and sector area', () => {
    const result = solveArcSector({ radius: '4', angle: '60', angleUnit: 'deg' });
    expect(result.error).toBeUndefined();
    expect(result.approxText).toContain('arc=');
    expect(result.approxText).toContain('sector=');
  });
});
