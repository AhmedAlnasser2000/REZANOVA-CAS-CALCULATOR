/** Ordered native evaluation restrictions, including every coefficient path. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { recursiveConstructionArgument } from './recursive-differential-admission';

export interface RecursiveCondition {
  readonly kind: 'denominator' | 'logarithm-argument';
  readonly path: string;
  readonly value: E;
}
export interface RecursiveConditionSource { readonly path: string; readonly value: E; readonly nonzero?: boolean }
export function certifiedTowerConditionSources(ctx: ExecutionContext, view: CertifiedTowerView): readonly RecursiveConditionSource[] {
  const sources: RecursiveConditionSource[] = [];
  for (let v: CertifiedTowerView | null = view; v?.parent; v = v.parent) {
    ctx.allocate(2); sources.push({path: `construction.${v.owner.height}.rate`, value: v.rate!});
    if (v.proof.kind === 'first-level') sources.push({path: `construction.${v.owner.height}.argument`, value: v.proof.admission.argument, nonzero: v.proof.admission.kind === 'logarithmic'});
    if (v.proof.kind === 'recursive') sources.push({path: `construction.${v.owner.height}.argument`, value: recursiveConstructionArgument(v.proof.admission.construction), nonzero: v.proof.admission.construction.kind === 'logarithm'});
  }
  return Object.freeze(sources);
}
export function recursiveConditions(ctx: ExecutionContext, owner: DifferentialField, sources: readonly RecursiveConditionSource[]): readonly RecursiveCondition[] {
  const out: RecursiveCondition[] = [];
  function add(kind: RecursiveCondition['kind'], path: string, value: E) {
    ctx.allocate(path.length + 4); out.push(Object.freeze({kind, path, value: owner.embed(ctx, value)}));
  }
  function traverse(path: string, value: E): void {
    value.owner.assert(ctx, value);
    if (value.kind === 'scalar') return;
    const ring = value.owner.fractions!.ring;
    add('denominator', path, value.owner.fraction(ctx, value.owner.fractions!.make(ctx, value.value.denominator, ring.one(ctx))));
    for (const side of ['numerator', 'denominator'] as const) for (let i = 0; i < value.value[side].coefficients.length; i++) {
      ctx.tick(); const next = `${path}.${side}.${i}`; ctx.allocate(next.length); traverse(next, value.value[side].coefficients[i]);
    }
  }
  for (const source of sources) {
    ctx.tick(); owner.embed(ctx, source.value);
    if (source.nonzero) {
      demand(!source.value.owner.isZero(ctx, source.value), 'division-by-zero', 'zero recursive construction argument');
      add('logarithm-argument', source.path, source.value);
    }
    traverse(source.path, source.value);
  }
  return Object.freeze(out);
}
export function verifyRecursiveConditions(ctx: ExecutionContext, owner: DifferentialField, sources: readonly RecursiveConditionSource[], actual: readonly RecursiveCondition[]): void {
  const expected = recursiveConditions(ctx, owner, sources);
  demand(actual.length === expected.length, 'verification-failed', 'recursive restriction provenance coverage');
  for (let i = 0; i < expected.length; i++) demand(actual[i].kind === expected[i].kind && actual[i].path === expected[i].path
    && owner.equal(ctx, actual[i].value, expected[i].value), 'verification-failed', 'recursive retained restriction');
}
