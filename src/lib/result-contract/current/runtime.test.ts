import { describe, expect, it } from 'vitest';
import { buildCanonicalResultDocument } from './index';
import { validateCanonicalRuntimeVersionedResultOutcome } from '../runtime-outcome-versioned';
import { resolveCanonicalResultForConsumer } from '../consumer';
import { createCanonicalRuntimeResult } from '../runtime-outcome';
import { historyEntrySchema } from '../../app-state/schemas';
import type { CanonicalMathValue } from '../../../types/calculator/canonical-result-common';
import { exactIntegrationMathLatex } from './integration-schema';

const math = { canonicalLatex: '2', mathJson: 2 };
const document = () => buildCanonicalResultDocument({ outcomeKind: 'success', title: 'Exact',
  primary: { kind: 'math', value: math }, warnings: [] });

describe('current contract runtime boundary', () => {
  it('preserves structured answers and current actions across structured clone', () => {
    const result = createCanonicalRuntimeResult(document(), { actions: [{ version: 7, kind: 'send', target: 'equation', math }] });
    const clone = structuredClone(result);
    expect(clone.actions).toHaveLength(1);
    expect(validateCanonicalRuntimeVersionedResultOutcome(clone)).toMatchObject({ ok: true });
    expect(resolveCanonicalResultForConsumer(clone)).toMatchObject({ ok: true, sourceVersion: 7,
      semantics: { primary: { kind: 'math', value: math } } });
    expect(historyEntrySchema.safeParse({ id: 'current', mode: 'calculate', inputLatex: '1+1',
      timestamp: '2026-10-06T00:00:00.000Z', resultDocument: clone.canonicalResult }).success).toBe(true);
  });
  it('rejects unproved action math, obsolete action versions and contradictory outcome kinds', () => {
    const result = { kind: 'success', canonicalResult: document() };
    for (const action of [
      { version: 7, kind: 'send', target: 'equation', math: { canonicalLatex: '2' } },
      { version: 2, kind: 'send', target: 'equation', math },
      { version: 7, kind: 'send', target: 'invalid', math },
    ]) expect(validateCanonicalRuntimeVersionedResultOutcome({ ...result, actions: [action] }).ok).toBe(false);
    expect(validateCanonicalRuntimeVersionedResultOutcome({ ...result, kind: 'error' }).ok).toBe(false);
  });
  it('does not silently lose restrictions in generic answer reuse or actions', () => {
    const value = buildCanonicalResultDocument({ outcomeKind: 'success', title: 'Restricted',
      primary: { kind: 'math', value: math }, warnings: [], integrationRestrictions: {
        variable: 'x', entries: [{ kind: 'nonzero', origins: [{ category: 'source', path: 'input.divisor' }], value: { canonicalLatex: 'x', mathJson: 'x' } }],
      } });
    const result = createCanonicalRuntimeResult(value);
    expect(resolveCanonicalResultForConsumer(result)).toMatchObject({ ok: false,
      failure: { reason: 'unsupported-semantics' } });
    expect(validateCanonicalRuntimeVersionedResultOutcome({ ...result,
      actions: [{ version: 7, kind: 'send', target: 'calculate', math }] }).ok).toBe(false);
  });

  it('keeps formal root bindings intact and rejects ordinary consumer/action flattening', () => {
    const m = (mathJson: CanonicalMathValue['mathJson']): CanonicalMathValue => ({mathJson, canonicalLatex: exactIntegrationMathLatex(mathJson)});
    const norm = m(['Add', ['Power', 'x', 2], 1]);
    const value = buildCanonicalResultDocument({outcomeKind: 'success', title: 'Primitive', warnings: [],
      primary: {kind: 'rational-antiderivative', semantics: 'formal-local-complex', variable: 'x', integrationConstant: 'C',
        rationalPart: m(0), terms: [{rootVariable: 'a',
          modulus: m(['Add', ['Rational', 1, 4], ['Power', 'a', 2]]), weight: m('a'),
          argument: m(['Add', 'x', ['Multiply', 2, 'a']]), norm}],
        restrictions: [{kind: 'nonzero', value: norm, origins: [{category: 'log-norm', path: 'log.0'}]}],
      }});
    const result = structuredClone(createCanonicalRuntimeResult(value));
    expect(validateCanonicalRuntimeVersionedResultOutcome(result)).toMatchObject({ok: true});
    expect(result.canonicalResult).toEqual(value);
    expect(resolveCanonicalResultForConsumer(result)).toMatchObject({ok: false, failure: {reason: 'unsupported-semantics'}});
    expect(validateCanonicalRuntimeVersionedResultOutcome({...result,
      actions: [{version: 7, kind: 'send', target: 'calculate', math}]}).ok).toBe(false);
  });
});
