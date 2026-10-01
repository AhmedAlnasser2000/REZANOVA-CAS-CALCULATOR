import type { GraphPiecewiseSpecV1, GraphRelationIR } from '../contracts';
import type { PtxCurvePoint, PtxPlaneFunction, PtxRealFunction } from './solver-port';

// One model for every real curve PTX finds points on (PTX3): its crossings,
// turning points, ends and intersections are found the same way whatever the
// curve was typed as.

/** A curve traced by a parameter: (x(t), y(t)), a polar r(θ), or a complex trajectory z(t) = x + iy. */
export type PtxParamCurve = {
  kind: 'param';
  point: PtxCurvePoint;
  /** t, θ, or the trajectory's own letter. */
  symbol: string;
  tMin: number;
  tMax: number;
  /** A typed restriction: its ends are ends of the curve (the default range's are not). */
  restricted: boolean;
  includesStart: boolean;
  includesEnd: boolean;
  /** r(θ), for polar curves. */
  radius: PtxRealFunction | null;
  /** A complex trajectory: readouts say z = x + iy. */
  complex: boolean;
};

export type PtxCurve =
  /** y = f(x). */
  | { kind: 'graph'; f: PtxRealFunction }
  /** x = f(y). */
  | { kind: 'graph-x'; f: PtxRealFunction }
  | PtxParamCurve
  /** F(x, y) = 0, including a region's edge. */
  | { kind: 'implicit'; F: PtxPlaneFunction };

export type PtxCurveSource = { relation: GraphRelationIR } | { piecewise: GraphPiecewiseSpecV1 };
