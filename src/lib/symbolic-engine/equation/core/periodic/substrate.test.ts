import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { rational } from '../algebra/rational';
import { cyclotomic, eulerPhi } from '../algebraic/cyclotomic';
import { describeSet } from '../decision/test-helpers';
import { angleLinearIsZero, piMultiple } from '../representation/angles';
import { enclose } from '../representation/enclosure';
import { evaluateExact } from '../representation/evaluate';
import { ExpressionStore, type ExprId } from '../representation/expression';
import { writeExpression } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import { normalizeSet, setKey, type Interval, type SolutionSet } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';

function setup() {
  const s = new ExpressionStore(context());
  const q = (n: bigint, d = 1n) => s.number(rational(s.ctx, n, d));
  const pi = s.constant('pi');
  return { s, q, pi, qp: (n: bigint, d = 1n) => s.mul(q(n, d), pi), json: (id: ExprId) => JSON.stringify(writeExpression(s, id)) };
}

group('certified trig enclosures (mpmath, 40 digits)', () => {
  it.each([
    ['sin 1', 'sin', [1n, 1n], '0.8414709848078965066525023216302989996226'],
    ['cos 1', 'cos', [1n, 1n], '0.5403023058681397174009366074429766037323'],
    ['sin 10⁶', 'sin', [1000000n, 1n], '-0.3499935021712929521176524867807714690614'],
    ['cos(−7/3)', 'cos', [-7n, 3n], '-0.6907581397498762927279716947563487870100'],
    ['tan(1/2)', 'tan', [1n, 2n], '0.5463024898437905132551794657802853832976'],
    ['atan 2', 'atan', [2n, 1n], '1.1071487177940905030170654601785370400700'],
    ['asin(1/3)', 'asin', [1n, 3n], '0.3398369094541219370963925133917640663882'],
    ['acos(−2/3)', 'acos', [-2n, 3n], '2.3005239830218629826861183514530721374950'],
    ['asin(99/100)', 'asin', [99n, 100n], '1.4292568534704694004855323346647244271050'],
  ] as const)('%s', (_, fn, [n, d], reference) => {
    const { s, q } = setup();
    const b = enclose(s, s.apply(fn, q(n, d)), 140);
    if (b.kind !== 'bounds') throw new Error(b.kind);
    const [whole, frac] = reference.replace('-', '').split('.'), sign = reference.startsWith('-') ? -1n : 1n;
    const ref = rational(s.ctx, sign * BigInt(whole + frac), 10n ** BigInt(frac.length));
    const ulp = rational(s.ctx, 1n, 10n ** 39n);
    const le = (a: { numerator: bigint; denominator: bigint }, c: { numerator: bigint; denominator: bigint }) => a.numerator * c.denominator <= c.numerator * a.denominator;
    const add = (a: typeof ref, c: typeof ref, k: bigint) => rational(s.ctx, a.numerator * c.denominator + k * c.numerator * a.denominator, a.denominator * c.denominator);
    expect(le(b.lo, add(ref, ulp, 1n)) && le(add(ref, ulp, -1n), b.hi)).toBe(true);
    expect(le(add(b.hi, b.lo, -1n), rational(s.ctx, 1n, 10n ** 40n))).toBe(true);
  });

  it('encloses sin(π/7) and refuses no trig argument', () => {
    const { s, qp } = setup();
    const b = enclose(s, s.sin(qp(1n, 7n)), 128);
    expect(b.kind === 'bounds' && Number(b.lo.numerator * 10n ** 12n / b.lo.denominator)).toBe(433883739117);
  });
});

