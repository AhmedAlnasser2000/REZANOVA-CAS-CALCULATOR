/** Parameter-preserving SPDE and descending polynomial coefficient equations. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { extendedGcd, polynomialDivide, verifyBezout, verifyDivision, type Bezout, type Division } from './polynomial-division';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';
import { descendCoefficientSystem, verifyCoefficientSystemWithin, matrixCapacity, type RationalCoefficientSystem } from './recursive-coefficient-system';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { recursivePolynomialValue, checkedDerivativePolynomial } from './recursive-rde-poles';
import { nativeCombination, rationalVectorCombination, polynomialCombination, homogeneousPolynomialConstraints } from './recursive-rde-family';
import type { RecursiveHomogeneousRde } from './recursive-rde-types';
import { solveRecursiveHomogeneousRdeWithin, verifyRecursiveHomogeneousRdeWithin } from './recursive-rde';

export interface PolynomialConstraint {
  readonly comparison: RationalCoefficientSystem;
  readonly linear: LinearSolution<Rational>;
}
export interface SpdeStep {
  readonly gcd: Bezout<E>;
  readonly A: Division<E>;
  readonly B: Division<E>;
  readonly forcing: readonly Division<E>[];
  readonly constraint: PolynomialConstraint;
  readonly inverse: Bezout<E> | null;
  readonly residues: readonly Division<E>[];
  readonly quotients: readonly Division<E>[];
  readonly derivatives: readonly DerivativeEvidence[];
  readonly derivativeA: DerivativeEvidence | null;
}
export type PolynomialCoefficientStep = Readonly<
  | {kind: 'truncate'; degree: number; constraint: PolynomialConstraint}
  | {kind: 'dominant'; degree: number; corrections: readonly E[]; derivatives: readonly DerivativeEvidence[]}
  | {kind: 'parent'; degree: bigint; parent: RecursiveHomogeneousRde; derivatives: readonly DerivativeEvidence[]}
>;
export interface RecursivePolynomialSolution {
  readonly spde: readonly SpdeStep[];
  readonly coefficients: readonly PolynomialCoefficientStep[];
  readonly terminal: PolynomialConstraint;
  readonly basis: readonly {readonly coefficients: readonly Rational[]; readonly value: E}[];
}
interface State {
  A: P<E>; B: P<E>; C: readonly P<E>[]; n: bigint;
  map: readonly (readonly Rational[])[]; correction: readonly E[]; scale: E;
}
function initial(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[], n: bigint): State {
  const zero = Q.fromInteger(ctx, 0n), one = Q.fromInteger(ctx, 1n), k = C.length;
  matrixCapacity(ctx, k, k);
  ctx.allocate(k * (k + 2)); const map = Object.freeze(C.map((_, i) => Object.freeze(C.map((_, j) => i === j ? one : zero))));
  return {A, B, C, n, map, correction: Object.freeze(C.map(() => view.owner.fromInteger(ctx, 0n))), scale: view.owner.fromInteger(ctx, 1n)};
}
function constrain(ctx: ExecutionContext, view: CertifiedTowerView, polynomials: readonly P<E>[], bounds: DifferentialBounds): PolynomialConstraint {
  const comparison = descendCoefficientSystem(ctx, view.parent!.owner, homogeneousPolynomialConstraints(ctx, view.owner, polynomials), bounds);
  const linear = solveLinearSystem(ctx, Q, comparison.system); demand(linear.kind === 'consistent', 'verification-failed', 'homogeneous polynomial constraints');
  ctx.allocate(2); return Object.freeze({comparison, linear});
}
function verifyConstraint(ctx: ExecutionContext, view: CertifiedTowerView, polynomials: readonly P<E>[], e: PolynomialConstraint, bounds: DifferentialBounds): readonly (readonly Rational[])[] {
  verifyCoefficientSystemWithin(ctx, view.parent!.owner, homogeneousPolynomialConstraints(ctx, view.owner, polynomials), e.comparison, bounds);
  verifyLinearSolution(ctx, Q, e.comparison.system, e.linear);
  demand(e.linear.kind === 'consistent', 'verification-failed', 'homogeneous polynomial complete kernel'); return e.linear.nullspace;
}
function remap(ctx: ExecutionContext, view: CertifiedTowerView, s: State, vectors: readonly (readonly Rational[])[], original: number): State {
  ctx.allocate(vectors.length * 3);
  return {...s, map: Object.freeze(vectors.map(v => rationalVectorCombination(ctx, s.map, v, original))),
    correction: Object.freeze(vectors.map(v => nativeCombination(ctx, view.owner, s.correction, v))),
    C: Object.freeze(vectors.map(v => polynomialCombination(ctx, view.owner, s.C, v)))};
}
function produceSpde(ctx: ExecutionContext, view: CertifiedTowerView, s: State, bounds: DifferentialBounds): SpdeStep {
  const ring = view.owner.fractions!.ring, gcd = extendedGcd(ctx, ring, s.A, s.B), A = polynomialDivide(ctx, ring, s.A, gcd.gcd), B = polynomialDivide(ctx, ring, s.B, gcd.gcd);
  ctx.allocate(s.C.length); const forcing = Object.freeze(s.C.map(c => polynomialDivide(ctx, ring, c, gcd.gcd)));
  const constraint = constrain(ctx, view, forcing.map(d => d.remainder), bounds);
  demand(constraint.linear.kind === 'consistent', 'verification-failed', 'SPDE divisibility consistency');
  ctx.allocate(constraint.linear.nullspace.length); const C = constraint.linear.nullspace.map(v => polynomialCombination(ctx, view.owner, forcing.map(d => d.quotient), v));
  if (ring.degree(ctx, A.quotient) === 0) {
    ctx.allocate(10); return Object.freeze({gcd, A, B, forcing, constraint, inverse: null, residues: Object.freeze([]), quotients: Object.freeze([]), derivatives: Object.freeze([]), derivativeA: null});
  }
  const inverse = extendedGcd(ctx, ring, A.quotient, B.quotient); ctx.allocate(C.length * 3);
  const residues = Object.freeze(C.map(c => polynomialDivide(ctx, ring, ring.multiply(ctx, inverse.t, c), A.quotient)));
  const quotients = Object.freeze(C.map((c, i) => polynomialDivide(ctx, ring, ring.subtract(ctx, c, ring.multiply(ctx, B.quotient, residues[i].remainder)), A.quotient)));
  const derivatives = Object.freeze(residues.map(d => differentiate(ctx, view.owner, recursivePolynomialValue(ctx, view.owner, d.remainder))));
  ctx.allocate(10); return Object.freeze({gcd, A, B, forcing, constraint, inverse, residues, quotients, derivatives,
    derivativeA: differentiate(ctx, view.owner, recursivePolynomialValue(ctx, view.owner, A.quotient))});
}
function replaySpde(ctx: ExecutionContext, view: CertifiedTowerView, s: State, e: SpdeStep, original: number, bounds: DifferentialBounds): State {
  const owner = view.owner, ring = owner.fractions!.ring; demand(ring.degree(ctx, s.A) > 0 && s.n >= 0n, 'verification-failed', 'SPDE decreasing-measure entry');
  verifyBezout(ctx, ring, s.A, s.B, e.gcd); verifyDivision(ctx, ring, s.A, e.gcd.gcd, e.A); verifyDivision(ctx, ring, s.B, e.gcd.gcd, e.B);
  demand(ring.isZero(ctx, e.A.remainder) && ring.isZero(ctx, e.B.remainder) && e.forcing.length === s.C.length, 'verification-failed', 'SPDE exact content extraction');
  for (let i = 0; i < s.C.length; i++) verifyDivision(ctx, ring, s.C[i], e.gcd.gcd, e.forcing[i]);
  const vectors = verifyConstraint(ctx, view, e.forcing.map(d => d.remainder), e.constraint, bounds), next = remap(ctx, view, s, vectors, original);
  ctx.allocate(vectors.length); const C = Object.freeze(vectors.map(v => polynomialCombination(ctx, owner, e.forcing.map(d => d.quotient), v)));
  for (let i = 0; i < C.length; i++) demand(ring.equal(ctx, ring.multiply(ctx, C[i], e.gcd.gcd), next.C[i]), 'verification-failed', 'SPDE divisible forcing reconstruction');
  next.A = e.A.quotient; next.B = e.B.quotient; next.C = C;
  const degree = ring.degree(ctx, next.A);
  if (degree === 0) {
    demand(e.inverse === null && e.derivativeA === null && !e.residues.length && !e.quotients.length && !e.derivatives.length,
      'verification-failed', 'SPDE constant differential coefficient'); return next;
  }
  demand(e.inverse !== null && e.derivativeA !== null && e.residues.length === C.length && e.quotients.length === C.length && e.derivatives.length === C.length,
    'verification-failed', 'SPDE complete residue transformations');
  verifyBezout(ctx, ring, next.A, next.B, e.inverse); demand(ring.equal(ctx, e.inverse.gcd, ring.one(ctx)), 'verification-failed', 'SPDE invertible coefficient residue');
  verifyDerivative(ctx, owner, recursivePolynomialValue(ctx, owner, next.A), e.derivativeA);
  ctx.allocate(C.length * 2); const newC: P<E>[] = [], newCorrections: E[] = [];
  for (let i = 0; i < C.length; i++) {
    verifyDivision(ctx, ring, ring.multiply(ctx, e.inverse.t, C[i]), next.A, e.residues[i]);
    const R = e.residues[i].remainder, value = recursivePolynomialValue(ctx, owner, R); verifyDerivative(ctx, owner, value, e.derivatives[i]);
    verifyDivision(ctx, ring, ring.subtract(ctx, C[i], ring.multiply(ctx, next.B, R)), next.A, e.quotients[i]);
    demand(ring.isZero(ctx, e.quotients[i].remainder), 'verification-failed', 'SPDE exact residue correction');
    newC.push(ring.subtract(ctx, e.quotients[i].quotient, checkedDerivativePolynomial(ctx, owner, e.derivatives[i])));
    newCorrections.push(owner.add(ctx, next.correction[i], owner.multiply(ctx, next.scale, value)));
  }
  return {...next, B: ring.add(ctx, next.B, checkedDerivativePolynomial(ctx, owner, e.derivativeA)), C: Object.freeze(newC),
    correction: Object.freeze(newCorrections), scale: owner.multiply(ctx, next.scale, recursivePolynomialValue(ctx, owner, next.A)), n: ctx.add(s.n, -BigInt(degree))};
}
function degree(ctx: ExecutionContext, view: CertifiedTowerView, C: readonly P<E>[]): number {
  let d = -1; for (const c of C) d = Math.max(d, view.owner.fractions!.ring.degree(ctx, c)); return d;
}
function monomial(ctx: ExecutionContext, view: CertifiedTowerView, coefficient: E, degree: number | bigint): E {
  const ring = view.owner.fractions!.ring, parent = view.parent!.owner;
  // A mathematical bound may exceed the degree budget while its correction is
  // zero. Only a nonzero constructed monomial needs an array/index conversion.
  if (parent.isZero(ctx, coefficient)) return view.owner.fromInteger(ctx, 0n);
  const exact = BigInt(degree); ctx.integer(exact);
  demand(exact >= 0n, 'verification-failed', 'nonnegative correction degree');
  if (exact > BigInt(ctx.limits.degree)) ctx.exhaust('degree');
  const n = Number(exact); ctx.degree(n); ctx.allocate(n + 1);
  const cs = Array<E>(n + 1).fill(parent.fromInteger(ctx, 0n)); cs[n] = coefficient;
  return recursivePolynomialValue(ctx, view.owner, ring.make(ctx, cs));
}
function coefficientAt(ctx: ExecutionContext, view: CertifiedTowerView, p: P<E>, degree: bigint): E {
  ctx.integer(degree); demand(degree >= 0n, 'verification-failed', 'nonnegative coefficient position');
  return degree < BigInt(p.coefficients.length) ? p.coefficients[Number(degree)] : view.parent!.owner.fromInteger(ctx, 0n);
}
function scalarEquation(ctx: ExecutionContext, view: CertifiedTowerView, s: State): State {
  const ring = view.owner.fractions!.ring;
  demand(ring.degree(ctx, s.A) === 0, 'verification-failed', 'polynomial terminal differential coefficient');
  const inverse = view.parent!.owner.inverse(ctx, ring.leading(ctx, s.A)); ctx.allocate(s.C.length);
  return {...s, A: ring.one(ctx), B: ring.scale(ctx, s.B, inverse), C: Object.freeze(s.C.map(c => ring.scale(ctx, c, inverse)))};
}
function removeCorrections(ctx: ExecutionContext, view: CertifiedTowerView, s: State, corrections: readonly E[], derivatives: readonly DerivativeEvidence[]): State {
  const owner = view.owner, ring = owner.fractions!.ring, b = recursivePolynomialValue(ctx, owner, s.B);
  demand(corrections.length === s.C.length && derivatives.length === s.C.length, 'verification-failed', 'polynomial correction coverage');
  ctx.allocate(s.C.length * 2); const C: P<E>[] = [], correction: E[] = [];
  for (let i = 0; i < s.C.length; i++) {
    verifyDerivative(ctx, owner, corrections[i], derivatives[i]);
    const image = owner.add(ctx, derivatives[i].derivative, owner.multiply(ctx, b, corrections[i]));
    const p = checkedDerivativePolynomial(ctx, owner, {input: corrections[i], derivative: image});
    C.push(ring.subtract(ctx, s.C[i], p)); correction.push(owner.add(ctx, s.correction[i], owner.multiply(ctx, s.scale, corrections[i])));
  }
  return {...s, C: Object.freeze(C), correction: Object.freeze(correction)};
}
function replayCoefficient(ctx: ExecutionContext, view: CertifiedTowerView, s: State, e: PolynomialCoefficientStep, original: number, bounds: DifferentialBounds): State {
  const owner = view.owner, ring = owner.fractions!.ring, parent = view.parent!.owner, db = ring.degree(ctx, s.B), dc = degree(ctx, view, s.C);
  if (e.kind === 'truncate') {
    demand(db > 0 && dc === e.degree && BigInt(dc - db) > s.n, 'verification-failed', 'polynomial degree constraint necessity');
    const top = s.C.map(c => ring.constant(ctx, c.coefficients[dc] ?? parent.fromInteger(ctx, 0n)));
    const next = remap(ctx, view, s, verifyConstraint(ctx, view, top, e.constraint, bounds), original);
    demand(degree(ctx, view, next.C) < dc, 'verification-failed', 'strict constrained forcing degree drop'); return next;
  }
  if (e.kind === 'dominant') {
    demand(db > 0 && dc >= db && e.degree === dc - db && BigInt(e.degree) <= s.n && e.corrections.length === s.C.length,
      'verification-failed', 'dominant polynomial correction degree');
    for (let i = 0; i < s.C.length; i++) demand(owner.equal(ctx, e.corrections[i], monomial(ctx, view,
      parent.exactDivide(ctx, s.C[i].coefficients[dc] ?? parent.fromInteger(ctx, 0n), ring.leading(ctx, s.B)), e.degree)), 'verification-failed', 'dominant correction coefficient');
    const next = removeCorrections(ctx, view, s, e.corrections, e.derivatives);
    demand(degree(ctx, view, next.C) < dc, 'verification-failed', 'strict dominant forcing degree drop'); return next;
  }
  demand(db <= 0 && e.degree === s.n && e.degree >= 0n && BigInt(dc) <= e.degree, 'verification-failed', 'descending parent coefficient coverage');
  const zero = parent.fromInteger(ctx, 0n), a = parent.add(ctx, s.B.coefficients[0] ?? zero,
    view.monomial === 'hyperexponential' ? parent.multiply(ctx, parent.fromInteger(ctx, e.degree), view.rate!) : zero);
  const inputs = s.C.map(c => coefficientAt(ctx, view, c, e.degree));
  verifyRecursiveHomogeneousRdeWithin(ctx, view.parent!, a, inputs, e.parent, bounds);
  const vectors = e.parent.basis.map(p => p.coefficients), next = remap(ctx, view, s, vectors, original);
  const corrections = e.parent.basis.map(p => monomial(ctx, view, p.value, e.degree));
  const result = removeCorrections(ctx, view, next, corrections, e.derivatives);
  demand(BigInt(degree(ctx, view, result.C)) < e.degree, 'verification-failed', 'strict parent coefficient reduction'); return {...result, n: ctx.add(s.n, -1n)};
}
function finish(ctx: ExecutionContext, view: CertifiedTowerView, s: State, terminal: PolynomialConstraint, original: number, bounds: DifferentialBounds) {
  const next = remap(ctx, view, s, verifyConstraint(ctx, view, s.C, terminal, bounds), original); ctx.allocate(next.map.length);
  for (const c of next.C) demand(view.owner.fractions!.ring.isZero(ctx, c), 'verification-failed', 'complete polynomial terminal zero equation');
  return Object.freeze(next.map.map((coefficients, i) => Object.freeze({coefficients, value: next.correction[i]})));
}
export function solveRecursivePolynomial(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[], n: bigint, bounds: DifferentialBounds): RecursivePolynomialSolution {
  let state = initial(ctx, view, A, B, C, n); const owner = view.owner, ring = owner.fractions!.ring, spde: SpdeStep[] = [], coefficients: PolynomialCoefficientStep[] = [];
  while (state.n >= 0n && ring.degree(ctx, state.A) > 0) {
    const step = produceSpde(ctx, view, state, bounds); ctx.allocate(1); spde.push(step); state = replaySpde(ctx, view, state, step, C.length, bounds);
  }
  if (state.n >= 0n) {
    state = scalarEquation(ctx, view, state);
    while (state.n >= 0n) {
      const db = ring.degree(ctx, state.B), dc = degree(ctx, view, state.C); let step: PolynomialCoefficientStep;
      if (db > 0) {
        if (dc < db) break;
        if (BigInt(dc - db) > state.n) step = Object.freeze({kind: 'truncate' as const, degree: dc,
          constraint: constrain(ctx, view, state.C.map(c => ring.constant(ctx, c.coefficients[dc] ?? view.parent!.owner.fromInteger(ctx, 0n))), bounds)});
        else {
          ctx.allocate(state.C.length * 2); const corrections = Object.freeze(state.C.map(c => monomial(ctx, view,
            view.parent!.owner.exactDivide(ctx, c.coefficients[dc] ?? view.parent!.owner.fromInteger(ctx, 0n), ring.leading(ctx, state.B)), dc - db)));
          step = Object.freeze({kind: 'dominant' as const, degree: dc - db, corrections, derivatives: Object.freeze(corrections.map(c => differentiate(ctx, owner, c)))});
        }
      } else {
        const k = state.n, parent = view.parent!.owner, zero = parent.fromInteger(ctx, 0n);
        const a = parent.add(ctx, state.B.coefficients[0] ?? zero, view.monomial === 'hyperexponential' ? parent.multiply(ctx, parent.fromInteger(ctx, state.n), view.rate!) : zero);
        const lower = solveRecursiveHomogeneousRdeWithin(ctx, view.parent!, a, state.C.map(c => coefficientAt(ctx, view, c, k)), bounds); ctx.allocate(lower.basis.length);
        step = Object.freeze({kind: 'parent' as const, degree: k, parent: lower,
          derivatives: Object.freeze(lower.basis.map(p => differentiate(ctx, owner, monomial(ctx, view, p.value, k))))});
      }
      ctx.allocate(1); coefficients.push(step); state = replayCoefficient(ctx, view, state, step, C.length, bounds);
    }
  }
  const terminal = constrain(ctx, view, state.C, bounds), basis = finish(ctx, view, state, terminal, C.length, bounds); ctx.allocate(4);
  const e = Object.freeze({spde: Object.freeze(spde), coefficients: Object.freeze(coefficients), terminal, basis});
  verifyRecursivePolynomialSolution(ctx, view, A, B, C, n, e, bounds); return e;
}
export function verifyRecursivePolynomialSolution(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[], n: bigint, e: RecursivePolynomialSolution, bounds: DifferentialBounds): void {
  let state = initial(ctx, view, A, B, C, n); const ring = view.owner.fractions!.ring;
  for (const step of e.spde) state = replaySpde(ctx, view, state, step, C.length, bounds);
  demand(state.n < 0n || ring.degree(ctx, state.A) === 0, 'verification-failed', 'complete SPDE termination');
  if (state.n >= 0n) state = scalarEquation(ctx, view, state);
  for (const step of e.coefficients) state = replayCoefficient(ctx, view, state, step, C.length, bounds);
  demand(state.n < 0n || (ring.degree(ctx, state.B) > 0 && degree(ctx, view, state.C) < ring.degree(ctx, state.B)), 'verification-failed', 'complete polynomial coefficient termination');
  const basis = finish(ctx, view, state, e.terminal, C.length, bounds);
  demand(e.basis.length === basis.length, 'verification-failed', 'complete polynomial solution basis');
  for (let i = 0; i < basis.length; i++) {
    demand(view.owner.equal(ctx, e.basis[i].value, basis[i].value) && e.basis[i].coefficients.length === basis[i].coefficients.length, 'verification-failed', 'polynomial paired basis map');
    const f = view.owner.fractions!.ring, value = e.basis[i].value;
    demand(value.kind === 'fraction' && f.equal(ctx, value.value.denominator, f.one(ctx)) && (n < 0n ? f.isZero(ctx, value.value.numerator) : BigInt(f.degree(ctx, value.value.numerator)) <= n),
      'verification-failed', 'polynomial representative within proved degree bound');
    for (let j = 0; j < basis[i].coefficients.length; j++) demand(Q.equal(ctx, e.basis[i].coefficients[j], basis[i].coefficients[j]), 'verification-failed', 'polynomial forcing parameter map');
  }
}
