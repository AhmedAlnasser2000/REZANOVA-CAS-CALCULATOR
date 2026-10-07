import { describe, expect, it } from 'vitest';
import { exponentialSetup } from '../../symbolic-engine/integration/core/__tests__/exponential-rational-fixtures';
import { bounds } from '../../symbolic-engine/integration/core/differential-test-support';
import { ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { integrateExponentialRational } from '../../symbolic-engine/integration/core/exponential-rational-decision';
import { requireCanonicalAnswer, validateCanonicalResultDocument, resolveCanonicalResultForConsumer } from '../../result-contract/current';
import { exponentialDecisionResult } from './exponential-result';
import { normalizeExponentialExpression } from '../../symbolic-engine/integration/core/exponential-normalization';
import { elementTree, elementFromTree } from './exponential-math';

describe('checked exponential result projection', () => {
  it.each([{n: [1], d: [1, 1]}, {n: [1], d: [1, 2, 1]}, {n: [0, 1], d: [1, 0, 1]}])('projects primitives $n/$d', ({n, d}) => {
    const s = exponentialSetup(), input = s.v(n, d), decision = integrateExponentialRational(s.ctx, s.F, input, bounds);
    const document = exponentialDecisionResult(s.ctx, s.F, input, decision, bounds);
    expect(document.primary?.kind).toBe('exponential-antiderivative');
    expect(validateCanonicalResultDocument(structuredClone(document)).ok).toBe(true);
    expect(resolveCanonicalResultForConsumer(document, {math: a => a.value})).toMatchObject({ok: false, reason: 'unsupported-answer-kind'});
  });
  it('binds additive exponent constants and retains canceled-family restrictions', () => {
    const s = exponentialSetup([1, 1]), decision = integrateExponentialRational(s.ctx, s.F, s.t, bounds);
    const expression = {kind: 'exponential' as const, value: s.p([0, 0, 1])};
    const sourceInput = {expression: {kind: 'exponential' as const, value: s.p([1, 1])}, restrictions: [{expression, provenance: 'integrand.denominator'}]};
    const source = {owner: s.f, input: sourceInput, normalization: normalizeExponentialExpression(s.ctx, s.f, sourceInput, bounds), bounds};
    const document = requireCanonicalAnswer(exponentialDecisionResult(s.ctx, s.F, s.t, decision, bounds, source), 'exponential-antiderivative');
    expect(JSON.stringify(document.primary.construction.argument.mathJson)).toContain('1');
    expect(document.primary.restrictions.some(r => r.origins.some(o => o.path === 'integrand.denominator'))).toBe(true);
    for (const mutate of [
      (p: typeof document.primary) => {p.construction.generator = p.integrationConstant;},
      (p: typeof document.primary) => {p.fieldPart.mathJson = 'foreign';},
      (p: typeof document.primary) => {p.restrictions[0].origins = [];},
    ]) {const copy = structuredClone(document); mutate(copy.primary); expect(validateCanonicalResultDocument(copy).ok).toBe(false);}
    expect(() => exponentialDecisionResult(s.ctx, s.F, s.F.fromInteger(s.ctx, 0n), decision, bounds)).toThrow();
  });
  it('projects both negative authority categories distinctly from errors', () => {
    const s = exponentialSetup();
    for (const input of [s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)]), s.F.multiply(s.ctx, s.t, s.F.embed(s.ctx, s.p([1], [0, 1])))]) {
      const decision = integrateExponentialRational(s.ctx, s.F, input, bounds);
      const document = requireCanonicalAnswer(exponentialDecisionResult(s.ctx, s.F, input, decision, bounds), 'non-elementary');
      expect(document.outcomeKind).toBe('success');
      expect(['nonconstant-residue', 'laurent-component']).toContain(document.primary.obstruction);
    }
  });
  it('rejects foreign bindings, target changes and exhausted contexts', () => {
    const s = exponentialSetup(), foreign = exponentialSetup(), bindings = new Map([[s.f, 'x'], [s.F, 't']]);
    const tree = elementTree(s.ctx, s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.x)), bindings);
    expect(s.F.equal(s.ctx, elementFromTree(s.ctx, s.F, tree, bindings), s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.x)))).toBe(true);
    expect(() => elementTree(s.ctx, foreign.t, bindings)).toThrow('domain-mismatch');
    const decision = integrateExponentialRational(s.ctx, s.F, s.t, bounds);
    expect(() => exponentialDecisionResult(new ExecutionContext({...s.ctx.limits, work: 0}), s.F, s.t, decision, bounds)).toThrow('resource-limit');
  });
});
it('does not borrow a valid restriction ledger from a different integrand', () => {
  const s = exponentialSetup(), decision = integrateExponentialRational(s.ctx, s.F, s.t, bounds);
  const sourceInput = {expression: {kind: 'exponential' as const, value: s.p([0, 2])}, restrictions: []};
  const source = {owner: s.f, input: sourceInput, normalization: normalizeExponentialExpression(s.ctx, s.f, sourceInput, bounds), bounds};
  expect(() => exponentialDecisionResult(s.ctx, s.F, s.t, decision, bounds, source)).toThrow('source exponent correspondence');
});
it('rejects undefined exact expressions and zero restrictions in current documents', () => {
  const s = exponentialSetup(), decision = integrateExponentialRational(s.ctx, s.F, s.t, bounds);
  const document = requireCanonicalAnswer(exponentialDecisionResult(s.ctx, s.F, s.t, decision, bounds), 'exponential-antiderivative');
  for (const tree of [['Divide', 1, 0], ['Power', 0, 0]] as const) {
    const copy = structuredClone(document);
    copy.primary.fieldPart = {mathJson: [...tree], canonicalLatex: tree[0] === 'Divide' ? '\\frac{1}{0}' : '\\left(0\\right)^{0}'};
    expect(validateCanonicalResultDocument(copy).ok).toBe(false);
  }
  const copy = structuredClone(document);
  copy.primary.restrictions[0].value = {mathJson: {num: '0'}, canonicalLatex: '0'};
  expect(validateCanonicalResultDocument(copy).ok).toBe(false);
});
