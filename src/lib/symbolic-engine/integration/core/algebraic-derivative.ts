import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import type { Polynomial } from './polynomial';
import type { Bezout } from './polynomial-division';
import { factorCoefficientDomain } from './factorization-domain';
import type { DifferentialBounds } from './differential-field';
import { algebraicHeight, isAlgebraicField, verifyAlgebraicConstructionWithin, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { reuseAlgebraicVerification } from './algebraic-proof-reuse';

export interface AlgebraicGeneratorDerivative<E> {
  readonly coefficients: readonly AlgebraicDerivative<E>[];
  readonly separant: AlgebraicElement<E>;
  readonly inverse: AlgebraicElement<E>;
  readonly bezout: Bezout<E>;
  readonly derivative: AlgebraicElement<E>;
}
export type AlgebraicDerivative<E> = Readonly<{input: E; derivative: E} & (
  {kind: 'base'} | {kind: 'embedded'; coefficient: AlgebraicDerivative<unknown> | null} |
  {kind: 'algebraic'; rule: AlgebraicGeneratorDerivative<unknown>; coefficients: readonly AlgebraicDerivative<unknown>[]})>;
export function verifyAlgebraicChainWithin<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): void {
  algebraicHeight(ctx, field, bounds);
  if (isAlgebraicField(field)) {
    reuseAlgebraicVerification(ctx, 'construction-chain', field, field, bounds, () => {
      verifyAlgebraicChainWithin(ctx, field.parent, bounds);
      verifyAlgebraicConstructionWithin(ctx, field.ring, field.construction.relation, field.construction, bounds);
    });
  }
}
function baseDerivative<E>(ctx: ExecutionContext, field: ExactField<E>, value: E, bounds: DifferentialBounds): E {
  field.assert(ctx, value); const base = factorCoefficientDomain(ctx, field, bounds.towerHeight);
  if (!base.fraction) return field.fromInteger(ctx, 0n);
  const f = base.fraction.read(ctx, value), r = base.fraction.ring;
  // Independent quotient/dual-number rule; coefficients here are owned rationals.
  return base.fraction.make(ctx, r.subtract(ctx, r.multiply(ctx, r.derivative(ctx, f.numerator), f.denominator),
    r.multiply(ctx, f.numerator, r.derivative(ctx, f.denominator))), r.multiply(ctx, f.denominator, f.denominator));
}
function evaluate<E>(ctx: ExecutionContext, field: AlgebraicField<E>, p: Polynomial<E>): AlgebraicElement<E> {
  return field.make(ctx, p);
}
/** Horner in dual numbers, independent of the field differentiation producer. */
function dual<E>(ctx: ExecutionContext, field: AlgebraicField<E>, coefficients: readonly AlgebraicDerivative<E>[], tangent: AlgebraicElement<E>) {
  let value = field.fromInteger(ctx, 0n), derivative = value;
  const alpha = field.generator(ctx);
  for (let i = coefficients.length - 1; i >= 0; i--) {
    derivative = field.add(ctx, field.add(ctx, field.multiply(ctx, derivative, alpha), field.multiply(ctx, value, tangent)), field.embed(ctx, coefficients[i].derivative));
    value = field.add(ctx, field.multiply(ctx, value, alpha), field.embed(ctx, coefficients[i].input));
  }
  return {value, derivative};
}
export function differentiateAlgebraicWithin<E>(ctx: ExecutionContext, field: ExactField<E>, input: E, bounds: DifferentialBounds): AlgebraicDerivative<E> {
  field.assert(ctx, input); algebraicHeight(ctx, field, bounds);
  if (!isAlgebraicField(field)) return Object.freeze({kind: 'base', input, derivative: baseDerivative(ctx, field, input, bounds)});
  const owner: AlgebraicField<unknown> = field, value = input as unknown as AlgebraicElement<unknown>;
  owner.assert(ctx, value); const r = owner.ring;
  if (value.representative.coefficients.length <= 1) {
    const coefficient = value.representative.coefficients.length ? differentiateAlgebraicWithin(ctx, owner.parent, value.representative.coefficients[0], bounds) : null;
    ctx.allocate(4); const result = Object.freeze({kind: 'embedded' as const, input: value,
      derivative: coefficient ? owner.embed(ctx, coefficient.derivative) : owner.fromInteger(ctx, 0n), coefficient}) as unknown as AlgebraicDerivative<E>;
    verifyAlgebraicDerivativeWithin<E>(ctx, field, input, result, bounds); return result;
  }
  ctx.allocate(owner.modulus.coefficients.length + value.representative.coefficients.length + 7);
  const rc = Object.freeze(owner.modulus.coefficients.map(c => differentiateAlgebraicWithin(ctx, owner.parent, c, bounds)));
  const separant = evaluate(ctx, owner, r.derivative(ctx, owner.modulus)), unit = owner.inverseEvidence(ctx, separant);
  const coefficientDerivative = r.make(ctx, rc.map(c => c.derivative));
  const derivative = owner.negate(ctx, owner.multiply(ctx, owner.make(ctx, coefficientDerivative), unit.inverse));
  const rule = Object.freeze({coefficients: rc, separant, inverse: unit.inverse, bezout: unit.bezout, derivative});
  const coefficients = Object.freeze(value.representative.coefficients.map(c => differentiateAlgebraicWithin(ctx, owner.parent, c, bounds)));
  const parts = owner.make(ctx, r.make(ctx, coefficients.map(c => c.derivative)));
  const out = owner.add(ctx, parts, owner.multiply(ctx, owner.make(ctx, r.derivative(ctx, value.representative)), derivative));
  const result = Object.freeze({kind: 'algebraic' as const, input: value, derivative: out, rule, coefficients}) as unknown as AlgebraicDerivative<E>;
  verifyAlgebraicDerivativeWithin<E>(ctx, field, input, result, bounds); return result;
}
export function verifyAlgebraicDerivativeWithin<E>(ctx: ExecutionContext, field: ExactField<E>, input: E,
  proof: AlgebraicDerivative<E>, bounds: DifferentialBounds): void {
  field.assert(ctx, input); field.assert(ctx, proof.derivative);
  demand(field.equal(ctx, proof.input, input), 'verification-failed', 'algebraic derivative input');
  if (!isAlgebraicField(field)) {
    algebraicHeight(ctx, field, bounds);
    demand(proof.kind === 'base' && field.equal(ctx, proof.derivative, baseDerivative(ctx, field, input, bounds)), 'verification-failed', 'base derivative'); return;
  }
  const owner: AlgebraicField<unknown> = field, value = input as unknown as AlgebraicElement<unknown>;
  if (proof.kind === 'embedded') {
    demand(value.representative.coefficients.length <= 1, 'verification-failed', 'embedded derivative input');
    if (proof.coefficient === null) demand(value.representative.coefficients.length === 0 && field.isZero(ctx, proof.derivative), 'verification-failed', 'embedded zero derivative');
    else {
      demand(value.representative.coefficients.length === 1, 'verification-failed', 'embedded coefficient coverage');
      verifyAlgebraicDerivativeWithin(ctx, owner.parent, value.representative.coefficients[0], proof.coefficient, bounds);
      demand(owner.equal(ctx, owner.embed(ctx, proof.coefficient.derivative), proof.derivative as unknown as AlgebraicElement<unknown>), 'verification-failed', 'embedded derivative identity');
    }
    return;
  }
  demand(proof.kind === 'algebraic', 'verification-failed', 'algebraic derivative kind'); const rule = proof.rule;
  const check = (p: Polynomial<unknown>, cs: readonly AlgebraicDerivative<unknown>[]) => {
    demand(p.coefficients.length === cs.length, 'verification-failed', 'derivative coefficient coverage');
    for (let i = 0; i < cs.length; i++) verifyAlgebraicDerivativeWithin(ctx, owner.parent, p.coefficients[i], cs[i], bounds);
  };
  check(owner.modulus, rule.coefficients); check(value.representative, proof.coefficients);
  demand(owner.equal(ctx, rule.separant, owner.make(ctx, owner.ring.derivative(ctx, owner.modulus))), 'verification-failed', 'generator separant');
  owner.verifyInverse(ctx, rule.separant, rule.inverse, rule.bezout);
  const relation = dual(ctx, owner, rule.coefficients, rule.derivative);
  demand(owner.isZero(ctx, relation.value) && owner.isZero(ctx, relation.derivative), 'verification-failed', 'differentiated defining relation');
  const result = dual(ctx, owner, proof.coefficients, rule.derivative);
  demand(owner.equal(ctx, result.value, value) && owner.equal(ctx, result.derivative, proof.derivative as unknown as AlgebraicElement<unknown>),
    'verification-failed', 'algebraic dual-number derivative');
}
export function differentiateAlgebraic<E>(ctx: ExecutionContext, field: ExactField<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, field, bounds); return differentiateAlgebraicWithin(ctx, field, input, bounds); });
}
export function verifyAlgebraicDerivative<E>(ctx: ExecutionContext, field: ExactField<E>, input: E, target: E,
  proof: AlgebraicDerivative<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => {
    verifyAlgebraicChainWithin(ctx, field, bounds); verifyAlgebraicDerivativeWithin(ctx, field, input, proof, bounds);
    demand(field.equal(ctx, proof.derivative, target), 'verification-failed', 'explicit algebraic derivative target');
  });
}
