import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import { ALGEBRAIC_RING, refineReal, rootsOfIrreducible, type RealRootOf } from '../algebraic/root-of';
import { context } from '../test-support';
import { sha256 } from './digest';
import { evaluateExact, type Evaluation } from './evaluate';
import { ExpressionStore } from './expression';

const store = () => new ExpressionStore(context());
const exactRational = (e: Evaluation) => (e.kind === 'exact' && e.value.kind === 'rational' ? `${e.value.value.numerator}/${e.value.value.denominator}` : e);

describe('digest', () => {
  it('matches FIPS 180-4 test vectors', () => {
    const ctx = context();
    expect(sha256(ctx, '')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256(ctx, 'abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256(ctx, 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    expect(sha256(ctx, 'a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});

describe('hash-consing and canonical forms', () => {
  it('gives equal expressions one id, independent of argument order and nesting', () => {
    const s = store(), x = s.symbol('x'), y = s.symbol('y'), z = s.symbol('z');
    expect(s.add(x, s.mul(s.integer(2), y))).toBe(s.add(s.mul(y, s.integer(2)), x));
    expect(s.add(s.add(x, y), z)).toBe(s.add(x, s.add(y, z)));
    expect(s.node(s.add(s.add(x, y), z))).toMatchObject({ kind: 'add' });
    expect((s.node(s.add(s.add(x, y), z)) as unknown as { args: unknown[] }).args).toHaveLength(3);
    expect(s.mul(x, s.mul(y, z))).toBe(s.mul(s.mul(z, x), y));
    expect(s.add(x, x)).toBe(s.mul(s.integer(2), x));
    expect(s.mul(x, x)).toBe(s.pow(x, s.integer(2)));
    expect(s.mul(s.pow(x, s.integer(-1)), s.pow(x, s.integer(-2)))).toBe(s.pow(x, s.integer(-3)));
  });

  it('folds pure-number arithmetic exactly', () => {
    const s = store();
    expect(s.add(s.fraction(1, 2), s.fraction(1, 3))).toBe(s.fraction(5, 6));
    expect(s.mul(s.integer(9007199254740991), s.integer(3))).toBe(s.integer('27021597764222973'));
    expect(s.pow(s.fraction(2, 3), s.integer(-3))).toBe(s.fraction(27, 8));
    const i = s.constant('i');
    expect(s.mul(i, i)).toBe(s.integer(-1));
    expect(s.pow(i, s.integer(7))).toBe(s.neg(i));
    expect(s.abs(s.integer(-3))).toBe(s.integer(3));
    expect(s.exp(s.integer(0))).toBe(s.integer(1));
    expect(s.constant('e')).toBe(s.exp(s.integer(1)));
    expect(s.pow(s.constant('e'), s.symbol('x'))).toBe(s.exp(s.symbol('x')));
  });

  it('cancels nothing that changes the domain', () => {
    const s = store(), x = s.symbol('x');
    expect(s.node(s.div(x, x)).kind).toBe('mul');
    expect(s.node(s.pow(x, s.integer(0))).kind).toBe('pow');
    expect(s.node(s.log(s.exp(x)))).toMatchObject({ kind: 'apply', fn: 'log' });
    expect(s.node(s.sqrt(s.pow(x, s.integer(2)))).kind).toBe('pow');
    expect(s.node(s.pow(s.pow(x, s.integer(-1)), s.integer(-1))).kind).toBe('pow');
    expect(s.node(s.pow(s.pow(x, s.integer(2)), s.fraction(1, 2))).kind).toBe('pow');
    // A zero coefficient drops a term only when the term is defined everywhere.
    expect(s.sub(x, x)).toBe(s.integer(0));
    const l = s.log(x), zeroLog = s.sub(l, l);
    expect(s.node(zeroLog)).toMatchObject({ kind: 'mul' });
    expect(s.freeSymbols(zeroLog)).toEqual(['x']);
    expect(s.node(s.mul(s.integer(0), s.pow(x, s.integer(-1)))).kind).toBe('mul');
    expect(s.mul(s.integer(0), s.sin(x))).toBe(s.integer(0));
    expect(s.pow(s.integer(0), s.integer(-1))).not.toBe(s.integer(0));
    expect(s.node(s.pow(s.integer(0), s.integer(0))).kind).toBe('pow');
  });

  it('tracks totality, size, height and free symbols', () => {
    const s = store(), x = s.symbol('x'), y = s.symbol('y');
    expect(s.isTotal(s.add(s.sin(x), s.pow(x, s.integer(3)), s.pow(s.integer(2), y)))).toBe(true);
    for (const t of [s.log(x), s.div(s.integer(1), x), s.sqrt(x), s.tan(x), s.asin(x), s.atan(x), s.constant('i'), s.pow(x, s.integer(0))]) expect(s.isTotal(t)).toBe(false);
    const e = s.add(s.mul(x, y), s.sin(x));
    expect(s.freeSymbols(e)).toEqual(['x', 'y']);
    expect(s.size(e)).toBe(6n);
    expect(s.height(e)).toBe(3);
  });

  it('substitutes through the canonical builders', () => {
    const s = store(), x = s.symbol('x'), y = s.symbol('y');
    const e = s.add(s.pow(x, s.integer(2)), y);
    expect(s.substitute(e, new Map([['x', s.integer(3)], ['y', s.integer(-9)]]))).toBe(s.integer(0));
    expect(s.substitute(e, new Map([['y', s.neg(s.pow(x, s.integer(2)))]]))).toBe(s.integer(0));
  });

  it('stores algebraic numbers by canonical identity', () => {
    const s = store(), ctx = s.ctx;
    const [minus, plus] = rootsOfIrreducible(ctx, ALGEBRAIC_RING.fromIntegers(ctx, [-2, 0, 1])) as RealRootOf[];
    const narrow = refineReal(ctx, plus, rational(ctx, 1n, 1000n));
    expect(s.algebraic(narrow)).toBe(s.algebraic(plus));
    expect(s.algebraic(minus)).not.toBe(s.algebraic(plus));
    const three = rootsOfIrreducible(ctx, ALGEBRAIC_RING.fromIntegers(ctx, [-3, 1]))[0];
    expect(s.algebraic(three)).toBe(s.integer(3));
  });
});

describe('deep and large graphs', () => {
  it('builds and traverses a 25-level composition and a 10,000-term sum without recursion', () => {
    const s = store(), x = s.symbol('x');
    let deep = x;
    const fns = ['sin', 'exp', 'log', 'cos', 'atan'] as const;
    for (let i = 0; i < 25; i++) deep = s.apply(fns[i % 5], s.add(deep, s.integer(1)));
    expect(s.height(deep)).toBe(51);
    expect(s.freeSymbols(deep)).toEqual(['x']);
    let veryDeep = x;
    for (let i = 0; i < 20_000; i++) veryDeep = s.sin(veryDeep);
    expect(s.postorder([veryDeep])).toHaveLength(20_001);
    expect(s.substitute(veryDeep, new Map([['x', s.integer(0)]]))).toBe(s.integer(0));
    const terms = Array.from({ length: 10_000 }, (_, i) => s.mul(s.integer(i + 1), s.symbol(`x${i}`)));
    const sum = s.add(...terms);
    expect((s.node(sum) as unknown as { args: unknown[] }).args).toHaveLength(10_000);
    expect(s.add(...[...terms].reverse())).toBe(sum);
    expect(s.freeSymbols(sum)).toHaveLength(10_000);
  });

  it('shares repeated subexpressions: tree size grows exponentially, nodes linearly', () => {
    const s = store();
    let e = s.symbol('x');
    for (let i = 0; i < 200; i++) e = s.mul(s.sin(e), s.cos(e));
    expect(s.size(e)).toBeGreaterThan(2n ** 200n);
    expect(s.postorder([e]).length).toBeLessThan(1000);
  });

  it('stops building with a typed resource stop under a tiny budget', () => {
    const s = new ExpressionStore(context({ work: 2_000 }));
    let caught: unknown;
    try { for (let i = 0; ; i++) s.add(s.symbol('x'), s.integer(i)); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(EquationAlgebraError);
    expect((caught as EquationAlgebraError).stop).toBe('work');
  });

  it('charges a power too large for any budget as an allocation stop', () => {
    const s = store();
    expect(() => s.pow(s.integer(2), s.integer(10n ** 30n))).toThrowError(expect.objectContaining({ stop: 'allocation' }));
  });
});

describe('exact evaluation', () => {
  it('evaluates (√2)² exactly through algebraic arithmetic', () => {
    const s = store();
    expect(exactRational(evaluateExact(s, s.pow(s.sqrt(s.integer(2)), s.integer(2)), 'real'))).toBe('2/1');
    expect(exactRational(evaluateExact(s, s.mul(s.sqrt(s.integer(2)), s.sqrt(s.integer(8))), 'real'))).toBe('4/1');
    const sum = evaluateExact(s, s.add(s.sqrt(s.integer(2)), s.sqrt(s.integer(3))), 'real');
    expect(sum.kind === 'exact' && sum.value.kind === 'algebraic' && sum.value.root.poly.coefficients.join(',')).toBe('1,0,-10,0,1');
  });

  it('handles real and principal roots by domain', () => {
    const s = store(), cube = s.root(s.integer(-8), 3);
    expect(exactRational(evaluateExact(s, cube, 'real'))).toBe('-2/1');
    expect(evaluateExact(s, s.sqrt(s.integer(-4)), 'real').kind).toBe('undefined');
    const i2 = evaluateExact(s, s.sqrt(s.integer(-4)), 'complex');
    expect(i2.kind === 'exact' && i2.value.kind === 'algebraic' && i2.value.root.poly.coefficients.join(',')).toBe('4,0,1');
    expect(evaluateExact(s, cube, 'complex')).toMatchObject({ kind: 'not-exact', reason: 'incomplete-implementation' });
    expect(exactRational(evaluateExact(s, s.pow(s.integer(4), s.fraction(3, 2)), 'real'))).toBe('8/1');
    expect(exactRational(evaluateExact(s, s.abs(s.add(s.integer(3), s.mul(s.integer(4), s.constant('i')))), 'complex'))).toBe('5/1');
  });

  it('reports transcendental, free-symbol and undefined values honestly', () => {
    const s = store(), x = s.symbol('x');
    expect(evaluateExact(s, s.add(s.constant('pi'), s.integer(1)), 'real')).toMatchObject({ kind: 'not-exact', reason: 'transcendental' });
    expect(evaluateExact(s, s.log(s.integer(2)), 'real')).toMatchObject({ kind: 'not-exact', reason: 'transcendental' });
    expect(evaluateExact(s, s.pow(s.integer(2), s.sqrt(s.integer(2))), 'real')).toMatchObject({ kind: 'not-exact', reason: 'transcendental' });
    expect(evaluateExact(s, s.add(x, s.integer(1)), 'real')).toMatchObject({ kind: 'not-exact', reason: 'free-symbol' });
    expect(evaluateExact(s, s.add(x, s.div(s.integer(1), s.integer(0))), 'real').kind).toBe('undefined');
    expect(evaluateExact(s, s.log(s.integer(-1)), 'real').kind).toBe('undefined');
    expect(evaluateExact(s, s.asin(s.integer(2)), 'real').kind).toBe('undefined');
    expect(evaluateExact(s, s.pow(s.integer(0), s.integer(0)), 'real').kind).toBe('undefined');
    expect(exactRational(evaluateExact(s, s.acos(s.add(s.sqrt(s.integer(2)), s.neg(s.sqrt(s.integer(2))))), 'real'))).toMatchObject({ kind: 'not-exact' });
    expect(evaluateExact(s, s.constant('i'), 'real').kind).toBe('undefined');
  });
});
