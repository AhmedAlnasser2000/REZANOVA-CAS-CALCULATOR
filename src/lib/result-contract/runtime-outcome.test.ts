import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { canonicalMathValue } from './producer';
import { buildCanonicalResultDocumentFromProducer } from './producer';
import {
  CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS,
  createCanonicalRuntimeResult,
  requireCanonicalRuntimeOutcome,
  retitleCanonicalRuntimeOutcome,
  validateCanonicalRuntimeOutcome,
} from './runtime-outcome';
import { buildCanonicalResultDocumentV2 } from './producer-v2';
import { standardV2MathValue } from '../../test-utils/canonical-result-v2-fixture';

function successOutcome(): CanonicalRuntimeOutcome {
  return {
    kind: 'success',
    canonicalResult: buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Calculate',
      primaryMath: canonicalMathValue('4', 4),
      warnings: [],
    }),
    actions: [{
      kind: 'send',
      target: 'equation',
      math: canonicalMathValue('x=4', ['Equal', 'x', 4]),
    }],
    runtimeAdvisories: {
      stopReason: { kind: 'planner-hard-stop', source: 'planner' },
    },
  };
}

describe('canonical runtime outcome contract', () => {
  it('round-trips canonical results, math-valued actions, and advisories through structured clone', () => {
    const cloned = structuredClone(successOutcome());
    const validation = validateCanonicalRuntimeOutcome(cloned);

    expect(validation).toMatchObject({ ok: true });
    if (!validation.ok) throw new Error(validation.failure.message);
    expect(validation.validated.value).toEqual(cloned);
    expect(validation.validated.nodeCount).toBeGreaterThan(1);
    expect(validation.validated.byteLength).toBeGreaterThan(1);
  });

  it('preserves prompt control flow without requiring a result document', () => {
    expect(requireCanonicalRuntimeOutcome({
      kind: 'prompt',
      title: 'Equation',
      message: 'Open Equation mode?',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    })).toEqual({
      kind: 'prompt',
      title: 'Equation',
      message: 'Open Equation mode?',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    });
  });

  it('accepts live V2 runtime results and preserves their version through retitling', () => {
    const one = standardV2MathValue('1', 1);
    const document = buildCanonicalResultDocumentV2({
      outcomeKind: 'success',
      title: 'Typed result',
      primary: { kind: 'math', value: one },
      warnings: [],
    });
    const outcome = createCanonicalRuntimeResult(document, {
      actions: [{ version: 2, kind: 'send', target: 'equation', math: one }],
    });

    expect(requireCanonicalRuntimeOutcome(structuredClone(outcome))).toEqual(outcome);
    expect(retitleCanonicalRuntimeOutcome(outcome, 'Retitled')).toMatchObject({
      kind: 'success',
      canonicalResult: { version: 2, title: 'Retitled' },
      actions: [{ version: 2, math: { canonicalLatex: '1', mathJson: 1 } }],
    });
  });

  it('rejects action/document version mismatches through the live validator', () => {
    const one = standardV2MathValue('1', 1);
    const document = buildCanonicalResultDocumentV2({
      outcomeKind: 'success',
      title: 'Typed result',
      primary: { kind: 'math', value: one },
      warnings: [],
    });
    expect(validateCanonicalRuntimeOutcome({
      kind: 'success',
      canonicalResult: document,
      actions: [{ kind: 'send', target: 'equation', math: one }],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'action-version-mismatch', path: '$.actions[0].version' },
    });
  });

  it('rejects document-kind mismatch and free-standing action LaTeX', () => {
    expect(validateCanonicalRuntimeOutcome({
      ...successOutcome(),
      kind: 'error',
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-outcome', path: '$.kind' },
    });
    expect(validateCanonicalRuntimeOutcome({
      ...successOutcome(),
      actions: [{ kind: 'send', target: 'equation', latex: 'x=4' }],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-action', path: '$.actions[0]' },
    });
  });

  it('rejects invalid action MathJSON, undeclared fields, and action-count overflow', () => {
    expect(validateCanonicalRuntimeOutcome({
      ...successOutcome(),
      actions: [{
        kind: 'send',
        target: 'equation',
        math: { canonicalLatex: 'x=4', mathJson: () => 4 },
      }],
    })).toMatchObject({ ok: false });
    expect(validateCanonicalRuntimeOutcome({
      ...successOutcome(),
      displayLatex: '4',
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-outcome' },
    });
    expect(validateCanonicalRuntimeOutcome({
      ...successOutcome(),
      actions: Array.from({ length: CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS + 1 }, () => ({
        kind: 'send',
        target: 'equation',
        math: { canonicalLatex: 'x=4' },
      })),
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-action', path: '$.actions' },
    });
  });

  it('fails closed on cyclic or non-plain worker payloads', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(validateCanonicalRuntimeOutcome(cyclic)).toMatchObject({
      ok: false,
      failure: { reason: 'cyclic-value' },
    });
    expect(validateCanonicalRuntimeOutcome(new (class RuntimePayload {})())).toMatchObject({
      ok: false,
      failure: { reason: 'non-plain-object' },
    });
  });
});
