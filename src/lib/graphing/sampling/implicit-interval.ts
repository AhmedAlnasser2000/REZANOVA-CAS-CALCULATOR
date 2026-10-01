import { roundedAdd, roundedMultiply } from '../../numeric/directed-rounding';
import {
  createGraphDualEvaluator,
  createGraphIntervalEvaluator,
  type CompiledGraphExpressionPlan,
} from '../evaluator';

// Interval tests for the implicit sampler (PTX-ENGINE1, gates E5 and E6).
// For each clause F = left − right (sign-flipped for > and ≥, as the sampler
// does), a cell is classified by a guaranteed enclosure of F over it:
// a cell whose enclosure excludes 0 certainly holds no part of that curve,
// and one whose enclosure contains 0 may hold some even when no sample shows
// a sign change (a thin feature, or a curve that only touches zero such as
// (x − y)² = 0). The Plantinga–Vegter test on the gradient's enclosure
// certifies that the curve crosses a cell as at most one simple arc: when any
// two gradients in the cell point within 90° of each other (their dot product
// is positive), the curve cannot turn back or branch there.

export type GraphImplicitClausePlans = { left: CompiledGraphExpressionPlan; right: CompiledGraphExpressionPlan; operator: string };
export type GraphCellBounds = { x0: number; x1: number; y0: number; y1: number };

export type GraphImplicitCellVerdict = {
  /** The enclosure contains 0 (or F is undefined on part of the cell): the curve may pass through. */
  zeroPossible: boolean;
  /** Certain sign of F over the whole cell when it excludes 0. */
  sign: -1 | 0 | 1;
  /** Plantinga–Vegter: gradients in the cell all lie within 90° of each other, so the curve here is at most one simple arc. */
  simpleArc: boolean;
  /** The gradient's enclosure contains (0, 0): a crossing or cusp may lie in the cell. */
  gradientMayVanish: boolean;
};

function differencePlan(clause: GraphImplicitClausePlans): CompiledGraphExpressionPlan {
  const [a, b] = clause.operator === '>' || clause.operator === '>=' ? [clause.right, clause.left] : [clause.left, clause.right];
  return {
    planId: `${a.planId}−${b.planId}`, sourceRevision: 0,
    requiredSymbols: [...new Set([...a.requiredSymbols, ...b.requiredSymbols])], samplingHints: { periodic: [] },
    instructions: [...a.instructions, ...b.instructions,
      { kind: 'operator', operator: 'Negate', arity: 1 }, { kind: 'operator', operator: 'Add', arity: 2 }],
  };
}

