import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { ptxBadge, ptxComplexText, ptxNumber, ptxSignificantDigits } from './certify';
import { ptxPlaneIntersections, ptxRealExtrema, ptxRealIntersections, ptxRealRoots } from './features';
import { ptxProjectToCurve, ptxRefineExplicit, ptxStepAlongCurve } from './refine';
import type { PtxPlaneFunction, PtxSolverPort } from './solver-port';
import { currentPtxSolverPort } from './solver-port-current';

function symbols(node: unknown): string[] {
  if (typeof node === 'string') return /^[a-z]$/u.test(node) ? [node] : [];
  return Array.isArray(node) ? [...new Set(node.slice(1).flatMap(symbols))] : [];
}
const expression = (mathJson: unknown): GraphExpressionIR => ({ mathJson, freeSymbols: symbols(mathJson) } as GraphExpressionIR);
const units = { x: 0.02, y: 0.02 };
const port = currentPtxSolverPort;

function locus(left: unknown, right: unknown): PtxPlaneFunction {
  const f = port.complexFunction(['Add', left, ['Negate', right]], {})!;
  return (x, y) => {
    const value = f({ re: x, im: y });
    return value && Math.abs(value.im) <= 1e-9 * Math.max(1, Math.abs(value.re)) ? value.re : undefined;
  };
}

describe('PTX refiners', () => {
  it('evaluates an explicit curve at the pointer instead of interpolating', () => {
    const sine = port.realFunction(expression(['Sin', 'x']), 'x', {})!;
    const point = ptxRefineExplicit(sine, 1.234567, 'y-of-x')!;
    expect(point.y).toBe(Math.sin(1.234567));
    expect(point.level).toBe('numeric-validated');
  });

  it('projects onto x^2 + y^2 = 9 within 1e-10 and brackets the point', () => {
    const circle = port.planeFunction(expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]]), expression(9), {})!;
    const point = ptxProjectToCurve(circle, { x: 2.1, y: 2.2 }, units, 20)!;
    expect(Math.abs(Math.hypot(point.x, point.y) - 3)).toBeLessThan(1e-10);
    expect(point.level).toBe('numeric-validated');
    expect(point.errorBound).toBeLessThan(1e-8);
  });

  it('projects onto the locus |z - 1| = 2 and steps along it', () => {
    const F = locus(['Abs', ['Add', 'z', -1]], 2);
    const point = ptxProjectToCurve(F, { x: 2.9, y: 0.6 }, units)!;
    expect(Math.abs(Math.hypot(point.x - 1, point.y) - 2)).toBeLessThan(1e-10);
    const stepped = ptxStepAlongCurve(F, point, 10, units)!;
    expect(Math.abs(Math.hypot(stepped.x - 1, stepped.y) - 2)).toBeLessThan(1e-10);
    // Ten screen pixels at 0.02 units per pixel is about 0.2 along the curve.
    expect(Math.hypot(stepped.x - point.x, stepped.y - point.y)).toBeCloseTo(0.2, 2);
  });

  it('never lands on the arg branch cut, which is a jump and not a root', () => {
    const ray = locus(['Arg', 'z'], 3);
    // Near the negative real axis just below it: arg is about −π there.
    expect(ptxProjectToCurve(ray, { x: -2, y: -0.01 }, units)).toBeNull();
    const near = ptxProjectToCurve(ray, { x: 3 * Math.cos(3), y: 3 * Math.sin(3) + 0.03 }, units)!;
    expect(Math.atan2(near.y, near.x)).toBeCloseTo(3, 10);
  });

  it('refuses curves farther than the move limit', () => {
    const circle = port.planeFunction(expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]]), expression(9), {})!;
    expect(ptxProjectToCurve(circle, { x: 0, y: 0 }, units, 12)).toBeNull();
  });
});

