import { describe, expect, it } from 'vitest';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';
import {
  generatedFormulaValidationTraceDetails,
  inspectGeneratedFormulaPayloadValidation,
} from './generated-formula-validation';

function complexPayload(scopedFacts = true): GeneratedFormulaHandoffPayload {
  return {
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
        { id: 'k0', solutionLatex: 'U_0' },
        { id: 'k1', solutionLatex: 'U_1' },
        { id: 'k2', solutionLatex: 'U_2' },
      ],
    },
    scopedFacts: scopedFacts
      ? [
          {
            latex: 'R\\ne0',
            scope: { kind: 'branch', branchId: 'k0' },
            source: 'formula',
          },
        ]
      : undefined,
  };
}

function realCasePayload(): GeneratedFormulaHandoffPayload {
  return {
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
        },
        {
          id: 'casus-irreducibilis',
          resultLatex: 'z_k',
          conditionLatex: '\\Delta<0',
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
  };
}

describe('inspectGeneratedFormulaPayloadValidation', () => {
  it('blocks Complex formula branches until wrapper and candidate validation exists', () => {
    const decision = inspectGeneratedFormulaPayloadValidation(complexPayload());

    expect(decision.kind).toBe('blocked');
    if (decision.kind !== 'blocked') {
      return;
    }
    expect(decision.blocks.map((entry) => entry.reason)).toEqual([
      'branch-local-conditions',
      'scoped-facts-not-preserved',
      'missing-wrapper-back-substitution-validation',
      'missing-candidate-validation',
    ]);
    expect(generatedFormulaValidationTraceDetails(decision)).toMatchObject({
      formulaPayload: true,
      algorithm: 'cardano',
      degree: 3,
      domain: 'complex',
      outputKind: 'finite-branches',
      blockCount: 4,
    });
  });

  it('blocks Real formula cases because case rows cannot become unconditional roots', () => {
    const decision = inspectGeneratedFormulaPayloadValidation(realCasePayload());

    expect(decision.kind).toBe('blocked');
    if (decision.kind !== 'blocked') {
      return;
    }
    expect(decision.blocks.map((entry) => entry.reason)).toEqual([
      'real-case-math-not-flattenable',
      'case-local-conditions',
      'scoped-facts-not-preserved',
      'missing-wrapper-back-substitution-validation',
      'missing-candidate-validation',
    ]);
    expect(decision.message).toContain('real-case-math-not-flattenable');
  });

  it('marks unconditional formula branches ready only when validation evidence is present', () => {
    const decision = inspectGeneratedFormulaPayloadValidation(complexPayload(false), {
      wrapperBackSubstitutionValidated: true,
      candidatesValidated: true,
      scopedFactsPreserved: true,
    });

    expect(decision).toMatchObject({
      kind: 'ready',
      payload: {
        sourceFamily: 'cubic-cardano',
      },
    });
  });

  it('marks Real case payloads ready only when the wrapper preserves case structure and facts', () => {
    const decision = inspectGeneratedFormulaPayloadValidation(realCasePayload(), {
      wrapperBackSubstitutionValidated: true,
      candidatesValidated: true,
      caseMathPreserved: true,
      scopedFactsPreserved: true,
    });

    expect(decision).toMatchObject({
      kind: 'ready',
      payload: {
        sourceFamily: 'quartic-ferrari',
        answerDomain: 'real',
      },
    });
  });
});
