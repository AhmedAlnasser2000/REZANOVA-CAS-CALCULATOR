import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AngleUnit,
  DisplayBranchReadback,
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
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import {
  countSelectedCompositionCarriers,
  generateCompositionBranchesForCarrier,
  generateNestedCompositionBranchesForChain,
  hasAmbiguousAdjacentProduct,
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrier,
  matchSelectedCompositionCarrierChain,
  parameterNamesFromCompositionLatex,
  type CompositionCarrierKind,
  type CompositionCoreStopReason,
  type CompositionMathJson,
} from '../composition/core';
import { isNestedAlgebraicFormulaWrapperKind } from '../composition/nested-formula-substrate';
import { solveEquationAlgebraicIsolation } from '../equation-algebraic-isolation';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import { solveParameterizedCarrierEquation } from './carrier';
import { solveParameterizedExpLogEquation } from './exp-log';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  type GeneratedBranchHandoffSolvedBranch,
  type GeneratedBranchHandoffSuccess,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import {
  solveGeneratedRealCubicCardanoFormulaEquation,
  solveGeneratedRealQuarticFerrariFormulaEquation,
} from './generated-formula-routes';
import { exactLatexForSolutions } from './generated-handoff';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import { solveParameterizedTrigEquation } from './trig';

const ce = new ComputeEngine();
const ABS_FORMULA_CASES_SECTION_TITLE = 'Absolute-Value Formula Cases';
const SQUARE_POWER_FORMULA_CASES_SECTION_TITLE = 'Square-Power Formula Cases';
const EVEN_POWER_FORMULA_CASES_SECTION_TITLE = 'Even-Power Formula Cases';
const NTH_ROOT_FORMULA_CASES_SECTION_TITLE = 'Nth-Root Formula Cases';
const TRIG_FORMULA_CASES_SECTION_TITLE = 'Trig Formula Cases';
const NESTED_FORMULA_CASES_SECTION_TITLE = 'Nested Formula Cases';
const REAL_FORMULA_CASE_SECTION_TITLES = new Set([
  'Real Cardano Cases',
  'Real Ferrari Cases',
]);
type GroupedFormulaWrapperKind = Extract<
  CompositionCarrierKind,
  'absolute-value' | 'square-power' | 'even-power' | 'nth-root' | 'sin' | 'cos' | 'tan'
>;
type GroupedFormulaConfigKind = GroupedFormulaWrapperKind | 'nested-algebraic';
type GroupedFormulaWrapperConfig = {
  branchScopeText: string;
  introTitlePrefix: string;
  scopedTitlePrefix: string;
  caseSectionTitle: string;
  mixedMessage: string;
};
const GROUPED_FORMULA_WRAPPER_CONFIGS: Record<GroupedFormulaConfigKind, GroupedFormulaWrapperConfig> = {
  'absolute-value': {
    branchScopeText: 'absolute-value sign case',
    introTitlePrefix: 'Abs Formula Branch',
    scopedTitlePrefix: 'Abs Branch',
    caseSectionTitle: ABS_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Absolute-value formula grouping currently requires every generated sign branch to return Real case formula output.',
  },
  'square-power': {
    branchScopeText: 'square-power branch',
    introTitlePrefix: 'Square-Power Formula Branch',
    scopedTitlePrefix: 'Square-Power Branch',
    caseSectionTitle: SQUARE_POWER_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Square-power formula grouping currently requires every generated square-root branch to return Real case formula output.',
  },
  'even-power': {
    branchScopeText: 'even-power branch',
    introTitlePrefix: 'Even-Power Formula Branch',
    scopedTitlePrefix: 'Even-Power Branch',
    caseSectionTitle: EVEN_POWER_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Even-power formula grouping currently requires every generated even-root branch to return Real case formula output.',
  },
  'nth-root': {
    branchScopeText: 'nth-root branch',
    introTitlePrefix: 'Nth-Root Formula Branch',
    scopedTitlePrefix: 'Nth-Root Branch',
    caseSectionTitle: NTH_ROOT_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Nth-root formula grouping currently requires the generated root branch to return Real case formula output.',
  },
  sin: {
    branchScopeText: 'trig periodic branch',
    introTitlePrefix: 'Trig Formula Branch',
    scopedTitlePrefix: 'Trig Branch',
    caseSectionTitle: TRIG_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Trig formula grouping currently requires every generated periodic branch to return Real case formula output.',
  },
  cos: {
    branchScopeText: 'trig periodic branch',
    introTitlePrefix: 'Trig Formula Branch',
    scopedTitlePrefix: 'Trig Branch',
    caseSectionTitle: TRIG_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Trig formula grouping currently requires every generated periodic branch to return Real case formula output.',
  },
  tan: {
    branchScopeText: 'trig periodic branch',
    introTitlePrefix: 'Trig Formula Branch',
    scopedTitlePrefix: 'Trig Branch',
    caseSectionTitle: TRIG_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Trig formula grouping currently requires every generated periodic branch to return Real case formula output.',
  },
  'nested-algebraic': {
    branchScopeText: 'nested algebraic wrapper branch',
    introTitlePrefix: 'Nested Formula Branch',
    scopedTitlePrefix: 'Nested Branch',
    caseSectionTitle: NESTED_FORMULA_CASES_SECTION_TITLE,
    mixedMessage: 'Nested formula grouping currently requires every generated nested wrapper branch to return Real case formula output.',
  },
};

