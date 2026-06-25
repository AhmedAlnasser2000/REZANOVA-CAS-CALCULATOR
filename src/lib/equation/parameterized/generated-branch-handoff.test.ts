import { describe, expect, it, vi } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from '../equation-target-shape';
import {
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';

describe('solveGeneratedBranchEquations', () => {
  it('route-gates supported families and records skipped family evidence', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const linear = vi.fn(() => ({
      kind: 'unsupported' as const,
      reason: 'not-linear',
      message: 'not linear',
    }));
    const polynomial = vi.fn(() => ({
      kind: 'unsupported' as const,
      reason: 'not-polynomial',
      message: 'not polynomial',
    }));
    const rational = vi.fn(() => ({
      kind: 'success' as const,
      exactLatex: 'z=a+\\frac{1}{b}',
    }));
    const families: GeneratedBranchHandoffFamily[] = [
      { family: 'linear', solve: linear },
      { family: 'polynomial', solve: polynomial },
      { family: 'rational', solve: rational },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['\\frac{1}{z-a}=b'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: () => 'failed',
    });

    expect(result.kind).toBe('success');
    expect(linear).not.toHaveBeenCalled();
    expect(polynomial).not.toHaveBeenCalled();
    expect(rational).toHaveBeenCalledTimes(1);
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'linear',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'rational',
    });
  });

  it('keeps cubic Cardano and quartic Ferrari non-live for generated branch handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const cardano = vi.fn(() => ({
      kind: 'success' as const,
      exactLatex: 'z=\\operatorname{Cardano}',
    }));
    const ferrari = vi.fn(() => ({
      kind: 'success' as const,
      exactLatex: 'z=\\operatorname{Ferrari}',
    }));
    const families: GeneratedBranchHandoffFamily[] = [
      { family: 'cubic-cardano', solve: cardano },
      { family: 'quartic-ferrari', solve: ferrari },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z^3+z+1=b'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: () => 'generated Cardano is not live',
    });

    expect(result).toMatchObject({
      kind: 'unsupported',
      branchLatex: 'z^3+z+1=b',
      message: 'generated Cardano is not live',
    });
    expect(cardano).not.toHaveBeenCalled();
    expect(ferrari).not.toHaveBeenCalled();
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'quartic-ferrari',
    });
    expect(trace.events).not.toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
    expect(trace.events).not.toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'quartic-ferrari',
    });
    expect(trace.events).not.toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
    expect(trace.events).not.toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'quartic-ferrari',
    });
  });

  it('aggregates branch solutions and supplements', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: (equationLatex) => ({
          kind: 'success',
          exactLatex: equationLatex === 'z=a' ? 'z=a' : 'z=b',
          exactSupplementLatex: equationLatex === 'z=a' ? ['a\\ne0'] : ['b\\ne0'],
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=a', 'z=b'],
      target: 'z',
      families,
      failureMessage: () => 'failed',
    });

    expect(result).toMatchObject({
      kind: 'success',
      solutionExpressions: ['a', 'b'],
      exactSupplementLatex: ['a\\ne0', 'b\\ne0'],
    });
  });

  it('blocks structured Complex formula branches until validation exists', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const payload: GeneratedFormulaHandoffPayload = {
      kind: 'generated-formula-payload',
      targetLatex: 'z',
      generatedEquationLatex: 'z^3+a=0',
      sourceFamily: 'cubic-cardano',
      formula: {
        algorithm: 'cardano',
        degree: 3,
        domain: 'complex',
      },
      answerDomain: 'complex',
      candidateSet: {
        kind: 'unconditional-finite',
        branchCount: 3,
      },
      output: {
        kind: 'finite-branches',
        branches: [
          { id: 'k0', solutionLatex: 'U_0', rowLatex: 'z=U_0' },
          { id: 'k1', solutionLatex: 'U_1', rowLatex: 'z=U_1' },
          { id: 'k2', solutionLatex: 'U_2', rowLatex: 'z=U_2' },
        ],
      },
      globalSupplementLatex: ['a\\ne0'],
      scopedFacts: [
        {
          latex: 'R\\ne0',
          scope: { kind: 'branch', branchId: 'k0' },
          source: 'formula',
        },
      ],
      detailSections: [
        {
          title: 'Generated Cardano Definitions',
          lines: ['U_k=\\operatorname{PrincipalRoot}_{3}(R)\\omega_k'],
          lineKind: 'math',
        },
      ],
      exactLatex: 'z=\\operatorname{ShouldNotBeParsed}',
    };
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'polynomial',
        solve: () => ({
          kind: 'success',
          exactLatex: 'z=\\operatorname{ShouldNotBeParsed}',
          formulaPayload: payload,
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z^3+a=0'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: ({ attempts }) =>
        attempts[0]?.result.message ?? 'failed',
    });

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      return;
    }
    expect(result.branchLatex).toBe('z^3+a=0');
    expect(result.message).toContain('branch-local-conditions');
    expect(result.message).toContain('missing-candidate-validation');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'family-stop',
      phase: 'generated-handoff',
      family: 'polynomial',
      reason: 'generated-formula-validation-required',
      details: expect.objectContaining({
        formulaPayload: true,
        algorithm: 'cardano',
        degree: 3,
        domain: 'complex',
        outputKind: 'finite-branches',
      }),
    }));
    expect(trace.events).not.toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
  });

  it('blocks structured Real formula cases instead of flattening them as roots', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const payload: GeneratedFormulaHandoffPayload = {
      kind: 'generated-formula-payload',
      targetLatex: 'z',
      generatedEquationLatex: 'z^4+z+1=0',
      sourceFamily: 'quartic-ferrari',
      formula: {
        algorithm: 'ferrari',
        degree: 4,
        domain: 'real',
      },
      answerDomain: 'real',
      candidateSet: {
        kind: 'conditional-cases',
        caseCount: 2,
      },
      output: {
        kind: 'case-math',
        exactLatex: 'z\\in\\begin{cases}z_0,&\\Delta>0\\end{cases}',
        cases: [
          {
            id: 'positive-discriminant',
            resultLatex: 'z_0',
            conditionLatex: '\\Delta>0',
            rowLatex: 'z_0,\\quad\\Delta>0',
          },
          {
            id: 'casus-irreducibilis',
            resultLatex: 'z_k',
            conditionLatex: '\\Delta<0',
            rowLatex: 'z_k,\\quad\\Delta<0',
          },
        ],
      },
      scopedFacts: [
        {
          latex: '\\Delta>0',
          scope: { kind: 'case', caseId: 'positive-discriminant' },
          source: 'formula',
        },
      ],
      detailSections: [
        {
          title: 'Generated Ferrari Cases',
          lines: ['z_0, \\Delta>0'],
          lineKind: 'math',
        },
      ],
    };
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'polynomial',
        solve: () => ({
          kind: 'success',
          exactLatex: 'z\\in\\begin{cases}z_0,&\\Delta>0\\end{cases}',
          formulaPayload: payload,
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z^4+z+1=0'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: ({ attempts }) =>
        attempts[0]?.result.message ?? 'failed',
    });

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      return;
    }
    expect(result.message).toContain('real-case-math-not-flattenable');
    expect(result.message).toContain('missing-candidate-validation');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'family-stop',
      phase: 'generated-handoff',
      family: 'polynomial',
      reason: 'generated-formula-validation-required',
      details: expect.objectContaining({
        formulaPayload: true,
        algorithm: 'ferrari',
        degree: 4,
        domain: 'real',
        outputKind: 'case-math',
      }),
    }));
  });

  it('accepts structured Real formula cases only with explicit wrapper validation evidence', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const payload: GeneratedFormulaHandoffPayload = {
      kind: 'generated-formula-payload',
      targetLatex: 'z',
      generatedEquationLatex: 'z^4+z+1=0',
      sourceFamily: 'quartic-ferrari',
      formula: {
        algorithm: 'ferrari',
        degree: 4,
        domain: 'real',
      },
      answerDomain: 'real',
      candidateSet: {
        kind: 'conditional-cases',
        caseCount: 1,
      },
      output: {
        kind: 'case-math',
        exactLatex: 'z\\in\\begin{cases}z_0,&\\Delta>0\\end{cases}',
        cases: [
          {
            id: 'positive-discriminant',
            resultLatex: 'z_0',
            conditionLatex: '\\Delta>0',
          },
        ],
      },
      scopedFacts: [
        {
          latex: '\\Delta>0',
          scope: { kind: 'case', caseId: 'positive-discriminant' },
          source: 'formula',
        },
      ],
      detailSections: [
        {
          title: 'Real Ferrari Cases',
          lines: ['z_0, \\Delta>0'],
          lineKind: 'math',
        },
      ],
    };
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'quartic-ferrari',
        solve: () => ({
          kind: 'success',
          exactLatex: payload.output.kind === 'case-math' ? payload.output.exactLatex : '',
          formulaPayload: payload,
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z^4+z+1=0'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: () => 'failed',
      formulaValidationEvidence: () => ({
        wrapperBackSubstitutionValidated: true,
        candidatesValidated: true,
        caseMathPreserved: true,
        scopedFactsPreserved: true,
      }),
    });

    expect(result).toMatchObject({
      kind: 'success',
      solutionExpressions: [],
      formulaPayloads: [expect.objectContaining({
        sourceFamily: 'quartic-ferrari',
        answerDomain: 'real',
      })],
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'quartic-ferrari',
    });
  });

  it('uses caller failure message selection', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: () => ({ kind: 'unsupported', reason: 'not-linear', message: 'linear failed' }),
      },
      {
        family: 'polynomial',
        solve: () => ({ kind: 'unsupported', reason: 'not-polynomial', message: 'polynomial failed' }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=a'],
      target: 'z',
      families,
      failureMessage: ({ attempts }) =>
        attempts.find((attempt) => attempt.family === 'polynomial')?.result.message ?? 'failed',
    });

    expect(result).toMatchObject({
      kind: 'unsupported',
      branchLatex: 'z=a',
      message: 'polynomial failed',
    });
  });

  it('drops complex infinity solutions when requested', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: (equationLatex) => ({
          kind: 'success',
          exactLatex: equationLatex === 'z=0' ? 'z=\\tilde\\infty' : 'z=a',
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=0', 'z=a'],
      target: 'z',
      families,
      dropComplexInfinity: true,
      failureMessage: () => 'failed',
    });

    expect(result).toMatchObject({
      kind: 'success',
      solutionExpressions: ['a'],
    });
  });
});
