import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { FormalPrimitiveDomain } from '../../symbolic-engine/integration/core/formal-primitive';
import { rational } from '../../symbolic-engine/integration/core/rational';
import { integrateRational } from '../../symbolic-engine/integration/core/rational-decision';
import { rationalDecisionResult } from './result';
import { validateCanonicalResultDocument, requireCanonicalAnswer, collectCanonicalResultMathValues, resolveCanonicalResultForConsumer } from '../../result-contract/current';
import { readIntegrationPresentation } from '../../result-contract/integration-presentation';

const limits = {work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256};
function fixture(variable = 'x', n = [1n], d = [1n, 0n, 1n]) {
  const ctx = new ExecutionContext(limits), owner = new FormalPrimitiveDomain(variable, 'z');
  const p = (a: bigint[]) => owner.x.make(ctx, a.map(v => rational(ctx, v)));
  const input = owner.fractions.make(ctx, p(n), p(d));
  const decision = integrateRational(ctx, owner, input);
  return {ctx, owner, input, decision};
}
describe('New Integration exact result boundary', () => {
  it('projects root-log sums, preserves conditions and refuses generic reuse', () => {
    const f = fixture(); const doc = rationalDecisionResult(f.ctx, f.owner, f.input, f.decision);
    expect(doc.version).toBe(7); expect(doc.primary?.kind).toBe('rational-antiderivative');
    const read = readIntegrationPresentation(JSON.parse(JSON.stringify(doc)))!;
    expect(read.copy()).toContain('\\sum_'); expect(read.originals).toHaveLength(3);
    expect(collectCanonicalResultMathValues(doc).every(v => v.value.mathJson !== undefined)).toBe(true);
    expect(resolveCanonicalResultForConsumer(doc, {math: a => a.value})).toMatchObject({ok: false, reason: 'unsupported-answer-kind'});
  });
  it('uses typed rational primitives and retains huge integers', () => {
    const f = fixture('x', [900719925474099312345n], [1n]);
    const doc = rationalDecisionResult(f.ctx, f.owner, f.input, f.decision);
    expect(doc.primary?.kind).toBe('rational-antiderivative'); expect(JSON.stringify(doc)).toContain('900719925474099312345');
  });
  it('avoids capture by the variable or constant and rejects mutated binding/conditions', () => {
    const f = fixture('a'); const doc = requireCanonicalAnswer(rationalDecisionResult(f.ctx, f.owner, f.input, f.decision), 'rational-antiderivative');
    expect(doc.primary.terms[0].rootVariable).not.toBe('a');
    for (const change of [
      (v: typeof doc) => {v.primary.terms[0].rootVariable = 'a';},
      (v: typeof doc) => {v.primary.integrationConstant = 'a';},
      (v: typeof doc) => {v.primary.restrictions = v.primary.restrictions.filter(r => r.origins.every(o => o.category !== 'log-norm'));},
      (v: typeof doc) => {v.primary.terms[0].weight.mathJson = 'unbound';},
      (v: typeof doc) => {v.primary.rationalPart.canonicalLatex = '42';},
    ]) {const copy = structuredClone(doc); change(copy); expect(validateCanonicalResultDocument(copy).ok).toBe(false);}
    expect(validateCanonicalResultDocument(doc, {maxBytes: 20}).ok).toBe(false);
  });
  it('reverifies explicit targets and obeys exhausted conversion contexts', () => {
    const f = fixture();
    expect(() => rationalDecisionResult(f.ctx, f.owner, f.owner.fractions.fromInteger(f.ctx, 0n), f.decision)).toThrow();
    expect(() => rationalDecisionResult(new ExecutionContext({...limits, work: 0}), f.owner, f.input, f.decision)).toThrow('resource-limit');
  });
});