export type ParameterizedCompositionStopReason = CompositionCoreStopReason;

export type ParameterizedCompositionSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string[];
  answerDomain?: 'real' | 'complex';
};

export type ParameterizedCompositionSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedCompositionStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCompositionSolveResult =
  | ParameterizedCompositionSolveSuccess
  | ParameterizedCompositionSolveStop;

export type ParameterizedCompositionSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  formulaHandoff?: {
    domain: 'real';
  };
};

const BRANCH_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };

function detailTextLine(text: string) {
  return {
    line: text,
    parts: [textPart(text)] as DisplayDetailLinePart[],
  };
}

function oneLayerHandoffLine(carrierLatex: string) {
  return detailLineFromParts([
    textPart('Inverted one outer composition layer '),
    mathPart(carrierLatex),
    textPart(' around the selected target.'),
  ]);
}

function twoLayerHandoffLine(carrierLatex: string[]) {
  const parts: DisplayDetailLinePart[] = [textPart('Inverted two nested composition layers ')];
  carrierLatex.forEach((latex, index) => {
    if (index > 0) {
      parts.push(textPart(' then '));
    }
    parts.push(mathPart(latex));
  });
  parts.push(textPart(' around the selected target.'));
  return detailLineFromParts(parts);
}

function stop(
  reason: ParameterizedCompositionStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCompositionSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function compositionBranchFailureMessage(
  attempts: GeneratedBranchHandoffAttempt[],
) {
  const byFamily = (family: GeneratedBranchHandoffAttempt['family']) =>
    attempts.find((attempt) => attempt.family === family)?.result;
  const polynomial = byFamily('polynomial');
  const rational = byFamily('rational');
  const factorable = byFamily('factorable-polynomial');
  const carrier = byFamily('carrier');
  const expLog = byFamily('exp-log');
  const trig = byFamily('trig');

  if (rational && rational.reason !== 'not-rational') {
    return rational.message;
  }
  if (trig && trig.reason !== 'no-trig') {
    return trig.message;
  }
  if (expLog && expLog.reason !== 'no-exp-log') {
    return expLog.message;
  }
  if (carrier && carrier.reason !== 'no-carrier') {
    return carrier.message;
  }
  if (factorable && factorable.reason !== 'not-factorable') {
    return factorable.message;
  }

  return polynomial?.message
    ?? rational?.message
    ?? trig?.message
    ?? expLog?.message
    ?? carrier?.message
    ?? factorable?.message
    ?? 'This generated composition branch is outside current selected-target parameter solvers.';
}

function isRealCaseFormulaPayload(payload: GeneratedFormulaHandoffPayload) {
  return payload.answerDomain === 'real'
    && payload.output.kind === 'case-math';
}

type RealCaseFormulaPayload = GeneratedFormulaHandoffPayload & {
  output: Extract<GeneratedFormulaHandoffPayload['output'], { kind: 'case-math' }>;
};

type RealCaseFormulaSolvedBranch = GeneratedBranchHandoffSolvedBranch & {
  formulaPayload: RealCaseFormulaPayload;
};

function realCaseFormulaPayloadFromSolvedBranches(
  solvedBranches: GeneratedBranchHandoffSuccess,
) {
  const payloads = solvedBranches.formulaPayloads ?? [];
  return payloads.length === 1 && isRealCaseFormulaPayload(payloads[0])
    ? payloads[0]
    : null;
}

function realCaseFormulaBranchesFromSolvedBranches(
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

function groupedFormulaWrapperConfig(kind: GroupedFormulaConfigKind | CompositionCarrierKind | undefined) {
  return kind === 'absolute-value'
    || kind === 'square-power'
    || kind === 'even-power'
    || kind === 'nth-root'
    || kind === 'sin'
    || kind === 'cos'
    || kind === 'tan'
    || kind === 'nested-algebraic'
    ? GROUPED_FORMULA_WRAPPER_CONFIGS[kind]
    : null;
}

function groupedFormulaConditionLatex(branchLatex: string, conditionLatex: string) {
  if (!conditionLatex) {
    return branchLatex;
  }
  return `\\substack{${branchLatex}\\\\${conditionLatex}}`;
}

function exactLatexForGroupedFormulaCases(
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
  config: GroupedFormulaWrapperConfig,
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
  config: GroupedFormulaWrapperConfig,
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
  config: GroupedFormulaWrapperConfig,
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

function formulaDetailSections(options: {
  payload: GeneratedFormulaHandoffPayload;
  target: string;
  parameterNames: string[];
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  layerEquationLatex?: string[];
  generatedEquations: string[];
}) {
  return buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Parameterized Composition Handoff',
    familyLines: options.familyLines,
    familyLineParts: options.familyLineParts,
    extraSections: [
      ...(options.payload.detailSections ?? []).filter((section) => section.title !== 'Solve Target'),
      mathDetailSection('Composition Branches', options.layerEquationLatex ?? options.generatedEquations),
    ],
  });
}

function groupedFormulaDetailSections(options: {
  branches: readonly RealCaseFormulaSolvedBranch[];
  config: GroupedFormulaWrapperConfig;
  target: string;
  parameterNames: string[];
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  layerEquationLatex?: string[];
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
    familyTitle: 'Parameterized Composition Handoff',
    familyLines: options.familyLines,
    familyLineParts: options.familyLineParts,
    extraSections: [
      groupedCaseSection,
      ...branchSections,
      mathDetailSection('Composition Branches', options.layerEquationLatex ?? options.generatedEquations),
    ],
  });
}

