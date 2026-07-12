import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { attachEquationAnalysisEvidence } from '../analysis-evidence';
import { projectEquationDisplayOutcomeToSolveResult } from './compatibility';
import { validateEquationSolveResultContract } from './validation';

describe('Equation solve result contract', () => {
  it('carries solved candidate, branch, badge, diagnostic, and analysis evidence', () => {
    const outcome = attachEquationAnalysisEvidence<DisplayOutcome>({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x\\in\\{1,2\\}',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\in',
        branchesLatex: ['1', '2'],
        countLabel: 'roots',
      },
      warnings: [],
      plannerBadges: ['Canonicalized'],
      solveBadges: ['Candidate Checked'],
      candidateValues: [1, 2],
      rejectedCandidateCount: 1,
      substitutionDiagnostics: {
        family: 'same-base-equality',
        carrierKind: 'exp',
        branchCount: 2,
        filteredBranchCount: 1,
      },
      numericMethod: 'validated fixture',
      runtimeAdvisories: { stopReason: { kind: 'unsupported-family', source: 'stage' } },
    }, [{
      id: 'route:symbolic-exact:x',
      target: 'x',
      sourceRoute: 'symbolic-exact',
      category: 'route',
      confidence: 'reported',
      text: 'Equation route: symbolic-exact.',
      interval: undefined,
    }]);

    const projected = projectEquationDisplayOutcomeToSolveResult(outcome, {
      candidateValidation: [
        { kind: 'accepted', value: 1, residual: 0 },
        { kind: 'accepted', value: 2, residual: 0 },
        { kind: 'rejected', value: 3, reason: 'Residual is nonzero.' },
      ],
    });

    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.result.status).toBe('solved');
    expect(projected.result.candidates).toEqual({
      acceptedValues: [1, 2],
      rejectedCount: 1,
      validation: [
        { kind: 'accepted', value: 1, residual: 0 },
        { kind: 'accepted', value: 2, residual: 0 },
        { kind: 'rejected', value: 3, reason: 'Residual is nonzero.' },
      ],
    });
    expect(projected.result.branchEvidence?.branches.map((branch) => branch.canonicalLatex)).toEqual(['1', '2']);
    expect(projected.result.badges).toEqual({
      planner: ['Canonicalized'],
      solve: ['Candidate Checked'],
    });
    expect(projected.result.diagnostics.analysisEvidence).toHaveLength(1);
    expect(projected.result.diagnostics.analysisEvidence[0]).not.toHaveProperty('interval');
    expect(projected.result.document).not.toHaveProperty('runtimeAdvisories');
    expect(structuredClone(projected.result)).toEqual(projected.result);
    expect(validateEquationSolveResultContract(structuredClone(projected.result)).ok).toBe(true);
  });

  it('records Display errors as honest compatibility controlled stops', () => {
    const projected = projectEquationDisplayOutcomeToSolveResult({
      kind: 'error',
      title: 'Equation',
      error: 'This family is outside the supported Equation routes.',
      warnings: [],
    });

    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.result.status).toBe('controlled-stop');
    expect(projected.result.stop).toEqual({
      code: 'compatibility-display-error',
      message: 'This family is outside the supported Equation routes.',
      source: 'compatibility-boundary',
    });
  });

  it('rejects prompts and inconsistent mirrored evidence', () => {
    const prompt = projectEquationDisplayOutcomeToSolveResult({
      kind: 'prompt',
      title: 'Equation',
      message: 'Open Equation.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    });
    expect(prompt).toMatchObject({
      ok: false,
      failure: { reason: 'projection', projection: { reason: 'prompt-outcome' } },
    });

    const solved = projectEquationDisplayOutcomeToSolveResult({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      warnings: [],
      solveBadges: ['Candidate Checked'],
    });
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    const mismatched = structuredClone(solved.result);
    mismatched.badges.solve = [];
    expect(validateEquationSolveResultContract(mismatched)).toMatchObject({
      ok: false,
      failure: { reason: 'evidence-mismatch' },
    });
  });

  it('rejects malformed, cyclic, oversized, and status-inconsistent carriers', () => {
    const projected = projectEquationDisplayOutcomeToSolveResult({
      kind: 'error',
      title: 'Equation',
      error: 'Controlled stop.',
      warnings: [],
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    const statusMismatch = structuredClone(projected.result);
    expect(statusMismatch.status).toBe('controlled-stop');
    if (statusMismatch.status !== 'controlled-stop') return;
    statusMismatch.stop.message = 'Different stop.';
    expect(validateEquationSolveResultContract(statusMismatch)).toMatchObject({
      ok: false,
      failure: { reason: 'status-mismatch' },
    });

    const unknown = { ...projected.result, executableAction: () => undefined };
    expect(validateEquationSolveResultContract(unknown)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value' },
    });

    const cyclic = structuredClone(projected.result) as typeof projected.result & { self?: unknown };
    cyclic.self = cyclic;
    expect(validateEquationSolveResultContract(cyclic)).toMatchObject({
      ok: false,
      failure: { reason: 'cyclic-value' },
    });

    const oversized = structuredClone(projected.result);
    expect(oversized.status).toBe('controlled-stop');
    if (oversized.status !== 'controlled-stop') return;
    oversized.stop.message = 'x'.repeat(1_300_000);
    oversized.document.error = oversized.stop.message;
    expect(validateEquationSolveResultContract(oversized)).toMatchObject({
      ok: false,
      failure: { reason: 'byte-limit' },
    });
  });
});
