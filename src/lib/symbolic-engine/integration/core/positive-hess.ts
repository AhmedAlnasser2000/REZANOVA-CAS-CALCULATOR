import { demand, type ExecutionContext } from './execution';
import type { PositivePolynomial } from './positive-polynomial';
import { solveArithmeticLinearSystem, type LinearSystem } from './arithmetic-linear';
import { reciprocalPositiveFraction, type PositiveFraction } from './positive-fraction';
import { positiveLatticeCoordinates, type PositiveLattice } from './positive-lattice';
import { freezeExactMatrix, transposeExactMatrix, invertArithmeticMatrix, verifyArithmeticMatrixInverse, equalExactMatrices,
  type ExactMatrix, type MatrixInverse } from './arithmetic-matrix';

export interface PositiveHessStep<E> {
  readonly target: number;
  readonly relation: readonly E[];
  readonly factors: readonly PositivePolynomial<E>[];
}
export interface PositiveHessSpace<E> {
  readonly steps: readonly PositiveHessStep<E>[];
  readonly reduced: ExactMatrix<PositiveFraction<E>>;
  readonly transformation: ExactMatrix<PositivePolynomial<E>>;
  readonly weights: readonly number[];
  readonly leadingInverse: MatrixInverse<E>;
  readonly indices: readonly Readonly<{row: number; power: number}>[];
  readonly basis: ExactMatrix<PositiveFraction<E>>;
}
function orderAtZero<E>(ctx: ExecutionContext, p: PositivePolynomial<E>): number {
  p.ring.assert(ctx, p); demand(!p.ring.isZero(ctx, p), 'invalid-input', 'valuation of zero polynomial');
  let k = 0; while (p.ring.field.isZero(ctx, p.coefficients[k])) { ctx.tick(); k++; } return k;
}
/** The infinity chart is localized at u=0. Denominator factors that are units
 * there do not impose conditions at their other zeroes. */
