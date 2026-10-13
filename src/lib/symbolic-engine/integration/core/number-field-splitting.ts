import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { constructAlgebraicExtension, isAlgebraicField, type AlgebraicField, type AlgebraicElement } from './algebraic-field';
import { AlgebraicEmbedding, assertAlgebraicEmbedding } from './algebraic-embedding';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { constructNumberFieldPresentationWithin, verifyNumberFieldPresentationWithin, numberFieldPresentationValueWithin, type NumberFieldPresentation } from './number-field-presentation';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import type { NumberValue } from './relative-number-field';

export interface NumberFieldSplitStep {
  readonly input: Polynomial<NumberValue>;
  readonly factorization: AlgebraicFactorization<NumberValue>;
  readonly selected: number;
  readonly extension: AlgebraicField<NumberValue> | null;
  readonly presentation: NumberFieldPresentation<AlgebraicElement<NumberValue>> | null;
}
export interface NumberFieldSplitting {
  readonly input: Polynomial<NumberValue>;
  readonly steps: readonly NumberFieldSplitStep[];
  readonly target: AlgebraicField<Rational>;
  readonly embedding: AlgebraicEmbedding<NumberValue, NumberValue>;
  readonly roots: readonly NumberValue[];
}
function nextEmbedding(ctx: ExecutionContext, source: AlgebraicField<Rational>, old: AlgebraicEmbedding<NumberValue, NumberValue>, extension: AlgebraicField<NumberValue>, p: NonNullable<NumberFieldSplitStep['presentation']>, bounds: DifferentialBounds) {
  const image = numberFieldPresentationValueWithin(ctx, extension, p, extension.embed(ctx, old.map(ctx, source.generator(ctx))), bounds);
  return AlgebraicEmbedding.extension(ctx, source, p.field, AlgebraicEmbedding.rationals(ctx, p.field, bounds), image, bounds);
}
function request(ctx: ExecutionContext, ring: PolynomialRing<NumberValue>, input: Polynomial<NumberValue>, field: AlgebraicField<Rational>, embedding: NumberFieldSplitting['embedding']) {
  const r = field === ring.domain ? ring : new PolynomialRing(field, ring.variable);
  return r.make(ctx, input.coefficients.map(c => embedding.map(ctx, c)));
}
function roots(ctx: ExecutionContext, factorization: AlgebraicFactorization<NumberValue>) {
  demand(factorization.kind === 'factorization', 'invalid-input', 'nonzero residue polynomial'); const f = factorization.input.ring.domain;
  ctx.allocate(factorization.factors.length); return Object.freeze(factorization.factors.map(p => {
    demand(p.polynomial.ring.degree(ctx, p.polynomial) === 1, 'verification-failed', 'splitting terminal root coverage');
    return f.negate(ctx, p.polynomial.coefficients[0]);
  }));
}
export function verifyNumberFieldSplittingWithin(ctx: ExecutionContext, ring: PolynomialRing<NumberValue>, input: Polynomial<NumberValue>, proof: NumberFieldSplitting, bounds: DifferentialBounds): void {
  demand(isAlgebraicField(ring.domain) && ring.domain.parent === Q, 'domain-mismatch', 'splitting absolute number-field source');
  const source = ring.domain as AlgebraicField<Rational>; verifyAlgebraicChainWithin(ctx, source, bounds); ring.assert(ctx, input);
  demand(ring.equal(ctx, input, proof.input) && proof.steps.length > 0, 'verification-failed', 'splitting complete expected input');
  let field = source, embedding = AlgebraicEmbedding.identity(ctx, source, bounds), previousLinear = -1;
  for (let i = 0; i < proof.steps.length; i++) {
    ctx.tick(); const p = proof.steps[i], expected = request(ctx, ring, input, field, embedding), r = p.input.ring;
    demand(r.domain === field && r.variable === ring.variable && r.equal(ctx, p.input, r.make(ctx, expected.coefficients)), 'domain-mismatch', 'splitting full input correspondence');
    verifyAlgebraicFactorizationWithin(ctx, r, p.input, p.factorization, bounds);
    demand(p.factorization.kind === 'factorization', 'invalid-input', 'nonzero splitting polynomial');
    const selected = p.factorization.factors.findIndex(f => r.degree(ctx, f.polynomial) > 1), linear = p.factorization.factors.filter(f => r.degree(ctx, f.polynomial) === 1).length;
    demand(p.selected === selected && linear > previousLinear, 'verification-failed', 'splitting complete deterministic selection/progress'); previousLinear = linear;
    if (selected < 0) {
      demand(i === proof.steps.length - 1 && p.extension === null && p.presentation === null && proof.target === field, 'verification-failed', 'splitting terminal coverage');
      const all = roots(ctx, p.factorization); demand(all.length === proof.roots.length && all.every((v, j) => field.equal(ctx, v, proof.roots[j])), 'verification-failed', 'splitting all distinct roots');
      assertAlgebraicEmbedding(ctx, proof.embedding); demand(proof.embedding.source === source && proof.embedding.target === field
        && field.equal(ctx, proof.embedding.map(ctx, source.generator(ctx)), embedding.map(ctx, source.generator(ctx))), 'domain-mismatch', 'splitting final constant embedding'); return;
    }
    demand(p.extension !== null && p.presentation !== null && p.extension.parent === field, 'domain-mismatch', 'splitting root adjunction owner');
    verifyAlgebraicChainWithin(ctx, p.extension, bounds);
    const factor = p.factorization.factors[selected].polynomial;
    demand(p.extension.ring.equal(ctx, p.extension.construction.relation, p.extension.ring.make(ctx, factor.coefficients)), 'verification-failed', 'splitting selected irreducible relation');
    verifyNumberFieldPresentationWithin(ctx, p.extension, p.presentation, bounds);
    embedding = nextEmbedding(ctx, source, embedding, p.extension, p.presentation, bounds); field = p.presentation.field;
  }
  demand(false, 'verification-failed', 'missing splitting terminal evidence');
}
export function splitNumberFieldPolynomialWithin(ctx: ExecutionContext, ring: PolynomialRing<NumberValue>, input: Polynomial<NumberValue>, bounds: DifferentialBounds): NumberFieldSplitting {
  demand(isAlgebraicField(ring.domain) && ring.domain.parent === Q, 'domain-mismatch', 'splitting absolute number-field source');
  const source = ring.domain as AlgebraicField<Rational>; verifyAlgebraicChainWithin(ctx, source, bounds); ring.assert(ctx, input);
  demand(!ring.isZero(ctx, input), 'invalid-input', 'nonzero splitting polynomial');
  const steps: NumberFieldSplitStep[] = []; let field = source, embedding = AlgebraicEmbedding.identity(ctx, source, bounds);
  for (;;) {
    const value = request(ctx, ring, input, field, embedding), r = value.ring, factorization = factorAlgebraicPolynomialWithin(ctx, r, value, bounds);
    demand(factorization.kind === 'factorization', 'invalid-input', 'nonzero splitting polynomial');
    const selected = factorization.factors.findIndex(f => r.degree(ctx, f.polynomial) > 1); ctx.allocate(6);
    if (selected < 0) {
      steps.push(Object.freeze({input: value, factorization, selected, extension: null, presentation: null}));
      const result = Object.freeze({input, steps: Object.freeze(steps), target: field, embedding, roots: roots(ctx, factorization)});
      verifyNumberFieldSplittingWithin(ctx, ring, input, result, bounds); return result;
    }
    const extension = constructAlgebraicExtension(ctx, r, factorization.factors[selected].polynomial, bounds), presentation = constructNumberFieldPresentationWithin(ctx, extension, bounds);
    steps.push(Object.freeze({input: value, factorization, selected, extension, presentation}));
    embedding = nextEmbedding(ctx, source, embedding, extension, presentation, bounds); field = presentation.field;
  }
}
