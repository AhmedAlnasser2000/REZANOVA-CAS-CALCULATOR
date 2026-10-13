import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { Polynomial } from './polynomial';
import { curveOrderNative, curveOrderCoordinates, verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { extendedGcd, verifyBezout, exactDivide, polynomialDivide, type Bezout } from './polynomial-division';
import { checkedFactorSquareFree, verifyFactorSquareFree, factorIndex, type FactorSquareFree } from './factorization-square-free';
import { freezeExactMatrix } from './algebraic-matrix';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import { algebraicIntegrationConditionSources } from './algebraic-differential';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

type P = Polynomial<CurveConstant>;
export interface AlgebraicConnection<E> {
  readonly basis: readonly E[];
  readonly derivatives: readonly AlgebraicDerivative<E>[];
  readonly coordinates: readonly (readonly CurveScalar[])[];
  readonly denominators: CurveDenominators;
  readonly squareFree: Bezout<CurveConstant>;
  readonly matrix: readonly (readonly P[])[];
}
function basis<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>) {
  ctx.allocate(curve.finite.lattice.dimension); return Object.freeze(curve.finite.lattice.basis.map(row => curveOrderNative(ctx, curve.coordinates, curve.finite, row)));
}
export function verifyAlgebraicConnectionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicConnection<E>, bounds: DifferentialBounds): void {
  const actual = basis(ctx, curve), f = curve.finite.lattice.scalar, r = f.ring, n = actual.length;
  demand(proof.basis.length === n && proof.derivatives.length === n && proof.coordinates.length === n && proof.matrix.length === n, 'verification-failed', 'connection full integral basis coverage');
  for (let i = 0; i < n; i++) {
    demand(curve.owner.equal(ctx, actual[i], proof.basis[i]), 'verification-failed', 'connection original integral basis');
    verifyAlgebraicDerivativeWithin(ctx, curve.owner, actual[i], proof.derivatives[i], bounds);
    const row = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, proof.derivatives[i].derivative);
    demand(proof.coordinates[i].length === n && row.every((v, j) => f.equal(ctx, v, proof.coordinates[i][j])), 'verification-failed', 'connection derivative coordinate correspondence');
  }
  verifyCurveDenominators(ctx, r, proof.coordinates.flatMap(row => row.map(v => v.denominator)), proof.denominators);
  const e = proof.denominators.common; verifyBezout(ctx, r, e, r.derivative(ctx, e), proof.squareFree);
  demand(r.equal(ctx, proof.squareFree.gcd, r.one(ctx)), 'verification-failed', 'connection square-free denominator');
  for (let i = 0; i < n; i++) {
    demand(proof.matrix[i].length === n, 'verification-failed', 'connection matrix coverage');
    for (let j = 0; j < n; j++) demand(r.equal(ctx, proof.matrix[i][j], r.multiply(ctx, proof.coordinates[i][j].numerator, exactDivide(ctx, r, e, proof.coordinates[i][j].denominator))), 'verification-failed', 'connection matrix exact clearing');
  }
}
export function constructAlgebraicConnectionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): AlgebraicConnection<E> {
  const b = basis(ctx, curve), f = curve.finite.lattice.scalar, r = f.ring; ctx.allocate(b.length * 2);
  const derivatives = Object.freeze(b.map(v => differentiateAlgebraicWithin(ctx, curve.owner, v, bounds))), coordinates = Object.freeze(derivatives.map(v => curveOrderCoordinates(ctx, curve.coordinates, curve.finite, v.derivative)));
  const denominators = curveDenominators(ctx, r, coordinates.flatMap(row => row.map(v => v.denominator))), e = denominators.common;
  const squareFree = extendedGcd(ctx, r, e, r.derivative(ctx, e)), matrix = Object.freeze(coordinates.map(row => Object.freeze(row.map(v => r.multiply(ctx, v.numerator, exactDivide(ctx, r, e, v.denominator))))));
  const proof = Object.freeze({basis: b, derivatives, coordinates, denominators, squareFree, matrix}); verifyAlgebraicConnectionWithin(ctx, curve, proof, bounds); return proof;
}
function value<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, numerator: readonly P[], denominator: P): E {
  const f = curve.finite.lattice.scalar, n = curve.finite.lattice.dimension;
  demand(numerator.length === n, 'verification-failed', 'Hermite full numerator coverage'); ctx.allocate(n);
  const vector = Array.from({length: n}, (_, j) => {
    let out = f.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = f.add(ctx, out, f.multiply(ctx, f.make(ctx, numerator[i], denominator), curve.finite.lattice.basis[i][j])); return out;
  });
  return curveOrderNative(ctx, curve.coordinates, curve.finite, vector);
}
function modularSystem<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, connection: AlgebraicConnection<E>, a: readonly P[], u: P, v: P, ell: bigint): LinearSystem<CurveConstant> {
  const r = curve.finite.lattice.scalar.ring, c = curve.coordinates.constantOwner, n = connection.basis.length, d = r.degree(ctx, v), size = n * d;
  demand(d > 0 && Number.isSafeInteger(size) && Number.isSafeInteger(size * size), 'invalid-input', 'Hermite modular system dimensions'); ctx.allocate(size * size + size * 2 + n * n);
  const t = exactDivide(ctx, r, r.multiply(ctx, u, v), connection.denominators.common), diagonal = r.scale(ctx, r.multiply(ctx, u, r.derivative(ctx, v)), c.fromInteger(ctx, -ell));
  const operators = connection.matrix.map((row, i) => row.map((p, j) => r.add(ctx, r.multiply(ctx, t, p), i === j ? diagonal : r.zero(ctx))));
  const columns: (readonly CurveConstant[])[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) {
    const monomial = r.make(ctx, [...Array<CurveConstant>(k).fill(c.fromInteger(ctx, 0n)), c.fromInteger(ctx, 1n)]);
    const parts = operators[i].map(p => polynomialDivide(ctx, r, r.multiply(ctx, p, monomial), v).remainder);
    columns.push(Object.freeze(parts.flatMap(p => Array.from({length: d}, (_, j) => p.coefficients[j] ?? c.fromInteger(ctx, 0n)))));
  }
  const rhs = a.flatMap(p => { const remainder = polynomialDivide(ctx, r, p, v).remainder; return Array.from({length: d}, (_, j) => remainder.coefficients[j] ?? c.fromInteger(ctx, 0n)); });
  return Object.freeze({rows: size, columns: size, matrix: freezeExactMatrix(ctx, Array.from({length: size}, (_, j) => columns.map(column => column[j]))), rhs: Object.freeze(rhs)});
}
function sameSystem(ctx: ExecutionContext, c: AlgebraicCurveView<unknown>['coordinates']['constantOwner'], actual: LinearSystem<CurveConstant>, expected: LinearSystem<CurveConstant>) {
  demand(actual.rows === expected.rows && actual.columns === expected.columns && actual.matrix.length === expected.rows && actual.rhs.length === expected.rows, 'verification-failed', 'Hermite complete matrix dimensions');
  for (let i = 0; i < expected.rows; i++) demand(actual.matrix[i].length === expected.columns && actual.matrix[i].every((v, j) => c.equal(ctx, v, expected.matrix[i][j])) && c.equal(ctx, actual.rhs[i], expected.rhs[i]), 'verification-failed', 'Hermite exact modular matrix mapping');
}
export interface AlgebraicHermiteStep<E> {
  readonly squareFree: FactorSquareFree<CurveConstant>;
  readonly selected: number;
  readonly u: P;
  readonly v: P;
  readonly ell: bigint;
  readonly coprime: Bezout<CurveConstant>;
  readonly system: LinearSystem<CurveConstant>;
  readonly elimination: LinearSolution<CurveConstant>;
  readonly coefficients: readonly P[];
  readonly correction: E;
  readonly derivative: AlgebraicDerivative<E>;
  readonly nextNumerators: readonly P[];
  readonly nextDenominator: P;
}
export interface AlgebraicHermite<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly connection: AlgebraicConnection<E>;
  readonly coordinates: readonly CurveScalar[];
  readonly denominators: CurveDenominators;
  readonly numerators: readonly P[];
  readonly steps: readonly AlgebraicHermiteStep<E>[];
  readonly finalSquareFree: Bezout<CurveConstant>;
  readonly fieldPart: E;
  readonly derivative: AlgebraicDerivative<E>;
  readonly remainder: E;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function nextNumerators<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, connection: AlgebraicConnection<E>, a: readonly P[], p: Pick<AlgebraicHermiteStep<E>, 'u' | 'v' | 'ell' | 'coefficients'>) {
  const r = curve.finite.lattice.scalar.ring, uv = r.multiply(ctx, p.u, p.v), t = exactDivide(ctx, r, uv, connection.denominators.common);
  const minus = r.scale(ctx, r.multiply(ctx, p.u, r.derivative(ctx, p.v)), r.domain.fromInteger(ctx, p.ell));
  return Object.freeze(a.map((ai, j) => {
    let numerator = r.add(ctx, r.subtract(ctx, ai, r.multiply(ctx, uv, r.derivative(ctx, p.coefficients[j]))), r.multiply(ctx, minus, p.coefficients[j]));
    for (let i = 0; i < a.length; i++) numerator = r.subtract(ctx, numerator, r.multiply(ctx, t, r.multiply(ctx, p.coefficients[i], connection.matrix[i][j])));
    return exactDivide(ctx, r, numerator, p.v);
  }));
}
export function verifyAlgebraicHermiteWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicHermite<E>, bounds: DifferentialBounds): void {
  const f = curve.owner, scalar = curve.finite.lattice.scalar, r = scalar.ring, c = curve.coordinates.constantOwner, n = curve.finite.lattice.dimension;
  demand(f.equal(ctx, input, proof.input), 'verification-failed', 'Hermite expected native input'); verifyAlgebraicConnectionWithin(ctx, curve, proof.connection, bounds);
  const coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  demand(proof.coordinates.length === n && coordinates.every((v, i) => scalar.equal(ctx, v, proof.coordinates[i])), 'verification-failed', 'Hermite initial integral coordinates');
  verifyCurveDenominators(ctx, r, [...coordinates.map(v => v.denominator), proof.connection.denominators.common], proof.denominators);
  let denominator = proof.denominators.common, a = coordinates.map(v => r.multiply(ctx, v.numerator, exactDivide(ctx, r, denominator, v.denominator))), fieldPart = f.fromInteger(ctx, 0n);
  demand(a.length === proof.numerators.length && a.every((v, i) => r.equal(ctx, v, proof.numerators[i])), 'verification-failed', 'Hermite initial exact denominator clearing');
  for (const p of proof.steps) {
    verifyFactorSquareFree(ctx, r, denominator, p.squareFree);
    const index = p.squareFree.components.length - 1, component = p.squareFree.components[index];
    demand(index >= 0 && p.selected === index && component.multiplicity > 1n && p.ell === component.multiplicity - 1n && r.equal(ctx, p.v, component.polynomial), 'verification-failed', 'Hermite complete highest repeated component');
    demand(r.equal(ctx, p.u, exactDivide(ctx, r, denominator, r.power(ctx, p.v, factorIndex(ctx, component.multiplicity)))), 'verification-failed', 'Hermite repeated denominator reconstruction');
    verifyBezout(ctx, r, p.u, p.v, p.coprime); demand(r.equal(ctx, p.coprime.gcd, r.one(ctx)), 'verification-failed', 'Hermite disjoint denominator factors');
    const system = modularSystem(ctx, curve, proof.connection, a, p.u, p.v, p.ell); sameSystem(ctx, c, p.system, system); verifyLinearSolution(ctx, c, system, p.elimination);
    demand(p.elimination.kind === 'consistent' && p.elimination.nullspace.length === 0 && p.elimination.rank === system.columns, 'verification-failed', 'Hermite complete unique modular solution');
    const d = r.degree(ctx, p.v); demand(p.coefficients.length === n && p.coefficients.every((v, i) => r.equal(ctx, v, r.make(ctx, p.elimination.kind === 'consistent' ? p.elimination.particular.slice(i * d, (i + 1) * d) : []))), 'verification-failed', 'Hermite coefficient mapping');
    const correction = value(ctx, curve, p.coefficients, r.power(ctx, p.v, factorIndex(ctx, p.ell))); demand(f.equal(ctx, p.correction, correction), 'verification-failed', 'Hermite native correction');
    verifyAlgebraicDerivativeWithin(ctx, f, correction, p.derivative, bounds);
    const next = nextNumerators(ctx, curve, proof.connection, a, p), nextDenominator = exactDivide(ctx, r, denominator, p.v);
    demand(p.nextNumerators.length === n && next.every((v, i) => r.equal(ctx, v, p.nextNumerators[i])) && r.equal(ctx, p.nextDenominator, nextDenominator)
      && r.degree(ctx, nextDenominator) < r.degree(ctx, denominator), 'verification-failed', 'Hermite transition reconstruction/progress');
    demand(f.equal(ctx, value(ctx, curve, a, denominator), f.add(ctx, p.derivative.derivative, value(ctx, curve, next, nextDenominator))), 'verification-failed', 'Hermite independent transition derivative identity');
    a = [...next]; denominator = nextDenominator; fieldPart = f.add(ctx, fieldPart, correction);
  }
  verifyBezout(ctx, r, denominator, r.derivative(ctx, denominator), proof.finalSquareFree); demand(r.equal(ctx, proof.finalSquareFree.gcd, r.one(ctx)), 'verification-failed', 'Hermite final square-free denominator');
  demand(f.equal(ctx, fieldPart, proof.fieldPart) && f.equal(ctx, value(ctx, curve, a, denominator), proof.remainder), 'verification-failed', 'Hermite complete final mapping');
  verifyAlgebraicDerivativeWithin(ctx, f, fieldPart, proof.derivative, bounds); demand(f.equal(ctx, input, f.add(ctx, proof.derivative.derivative, proof.remainder)), 'verification-failed', 'Hermite full explicit target');
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [fieldPart]), proof.conditions, bounds);
}
export function reduceAlgebraicHermiteWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicHermite<E> {
  const f = curve.owner, scalar = curve.finite.lattice.scalar, r = scalar.ring, connection = constructAlgebraicConnectionWithin(ctx, curve, bounds), coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  const denominators = curveDenominators(ctx, r, [...coordinates.map(v => v.denominator), connection.denominators.common]); let denominator = denominators.common;
  const numerators = Object.freeze(coordinates.map(v => r.multiply(ctx, v.numerator, exactDivide(ctx, r, denominator, v.denominator)))); let a = numerators, fieldPart = f.fromInteger(ctx, 0n);
  const steps: AlgebraicHermiteStep<E>[] = [];
  for (;;) {
    const squareFree = checkedFactorSquareFree(ctx, r, denominator), selected = squareFree.components.length - 1, component = squareFree.components[selected];
    if (!component || component.multiplicity === 1n) break;
    const v = component.polynomial, ell = component.multiplicity - 1n, u = exactDivide(ctx, r, denominator, r.power(ctx, v, factorIndex(ctx, component.multiplicity))), coprime = extendedGcd(ctx, r, u, v), system = modularSystem(ctx, curve, connection, a, u, v, ell), elimination = solveLinearSystem(ctx, r.domain, system);
    demand(elimination.kind === 'consistent' && elimination.nullspace.length === 0, 'verification-failed', 'complete integral-basis Hermite system is uniquely solvable');
    const d = r.degree(ctx, v), coefficients = Object.freeze(connection.basis.map((_, i) => r.make(ctx, elimination.particular.slice(i * d, (i + 1) * d)))), correction = value(ctx, curve, coefficients, r.power(ctx, v, factorIndex(ctx, ell))), derivative = differentiateAlgebraicWithin(ctx, f, correction, bounds);
    const next = nextNumerators(ctx, curve, connection, a, {u, v, ell, coefficients}), nextDenominator = exactDivide(ctx, r, denominator, v);
    ctx.allocate(12); steps.push(Object.freeze({squareFree, selected, u, v, ell, coprime, system, elimination, coefficients, correction, derivative, nextNumerators: next, nextDenominator}));
    a = next; denominator = nextDenominator; fieldPart = f.add(ctx, fieldPart, correction);
  }
  const finalSquareFree = extendedGcd(ctx, r, denominator, r.derivative(ctx, denominator)), remainder = value(ctx, curve, a, denominator), derivative = differentiateAlgebraicWithin(ctx, f, fieldPart, bounds), conditions = algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [fieldPart]), bounds);
  const proof = Object.freeze({input, connection, coordinates, denominators, numerators, steps: Object.freeze(steps), finalSquareFree, fieldPart, derivative, remainder, conditions}); verifyAlgebraicHermiteWithin(ctx, curve, input, proof, bounds); return proof;
}
export function reduceAlgebraicHermite<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return reduceAlgebraicHermiteWithin(ctx, curve, input, bounds); }); return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicHermite<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicHermite<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'Hermite arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicHermiteWithin(ctx, curve, input, proof, bounds); }); });
}
