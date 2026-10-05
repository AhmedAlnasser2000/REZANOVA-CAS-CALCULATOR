import { describe, expect, it } from 'vitest';
import { context } from './test-support';
import { DifferentialField } from './differential-field';
import { normalizeExponentialExpression, verifyExponentialNormalization } from './exponential-normalization';
import { constructExponentialBasis, verifyExponentialBasis } from './exponential-normalization-basis';
import type { ExponentialExpression as X, ExponentialNormalizationInput } from './exponential-normalization-types';

const bounds = {towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024};
function fixture() {
  const ctx = context({work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048});
  const q = DifferentialField.rationals(ctx, bounds), owner = DifferentialField.rationalFunctions(ctx, q, 'x', bounds);
  const x = owner.generator(ctx), one = owner.fromInteger(ctx, 1n);
  const c = (n: bigint): X => ({kind: 'rational', value: owner.fromInteger(ctx, n)});
  const exp = (value = x): X => ({kind: 'exponential', value});
  const add = (left: X, right: X): X => ({kind: 'add', left, right});
  const sub = (left: X, right: X): X => ({kind: 'subtract', left, right});
  const mul = (left: X, right: X): X => ({kind: 'multiply', left, right});
  const div = (left: X, right: X): X => ({kind: 'divide', left, right});
  const pow = (value: X, exponent: bigint): X => ({kind: 'power', value, exponent});
  const run = (expression: X, restrictions: ExponentialNormalizationInput['restrictions'] = []) => normalizeExponentialExpression(ctx, owner, {expression, restrictions}, bounds);
  return {ctx, q, owner, x, one, c, exp, add, sub, mul, div, pow, run};
}
describe('checked exponential normalization', () => {
  it('discovers an expanded two-family common factor', () => {
    const {ctx, owner, x, one, c, exp, add, mul, div, pow, run} = fixture();
    const a = exp(), b = exp(owner.multiply(ctx, x, x));
    const numerator = add(add(pow(a, 2n), a), add(mul(a, b), b));
    const proof = run(div(numerator, add(a, b)));
    expect(proof.classification.kind).toBe('exponential');
    if (proof.classification.kind !== 'exponential') throw Error('fixture');
    expect(owner.equal(ctx, proof.classification.argument, x)).toBe(true);
    expect(proof.classification.numerator.map(t => t.power)).toEqual([0n, 1n]);
    expect(proof.classification.numerator.every(t => owner.equal(ctx, t.coefficient, one))).toBe(true);
    expect(proof.restrictions.some(r => r.kind === 'division')).toBe(true);
    expect(run(add(a, c(1n))).classification.kind).toBe('exponential');
  });
  it('cancels an expanded common factor involving three families', () => {
    const {ctx, owner, x, exp, add, mul, div, run} = fixture();
    const a = exp(), b = exp(owner.multiply(ctx, x, x)), c = exp(owner.multiply(ctx, owner.multiply(ctx, x, x), x));
    const result = run(div(add(add(mul(a, a), mul(a, b)), mul(a, c)), add(add(a, b), c)));
    expect(result.classification.kind).toBe('exponential');
    if (result.classification.kind === 'exponential') expect(owner.equal(ctx, result.classification.argument, x)).toBe(true);
  });
  it('resolves rational dependence and retains additive shifts', () => {
    const {ctx, owner, x, one, exp, add, run} = fixture();
    const shifted = owner.add(ctx, x, one), half = owner.exactDivide(ctx, shifted, owner.fromInteger(ctx, 2n));
    const result = run(add(exp(shifted), exp(half)));
    expect(result.classification.kind).toBe('exponential');
    if (result.classification.kind === 'exponential') {
      expect(owner.equal(ctx, result.classification.argument, half)).toBe(true);
      expect(result.classification.numerator.map(t => t.power)).toEqual([1n, 2n]);
    }
    expect(run(add(exp(x), exp(shifted))).classification.kind).toBe('unsupported');
  });
  it('cancels constant exponentials without adopting a constant extension', () => {
    const {ctx, owner, one, exp, sub, add, div, run} = fixture();
    expect(run(exp(one)).classification).toEqual({kind: 'unsupported', reason: 'constant-extension'});
    expect(run(add(exp(), sub(exp(one), exp(one)))).classification.kind).toBe('exponential');
    const rational = run(div(exp(one), exp(one))).classification;
    expect(rational.kind).toBe('rational'); if (rational.kind === 'rational') expect(owner.equal(ctx, rational.value, one)).toBe(true);
  });
  it('removes exponential monomial units across a quotient', () => {
    const {ctx, owner, x, exp, div, run} = fixture();
    const square = owner.multiply(ctx, x, x);
    const result = run(div(exp(owner.add(ctx, x, square)), exp(square))).classification;
    expect(result.kind).toBe('exponential');
    if (result.kind === 'exponential') { expect(owner.equal(ctx, result.argument, x)).toBe(true); expect(result.numerator[0].power).toBe(1n); }
  });
  it('cancels hidden factors with rational-function coefficients', () => {
    const {ctx, owner, x, c, exp, add, mul, div, run} = fixture();
    const a = exp(), b = exp(owner.multiply(ctx, x, x)), coefficient: X = {kind: 'rational', value: owner.inverse(ctx, x)};
    // (a^2/x + a/x + ab + b)/(a/x+b) = a+1.
    const result = run(div(add(add(mul(coefficient, mul(a, a)), mul(coefficient, a)), add(mul(a, b), b)), add(mul(coefficient, a), b)));
    expect(result.classification.kind).toBe('exponential');
    if (result.classification.kind === 'exponential') expect(result.classification.numerator.map(t => t.power)).toEqual([0n, 1n]);
    expect(result.restrictions.filter(r => r.kind === 'rational-denominator')).toHaveLength(3);
    expect(run(add(a, c(1n))).classification.kind).toBe('exponential');
  });
  it('handles inverse orientation and integer powers', () => {
    const {ctx, owner, x, exp, pow, run} = fixture(); const result = run(pow(exp(owner.negate(ctx, x)), 3n)).classification;
    expect(result.kind).toBe('exponential');
    if (result.kind === 'exponential') {
      expect(owner.equal(ctx, result.argument, owner.multiply(ctx, x, owner.fromInteger(ctx, 3n)))).toBe(true);
      expect(result.numerator[0].power).toBe(-1n);
    }
  });
  it('keeps restrictions from canceled rational arguments and explicit ledgers', () => {
    const {ctx, owner, x, exp, sub, run} = fixture();
    const result = run(sub(exp(owner.inverse(ctx, x)), exp(owner.inverse(ctx, x))), [{expression: {kind: 'rational', value: x}, provenance: 'original nested divisor'}]);
    expect(result.classification.kind).toBe('rational');
    expect(result.restrictions.filter(r => r.kind === 'argument-denominator')).toHaveLength(2);
    expect(result.restrictions.at(-1)?.provenance).toBe('original nested divisor');
  });
  it('rejects identically zero divisors using exponential relations', () => {
    const {ctx, owner, x, one, exp, sub, mul, div, pow, c, run} = fixture();
    const zero = sub(exp(owner.add(ctx, x, one)), mul(exp(x), exp(one)));
    expect(() => run(div(c(1n), zero))).toThrow('division-by-zero');
    expect(() => run(pow(zero, 0n))).toThrow('invalid-input');
    expect(() => run(pow(zero, -1n))).toThrow('division-by-zero');
  });
  it('handles empty exponential support and exact large coefficients', () => {
    const {ctx, owner, exp, sub, c, run} = fixture();
    const zero = run(sub(exp(), exp())).classification;
    expect(zero.kind === 'rational' && owner.isZero(ctx, zero.value)).toBe(true);
    const large = run(c(9007199254740993n)).classification;
    expect(large.kind === 'rational' && owner.equal(ctx, large.value, owner.fromInteger(ctx, 9007199254740993n))).toBe(true);
  });
  it('replays evidence and rejects changed exponents, restrictions and node coverage', () => {
    const {ctx, owner, x, one, exp, add, div, c} = fixture();
    const input = {expression: div(c(1n), add(exp(), c(1n))), restrictions: []};
    const proof = normalizeExponentialExpression(ctx, owner, input, bounds);
    verifyExponentialNormalization(ctx, owner, input, proof, bounds);
    expect(() => verifyExponentialNormalization(ctx, owner, input, {...proof, steps: proof.steps.slice(1)}, bounds)).toThrow('coverage');
    expect(() => verifyExponentialNormalization(ctx, owner, input, {...proof, restrictions: []}, bounds)).toThrow('coverage');
    if (proof.classification.kind !== 'exponential') throw Error('fixture');
    const classification = proof.classification;
    expect(() => verifyExponentialNormalization(ctx, owner, input, {...proof,
      classification: {...classification, argument: owner.add(ctx, x, one)}}, bounds)).toThrow('exponent');
  });
  it('does not cache mutable evidence or accept a forged ring after a successful proof', () => {
    const {ctx, owner, exp} = fixture(), input = {expression: exp(), restrictions: []};
    const proof = normalizeExponentialExpression(ctx, owner, input, bounds);
    const mutable = {...proof, restrictions: [...proof.restrictions]};
    verifyExponentialNormalization(ctx, owner, input, mutable, bounds); mutable.restrictions.length = 0;
    expect(() => verifyExponentialNormalization(ctx, owner, input, mutable, bounds)).toThrow('coverage');
    const forged = Object.create(Object.getPrototypeOf(proof.ring));
    expect(() => verifyExponentialNormalization(ctx, owner, input, {...proof, ring: forged}, bounds)).toThrow('ring owner');
  });
  it('rejects mutated basis relations and elimination witnesses', () => {
    const {ctx, owner, x} = fixture(), args = [x, owner.multiply(ctx, x, owner.fromInteger(ctx, 2n))];
    const basis = constructExponentialBasis(ctx, owner, args);
    const coordinates = basis.coordinates.map(c => [...c]); coordinates[1][1] += 1n;
    expect(() => verifyExponentialBasis(ctx, owner, args, {...basis, coordinates})).toThrow('coordinate');
    expect(() => verifyExponentialBasis(ctx, owner, args, {...basis, elimination: {...basis.elimination, rank: 0}})).toThrow();
  });
  it('rejects foreign owners and cyclic source graphs', () => {
    const {ctx, owner, exp} = fixture(), foreign = fixture();
    expect(() => normalizeExponentialExpression(ctx, owner, {expression: {kind: 'rational', value: foreign.x}, restrictions: []}, bounds)).toThrow('domain-mismatch');
    const cycle: {kind: 'negate'; value: X} = {kind: 'negate', value: exp()}; cycle.value = cycle;
    expect(() => normalizeExponentialExpression(ctx, owner, {expression: cycle, restrictions: []}, bounds)).toThrow('cyclic');
  });
  it('enforces traversal, work, allocation, bit and degree limits', () => {
    const {ctx, owner, exp, pow} = fixture(), input = {expression: pow(exp(), 2n), restrictions: []};
    expect(() => normalizeExponentialExpression(ctx, owner, input, {...bounds, artifactNodes: 1})).toThrow('traversal');
    for (const limits of [{work: 0}, {allocation: 0}, {integerBits: 1}, {degree: 0}]) {
      expect(() => normalizeExponentialExpression(context(limits), owner, input, bounds)).toThrow('resource-limit');
    }
  });
});
