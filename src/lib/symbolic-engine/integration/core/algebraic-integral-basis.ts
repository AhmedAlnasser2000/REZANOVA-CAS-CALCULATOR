import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { DifferentialBounds } from './differential-field';
import { constructAlgebraicExtensionWithin, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';
import { freezeExactMatrix, transposeExactMatrix, multiplyExactMatrices, equalExactMatrices, invertExactMatrix,
  verifyExactMatrixInverse, determinantFromInverse, type MatrixInverse, type ExactMatrix } from './algebraic-matrix';
import { polynomialModuleHermite, verifyPolynomialModuleHermite, type PolynomialModuleEvidence } from './polynomial-module';
import { polynomialDenominators, verifyPolynomialDenominators, type PolynomialDenominatorEvidence, type AlgebraicIntegralModel } from './algebraic-integral-model';
import { constructAlgebraicOrderWithin, verifyAlgebraicOrderWithin, modelBase, orderColumn, orderCoordinates, polynomialScalar, type AlgebraicOrder } from './algebraic-order';
import type { FunctionScalar } from './algebraic-presentation';

export interface AlgebraicIdealizer {
  readonly prime: Polynomial<Rational>;
  readonly residue: AlgebraicField<Rational>;
  readonly traceKernel: LinearSolution<AlgebraicElement<Rational>>;
  readonly radical: PolynomialModuleEvidence<Rational>;
  readonly radicalInverse: MatrixInverse<FunctionScalar>;
  readonly denominators: PolynomialDenominatorEvidence;
  readonly constraints: PolynomialModuleEvidence<Rational>;
  readonly constraintInverse: MatrixInverse<FunctionScalar>;
  readonly basis: ExactMatrix<FunctionScalar>;
}
function residueSystem(ctx: ExecutionContext, order: AlgebraicOrder, residue: AlgebraicField<Rational>) {
  const n = order.basis.length; ctx.allocate(n * n + n);
  return Object.freeze({rows: n, columns: n, matrix: freezeExactMatrix(ctx, order.traceMatrix.map(row => row.map(p => residue.make(ctx, residue.ring.make(ctx, p.coefficients))))),
    rhs: Object.freeze(Array(n).fill(residue.fromInteger(ctx, 0n)) as AlgebraicElement<Rational>[])});
}
function radicalInput(ctx: ExecutionContext, model: AlgebraicIntegralModel, prime: Polynomial<Rational>, kernel: LinearSolution<AlgebraicElement<Rational>>) {
  demand(kernel.kind === 'consistent', 'verification-failed', 'homogeneous trace radical');
  const r = modelBase(model).ring, n = kernel.particular.length; ctx.allocate(n * n + kernel.nullspace.length * n);
  const rows = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? prime : r.zero(ctx)));
  for (const vector of kernel.nullspace) rows.push(vector.map(v => r.make(ctx, v.representative.coefficients)));
  return freezeExactMatrix(ctx, rows);
}
function radicalMatrix(ctx: ExecutionContext, model: AlgebraicIntegralModel, radical: PolynomialModuleEvidence<Rational>) {
  const f = modelBase(model), n = radical.columns;
  demand(radical.pivots.length === n, 'verification-failed', 'full trace-radical lattice');
  return transposeExactMatrix(ctx, radical.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, f.ring.one(ctx)))), n);
}
function idealizerMatrix(ctx: ExecutionContext, model: AlgebraicIntegralModel, order: AlgebraicOrder, radical: ExactMatrix<FunctionScalar>, radicalInverse: ExactMatrix<FunctionScalar>) {
  const f = modelBase(model), n = order.basis.length, ideal = multiplyExactMatrices(ctx, f, order.basis, radical, n); ctx.allocate(n * n * n);
  const rows: FunctionScalar[][] = [];
  for (let j = 0; j < n; j++) {
    const factor = orderColumn(ctx, model, ideal, j), columns: (readonly FunctionScalar[])[] = [];
    for (let i = 0; i < n; i++) {
      const product = model.field.multiply(ctx, orderColumn(ctx, model, order.basis, i), factor), old = orderCoordinates(ctx, model, order.inverse.inverse, product);
      columns.push(Object.freeze(radicalInverse.map(row => {
        let sum = f.fromInteger(ctx, 0n); for (let k = 0; k < n; k++) sum = f.add(ctx, sum, f.multiply(ctx, row[k], old[k])); return sum;
      })));
    }
    for (let k = 0; k < n; k++) rows.push(columns.map(column => column[k]));
  }
  return freezeExactMatrix(ctx, rows);
}
function clearedMatrix(ctx: ExecutionContext, model: AlgebraicIntegralModel, matrix: ExactMatrix<FunctionScalar>, common: Polynomial<Rational>) {
  const f = modelBase(model), d = f.make(ctx, common, f.ring.one(ctx));
  return freezeExactMatrix(ctx, matrix.map(row => row.map(v => polynomialScalar(ctx, f, f.multiply(ctx, d, v)))));
}
function constraintMatrix(ctx: ExecutionContext, model: AlgebraicIntegralModel, proof: PolynomialModuleEvidence<Rational>) {
  const f = modelBase(model), n = proof.columns;
  demand(proof.pivots.length === n, 'verification-failed', 'idealizer constraint full rank');
  return freezeExactMatrix(ctx, proof.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, f.ring.one(ctx)))));
}
function idealizerBasis(ctx: ExecutionContext, model: AlgebraicIntegralModel, order: AlgebraicOrder, common: Polynomial<Rational>, inverse: ExactMatrix<FunctionScalar>) {
  const f = modelBase(model), n = order.basis.length, d = f.make(ctx, common, f.ring.one(ctx));
  return multiplyExactMatrices(ctx, f, order.basis, inverse.map(row => row.map(v => f.multiply(ctx, d, v))), n);
}
export function algebraicIdealizerWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, order: AlgebraicOrder, prime: Polynomial<Rational>, bounds: DifferentialBounds): AlgebraicIdealizer {
  const r = new PolynomialRing(Q, 'rho'), residue = constructAlgebraicExtensionWithin(ctx, r, r.make(ctx, prime.coefficients), bounds);
  const traceKernel = solveLinearSystem(ctx, residue, residueSystem(ctx, order, residue)), n = order.basis.length;
  const radical = polynomialModuleHermite(ctx, modelBase(model).ring, radicalInput(ctx, model, prime, traceKernel), n);
  const c = radicalMatrix(ctx, model, radical), radicalInverse = invertExactMatrix(ctx, modelBase(model), c);
  demand(radicalInverse !== null, 'verification-failed', 'radical basis inverse');
  const matrix = idealizerMatrix(ctx, model, order, c, radicalInverse.inverse), denominators = polynomialDenominators(ctx, modelBase(model).ring, matrix.flatMap(row => row.map(v => v.denominator)));
  const constraints = polynomialModuleHermite(ctx, modelBase(model).ring, clearedMatrix(ctx, model, matrix, denominators.common), n);
  const h = constraintMatrix(ctx, model, constraints), constraintInverse = invertExactMatrix(ctx, modelBase(model), h);
  demand(constraintInverse !== null, 'verification-failed', 'idealizer inverse');
  const basis = idealizerBasis(ctx, model, order, denominators.common, constraintInverse.inverse);
  const proof = Object.freeze({prime, residue, traceKernel, radical, radicalInverse, denominators, constraints, constraintInverse, basis});
  verifyAlgebraicIdealizerWithin(ctx, model, order, prime, proof, bounds); return proof;
}
export function verifyAlgebraicIdealizerWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, order: AlgebraicOrder, prime: Polynomial<Rational>, proof: AlgebraicIdealizer, bounds: DifferentialBounds): void {
  const f = modelBase(model), n = order.basis.length;
  demand(f.ring.equal(ctx, prime, proof.prime) && proof.residue.parent === Q && proof.residue.ring.equal(ctx, proof.residue.modulus,
    proof.residue.ring.make(ctx, prime.coefficients)), 'verification-failed', 'certified residue field');
  verifyAlgebraicChainWithin(ctx, proof.residue, bounds);
  verifyLinearSolution(ctx, proof.residue, residueSystem(ctx, order, proof.residue), proof.traceKernel);
  verifyPolynomialModuleHermite(ctx, f.ring, radicalInput(ctx, model, prime, proof.traceKernel), n, proof.radical);
  const c = radicalMatrix(ctx, model, proof.radical); verifyExactMatrixInverse(ctx, f, c, proof.radicalInverse);
  const matrix = idealizerMatrix(ctx, model, order, c, proof.radicalInverse.inverse);
  verifyPolynomialDenominators(ctx, f.ring, matrix.flatMap(row => row.map(v => v.denominator)), proof.denominators);
  verifyPolynomialModuleHermite(ctx, f.ring, clearedMatrix(ctx, model, matrix, proof.denominators.common), n, proof.constraints);
  verifyExactMatrixInverse(ctx, f, constraintMatrix(ctx, model, proof.constraints), proof.constraintInverse);
  demand(equalExactMatrices(ctx, f, proof.basis, idealizerBasis(ctx, model, order, proof.denominators.common, proof.constraintInverse.inverse)),
    'verification-failed', 'complete idealizer basis');
}
export interface AlgebraicNormalizationAttempt {
  readonly idealizer: AlgebraicIdealizer;
  readonly order: AlgebraicOrder;
  readonly inclusion: MatrixInverse<FunctionScalar>;
}
export interface AlgebraicNormalizationRound {
  readonly factors: AlgebraicFactorization<Rational>;
  readonly attempts: readonly AlgebraicNormalizationAttempt[];
}
export interface AlgebraicIntegralBasis {
  readonly initial: AlgebraicOrder;
  readonly rounds: readonly AlgebraicNormalizationRound[];
  readonly final: AlgebraicOrder;
}
function initialBasis(ctx: ExecutionContext, model: AlgebraicIntegralModel) {
  const f = modelBase(model), n = model.field.ring.degree(ctx, model.field.modulus); ctx.allocate(n * n);
  return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => f.fromInteger(ctx, i === j ? 1n : 0n))));
}
function inclusionMatrix(ctx: ExecutionContext, model: AlgebraicIntegralModel, old: AlgebraicOrder, next: AlgebraicOrder) {
  const f = modelBase(model), matrix = multiplyExactMatrices(ctx, f, next.inverse.inverse, old.basis, old.basis.length);
  for (const row of matrix) for (const v of row) polynomialScalar(ctx, f, v); return matrix;
}
function verifyAttempt(ctx: ExecutionContext, model: AlgebraicIntegralModel, old: AlgebraicOrder, prime: Polynomial<Rational>, attempt: AlgebraicNormalizationAttempt, bounds: DifferentialBounds): boolean {
  const f = modelBase(model), r = f.ring;
  verifyAlgebraicIdealizerWithin(ctx, model, old, prime, attempt.idealizer, bounds); verifyAlgebraicOrderWithin(ctx, model, attempt.order);
  demand(equalExactMatrices(ctx, f, attempt.idealizer.basis, attempt.order.basis), 'verification-failed', 'normalization order mapping');
  const inclusion = inclusionMatrix(ctx, model, old, attempt.order); verifyExactMatrixInverse(ctx, f, inclusion, attempt.inclusion);
  const index = polynomialScalar(ctx, f, determinantFromInverse(ctx, f, attempt.inclusion));
  demand(r.equal(ctx, old.discriminant, r.multiply(ctx, r.multiply(ctx, index, index), attempt.order.discriminant)), 'verification-failed', 'discriminant-index identity');
  const strict = r.degree(ctx, index) > 0;
  demand(!strict || r.degree(ctx, attempt.order.discriminant) < r.degree(ctx, old.discriminant), 'verification-failed', 'normalization strict progress'); return strict;
}
export function algebraicIntegralBasisWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, bounds: DifferentialBounds): AlgebraicIntegralBasis {
  const f = modelBase(model), initial = constructAlgebraicOrderWithin(ctx, model, initialBasis(ctx, model)), rounds: AlgebraicNormalizationRound[] = [];
  let order = initial;
  for (;;) {
    const factors = factorAlgebraicPolynomialWithin(ctx, f.ring, order.discriminant, bounds);
    demand(factors.kind === 'factorization', 'verification-failed', 'nonzero order discriminant');
    const primes = factors.factors.filter(p => p.multiplicity >= 2n), attempts: AlgebraicNormalizationAttempt[] = []; let enlarged = false;
    for (const p of primes) {
      const idealizer = algebraicIdealizerWithin(ctx, model, order, p.polynomial, bounds), next = constructAlgebraicOrderWithin(ctx, model, idealizer.basis);
      const inclusion = invertExactMatrix(ctx, f, inclusionMatrix(ctx, model, order, next)); demand(inclusion !== null, 'verification-failed', 'normalization inclusion');
      const attempt = Object.freeze({idealizer, order: next, inclusion}); ctx.allocate(4); attempts.push(attempt);
      if (verifyAttempt(ctx, model, order, p.polynomial, attempt, bounds)) { order = next; enlarged = true; break; }
    }
    ctx.allocate(3); rounds.push(Object.freeze({factors, attempts: Object.freeze(attempts)}));
    if (!enlarged) break;
  }
  const proof = Object.freeze({initial, rounds: Object.freeze(rounds), final: order}); verifyAlgebraicIntegralBasisWithin(ctx, model, proof, bounds); return proof;
}
export function verifyAlgebraicIntegralBasisWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, proof: AlgebraicIntegralBasis, bounds: DifferentialBounds): void {
  const f = modelBase(model), r = f.ring;
  verifyAlgebraicOrderWithin(ctx, model, proof.initial);
  demand(equalExactMatrices(ctx, f, proof.initial.basis, initialBasis(ctx, model)) && proof.rounds.length > 0, 'verification-failed', 'initial integral order');
  let order = proof.initial, terminal = false;
  for (let k = 0; k < proof.rounds.length; k++) {
    demand(!terminal, 'verification-failed', 'extra normalization rounds'); const round = proof.rounds[k];
    verifyAlgebraicFactorizationWithin(ctx, r, order.discriminant, round.factors, bounds);
    demand(round.factors.kind === 'factorization', 'verification-failed', 'discriminant factorization');
    const primes = round.factors.factors.filter(p => p.multiplicity >= 2n);
    demand(round.attempts.length <= primes.length, 'verification-failed', 'normalization prime coverage'); let enlarged = false;
    for (let i = 0; i < round.attempts.length; i++) {
      demand(!enlarged, 'verification-failed', 'normalization prefix coverage');
      if (verifyAttempt(ctx, model, order, primes[i].polynomial, round.attempts[i], bounds)) { order = round.attempts[i].order; enlarged = true; }
    }
    if (!enlarged) {
      demand(round.attempts.length === primes.length && k === proof.rounds.length - 1, 'verification-failed', 'incomplete terminal maximality'); terminal = true;
    }
  }
  demand(terminal && equalExactMatrices(ctx, f, order.basis, proof.final.basis), 'verification-failed', 'integral closure terminal coverage');
  verifyAlgebraicOrderWithin(ctx, model, proof.final);
}
