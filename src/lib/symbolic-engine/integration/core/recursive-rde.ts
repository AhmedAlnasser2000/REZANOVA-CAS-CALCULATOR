/** Complete affine families; all recursive calls decrease certified tower height. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import { differentiate } from './differential-derivative';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem } from './linear-system';
import { solveRationalParametricRde, verifyRationalParametricRdeWithin } from './rational-parametric-rde';
import { type CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { descendCoefficientSystem, verifyCoefficientSystemWithin, matrixCapacity } from './recursive-coefficient-system';
import { normalizeRecursiveRde, verifyRecursiveWeakNormalization } from './recursive-rde-normalization';
import { boundRecursiveDenominator, verifyRecursiveDenominatorBound } from './recursive-rde-denominator';
import { recursivePolynomialEquation, verifyRecursivePolynomialEquation } from './recursive-rde-equation';
import { boundRecursiveDegree, verifyRecursiveDegreeBound } from './recursive-rde-degree';
import { solveRecursivePolynomial, verifyRecursivePolynomialSolution } from './recursive-rde-polynomial';
import { recursivePolynomialValue } from './recursive-rde-poles';
import { rationalInOwner, nativeCombination, rationalVectorCombination, verifyRecursiveRdePair,
  type RecursiveRdePair, type RecursiveRdeFamily } from './recursive-rde-family';
import { recursiveConditions, verifyRecursiveConditions, certifiedTowerConditionSources } from './recursive-conditions';
import type { RecursiveHomogeneousRde, RecursiveParametricRdeDecision } from './recursive-rde-types';

function validate(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); view.owner.assert(ctx, a);
  demand(Array.isArray(forcing), 'invalid-input', 'recursive RDE forcing list');
  for (const f of forcing) view.owner.assert(ctx, f);
}
function independenceSystem(ctx: ExecutionContext, view: CertifiedTowerView, forcing: number, basis: readonly RecursiveRdePair[]): LinearSystem<E> {
  const owner = view.owner, columns = basis.length, rows = forcing + 1; matrixCapacity(ctx, rows, columns);
  const matrix: (readonly E[])[] = [], rhs: E[] = [];
  for (let i = 0; i < rows; i++) {
    ctx.allocate(columns); matrix.push(Object.freeze(basis.map(p => i === forcing ? p.value : rationalInOwner(ctx, owner, p.coefficients[i])))); rhs.push(owner.fromInteger(ctx, 0n));
  }
  ctx.allocate(4); return Object.freeze({rows, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}
function producedPair(ctx: ExecutionContext, view: CertifiedTowerView, coefficients: readonly Rational[], value: E): RecursiveRdePair {
  ctx.allocate(3); return Object.freeze({coefficients, value, derivative: differentiate(ctx, view.owner, value)});
}
export function solveRecursiveHomogeneousRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], bounds: DifferentialBounds): RecursiveHomogeneousRde {
  validate(ctx, view, a, forcing, bounds); const owner = view.owner; let evidence;
  if (view.monomial === 'variable') {
    const rational = solveRationalParametricRde(ctx, owner, a, owner.fromInteger(ctx, 0n), forcing);
    demand(rational.family !== null, 'verification-failed', 'homogeneous base equation consistency');
    evidence = {route: 'rational' as const, rational, basis: rational.family.directions};
  } else {
    const normalization = normalizeRecursiveRde(ctx, view, a, forcing, bounds);
    const denominator = boundRecursiveDenominator(ctx, view, normalization.coefficient, normalization.forcing, bounds);
    const equation = recursivePolynomialEquation(ctx, view, normalization.coefficient, normalization.forcing, denominator.denominator);
    const degree = boundRecursiveDegree(ctx, view, equation.A, equation.B, equation.C, bounds);
    const polynomial = solveRecursivePolynomial(ctx, view, equation.A, equation.B, equation.C, degree.bound, bounds);
    const divisor = owner.multiply(ctx, normalization.gauge, recursivePolynomialValue(ctx, owner, denominator.denominator)); ctx.allocate(polynomial.basis.length);
    const basis = Object.freeze(polynomial.basis.map(p => producedPair(ctx, view, p.coefficients, owner.exactDivide(ctx, p.value, divisor))));
    evidence = {route: 'recursive' as const, normalization, denominator, equation, degree, polynomial, basis};
  }
  const independence = descendCoefficientSystem(ctx, owner, independenceSystem(ctx, view, forcing.length, evidence.basis), bounds);
  const independent = solveLinearSystem(ctx, Q, independence.system); ctx.allocate(forcing.length + 6);
  const e = Object.freeze({...evidence, view, a, forcing: Object.freeze([...forcing]), independence, independent});
  verifyRecursiveHomogeneousRdeWithin(ctx, view, a, forcing, e, bounds); return e;
}
export function verifyRecursiveHomogeneousRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], e: RecursiveHomogeneousRde, bounds: DifferentialBounds): void {
  validate(ctx, view, a, forcing, bounds); const owner = view.owner, zero = owner.fromInteger(ctx, 0n);
  demand(e.view === view && owner.equal(ctx, a, e.a) && e.forcing.length === forcing.length, 'verification-failed', 'homogeneous recursive expected request');
  for (let i = 0; i < forcing.length; i++) demand(owner.equal(ctx, forcing[i], e.forcing[i]), 'verification-failed', 'homogeneous forcing order');
  let expected: readonly {readonly coefficients: readonly Rational[]; readonly value: E}[];
  if (view.monomial === 'variable') {
    demand(e.route === 'rational', 'verification-failed', 'homogeneous rational route');
    verifyRationalParametricRdeWithin(ctx, owner, a, zero, forcing, e.rational);
    demand(e.rational.family !== null && owner.isZero(ctx, e.rational.family.particular.value)
      && e.rational.family.particular.coefficients.every(c => Q.isZero(ctx, c)), 'verification-failed', 'homogeneous base particular origin');
    expected = e.rational.family.directions;
  } else {
    demand(e.route === 'recursive', 'verification-failed', 'homogeneous recursive route');
    verifyRecursiveWeakNormalization(ctx, view, a, forcing, e.normalization, bounds);
    verifyRecursiveDenominatorBound(ctx, view, e.normalization.coefficient, e.normalization.forcing, e.denominator, bounds);
    verifyRecursivePolynomialEquation(ctx, view, e.normalization.coefficient, e.normalization.forcing, e.denominator.denominator, e.equation);
    verifyRecursiveDegreeBound(ctx, view, e.equation.A, e.equation.B, e.equation.C, e.degree, bounds);
    verifyRecursivePolynomialSolution(ctx, view, e.equation.A, e.equation.B, e.equation.C, e.degree.bound, e.polynomial, bounds);
    const divisor = owner.multiply(ctx, e.normalization.gauge, recursivePolynomialValue(ctx, owner, e.denominator.denominator)); ctx.allocate(e.polynomial.basis.length);
    expected = e.polynomial.basis.map(p => ({coefficients: p.coefficients, value: owner.exactDivide(ctx, p.value, divisor)}));
  }
  demand(e.basis.length === expected.length, 'verification-failed', 'homogeneous complete paired basis');
  for (let i = 0; i < expected.length; i++) {
    const p = e.basis[i]; demand(owner.equal(ctx, p.value, expected[i].value) && p.coefficients.length === expected[i].coefficients.length, 'verification-failed', 'homogeneous native family reconstruction');
    for (let j = 0; j < p.coefficients.length; j++) demand(Q.equal(ctx, p.coefficients[j], expected[i].coefficients[j]), 'verification-failed', 'homogeneous parameter reconstruction');
    verifyRecursiveRdePair(ctx, owner, a, zero, forcing, p);
  }
  verifyCoefficientSystemWithin(ctx, owner, independenceSystem(ctx, view, forcing.length, e.basis), e.independence, bounds);
  verifyLinearSolution(ctx, Q, e.independence.system, e.independent);
  demand(e.independent.kind === 'consistent' && e.independent.nullspace.length === 0, 'verification-failed', 'paired solution independence');
}
function sliceSystem(ctx: ExecutionContext, basis: readonly RecursiveRdePair[]): LinearSystem<Rational> {
  matrixCapacity(ctx, 1, basis.length); ctx.allocate(basis.length + 5);
  return Object.freeze({rows: 1, columns: basis.length, matrix: Object.freeze([Object.freeze(basis.map(p => p.coefficients[0]))]), rhs: Object.freeze([Q.fromInteger(ctx, 1n)])});
}
function affinePair(ctx: ExecutionContext, view: CertifiedTowerView, basis: readonly RecursiveRdePair[], vector: readonly Rational[], forcing: number): RecursiveRdePair {
  ctx.allocate(basis.length * 2 + forcing);
  const cs = rationalVectorCombination(ctx, basis.map(p => p.coefficients), vector, forcing + 1), value = nativeCombination(ctx, view.owner, basis.map(p => p.value), vector);
  return producedPair(ctx, view, Object.freeze(cs.slice(1)), value);
}
function sources(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], family: RecursiveRdeFamily | null) {
  const construction = certifiedTowerConditionSources(ctx, view); ctx.allocate(construction.length + forcing.length * 2 + 4);
  const out = [...construction, {path: 'request.a', value: a}, {path: 'request.b', value: b}, ...forcing.map((value, i) => ({path: `request.forcing.${i}`, value}))];
  if (family) {
    ctx.allocate(family.directions.length * 2 + 2); out.push({path: 'family.particular', value: family.particular.value});
    for (let i = 0; i < family.directions.length; i++) out.push({path: `family.direction.${i}`, value: family.directions[i].value});
  }
  return out;
}
export function solveRecursiveParametricRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], bounds: DifferentialBounds): RecursiveParametricRdeDecision {
  validate(ctx, view, a, forcing, bounds); view.owner.assert(ctx, b); ctx.allocate(forcing.length + 1);
  const homogeneous = solveRecursiveHomogeneousRdeWithin(ctx, view, a, [b, ...forcing], bounds), slice = solveLinearSystem(ctx, Q, sliceSystem(ctx, homogeneous.basis));
  let family: RecursiveRdeFamily | null = null;
  if (slice.kind === 'consistent') {
    ctx.allocate(slice.nullspace.length + 2); family = Object.freeze({particular: affinePair(ctx, view, homogeneous.basis, slice.particular, forcing.length),
      directions: Object.freeze(slice.nullspace.map(v => affinePair(ctx, view, homogeneous.basis, v, forcing.length)))});
  }
  ctx.allocate(forcing.length + 10); const e = Object.freeze({rule: 'recursive-parametric-rde-completeness-v1' as const, view, a, b, forcing: Object.freeze([...forcing]), homogeneous, slice,
    kind: family ? 'solutions' as const : 'no-field-solution' as const, family, conditions: recursiveConditions(ctx, view.owner, sources(ctx, view, a, b, forcing, family))});
  verifyRecursiveParametricRdeWithin(ctx, view, a, b, forcing, e, bounds); return e;
}
export function verifyRecursiveParametricRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], e: RecursiveParametricRdeDecision, bounds: DifferentialBounds): void {
  validate(ctx, view, a, forcing, bounds); const owner = view.owner; owner.assert(ctx, b);
  demand(e.view === view && e.rule === 'recursive-parametric-rde-completeness-v1' && owner.equal(ctx, a, e.a) && owner.equal(ctx, b, e.b) && e.forcing.length === forcing.length,
    'verification-failed', 'recursive affine expected request');
  for (let i = 0; i < forcing.length; i++) demand(owner.equal(ctx, forcing[i], e.forcing[i]), 'verification-failed', 'recursive affine forcing order');
  ctx.allocate(forcing.length + 1); verifyRecursiveHomogeneousRdeWithin(ctx, view, a, [b, ...forcing], e.homogeneous, bounds);
  verifyLinearSolution(ctx, Q, sliceSystem(ctx, e.homogeneous.basis), e.slice);
  verifyRecursiveConditions(ctx, owner, sources(ctx, view, a, b, forcing, e.family), e.conditions);
  if (e.slice.kind === 'inconsistent') { demand(e.kind === 'no-field-solution' && e.family === null, 'verification-failed', 'recursive affine negative witness'); return; }
  demand(e.kind === 'solutions' && e.family !== null && e.family.directions.length === e.slice.nullspace.length, 'verification-failed', 'recursive affine complete family');
  ctx.allocate(e.slice.nullspace.length + e.family.directions.length + 2);
  const vectors = [e.slice.particular, ...e.slice.nullspace], actual = [e.family.particular, ...e.family.directions];
  for (let i = 0; i < vectors.length; i++) {
    const cs = rationalVectorCombination(ctx, e.homogeneous.basis.map(p => p.coefficients), vectors[i], forcing.length + 1);
    demand(Q.equal(ctx, cs[0], Q.fromInteger(ctx, i ? 0n : 1n)) && actual[i].coefficients.length === forcing.length
      && owner.equal(ctx, actual[i].value, nativeCombination(ctx, owner, e.homogeneous.basis.map(p => p.value), vectors[i])), 'verification-failed', 'affine slice native map');
    for (let j = 0; j < forcing.length; j++) demand(Q.equal(ctx, cs[j + 1], actual[i].coefficients[j]), 'verification-failed', 'affine slice coefficient map');
    verifyRecursiveRdePair(ctx, owner, a, i ? owner.fromInteger(ctx, 0n) : b, forcing, actual[i]);
  }
}
export function solveRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], bounds: DifferentialBounds): RecursiveParametricRdeDecision {
  return ctx.operation(() => solveRecursiveParametricRdeWithin(ctx, view, a, b, forcing, bounds));
}
export function verifyRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], e: RecursiveParametricRdeDecision, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveParametricRdeWithin(ctx, view, a, b, forcing, e, bounds));
}
