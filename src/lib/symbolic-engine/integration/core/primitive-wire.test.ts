import { expect, it } from 'vitest';
import { context, poly } from './test-support';
import { FormalPrimitiveDomain } from './formal-primitive';
import { decodePrimitive, encodePrimitive } from './primitive-wire';
import { encodePolynomial } from './exact-wire';
import { differentiatePrimitive, verifyPrimitiveDerivative } from './primitive-verification';

function fixture() {
  const ctx = context({ work: 100_000_000, allocation: 1_000_000_000 }), owner = new FormalPrimitiveDomain('x', 'z');
  const term = owner.term(ctx, poly(ctx, owner.z, [-1, 0, 1]), owner.z.one(ctx), owner.arguments.make(ctx, [poly(ctx, owner.z, [2, 1]), owner.z.one(ctx)]));
  const wire = encodePrimitive(ctx, owner.make(ctx, owner.fractions.fromInteger(ctx, 0n), [term]));
  return { ctx, owner, wire, expected: { variable: 'x', residueVariable: 'z' } };
}
it('rejects malformed artifacts, untrusted proof flags and incompatible variables', () => {
  const { ctx, wire, expected } = fixture();
  for (const bad of [null, [], { ...wire, version: 2 }, { ...wire, verified: true }, { ...wire, variable: 'y' },
    { ...wire, terms: [null] }, { ...wire, rationalPart: {} }, { ...wire, terms: new Array(1) }])
    expect(() => decodePrimitive(ctx, bad, expected)).toThrow();
  expect(() => decodePrimitive(ctx, wire, { variable: 'x', residueVariable: 'x' })).toThrow('domain-mismatch');
  const accessor = { ...wire };
  Object.defineProperty(accessor, 'terms', { enumerable: true, get() { throw Error('must not invoke accessor'); } });
  expect(() => decodePrimitive(ctx, accessor, expected)).toThrow('invalid-input');
  const array = [...wire.terms]; Object.defineProperty(array, '0', { enumerable: true, get() { throw Error('must not invoke accessor'); } });
  expect(() => decodePrimitive(ctx, { ...wire, terms: array }, expected)).toThrow('invalid-input');
});
it('rejects noncanonical fractions, unreduced coefficients and trailing zero arguments', () => {
  const { ctx, owner, wire, expected } = fixture();
  const zero = encodePolynomial(ctx, owner.z, owner.z.zero(ctx));
  const badWeight = encodePolynomial(ctx, owner.z, poly(ctx, owner.z, [0, 0, 1]));
  for (const term of [{ ...wire.terms[0], weight: badWeight }, { ...wire.terms[0], argument: [...wire.terms[0].argument, zero] },
    { ...wire.terms[0], argument: [badWeight] }])
    expect(() => decodePrimitive(ctx, { ...wire, terms: [term] }, expected)).toThrow('invalid-input');
  const two = encodePolynomial(ctx, owner.x, poly(ctx, owner.x, [2]));
  expect(() => decodePrimitive(ctx, { ...wire, rationalPart: { numerator: two, denominator: two } }, expected)).toThrow('invalid-input');
  const badScalar = JSON.parse(JSON.stringify(wire));
  badScalar.terms[0].weight.coefficients[0].denominator = '02';
  expect(() => decodePrimitive(ctx, badScalar, expected)).toThrow('invalid-input');
});
it('revalidates square-freeness, component nonvanishing and retained conditions', () => {
  const { ctx, owner, wire, expected } = fixture();
  const repeated = encodePolynomial(ctx, owner.z, poly(ctx, owner.z, [1, -2, 1]));
  expect(() => decodePrimitive(ctx, { ...wire, terms: [{ ...wire.terms[0], modulus: repeated }] }, expected)).toThrow('invalid-input');
  const zeroComponent = encodePolynomial(ctx, owner.z, poly(ctx, owner.z, [-1, 1]));
  expect(() => decodePrimitive(ctx, { ...wire, terms: [{ ...wire.terms[0], argument: [zeroComponent] }] }, expected)).toThrow('invalid-input');
  expect(() => decodePrimitive(ctx, { ...wire, conditions: { ...wire.conditions, logNorms: [] } }, expected)).toThrow('verification-failed');
  expect(() => decodePrimitive(ctx, { ...wire, conditions: { ...wire.conditions,
    logNorms: [encodePolynomial(ctx, owner.x, owner.x.one(ctx))] } }, expected)).toThrow('verification-failed');
});
it('bounds oversized artifacts before decoding their coefficients', () => {
  const { wire, expected } = fixture();
  expect(() => decodePrimitive(context({ allocation: 100 }), { ...wire, terms: Array(1000).fill(wire.terms[0]) }, expected)).toThrow('resource-limit');
  expect(() => decodePrimitive(context(), { ...wire, terms: [{ ...wire.terms[0], argument: Array(1000).fill(wire.terms[0].argument[0]) }] }, expected)).toThrow('resource-limit');
  const huge = JSON.parse(JSON.stringify(wire)); huge.terms[0].weight.coefficients[0].numerator = '1'.repeat(2000);
  expect(() => decodePrimitive(context(), huge, expected)).toThrow('resource-limit');
});
it('replays a purely rational primitive with its denominator condition', () => {
  const ctx = context(), owner = new FormalPrimitiveDomain('x', 'z');
  const candidate = owner.make(ctx, owner.fractions.make(ctx, owner.x.one(ctx), poly(ctx, owner.x, [0, 1])), []);
  const proof = differentiatePrimitive(ctx, candidate);
  verifyPrimitiveDerivative(ctx, candidate, owner.fractions.make(ctx, poly(ctx, owner.x, [-1]), poly(ctx, owner.x, [0, 0, 1])), proof);
  expect(encodePrimitive(ctx, decodePrimitive(ctx, encodePrimitive(ctx, candidate), { variable: 'x', residueVariable: 'z' }))).toEqual(encodePrimitive(ctx, candidate));
});
