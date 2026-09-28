import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import type { Rational } from './rational';
import type { FormalPrimitiveDomain, QPolynomial, QRationalFunction } from './formal-primitive';
import { exactDivide, extendedGcd, polynomialDivide, polynomialGcd, verifyBezout, verifyDivision, type Bezout, type Division } from './polynomial-division';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';

export interface HermiteStep {
  readonly exponent: number;
  readonly primitiveNumerator: QPolynomial;
  readonly nextNumerator: QPolynomial;
}
export interface HermiteBlock {
  readonly separation: Bezout<Rational>;
  readonly numeratorDivision: Division<Rational>;
  readonly derivativeBezout: Bezout<Rational>;
  readonly steps: readonly HermiteStep[];
}
export interface HermiteCertificate {
  readonly division: Division<Rational>;
  readonly polynomialPrimitive: QPolynomial;
  readonly decomposition: SquareFreeDecomposition<Rational>;
  readonly blocks: readonly HermiteBlock[];
  readonly rationalPart: QRationalFunction;
  readonly residual: QRationalFunction;
}

export function hermiteReduce(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): HermiteCertificate {
  const r = owner.x, f = owner.fractions; f.assert(ctx, input);
  const division = polynomialDivide(ctx, r, input.numerator, input.denominator);
  ctx.degree(division.quotient.coefficients.length); ctx.allocate(division.quotient.coefficients.length + 1);
  const polynomialPrimitive = r.make(ctx, [rationalField.fromInteger(ctx, 0n), ...division.quotient.coefficients.map((c, i) =>
    rationalField.exactDivide(ctx, c, rationalField.fromInteger(ctx, BigInt(i + 1))))]);
  const decomposition = squareFree(ctx, r, input.denominator);
  ctx.allocate(decomposition.factors.length + 6);
  const blocks: HermiteBlock[] = [];
  let rationalPart = f.make(ctx, polynomialPrimitive, r.one(ctx)), residual = f.fromInteger(ctx, 0n);
  for (const { factor: v, multiplicity } of decomposition.factors) {
    ctx.tick(); const w = r.power(ctx, v, multiplicity), u = exactDivide(ctx, r, input.denominator, w);
    const separation = extendedGcd(ctx, r, u, w);
    const numeratorDivision = polynomialDivide(ctx, r, r.multiply(ctx, division.remainder, separation.s), w);
    const derivative = r.derivative(ctx, v), derivativeBezout = extendedGcd(ctx, r, derivative, v);
    ctx.allocate(multiplicity - 1 + 4); const steps: HermiteStep[] = [];
    let h = numeratorDivision.remainder;
    for (let k = multiplicity; k > 1; k--) {
      ctx.tick(); const scalar = rationalField.fromInteger(ctx, BigInt(k - 1));
      const t = polynomialDivide(ctx, r, r.scale(ctx, r.multiply(ctx, h, derivativeBezout.s),
        rationalField.negate(ctx, rationalField.inverse(ctx, scalar))), v).remainder;
      const nextNumerator = exactDivide(ctx, r, r.subtract(ctx, r.add(ctx, h, r.scale(ctx, r.multiply(ctx, t, derivative), scalar)),
        r.multiply(ctx, r.derivative(ctx, t), v)), v);
      ctx.allocate(3); steps.push(Object.freeze({ exponent: k, primitiveNumerator: t, nextNumerator }));
      rationalPart = f.add(ctx, rationalPart, f.make(ctx, t, r.power(ctx, v, k - 1))); h = nextNumerator;
    }
    residual = f.add(ctx, residual, f.make(ctx, h, v));
    blocks.push(Object.freeze({ separation, numeratorDivision, derivativeBezout, steps: Object.freeze(steps) }));
  }
  const result = Object.freeze({ division, polynomialPrimitive, decomposition, blocks: Object.freeze(blocks), rationalPart, residual });
  verifyHermite(ctx, owner, input, result); return result;
}

