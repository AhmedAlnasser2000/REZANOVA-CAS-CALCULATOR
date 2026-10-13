import { demand, type ExecutionContext } from './execution';
import type { FiniteField } from './positive-field';
import { PositivePolynomialRing, positiveBezout, type PositivePolynomial } from './positive-polynomial';
import { finiteIrreducibility, verifyFiniteExtensionIrreducibility, finiteInverseFrobenius, type FiniteIrreducibility } from './positive-extension';
import { solveArithmeticLinearSystem } from './arithmetic-linear';

export type PositiveFactorization<E> = Readonly<{kind: 'zero'; input: PositivePolynomial<E>}> | Readonly<{kind: 'factorization'; input: PositivePolynomial<E>; unit: E;
  factors: readonly Readonly<{polynomial: PositivePolynomial<E>; multiplicity: bigint; irreducibility: FiniteIrreducibility<E>}>[]}>;
function squareFreeFactors<E>(ctx: ExecutionContext, field: FiniteField<E>, ring: PositivePolynomialRing<E>, input: PositivePolynomial<E>): PositivePolynomial<E>[] {
  const n = ring.degree(ctx, input); if (n <= 1) return n === 1 ? [input] : [];
  const xq = ring.powMod(ctx, ring.x(ctx), field.size, input), columns: E[][] = []; let power = ring.one(ctx);
  ctx.allocate(n * n + n); const zero = field.fromInteger(ctx, 0n);
  for (let j = 0; j < n; j++) { columns.push(Array.from({length: n}, (_, i) => field.subtract(ctx, power.coefficients[i] ?? zero, field.fromInteger(ctx, i === j ? 1n : 0n)))); power = ring.divide(ctx, ring.multiply(ctx, power, xq), input).remainder; }
  const kernel = solveArithmeticLinearSystem(ctx, field, {rows: n, columns: n, matrix: Object.freeze(Array.from({length: n}, (_, i) => Object.freeze(columns.map(c => c[i])))), rhs: Object.freeze(Array<E>(n).fill(zero))});
  demand(kernel.kind === 'consistent', 'verification-failed', 'Berlekamp homogeneous system');
  let factors = [input];
  for (const vector of kernel.nullspace) {
    const b = ring.make(ctx, vector), next: PositivePolynomial<E>[] = [];
    for (const factor of factors) {
      let components = [factor];
      for (let index = 0n; index < field.size && components.some(f => ring.degree(ctx, f) > 1); index = ctx.add(index, 1n)) {
        const shifted = ring.subtract(ctx, b, ring.constant(ctx, field.element(ctx, index))), split: PositivePolynomial<E>[] = [];
        for (const component of components) {
          const gcd = positiveBezout(ctx, ring, component, shifted).gcd, d = ring.degree(ctx, gcd);
          if (d > 0 && d < ring.degree(ctx, component)) { ctx.allocate(2); split.push(gcd, ring.exactDivide(ctx, component, gcd)); } else { ctx.allocate(1); split.push(component); }
        }
        components = split;
      }
      next.push(...components); ctx.allocate(components.length);
    }
    factors = next;
  }
  demand(factors.length === kernel.nullspace.length, 'verification-failed', 'complete Berlekamp splitting'); return factors;
}
export function factorPositivePolynomial<E>(ctx: ExecutionContext, field: FiniteField<E>, ring: PositivePolynomialRing<E>, input: PositivePolynomial<E>): PositiveFactorization<E> {
  demand(ring.field === field, 'domain-mismatch', 'finite factor coefficient owner'); ring.assert(ctx, input);
  if (ring.isZero(ctx, input)) return Object.freeze({kind: 'zero', input});
  const unit = ring.leading(ctx, input), factors: {polynomial: PositivePolynomial<E>; multiplicity: bigint; irreducibility: FiniteIrreducibility<E>}[] = [];
  const retain = (p: PositivePolynomial<E>, multiplicity: bigint) => {
    const i = factors.findIndex(f => ring.equal(ctx, f.polynomial, p)); if (i >= 0) factors[i].multiplicity = ctx.add(factors[i].multiplicity, multiplicity);
    else { ctx.allocate(3); factors.push({polynomial: p, multiplicity, irreducibility: finiteIrreducibility(ctx, ring, p, field.size)}); }
  };
  const recurse = (p: PositivePolynomial<E>, multiplicity: bigint): void => {
    const n = ring.degree(ctx, p); if (n <= 0) return; if (n === 1) { retain(p, multiplicity); return; }
    const derivative = ring.derivative(ctx, p);
    if (ring.isZero(ctx, derivative)) {
      const prime = field.characteristic; demand(prime <= BigInt(n), 'verification-failed', 'inseparable polynomial degree'); const step = Number(prime); ctx.allocate(Math.floor(n / step) + 1);
      const root: E[] = [];
      for (let i = 0; i <= n; i++) { const c = p.coefficients[i] ?? field.fromInteger(ctx, 0n); if (i % step) demand(field.isZero(ctx, c), 'verification-failed', 'inseparable coefficient coverage'); else root.push(finiteInverseFrobenius(ctx, field, c)); }
      recurse(ring.make(ctx, root), ctx.multiply(multiplicity, prime)); return;
    }
    const gcd = positiveBezout(ctx, ring, p, derivative).gcd;
    if (ring.degree(ctx, gcd) > 0) { recurse(gcd, multiplicity); recurse(ring.exactDivide(ctx, p, gcd), multiplicity); return; }
    for (const factor of squareFreeFactors(ctx, field, ring, p)) retain(factor, multiplicity);
  };
  recurse(ring.monic(ctx, input), 1n);
  const proof = Object.freeze({kind: 'factorization' as const, input, unit, factors: Object.freeze(factors.map(f => Object.freeze(f)))});
  verifyPositiveFactorization(ctx, field, ring, input, proof); return proof;
}
export function verifyPositiveFactorization<E>(ctx: ExecutionContext, field: FiniteField<E>, ring: PositivePolynomialRing<E>, input: PositivePolynomial<E>, proof: PositiveFactorization<E>): void {
  demand(ring.field === field && ring.equal(ctx, input, proof.input), 'domain-mismatch', 'finite factorization exact request');
  if (proof.kind === 'zero') { demand(ring.isZero(ctx, input), 'verification-failed', 'finite zero factorization'); return; }
  demand(proof.kind === 'factorization' && !ring.isZero(ctx, input) && !field.isZero(ctx, proof.unit), 'verification-failed', 'finite factorization unit'); let product = ring.constant(ctx, proof.unit);
  for (let i = 0; i < proof.factors.length; i++) { const f = proof.factors[i]; ctx.integer(f.multiplicity); demand(f.multiplicity > 0n, 'verification-failed', 'finite positive multiplicity');
    verifyFiniteExtensionIrreducibility(ctx, ring, f.polynomial, field.size, f.irreducibility);
    for (let j = 0; j < i; j++) demand(!ring.equal(ctx, f.polynomial, proof.factors[j].polynomial), 'verification-failed', 'finite distinct factors');
    for (let j = 0n; j < f.multiplicity; j = ctx.add(j, 1n)) product = ring.multiply(ctx, product, f.polynomial);
  }
  demand(ring.equal(ctx, product, input), 'verification-failed', 'finite complete factor reconstruction');
}
