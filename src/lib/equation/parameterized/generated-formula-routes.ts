import type { DisplayDetailLinePart, DisplayDetailSection } from '../../../types/calculator';
import type { GeneratedHandoffFailure, GeneratedHandoffSuccess } from './generated-handoff';
import type {
  GeneratedFormulaCaseRow,
  GeneratedFormulaHandoffPayload,
  GeneratedFormulaRouteFamily,
  GeneratedFormulaScopedFact,
} from './generated-formula-handoff-payload';
import {
  solveParameterizedTopLevelCubicCardanoEquation,
  solveParameterizedTopLevelQuarticFerrariEquation,
} from './formula-rational-normalization';
import { profileEquationResult } from '../../display/printer';

type GeneratedFormulaResult = GeneratedHandoffSuccess | GeneratedHandoffFailure;
type RealFormulaAlgorithm = 'cardano' | 'ferrari';
type RealFormulaDegree = 3 | 4;

function caseSectionTitle(algorithm: RealFormulaAlgorithm) {
  return algorithm === 'cardano' ? 'Real Cardano Cases' : 'Real Ferrari Cases';
}

function caseRowsFromSections(
  sections: readonly DisplayDetailSection[],
  algorithm: RealFormulaAlgorithm,
): GeneratedFormulaCaseRow[] {
  const section = sections.find((entry) => entry.title === caseSectionTitle(algorithm));
  if (!section) {
    return [];
  }

  return section.lines.map((line, index) => {
    const parts = section.lineParts?.[index];
    const mathParts = parts?.filter((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math') ?? [];
    return profileEquationResult({
      id: `${algorithm}-case-${index}`,
      resultLatex: mathParts[0]?.latex ?? line,
      conditionLatex: mathParts[1]?.latex ?? '',
      rowLatex: line,
      text: line,
      ...(parts ? { parts: parts.map((part) => ({ ...part })) } : {}),
      ...(mathParts[1]?.latex ? { factsLatex: [mathParts[1].latex] } : {}),
    });
  });
}

function scopedFactsFromCases(cases: readonly GeneratedFormulaCaseRow[]): GeneratedFormulaScopedFact[] {
  return cases
    .filter((row) => Boolean(row.conditionLatex))
    .map((row) => ({
      latex: row.conditionLatex,
      scope: { kind: 'case', caseId: row.id },
      source: 'formula',
    }));
}

function payloadForRealFormula(options: {
  target: string;
  generatedEquationLatex: string;
  sourceFamily: GeneratedFormulaRouteFamily;
  algorithm: RealFormulaAlgorithm;
  degree: RealFormulaDegree;
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
}): GeneratedFormulaHandoffPayload {
  const cases = caseRowsFromSections(options.detailSections, options.algorithm);
  return {
    kind: 'generated-formula-payload',
    targetLatex: options.target,
    generatedEquationLatex: options.generatedEquationLatex,
    sourceFamily: options.sourceFamily,
    formula: {
      algorithm: options.algorithm,
      degree: options.degree,
      domain: 'real',
    },
    answerDomain: 'real',
    candidateSet: {
      kind: 'conditional-cases',
      caseCount: cases.length,
    },
    output: {
      kind: 'case-math',
      exactLatex: options.exactLatex,
      cases,
    },
    exactLatex: options.exactLatex,
    globalSupplementLatex: options.exactSupplementLatex,
    scopedFacts: scopedFactsFromCases(cases),
    detailSections: options.detailSections,
  };
}

export function solveGeneratedRealCubicCardanoFormulaEquation(
  equationLatex: string,
  target: string,
): GeneratedFormulaResult {
  const solved = solveParameterizedTopLevelCubicCardanoEquation(equationLatex, target, {
    allowGeneratedImplicitProducts: true,
    domain: 'real',
  });
  if (solved.kind !== 'success') {
    return {
      kind: 'unsupported',
      reason: solved.reason,
      message: solved.message,
    };
  }

  return {
    kind: 'success',
    exactLatex: solved.exactLatex,
    exactSupplementLatex: solved.exactSupplementLatex,
    formulaPayload: payloadForRealFormula({
      target,
      generatedEquationLatex: equationLatex,
      sourceFamily: 'cubic-cardano',
      algorithm: 'cardano',
      degree: 3,
      exactLatex: solved.exactLatex,
      exactSupplementLatex: solved.exactSupplementLatex,
      detailSections: solved.detailSections,
    }),
  };
}

export function solveGeneratedRealQuarticFerrariFormulaEquation(
  equationLatex: string,
  target: string,
): GeneratedFormulaResult {
  const solved = solveParameterizedTopLevelQuarticFerrariEquation(equationLatex, target, {
    allowGeneratedImplicitProducts: true,
    domain: 'real',
  });
  if (solved.kind !== 'success') {
    return {
      kind: 'unsupported',
      reason: solved.reason,
      message: solved.message,
    };
  }

  return {
    kind: 'success',
    exactLatex: solved.exactLatex,
    exactSupplementLatex: solved.exactSupplementLatex,
    formulaPayload: payloadForRealFormula({
      target,
      generatedEquationLatex: equationLatex,
      sourceFamily: 'quartic-ferrari',
      algorithm: 'ferrari',
      degree: 4,
      exactLatex: solved.exactLatex,
      exactSupplementLatex: solved.exactSupplementLatex,
      detailSections: solved.detailSections,
    }),
  };
}