/** Reconstructs saved identities; does not rerun the reduction producer. */
export function verifyHermite(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: HermiteCertificate): void {
  const r = owner.x, f = owner.fractions; f.assert(ctx, input);
  verifyDivision(ctx, r, input.numerator, input.denominator, proof.division);
  demand(r.equal(ctx, r.derivative(ctx, proof.polynomialPrimitive), proof.division.quotient), 'verification-failed', 'polynomial primitive derivative');
  demand(!proof.polynomialPrimitive.coefficients.length || rationalField.isZero(ctx, proof.polynomialPrimitive.coefficients[0]),
    'verification-failed', 'polynomial integration constant');
  verifySquareFree(ctx, r, input.denominator, proof.decomposition);
  demand(rationalField.equal(ctx, proof.decomposition.scalar, rationalField.fromInteger(ctx, 1n)), 'verification-failed', 'monic denominator decomposition');
  demand(proof.blocks.length === proof.decomposition.factors.length, 'verification-failed', 'Hermite block coverage'); ctx.allocate(proof.blocks.length);
  let separated = f.fromInteger(ctx, 0n), rationalPart = f.make(ctx, proof.polynomialPrimitive, r.one(ctx)), residual = f.fromInteger(ctx, 0n);
  for (let i = 0; i < proof.blocks.length; i++) {
    ctx.tick(); const block = proof.blocks[i], { factor: v, multiplicity } = proof.decomposition.factors[i];
    const w = r.power(ctx, v, multiplicity), u = exactDivide(ctx, r, input.denominator, w), dv = r.derivative(ctx, v);
    verifyBezout(ctx, r, u, w, block.separation);
    demand(r.equal(ctx, block.separation.gcd, r.one(ctx)), 'verification-failed', 'coprime denominator powers');
    verifyDivision(ctx, r, r.multiply(ctx, proof.division.remainder, block.separation.s), w, block.numeratorDivision);
    verifyBezout(ctx, r, dv, v, block.derivativeBezout);
    demand(r.equal(ctx, block.derivativeBezout.gcd, r.one(ctx)), 'verification-failed', 'square-free inverse');
    demand(block.steps.length === multiplicity - 1, 'verification-failed', 'Hermite step coverage'); ctx.allocate(block.steps.length);
    let h = block.numeratorDivision.remainder; separated = f.add(ctx, separated, f.make(ctx, h, w));
    for (let j = 0; j < block.steps.length; j++) {
      ctx.tick(); const step = block.steps[j], k = multiplicity - j, t = step.primitiveNumerator;
      demand(step.exponent === k && r.degree(ctx, t) < r.degree(ctx, v), 'verification-failed', 'Hermite exponent/reduced numerator');
      const reconstructed = r.subtract(ctx, r.multiply(ctx, r.add(ctx, r.derivative(ctx, t), step.nextNumerator), v),
        r.scale(ctx, r.multiply(ctx, t, dv), rationalField.fromInteger(ctx, BigInt(k - 1))));
      demand(r.equal(ctx, h, reconstructed), 'verification-failed', 'Hermite step identity');
      demand(r.degree(ctx, step.nextNumerator) < (k - 1) * r.degree(ctx, v), 'verification-failed', 'Hermite proper numerator');
      rationalPart = f.add(ctx, rationalPart, f.make(ctx, t, r.power(ctx, v, k - 1))); h = step.nextNumerator;
    }
    residual = f.add(ctx, residual, f.make(ctx, h, v));
  }
  demand(f.equal(ctx, separated, f.make(ctx, proof.division.remainder, input.denominator)), 'verification-failed', 'Hermite separated fractions');
  demand(f.equal(ctx, rationalPart, proof.rationalPart) && f.equal(ctx, residual, proof.residual), 'verification-failed', 'Hermite assembly');
  demand(r.degree(ctx, residual.numerator) < r.degree(ctx, residual.denominator), 'verification-failed', 'Hermite proper residual');
  demand(r.equal(ctx, polynomialGcd(ctx, r, residual.denominator, r.derivative(ctx, residual.denominator)), r.one(ctx)),
    'verification-failed', 'Hermite residual square-freeness');
  demand(f.equal(ctx, input, f.add(ctx, f.derivative(ctx, proof.rationalPart), proof.residual)), 'verification-failed', 'Hermite final identity');
}