export function createGraphImplicitIntervalTester(clauses: readonly GraphImplicitClausePlans[], parameters: Readonly<Record<string, number>>) {
  const compiled = clauses.map((clause) => {
    const plan = differencePlan(clause);
    return {
      plain: createGraphIntervalEvaluator(plan),
      overBox: createGraphIntervalEvaluator(plan, ['x', 'y']),
      atPoint: createGraphIntervalEvaluator(plan),
      dual: createGraphDualEvaluator(plan, ['x', 'y']),
    };
  });

  /** The cheap test alone: whether the plain enclosure can exclude a zero of the clause in the cell. */
  const excludesZero = (index: number, bounds: GraphCellBounds) => {
    const range = compiled[index]!.plain.evaluate({ ...parameters, x: { lo: bounds.x0, hi: bounds.x1 }, y: { lo: bounds.y0, hi: bounds.y1 } });
    return range.defined === 0 || (range.defined === 2 && (range.lo > 0 || range.hi < 0));
  };

  const verdict = (index: number, bounds: GraphCellBounds): GraphImplicitCellVerdict => {
    const evaluator = compiled[index]!;
    const box = { ...parameters, x: { lo: bounds.x0, hi: bounds.x1 }, y: { lo: bounds.y0, hi: bounds.y1 } };
    const range = evaluator.overBox.evaluate(box);
    if (range.defined === 0) return { zeroPossible: false, sign: 0, simpleArc: true, gradientMayVanish: false };
    let lo = range.lo; let hi = range.hi;
    const [gx, gy] = range.gradient;
    const finiteGradient = gx && gy && [gx.lo, gx.hi, gy.lo, gy.hi].every(Number.isFinite);
    // Mean-value tightening: F(c) + ∇F(box)·(box − c) also encloses F and shrinks like the cell squared.
    if (range.defined === 2 && range.smooth && finiteGradient) {
      const cx = (bounds.x0 + bounds.x1) / 2; const cy = (bounds.y0 + bounds.y1) / 2;
      const centre = evaluator.atPoint.evaluate({ ...parameters, x: cx, y: cy });
      if (centre.defined === 2) {
        const dx = { lo: bounds.x0 - cx, hi: bounds.x1 - cx }; const dy = { lo: bounds.y0 - cy, hi: bounds.y1 - cy };
        const meanValue = roundedAdd(centre, roundedAdd(roundedMultiply(gx, dx), roundedMultiply(gy, dy)));
        lo = Math.max(lo, meanValue.lo); hi = Math.min(hi, meanValue.hi);
      }
    }
    const partial = range.defined === 1;
    const zeroPossible = partial || (lo <= 0 && hi >= 0);
    const sign = partial ? 0 : lo > 0 ? 1 : hi < 0 ? -1 : 0;
    let simpleArc = false; let gradientMayVanish = true;
    if (finiteGradient && range.smooth && range.defined === 2) {
      // Lower bound of g·h for any two gradients g, h in the cell: products of the components' enclosures.
      const dot = roundedAdd(roundedMultiply(gx, gx), roundedMultiply(gy, gy));
      simpleArc = dot.lo > 0;
      gradientMayVanish = gx.lo <= 0 && gx.hi >= 0 && gy.lo <= 0 && gy.hi >= 0;
    }
    return { zeroPossible, sign, simpleArc, gradientMayVanish };
  };

  /**
   * Where in a cell |F| is smallest (on a 5 × 5 grid, then refined by a few
   * gradient steps on F²): the point a touching curve passes through.
   */
  const touchingPoint = (index: number, bounds: GraphCellBounds) => {
    const evaluator = compiled[index]!;
    let best: { x: number; y: number; value: number } | null = null;
    for (let i = 0; i <= 4; i += 1) for (let j = 0; j <= 4; j += 1) {
      const x = bounds.x0 + (bounds.x1 - bounds.x0) * i / 4; const y = bounds.y0 + (bounds.y1 - bounds.y0) * j / 4;
      const result = evaluator.dual.evaluate({ ...parameters, x, y });
      if (result.status === 'finite' && (!best || Math.abs(result.value) < Math.abs(best.value))) best = { x, y, value: result.value };
    }
    if (!best) return null;
    let { x, y } = best;
    // A touching zero is a double root, where Newton only halves the distance each step: allow enough steps.
    for (let step = 0; step < 80; step += 1) {
      const result = evaluator.dual.evaluate({ ...parameters, x, y });
      if (result.status !== 'finite') break;
      const [fx, fy] = result.gradient as [number, number];
      const norm2 = fx * fx + fy * fy;
      if (!(norm2 > 0)) break;
      // Newton towards F = 0 along the gradient, kept inside the cell.
      const nx = Math.min(bounds.x1, Math.max(bounds.x0, x - result.value * fx / norm2));
      const ny = Math.min(bounds.y1, Math.max(bounds.y0, y - result.value * fy / norm2));
      if (nx === x && ny === y) break;
      x = nx; y = ny;
    }
    // Only a point where F really reaches 0 inside the cell is a touching curve; a cell beside an ordinary
    // curve (its enclosure overestimates to include 0) leaves Newton stuck at the cell edge with F ≠ 0.
    const at = evaluator.dual.evaluate({ ...parameters, x, y });
    const scale = Math.max(1, Math.abs(best.value));
    if (at.status !== 'finite' || Math.abs(at.value) > 1e-12 * scale) return null;
    // A touching zero keeps one sign all around it; an ordinary curve through the point changes sign nearby
    // (and is already drawn by the cells it crosses).
    const radius = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) / 4;
    let positive = false; let negative = false;
    for (let k = 0; k < 12; k += 1) {
      const angle = (k / 12) * 2 * Math.PI;
      const ring = evaluator.dual.evaluate({ ...parameters, x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle) });
      if (ring.status !== 'finite') continue;
      if (ring.value > 0) positive = true; else if (ring.value < 0) negative = true;
    }
    return positive && negative ? null : { x, y };
  };

  /** A crossing or cusp in the cell: where both partials of F vanish (Newton on ∇F = 0 with a difference Jacobian). */
  const singularPoint = (index: number, bounds: GraphCellBounds) => {
    const evaluator = compiled[index]!;
    const grad = (x: number, y: number) => {
      const result = evaluator.dual.evaluate({ ...parameters, x, y });
      return result.status === 'finite' ? { value: result.value, fx: result.gradient[0]!, fy: result.gradient[1]! } : null;
    };
    let x = (bounds.x0 + bounds.x1) / 2; let y = (bounds.y0 + bounds.y1) / 2;
    const h = 1e-6 * Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    for (let step = 0; step < 20; step += 1) {
      const g = grad(x, y); const gx = grad(x + h, y); const gy = grad(x, y + h);
      if (!g || !gx || !gy) return null;
      const a = (gx.fx - g.fx) / h; const b = (gy.fx - g.fx) / h; const c = (gx.fy - g.fy) / h; const d = (gy.fy - g.fy) / h;
      const determinant = a * d - b * c;
      if (!Number.isFinite(determinant) || determinant === 0) return null;
      const sx = (d * g.fx - b * g.fy) / determinant; const sy = (-c * g.fx + a * g.fy) / determinant;
      x -= sx; y -= sy;
      if (Math.hypot(sx, sy) < 1e-12 * Math.max(1, Math.hypot(x, y))) break;
    }
    const at = grad(x, y);
    const size = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const inside = x >= bounds.x0 - size && x <= bounds.x1 + size && y >= bounds.y0 - size && y <= bounds.y1 + size;
    // A true singular point of the curve: on the curve and with a vanishing gradient.
    return at && inside && Math.abs(at.value) <= 1e-9 * Math.max(1, Math.abs(at.fx) + Math.abs(at.fy) + 1) * size ? { x, y } : null;
  };

  return { verdict, excludesZero, touchingPoint, singularPoint };
}
