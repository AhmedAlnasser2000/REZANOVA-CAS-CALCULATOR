import { ComputeEngine } from '@cortex-js/compute-engine';
import { solvePolynomialRoots, type PolynomialRootDiagnostics } from '../../algebra/polynomial-roots';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { dedupeNumericRoots, validateCandidateRoots } from '../../equation/candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../../equation/candidate/extraneous';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import { equationToZeroFormLatex, evaluateLatexAtTarget } from '../../equation/domain-guards';
import { equationTargetLatex } from '../../equation/equation-target';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex } from '../../symbolic-engine/patterns';
import type {
  AngleUnit,
  CandidateValidationResult,
  DisplayDetailSection,
  DisplayOutcome,
  EquationDomainIntent,
  NumericSolveInterval,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import {
  buildFactSection,
  hardDomainFactLines,
  piecewiseBreakpointLines,
} from './numeric-search-diagnostics';
import {
  NUMERIC_FALLBACK_ELIGIBLE_ERRORS,
  polynomialFromZeroForm,
} from './numeric-polynomial-extraction';
import { profileEquationResult } from '../../display/printer';
import { proseSolveSummary } from '../../display/result-detail-lines';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

type BranchExpansion = {
  node: MathJson;
  constraints: SolveDomainConstraint[];
  labels: string[];
};

type EquationBranch = {
  equationLatex: string;
  constraints: SolveDomainConstraint[];
  labels: string[];
};

type PiecewiseExpansionStats = {
  piecewiseCarrierCount: number;
  maxDepth: number;
  generatedEquationCount: number;
};

const ce = new ComputeEngine();
const MAX_PIECEWISE_BRANCH_COUNT = 8;
const MAX_PIECEWISE_DEPTH = 2;
const MAX_GENERATED_EQUATIONS = 16;
const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const NUMERIC_RESIDUAL_TOLERANCE = 1e-8;
const NUMERIC_METHOD_PIECEWISE = 'Real piecewise numeric branch solve';
const PIECEWISE_OPERATORS = new Set(['Abs', 'Min', 'Max']);

function isArrayNode(node: unknown): node is MathJson[] {
  return Array.isArray(node);
}

function containsTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (!node || typeof node !== 'object') {
    return false;
  }
  const entries = isArrayNode(node) ? node : Object.values(node);
  return entries.some((entry) => containsTarget(entry, target));
}

function latexOf(node: unknown) {
  return boxLatex(normalizeAst(node));
}

function normalizeJson(node: unknown): MathJson {
  return normalizeAst(node) as MathJson;
}

function expressionIntervalConstraint(
  expression: unknown,
  direction: 'nonnegative' | 'nonpositive',
): SolveDomainConstraint {
  return direction === 'nonnegative'
    ? {
        kind: 'expression-interval',
        expressionLatex: latexOf(expression),
        min: 0,
        minInclusive: true,
        maxInclusive: false,
      }
    : {
        kind: 'expression-interval',
        expressionLatex: latexOf(expression),
        minInclusive: false,
        max: 0,
        maxInclusive: true,
      };
}

function mergeConstraints(...lists: readonly SolveDomainConstraint[][]) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of lists.flat()) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

function cartesian<T>(groups: readonly T[][]): T[][] {
  return groups.reduce<T[][]>(
    (accumulator, group) =>
      accumulator.flatMap((prefix) => group.map((entry) => [...prefix, entry])),
    [[]],
  );
}

function combineChildExpansions(operator: string, operands: readonly unknown[], target: string, depth: number) {
  const expandedOperands = operands.map((operand) => expandPiecewiseNode(operand, target, depth));
  const combinations = cartesian(expandedOperands);
  return combinations.map<BranchExpansion>((combination) => ({
    node: normalizeJson([operator, ...combination.map((entry) => entry.node)]),
    constraints: mergeConstraints(...combination.map((entry) => entry.constraints)),
    labels: combination.flatMap((entry) => entry.labels),
  }));
}

function expandAbsoluteValueNode(operand: unknown, target: string, depth: number) {
  const expandedOperand = expandPiecewiseNode(operand, target, depth + 1);
  return expandedOperand.flatMap<BranchExpansion>((entry) => {
    const nonnegative = expressionIntervalConstraint(entry.node, 'nonnegative');
    const nonpositive = expressionIntervalConstraint(entry.node, 'nonpositive');
    const operandLatex = latexOf(entry.node);
    return [
      {
        node: normalizeJson(entry.node),
        constraints: mergeConstraints(entry.constraints, [nonnegative]),
        labels: [...entry.labels, `\\left|${operandLatex}\\right|=${operandLatex}`],
      },
      {
        node: normalizeJson(['Negate', entry.node]),
        constraints: mergeConstraints(entry.constraints, [nonpositive]),
        labels: [...entry.labels, `\\left|${operandLatex}\\right|=-\\left(${operandLatex}\\right)`],
      },
    ];
  });
}

