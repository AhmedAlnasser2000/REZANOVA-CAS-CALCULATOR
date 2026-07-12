import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import {
  buildEquationCancelledOutcomeBoundary,
  projectEquationDisplayOutcomeToBoundary,
  projectEquationDisplayOutcomeToBoundaryOrThrow,
  projectEquationOutcomeBoundaryToDisplay,
  validateEquationOutcomeBoundary,
  validateEquationResultOutcomeBoundary,
} from './boundary';

describe('Equation outcome boundary', () => {
  it('keeps canonical result truth and transient runtime policy separate', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      warnings: [],
      runtimeAdvisories: {
        equationNumericSolve: { kind: 'manual-only' },
      },
    };

    const boundary = projectEquationDisplayOutcomeToBoundaryOrThrow(outcome);
    expect(boundary.result.document.primaryMath?.canonicalLatex).toBe('x=1');
    expect(boundary.result.document).not.toHaveProperty('runtimeAdvisories');
    expect(boundary.runtimeAdvisories).toEqual(outcome.runtimeAdvisories);
    expect(structuredClone(boundary)).toEqual(boundary);

    const restored = projectEquationOutcomeBoundaryToDisplay(boundary);
    expect(restored).toMatchObject(outcome);
    expect(restored.kind).toBe('success');
    expect(restored.kind === 'success' ? restored.canonicalResult : undefined).toEqual(
      boundary.result.document,
    );
  });

  it('fails closed for prompts and executable actions', () => {
    expect(projectEquationDisplayOutcomeToBoundary({
      kind: 'prompt',
      title: 'Equation',
      message: 'Choose a target.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'prompt-outcome' } });

    expect(projectEquationDisplayOutcomeToBoundary({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
      actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
    })).toMatchObject({ ok: false, failure: { reason: 'unsupported-action' } });
  });

  it('keeps cancellation as control flow until the final display adapter', () => {
    const boundary = buildEquationCancelledOutcomeBoundary(
      'Equation solve was stopped before it finished.',
    );
    expect(projectEquationOutcomeBoundaryToDisplay(boundary)).toMatchObject({
      kind: 'error',
      title: 'Solve',
      error: 'Equation solve was stopped before it finished.',
      solveSummaryText: 'Equation solve stopped after the Equation worker runtime was hard-stopped.',
    });
  });

  it('validates clone-safe result and cancellation boundaries', () => {
    const result = projectEquationDisplayOutcomeToBoundaryOrThrow({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
      runtimeAdvisories: { equationNumericSolve: { kind: 'suggest-on-error' } },
    });
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
    const result = projectEquationDisplayOutcomeToBoundaryOrThrow({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: [],
    });
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