export function positiveFractionOrderAtZero<E>(ctx: ExecutionContext, value: PositiveFraction<E>): number | null {
  value.owner.assert(ctx, value); if (value.owner.isZero(ctx, value)) return null;
  return orderAtZero(ctx, value.numerator) - orderAtZero(ctx, value.denominator);
}
function profile<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, infinity: PositiveLattice<E>, row: readonly PositiveFraction<E>[]) {
  const f = infinity.field, c = f.ring.field;
  demand(finite.field.ring.field === c && finite.dimension === infinity.dimension, 'domain-mismatch', 'Hess chart constants/dimension');
  const coordinates = positiveLatticeCoordinates(ctx, infinity, row.map(v => reciprocalPositiveFraction<E>(ctx, f, v)));
  ctx.allocate(coordinates.length * 2);
  const orders = coordinates.map(v => positiveFractionOrderAtZero(ctx, v));
  let minimum: number | null = null;
  for (const order of orders) if (order !== null && (minimum === null || order < minimum)) minimum = order;
  demand(minimum !== null, 'verification-failed', 'Hess nonzero basis row');
  const leading = Object.freeze(coordinates.map((v, j) => orders[j] === minimum
    ? c.exactDivide(ctx, v.numerator.coefficients[orderAtZero(ctx, v.numerator)], v.denominator.coefficients[orderAtZero(ctx, v.denominator)])
    : c.fromInteger(ctx, 0n)));
  return {weight: minimum === 0 ? 0 : -minimum, leading};
}
function profiles<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, infinity: PositiveLattice<E>, rows: ExactMatrix<PositiveFraction<E>>) {
  ctx.allocate(rows.length); return rows.map(row => profile(ctx, finite, infinity, row));
}
function shiftPolynomial<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, coefficient: E, degree: number): PositivePolynomial<E> {
  demand(Number.isSafeInteger(degree) && degree >= 0, 'verification-failed', 'Hess polynomial shift');
  if (finite.field.ring.field.isZero(ctx, coefficient)) return finite.field.ring.zero(ctx);
  ctx.degree(degree); ctx.allocate(degree + 1);
  return finite.field.ring.make(ctx, [...Array<E>(degree).fill(finite.field.ring.field.fromInteger(ctx, 0n)), coefficient]);
}
function stepFactors<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, data: readonly {weight: number; leading: readonly E[]}[], target: number, relation: readonly E[]) {
  const c = finite.field.ring.field, n = finite.dimension;
  demand(Number.isSafeInteger(target) && target >= 0 && target < n && relation.length === n && !c.isZero(ctx, relation[target]),
    'verification-failed', 'Hess relation target');
  for (const v of relation) c.assert(ctx, v);
  for (let k = 0; k < n; k++) {
    let sum = c.fromInteger(ctx, 0n);
    for (let j = 0; j < n; j++) sum = c.add(ctx, sum, c.multiply(ctx, relation[j], data[j].leading[k]));
    demand(c.isZero(ctx, sum), 'verification-failed', 'Hess leading cancellation identity');
  }
  ctx.allocate(n);
  return Object.freeze(relation.map((v, j) => {
    if (j === target || c.isZero(ctx, v)) return finite.field.ring.zero(ctx);
    demand(data[target].weight >= data[j].weight, 'verification-failed', 'Hess maximum active weight');
    return shiftPolynomial(ctx, finite, c.exactDivide(ctx, v, relation[target]), data[target].weight - data[j].weight);
  }));
}
function applyStep<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, basis: PositiveFraction<E>[][], transformation: PositivePolynomial<E>[][],
  target: number, factors: readonly PositivePolynomial<E>[]) {
  const f = finite.field, r = f.ring, n = finite.dimension;
  for (let j = 0; j < n; j++) if (!r.isZero(ctx, factors[j])) {
    const factor = f.make(ctx, factors[j], r.one(ctx));
    for (let k = 0; k < n; k++) {
      basis[target][k] = f.add(ctx, basis[target][k], f.multiply(ctx, factor, basis[j][k]));
      transformation[target][k] = r.add(ctx, transformation[target][k], r.multiply(ctx, factors[j], transformation[j][k]));
    }
  }
}
function identity<E>(ctx: ExecutionContext, finite: PositiveLattice<E>) {
  const r = finite.field.ring, n = finite.dimension; ctx.allocate(n * n);
  return Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? r.one(ctx) : r.zero(ctx)));
}
function indices(ctx: ExecutionContext, weights: readonly number[]) {
  let size = 0;
  for (const w of weights) {
    demand(Number.isSafeInteger(w), 'verification-failed', 'Hess weight');
    size += Math.max(0, 1 - w); demand(Number.isSafeInteger(size), 'invalid-input', 'Riemann–Roch dimension');
  }
  ctx.allocate(size); const result: {row: number; power: number}[] = [];
  for (let i = 0; i < weights.length; i++) for (let j = 0; j <= -weights[i]; j++) { ctx.tick(); result.push(Object.freeze({row: i, power: j})); }
  return Object.freeze(result);
}
function spaceBasis<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, reduced: ExactMatrix<PositiveFraction<E>>, selection: ReturnType<typeof indices>): ExactMatrix<PositiveFraction<E>> {
  const f = finite.field, c = f.ring.field; ctx.allocate(selection.length * finite.dimension);
  return freezeExactMatrix(ctx, selection.map(({row, power}) => {
    const x = f.make(ctx, shiftPolynomial(ctx, finite, c.fromInteger(ctx, 1n), power), f.ring.one(ctx));
    return reduced[row].map(v => f.multiply(ctx, x, v));
  }));
}

/** General Hess lattice reduction. Each polynomial elementary row operation
 * preserves the finite lattice and decreases one infinity weight. Independence
 * of the terminal leading vectors proves the exact no-cancellation degree law.
 * The determinant valuation bounds the sum of weights below, proving termination. */
