/** Q(x) base case of the complete radical logarithmic-derivative procedure. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, integerGcd, type Rational } from './rational';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E, type DifferentialBounds } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import type { Polynomial as P } from './polynomial';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { factorRecursivePolynomial, verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import { descendCoefficientSystem, verifyCoefficientSystemWithin, type RationalCoefficientSystem } from './recursive-coefficient-system';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';

export interface LogarithmicFactor {
  readonly polynomial: P<E>;
  readonly value: E;
  readonly derivative: DerivativeEvidence;
  readonly logarithmicDerivative: E;
}
export interface RadicalRelation {
  readonly coefficients: readonly Rational[];
  readonly valuations: readonly Rational[];
  readonly index: bigint;
  /** g is the factored product of factor[j]^powers[j]; zero powers are explicit. */
  readonly powers: readonly bigint[];
}
export interface RationalLogarithmicRelations {
  readonly rule: 'rational-prime-divisor-logarithmic-relations-v1';
  readonly inputs: readonly E[];
  readonly factorizations: readonly RecursivePolynomialFactorization<E>[];
  readonly factors: readonly LogarithmicFactor[];
  readonly comparison: RationalCoefficientSystem;
  readonly linear: LinearSolution<Rational>;
  readonly independence: LinearSolution<Rational>;
  readonly basis: readonly RadicalRelation[];
  readonly conditions: readonly P<E>[];
}
function validate(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[]): void {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner);
  demand(Array.isArray(inputs), 'invalid-input', 'logarithmic relation inputs');
  for (const input of inputs) owner.assert(ctx, input);
}
function denominator(ctx: ExecutionContext, owner: DifferentialField, value: E): P<E> {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'logarithmic relation fraction'); return value.value.denominator;
}
function constraint(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], factors: readonly LogarithmicFactor[]): LinearSystem<E> {
  ctx.allocate(inputs.length + factors.length + 3);
  return Object.freeze({rows: 1, columns: inputs.length + factors.length,
    matrix: Object.freeze([Object.freeze([...inputs, ...factors.map(f => owner.negate(ctx, f.logarithmicDerivative))])]), rhs: Object.freeze([owner.fromInteger(ctx, 0n)])});
}
function projectedSystem(ctx: ExecutionContext, inputCount: number, basis: readonly RadicalRelation[]): LinearSystem<Rational> {
  ctx.allocate(inputCount * (basis.length + 1) + 4); const matrix: (readonly Rational[])[] = [], rhs: Rational[] = [];
  for (let i = 0; i < inputCount; i++) {
    matrix.push(Object.freeze(basis.map(b => b.coefficients[i]))); rhs.push(rational(ctx, 0n));
  }
  return Object.freeze({rows: inputCount, columns: basis.length, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}
/** Minimal index follows from unique prime valuations, not constant-root extraction. */
export function radicalValuations(ctx: ExecutionContext, coefficients: readonly Rational[], valuations: readonly Rational[]): RadicalRelation {
  let index = 1n;
  for (const v of valuations) { Q.assert(ctx, v); index = ctx.multiply(ctx.quotient(index, integerGcd(ctx, index, v.denominator)), v.denominator); }
  ctx.allocate(coefficients.length + valuations.length * 2 + 4);
  return Object.freeze({coefficients: Object.freeze([...coefficients]), valuations: Object.freeze([...valuations]), index,
    powers: Object.freeze(valuations.map(v => ctx.multiply(v.numerator, ctx.quotient(index, v.denominator))))});
}
function combination(ctx: ExecutionContext, owner: DifferentialField, values: readonly E[], cs: readonly Rational[]): E {
  demand(values.length === cs.length, 'verification-failed', 'logarithmic relation combination coverage'); let out = owner.fromInteger(ctx, 0n);
  for (let i = 0; i < values.length; i++) out = owner.add(ctx, out, owner.multiply(ctx, owner.embed(ctx, owner.parent!.scalar(ctx, cs[i])), values[i]));
  return out;
}
export function solveRationalLogarithmicDerivativeRelations(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], bounds: DifferentialBounds): RationalLogarithmicRelations {
  return ctx.operation(() => {
    validate(ctx, owner, inputs); const ring = owner.fractions!.ring;
    ctx.allocate(inputs.length * 2); const factorizations = Object.freeze(inputs.map(v => factorRecursivePolynomial(ctx, ring, denominator(ctx, owner, v), bounds)));
    const factors: LogarithmicFactor[] = [];
    for (const f of factorizations) {
      demand(f.kind === 'factorization', 'verification-failed', 'zero logarithmic denominator');
      for (const factor of f.factors) if (!factors.some(g => ring.equal(ctx, g.polynomial, factor.polynomial))) {
        const value = owner.fraction(ctx, owner.fractions!.make(ctx, factor.polynomial, ring.one(ctx))), derivative = differentiate(ctx, owner, value);
        ctx.allocate(5); factors.push(Object.freeze({polynomial: factor.polynomial, value, derivative,
          logarithmicDerivative: owner.exactDivide(ctx, derivative.derivative, value)}));
      }
    }
    const comparison = descendCoefficientSystem(ctx, owner, constraint(ctx, owner, inputs, factors), bounds);
    const linear = solveLinearSystem(ctx, Q, comparison.system); demand(linear.kind === 'consistent', 'verification-failed', 'homogeneous radical relation system');
    ctx.allocate(linear.nullspace.length); const basis = Object.freeze(linear.nullspace.map(v => radicalValuations(ctx, v.slice(0, inputs.length), v.slice(inputs.length))));
    const independence = solveLinearSystem(ctx, Q, projectedSystem(ctx, inputs.length, basis));
    ctx.allocate(9 + inputs.length + factors.length);
    const e = Object.freeze({rule: 'rational-prime-divisor-logarithmic-relations-v1' as const, inputs: Object.freeze([...inputs]),
      factorizations, factors: Object.freeze(factors), comparison, linear, independence, basis,
      conditions: Object.freeze(inputs.map(v => denominator(ctx, owner, v)))});
    verifyRationalLogarithmicRelationsWithin(ctx, owner, inputs, e, bounds); return e;
  });
}
export function verifyRationalLogarithmicRelationsWithin(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], e: RationalLogarithmicRelations, bounds: DifferentialBounds): void {
  validate(ctx, owner, inputs); const ring = owner.fractions!.ring;
  demand(e.rule === 'rational-prime-divisor-logarithmic-relations-v1' && e.inputs.length === inputs.length
    && e.factorizations.length === inputs.length && e.conditions.length === inputs.length, 'verification-failed', 'logarithmic relation input coverage');
  const distinct: P<E>[] = [];
  for (let i = 0; i < inputs.length; i++) {
    demand(owner.equal(ctx, inputs[i], e.inputs[i]), 'verification-failed', 'logarithmic relation ordered input');
    const d = denominator(ctx, owner, inputs[i]); verifyRecursiveFactorizationInternal(ctx, ring, d, e.factorizations[i], bounds);
    demand(ring.equal(ctx, d, e.conditions[i]), 'verification-failed', 'logarithmic relation original denominator');
    const f = e.factorizations[i]; demand(f.kind === 'factorization', 'verification-failed', 'logarithmic relation nonzero denominator');
    for (const factor of f.factors) if (!distinct.some(g => ring.equal(ctx, g, factor.polynomial))) { ctx.allocate(1); distinct.push(factor.polynomial); }
  }
  demand(e.factors.length === distinct.length, 'verification-failed', 'logarithmic relation prime coverage');
  for (let i = 0; i < distinct.length; i++) {
    const f = e.factors[i]; demand(ring.equal(ctx, distinct[i], f.polynomial) && owner.equal(ctx, f.value,
      owner.fraction(ctx, owner.fractions!.make(ctx, f.polynomial, ring.one(ctx)))), 'verification-failed', 'logarithmic factor native conversion');
    verifyDerivative(ctx, owner, f.value, f.derivative);
    demand(owner.equal(ctx, owner.multiply(ctx, f.logarithmicDerivative, f.value), f.derivative.derivative), 'verification-failed', 'logarithmic factor derivative');
  }
  verifyCoefficientSystemWithin(ctx, owner, constraint(ctx, owner, inputs, e.factors), e.comparison, bounds);
  verifyLinearSolution(ctx, Q, e.comparison.system, e.linear);
  demand(e.linear.kind === 'consistent' && e.basis.length === e.linear.nullspace.length, 'verification-failed', 'logarithmic complete rational basis');
  for (let i = 0; i < e.basis.length; i++) {
    const b = e.basis[i], v = e.linear.nullspace[i];
    demand(b.coefficients.length === inputs.length && b.valuations.length === distinct.length && b.powers.length === distinct.length,
      'verification-failed', 'radical witness coverage');
    for (let j = 0; j < inputs.length; j++) demand(Q.equal(ctx, b.coefficients[j], v[j]), 'verification-failed', 'radical coefficient mapping');
    for (let j = 0; j < distinct.length; j++) demand(Q.equal(ctx, b.valuations[j], v[inputs.length + j]), 'verification-failed', 'radical residue mapping');
    const expected = radicalValuations(ctx, b.coefficients, b.valuations);
    demand(b.index === expected.index && b.powers.every((n, j) => n === expected.powers[j]), 'verification-failed', 'radical minimal index/valuations');
    ctx.allocate(e.factors.length);
    demand(owner.equal(ctx, combination(ctx, owner, inputs, b.coefficients),
      combination(ctx, owner, e.factors.map(f => f.logarithmicDerivative), b.valuations)), 'verification-failed', 'factored logarithmic derivative identity');
  }
  const projected = projectedSystem(ctx, inputs.length, e.basis); verifyLinearSolution(ctx, Q, projected, e.independence);
  demand(e.independence.kind === 'consistent' && e.independence.nullspace.length === 0, 'verification-failed', 'logarithmic projected basis independence');
}
export function verifyRationalLogarithmicDerivativeRelations(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], e: RationalLogarithmicRelations, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRationalLogarithmicRelationsWithin(ctx, owner, inputs, e, bounds));
}