function solveGeneratedCompositionBranches({
  generatedEquations,
  generatedFacts,
  layerEquationLatex,
  target,
  parameterNames,
  angleUnit,
  familyLines,
  familyLineParts,
  searchTrace,
  formulaHandoff,
  formulaWrapperKind,
}: {
  generatedEquations: string[];
  generatedFacts: string[];
  layerEquationLatex?: string[];
  target: string;
  parameterNames: string[];
  angleUnit: AngleUnit;
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  formulaHandoff?: ParameterizedCompositionSolveOptions['formulaHandoff'];
  formulaWrapperKind?: CompositionCarrierKind | 'nested-algebraic';
}): ParameterizedCompositionSolveResult {
  const branchFamilies: GeneratedBranchHandoffFamily[] = [
    {
      family: 'linear',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedLinearEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedPolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'rational',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedRationalEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'factorable-polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedFactorablePolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'algebraic-isolation',
      solve: (branchLatex, branchTarget) =>
        solveEquationAlgebraicIsolation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'carrier',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedCarrierEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    ...(
      formulaHandoff?.domain === 'real'
        ? [
            {
              family: 'cubic-cardano' as const,
              solve: (branchLatex: string, branchTarget: string) =>
                solveGeneratedRealCubicCardanoFormulaEquation(branchLatex, branchTarget),
            },
            {
              family: 'quartic-ferrari' as const,
              solve: (branchLatex: string, branchTarget: string) =>
                solveGeneratedRealQuarticFerrariFormulaEquation(branchLatex, branchTarget),
            },
          ]
        : []
    ),
    {
      family: 'exp-log',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedExpLogEquation(branchLatex, branchTarget, {
          ...BRANCH_HANDOFF_OPTIONS,
          searchTrace,
        }),
    },
    {
      family: 'trig',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedTrigEquation(branchLatex, branchTarget, angleUnit, BRANCH_HANDOFF_OPTIONS),
    },
  ];
  const solvedBranches = solveGeneratedBranchEquations({
    branchEquations: generatedEquations,
    target,
    families: branchFamilies,
    searchTrace,
    failureMessage: ({ attempts }) => compositionBranchFailureMessage(attempts),
    ...(formulaHandoff
      ? {
          formulaValidationEvidence: () => ({
            wrapperBackSubstitutionValidated: true,
            candidatesValidated: true,
            caseMathPreserved: true,
            scopedFactsPreserved: true,
          }),
        }
      : {}),
  });
  if (solvedBranches.kind === 'unsupported') {
    return stop(
      'unsupported-branch',
      `A generated composition branch is outside current selected-target parameter solvers. ${solvedBranches.message}`,
      target,
      parameterNames,
    );
  }

  const formulaPayload = realCaseFormulaPayloadFromSolvedBranches(solvedBranches);
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    ...generatedFacts,
    ...solvedBranches.exactSupplementLatex,
  ]));
  const groupedFormulaConfig = formulaHandoff ? groupedFormulaWrapperConfig(formulaWrapperKind) : null;
  if (groupedFormulaConfig) {
    const groupedFormula = realCaseFormulaBranchesFromSolvedBranches(solvedBranches);
    if (groupedFormula.kind === 'mixed') {
      return stop(
        'unsupported-branch',
        groupedFormulaConfig.mixedMessage,
        target,
        parameterNames,
      );
    }
    if (groupedFormula.kind === 'grouped') {
      return {
        kind: 'success',
        target,
        parameterNames,
        exactLatex: exactLatexForGroupedFormulaCases(target, groupedFormula.branches),
        exactSupplementLatex,
        detailSections: groupedFormulaDetailSections({
          branches: groupedFormula.branches,
          config: groupedFormulaConfig,
          target,
          parameterNames,
          familyLines,
          familyLineParts,
          layerEquationLatex,
          generatedEquations,
        }),
        generatedEquationLatex: generatedEquations,
        answerDomain: 'real',
      };
    }
  }

  if (formulaPayload) {
    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: formulaPayload.output.kind === 'case-math'
        ? formulaPayload.output.exactLatex
        : formulaPayload.exactLatex ?? '',
      exactSupplementLatex,
      detailSections: formulaDetailSections({
        payload: formulaPayload,
        target,
        parameterNames,
        familyLines,
        familyLineParts,
        layerEquationLatex,
        generatedEquations,
      }),
      generatedEquationLatex: generatedEquations,
      answerDomain: 'real',
    };
  }

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Composition Handoff',
    familyLines,
    familyLineParts,
    extraSections: [mathDetailSection('Composition Branches', layerEquationLatex ?? generatedEquations)],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solvedBranches.solutionExpressions),
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: target,
      branchesLatex: dedupe(solvedBranches.solutionExpressions),
      preserveOrder: true,
      source: 'equation-parameterized-composition',
    }),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: generatedEquations,
  };
}