group('exact trig values and folds', () => {
  it('evaluates sin/cos/tan at π-multiples and arcs of algebraic numbers exactly', () => {
    const { s, q, pi, qp } = setup();
    const text = (id: ExprId) => {
      const e = evaluateExact(s, id, 'real');
      if (e.kind !== 'exact') return e.kind;
      return e.value.kind === 'rational' ? `${e.value.value.numerator}/${e.value.value.denominator}` : `deg ${e.value.root.poly.coefficients.length - 1}`;
    };
    expect(text(s.sin(s.mul(q(1n, 7n), pi)))).toBe('deg 6');
    expect(text(s.sin(s.apply('asin', q(1n, 3n))))).toBe('1/3');
    expect(text(s.cos(s.mul(q(2n), s.apply('atan', q(1n, 2n)))))).toBe('3/5');
    expect(text(s.sin(s.sub(pi, s.apply('asin', q(1n, 3n)))))).toBe('1/3');
    expect(text(s.tan(qp(1n, 2n)))).toBe('undefined');
    expect(text(s.sin(q(1n)))).toBe('not-exact');
    // cos(asin(1/3) + acos(1/4)) = (2√2 − √15)/12, degree 4.
    expect(text(s.cos(s.add(s.apply('asin', q(1n, 3n)), s.apply('acos', q(1n, 4n)))))).toBe('deg 4');
  });

  it('folds special angles, whole periods and special inverse values', () => {
    const { s, q, qp, json } = setup();
    const x = s.symbol('x');
    expect(json(s.sin(qp(5n, 6n)))).toBe('["Rational",1,2]');
    expect(json(s.cos(qp(2n, 3n)))).toBe('["Rational",-1,2]');
    expect(json(s.tan(qp(-1n, 3n)))).toBe('["Multiply",-1,["Power",3,["Rational",1,2]]]');
    expect(json(s.sin(s.add(x, qp(7n, 2n))))).toBe('["Sin",["Add",["Multiply",["Rational",-1,2],"Pi"],"x"]]');
    expect(s.tan(s.add(x, qp(3n)))).toBe(s.tan(x));
    expect(s.cos(s.add(x, qp(2n)))).toBe(s.cos(x));
    expect(json(s.apply('asin', q(-1n, 2n)))).toBe('["Multiply",["Rational",-1,6],"Pi"]');
    expect(json(s.apply('acos', q(-1n, 2n)))).toBe('["Multiply",["Rational",2,3],"Pi"]');
    expect(json(s.tan(qp(1n, 2n)))).toBe('["Tan",["Multiply",["Rational",1,2],"Pi"]]');
  });
});

group('exact angles', () => {
  it('recognizes rational multiples of π through cyclotomic polynomials', () => {
    const { s, q, pi } = setup();
    const m = (id: ExprId) => { const r = piMultiple(s, id); return r ? `${r.numerator}/${r.denominator}` : 'none'; };
    expect(m(s.apply('asin', s.mul(q(1n, 2n), s.sqrt(q(3n)))))).toBe('1/3');
    expect(m(s.mul(q(2n), s.apply('atan', s.add(q(2n), s.sqrt(q(3n))))))).toBe('5/6');
    expect(m(s.apply('atan', s.sub(q(2n), s.sqrt(q(3n)))))).toBe('1/12');
    expect(m(s.sub(pi, s.apply('acos', s.mul(q(-1n, 2n), s.sqrt(q(2n))))))).toBe('1/4');
    expect(m(s.apply('asin', q(1n, 3n)))).toBe('none');
    expect(cyclotomic(s.ctx, 12n).coefficients).toEqual([1n, 0n, -1n, 0n, 1n]);
    expect(eulerPhi(s.ctx, 12n)).toBe(4n);
  });

  it('decides zeros of angle-linear forms exactly', () => {
    const { s, q, qp } = setup();
    const at = (v: bigint, d = 1n) => s.apply('atan', q(v, d));
    expect(angleLinearIsZero(s, s.sub(s.add(at(1n, 2n), at(1n, 3n)), qp(1n, 4n)))).toBe(true);
    expect(angleLinearIsZero(s, s.sub(s.add(at(2n), at(3n)), qp(3n, 4n)))).toBe(true);
    expect(angleLinearIsZero(s, s.add(at(2n), at(3n), qp(1n, 4n)))).toBe(false);
    expect(angleLinearIsZero(s, s.sub(s.add(s.apply('asin', q(1n, 3n)), s.apply('acos', q(1n, 3n))), qp(1n, 2n)))).toBe(true);
    expect(angleLinearIsZero(s, s.sub(s.apply('asin', q(1n, 3n)), q(1n, 3n)))).toBe(false);
  });
});

