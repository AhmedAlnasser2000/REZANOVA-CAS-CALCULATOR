import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialBounds, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import type { ExponentialExpression, ExponentialNormalizationInput } from './exponential-normalization-types';

export type NormalizationNode =
  | {kind: 'rational' | 'exponential'; value: E; argumentIndex: number}
  | {kind: 'add' | 'subtract' | 'multiply' | 'divide'; left: number; right: number}
  | {kind: 'negate'; value: number}
  | {kind: 'power'; value: number; exponent: bigint};

/** Rebuild the complete source topology for replay; no simplification or family admission here. */
export function normalizationNodes(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialNormalizationInput, bounds: DifferentialBounds) {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner); checkDifferentialBounds(ctx, bounds);
  demand(input !== null && typeof input === 'object' && Array.isArray(input.restrictions), 'invalid-input', 'normalization input');
  const nodes: NormalizationNode[] = [], arguments_: E[] = [], active = new Set<object>();
  let count = 0;
  function visit(e: ExponentialExpression, depth: number): number {
    ctx.tick(); if (++count > bounds.artifactNodes || depth > bounds.artifactDepth) ctx.exhaust('normalization traversal');
    demand(e !== null && typeof e === 'object' && !active.has(e), 'invalid-input', 'cyclic or malformed exponential expression');
    ctx.allocate(7); active.add(e);
    let node: NormalizationNode;
    switch (e.kind) {
      case 'rational': case 'exponential': {
        owner.assert(ctx, e.value); const argumentIndex = arguments_.length;
        if (e.kind === 'exponential') { ctx.allocate(1); arguments_.push(e.value); }
        node = {kind: e.kind, value: e.value, argumentIndex}; break;
      }
      case 'add': case 'subtract': case 'multiply': case 'divide':
        node = {kind: e.kind, left: visit(e.left, depth + 1), right: visit(e.right, depth + 1)}; break;
      case 'negate': node = {kind: e.kind, value: visit(e.value, depth + 1)}; break;
      case 'power': ctx.integer(e.exponent); node = {kind: e.kind, exponent: e.exponent, value: visit(e.value, depth + 1)}; break;
      default: demand(false, 'invalid-input', 'exponential expression kind');
    }
    active.delete(e); const index = nodes.length; nodes.push(node); return index;
  }
  const root = visit(input.expression, 1); ctx.allocate(input.restrictions.length);
  const restrictions = input.restrictions.map(r => {
    demand(r !== null && typeof r === 'object' && typeof r.provenance === 'string', 'invalid-input', 'restriction provenance');
    if (r.provenance.length > bounds.artifactBytes) ctx.exhaust('restriction provenance size');
    ctx.allocate(r.provenance.length + 2); return {node: visit(r.expression, 1), provenance: r.provenance};
  });
  return {nodes, arguments: arguments_, root, restrictions};
}
