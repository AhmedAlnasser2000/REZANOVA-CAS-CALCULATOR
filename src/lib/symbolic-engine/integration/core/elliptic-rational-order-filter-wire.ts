import {demand, type ExecutionContext} from './execution';
import {normalizationInteger} from './exponential-normalization-wire-values';
import type {RationalEllipticOrderFilter} from './elliptic-rational-order-filter';
import * as w from './decision-wire-algebra';

export function rationalEllipticOrderFilterCodec(ctx: ExecutionContext): w.EvidenceCodec<RationalEllipticOrderFilter> {
  const integer = normalizationInteger(ctx), infinity = w.structure(ctx, {kind: w.literal(ctx, 'infinity')}), affine = w.structure(ctx, {kind: w.literal(ctx, 'affine'), x: integer, y: integer});
  const point: w.EvidenceCodec<RationalEllipticOrderFilter['point']> = {encode(v) {return v.kind === 'infinity' ? infinity.encode(v) : affine.encode(v);}, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'finite point record'); const kind = Object.getOwnPropertyDescriptor(data, 'kind');
    demand(kind !== undefined && 'value' in kind && (kind.value === 'infinity' || kind.value === 'affine'), 'invalid-input', 'finite point kind');
    const d = w.record(ctx, data, kind.value === 'infinity' ? ['kind'] : ['kind', 'x', 'y']);
    return d.kind === 'infinity' ? infinity.decode(d) : affine.decode(d);
  }};
  const add = w.structure(ctx, {left: point, right: point, sum: point, slope: w.optional(integer)}), multiple = w.structure(ctx, {coefficient: integer, point, steps: w.list(ctx, w.structure(ctx, {double: add, add: w.optional(add)}))});
  return w.structure(ctx, {prime: integer, polynomial: w.list(ctx, integer), squareFree: w.structure(ctx, {gcd: w.list(ctx, integer), s: w.list(ctx, integer), t: w.list(ctx, integer)}), point, tests: w.list(ctx, multiple)});
}
