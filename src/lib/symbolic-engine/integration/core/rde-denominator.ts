import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { Polynomial as P } from './polynomial';
import type { PolynomialDomain } from './polynomial-domain';
import { extendedGcd, exactDivide, verifyBezout, type Bezout } from './polynomial-division';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';
import { positiveIntegerRoots, verifyIntegerRoots, type IntegerRootEvidence } from './rde-integer-roots';
import { hasse, verifyHasse, nestedInputs, naturalDegree, type RdeDomain } from './rde-algebra';

export interface ResonanceEvidence {
  readonly leadingUnit: Bezout<E>;
  readonly resultant: SubresultantCertificate<P<E>, PolynomialDomain<E>>;
  readonly integers: IntegerRootEvidence;
  readonly splits: readonly Bezout<E>[];
}
export interface PoleBlock {
  readonly valuationSplits: readonly Bezout<E>[];
  readonly resonance: ResonanceEvidence | null;
}
export interface DenominatorEvidence {
  readonly squareFree: SquareFreeDecomposition<E>;
  readonly hasseA: readonly P<E>[];
  readonly hasseB: readonly P<E>[];
  readonly blocks: readonly PoleBlock[];
  readonly denominator: P<E>;
}
function maximum(s: number, m: bigint): bigint { return m > BigInt(s - 1) ? m : BigInt(s - 1); }
function multiplyFactor(ctx: ExecutionContext, d: RdeDomain, product: P<E>, factor: P<E>, exponent: bigint): P<E> {
  const degree = ctx.add(BigInt(d.ring.degree(ctx, product)), ctx.multiply(BigInt(d.ring.degree(ctx, factor)), exponent));
  naturalDegree(ctx, degree);
  // A constant component is one. Large exponents never become machine indices.
  if (d.ring.degree(ctx, factor) === 0 || exponent === 0n) return product;
  return d.ring.multiply(ctx, product, d.ring.power(ctx, factor, naturalDegree(ctx, exponent)));
}
function resonance(ctx: ExecutionContext, d: RdeDomain, factor: P<E>, ah: P<E>, bh: P<E>): ResonanceEvidence {
  const leadingUnit = extendedGcd(ctx, d.ring, factor, ah), [f, g] = nestedInputs(ctx, d, factor, ah, bh);
  demand(d.ring.equal(ctx, leadingUnit.gcd, d.ring.one(ctx)), 'verification-failed', 'singular indicial leading term');
  const resultant = subresultants(ctx, d.resultantRing, f, g);
  demand(!d.orders.isZero(ctx, resultant.resultant), 'verification-failed', 'zero indicial resultant');
  const integers = positiveIntegerRoots(ctx, d.orders, resultant.resultant), splits: Bezout<E>[] = [];
  let remaining = factor;
  for (const m of integers.roots) {
    const split = extendedGcd(ctx, d.ring, remaining, d.ring.subtract(ctx, bh, d.ring.scale(ctx, ah, d.ring.domain.fromInteger(ctx, m))));
    ctx.allocate(1); splits.push(split); remaining = exactDivide(ctx, d.ring, remaining, split.gcd);
  }
  ctx.allocate(4); return Object.freeze({ leadingUnit, resultant, integers, splits: Object.freeze(splits) });
}
export function boundDenominator(ctx: ExecutionContext, d: RdeDomain, A: P<E>, B: P<E>): DenominatorEvidence {
  const r = d.ring, sf = squareFree(ctx, r, A), largest = sf.factors.at(-1)?.multiplicity ?? 0;
  const ha = hasse(ctx, r, A, largest), hb = hasse(ctx, r, B, largest), blocks: PoleBlock[] = [];
  let product = r.one(ctx);
  for (const { factor, multiplicity: s } of sf.factors) {
    let remaining = factor, evidence: ResonanceEvidence | null = null;
    const splits: Bezout<E>[] = [];
    for (let j = 0; j < s; j++) {
      const split = extendedGcd(ctx, r, remaining, hb[j]), component = exactDivide(ctx, r, remaining, split.gcd);
      ctx.allocate(1); splits.push(split); remaining = split.gcd;
      if (j < s - 1) product = multiplyFactor(ctx, d, product, component, BigInt(j));
      else if (r.degree(ctx, component) > 0) {
        evidence = resonance(ctx, d, component, ha[s], hb[s - 1]);
        let rest = component;
        for (let k = 0; k < evidence.integers.roots.length; k++) {
          product = multiplyFactor(ctx, d, product, evidence.splits[k].gcd, maximum(s, evidence.integers.roots[k]));
          rest = exactDivide(ctx, r, rest, evidence.splits[k].gcd);
        }
        product = multiplyFactor(ctx, d, product, rest, BigInt(s - 1));
      }
    }
    product = multiplyFactor(ctx, d, product, remaining, BigInt(s - 1));
    ctx.allocate(3); blocks.push(Object.freeze({ valuationSplits: Object.freeze(splits), resonance: evidence }));
  }
  ctx.allocate(5); const proof = Object.freeze({ squareFree: sf, hasseA: ha, hasseB: hb, blocks: Object.freeze(blocks), denominator: product });
  verifyDenominator(ctx, d, A, B, proof); return proof;
}
export function verifyDenominator(ctx: ExecutionContext, d: RdeDomain, A: P<E>, B: P<E>, proof: DenominatorEvidence): void {
  const r = d.ring, sf = proof.squareFree;
  verifySquareFree(ctx, r, A, sf);
  const largest = sf.factors.at(-1)?.multiplicity ?? 0;
  verifyHasse(ctx, r, A, largest, proof.hasseA); verifyHasse(ctx, r, B, largest, proof.hasseB);
  demand(proof.blocks.length === sf.factors.length, 'verification-failed', 'pole block coverage');
  let product = r.one(ctx);
  for (let i = 0; i < sf.factors.length; i++) {
    const { factor, multiplicity: s } = sf.factors[i], block = proof.blocks[i];
    demand(block.valuationSplits.length === s, 'verification-failed', 'valuation coverage');
    let remaining = factor;
    for (let j = 0; j < s; j++) {
      const split = block.valuationSplits[j]; verifyBezout(ctx, r, remaining, proof.hasseB[j], split);
      const component = exactDivide(ctx, r, remaining, split.gcd); remaining = split.gcd;
      if (j < s - 1) { product = multiplyFactor(ctx, d, product, component, BigInt(j)); continue; }
      if (r.degree(ctx, component) === 0) { demand(block.resonance === null, 'verification-failed', 'extraneous resonance'); continue; }
      const e = block.resonance;
      demand(e !== null, 'verification-failed', 'missing resonance');
      const ah = proof.hasseA[s], bh = proof.hasseB[s - 1];
      verifyBezout(ctx, r, component, ah, e.leadingUnit);
      demand(r.equal(ctx, e.leadingUnit.gcd, r.one(ctx)), 'verification-failed', 'indicial leading unit');
      const [f, g] = nestedInputs(ctx, d, component, ah, bh);
      verifySubresultants(ctx, d.resultantRing, f, g, e.resultant);
      demand(!d.orders.isZero(ctx, e.resultant.resultant), 'verification-failed', 'zero resonance polynomial');
      verifyIntegerRoots(ctx, d.orders, e.resultant.resultant, e.integers);
      demand(e.splits.length === e.integers.roots.length, 'verification-failed', 'resonance split coverage');
      let rest = component;
      for (let k = 0; k < e.integers.roots.length; k++) {
        const m = e.integers.roots[k], split = e.splits[k];
        verifyBezout(ctx, r, rest, r.subtract(ctx, bh, r.scale(ctx, ah, r.domain.fromInteger(ctx, m))), split);
        demand(r.degree(ctx, split.gcd) > 0, 'verification-failed', 'empty resonance component');
        product = multiplyFactor(ctx, d, product, split.gcd, maximum(s, m));
        rest = exactDivide(ctx, r, rest, split.gcd);
      }
      product = multiplyFactor(ctx, d, product, rest, BigInt(s - 1));
    }
    product = multiplyFactor(ctx, d, product, remaining, BigInt(s - 1));
  }
  demand(r.equal(ctx, product, proof.denominator), 'verification-failed', 'universal denominator reconstruction');
}
