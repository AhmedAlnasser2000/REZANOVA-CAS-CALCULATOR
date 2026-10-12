import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import type { DifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { isAlgebraicField, type AlgebraicElement } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';

export interface AlgebraicCondition<E> { readonly kind: 'denominator' | 'nonzero'; readonly path: string; readonly value: E }
export interface AlgebraicConditionSource { readonly field: ExactField<unknown>; readonly value: unknown; readonly path: string; readonly nonzero?: boolean }
export function algebraicConstructionSources<E>(ctx: ExecutionContext, field: ExactField<E>): readonly AlgebraicConditionSource[] {
  const sources: AlgebraicConditionSource[] = [];
  for (let owner: ExactField<unknown> = field as ExactField<unknown>; isAlgebraicField(owner); owner = owner.parent) {
    ctx.allocate(owner.construction.relation.coefficients.length + 1);
    for (let i = 0; i < owner.construction.relation.coefficients.length; i++) sources.push(Object.freeze({field: owner.parent,
      value: owner.construction.relation.coefficients[i], path: `construction.${owner.height}.coefficient.${i}`}));
    sources.push(Object.freeze({field: owner.parent, value: owner.construction.normalization, path: `construction.${owner.height}.leading`, nonzero: true}));
  }
  return Object.freeze(sources);
}
export function algebraicConditions<E>(ctx: ExecutionContext, owner: ExactField<E>, sources: readonly AlgebraicConditionSource[], bounds: DifferentialBounds): readonly AlgebraicCondition<E>[] {
  const out: AlgebraicCondition<E>[] = [];
  function add(kind: AlgebraicCondition<E>['kind'], field: ExactField<unknown>, value: unknown, path: string) {
    ctx.allocate(path.length + 4); const embedding = AlgebraicEmbedding.ancestor(ctx, field, owner, bounds);
    out.push(Object.freeze({kind, path, value: embedding.map(ctx, value)}));
  }
  function traverse(field: ExactField<unknown>, value: unknown, path: string): void {
    field.assert(ctx, value);
    if (isAlgebraicField(field)) {
      const p = (value as AlgebraicElement<unknown>).representative;
      for (let i = 0; i < p.coefficients.length; i++) { ctx.tick(); traverse(field.parent, p.coefficients[i], `${path}.coefficient.${i}`); }
      return;
    }
    const domain = factorCoefficientDomain(ctx, field, bounds.towerHeight);
    if (!domain.fraction) return;
    const f = domain.fraction.read(ctx, value), ring = domain.fraction.ring;
    add('denominator', field, domain.fraction.make(ctx, f.denominator, ring.one(ctx)), path);
  }
  for (const s of sources) {
    if (s.nonzero) {
      demand(!s.field.isZero(ctx, s.value), 'division-by-zero', 'zero algebraic evaluation argument'); add('nonzero', s.field, s.value, s.path);
    }
    traverse(s.field, s.value, s.path);
  }
  return Object.freeze(out);
}
export function verifyAlgebraicConditions<E>(ctx: ExecutionContext, owner: ExactField<E>, sources: readonly AlgebraicConditionSource[], actual: readonly AlgebraicCondition<E>[], bounds: DifferentialBounds): void {
  const expected = algebraicConditions(ctx, owner, sources, bounds);
  demand(actual.length === expected.length, 'verification-failed', 'algebraic condition coverage');
  for (let i = 0; i < actual.length; i++) demand(actual[i].kind === expected[i].kind && actual[i].path === expected[i].path
    && owner.equal(ctx, actual[i].value, expected[i].value), 'verification-failed', 'algebraic condition provenance');
}