function branchComparisonConstraint(
  chosen: unknown,
  other: unknown,
  operator: 'Min' | 'Max',
) {
  const difference = normalizeJson(['Subtract', chosen, other]);
  return expressionIntervalConstraint(difference, operator === 'Max' ? 'nonnegative' : 'nonpositive');
}

function expandMinMaxNode(operator: 'Min' | 'Max', operands: readonly unknown[], target: string, depth: number) {
  const expandedOperands = operands.map((operand) => expandPiecewiseNode(operand, target, depth + 1));
  const combinations = cartesian(expandedOperands);
  return combinations.flatMap<BranchExpansion>((combination) =>
    combination.map((chosen, chosenIndex) => {
      const otherConstraints = combination
        .filter((_, index) => index !== chosenIndex)
        .map((other) => branchComparisonConstraint(chosen.node, other.node, operator));
      const chosenLatex = latexOf(chosen.node);
      return {
        node: normalizeJson(chosen.node),
        constraints: mergeConstraints(
          ...combination.map((entry) => entry.constraints),
          otherConstraints,
        ),
        labels: [
          ...combination.flatMap((entry) => entry.labels),
          `${operator === 'Max' ? '\\max' : '\\min'} branch uses ${chosenLatex}`,
        ],
      };
    }));
}

function expandPiecewiseNode(node: unknown, target: string, depth = 0): BranchExpansion[] {
  if (!isArrayNode(node) || node.length === 0) {
    return [{ node: normalizeJson(node), constraints: [], labels: [] }];
  }

  const [operator, ...operands] = node;
  if (
    typeof operator === 'string'
    && PIECEWISE_OPERATORS.has(operator)
    && operands.some((operand) => containsTarget(operand, target))
  ) {
    if (operator === 'Abs' && operands.length === 1) {
      return expandAbsoluteValueNode(operands[0], target, depth);
    }
    if ((operator === 'Min' || operator === 'Max') && operands.length >= 2) {
      return expandMinMaxNode(operator, operands, target, depth);
    }
  }

  return typeof operator === 'string'
    ? combineChildExpansions(operator, operands, target, depth)
    : [{ node: normalizeJson(node), constraints: [], labels: [] }];
}

function scanPiecewiseStats(node: unknown, target: string, depth = 0): Pick<PiecewiseExpansionStats, 'piecewiseCarrierCount' | 'maxDepth'> {
  if (!isArrayNode(node) || node.length === 0) {
    return { piecewiseCarrierCount: 0, maxDepth: 0 };
  }

  const [operator, ...operands] = node;
  const isTargetPiecewise =
    typeof operator === 'string'
    && PIECEWISE_OPERATORS.has(operator)
    && operands.some((operand) => containsTarget(operand, target));
  const nextDepth = isTargetPiecewise ? depth + 1 : depth;
  const childStats = operands.map((operand) => scanPiecewiseStats(operand, target, nextDepth));
  return {
    piecewiseCarrierCount:
      (isTargetPiecewise ? 1 : 0)
      + childStats.reduce((total, child) => total + child.piecewiseCarrierCount, 0),
    maxDepth: Math.max(isTargetPiecewise ? nextDepth : 0, ...childStats.map((child) => child.maxDepth)),
  };
}

