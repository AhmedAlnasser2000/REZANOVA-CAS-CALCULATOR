import type { DisplayDetailLinePart } from '../../../types/calculator';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import {
  solveGeneratedRealCubicCardanoFormulaEquation,
  solveGeneratedRealQuarticFerrariFormulaEquation,
} from './generated-formula-routes';
import {
  exactLatexForGroupedFormulaCases,
  groupedFormulaDetailSections,
  realCaseFormulaBranchesFromSolvedBranches,
  type GroupedFormulaCaseConfig,
} from './grouped-formula-cases';
import { normalizeParameterizedSupplementLatex } from './readback';
import type {
  ParameterizedTrigSolveOptions,
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
} from './trig-types';

const TRIG_FORMULA_CASES_SECTION_TITLE = 'Trig Formula Cases';
const TRIG_GROUPED_FORMULA_CONFIG: GroupedFormulaCaseConfig = {
  branchScopeText: 'trig periodic branch',
  introTitlePrefix: 'Trig Formula Branch',
  scopedTitlePrefix: 'Trig Branch',
  caseSectionTitle: TRIG_FORMULA_CASES_SECTION_TITLE,
};

function stop(message: string, target: string, parameterNames: string[]): ParameterizedTrigSolveStop {
  return {
    kind: 'unsupported',
    reason: 'unsupported-branch',
    message,
    target,
    parameterNames,
  };
}

function trigFormulaBranchFailureMessage(attempts: GeneratedBranchHandoffAttempt[]) {
  const cardano = attempts.find((attempt) => attempt.family === 'cubic-cardano')?.result;
  const ferrari = attempts.find((attempt) => attempt.family === 'quartic-ferrari')?.result;
  return cardano?.message
    ?? ferrari?.message
    ?? 'This generated trigonometric branch is outside current Real formula routes.';
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

export function solveTrigFormulaBranches(options: {
  generatedEquations: string[];
  generatedFacts: string[];
  target: string;
  parameterNames: string[];
  carrierValueLatex: string;
  familyTitle: string;
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  searchTrace?: ParameterizedTrigSolveOptions['searchTrace'];
}): ParameterizedTrigSolveResult {
  const branchFamilies: GeneratedBranchHandoffFamily[] = [
    {
      family: 'cubic-cardano',
      solve: (branchLatex, branchTarget) =>
        solveGeneratedRealCubicCardanoFormulaEquation(branchLatex, branchTarget),
    },
    {
      family: 'quartic-ferrari',
      solve: (branchLatex, branchTarget) =>
        solveGeneratedRealQuarticFerrariFormulaEquation(branchLatex, branchTarget),
    },
  ];
  const solvedBranches = solveGeneratedBranchEquations({
    branchEquations: options.generatedEquations,
    target: options.target,
    families: branchFamilies,
    searchTrace: options.searchTrace,
    failureMessage: ({ attempts }) => trigFormulaBranchFailureMessage(attempts),
    formulaValidationEvidence: () => ({
      wrapperBackSubstitutionValidated: true,
      candidatesValidated: true,
      caseMathPreserved: true,
      scopedFactsPreserved: true,
    }),
  });

  if (solvedBranches.kind === 'unsupported') {
    return stop(solvedBranches.message, options.target, options.parameterNames);
  }

  const groupedFormula = realCaseFormulaBranchesFromSolvedBranches(solvedBranches);
  if (groupedFormula.kind !== 'grouped') {
    return stop(
      'Trig formula grouping currently requires every generated periodic branch to return Real case formula output.',
      options.target,
      options.parameterNames,
    );
  }

  return {
    kind: 'success',
    target: options.target,
    parameterNames: options.parameterNames,
    exactLatex: exactLatexForGroupedFormulaCases(options.target, groupedFormula.branches),
    exactSupplementLatex: normalizeParameterizedSupplementLatex(dedupe([
      ...options.generatedFacts,
      ...solvedBranches.exactSupplementLatex,
    ])),
    detailSections: groupedFormulaDetailSections({
      branches: groupedFormula.branches,
      config: TRIG_GROUPED_FORMULA_CONFIG,
      target: options.target,
      parameterNames: options.parameterNames,
      familyTitle: options.familyTitle,
      familyLines: options.familyLines,
      familyLineParts: options.familyLineParts,
      generatedBranchSectionTitle: 'Trig Formula Branches',
      generatedEquations: options.generatedEquations,
    }),
    carrierValueLatex: options.carrierValueLatex,
    answerDomain: 'real',
  };
}
