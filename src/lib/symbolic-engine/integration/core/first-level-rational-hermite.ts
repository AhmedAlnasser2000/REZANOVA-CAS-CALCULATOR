import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { FirstLevelRationalDomain, assertFirstLevelRationalDomain, totalPolynomialDerivative, verifyTotalPolynomialDerivative, type EP } from './first-level-rational-domain';
import { exactDivide, extendedGcd, polynomialDivide, verifyBezout, verifyDivision, type Bezout, type Division } from './polynomial-division';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';

export interface DifferentialHermiteStep {
  readonly exponent: number;
  readonly numerator: EP;
  readonly derivative: DerivativeEvidence;
  readonly next: EP;
}
export interface DifferentialHermiteBlock {
  readonly separation: Bezout<E>;
  readonly division: Division<E>;
  readonly derivative: DerivativeEvidence;
  readonly normal: Bezout<E>;
  readonly steps: readonly DifferentialHermiteStep[];
}
export interface DifferentialHermite {
  readonly power: number;
  readonly normalDenominator: EP;
  readonly decomposition: SquareFreeDecomposition<E>;
  readonly division: Division<E>;
  readonly blocks: readonly DifferentialHermiteBlock[];
  readonly fieldPart: E;
  readonly derivative: DerivativeEvidence;
  readonly laurent: E;
  readonly residual: E;
}
export function firstLevelFraction(ctx: ExecutionContext, d: FirstLevelRationalDomain, n: EP, den: EP): E {
  return d.field.fraction(ctx, d.field.fractions!.make(ctx, n, den));
}
export function firstLevelDenominatorPower(ctx: ExecutionContext, d: FirstLevelRationalDomain, denominator: EP): number {
  d.t.assert(ctx, denominator); demand(!d.t.isZero(ctx, denominator), 'verification-failed', 'zero denominator');
  if (d.field.admission?.kind === 'logarithmic') return 0;
  let k = 0; while (k < denominator.coefficients.length && d.base.isZero(ctx, denominator.coefficients[k])) { ctx.tick(); k++; }
  return k;
}
export function firstLevelHermite(ctx: ExecutionContext, d: FirstLevelRationalDomain, input: E): DifferentialHermite {
  assertFirstLevelRationalDomain(ctx, d); const f = d.field, r = d.t, k = d.base; f.assert(ctx, input); demand(input.kind === 'fraction', 'domain-mismatch', 'Hermite field input');
  const denominator = input.value.denominator, power = firstLevelDenominatorPower(ctx, d, denominator);
  ctx.allocate(denominator.coefficients.length - power);
  const normalDenominator = r.make(ctx, denominator.coefficients.slice(power)), decomposition = squareFree(ctx, r, normalDenominator);
  const division = polynomialDivide(ctx, r, input.value.numerator, denominator);
  let fieldPart = f.fromInteger(ctx, 0n), residual = fieldPart, separated = fieldPart;
  ctx.allocate(decomposition.factors.length + 9); const blocks: DifferentialHermiteBlock[] = [];
  for (const { factor: v, multiplicity } of decomposition.factors) {
    const w = r.power(ctx, v, multiplicity), u = exactDivide(ctx, r, denominator, w);
    const separation = extendedGcd(ctx, r, u, w), split = polynomialDivide(ctx, r, r.multiply(ctx, division.remainder, separation.s), w);
    const derivative = totalPolynomialDerivative(ctx, f, v), dv = verifyTotalPolynomialDerivative(ctx, f, v, derivative);
    const normal = extendedGcd(ctx, r, dv, v); demand(r.equal(ctx, normal.gcd, r.one(ctx)), 'verification-failed', 'non-normal factor');
    let h = split.remainder; separated = f.add(ctx, separated, firstLevelFraction(ctx, d, h, w));
    ctx.allocate(multiplicity - 1); const steps: DifferentialHermiteStep[] = [];
    for (let j = multiplicity; j > 1; j--) {
      const scalar = k.fromInteger(ctx, BigInt(j - 1));
      const t = polynomialDivide(ctx, r, r.scale(ctx, r.multiply(ctx, h, normal.s), k.negate(ctx, k.inverse(ctx, scalar))), v).remainder;
      const dt = totalPolynomialDerivative(ctx, f, t);
      const next = exactDivide(ctx, r, r.subtract(ctx, r.add(ctx, h, r.scale(ctx, r.multiply(ctx, t, dv), scalar)),
        r.multiply(ctx, verifyTotalPolynomialDerivative(ctx, f, t, dt), v)), v);
      ctx.allocate(4); steps.push(Object.freeze({ exponent: j, numerator: t, derivative: dt, next }));
      fieldPart = f.add(ctx, fieldPart, firstLevelFraction(ctx, d, t, r.power(ctx, v, j - 1))); h = next;
    }
    residual = f.add(ctx, residual, firstLevelFraction(ctx, d, h, v));
    blocks.push(Object.freeze({ separation, division: split, derivative, normal, steps: Object.freeze(steps) }));
  }
  const laurent = f.subtract(ctx, input, separated), derivative = differentiate(ctx, f, fieldPart);
  const proof = Object.freeze({ power, normalDenominator, decomposition, division, blocks: Object.freeze(blocks), fieldPart, derivative, laurent, residual });
  verifyFirstLevelHermite(ctx, d, input, proof); return proof;
}
export function verifyFirstLevelHermite(ctx: ExecutionContext, d: FirstLevelRationalDomain, input: E, proof: DifferentialHermite): void {
  assertFirstLevelRationalDomain(ctx, d); const f = d.field, r = d.t, k = d.base; f.assert(ctx, input); demand(input.kind === 'fraction', 'domain-mismatch', 'Hermite input');
  const denominator = input.value.denominator;
  demand(proof.power === firstLevelDenominatorPower(ctx, d, denominator), 'verification-failed', 'special denominator power');
  ctx.allocate(proof.power + 1); const special = r.make(ctx, [...Array<E>(proof.power).fill(k.fromInteger(ctx, 0n)), k.fromInteger(ctx, 1n)]);
  demand(r.equal(ctx, r.multiply(ctx, special, proof.normalDenominator), denominator)
    && (f.admission?.kind === 'logarithmic' || !k.isZero(ctx, proof.normalDenominator.coefficients[0])), 'verification-failed', 'normal/special reconstruction');
  verifySquareFree(ctx, r, proof.normalDenominator, proof.decomposition);
  demand(k.equal(ctx, proof.decomposition.scalar, k.fromInteger(ctx, 1n)), 'verification-failed', 'monic normal denominator');
  verifyDivision(ctx, r, input.value.numerator, denominator, proof.division);
  demand(proof.blocks.length === proof.decomposition.factors.length, 'verification-failed', 'Hermite block coverage');
  let fieldPart = f.fromInteger(ctx, 0n), residual = fieldPart, separated = fieldPart;
  for (let i = 0; i < proof.blocks.length; i++) {
    ctx.tick(); const block = proof.blocks[i], { factor: v, multiplicity } = proof.decomposition.factors[i];
    const w = r.power(ctx, v, multiplicity), u = exactDivide(ctx, r, denominator, w);
    verifyBezout(ctx, r, u, w, block.separation); demand(r.equal(ctx, block.separation.gcd, r.one(ctx)), 'verification-failed', 'denominator separation');
    verifyDivision(ctx, r, r.multiply(ctx, proof.division.remainder, block.separation.s), w, block.division);
    const dv = verifyTotalPolynomialDerivative(ctx, f, v, block.derivative); verifyBezout(ctx, r, dv, v, block.normal);
    demand(r.equal(ctx, block.normal.gcd, r.one(ctx)), 'verification-failed', 'differential normality');
    demand(block.steps.length === multiplicity - 1, 'verification-failed', 'Hermite step coverage');
    let h = block.division.remainder; separated = f.add(ctx, separated, firstLevelFraction(ctx, d, h, w));
    for (let j = 0; j < block.steps.length; j++) {
      ctx.tick(); const step = block.steps[j], exponent = multiplicity - j;
      demand(step.exponent === exponent && r.degree(ctx, step.numerator) < r.degree(ctx, v), 'verification-failed', 'Hermite step exponent/numerator');
      const dt = verifyTotalPolynomialDerivative(ctx, f, step.numerator, step.derivative);
      demand(r.equal(ctx, h, r.subtract(ctx, r.multiply(ctx, r.add(ctx, step.next, dt), v),
        r.scale(ctx, r.multiply(ctx, step.numerator, dv), k.fromInteger(ctx, BigInt(exponent - 1))))), 'verification-failed', 'differential Hermite identity');
      demand(r.degree(ctx, step.next) < (exponent - 1) * r.degree(ctx, v), 'verification-failed', 'proper Hermite next numerator');
      fieldPart = f.add(ctx, fieldPart, firstLevelFraction(ctx, d, step.numerator, r.power(ctx, v, exponent - 1))); h = step.next;
    }
    residual = f.add(ctx, residual, firstLevelFraction(ctx, d, h, v));
  }
  demand(f.equal(ctx, input, f.add(ctx, separated, proof.laurent)) && f.equal(ctx, fieldPart, proof.fieldPart)
    && f.equal(ctx, residual, proof.residual), 'verification-failed', 'Hermite assembly');
  f.assert(ctx, proof.laurent); demand(proof.laurent.kind === 'fraction' && proof.residual.kind === 'fraction', 'domain-mismatch', 'Hermite values');
  demand(f.admission?.kind === 'logarithmic' ? r.equal(ctx, proof.laurent.value.denominator, r.one(ctx))
    : firstLevelDenominatorPower(ctx, d, proof.laurent.value.denominator) === r.degree(ctx, proof.laurent.value.denominator),
    'verification-failed', 'Hermite Laurent denominator');
  demand(r.degree(ctx, proof.residual.value.numerator) < r.degree(ctx, proof.residual.value.denominator), 'verification-failed', 'proper normal residual');
  verifyDerivative(ctx, f, fieldPart, proof.derivative);
  demand(f.equal(ctx, input, f.add(ctx, proof.derivative.derivative, f.add(ctx, proof.laurent, residual))), 'verification-failed', 'complete Hermite identity');
}