function expandPiecewiseEquation(equationLatex: string, target: string) {
  let parsed: unknown;
  try {
    parsed = ce.parse(equationLatex).json;
  } catch {
    return null;
  }
  if (!isArrayNode(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const statsBase = scanPiecewiseStats(parsed, target);
  if (statsBase.piecewiseCarrierCount === 0) {
    return null;
  }
  if (
    statsBase.piecewiseCarrierCount > MAX_PIECEWISE_BRANCH_COUNT
    || statsBase.maxDepth > MAX_PIECEWISE_DEPTH
  ) {
    return {
      kind: 'cap-exceeded' as const,
      stats: { ...statsBase, generatedEquationCount: 0 },
      branches: [] as EquationBranch[],
    };
  }

  const leftBranches = expandPiecewiseNode(parsed[1], target);
  const rightBranches = expandPiecewiseNode(parsed[2], target);
  const branches: EquationBranch[] = [];
  for (const left of leftBranches) {
    for (const right of rightBranches) {
      branches.push({
        equationLatex: `${latexOf(left.node)}=${latexOf(right.node)}`,
        constraints: mergeConstraints(left.constraints, right.constraints),
        labels: [...left.labels, ...right.labels],
      });
    }
  }

  const stats = { ...statsBase, generatedEquationCount: branches.length };
  if (branches.length > MAX_GENERATED_EQUATIONS || branches.length > MAX_PIECEWISE_BRANCH_COUNT) {
    return {
      kind: 'cap-exceeded' as const,
      stats,
      branches,
    };
  }

  return {
    kind: 'success' as const,
    stats,
    branches,
  };
}

function realRootsFromBranchEquation(equationLatex: string, target: string) {
  const zeroForm = equationToZeroFormLatex(equationLatex);
  const polynomial = polynomialFromZeroForm(zeroForm, target);
  if (!polynomial) {
    return null;
  }
  if (polynomial.degree === 0) {
    return {
      degree: polynomial.degree,
      kind: polynomial.kind,
      roots: [],
      diagnostics: undefined,
    };
  }

  const solved = solvePolynomialRoots({ coefficients: polynomial.coefficients });
  if (solved.kind !== 'success') {
    return null;
  }

  return {
    degree: polynomial.degree,
    kind: polynomial.kind,
    roots: dedupeNumericRoots(
      solved.roots
        .filter((root) => Math.abs(root.im) <= REAL_ROOT_IMAGINARY_TOLERANCE)
        .map((root) => root.re),
    ),
    diagnostics: solved.diagnostics,
  };
}

function approximateEquationLatex(targetLatex: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${targetLatex}\\approx ${formatted[0]}`
    : `${targetLatex}\\approx\\left\\{${formatted.join(', ')}\\right\\}`;
}

function approximateText(target: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${target} ~= ${formatted[0]}`
    : `${target} ~= ${formatted.join(', ')}`;
}

function residualLines(zeroFormLatex: string, target: string, roots: readonly number[]) {
  return roots.map((root) => {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, root);
    const residual = evaluated.value === null ? Number.NaN : Math.abs(evaluated.value);
    return `${target}≈${formatApproxNumber(root)} residual ${Number.isFinite(residual) ? formatApproxNumber(residual) : 'undefined'}.`;
  });
}

function polynomialDiagnosticSummary(diagnostics: readonly PolynomialRootDiagnostics[]) {
  if (diagnostics.length === 0) {
    return [];
  }
  const maxResidual = Math.max(...diagnostics.map((entry) => entry.maxResidual));
  const maxIterations = Math.max(...diagnostics.map((entry) => entry.iterations));
  const clustered = diagnostics.reduce((total, entry) => total + entry.clusteredRootCount, 0);
  return [
    `Branch root engine: ${diagnostics[0].method}.`,
    `Maximum branch iterations: ${maxIterations}.`,
    `Largest branch polynomial residual after polishing: ${formatApproxNumber(maxResidual)}.`,
    ...(clustered > 0 ? [`Clustered/repeated branch-root signals: ${clustered}.`] : []),
  ];
}

function detailSectionsFor(input: {
  classification: ReturnType<typeof classifyEquationNumericShape>;
  expansion: NonNullable<ReturnType<typeof expandPiecewiseEquation>>;
  branchKinds: readonly string[];
  diagnostics: readonly PolynomialRootDiagnostics[];
  roots: readonly number[];
  rejected: readonly CandidateValidationResult[];
}): DisplayDetailSection[] {
  const factLines = hardDomainFactLines(input.classification.domainFacts);
  const breakpointLines = piecewiseBreakpointLines(input.classification.domainFacts);
  const confidenceSection = buildNumericConfidenceSection([
    ...(input.roots.length > 0 ? ['Validated roots from bounded search.'] : []),
    ...(factLines.length > 0 ? ['Domain segmented around exclusions.'] : []),
    'Candidate roots validated against original equation.',
  ]);
  const sections: DisplayDetailSection[] = [
    {
      title: 'Numeric Method',
      lineKind: 'text',
      lines: [
        'No supported exact form was found; showing validated approximate real roots.',
        `Method: ${NUMERIC_METHOD_PIECEWISE}.`,
        'Contained abs/min/max carriers were rewritten into guarded numeric branches before polynomial solving.',
      ],
    },
    ...(confidenceSection ? [confidenceSection] : []),
    {
      title: 'Piecewise Branch Rewrite',
      lineKind: 'text',
      lines: input.expansion.kind === 'cap-exceeded'
        ? [
            `Piecewise branch caps exceeded: ${input.expansion.stats.piecewiseCarrierCount} carrier(s), depth ${input.expansion.stats.maxDepth}, ${input.expansion.stats.generatedEquationCount} generated equation(s).`,
            'Use Numeric Interval Solve to segment around breakpoints inside a chosen real window.',
          ]
        : [
            `Piecewise carriers: ${input.expansion.stats.piecewiseCarrierCount}.`,
            `Maximum nested piecewise depth: ${input.expansion.stats.maxDepth}.`,
            `Generated guarded branch equations: ${input.expansion.stats.generatedEquationCount}.`,
            `Branch equation kinds: ${[...new Set(input.branchKinds)].join(', ')}.`,
          ],
    },
    {
      title: 'Generated Branches',
      lineKind: 'text',
      lines: input.expansion.branches.map((branch, index) =>
        `Branch ${index + 1}: ${branch.equationLatex}${branch.labels.length > 0 ? ` (${[...new Set(branch.labels)].join('; ')})` : ''}.`),
    },
  ];

  if (factLines.length > 0) {
    const section = buildFactSection('Domain and Exclusions', factLines);
    if (section) {
      sections.push(section);
    }
  }

  const breakpointSection = buildFactSection('Piecewise Breakpoints', breakpointLines);
  if (breakpointSection) {
    sections.push(breakpointSection);
  }

  const polynomialLines = polynomialDiagnosticSummary(input.diagnostics);
  if (polynomialLines.length > 0) {
    sections.push({
      title: 'Polynomial Diagnostics',
      lineKind: 'text',
      lines: polynomialLines,
    });
  }

  sections.push({
    title: 'Numeric Validation',
    lineKind: 'text',
    lines: [
      `Accepted ${input.roots.length} validated real root${input.roots.length === 1 ? '' : 's'}.`,
      `Residual tolerance: ${NUMERIC_RESIDUAL_TOLERANCE}.`,
      ...residualLines(input.classification.zeroFormLatex ?? input.classification.effectiveLatex, input.classification.selectedTarget ?? 'x', input.roots),
      ...(input.rejected.length > 0
        ? [`Extraneous candidate attempts: ${input.rejected.length}.`]
        : []),
    ],
  });

  return appendExtraneousSolutionsDetailSection(
    sections,
    extraneousEvidenceFromRejectedCandidates(input.rejected),
  ) ?? sections;
}

export function tryRealPiecewiseAbsHybridFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  sharedOutcome: DisplayOutcome;
}): DisplayOutcome | undefined {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
    || (
      !NUMERIC_FALLBACK_ELIGIBLE_ERRORS.has(input.sharedOutcome.error)
      && !input.sharedOutcome.error.includes('absolute-value')
    )
  ) {
    return undefined;
  }

  const classification = classifyEquationNumericShape({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    angleUnit: input.angleUnit,
  });
  if (
    !classification.numericReady
    || !classification.selectedTarget
    || !classification.zeroFormLatex
  ) {
    return undefined;
  }

  const expansion = expandPiecewiseEquation(classification.effectiveLatex, classification.selectedTarget);
  if (!expansion) {
    return undefined;
  }
  if (expansion.kind === 'cap-exceeded') {
    return undefined;
  }

  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];
  const diagnostics: PolynomialRootDiagnostics[] = [];
  const branchKinds: string[] = [];

  for (const branch of expansion.branches) {
    const roots = realRootsFromBranchEquation(branch.equationLatex, classification.selectedTarget);
    if (!roots) {
      return undefined;
    }
    if (roots.diagnostics) {
      diagnostics.push(roots.diagnostics);
    }
    branchKinds.push(roots.kind);
    const validation = validateCandidateRoots(
      classification.effectiveLatex,
      roots.roots,
      branch.constraints,
      'numeric-interval',
      input.angleUnit,
      classification.selectedTarget,
    );
    accepted.push(...validation.accepted);
    rejected.push(...validation.rejected);
  }

  const roots = dedupeNumericRoots(accepted);
  const detailSections = detailSectionsFor({
    classification,
    expansion,
    branchKinds,
    diagnostics,
    roots,
    rejected,
  });
  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const formattedRoots = roots.map((value) => formatApproxNumber(value));

  if (roots.length === 0) {
    return createEquationResultOutcome({
      kind: 'error',
      title: 'Solve',
      error: 'No validated real numeric roots were found after guarded piecewise branch solving.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      solveBadges: ['Candidate Checked'],
      numericMethod: NUMERIC_METHOD_PIECEWISE,
      rejectedCandidateCount: rejected.length > 0 ? rejected.length : undefined,
      detailSections,
    });
  }

  return profileEquationResult(createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, roots),
    approxText: approximateText(classification.selectedTarget, roots),
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\approx',
      branchesLatex: formattedRoots,
      source: 'equation-real-piecewise-abs-hybrid',
    }),
    warnings: [],
    solutionKind: 'approximate-numeric',
    resultOrigin: 'numeric-fallback',
    answerDomain: 'real',
    solveBadges: ['Candidate Checked'],
    ...proseSolveSummary(`${NUMERIC_METHOD_PIECEWISE}. Accepted ${roots.length} validated real root${roots.length === 1 ? '' : 's'}${rejected.length > 0 ? `, marked ${rejected.length} extraneous candidate attempt${rejected.length === 1 ? '' : 's'}.` : '.'}`),
    candidateValues: roots,
    rejectedCandidateCount: rejected.length > 0 ? rejected.length : undefined,
    numericMethod: NUMERIC_METHOD_PIECEWISE,
    detailSections,
  }));
}
