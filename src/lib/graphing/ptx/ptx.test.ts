import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { ptxAsymptoteLabel, ptxAsymptotes } from './asymptotes';
import { ptxBadge, ptxComplexText, ptxNumber, ptxSignificantDigits } from './certify';
import { ptxDiscontinuityMarkers, ptxPlaneIntersections, ptxRealDiscontinuities, ptxRealExtrema, ptxRealIntersections, ptxRealRoots } from './features';
import { ptxProjectToCurve, ptxRefineExplicit, ptxRefineParametric, ptxStepAlongCurve } from './refine';
import type { PtxPlaneFunction, PtxSolverPort } from './solver-port';
import { currentPtxSolverPort } from './solver-port-current';

function symbols(node: unknown): string[] {
  if (typeof node === 'string') return /^(?:[a-z]|theta)$/u.test(node) ? [node] : [];
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

describe('PTX parametric and polar refinement', () => {
  it('puts a traced parametric point exactly on (cos t, sin t), nearest the pointer', () => {
    const curve = port.curvePoint({ kind: 'parametric-curve', parameterSymbol: 't', x: expression(['Cos', 't']), y: expression(['Sin', 't']) }, {})!;
    const point = ptxRefineParametric(curve, 1, 0.2, { x: 0.66, y: 0.88 }, units)!;
    expect(Math.abs(Math.hypot(point.x, point.y) - 1)).toBeLessThan(1e-12);
    expect(point.t).toBeCloseTo(Math.atan2(0.88, 0.66), 6);
  });

  it('reads r and θ on a polar curve', () => {
    const curve = port.curvePoint({ kind: 'polar-radius', angleSymbol: 'theta', radius: expression(['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]]) }, {})!;
    const point = ptxRefineParametric(curve, 0.3, 0.1, { x: 1.2, y: 0.4 }, units)!;
    expect(point.radius).toBeCloseTo(2 * Math.cos(2 * point.t), 12);
    expect(Math.hypot(point.x, point.y)).toBeCloseTo(Math.abs(point.radius!), 12);
  });
});

describe('PTX holes, jumps and poles', () => {
  const find = (mathJson: unknown, minimum = -3.3, maximum = 3.3) => {
    const f = port.realFunction(expression(mathJson), 'x', {})!;
    return ptxRealDiscontinuities(f, mathJson, 'x', minimum, maximum, port, {});
  };
  const rounded = (points: Array<{ x: number; y: number }>) => points.map((point) => [Number(point.x.toFixed(9)) + 0, Number(point.y.toFixed(9)) + 0]);

  it('finds the hole of (x² − 1)/(x − 1) at (1, 2)', () => {
    const found = find(['Divide', ['Add', ['Power', 'x', 2], -1], ['Add', 'x', -1]]);
    expect(found.map((item) => item.kind)).toEqual(['hole']);
    expect(rounded(ptxDiscontinuityMarkers(found).open)).toEqual([[1, 2]]);
  });

  it('marks floor steps filled where the value is and open where it is not', () => {
    const markers = ptxDiscontinuityMarkers(find(['Floor', 'x']));
    expect(rounded(markers.filled)).toEqual([[-3, -3], [-2, -2], [-1, -1], [0, 0], [1, 1], [2, 2], [3, 3]]);
    expect(rounded(markers.open)).toEqual([[-3, -4], [-2, -3], [-1, -2], [0, -1], [1, 0], [2, 1], [3, 2]]);
  });

  it('leaves both ends of |x|/x open at 0 and draws no circle at the pole of 1/x', () => {
    const jump = ptxDiscontinuityMarkers(find(['Divide', ['Abs', 'x'], 'x']));
    expect(rounded(jump.open)).toEqual([[0, -1], [0, 1]]);
    expect(jump.filled).toEqual([]);
    const pole = find(['Divide', 1, 'x']);
    expect(pole.map((item) => item.kind)).toEqual(['pole']);
    expect(ptxDiscontinuityMarkers(pole)).toEqual({ open: [], filled: [] });
    expect(find(['Sin', 'x'])).toEqual([]);
  });
});

describe('PTX asymptotes', () => {
  const lines = (mathJson: unknown) => {
    const f = port.realFunction(expression(mathJson), 'x', {})!;
    return ptxAsymptotes(f, mathJson, 'x', -10, 10, port, {})
      .map((line) => `${ptxAsymptoteLabel(line, (value) => String(Number(value.toFixed(9))))} ${line.sides.join(',')} ${line.level}`);
  };

  it('finds exact lines for rational functions', () => {
    expect(lines(['Divide', 'x', ['Add', 'x', -1]])).toEqual(['x = 1 -1,1 exact-proved', 'y = 1 -1,1 exact-proved']);
    expect(lines(['Divide', ['Add', ['Power', 'x', 2], 1], 'x'])).toEqual(['x = 0 -1,1 exact-proved', 'y = x -1,1 exact-proved']);
    expect(lines(['Divide', ['Add', ['Multiply', 2, ['Power', 'x', 2]], -3], ['Add', 'x', 1]])).toEqual(['x = -1 -1,1 exact-proved', 'y = 2x − 2 -1,1 exact-proved']);
  });

  it('finds one-sided and numeric lines for other functions', () => {
    expect(lines(['Ln', 'x'])).toEqual(['x = 0 1 numeric-validated']);
    expect(lines(['Exp', 'x'])).toEqual(['y = 0 -1 numeric-validated']);
    expect(lines(['Add', ['Divide', ['Sin', 'x'], 'x'], 1])).toEqual(['y = 1 -1,1 numeric-validated']);
    expect(lines(['Power', 'x', 2])).toEqual([]);
  });

  it('finds the poles of tan, sec and cot, which have no written denominator, and none for smooth curves', () => {
    const halfPi = (k: number) => `x = ${Number((k * Math.PI / 2).toFixed(9))} -1,1 numeric-validated`;
    expect(lines(['Tan', 'x'])).toEqual([-5, -3, -1, 1, 3, 5].map(halfPi));
    expect(lines(['Sec', 'x'])).toEqual([-5, -3, -1, 1, 3, 5].map(halfPi));
    expect(lines(['Cot', 'x'])).toHaveLength(7);
    expect(lines(['Tan', ['Multiply', 3, 'x']])).toHaveLength(20);
    expect(lines(['Sin', 'x'])).toEqual([]);
    const f = port.realFunction(expression(['Floor', 'x']), 'x', {})!;
    expect(ptxRealDiscontinuities(f, ['Floor', 'x'], 'x', -10.4, 10.4, port, {}).every((item) => item.kind === 'jump')).toBe(true);
  });
});
