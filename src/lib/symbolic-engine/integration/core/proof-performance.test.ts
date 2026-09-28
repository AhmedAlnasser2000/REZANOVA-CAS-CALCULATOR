import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { context, poly } from './test-support';
import { ScopedProof } from './scoped-proof';
import { SharedDenominator } from './shared-denominator';
import { FormalPrimitiveDomain } from './formal-primitive';
import { integrateRational, verifyRationalDecision } from './rational-decision';
import { decodeRationalDecision, encodeRationalDecision } from './rational-decision-wire';
import { verifyRootLogDerivativeWithin } from './primitive-verification-internal';
import { verifyPrimitiveDerivative } from './primitive-verification';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import { verifyRationalTrace } from './rational-proof-arithmetic';
import { quotientTrace, verifyQuotientTrace } from './quotient-trace';
import * as hermite from './hermite-reduction';
import * as lrt from './lrt-reduction';
import * as prs from './subresultant';

const profile = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
const run = () => context(profile);
function fixture() {
  const c = run(), owner = new FormalPrimitiveDomain('x','z');
  const input = owner.fractions.make(c, poly(c, owner.x, [1]), poly(c, owner.x, [1,0,1]));
  return { c, owner, input, decision: integrateRational(c, owner, input) };
}

describe('operation-local proof authority', () => {
  it('keys successes by verifier, owner, inputs, evidence and target; all new operations start cold', () => {
    const c = run(), cache = new ScopedProof(), keys = Array.from({ length: 4 }, () => Object.freeze({}));
    let checks = 0; const verify = () => { checks++; };
    c.operation(() => {
      cache.check(c, keys, verify); cache.check(c, keys, verify); expect(checks).toBe(1);
      for (let i = 0; i < keys.length; i++) cache.check(c, keys.map((v,j) => i === j ? Object.freeze({}) : v), verify);
      expect(checks).toBe(5);
      new ScopedProof().check(c, keys, verify); expect(checks).toBe(6);
    });
    c.operation(() => cache.check(c, keys, verify)); expect(checks).toBe(7);
  });
  it('never trusts failed checks or shallow-frozen evidence with mutable children', () => {
    const c = run(), cache = new ScopedProof(), nested = { valid: true }, evidence = Object.freeze({ nested });
    let checks = 0; const verify = () => { checks++; if (!nested.valid) throw new Error('bad evidence'); };
    c.operation(() => {
      cache.check(c, [evidence], verify); nested.valid = false;
      expect(() => cache.check(c, [evidence], verify)).toThrow('bad evidence'); expect(checks).toBe(2);
      const immutable = Object.freeze({});
      expect(() => cache.check(c, [immutable], () => { throw new Error('bad proof'); })).toThrow('bad proof');
      cache.check(c, [immutable], () => { checks++; }); expect(checks).toBe(3);
    });
    expect(Object.isFrozen(nested)).toBe(false);
  });
  it('does not inspect accessors or trust hidden and inherited evidence', () => {
    const c = run(), cache = new ScopedProof(); let checks = 0;
    const getter = Object.freeze(Object.defineProperty({}, 'x', { get() { throw new Error('getter invoked'); } }));
    const inherited = Object.freeze(Object.create({ x: 1 }));
    c.operation(() => { for (const value of [getter, inherited]) for (let i=0;i<2;i++) cache.check(c, [value], () => { checks++; }); });
    expect(checks).toBe(4);
  });
  it('checks liveness on hits and discards authority on failure', () => {
    for (const resource of ['work','allocation'] as const) {
      const c = run(), cache = new ScopedProof(), key = Object.freeze({});
      c.operation(() => {
        cache.check(c, [key], () => {});
        if (resource === 'work') c.tick(c.limits.work-c.usage.work);
        else { c.allocate(c.limits.allocation-c.usage.allocation); expect(() => c.allocate(1)).toThrow(/resource-limit/); }
        expect(() => cache.check(c, [key], () => {})).toThrow(/resource-limit/);
      });
      expect(c.operationToken).toBeUndefined();
    }
  });
  it('rejects changed inverse witnesses and weights after a successful check', () => {
    const { c, owner, decision } = fixture(), term = decision.primitive.terms[0], original = decision.derivative.terms[0];
    if (original.inverse.kind !== 'unit') throw new Error('unit fixture required');
    const inverse = { ...original.inverse }, proof = Object.freeze({ ...original, inverse });
    c.operation(() => {
      verifyRootLogDerivativeWithin(c, owner, term, proof);
      inverse.inverse = original.algebra.fromInteger(c, 0n);
      expect(() => verifyRootLogDerivativeWithin(c, owner, term, proof)).toThrow(/verification-failed/);
      verifyRootLogDerivativeWithin(c, owner, term, original);
      const changed = owner.term(c, term.modulus, owner.z.zero(c), term.argument);
      expect(() => verifyRootLogDerivativeWithin(c, owner, changed, original)).toThrow(/verification-failed/);
    });
  });
  it('rechecks mutable real certificates within an operation and public calls with the same context', () => {
    const { c, owner, input, decision } = fixture(), original = decision.derivative.terms[0];
    const columns = [...original.trace.columns];
    const proof = Object.freeze({ ...original, trace: Object.freeze({ ...original.trace, columns }) });
    c.operation(() => {
      verifyRootLogDerivativeWithin(c, owner, decision.primitive.terms[0], proof);
      columns[0] = owner.residues.zero(c);
      expect(() => verifyRootLogDerivativeWithin(c, owner, decision.primitive.terms[0], proof)).toThrow(/verification-failed/);
    });
    const before = c.usage.work; verifyRationalDecision(c, owner, input, decision); const first = c.usage.work-before;
    const again = c.usage.work; verifyRationalDecision(c, owner, input, decision); expect(c.usage.work-again).toBe(first);
    expect(() => verifyPrimitiveDerivative(c, decision.primitive, owner.fractions.fromInteger(c, 0n), decision.derivative)).toThrow(/verification-failed/);
    expect(() => verifyRationalDecision(c, new FormalPrimitiveDomain('x','z'), input, decision)).toThrow(/domain-mismatch/);
    expect(() => verifyRationalDecision(c, owner, input, { ...decision, conditions: { ...decision.conditions, logNorms: [] } })).toThrow(/verification-failed/);
  });
});