export function solveParameterizedCompositionEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  options: ParameterizedCompositionSolveOptions = {},
): ParameterizedCompositionSolveResult {
  const parameterNames = parameterNamesFromCompositionLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized composition solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized composition solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized composition solving.', target, parameterNames);
  }

  if (!hasCompositionTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const [left, right] = [json[1] as CompositionMathJson, json[2] as CompositionMathJson];
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];
  const carrierCounts = countSelectedCompositionCarriers(json, target);
  let sawTargetOutsideCarrier = false;

  for (const candidate of candidates) {
    if (!hasCompositionTarget(candidate.carrierSide, target)) {
      continue;
    }
    if (hasCompositionTarget(candidate.valueSide, target)) {
      sawTargetOutsideCarrier = true;
      continue;
    }

    if (carrierCounts <= 1) {
      const match = matchSelectedCompositionCarrier(candidate.carrierSide, target);
      if (match.kind === 'blocked') {
        return stop(match.reason, match.message, target, parameterNames);
      }
      if (match.kind === 'none') {
        continue;
      }

      const generated = generateCompositionBranchesForCarrier(match.carrier, candidate.valueSide, angleUnit);
      if (generated.kind === 'unsupported') {
        return stop(generated.reason, generated.message, target, parameterNames);
      }

      const handoffLine = oneLayerHandoffLine(match.carrier.labelLatex);
      const generatedLine = detailTextLine(
        `Generated ${generated.equations.length} branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
      );
      return solveGeneratedCompositionBranches({
        generatedEquations: generated.equations,
        generatedFacts: generated.facts,
        target,
        parameterNames,
        angleUnit,
        familyLines: [handoffLine.line, generatedLine.line],
        familyLineParts: [handoffLine.parts, generatedLine.parts],
        searchTrace: options.searchTrace,
        formulaHandoff: match.carrier.kind === 'square-root'
          || match.carrier.kind === 'absolute-value'
          || match.carrier.kind === 'square-power'
          || match.carrier.kind === 'even-power'
          || match.carrier.kind === 'odd-power'
          || match.carrier.kind === 'nth-root'
          || match.carrier.kind === 'sin'
          || match.carrier.kind === 'cos'
          || match.carrier.kind === 'tan'
          ? options.formulaHandoff
          : undefined,
        formulaWrapperKind: match.carrier.kind,
      });
    }

    const chain = matchSelectedCompositionCarrierChain(candidate.carrierSide, target);
    if (chain.kind === 'blocked') {
      return stop(chain.reason, chain.message, target, parameterNames);
    }
    if (chain.kind === 'none') {
      continue;
    }

    const generated = generateNestedCompositionBranchesForChain(
      chain.carriers,
      candidate.valueSide,
      target,
      angleUnit,
    );
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    const handoffLine = twoLayerHandoffLine(chain.carriers.map((carrier) => carrier.labelLatex));
    const generatedLine = detailTextLine(
      `Generated ${generated.equations.length} final branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
    );
    const allowNestedFormulaHandoff = chain.carriers.every((carrier) =>
      isNestedAlgebraicFormulaWrapperKind(carrier.kind));
    return solveGeneratedCompositionBranches({
      generatedEquations: generated.equations,
      generatedFacts: generated.facts,
      layerEquationLatex: generated.layerEquationLatex,
      target,
      parameterNames,
      angleUnit,
      familyLines: [handoffLine.line, generatedLine.line],
      familyLineParts: [handoffLine.parts, generatedLine.parts],
      searchTrace: options.searchTrace,
      formulaHandoff: allowNestedFormulaHandoff ? options.formulaHandoff : undefined,
      formulaWrapperKind: allowNestedFormulaHandoff ? 'nested-algebraic' : undefined,
    });
  }

  if (sawTargetOutsideCarrier) {
    return stop(
      'target-outside-carrier',
      'PARAM12 requires the selected target to appear only inside the bounded composition chain.',
      target,
      parameterNames,
    );
  }

  return stop(
    carrierCounts === 1 ? 'target-outside-carrier' : carrierCounts > 1 ? 'mixed-carriers' : 'no-composition',
    carrierCounts === 1
      ? 'PARAM12 requires the selected target to appear only inside the bounded composition chain.'
      : carrierCounts > 1
      ? 'No supported bounded selected-target composition chain was found for PARAM12.'
        : 'No supported selected-target composition handoff was found.',
    target,
    parameterNames,
  );
}
