import { describe, expect, it } from 'vitest';
import { context, poly, rationalRing } from './test-support';
import { rational, type Rational } from './rational';
import { rationalField, requireField, type ExactRing } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain, coefficientContent, verifyPrimitivePart } from './polynomial-domain';
import { pseudoDivide, verifyPseudoDivision } from './pseudo-division';
import { subresultants, verifySubresultants, scalarResultant, indexedSubresultant } from './subresultant';
import { specializeSubresultants } from './subresultant-specialization';
import type { ExecutionContext } from './execution';
import { polynomialDivide } from './polynomial-division';

// Test-only Leibniz determinants: independent of every PRS/Euclidean routine.
function determinant<E>(ctx: ExecutionContext, d: ExactRing<E>, matrix: E[][]): E {
  if (!matrix.length) return d.fromInteger(ctx, 1n);
  let sum = d.fromInteger(ctx, 0n);
  for (let j = 0; j < matrix.length; j++) {
    let term = d.multiply(ctx, matrix[0][j], determinant(ctx, d, matrix.slice(1).map(row => row.filter((_, k) => k !== j))));
    if (j % 2) term = d.negate(ctx, term);
    sum = d.add(ctx, sum, term);
  }
  return sum;
}
function minorSubresultant<E, D extends ExactRing<E>>(ctx: ExecutionContext, r: PolynomialRing<E, D>,
  a: Polynomial<E, D>, b: Polynomial<E, D>, j: number): Polynomial<E, D> {
  const m = r.degree(ctx, a), n = r.degree(ctx, b), columns = m + n - j, rows = m + n - 2 * j;
  const matrix: E[][] = [];
  for (const [p, count] of [[a, n - j], [b, m - j]] as const) {
    for (let shift = count - 1; shift >= 0; shift--) {
      matrix.push(Array.from({ length: columns }, (_, col) => p.coefficients[columns - 1 - col - shift] ?? r.domain.fromInteger(ctx, 0n)));
    }
  }
  return r.make(ctx, Array.from({ length: j + 1 }, (_, i) => determinant(ctx, r.domain,
    matrix.map(row => [...row.slice(0, rows - 1), row[columns - 1 - i]]))));
}

