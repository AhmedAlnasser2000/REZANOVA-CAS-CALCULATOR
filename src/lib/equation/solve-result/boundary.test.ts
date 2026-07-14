import { describe, expect, it } from 'vitest';
import type { ResultProducerDraft } from '../../../types/calculator';
import {
  buildEquationCancelledOutcomeBoundary,
  buildEquationOutcomeBoundaryFromProducer,
  buildEquationOutcomeBoundaryFromProducerOrThrow,
  readEquationOutcomeBoundary,
  validateEquationOutcomeBoundary,
  validateEquationResultOutcomeBoundary,
} from './boundary';
import { createEquationResultOutcome } from './producer';

describe('Equation outcome boundary', () => {
  it('keeps canonical result truth and transient runtime policy separate', () => {
    const outcome: ResultProducerDraft = createEquationResultOutcome({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      warnings: [],
      runtimeAdvisories: {
        stopReason: undefined,
        equationNumericSolve: { kind: 'manual-only' },
      },
    });

    const boundary = buildEquationOutcomeBoundaryFromProducerOrThrow(outcome);
    expect(boundary.result.document.primaryMath?.canonicalLatex).toBe('x=1');
    expect(boundary.result.document).not.toHaveProperty('runtimeAdvisories');
    expect(boundary.runtimeAdvisories).toEqual({
      equationNumericSolve: { kind: 'manual-only' },
    });
    expect(structuredClone(boundary)).toEqual(boundary);
    expect(validateEquationResultOutcomeBoundary(boundary)).toMatchObject({ ok: true });

    const restored = readEquationOutcomeBoundary(boundary);
    expect(restored).toMatchObject({
      ...outcome,
      runtimeAdvisories: { equationNumericSolve: { kind: 'manual-only' } },
    });
    expect(restored.kind).toBe('success');
    expect(restored.kind === 'success' ? restored.canonicalResult : undefined).toEqual(
      boundary.result.document,
    );
  });

  it('fails closed for prompts and executable actions', () => {
    expect(buildEquationOutcomeBoundaryFromProducer({
      kind: 'prompt',
      title: 'Equation',
      message: 'Choose a target.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'prompt-outcome' } });

    expect(buildEquationOutcomeBoundaryFromProducer(createEquationResultOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
      actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
    }))).toMatchObject({ ok: false, failure: { reason: 'unsupported-action' } });
  });

  it('keeps cancellation as control flow until the final display adapter', () => {
    const boundary = buildEquationCancelledOutcomeBoundary(
      'Equation solve was stopped before it finished.',
    );
    expect(readEquationOutcomeBoundary(boundary)).toMatchObject({
      kind: 'error',
      title: 'Solve',
      error: 'Equation solve was stopped before it finished.',
      solveSummaryParts: [[{
        kind: 'text',
        text: 'Equation solve stopped after the Equation worker runtime was hard-stopped.',
      }]],
    });
  });

  it('validates clone-safe result and cancellation boundaries', () => {
    const result = buildEquationOutcomeBoundaryFromProducerOrThrow(createEquationResultOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
      runtimeAdvisories: { equationNumericSolve: { kind: 'suggest-on-error' } },
    }));
    expect(validateEquationResultOutcomeBoundary(structuredClone(result))).toMatchObject({
      ok: true,
      boundary: result,
    });

    const cancellation = buildEquationCancelledOutcomeBoundary('Stopped.');
    expect(validateEquationOutcomeBoundary(cancellation)).toMatchObject({
      ok: true,
      boundary: cancellation,
    });
    expect(validateEquationResultOutcomeBoundary(cancellation)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-boundary', path: '$.kind' },
    });
  });

  it('rejects malformed carriers and transient advisory extensions', () => {
    const result = buildEquationOutcomeBoundaryFromProducerOrThrow(createEquationResultOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
    }));
    const malformed = structuredClone(result) as typeof result & { transient?: string };
    malformed.transient = 'not allowed';
    expect(validateEquationOutcomeBoundary(malformed)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-boundary' },
    });

    expect(validateEquationOutcomeBoundary({
      ...result,
      runtimeAdvisories: { equationNumericSolve: { kind: 'manual-only', reason: 'extra' } },
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-boundary', path: '$.runtimeAdvisories' },
    });

    expect(validateEquationOutcomeBoundary({
      ...result,
      result: { ...result.result, status: 'unknown' },
    })).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-result' },
    });
  });
});