describe('PTX finders', () => {
  it('finds x ∩ x^2 at (0, 0) and (1, 1), exactly for polynomials', () => {
    const f = port.realFunction(expression('x'), 'x', {})!;
    const g = port.realFunction(expression(['Power', 'x', 2]), 'x', {})!;
    const exact = port.realPolynomialRoots(['Add', 'x', ['Negate', ['Power', 'x', 2]]], 'x', {});
    const points = ptxRealIntersections(f, g, -10, 10, {}, exact);
    expect(points.map((point) => [point.x, point.y, point.level])).toEqual([[0, 0, 'exact-proved'], [1, 1, 'exact-proved']]);
    const numeric = ptxRealIntersections(f, g, -10, 10);
    expect(numeric.map((point) => Number(point.x.toFixed(9)) + 0)).toEqual([0, 1]);
  });

  it('finds a tangential intersection that does not change sign', () => {
    const f = port.realFunction(expression(['Power', 'x', 2]), 'x', {})!;
    const g = port.realFunction(expression(['Add', ['Multiply', 2, 'x'], -1]), 'x', {})!;
    const points = ptxRealIntersections(f, g, -10, 10);
    expect(points).toHaveLength(1);
    expect(points[0]!.x).toBeCloseTo(1, 7);
  });

  it('finds the touching root of (x − 1)^2 e^x but not x^2 + 1e-4', () => {
    const touching = port.realFunction(expression(['Multiply', ['Power', ['Add', 'x', -1], 2], ['Exp', 'x']]), 'x', {})!;
    // The window keeps x = 1 off the sample grid, so the root is found by the |f| minimum, not by a lucky sample.
    const roots = ptxRealRoots(touching, -10, 10.3);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.x).toBeCloseTo(1, 7);
    expect(roots[0]!.level).toBe('sampled-estimate');
    const lifted = port.realFunction(expression(['Add', ['Power', 'x', 2], 0.0001]), 'x', {})!;
    expect(ptxRealRoots(lifted, -10, 10)).toEqual([]);
  });

  it('does not report the pole of 1/x or tan x as a root', () => {
    const reciprocal = port.realFunction(expression(['Divide', 1, 'x']), 'x', {})!;
    expect(ptxRealRoots(reciprocal, -10, 10)).toEqual([]);
    const tangent = port.realFunction(expression(['Tan', 'x']), 'x', {})!;
    const roots = ptxRealRoots(tangent, -4, 4).map((root) => Number(root.x.toFixed(9)) + 0);
    expect(roots).toEqual([-3.141592654, 0, 3.141592654]);
  });

  it('finds the extrema of sin x with honest error bounds and skips poles', () => {
    const sine = port.realFunction(expression(['Sin', 'x']), 'x', {})!;
    const extrema = ptxRealExtrema(sine, -4, 4);
    expect(extrema.map((point) => point.kind)).toEqual(['minimum', 'maximum']);
    const peak = extrema.find((point) => point.kind === 'maximum' && point.x > 0)!;
    expect(Math.abs(peak.x - Math.PI / 2)).toBeLessThanOrEqual(peak.errorBound);
    expect(peak.y).toBeCloseTo(1, 12);
    const tangent = port.realFunction(expression(['Tan', 'x']), 'x', {})!;
    expect(ptxRealExtrema(tangent, -4, 4)).toEqual([]);
  });

  it('finds where two circles in the complex plane cross', () => {
    const first = locus(['Abs', 'z'], 2);
    const second = locus(['Abs', ['Add', 'z', -2]], 2);
    const points = ptxPlaneIntersections(first, second, { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }, port);
    expect(points.map((point) => [Number(point.x.toFixed(9)), Number(point.y.toFixed(9))]).sort((a, b) => a[1]! - b[1]!))
      .toEqual([[1, -1.732050808], [1, 1.732050808]]);
  });
});

describe('PTX readouts', () => {
  it('shows only the digits the error bound supports', () => {
    expect(ptxSignificantDigits(1.23456789, 0)).toBe(6);
    expect(ptxSignificantDigits(1.23456789, 1e-3)).toBe(3);
    expect(ptxNumber(1.23456789, 1e-3)).toBe('1.23');
    expect(ptxNumber(3e-12, 1e-9)).toBe('0');
    expect(ptxComplexText(-0.5, Math.sqrt(3) / 2)).toBe('−0.5 + 0.866025i');
    expect(ptxComplexText(0, -1)).toBe('−i');
    expect(ptxBadge('exact-proved')).toBe('exact');
    expect(ptxBadge('numeric-validated')).toBe('verified');
    expect(ptxBadge('sampled-estimate')).toBe('numeric');
  });
});

describe('PTX solver port', () => {
  it('runs the finders on any adapter, so a rebuilt engine swaps in as one object', () => {
    const calls: string[] = [];
    const fake: PtxSolverPort = {
      ...currentPtxSolverPort,
      id: 'fake',
      planeSystemRoots(first, second, window) { calls.push('planeSystemRoots'); return currentPtxSolverPort.planeSystemRoots(first, second, window); },
    };
    ptxPlaneIntersections(locus(['Abs', 'z'], 1), locus(['Real', 'z'], 0), { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }, fake);
    expect(calls).toEqual(['planeSystemRoots']);
  });
});
