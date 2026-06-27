import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import {
  detailLineFromParts,
  mathDetailSection,
  mathPart,
  textPart,
} from '../../display/result-detail-lines';
import {
  type GeneratedBranchHandoffSolvedBranch,
  type GeneratedBranchHandoffSuccess,
} from './generated-branch-handoff';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';
import { buildParameterizedDetailSections } from './readback';

const REAL_FORMULA_CASE_SECTION_TITLES = new Set([
  'Real Cardano Cases',
  'Real Ferrari Cases',
]);

export type GroupedFormulaCaseConfig = {
  branchScopeText: string;
  introTitlePrefix: string;
  scopedTitlePrefix: string;
  caseSectionTitle: string;
};

export type RealCaseFormulaPayload = GeneratedFormulaHandoffPayload & {
  output: Extract<GeneratedFormulaHandoffPayload['output'], { kind: 'case-math' }>;
};

export type RealCaseFormulaSolvedBranch = GeneratedBranchHandoffSolvedBranch & {
  formulaPayload: RealCaseFormulaPayload;
};

export function isRealCaseFormulaPayload(payload: GeneratedFormulaHandoffPayload) {
  return payload.answerDomain === 'real'
    && payload.output.kind === 'case-math';
}

export function realCaseFormulaPayloadFromSolvedBranches(
  solvedBranches: GeneratedBranchHandoffSuccess,
) {
  const payloads = solvedBranches.formulaPayloads ?? [];
  return payloads.length === 1 && isRealCaseFormulaPayload(payloads[0])
    ? payloads[0]
    : null;
}

export function realCaseFormulaBranchesFromSolvedBranches(
  solvedBranches: GeneratedBranchHandoffSuccess,
) {
  const formulaBranches = solvedBranches.branches.filter((branch) => branch.formulaPayload);
  if (!formulaBranches.length) {
    return { kind: 'none' as const };
  }
  if (
    formulaBranches.length !== solvedBranches.branches.length
    || formulaBranches.some((branch) => !branch.formulaPayload || !isRealCaseFormulaPayload(branch.formulaPayload))
  ) {
    return { kind: 'mixed' as const };
  }
  return {
    kind: 'grouped' as const,
    branches: formulaBranches as RealCaseFormulaSolvedBranch[],
  };
}

function groupedFormulaConditionLatex(branchLatex: string, conditionLatex: string) {
  if (!conditionLatex) {
    return branchLatex;
  }
  return `\\substack{${branchLatex}\\\\${conditionLatex}}`;
}

export function exactLatexForGroupedFormulaCases(
  target: string,
  branches: readonly RealCaseFormulaSolvedBranch[],
) {
  const rows = branches.flatMap((branch) =>
    branch.formulaPayload.output.cases.map((row) =>
      `${row.resultLatex},&${groupedFormulaConditionLatex(branch.branchLatex, row.conditionLatex)}`));
  return `${target}\\in\\begin{cases}${rows.join('\\\\')}\\end{cases}`;
}

function groupedFormulaCaseSection(
  branches: readonly RealCaseFormulaSolvedBranch[],
  config: GroupedFormulaCaseConfig,
): DisplayDetailSection {
  const lines: string[] = [];
  const lineParts: DisplayDetailLinePart[][] = [];

  for (const branch of branches) {
    for (const row of branch.formulaPayload.output.cases) {
      const resultLatex = row.resultLatex;
      const conditionLatex = row.conditionLatex;
      lines.push(`${branch.branchLatex}: ${resultLatex}, ${conditionLatex}`);
      lineParts.push([
        mathPart(branch.branchLatex),
        textPart(': '),
        mathPart(resultLatex),
        textPart(', '),
        mathPart(conditionLatex),
      ]);
    }
  }

  return {
    title: config.caseSectionTitle,
    lines,
    lineParts,
  };
}

function groupedFormulaBranchIntroSection(
  branch: RealCaseFormulaSolvedBranch,
  index: number,
  config: GroupedFormulaCaseConfig,
): DisplayDetailSection {
  const branchLine = detailLineFromParts([
    textPart('Generated branch '),
    mathPart(branch.branchLatex),
    textPart(` remained scoped to this ${config.branchScopeText}.`),
  ]);
  const routeLine = `Formula route: ${branch.family}.`;
  return {
    title: `${config.introTitlePrefix} ${index + 1}`,
    lines: [branchLine.line, routeLine],
    lineParts: [
      branchLine.parts,
      [textPart(routeLine)],
    ],
  };
}

function scopedFormulaDetailSectionsForGroupedBranch(
  branch: RealCaseFormulaSolvedBranch,
  index: number,
  config: GroupedFormulaCaseConfig,
) {
  const prefix = `${config.scopedTitlePrefix} ${index + 1}`;
  return (branch.formulaPayload.detailSections ?? [])
    .filter((section) =>
      section.title !== 'Solve Target'
      && !REAL_FORMULA_CASE_SECTION_TITLES.has(section.title))
    .map((section) => ({
      ...section,
      title: `${prefix} - ${section.title}`,
    }));
}

export function groupedFormulaDetailSections(options: {
  branches: readonly RealCaseFormulaSolvedBranch[];
  config: GroupedFormulaCaseConfig;
  target: string;
  parameterNames: string[];
  familyTitle: string;
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  generatedBranchSectionTitle: string;
  generatedEquations: string[];
}) {
  const groupedCaseSection = groupedFormulaCaseSection(options.branches, options.config);
  const branchSections = options.branches.flatMap((branch, index) => [
    groupedFormulaBranchIntroSection(branch, index, options.config),
    ...scopedFormulaDetailSectionsForGroupedBranch(branch, index, options.config),
  ]);

  return buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: options.familyTitle,
    familyLines: options.familyLines,
    familyLineParts: options.familyLineParts,
    extraSections: [
      groupedCaseSection,
      ...branchSections,
      mathDetailSection(options.generatedBranchSectionTitle, options.generatedEquations),
    ],
  });
}