export function solvePositiveHessSpace<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, infinity: PositiveLattice<E>): PositiveHessSpace<E> {
  const f = finite.field, c = f.ring.field, n = finite.dimension;
  ctx.allocate(n * n); const basis = finite.basis.map(row => [...row]), transformation = identity(ctx, finite), steps: PositiveHessStep<E>[] = [];
  for (;;) {
    const data = profiles(ctx, finite, infinity, basis), matrix = transposeExactMatrix(ctx, data.map(p => p.leading), n);
    const system: LinearSystem<E> = Object.freeze({rows: n, columns: n, matrix, rhs: Object.freeze(Array<E>(n).fill(c.fromInteger(ctx, 0n)))});
    const elimination = solveArithmeticLinearSystem(ctx, c, system);
    demand(elimination.kind === 'consistent', 'verification-failed', 'Hess homogeneous system');
    if (!elimination.nullspace.length) {
      const leadingInverse = invertArithmeticMatrix(ctx, c, matrix); demand(leadingInverse !== null, 'verification-failed', 'Hess complete leading basis');
      const weights = Object.freeze(data.map(p => p.weight)), reduced = freezeExactMatrix(ctx, basis), selected = indices(ctx, weights);
      const proof = Object.freeze({steps: Object.freeze(steps), reduced, transformation: freezeExactMatrix(ctx, transformation), weights,
        leadingInverse, indices: selected, basis: spaceBasis(ctx, finite, reduced, selected)});
      verifyPositiveHessSpace(ctx, finite, infinity, proof); return proof;
    }
    const relation = elimination.nullspace[0]; let target = -1;
    for (let i = 0; i < n; i++) if (!c.isZero(ctx, relation[i]) && (target < 0 || data[i].weight > data[target].weight)) target = i;
    const factors = stepFactors(ctx, finite, data, target, relation), old = data[target].weight;
    applyStep(ctx, finite, basis, transformation, target, factors);
    demand(profile(ctx, finite, infinity, basis[target]).weight < old, 'verification-failed', 'Hess strict infinity progress');
    ctx.allocate(4); steps.push(Object.freeze({target, relation, factors}));
  }
}
export function verifyPositiveHessSpace<E>(ctx: ExecutionContext, finite: PositiveLattice<E>, infinity: PositiveLattice<E>, proof: PositiveHessSpace<E>): void {
  const f = finite.field, r = f.ring, c = r.field, n = finite.dimension;
  ctx.allocate(n * n); const basis = finite.basis.map(row => [...row]), transformation = identity(ctx, finite);
  for (const step of proof.steps) {
    const data = profiles(ctx, finite, infinity, basis), factors = stepFactors(ctx, finite, data, step.target, step.relation);
    demand(step.factors.length === n && factors.every((p, i) => r.equal(ctx, p, step.factors[i])), 'verification-failed', 'Hess shift reconstruction');
    const old = data[step.target].weight; applyStep(ctx, finite, basis, transformation, step.target, factors);
    demand(profile(ctx, finite, infinity, basis[step.target]).weight < old, 'verification-failed', 'Hess replay progress');
  }
  demand(equalExactMatrices(ctx, f, basis, proof.reduced) && equalExactMatrices(ctx, r, transformation, proof.transformation), 'verification-failed', 'Hess complete transformation');
  const data = profiles(ctx, finite, infinity, basis);
  demand(proof.weights.length === n && proof.weights.every((w, i) => w === data[i].weight), 'verification-failed', 'Hess exact infinity weights');
  verifyArithmeticMatrixInverse(ctx, c, transposeExactMatrix(ctx, data.map(p => p.leading), n), proof.leadingInverse);
  const selected = indices(ctx, proof.weights);
  demand(proof.indices.length === selected.length && selected.every((v, i) => v.row === proof.indices[i].row && v.power === proof.indices[i].power),
    'verification-failed', 'Riemann–Roch full coefficient coverage');
  demand(equalExactMatrices(ctx, f, spaceBasis(ctx, finite, basis, selected), proof.basis), 'verification-failed', 'Riemann–Roch basis mapping');
  // For any polynomial combination, the maximum weight+coefficient degree
  // cannot cancel because these leading vectors are C-independent. Thus the
  // listed coefficient slots are both necessary and sufficient, including L=0.
}
