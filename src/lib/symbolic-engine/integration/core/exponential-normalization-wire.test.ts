import { afterEach, describe, expect, it, vi } from 'vitest';
import { context } from './test-support';
import { DifferentialField } from './differential-field';
import * as producer from './exponential-normalization';
import * as gcd from './multivariate-gcd';
import * as basis from './exponential-normalization-basis';
import { encodeExponentialNormalization, decodeExponentialNormalization } from './exponential-normalization-wire';
import type { ExponentialExpression as X, ExponentialNormalizationInput } from './exponential-normalization-types';

const bounds = {towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024};
function setup(kind: 'expanded' | 'rational' | 'unsupported' = 'expanded') {
  const ctx = context({work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048});
  const q = DifferentialField.rationals(ctx, bounds), owner = DifferentialField.rationalFunctions(ctx, q, 'x', bounds);
  const x = owner.generator(ctx), a: X = {kind: 'exponential', value: x};
  const b: X = {kind: 'exponential', value: owner.multiply(ctx, x, x)};
  const add = (left: X, right: X): X => ({kind: 'add', left, right});
  const mul = (left: X, right: X): X => ({kind: 'multiply', left, right});
  const expression: X = kind === 'expanded' ? {kind: 'divide', left: add(add(mul(a, a), a), add(mul(a, b), b)), right: add(a, b)}
    : kind === 'unsupported' ? add(a, b) : {kind: 'subtract', left: a, right: a};
  const input: ExponentialNormalizationInput = {expression, restrictions: []};
  const proof = producer.normalizeExponentialExpression(ctx, owner, input, bounds);
  const wire = encodeExponentialNormalization(ctx, owner, input, proof, bounds);
  return {ctx, owner, input, proof, wire};
}
afterEach(() => vi.restoreAllMocks());
describe('exponential normalization artifacts', () => {
  it.each(['expanded', 'rational', 'unsupported'] as const)('replays %s with all normalization searches disabled', kind => {
    const {ctx, owner, input, proof, wire} = setup(kind);
    vi.spyOn(producer, 'normalizeExponentialExpression').mockImplementation(() => { throw Error('producer called'); });
    vi.spyOn(gcd, 'multivariateGcd').mockImplementation(() => { throw Error('GCD search called'); });
    vi.spyOn(basis, 'constructExponentialBasis').mockImplementation(() => { throw Error('basis search called'); });
    const result = decodeExponentialNormalization(ctx, owner, input, JSON.parse(JSON.stringify(wire)), bounds);
    expect(result.ring).not.toBe(proof.ring); expect(result.classification.kind).toBe(proof.classification.kind);
    expect(result.restrictions.map(r => r.kind)).toEqual(proof.restrictions.map(r => r.kind));
  });
  it('rejects a different original request even when the normalized answer is identical', () => {
    const {ctx, owner, input, wire} = setup('rational');
    const changed: ExponentialNormalizationInput = {...input, expression: {kind: 'rational', value: owner.fromInteger(ctx, 0n)}};
    expect(() => decodeExponentialNormalization(ctx, owner, changed, wire, bounds)).toThrow('input coverage');
  });
  it('rejects altered provenance, node coverage and noncanonical integer strings', () => {
    const {ctx, owner, input, wire} = setup();
    const raw = JSON.parse(JSON.stringify(wire)); raw.evidence.restrictions[0].provenance = 'forged';
    expect(() => decodeExponentialNormalization(ctx, owner, input, raw, bounds)).toThrow('restriction');
    const truncated = JSON.parse(JSON.stringify(wire)); truncated.evidence.steps.pop();
    expect(() => decodeExponentialNormalization(ctx, owner, input, truncated, bounds)).toThrow('coverage');
    const noncanonical = JSON.parse(JSON.stringify(wire)); noncanonical.evidence.basis.scales[0] = '01';
    expect(() => decodeExponentialNormalization(ctx, owner, input, noncanonical, bounds)).toThrow('canonical integer');
  });
  it('rejects malformed data before nested replay or getters execute', () => {
    const {ctx, owner, input, wire} = setup('rational'); const getter = vi.fn(() => 1);
    const malformed = {...wire as object}; Object.defineProperty(malformed, 'bad', {enumerable: true, get: getter});
    expect(() => decodeExponentialNormalization(ctx, owner, input, malformed, bounds)).toThrow('accessor'); expect(getter).not.toHaveBeenCalled();
    expect(() => decodeExponentialNormalization(ctx, owner, input, {...wire as object, arity: 999999999}, bounds)).toThrow('arity');
    expect(() => decodeExponentialNormalization(ctx, owner, input, wire, {...bounds, artifactBytes: 128})).toThrow('bytes');
  });
  it('uses fresh replay state and caller limits after successful encoding', () => {
    const {owner, input, wire} = setup('rational');
    expect(() => decodeExponentialNormalization(context({work: 1}), owner, input, wire, bounds)).toThrow('work');
    expect(() => decodeExponentialNormalization(context({allocation: 0}), owner, input, wire, bounds)).toThrow('allocation');
  });
});
