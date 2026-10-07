import { demand, type ExecutionContext } from './execution';
import { FactorPrimeField, modularBezout, verifyModularBezout,
  type FactorModularBezout, type FactorModularPolynomial as P } from './factorization-modular';

export interface FactorFiniteIrreducibility {
  readonly frobenius: readonly (readonly bigint[])[];
  readonly exclusions: readonly { readonly index: number; readonly bezout: FactorModularBezout }[];
}
export interface FactorFiniteDecomposition {
  readonly prime: bigint;
  readonly squareFree: FactorModularBezout;
  readonly factors: readonly { readonly polynomial: readonly bigint[]; readonly irreducibility: FactorFiniteIrreducibility }[];
}

function primeDivisors(ctx: ExecutionContext, degree: number): number[] {
  ctx.degree(degree); ctx.allocate(degree + 1); const out: number[] = []; let n = degree;
  for (let d = 2; d * d <= n; d++) {
    ctx.tick(); if (n % d !== 0) continue; out.push(d);
    while (n % d === 0) { ctx.tick(); n /= d; }
  }
  if (n > 1) out.push(n); return out;
}
function irreducibility(ctx: ExecutionContext, field: FactorPrimeField, f: P): FactorFiniteIrreducibility {
  const n = f.coefficients.length - 1, x = field.divide(ctx, field.x(ctx), f).remainder;
  const frobenius: (readonly bigint[])[] = [x.coefficients]; let h = x;
  ctx.allocate(n + 1);
  for (let i = 1; i <= n; i++) { h = field.powMod(ctx, h, field.modulus, f); frobenius.push(h.coefficients); }
  const exclusions = primeDivisors(ctx, n).map(q => {
    const index = n / q, difference = field.subtract(ctx, field.bind(ctx, frobenius[index]), x);
    ctx.allocate(2); return Object.freeze({index, bezout: modularBezout(ctx, field, f, difference)});
  });
  const result = Object.freeze({frobenius: Object.freeze(frobenius), exclusions: Object.freeze(exclusions)});
  verifyFiniteIrreducibility(ctx, field, f, result); return result;
}
export function verifyFiniteIrreducibility(ctx: ExecutionContext, field: FactorPrimeField, f: P,
  proof: FactorFiniteIrreducibility): void {
  field.assert(ctx, f); const n = f.coefficients.length - 1;
  demand(n > 0 && f.coefficients[n] === 1n, 'verification-failed', 'finite factor degree/normalization');
  demand(Array.isArray(proof.frobenius) && proof.frobenius.length === n + 1,
    'verification-failed', 'Frobenius coverage');
  const x = field.divide(ctx, field.x(ctx), f).remainder; let previous = field.bind(ctx, proof.frobenius[0]);
  demand(field.equal(ctx, previous, x), 'verification-failed', 'Frobenius initial value');
  for (let i = 1; i <= n; i++) {
    const next = field.bind(ctx, proof.frobenius[i]);
    demand(field.equal(ctx, field.powMod(ctx, previous, field.modulus, f), next), 'verification-failed', 'Frobenius transition');
    previous = next;
  }
  demand(field.equal(ctx, previous, x), 'verification-failed', 'Frobenius final identity');
  const indices = primeDivisors(ctx, n).map(q => n / q);
  demand(Array.isArray(proof.exclusions) && proof.exclusions.length === indices.length,
    'verification-failed', 'finite irreducibility exclusion coverage');
  for (let i = 0; i < indices.length; i++) {
    const e = proof.exclusions[i]; demand(e.index === indices[i], 'verification-failed', 'finite irreducibility index');
    verifyModularBezout(ctx, field, f, field.subtract(ctx, field.bind(ctx, proof.frobenius[e.index]), x), e.bezout);
    demand(field.equal(ctx, field.bind(ctx, e.bezout.gcd), field.one(ctx)), 'verification-failed', 'finite irreducibility GCD');
  }
}