describe('ring coefficients and verified elimination', () => {
  it('performs pseudo-division at zero, constant, unequal and equal degree boundaries', () => {
    const ctx = context(), r = rationalRing();
    for (const [aa, bb] of [[[], [2]], [[1], [2]], [[1, 2], [3, 0, 4]], [[1, 0, 2], [3, 4]], [[1, 0, 1], [-1, 0, 1]]] as const) {
      const a = poly(ctx, r, [...aa]), b = poly(ctx, r, [...bb]), proof = pseudoDivide(ctx, r, a, b);
      verifyPseudoDivision(ctx, r, a, b, proof);
      expect(() => verifyPseudoDivision(ctx, r, a, b, { ...proof, exponent: proof.exponent + 1 })).toThrow('verification-failed');
    }
    expect(() => pseudoDivide(ctx, r, r.one(ctx), r.zero(ctx))).toThrow('division-by-zero');
  });
  it('distinguishes the defective PRS tail, indexed S1 and scalar S0', () => {
    const ctx = context(), r = rationalRing(), a = poly(ctx, r, [1, 0, 1]), b = poly(ctx, r, [-1, 0, 1]);
    const proof = subresultants(ctx, r, a, b);
    expect(proof.steps[0].next.coefficients).toEqual([rational(ctx, -2)]);
    expect(proof.indexed.map(s => [s.index, s.degree])).toEqual([[0, 0], [1, 0]]);
    expect(proof.resultant).toEqual(rational(ctx, 4));
    expect(indexedSubresultant(ctx, r, a, b, 1).principal).toEqual(rational(ctx, 0));
    expect(() => indexedSubresultant(ctx, r, a, b, 2)).toThrow('invalid-input');
  });
  it('agrees with independent Sylvester minors for seeded small inputs and swaps', () => {
    const ctx = context({ work: 100_000_000, allocation: 1_000_000_000 }), r = rationalRing();
    let seed = 9143;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 7 - 3; };
    for (let k = 0; k < 20; k++) {
      const a = poly(ctx, r, [...Array.from({ length: 1 + k % 3 }, next), 2]);
      const b = poly(ctx, r, [...Array.from({ length: 1 + (k + 1) % 3 }, next), -1]);
      for (const [f, g] of [[a, b], [b, a]]) {
        const proof = subresultants(ctx, r, f, g);
        for (let j = 0; j < proof.indexed.length; j++) {
          expect(r.equal(ctx, proof.indexed[j].polynomial, minorSubresultant(ctx, r, f, g, j))).toBe(true);
        }
      }
    }
  });
  it('handles constants, zero inputs, common factors and abnormal degree drops', () => {
    const ctx = context(), r = rationalRing();
    for (const [a, b, value] of [[[2], [3], 1], [[2], [1, 0, 0, 3], 8], [[1, 0, 3], [2], 4], [[], [2], 0], [[2], [], 0], [[], [], 0]] as const)
      expect(scalarResultant(ctx, r, poly(ctx, r, [...a]), poly(ctx, r, [...b]))).toEqual(rational(ctx, value));
    const shared = subresultants(ctx, r, poly(ctx, r, [-1, 0, 1]), poly(ctx, r, [-1, 1]));
    expect(shared.resultant).toEqual(rational(ctx, 0));
    expect(shared.indexed[1].kind).toBe('highest-boundary');
    const proof = subresultants(ctx, r, poly(ctx, r, [-5, 2, 8, -3, -3, 0, 1, 0, 1]), poly(ctx, r, [21, -9, -4, 0, 5, 0, 3]));
    expect(proof.steps.map(s => r.degree(ctx, s.next))).toEqual([4, 2, 1, 0, -1]);
  });
  it('checks nested nonmonic inputs and every indexed minor over Q[z]', () => {
    const ctx = context({ work: 100_000_000, allocation: 1_000_000_000 }), z = rationalRing('z');
    const r = new PolynomialRing(new PolynomialDomain(z), 'x');
    const a = r.make(ctx, [poly(ctx, z, [1, 1]), poly(ctx, z, [-1]), poly(ctx, z, [0, 1]), poly(ctx, z, [2, 1])]);
    const b = r.make(ctx, [poly(ctx, z, [2]), poly(ctx, z, [1, 1]), poly(ctx, z, [1, -1])]);
    for (const [f, g] of [[a, b], [b, a], [b, r.add(ctx, b, r.one(ctx))]]) {
      const proof = subresultants(ctx, r, f, g);
      for (const entry of proof.indexed) expect(r.equal(ctx, entry.polynomial, minorSubresultant(ctx, r, f, g, entry.index))).toBe(true);
    }
    expect(Object.isFrozen(a.coefficients)).toBe(true);
    expect(Object.isFrozen(subresultants(ctx, r, a, b).steps)).toBe(true);
  });
  it('rejects mutated scaling, principal scalars, indices and truncated proofs', () => {
    const ctx = context(), r = rationalRing(), a = poly(ctx, r, [1, 0, 1]), b = poly(ctx, r, [-1, 0, 1]);
    const p = subresultants(ctx, r, a, b);
    for (const bad of [
      { ...p, steps: [{ ...p.steps[0], divisor: rational(ctx, 2) }, p.steps[1]] },
      { ...p, steps: [{ ...p.steps[0], negativePrincipal: rational(ctx, -2) }, p.steps[1]] },
      { ...p, indexed: [{ ...p.indexed[0], index: 1 }, p.indexed[1]] },
      { ...p, steps: p.steps.slice(0, 1) }, { ...p, resultant: rational(ctx, -2) },
    ]) expect(() => verifySubresultants(ctx, r, a, b, bad)).toThrow('verification-failed');
  });
  it('works directly in Q[z][x], extracts content and reports specialization degree loss', () => {
    const ctx = context({ work: 100_000_000, allocation: 1_000_000_000 }), z = rationalRing('z'), domain = new PolynomialDomain(z);
    const x = new PolynomialRing(domain, 'x'), t = poly(ctx, z, [0, 1]), one = z.one(ctx);
    const a = x.make(ctx, [one, t, one]), b = x.make(ctx, [t, one]);
    const proof = subresultants(ctx, x, a, b);
    expect(x.equal(ctx, proof.indexed[0].polynomial, minorSubresultant(ctx, x, a, b, 0))).toBe(true);
    expect(() => requireField(domain)).toThrow('domain-mismatch');
    expect(() => polynomialDivide(ctx, x as unknown as PolynomialRing<Polynomial<Rational>>,
      a as unknown as Polynomial<Polynomial<Rational>>, b as unknown as Polynomial<Polynomial<Rational>>)).toThrow('domain-mismatch');
    const content = coefficientContent(ctx, x, x.scale(ctx, a, t));
    expect(z.equal(ctx, content.content, t)).toBe(true);
    expect(x.equal(ctx, content.primitive, a)).toBe(true);
    expect(() => verifyPrimitivePart(ctx, x, x.scale(ctx, a, t), { ...content, content: one })).toThrow('verification-failed');
    expect(() => domain.exactDivide(ctx, one, t)).toThrow('nonexact-division');
    expect(() => domain.exactDivide(ctx, one, z.zero(ctx))).toThrow('division-by-zero');
    expect(coefficientContent(ctx, x, x.zero(ctx)).primitive.coefficients).toEqual([]);
    const c = x.make(ctx, [one, one, t]), d = x.make(ctx, [one, t]);
    const specialized = specializeSubresultants(ctx, x, c, d, subresultants(ctx, x, c, d), rational(ctx, 0), rationalRing('x'));
    expect(specialized.inputDegrees).toEqual([2, 1]);
    expect(specialized.inputs.map(p => [p.originalDegree, p.degree, p.degreeLost])).toEqual([[2, 1, true], [1, 0, true]]);
    expect(specialized.indexed.map(p => p.index)).toEqual([0, 1]);
    expect(specialized.indexed[1].degreeLost).toBe(true);
    // The original Sylvester determinant specializes to zero even though the
    // degree-reduced pair (x+1,1) has resultant one. Preserve that distinction.
    expect(specialized.resultant).toEqual(rational(ctx, 0));
    expect(rationalField.isZero(ctx, specialized.indexed[1].principal)).toBe(true);
  });
});
