/** Exact constant-coordinate descent. This is algebraic conversion, not admission. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import { checkDifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { flattenFactorCoefficient, unflattenFactorCoefficient, type FactorFlatFraction } from './factorization-conversion';
import { MultivariateRing, assertMultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import type { LinearSystem } from './linear-system';

export interface CoefficientRowEvidence {
  /** The last entry is the right hand side, without changing its sign. */
  readonly values: readonly FactorFlatFraction[];
  readonly denominator: P<Rational>;
  readonly quotients: readonly P<Rational>[];
  readonly cleared: readonly P<Rational>[];
  /** Complete ordered support of every cleared entry, including the RHS. */
  readonly support: readonly (readonly number[])[];
}
export interface RationalCoefficientSystem {
  readonly auxiliary: MultivariateRing<Rational>;
  readonly rows: readonly CoefficientRowEvidence[];
  readonly system: LinearSystem<Rational>;
}

export function matrixCapacity(ctx: ExecutionContext, rows: number, columns: number): void {
  demand(Number.isSafeInteger(rows) && rows >= 0 && Number.isSafeInteger(columns) && columns >= 0,
    'invalid-input', 'recursive matrix dimensions');
  // Check all dimensions before creating a dense matrix or its complete basis.
  const r = BigInt(rows), c = BigInt(columns), size = r * (c + 2n) + c * (c + 1n);
  if (size > BigInt(Number.MAX_SAFE_INTEGER) || size > BigInt(ctx.limits.allocation)) ctx.exhaust('recursive matrix dimensions');
  ctx.allocate(Number(r * (c + 2n)));
}
function validate<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>): void {
  matrixCapacity(ctx, system.rows, system.columns);
  demand(Array.isArray(system.matrix) && system.matrix.length === system.rows && Array.isArray(system.rhs)
    && system.rhs.length === system.rows, 'invalid-input', 'recursive matrix row coverage');
  for (let i = 0; i < system.rows; i++) {
    demand(Array.isArray(system.matrix[i]) && system.matrix[i].length === system.columns, 'invalid-input', 'recursive matrix column coverage');
    for (const value of system.matrix[i]) field.assert(ctx, value);
    field.assert(ctx, system.rhs[i]);
  }
}
function support(ctx: ExecutionContext, ring: MultivariateRing<Rational>, values: readonly P<Rational>[]): readonly (readonly number[])[] {
  // Ring construction gives a deterministic lexicographic union and charges traversal.
  const terms: {powers: readonly number[]; coefficient: Rational}[] = [];
  const one = Q.fromInteger(ctx, 1n);
  for (const value of values) {
    ring.assert(ctx, value); ctx.allocate(value.terms.length * 2);
    for (const term of value.terms) { ctx.tick(); terms.push({powers: term.powers, coefficient: one}); }
  }
  const union = ring.make(ctx, terms); ctx.allocate(union.terms.length);
  return Object.freeze(union.terms.map(t => t.powers));
}
function samePowers(ctx: ExecutionContext, a: readonly number[], b: readonly number[]): boolean {
  ctx.tick(a.length + 1); return a.length === b.length && a.every((n, i) => n === b[i]);
}
function coefficient(ctx: ExecutionContext, p: P<Rational>, powers: readonly number[]): Rational {
  for (const term of p.terms) if (samePowers(ctx, term.powers, powers)) return term.coefficient;
  return Q.fromInteger(ctx, 0n);
}
function rationalRows(ctx: ExecutionContext, columns: number, rows: readonly CoefficientRowEvidence[]): LinearSystem<Rational> {
  let count = 0;
  for (const row of rows) { ctx.tick(); count += row.support.length; demand(Number.isSafeInteger(count), 'invalid-input', 'recursive matrix row count'); }
  matrixCapacity(ctx, count, columns);
  const matrix: (readonly Rational[])[] = [], rhs: Rational[] = [];
  for (const row of rows) for (const powers of row.support) {
    ctx.allocate(columns); const entries: Rational[] = [];
    for (let j = 0; j < columns; j++) entries.push(coefficient(ctx, row.cleared[j], powers));
    matrix.push(Object.freeze(entries)); rhs.push(coefficient(ctx, row.cleared[columns], powers));
  }
  ctx.allocate(4); return Object.freeze({rows: count, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}

export function descendCoefficientSystem<E>(ctx: ExecutionContext, field: ExactField<E>, input: LinearSystem<E>, bounds: DifferentialBounds): RationalCoefficientSystem {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); validate(ctx, field, input);
    const domain = factorCoefficientDomain(ctx, field, bounds.towerHeight), auxiliary = MultivariateRing.create(ctx, Q, domain.height);
    ctx.allocate(input.rows); const rows: CoefficientRowEvidence[] = [];
    for (let i = 0; i < input.rows; i++) {
      ctx.allocate(input.columns + 1);
      const values = Object.freeze([...input.matrix[i], input.rhs[i]].map(v => flattenFactorCoefficient(ctx, domain, auxiliary, v)));
      let denominator = auxiliary.one(ctx);
      for (const v of values) denominator = auxiliary.multiply(ctx, denominator, v.denominator);
      ctx.allocate(values.length * 2);
      const quotients = Object.freeze(values.map(v => auxiliary.exactDivide(ctx, denominator, v.denominator)));
      const cleared = Object.freeze(values.map((v, j) => auxiliary.multiply(ctx, v.numerator, quotients[j])));
      rows.push(Object.freeze({values, denominator, quotients, cleared, support: support(ctx, auxiliary, cleared)}));
    }
    const evidence = Object.freeze({auxiliary, rows: Object.freeze(rows), system: rationalRows(ctx, input.columns, rows)});
    verifyCoefficientSystemWithin(ctx, field, input, evidence, bounds); return evidence;
  });
}
/** Replay only inverse conversions, nonzero clearing, support and coefficient identities. */
export function verifyCoefficientSystemWithin<E>(ctx: ExecutionContext, field: ExactField<E>, input: LinearSystem<E>, evidence: RationalCoefficientSystem, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); validate(ctx, field, input);
  const domain = factorCoefficientDomain(ctx, field, bounds.towerHeight), ring = evidence.auxiliary;
  assertMultivariateRing(ctx, ring);
  demand(ring.field === Q && ring.arity === domain.height && Array.isArray(evidence.rows) && evidence.rows.length === input.rows,
    'verification-failed', 'coefficient descent owners/coverage');
  for (let i = 0; i < input.rows; i++) {
    const row: CoefficientRowEvidence = evidence.rows[i], count = input.columns + 1;
    demand(row.values.length === count && row.quotients.length === count && row.cleared.length === count
      && !ring.isZero(ctx, row.denominator), 'verification-failed', 'coefficient clearing coverage/denominator');
    for (let j = 0; j < count; j++) {
      const value = row.values[j];
      demand(!ring.isZero(ctx, value.denominator), 'verification-failed', 'coefficient conversion denominator');
      const n = unflattenFactorCoefficient(ctx, domain, ring, value.numerator), d = unflattenFactorCoefficient(ctx, domain, ring, value.denominator);
      const expected = j === input.columns ? input.rhs[i] : input.matrix[i][j];
      demand(!field.isZero(ctx, d) && field.equal(ctx, n, field.multiply(ctx, expected, d)), 'verification-failed', 'coefficient inverse conversion');
      demand(ring.equal(ctx, ring.multiply(ctx, value.denominator, row.quotients[j]), row.denominator)
        && ring.equal(ctx, ring.multiply(ctx, value.numerator, row.quotients[j]), row.cleared[j]), 'verification-failed', 'coefficient clearing identity');
    }
    const expected = support(ctx, ring, row.cleared);
    demand(row.support.length === expected.length && row.support.every((p, j) => samePowers(ctx, p, expected[j])), 'verification-failed', 'coefficient support coverage');
  }
  const expected = rationalRows(ctx, input.columns, evidence.rows), actual = evidence.system;
  validate(ctx, Q, actual);
  demand(actual.rows === expected.rows && actual.columns === expected.columns, 'verification-failed', 'rational descent dimensions');
  for (let i = 0; i < expected.rows; i++) {
    demand(Q.equal(ctx, actual.rhs[i], expected.rhs[i]), 'verification-failed', 'rational descent RHS');
    for (let j = 0; j < expected.columns; j++) demand(Q.equal(ctx, actual.matrix[i][j], expected.matrix[i][j]), 'verification-failed', 'rational descent coefficient');
  }
}
export function verifyCoefficientSystem<E>(ctx: ExecutionContext, field: ExactField<E>, input: LinearSystem<E>, evidence: RationalCoefficientSystem, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCoefficientSystemWithin(ctx, field, input, evidence, bounds));
}
