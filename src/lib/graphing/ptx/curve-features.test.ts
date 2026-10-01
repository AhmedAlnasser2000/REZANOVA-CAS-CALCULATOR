import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR, GraphRelationIR } from '../contracts';
import { ptxCurveAxisCrossings, ptxCurveEnds, ptxCurveIntersections, ptxCurveTurningPoints, ptxPolarOriginCrossings, ptxRegionCorners } from './curve-features';
import type { PtxCurve } from './curves';
import { currentPtxSolverPort as port } from './solver-port-current';

const e = (mathJson: unknown): GraphExpressionIR => ({ mathJson, freeSymbols: [...new Set(JSON.stringify(mathJson).match(/"(x|y|t|theta|s)"/gu)?.map((m) => m.slice(1, -1)) ?? [])] } as GraphExpressionIR);
const window = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const curve = (relation: GraphRelationIR) => port.curve({ relation }, {}, window)!;
const round = (points: Array<{ x: number; y: number }>) => points.map((p) => [Number(p.x.toFixed(6)) + 0, Number(p.y.toFixed(6)) + 0]);
const circleParam = curve({ kind: 'parametric-curve', parameterSymbol: 't', x: e(['Cos', 't']), y: e(['Sin', 't']) } as GraphRelationIR);
const circle = curve({ kind: 'implicit-equality', left: e(['Add', ['Power', 'x', 2], ['Power', 'y', 2]]), right: e(9) } as GraphRelationIR);

describe('PTX3 points of interest on any curve', () => {
  it('finds axis crossings and turning points of a parametric circle traced several times', () => {
    expect(round(ptxCurveAxisCrossings(circleParam, window))).toEqual([[-1, 0], [0, -1], [0, 1], [1, 0]]);
    const turns = ptxCurveTurningPoints(circleParam, window).map((p) => `${p.kind} ${Number(p.x.toFixed(6)) + 0},${Number(p.y.toFixed(6)) + 0}`);
    expect(turns.sort()).toEqual(['highest 0,1', 'leftmost -1,0', 'lowest 0,-1', 'rightmost 1,0']);
  });

  it('finds the same points on an implicit circle, x^2 + y^2 = 9', () => {
    expect(round(ptxCurveAxisCrossings(circle, window))).toEqual([[-3, 0], [0, -3], [0, 3], [3, 0]]);
    const turns = ptxCurveTurningPoints(circle, window).map((p) => `${p.kind} ${Number(p.x.toFixed(5)) + 0},${Number(p.y.toFixed(5)) + 0}`);
    expect(turns.sort()).toEqual(['highest 0,3', 'leftmost -3,0', 'lowest 0,-3', 'rightmost 3,0']);
  });

  it('finds the vertex of x = y^2 as its leftmost point', () => {
    const parabola = curve({ kind: 'explicit-x', rhs: e(['Power', 'y', 2]) } as GraphRelationIR);
    expect(ptxCurveTurningPoints(parabola, window).map((p) => [p.kind, Math.abs(p.x) < 1e-9, Math.abs(p.y) < 1e-6])).toEqual([['leftmost', true, true]]);
    expect(round(ptxCurveAxisCrossings(parabola, window))).toEqual([[0, 0]]);
  });

  it('marks the ends of a restricted curve, included or not', () => {
    const arc = curve({ kind: 'parametric-curve', parameterSymbol: 't', x: e('t'), y: e(['Power', 't', 2]),
      domain: { kind: 'chain', operands: [e(-1), e('t'), e(2)], operators: ['<=', '<'] } } as GraphRelationIR);
    expect(ptxCurveEnds(arc, window).map((end) => [end.kind, end.x, end.y, end.included])).toEqual([['start', -1, 1, true], ['end', 2, 4, false]]);
    expect(ptxCurveEnds(circleParam, window)).toEqual([]);
  });

  it('finds where a rose r = 2cos(2θ) passes through the origin, and not as axis crossings', () => {
    const rose = curve({ kind: 'polar-radius', angleSymbol: 'theta', radius: e(['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]]) } as GraphRelationIR);
    const origin = ptxPolarOriginCrossings(rose, window);
    expect(origin).toHaveLength(1);
    expect(origin[0]!.parameter!.value).toBeCloseTo(Math.PI / 4, 9);
    expect(round(ptxCurveAxisCrossings(rose, window))).toEqual([[-2, 0], [0, -2], [0, 2], [2, 0]]);
  });

  it('intersects curves of different kinds', () => {
    const line = curve({ kind: 'explicit-y', rhs: e('x') } as GraphRelationIR);
    expect(round(ptxCurveIntersections(line, circle, window))).toEqual([[-2.12132, -2.12132], [2.12132, 2.12132]].map(([a, b]) => [Number((Math.sign(a!) * 3 / Math.SQRT2).toFixed(6)), Number((Math.sign(b!) * 3 / Math.SQRT2).toFixed(6))]));
    expect(round(ptxCurveIntersections(circleParam, line, window))).toEqual([[-0.707107, -0.707107], [0.707107, 0.707107]]);
    const vertical = curve({ kind: 'implicit-equality', left: e('x'), right: e(1) } as GraphRelationIR);
    expect(round(ptxCurveIntersections(circle, vertical, window))).toEqual([[1, -2.828427], [1, 2.828427]]);
    const bigCircle: PtxCurve = port.curve({ relation: { kind: 'parametric-curve', parameterSymbol: 's', x: e(['Multiply', 2, ['Cos', 's']]), y: e(['Multiply', 2, ['Sin', 's']]),
      domain: { kind: 'chain', operands: [e(0), e('s'), e(6.283185307179586)], operators: ['<=', '<'] } } as GraphRelationIR }, {}, window)!;
    const shifted: PtxCurve = port.curve({ relation: { kind: 'parametric-curve', parameterSymbol: 't', x: e(['Add', 2, ['Multiply', 2, ['Cos', 't']]]), y: e(['Multiply', 2, ['Sin', 't']]),
      domain: { kind: 'chain', operands: [e(0), e('t'), e(6.283185307179586)], operators: ['<=', '<'] } } as GraphRelationIR }, {}, window)!;
    expect(round(ptxCurveIntersections(bigCircle, shifted, window))).toEqual([[1, -1.732051], [1, 1.732051]]);
  });

  it('finds a region corner and whether it belongs to the region', () => {
    const open = port.regionEdges({ kind: 'chained-inequality', operands: [e('x'), e('y'), e(2)], operators: ['<', '<'] } as GraphRelationIR, {})!;
    expect(ptxRegionCorners(open, window).map((c) => [Number(c.x.toFixed(6)), Number(c.y.toFixed(6)), c.included])).toEqual([[2, 2, false]]);
    const closed = port.regionEdges({ kind: 'chained-inequality', operands: [e('x'), e('y'), e(2)], operators: ['<=', '<='] } as GraphRelationIR, {})!;
    expect(ptxRegionCorners(closed, window)[0]!.included).toBe(true);
  });
});