group('periodic sets: canonical form', () => {
  const full: Interval = { lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false };
  const ev = (id: ExprId) => ({ kind: 'expression', id }) as const;
  const pt = (id: ExprId): Interval => ({ lo: ev(id), hi: ev(id), loClosed: true, hiClosed: true });
  const iv = (a: ExprId, b: ExprId, lc = true, hc = true): Interval => ({ lo: ev(a), hi: ev(b), loClosed: lc, hiClosed: hc });
  const ps = (P: ExprId, components: Interval[], range = full): SolutionSet => ({ kind: 'periodic-set', variables: ['x'], period: ev(P), components, range });

  it('reduces periods, picks principal residues, merges across the window edge and splits orbits', () => {
    const { s, pi, qp } = setup();
    const show = (set: SolutionSet) => describeSet(s, normalizeSet(s, set, 'real'));
    expect(show(ps(qp(2n), [pt(qp(-1n, 2n)), pt(qp(1n, 6n)), pt(qp(1n, 2n)), pt(qp(5n, 6n))])))
      .toBe('{["Multiply",["Rational",1,2],"Pi"]} + ["Multiply",2,"Pi"]ℤ ∪ {["Multiply",["Rational",1,6],"Pi"]} + ["Multiply",["Rational",2,3],"Pi"]ℤ');
    expect(show(ps(qp(2n), [pt(s.integer(0)), pt(pi)]))).toBe('{0} + "Pi"ℤ');
    expect(show(ps(qp(2n), [pt(qp(7n, 6n))]))).toBe('{["Multiply",["Rational",-5,6],"Pi"]} + ["Multiply",2,"Pi"]ℤ');
    expect(show(ps(qp(2n), [iv(qp(-1n), qp(-1n, 2n)), iv(qp(1n, 2n), pi)]))).toBe('[["Multiply",["Rational",1,2],"Pi"], ["Multiply",["Rational",3,2],"Pi"]] + ["Multiply",2,"Pi"]ℤ');
    expect(show(ps(pi, [iv(qp(-1n, 2n), qp(1n, 2n), false, false)]))).toBe('(["Multiply",["Rational",-1,2],"Pi"], ["Multiply",["Rational",1,2],"Pi"]) + "Pi"ℤ');
    expect(show(ps(pi, [iv(s.integer(0), pi, true, false)]))).toBe('(-inf, +inf)');
  });

  it('absorbs contained points, merges commensurable families, validates half-lines and round-trips the wire', () => {
    const { s, pi, qp } = setup();
    const show = (set: SolutionSet) => describeSet(s, normalizeSet(s, set, 'real'));
    const zero = { kind: 'rational', value: rational(s.ctx, 0n) } as const, one = { kind: 'rational', value: rational(s.ctx, 1n) } as const;
    expect(show({ kind: 'union', sets: [{ kind: 'finite', variables: ['x'], points: [[zero], [ev(qp(3n))], [one]] }, ps(pi, [pt(s.integer(0))])] })).toBe('{1} ∪ {0} + "Pi"ℤ');
    expect(show({ kind: 'union', sets: [ps(pi, [pt(qp(1n, 2n))]), ps(qp(2n), [pt(qp(1n, 6n)), pt(qp(5n, 6n))])] }))
      .toBe('{["Multiply",["Rational",1,2],"Pi"]} + ["Multiply",2,"Pi"]ℤ ∪ {["Multiply",["Rational",1,6],"Pi"]} + ["Multiply",["Rational",2,3],"Pi"]ℤ');
    const half = ps(pi, [pt(s.integer(0))], { lo: ev(pi), hi: { kind: 'infinity', sign: 1 }, loClosed: true, hiClosed: false });
    expect(show(half)).toBe('{0} + "Pi"ℤ on ["Pi", +inf)');
    expect(() => normalizeSet(s, ps(pi, [pt(s.integer(0))], { lo: one, hi: { kind: 'infinity', sign: 1 }, loClosed: true, hiClosed: false }), 'real')).toThrow(/half-line/);
    const n = normalizeSet(s, half, 'real');
    const proof = new ProofLogBuilder(relationProblem(s, { domain: 'real', targets: ['x'], relations: [] })).build();
    const back = decodeOutcome(context(), JSON.parse(JSON.stringify(encodeOutcome(s, { kind: 'solved', set: n, proof }))));
    expect(back.outcome.kind === 'solved' && setKey(back.store, normalizeSet(back.store, back.outcome.set, 'real'))).toBe(setKey(s, n));
  });
});