describe('checked common denominators', () => {
  it('checks conversion, cancellation and rejects changed numerators and denominators', () => {
    const c = run(), owner = new FormalPrimitiveDomain('x','z'), a = new SharedDenominator(c, owner.residues);
    const fraction = (n: number[], d: number[]) => owner.fractions.make(c, poly(c, owner.x, n), poly(c, owner.x, d));
    const p = owner.residues.make(c, [fraction([1],[0,1]), fraction([1],[1,1])]);
    const v = a.view(p); a.verifyView(p, v);
    expect(owner.x.equal(c, v.denominator, poly(c, owner.x, [0,1,1]))).toBe(true);
    expect(a.equal(a.subtract(v,v),a.integer(0n))).toBe(true);
    expect(() => a.verifyView(p, { ...v, numerator: a.ring.zero(c) })).toThrow(/verification-failed/);
    expect(() => a.verifyView(p, { ...v, denominator: owner.x.zero(c) })).toThrow(/verification-failed/);
  });
  it('compares cleared trace checking to the general checker on a reducible modulus', () => {
    const c = run(), owner = new FormalPrimitiveDomain('x','z'), arithmetic = new SharedDenominator(c, owner.residues);
    const q = owner.liftResidue(c, poly(c, owner.z, [-1,0,1])), algebra = new SquareFreeQuotientAlgebra(c, owner.residues, q);
    const coefficient = owner.fractions.make(c, poly(c, owner.x, [1]), poly(c, owner.x, [0,1]));
    const value = algebra.make(c, owner.residues.make(c, [coefficient, coefficient]));
    const proof = quotientTrace(c, algebra, value); verifyQuotientTrace(c, algebra, value, proof);
    verifyRationalTrace(c, arithmetic, algebra, value, proof);
    expect(arithmetic.zeroModulo(arithmetic.view(q), arithmetic.modulus(q))).toBe(true);
    const sums = arithmetic.newtonSums(q); expect(arithmetic.newtonSums(q)).toBe(sums);
    expect(arithmetic.equal(sums[0],arithmetic.integer(2n))).toBe(true);
    expect(arithmetic.equal(sums[1],arithmetic.integer(0n))).toBe(true);
    expect(() => verifyRationalTrace(c, arithmetic, algebra, value, { ...proof, trace: owner.fractions.fromInteger(c,0n) })).toThrow(/verification-failed/);
    const changed = new SquareFreeQuotientAlgebra(c, owner.residues, owner.liftResidue(c, poly(c, owner.z, [1,0,1])));
    expect(() => verifyRationalTrace(c, arithmetic, changed, value, proof)).toThrow(/domain-mismatch/);
  });
  it('replays an unchanged baseline version-1 quintic artifact without integration producers', () => {
    const wire = JSON.parse(readFileSync(new URL('./__tests__/fixtures/rational-decision-v1-3a96622c.json', import.meta.url), 'utf8'));
    const c = run(), owner = new FormalPrimitiveDomain('x','z');
    const input = owner.fractions.make(c, poly(c, owner.x, [1]), poly(c, owner.x, [-1,-1,0,0,0,1]));
    const spies = [vi.spyOn(hermite,'hermiteReduce'), vi.spyOn(lrt,'lrtReduce'), vi.spyOn(prs,'subresultants')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer called'); });
    try {
      const restored = decodeRationalDecision(c, owner, input, wire);
      expect(encodeRationalDecision(c, owner, restored)).toEqual(wire);
      const before = c.usage.work; decodeRationalDecision(c, owner, input, wire); const first = c.usage.work-before;
      const again = c.usage.work; decodeRationalDecision(c, owner, input, wire); expect(c.usage.work-again).toBe(first);
    } finally { for (const spy of spies) spy.mockRestore(); }
  }, 30000);
});
