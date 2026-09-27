import { describe, expect, it } from 'vitest';
import { decodePolynomial, decodeRational, encodePolynomial, encodeRational } from './exact-wire';
import { rational } from './rational';
import { context, poly, rationalRing } from './test-support';

const wire = (numerator: unknown, denominator: unknown = '1') => ({ version: 1, kind: 'rational', domain: 'Q', value: { numerator, denominator } });
describe('bounded private exact JSON artifacts', () => {
  it('preserves known large integers in JSON and structured clones', () => {
    const c = context(), value = rational(c, '9007199254740993', '9007199254740997');
    const encoded = encodeRational(c, value);
    expect(JSON.stringify(encoded)).toContain('9007199254740993');
    expect(decodeRational(c, JSON.parse(JSON.stringify(encoded)))).toEqual({ numerator: 9007199254740993n, denominator: 9007199254740997n });
    expect(structuredClone(encoded)).toEqual(encoded);
    const r = rationalRing('z'), p = poly(c, r, [9007199254740993n, 0, -7]);
    const decoded = decodePolynomial(c, r, JSON.parse(JSON.stringify(encodePolynomial(c, r, p))));
    expect(decoded.coefficients[0].numerator).toBe(9007199254740993n);
    expect(r.equal(c, decoded, p)).toBe(true);
    expect(decodePolynomial(c, r, encodePolynomial(c, r, r.zero(c))).coefficients).toEqual([]);
  });
  it.each([wire('2', '4'), wire('0', '2'), wire('1', '-2'), wire('-0'), wire('01'), wire('1.0'), wire(9007199254740992), wire('1', '0')])('rejects malformed or noncanonical scalars', input => {
    expect(() => decodeRational(context(), input)).toThrow();
  });
  it('rejects versions, extra fields, accessors, wrong variables and trailing zeros', () => {
    const c = context(), r = rationalRing('z');
    expect(() => decodeRational(c, { ...wire('1'), version: 2 })).toThrowError(/domain-mismatch/);
    expect(() => decodeRational(c, { ...wire('1'), extra: 1 })).toThrowError(/invalid-input/);
    expect(() => decodeRational(c, { ...wire('1'), get value() { throw Error('getter ran'); } })).toThrowError(/wire accessor/);
    const p = { version: 1, kind: 'polynomial', domain: 'Q', variable: 'z', coefficients: [{ numerator: '1', denominator: '1' }, { numerator: '0', denominator: '1' }] };
    expect(() => decodePolynomial(c, r, p)).toThrowError(/trailing zero/);
    expect(() => decodePolynomial(c, rationalRing('x'), p)).toThrowError(/domain-mismatch/);
    expect(() => decodePolynomial(c, r, { ...p, coefficients: new Array(2) })).toThrowError(/wire array/);
    const accessor = new Array(1);
    Object.defineProperty(accessor, 0, { enumerable: true, get() { throw Error('getter ran'); } });
    expect(() => decodePolynomial(c, r, { ...p, coefficients: accessor })).toThrowError(/accessor wire array/);
    const hidden = wire('1'); Object.defineProperty(hidden, 'version', { enumerable: false });
    expect(() => decodeRational(c, hidden)).toThrowError(/nonenumerable/);
    const extra = Object.assign([{ numerator: '1', denominator: '1' }], { extra: true });
    expect(() => decodePolynomial(c, r, { ...p, coefficients: extra })).toThrowError(/extra wire array keys/);
  });
  it('checks sizes before parsing integer strings or coefficient arrays', () => {
    expect(() => decodeRational(context({ integerBits: 8 }), wire('9'.repeat(1000)))).toThrowError(/resource-limit/);
    const input = { version: 1, kind: 'polynomial', domain: 'Q', variable: 'x', coefficients: new Array(10000) };
    expect(() => decodePolynomial(context({ degree: 10 }), rationalRing(), input)).toThrowError(/resource-limit: degree/);
  });
});
