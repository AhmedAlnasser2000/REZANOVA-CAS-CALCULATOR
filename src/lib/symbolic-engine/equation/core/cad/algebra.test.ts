import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { rational } from '../algebra/rational';
import { realRoots, ALGEBRAIC_RING } from '../algebraic/root-of';
import { ExecutionContext } from '../execution';
import { normalizeValue, type ExactValue } from '../representation/evaluate';
import { ExpressionStore } from '../representation/expression';
import { fiberRoots, lazardPolynomial } from './fiber';
import * as R from './recursive';
import { signAtPoint } from './sign';

// The CAD algebra (EQUATION-SEMIALGEBRAIC1 PR A): recursive polynomials, exact signs at algebraic points, fibres.
const store = () => new ExpressionStore(new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS }));
/** A level-n polynomial from terms [coefficient, e₁, …, eₙ]. */
const P = (ctx: ExecutionContext, n: number, ...ts: number[][]) => R.fromTerms(ctx, ts.map(([c, ...e]) => ({ c: BigInt(c), exps: e })), n);
const q = (ctx: ExecutionContext, a: bigint, b = 1n): ExactValue => ({ kind: 'rational', value: rational(ctx, a, b) });
/** The real roots of an integer polynomial (ascending coefficients) as exact values. */
const roots = (ctx: ExecutionContext, c: number[]) => realRoots(ctx, ALGEBRAIC_RING.make(ctx, c.map(BigInt))).map(r => normalizeValue(r.root));

group('recursive polynomials over ℤ', () => {
  it('multiplies, divides exactly, and takes gcds and resultants', () => {
    const ctx = store().ctx;
    // a = x² + y² − 1, b = y − x (level 2: x = x₁, y = x₂).
    const a = P(ctx, 2, [1, 2, 0], [1, 0, 2], [-1, 0, 0]), b = P(ctx, 2, [1, 0, 1], [-1, 1, 0]);
    const ab = R.multiply(ctx, a, b, 2);
    expect(R.equal(R.divide(ctx, ab, b, 2), a)).toBe(true);
    expect(R.equal(R.gcd(ctx, ab, R.multiply(ctx, b, b, 2), 2), b)).toBe(true);
    // res_y(a, b) = 2x² − 1.
    expect(R.equal(R.resultant(ctx, a, b, 2), P(ctx, 1, [2, 2], [-1, 0]))).toBe(true);
    // disc_y(a) ∝ x² − 1.
    const d = R.primitive(ctx, R.discriminant(ctx, a, 2), 1);
    expect(R.equal(d, P(ctx, 1, [1, 2], [-1, 0]))).toBe(true);
    // A coprime basis of (x² + y² − 1)(y − x)² and y² − x² is {x² + y² − 1, y − x, y + x}.
    const c = R.coprimeBasis(ctx, [R.multiply(ctx, ab, b, 2), P(ctx, 2, [1, 0, 2], [-1, 2, 0])], 2);
    expect(c.map(R.key).sort()).toEqual([a, b, P(ctx, 2, [1, 0, 1], [1, 1, 0])].map(R.key).sort());
  });

  it('takes contents and three-variable resultants', () => {
    const ctx = store().ctx;
    // (x − 1)·(z² + y) at level 3 has content x − 1 in z.
    const f = R.multiply(ctx, P(ctx, 3, [1, 1, 0, 0], [-1, 0, 0, 0]), P(ctx, 3, [1, 0, 0, 2], [1, 0, 1, 0]), 3);
    expect(R.equal(R.content(ctx, f, 3), P(ctx, 2, [1, 1, 0], [-1, 0, 0]))).toBe(true);
    // res_z(x² + y² + z² − 1, z − x − y) = 2x² + 2xy + 2y² − 1.
    const g = R.resultant(ctx, P(ctx, 3, [1, 2, 0, 0], [1, 0, 2, 0], [1, 0, 0, 2], [-1, 0, 0, 0]), P(ctx, 3, [1, 0, 0, 1], [-1, 1, 0, 0], [-1, 0, 1, 0]), 3);
    expect(R.equal(g, P(ctx, 2, [2, 2, 0], [2, 1, 1], [2, 0, 2], [-1, 0, 0]))).toBe(true);
  });
});

group('signs and fibres at algebraic points', () => {
  it('decides signs exactly, zero included', () => {
    const s = store(), ctx = s.ctx;
    const [r2] = roots(ctx, [-2, 0, 1]).slice(1); // √2
    const f = P(ctx, 2, [1, 2, 0], [1, 0, 2], [-4, 0, 0]); // x² + y² − 4 at (√2, √2) is 0
    expect(signAtPoint(ctx, f, 2, [r2, r2])).toBe(0);
    expect(signAtPoint(ctx, f, 2, [r2, q(ctx, 1n)])).toBe(-1);
    expect(signAtPoint(ctx, f, 2, [r2, q(ctx, 3n, 2n)])).toBe(1);
  });

  it('isolates the fibre of a circle over rational and algebraic points', () => {
    const s = store(), ctx = s.ctx;
    const circle = P(ctx, 2, [1, 2, 0], [1, 0, 2], [-1, 0, 0]);
    expect(fiberRoots(s, circle, 2, [q(ctx, 0n)])).toHaveLength(2);
    expect(fiberRoots(s, circle, 2, [q(ctx, 1n)])).toHaveLength(1);
    expect(fiberRoots(s, circle, 2, [q(ctx, 2n)])).toHaveLength(0);
    // Over x = 1/√2 the roots are ±1/√2.
    const [, half] = roots(ctx, [-1, 0, 2]);
    const fr = fiberRoots(s, circle, 2, [half]);
    expect(fr !== 'nullified' && fr.map(v => v.kind)).toEqual(['algebraic', 'algebraic']);
    // y − x over x = 1/√2: the norm (y² − 1/2) has two roots, one of which is the fibre.
    const line = P(ctx, 2, [1, 0, 1], [-1, 1, 0]);
    const lr = fiberRoots(s, line, 2, [half]);
    expect(lr !== 'nullified' && lr.length).toBe(1);
  });

  it('uses the coefficient norm when a conjugate tuple nullifies, and Lazard evaluation over a nullified point', () => {
    const s = store(), ctx = s.ctx;
    const [, r2] = roots(ctx, [-2, 0, 1]);
    // g = (x + y)(z − 1) over (√2, √2): the conjugate tuple (√2, −√2) nullifies it, so the iterated norm is 0.
    const g = P(ctx, 3, [1, 1, 0, 1], [1, 0, 1, 1], [-1, 1, 0, 0], [-1, 0, 1, 0]);
    expect(fiberRoots(s, g, 3, [r2, r2])).toEqual([q(ctx, 1n)]);
    // Over (0, 0) g vanishes identically; its Lazard evaluation is ∂g/∂y = z − 1 (g(0, y, z) = y(z − 1) is not zero).
    expect(fiberRoots(s, g, 3, [q(ctx, 0n), q(ctx, 0n)])).toBe('nullified');
    const l = lazardPolynomial(s, g, 3, [q(ctx, 0n), q(ctx, 0n)]);
    expect(l.orders).toEqual([0, 1]);
    const lr = fiberRoots(s, l.poly, 3, [q(ctx, 0n), q(ctx, 0n)]);
    expect(lr !== 'nullified' && lr).toEqual([q(ctx, 1n)]);
  });
});