/** Berlekamp's kernel, over an owned prime field, with charged exact elimination. */
function berlekampBasis(ctx: ExecutionContext, field: FactorPrimeField, f: P): readonly P[] {
  const n = f.coefficients.length - 1;
  ctx.allocate(n * n + n * 3);
  const matrix = Array.from({length: n}, () => Array<bigint>(n).fill(0n));
  const xp = field.powMod(ctx, field.x(ctx), field.modulus, f); let column = field.one(ctx);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) matrix[i][j] = field.plus(ctx, column.coefficients[i] ?? 0n, i === j ? -1n : 0n);
    if (j + 1 < n) column = field.multiplyMod(ctx, column, xp, f);
  }
  const pivots: number[] = []; let row = 0;
  for (let j = 0; j < n && row < n; j++) {
    let selected = row; while (selected < n && matrix[selected][j] === 0n) { ctx.tick(); selected++; }
    if (selected === n) continue;
    [matrix[row], matrix[selected]] = [matrix[selected], matrix[row]];
    const inv = field.inverse(ctx, matrix[row][j]);
    for (let k = 0; k < n; k++) matrix[row][k] = field.times(ctx, matrix[row][k], inv);
    for (let i = 0; i < n; i++) if (i !== row) {
      const c = matrix[i][j];
      for (let k = 0; k < n; k++) matrix[i][k] = field.plus(ctx, matrix[i][k], -field.times(ctx, c, matrix[row][k]));
    }
    pivots.push(j); row++;
  }
  const out: P[] = [];
  for (let j = 0; j < n; j++) {
    ctx.tick(); if (pivots.includes(j)) continue;
    ctx.allocate(n); const v = Array<bigint>(n).fill(0n); v[j] = 1n;
    for (let i = 0; i < pivots.length; i++) v[pivots[i]] = field.residue(ctx, -matrix[i][j]);
    out.push(field.make(ctx, v));
  }
  return Object.freeze(out);
}

export function factorFinitePolynomial(ctx: ExecutionContext, field: FactorPrimeField, input: P): FactorFiniteDecomposition {
  const f = field.monic(ctx, input), squareFree = modularBezout(ctx, field, f, field.derivative(ctx, f));
  demand(field.equal(ctx, field.bind(ctx, squareFree.gcd), field.one(ctx)), 'invalid-input', 'finite square-free input');
  const basis = berlekampBasis(ctx, field, f); let parts: P[] = [f];
  for (const v of basis) {
    if (parts.length === basis.length) break;
    for (let c = 0n; c < field.modulus && parts.length < basis.length; c = ctx.add(c, 1n)) {
      const next: P[] = []; ctx.allocate(parts.length * 2);
      for (const part of parts) {
        if (part.coefficients.length === 2) { next.push(part); continue; }
        const w = field.subtract(ctx, field.divide(ctx, v, part).remainder, field.make(ctx, [c]));
        const g = field.bind(ctx, modularBezout(ctx, field, part, w).gcd);
        if (g.coefficients.length > 1 && g.coefficients.length < part.coefficients.length) {
          const d = field.divide(ctx, part, g); demand(!d.remainder.coefficients.length, 'verification-failed', 'Berlekamp split division');
          next.push(g, field.monic(ctx, d.quotient));
        } else next.push(part);
      }
      parts = next;
    }
  }
  demand(parts.length === basis.length, 'verification-failed', 'incomplete Berlekamp splitting');
  parts.sort((a, b) => {
    ctx.tick(); if (a.coefficients.length !== b.coefficients.length) return a.coefficients.length - b.coefficients.length;
    for (let i = a.coefficients.length - 1; i >= 0; i--) { ctx.tick(); if (a.coefficients[i] !== b.coefficients[i]) return a.coefficients[i] < b.coefficients[i] ? -1 : 1; }
    return 0;
  });
  const factors = parts.map(polynomial => { ctx.allocate(2); return Object.freeze({polynomial: polynomial.coefficients,
    irreducibility: irreducibility(ctx, field, polynomial)}); });
  const result = Object.freeze({prime: field.modulus, squareFree, factors: Object.freeze(factors)});
  verifyFiniteDecomposition(ctx, field, input, result); return result;
}

export function verifyFiniteDecomposition(ctx: ExecutionContext, field: FactorPrimeField, input: P, proof: FactorFiniteDecomposition): void {
  demand(proof.prime === field.modulus, 'verification-failed', 'finite decomposition prime');
  const f = field.monic(ctx, input);
  verifyModularBezout(ctx, field, f, field.derivative(ctx, f), proof.squareFree);
  demand(field.equal(ctx, field.bind(ctx, proof.squareFree.gcd), field.one(ctx)), 'verification-failed', 'finite square-free GCD');
  demand(Array.isArray(proof.factors) && proof.factors.length > 0, 'verification-failed', 'finite factor coverage');
  let product = field.one(ctx);
  for (let i = 0; i < proof.factors.length; i++) {
    const p = field.bind(ctx, proof.factors[i].polynomial); verifyFiniteIrreducibility(ctx, field, p, proof.factors[i].irreducibility);
    for (let j = 0; j < i; j++) demand(!field.equal(ctx, p, field.bind(ctx, proof.factors[j].polynomial)), 'verification-failed', 'duplicate finite factor');
    product = field.multiply(ctx, product, p);
  }
  demand(field.equal(ctx, product, f), 'verification-failed', 'finite factor reconstruction');
}
