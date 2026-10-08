/** Complete affine paired families over Q(x); no trial-degree search. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import type { Polynomial as P } from './polynomial';
import { extendedGcd, exactDivide, verifyBezout, type Bezout } from './polynomial-division';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { rdeDomain, assertRdeDomain, naturalDegree, primitiveTriple, verifyTriple, type PrimitiveTriple, type RdeDomain } from './rde-algebra';
import { boundDenominator, verifyDenominator, type DenominatorEvidence } from './rde-denominator';
import { degreeBound, verifyDegree, type DegreeEvidence } from './rde-polynomial';
import { matrixCapacity } from './recursive-coefficient-system';

export interface ParametricClearing {
  readonly steps: readonly Bezout<E>[];
  readonly denominator: P<E>;
  readonly quotients: readonly P<E>[];
  readonly A: P<E>;
  readonly B: P<E>;
  readonly C: readonly P<E>[];
}
export interface ParametricPolynomial {
  readonly A: P<E>;
  readonly B: P<E>;
  readonly C: readonly P<E>[];
  readonly largest: number;
  readonly degreeEquation: PrimitiveTriple;
  readonly degree: DegreeEvidence;
}
export interface ParametricFamilyPair {
  readonly coefficients: readonly Rational[];
  readonly value: E;
  readonly derivative: DerivativeEvidence;
}
export interface ParametricFamily {
  readonly particular: ParametricFamilyPair;
  readonly directions: readonly ParametricFamilyPair[];
}
export interface RationalParametricRdeDecision {
  readonly kind: 'solutions' | 'no-field-solution';
  readonly rule: 'rational-parametric-rde-bounds-v1';
  readonly domain: RdeDomain;
  readonly a: E;
  readonly b: E;
  readonly forcing: readonly E[];
  readonly clearing: ParametricClearing;
  readonly denominator: DenominatorEvidence;
  readonly polynomial: ParametricPolynomial;
  readonly system: LinearSystem<Rational>;
  readonly linear: LinearSolution<Rational>;
  readonly family: ParametricFamily | null;
  readonly conditions: {readonly inputs: readonly P<E>[]; readonly representatives: readonly P<E>[]};
}
function fraction(ctx: ExecutionContext, owner: DifferentialField, value: E) {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'parametric RDE fraction'); return value.value;
}
function input(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[]): readonly E[] {
  assertDifferentialFieldOwner(ctx, owner); rdeDomain(ctx, owner); owner.assert(ctx, a); owner.assert(ctx, b);
  demand(Array.isArray(forcing), 'invalid-input', 'parametric forcing list'); ctx.allocate(forcing.length + 2);
  for (const f of forcing) owner.assert(ctx, f);
  return [a, b, ...forcing];
}
function clear(ctx: ExecutionContext, d: RdeDomain, values: readonly E[]): ParametricClearing {
  const r = d.ring, steps: Bezout<E>[] = []; let denominator = r.one(ctx); ctx.allocate(values.length * 3);
  for (const value of values) {
    const v = fraction(ctx, d.owner, value), gcd = extendedGcd(ctx, r, denominator, v.denominator);
    denominator = r.multiply(ctx, exactDivide(ctx, r, denominator, gcd.gcd), v.denominator); steps.push(gcd);
  }
  const quotients = Object.freeze(values.map(v => exactDivide(ctx, r, denominator, fraction(ctx, d.owner, v).denominator)));
  const ns = values.map((v, i) => r.multiply(ctx, quotients[i], fraction(ctx, d.owner, v).numerator));
  ctx.allocate(6); return Object.freeze({steps: Object.freeze(steps), denominator, quotients, A: denominator, B: ns[0], C: Object.freeze(ns.slice(1))});
}
function checkClearing(ctx: ExecutionContext, d: RdeDomain, values: readonly E[], e: ParametricClearing): void {
  const r = d.ring; let previous = r.one(ctx);
  demand(e.steps.length === values.length && e.quotients.length === values.length && e.C.length === values.length - 1,
    'verification-failed', 'parametric clearing coverage');
  for (let i = 0; i < values.length; i++) {
    const v = fraction(ctx, d.owner, values[i]); verifyBezout(ctx, r, previous, v.denominator, e.steps[i]);
    previous = r.multiply(ctx, exactDivide(ctx, r, previous, e.steps[i].gcd), v.denominator);
  }
  demand(!r.isZero(ctx, e.A) && r.equal(ctx, e.denominator, previous) && r.equal(ctx, e.A, previous), 'verification-failed', 'parametric clearing LCM');
  for (let i = 0; i < values.length; i++) {
    const v = fraction(ctx, d.owner, values[i]);
    demand(r.equal(ctx, r.multiply(ctx, v.denominator, e.quotients[i]), previous)
      && r.equal(ctx, r.multiply(ctx, v.numerator, e.quotients[i]), i === 0 ? e.B : e.C[i - 1]), 'verification-failed', 'parametric clearing identities');
  }
}
function polynomial(ctx: ExecutionContext, d: RdeDomain, e: ParametricClearing, U: P<E>): ParametricPolynomial {
  const r = d.ring, A = r.multiply(ctx, e.A, U);
  const B = r.subtract(ctx, r.multiply(ctx, e.B, U), r.multiply(ctx, e.A, r.derivative(ctx, U)));
  const U2 = r.multiply(ctx, U, U); ctx.allocate(e.C.length);
  const C = Object.freeze(e.C.map(p => r.multiply(ctx, p, U2)));
  let largest = 0;
  for (let i = 1; i < C.length; i++) if (r.degree(ctx, C[i]) > r.degree(ctx, C[largest])) largest = i;
  const degreeEquation = primitiveTriple(ctx, r, A, B, C[largest]);
  ctx.allocate(6); return Object.freeze({A, B, C, largest, degreeEquation, degree: degreeBound(ctx, d, degreeEquation)});
}
function checkPolynomial(ctx: ExecutionContext, d: RdeDomain, e: ParametricClearing, U: P<E>, p: ParametricPolynomial): void {
  const r = d.ring;
  demand(p.C.length === e.C.length && Number.isSafeInteger(p.largest) && p.largest >= 0 && p.largest < p.C.length,
    'verification-failed', 'parametric polynomial coverage');
  demand(r.equal(ctx, p.A, r.multiply(ctx, e.A, U)) && r.equal(ctx, p.B,
    r.subtract(ctx, r.multiply(ctx, e.B, U), r.multiply(ctx, e.A, r.derivative(ctx, U)))), 'verification-failed', 'parametric solution transform');
  const U2 = r.multiply(ctx, U, U); let largest = 0;
  for (let i = 0; i < p.C.length; i++) {
    demand(r.equal(ctx, p.C[i], r.multiply(ctx, e.C[i], U2)), 'verification-failed', 'parametric forcing transform');
    if (r.degree(ctx, p.C[i]) > r.degree(ctx, p.C[largest])) largest = i;
  }
  demand(p.largest === largest, 'verification-failed', 'parametric largest forcing');
  verifyTriple(ctx, r, p.A, p.B, p.C[largest], p.degreeEquation); verifyDegree(ctx, d, p.degreeEquation, p.degree);
}
function scalar(ctx: ExecutionContext, owner: DifferentialField, c: E): Rational {
  owner.assert(ctx, c); demand(c.kind === 'scalar', 'domain-mismatch', 'parametric constant coefficient'); return c.value;
}
function matrix(ctx: ExecutionContext, d: RdeDomain, p: ParametricPolynomial): LinearSystem<Rational> {
  const r = d.ring, count = naturalDegree(ctx, p.degree.bound) + 1, columns = count + p.C.length - 1;
  ctx.allocate(columns); const images: P<E>[] = [];
  for (let j = 0; j < count; j++) {
    ctx.allocate(j + 1); const cs = Array<E>(j + 1).fill(r.domain.fromInteger(ctx, 0n)); cs[j] = r.domain.fromInteger(ctx, 1n);
    const t = r.make(ctx, cs); images.push(r.add(ctx, r.multiply(ctx, p.A, r.derivative(ctx, t)), r.multiply(ctx, p.B, t)));
  }
  for (let j = 1; j < p.C.length; j++) images.push(r.negate(ctx, p.C[j]));
  let rows = p.C[0].coefficients.length;
  for (const image of images) rows = Math.max(rows, image.coefficients.length);
  matrixCapacity(ctx, rows, columns); const zero = r.domain.fromInteger(ctx, 0n), out: (readonly Rational[])[] = [], rhs: Rational[] = [];
  for (let i = 0; i < rows; i++) {
    ctx.allocate(columns); out.push(Object.freeze(images.map(image => scalar(ctx, d.owner.parent!, image.coefficients[i] ?? zero))));
    rhs.push(scalar(ctx, d.owner.parent!, p.C[0].coefficients[i] ?? zero));
  }
  ctx.allocate(4); return Object.freeze({rows, columns, matrix: Object.freeze(out), rhs: Object.freeze(rhs)});
}
function sameMatrix(ctx: ExecutionContext, expected: LinearSystem<Rational>, actual: LinearSystem<Rational>): void {
  demand(actual.rows === expected.rows && actual.columns === expected.columns && actual.matrix.length === expected.rows
    && actual.rhs.length === expected.rows, 'verification-failed', 'parametric matrix coverage');
  for (let i = 0; i < expected.rows; i++) {
    demand(actual.matrix[i].length === expected.columns && Q.equal(ctx, actual.rhs[i], expected.rhs[i]), 'verification-failed', 'parametric matrix RHS');
    for (let j = 0; j < expected.columns; j++) demand(Q.equal(ctx, actual.matrix[i][j], expected.matrix[i][j]), 'verification-failed', 'parametric matrix coefficient');
  }
}
function value(ctx: ExecutionContext, d: RdeDomain, U: P<E>, n: number, vector: readonly Rational[]): E {
  ctx.allocate(n); return d.owner.fraction(ctx, d.owner.fractions!.make(ctx,
    d.ring.make(ctx, vector.slice(0, n).map(c => d.owner.parent!.scalar(ctx, c))), U));
}
function pair(ctx: ExecutionContext, d: RdeDomain, U: P<E>, n: number, vector: readonly Rational[]): ParametricFamilyPair {
  const v = value(ctx, d, U, n, vector); ctx.allocate(vector.length - n + 3);
  return Object.freeze({coefficients: Object.freeze(vector.slice(n)), value: v, derivative: differentiate(ctx, d.owner, v)});
}
function target(ctx: ExecutionContext, owner: DifferentialField, initial: E, forcing: readonly E[], cs: readonly Rational[]): E {
  demand(cs.length === forcing.length, 'verification-failed', 'parametric pair coefficient coverage');
  let out = initial;
  for (let i = 0; i < forcing.length; i++) out = owner.add(ctx, out, owner.multiply(ctx, owner.embed(ctx, owner.parent!.scalar(ctx, cs[i])), forcing[i]));
  return out;
}
export function verifyRationalParametricRdeWithin(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[], e: RationalParametricRdeDecision): void {
  const values = input(ctx, owner, a, b, forcing); assertRdeDomain(ctx, owner, e.domain); const d = e.domain;
  demand(e.rule === 'rational-parametric-rde-bounds-v1' && owner.equal(ctx, a, e.a) && owner.equal(ctx, b, e.b)
    && e.forcing.length === forcing.length, 'verification-failed', 'parametric expected request');
  for (let i = 0; i < forcing.length; i++) demand(owner.equal(ctx, forcing[i], e.forcing[i]), 'verification-failed', 'parametric forcing order');
  checkClearing(ctx, d, values, e.clearing); verifyDenominator(ctx, d, e.clearing.A, e.clearing.B, e.denominator);
  checkPolynomial(ctx, d, e.clearing, e.denominator.denominator, e.polynomial); sameMatrix(ctx, matrix(ctx, d, e.polynomial), e.system);
  verifyLinearSolution(ctx, Q, e.system, e.linear);
  demand(e.conditions.inputs.length === values.length, 'verification-failed', 'parametric original conditions');
  for (let i = 0; i < values.length; i++) demand(d.ring.equal(ctx, e.conditions.inputs[i], fraction(ctx, owner, values[i]).denominator), 'verification-failed', 'parametric input condition');
  if (e.linear.kind === 'inconsistent') {
    demand(e.kind === 'no-field-solution' && e.family === null && e.conditions.representatives.length === 0, 'verification-failed', 'parametric negative outcome'); return;
  }
  demand(e.kind === 'solutions' && e.family !== null && e.family.directions.length === e.linear.nullspace.length,
    'verification-failed', 'parametric complete family');
  const count = naturalDegree(ctx, e.polynomial.degree.bound) + 1, size = e.family.directions.length + 1;
  demand(e.conditions.representatives.length === size, 'verification-failed', 'parametric representative conditions');
  for (let i = 0; i < size; i++) {
    const p = i === 0 ? e.family.particular : e.family.directions[i - 1], v = i === 0 ? e.linear.particular : e.linear.nullspace[i - 1];
    demand(owner.equal(ctx, p.value, value(ctx, d, e.denominator.denominator, count, v)) && p.coefficients.length === forcing.length,
      'verification-failed', 'parametric family mapping');
    for (let j = 0; j < forcing.length; j++) demand(Q.equal(ctx, p.coefficients[j], v[count + j]), 'verification-failed', 'parametric coefficient mapping');
    verifyDerivative(ctx, owner, p.value, p.derivative);
    demand(owner.equal(ctx, owner.add(ctx, p.derivative.derivative, owner.multiply(ctx, a, p.value)),
      target(ctx, owner, i === 0 ? b : owner.fromInteger(ctx, 0n), forcing, p.coefficients)), 'verification-failed', 'parametric mapped derivative');
    demand(d.ring.equal(ctx, e.conditions.representatives[i], fraction(ctx, owner, p.value).denominator), 'verification-failed', 'parametric representative denominator');
  }
}
export function verifyRationalParametricRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[], e: RationalParametricRdeDecision): void {
  ctx.operation(() => verifyRationalParametricRdeWithin(ctx, owner, a, b, forcing, e));
}
export function solveRationalParametricRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[]): RationalParametricRdeDecision {
  return ctx.operation(() => {
    const values = input(ctx, owner, a, b, forcing), d = rdeDomain(ctx, owner), clearing = clear(ctx, d, values);
    const denominator = boundDenominator(ctx, d, clearing.A, clearing.B), p = polynomial(ctx, d, clearing, denominator.denominator);
    const system = matrix(ctx, d, p), linear = solveLinearSystem(ctx, Q, system); let family: ParametricFamily | null = null;
    if (linear.kind === 'consistent') {
      const n = naturalDegree(ctx, p.degree.bound) + 1; ctx.allocate(linear.nullspace.length + 2);
      family = Object.freeze({particular: pair(ctx, d, denominator.denominator, n, linear.particular),
        directions: Object.freeze(linear.nullspace.map(v => pair(ctx, d, denominator.denominator, n, v)))});
    }
    ctx.allocate(values.length + (family?.directions.length ?? 0) + 17);
    const representatives = family ? [family.particular, ...family.directions] : [];
    const e = Object.freeze({kind: family ? 'solutions' as const : 'no-field-solution' as const, rule: 'rational-parametric-rde-bounds-v1' as const,
      domain: d, a, b, forcing: Object.freeze([...forcing]), clearing, denominator, polynomial: p, system, linear, family,
      conditions: Object.freeze({inputs: Object.freeze(values.map(v => fraction(ctx, owner, v).denominator)),
        representatives: Object.freeze(representatives.map(p => fraction(ctx, owner, p.value).denominator))})});
    verifyRationalParametricRdeWithin(ctx, owner, a, b, forcing, e); return e;
  });
}
