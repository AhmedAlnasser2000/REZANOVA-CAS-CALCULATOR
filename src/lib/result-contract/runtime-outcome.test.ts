import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { canonicalMathValue } from './producer';
import { buildCanonicalResultDocumentFromProducer } from './producer';
import {
  CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS,
  requireCanonicalRuntimeOutcome,
  validateCanonicalRuntimeOutcome,
} from './runtime-outcome';

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
