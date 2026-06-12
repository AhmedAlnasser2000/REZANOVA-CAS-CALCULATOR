import { ComputeEngine } from '@cortex-js/compute-engine';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber, formatNumber, solutionsToLatex } from '../../display/format';
import {
  mergeExactSupplementLatex,
} from '../../algebra/exact-supplements';
import { evaluateRealNumericExpression } from '../../numeric/real-numeric-eval';
import {
  mergeBranchConstraints as mergeSharedBranchConstraints,
} from '../../algebra/branch-core';
import {
  formatRangeInterval,
  proveRealRange,
} from '../range-impossibility';
import { dedupeNumericRoots } from '../candidate-validation';
import {
  checkCandidateAgainstConstraints,
  equationToZeroFormLatex,
  readNumericNode,
} from '../domain-guards';
import { matchAbsoluteValueTarget as matchSharedAbsoluteValueTarget } from '../../algebra/abs-core';
import { dedupe, extractApproxSolutions, extractExactSolutions, mergeDisplayOutcomes } from '../guarded/merge';
import {
  buildCompositeCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from '../guarded/outcome';
import { equationStateKey } from '../guarded/state-key';
import {
  buildSharedCompositionBranchSet,
  resolveCompositionRecursionDepth,
} from './core';
import {
  buildParameterizedPowerBranches,
  buildQuadraticBranches,
  buildShiftedCarrierBranches,
  buildSymbolicFamilyBranchFromNode,
  dedupeSymbolicFamilyBranches,
  matchParameterizedPowerCarrier,
  matchQuadraticCarrier,
  matchShiftedSupportedCarrier,
  numericAffineCarrier,
  transformAffineBranches,
  type SymbolicFamilyBranch,
} from './carriers';
import {
  appendDiscoveredFamilies,
  appendDiscoveredFamiliesToResult,
  appendPeriodicSolveBadges,
  buildInverseTrigPrincipalRangeLatex,
  buildInverseTrigPrincipalRangeMessage,
  buildPeriodicBranchConditionSupplement,
  buildPeriodicOutcomeSupplements,
  buildPeriodicSolveSummary,
  buildReducedCarrierSawtoothSummary,
  createPeriodicFamily,
  formatBranchConstant,
  intervalWithinPrincipalRange,
  inverseTrigPrincipalRange,
  isReducedCarrierExactFamily,
  isWithinPrincipalRange,
  mergePeriodicFamilyExtras,
  periodicFamilyBadges,
  periodicFamilyToExactLatex,
  type PeriodicFamilySolveResult,
} from './periodic-family';
export {
  buildParameterizedPowerBranches,
  buildQuadraticBranches,
  buildShiftedCarrierBranches,
  buildSymbolicFamilyBranchFromNode,
  dedupeSymbolicFamilyBranches,
  matchParameterizedPowerCarrier,
  matchQuadraticCarrier,
  matchShiftedSupportedCarrier,
  numericAffineCarrier,
  transformAffineBranches,
  type SymbolicFamilyBranch,
} from './carriers';
import { convertAngle, evaluateSpecialTrig } from '../../trigonometry/angles';
import { buildTrigPeriodicTemplate, type TrigPeriodicBranch } from '../../trigonometry/equations';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { matchAffineVariableArgument } from '../../trigonometry/normalize';
import { matchSupportedRadical, matchSupportedRationalPower } from '../../algebra/radical-core';
import {
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type {
  AngleUnit,
  CandidateValidationResult,
  DisplayDetailSection,
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
  PeriodicFamilyInfo,
  PeriodicPiecewiseBranch,
  PeriodicFamilyRepresentative,
  PeriodicIntervalSuggestion,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../types/calculator';

const ce = new ComputeEngine();
const EPSILON = 1e-9;
const RESIDUAL_TOLERANCE = 1e-6;
const MAX_TRIG_BRANCHES = 12;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

type NumericTarget = {
  node: unknown;
  latex: string;
  value: number;
};

type ReducedSingleFamilyCarrierKind =
  | 'absolute-value'
  | 'radical'
  | 'rational-power'
  | 'logarithmic'
  | 'exponential';

type NonPeriodicTransform = {
  equations: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  unresolvedError: string;
  exactSupplementLatex?: string[];
  detailSections?: DisplayDetailSection[];
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>;
};

type TrigBranchResult =
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'branches';
      equations: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'unresolved';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    };

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function mergeConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  return mergeSharedBranchConstraints(left, right);
}

function buildCompositionBranchSet(
  equations: string[],
  constraints?: SolveDomainConstraint[],
) {
  return buildSharedCompositionBranchSet(equations, constraints);
}

function appendSolveMetadata(
  outcome: DisplayOutcome,
  badges: SolveBadge[],
  summary: string,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  return {
    ...outcome,
    solveBadges: dedupe([...(outcome.solveBadges ?? []), ...badges]),
    solveSummaryText: outcome.solveSummaryText
      ? `${summary}; ${outcome.solveSummaryText}`
      : summary,
  };
}

function withNestedRecursionBadges(badges: SolveBadge[] = []) {
  return dedupe<SolveBadge>([...badges, 'Nested Recursion']);
}

function compositionDepthLimitError(
  badges: SolveBadge[],
  summaryText: string,
) {
  return errorOutcome(
    'Solve',
    'This recognized composition family exceeds the current bounded three-step outer-inversion limit. Use Numeric Solve with a chosen interval in Equation mode.',
    [],
    [],
    withNestedRecursionBadges(badges),
    summaryText,
  );
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function rewriteDirectTrigAngles(node: unknown, angleUnit: AngleUnit): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}

function evaluateResidualAt(
  equationLatex: string,
  value: number,
  angleUnit: AngleUnit,
) {
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const expr = ce.parse(zeroFormLatex);
  const substituted = expr.subs({ x: value });
  const rewrittenJson = rewriteDirectTrigAngles(substituted.json, angleUnit);
  const rewrittenLatex = boxLatex(rewrittenJson);
  const numeric = evaluateRealNumericExpression(rewrittenJson, rewrittenLatex);
  if (numeric.kind === 'success') {
    return numeric.value;
  }

  const evaluated = ce.box(rewrittenJson as Parameters<typeof ce.box>[0]).evaluate();
  const fallback = evaluated.N?.() ?? evaluated;
  return readNumericNode(fallback.json);
}

function validateCompositionCandidates(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
) {
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];

  for (const candidate of dedupeNumericRoots(candidates)) {
    const violation = checkCandidateAgainstConstraints(candidate, constraints, angleUnit);
    if (violation) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: violation,
      });
      continue;
    }

    const residual = evaluateResidualAt(equationLatex, candidate, angleUnit);
    if (residual === null) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'produces an undefined or non-real substitution',
      });
      continue;
    }

    if (Math.abs(residual) > RESIDUAL_TOLERANCE) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'does not satisfy the original equation after substitution',
      });
      continue;
    }

    accepted.push(candidate);
  }

  return {
    accepted: dedupeNumericRoots(accepted),
    rejected,
  };
}

function compositionRejectionMessage(rejected: CandidateValidationResult[], constraints: SolveDomainConstraint[]) {
  return buildCompositeCandidateRejectionMessage(
    classifyCandidateRejections(rejected, constraints),
  );
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function parseFiniteNumericValue(latex: string): number | null {
  const normalized = latex.trim();
  if (/\^\{\\circ\}$/.test(normalized)) {
    const degreeText = normalized.replace(/\^\{\\circ\}$/, '');
    const degreeValue = Number(degreeText);
    return Number.isFinite(degreeValue) ? degreeValue : null;
  }

  try {
    const numeric = ce.parse(normalized).N?.().json;
    const parsed = readNumericNode(numeric);
    if (parsed !== null) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function matchAcceptedExactSolutions(exactLatex: string | undefined, accepted: number[]) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);

  if (exactCandidates.length === 0) {
    return [] as string[];
  }

  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = exactCandidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= 1e-6);
    if (candidateIndex < 0) {
      return [] as string[];
    }
    used.add(candidateIndex);
    matched.push(exactCandidates[candidateIndex].latex);
  }

  return matched;
}

function collectOutcomeCandidates(outcome: DisplayOutcome) {
  if (outcome.kind === 'prompt') {
    return [] as number[];
  }

  const exact = dedupe(extractExactSolutions(outcome.exactLatex))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
  if (exact.length > 0) {
    return exact;
  }

  if (outcome.kind === 'success' && outcome.candidateValues && outcome.candidateValues.length > 0) {
    return dedupeNumericRoots(outcome.candidateValues);
  }

  return dedupe(extractApproxSolutions(outcome.approxText))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
}

function parseNumericTarget(node: unknown): NumericTarget | null {
  const normalized = normalizeAst(node);
  try {
    const numeric = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.().json;
    const value = readNumericNode(numeric);
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return {
      node: normalized,
      latex: boxLatex(normalized),
      value,
    };
  } catch {
    return null;
  }
}

function readExactScalar(node: unknown): ExactScalar | null {
  return readExactScalarNode(normalizeAst(node));
}

function buildScalarNode(numerator: number, denominator = 1): unknown {
  if (denominator === 1) {
    return numerator;
  }

  return ['Rational', numerator, denominator];
}

function buildEquationLatex(left: unknown, right: unknown) {
  return `${boxLatex(left)}=${boxLatex(right)}`
    .replace(/\\exponentialE/g, 'e');
}

function mergeDetailSections(
  left: DisplayDetailSection[] = [],
  right: DisplayDetailSection[] = [],
) {
  const encoded = dedupe([...left, ...right].map((section) => JSON.stringify(section)));
  return encoded.map((entry) => JSON.parse(entry));
}

function buildNumericTargetFromNode(node: unknown, fallbackValue?: number): NumericTarget | null {
  const normalized = normalizeAst(node);
  const parsed = parseNumericTarget(normalized);
  if (parsed) {
    return parsed;
  }

  if (fallbackValue === undefined || !Number.isFinite(fallbackValue)) {
    return null;
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    value: fallbackValue,
  };
}

function buildInverseTrigValueTarget(
  kind: 'sin' | 'cos' | 'tan',
  target: NumericTarget,
  angleUnit: AngleUnit,
) {
  const degrees = convertAngle(target.value, angleUnit, 'deg');
  const exactLatex = evaluateSpecialTrig(kind, degrees);
  if (exactLatex && exactLatex !== '\\text{undefined}') {
    return buildNumericTargetFromNode(ce.parse(exactLatex).json);
  }

  const radians = convertAngle(target.value, angleUnit, 'rad');
  const value =
    kind === 'sin'
      ? Math.sin(radians)
      : kind === 'cos'
        ? Math.cos(radians)
        : Math.tan(radians);

  return {
    node: value,
    latex: formatNumber(value, 12),
    value,
  } satisfies NumericTarget;
}

function buildSymbolicFamilyBranch(branch: TrigPeriodicBranch): SymbolicFamilyBranch {
  const node = normalizeAst(ce.parse(branch.latex).json);
  return {
    node,
    latex: boxLatex(node),
    representativeValue: branch.representativeValue,
  };
}

function substituteFamilyBranchLatex(latex: string, kValue: number) {
  const expression = ce.parse(latex).subs({ k: kValue });
  if (/\\arc(?:sin|cos|tan)/.test(latex)) {
    return expression.latex;
  }
  const simplified = expression.simplify();
  if (simplified.latex.includes('NaN')) {
    return expression.latex;
  }
  return simplified.latex;
}

function evaluateFamilyBranchAt(branch: SymbolicFamilyBranch, kValue: number) {
  try {
    const substituted = ce.box(branch.node as Parameters<typeof ce.box>[0]).subs({ k: kValue });
    const numeric = evaluateRealNumericExpression(substituted.json, substituted.latex);
    if (numeric.kind === 'success') {
      return numeric.value;
    }
    const fallback = substituted.N?.() ?? substituted;
    return readNumericNode(fallback.json);
  } catch {
    return null;
  }
}

function branchDependsOnParameter(branch: SymbolicFamilyBranch) {
  return dependsOnVariable(branch.node, 'k');
}

function enumerateParameterizedBranchValuesOnInterval(
  branch: SymbolicFamilyBranch,
  intervalMin: number,
  intervalMax: number,
) {
  const atZero = evaluateFamilyBranchAt(branch, 0);
  const atOne = evaluateFamilyBranchAt(branch, 1);
  if (atZero === null || atOne === null || !Number.isFinite(atZero) || !Number.isFinite(atOne)) {
    return null;
  }

  const step = atOne - atZero;
  if (Math.abs(step) <= EPSILON) {
    return atZero >= intervalMin - EPSILON && atZero <= intervalMax + EPSILON
      ? [0]
      : [];
  }

  const rawStart = (intervalMin - atZero) / step;
  const rawEnd = (intervalMax - atZero) / step;
  const startK = Math.ceil(Math.min(rawStart, rawEnd) - EPSILON);
  const endK = Math.floor(Math.max(rawStart, rawEnd) + EPSILON);
  if (endK < startK) {
    return [];
  }

  if (endK - startK + 1 > MAX_TRIG_BRANCHES) {
    return null;
  }

  const values: number[] = [];
  for (let k = startK; k <= endK; k += 1) {
    values.push(k);
  }
  return values;
}

function expandBranchesWithinInterval(
  branches: SymbolicFamilyBranch[],
  intervalMin: number,
  intervalMax: number,
) {
  const expanded: SymbolicFamilyBranch[] = [];

  for (const branch of branches) {
    if (!branchDependsOnParameter(branch)) {
      const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
      continue;
    }

    const parameterValues = enumerateParameterizedBranchValuesOnInterval(branch, intervalMin, intervalMax);
    if (parameterValues === null) {
      return null;
    }

    for (const kValue of parameterValues) {
      const latex = substituteFamilyBranchLatex(branch.latex, kValue);
      const node = ce.parse(latex).json;
      const target = buildNumericTargetFromNode(node, evaluateFamilyBranchAt(branch, kValue) ?? undefined);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
    }
  }

  return dedupeSymbolicFamilyBranches(expanded);
}

function matchParameterizedRationalPowerCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  let baseNode: unknown;
  let numerator: number;
  let denominator: number;

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
    baseNode = normalized[1];
    numerator = 1;
    denominator = 2;
  } else if (isNodeArray(normalized) && normalized[0] === 'Root' && normalized.length === 3) {
    const indexTarget = parseNumericTarget(normalized[2]);
    if (!indexTarget || !Number.isInteger(indexTarget.value) || indexTarget.value < 2) {
      return null;
    }
    baseNode = normalized[1];
    numerator = 1;
    denominator = indexTarget.value;
  } else if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const exponent = readExactScalar(normalized[2]);
    if (!exponent || exponent.numerator <= 0 || exponent.denominator <= 1) {
      return null;
    }
    baseNode = normalized[1];
    numerator = exponent.numerator;
    denominator = exponent.denominator;
  } else {
    return null;
  }

  if (!dependsOnVariable(baseNode, 'x')) {
    return null;
  }

  const affineBase = numericAffineCarrier(baseNode);
  if (!affineBase) {
    return null;
  }

  return {
    baseNode,
    affineBase,
    numerator,
    denominator,
  };
}

function nthRootRepresentativeValue(value: number, degree: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (degree % 2 === 0) {
    if (value < 0) {
      return Number.NaN;
    }
    return Math.pow(value, 1 / degree);
  }

  return Math.sign(value) * Math.pow(Math.abs(value), 1 / degree);
}

function rationalPowerRequiresNonnegativeTarget(numerator: number, denominator: number) {
  return denominator % 2 === 0 || numerator % 2 === 0;
}

function realRationalPowerValue(value: number, numerator: number, denominator: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (denominator % 2 === 0 && value < 0) {
    return Number.NaN;
  }

  const rootValue = denominator === 1
    ? value
    : nthRootRepresentativeValue(value, denominator);
  if (!Number.isFinite(rootValue)) {
    return Number.NaN;
  }

  return Math.sign(rootValue) * Math.pow(Math.abs(rootValue), numerator);
}

function buildParameterizedRationalPowerBranches(
  carrier: NonNullable<ReturnType<typeof matchParameterizedRationalPowerCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  const transformedBranches: SymbolicFamilyBranch[] = [];
  const parameterConstraints: string[] = [];
  const domainConstraints: SolveDomainConstraint[] = [];
  const requiresNonnegativeTarget = rationalPowerRequiresNonnegativeTarget(
    carrier.numerator,
    carrier.denominator,
  );

  if (carrier.denominator % 2 === 0) {
    domainConstraints.push({
      kind: 'nonnegative',
      expressionLatex: boxLatex(carrier.baseNode),
    });
  }

  for (const branch of branches) {
    const constantTarget = parseNumericTarget(branch.node);
    if (requiresNonnegativeTarget && constantTarget && constantTarget.value < -EPSILON) {
      continue;
    }

    const poweredNode = normalizeAst([
      'Power',
      branch.node,
      buildScalarNode(carrier.denominator, carrier.numerator),
    ]);
    const poweredRepresentative = realRationalPowerValue(
      branch.representativeValue,
      carrier.denominator,
      carrier.numerator,
    );
    const positiveBranch: SymbolicFamilyBranch = {
      node: poweredNode,
      latex: boxLatex(poweredNode),
      representativeValue: poweredRepresentative,
    };
    transformedBranches.push(...transformAffineBranches(carrier.affineBase, [positiveBranch]));

    if (carrier.denominator % 2 !== 0 && carrier.numerator % 2 === 0) {
      const negativePoweredNode = normalizeAst(['Negate', poweredNode]);
      const negativeBranch: SymbolicFamilyBranch = {
        node: negativePoweredNode,
        latex: boxLatex(negativePoweredNode),
        representativeValue: Number.isFinite(poweredRepresentative) ? -poweredRepresentative : Number.NaN,
      };
      transformedBranches.push(...transformAffineBranches(carrier.affineBase, [negativeBranch]));
    }

    if (requiresNonnegativeTarget && (!constantTarget || Math.abs(constantTarget.value) > EPSILON)) {
      parameterConstraints.push(`${branch.latex}\\ge0`);
    }
  }

  return {
    branches: dedupeSymbolicFamilyBranches(transformedBranches),
    parameterConstraintLatex: dedupe(parameterConstraints),
    domainConstraints,
  };
}

function buildRepresentativeBranches(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  carrierNode?: unknown,
): PeriodicFamilyRepresentative[] {
  const entries: Array<{ value: number; label: string; exactLatex: string; approxText: string }> = [];
  const carrierRange = carrierNode ? proveRealRange(carrierNode) : null;

  for (const kValue of [0, -1, 1, 2, -2]) {
    for (const branch of branches) {
      const value = evaluateFamilyBranchAt(branch, kValue);
      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      if (
        !isCarrierRepresentativeFeasible(carrierNode, carrierRange, value)
      ) {
        continue;
      }

      if (entries.some((entry) => Math.abs(entry.value - value) <= 1e-6)) {
        continue;
      }

      const exactLatex = `${carrierLatex}=${substituteFamilyBranchLatex(branch.latex, kValue)}`;
      entries.push({
        value,
        label: `k=${kValue}`,
        exactLatex,
        approxText: `${carrierLatex} ~= ${formatApproxNumber(value)}`,
      });
    }
  }

  return entries
    .sort((left, right) => Math.abs(left.value) - Math.abs(right.value) || left.value - right.value)
    .slice(0, 3)
    .map((entry) => ({
      label: entry.label,
      exactLatex: entry.exactLatex,
      approxText: entry.approxText,
    }));
}

function isCarrierRepresentativeFeasible(
  carrierNode: unknown,
  carrierRange: ReturnType<typeof proveRealRange> | null,
  value: number,
) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (
    carrierRange?.kind === 'exact'
    && (value < carrierRange.interval.min - EPSILON || value > carrierRange.interval.max + EPSILON)
  ) {
    return false;
  }

  const normalized = carrierNode ? normalizeAst(carrierNode) : null;
  if (
    normalized
    && isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
  ) {
    if (normalized[1] === 'ExponentialE') {
      return value > 0;
    }

    if (isBareVariable(normalized[1])) {
      const exponent = readExactScalar(normalized[2]);
      if (exponent?.denominator === 1 && exponent.numerator > 0 && exponent.numerator % 2 === 0) {
        return value >= -EPSILON;
      }
    }
  }

  return true;
}

function inferSimpleDomainBounds(constraints: SolveDomainConstraint[]) {
  let min = Number.NEGATIVE_INFINITY;
  let max = Number.POSITIVE_INFINITY;

  for (const constraint of constraints) {
    if (constraint.kind === 'interval') {
      if (constraint.min !== undefined) {
        min = Math.max(min, constraint.min);
      }
      if (constraint.max !== undefined) {
        max = Math.min(max, constraint.max);
      }
      continue;
    }

    if ((constraint.kind === 'positive' || constraint.kind === 'nonnegative') && constraint.expressionLatex) {
      const normalized = normalizeAst(ce.parse(constraint.expressionLatex).json);
      const affine = numericAffineCarrier(normalized);
      if (!affine) {
        continue;
      }

      const bound = -affine.offsetValue / affine.coefficient;
      if (affine.coefficient > 0) {
        min = Math.max(min, bound);
      } else {
        max = Math.min(max, bound);
      }
    }
  }

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

function buildIntervalSuggestionsFromRoots(
  values: number[],
  bounds: { min?: number; max?: number },
): PeriodicIntervalSuggestion[] {
  const sorted = dedupeNumericRoots(values)
    .sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
  if (sorted.length === 0) {
    return [];
  }

  return sorted.slice(0, 3).map((value, index) => {
    const leftGap = index > 0 ? value - sorted[index - 1] : Number.POSITIVE_INFINITY;
    const rightGap = index < sorted.length - 1 ? sorted[index + 1] - value : Number.POSITIVE_INFINITY;
    const nearestGap = Math.min(leftGap, rightGap);
    const relativeWidth = Math.max(0.25, Math.abs(value) * 0.1);
    const halfWidth = Number.isFinite(nearestGap)
      ? Math.max(0.1, Math.min(nearestGap * 0.25, relativeWidth))
      : relativeWidth;

    let start = value - halfWidth;
    let end = value + halfWidth;
    if (bounds.min !== undefined) {
      start = Math.max(start, bounds.min + 1e-6);
    }
    if (bounds.max !== undefined) {
      end = Math.min(end, bounds.max - 1e-6);
    }

    return {
      label: `near x ~= ${formatApproxNumber(value)}`,
      start: formatApproxNumber(start),
      end: formatApproxNumber(end),
    };
  });
}

function approximateCarrierRoots(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
): number[] {
  const normalized = normalizeAst(carrierNode);
  const affine = numericAffineCarrier(normalized);
  if (affine) {
    return branches
      .map((branch) => (branch.representativeValue - affine.offsetValue) / affine.coefficient)
      .filter((value) => Number.isFinite(value));
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isBareVariable(normalized[1])
  ) {
    const exponent = readExactScalar(normalized[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator > 1) {
      const degree = exponent.numerator;
      const values: number[] = [];
      for (const branch of branches) {
        const target = branch.representativeValue;
        if (!Number.isFinite(target)) {
          continue;
        }
        if (degree % 2 === 0) {
          if (target < 0) {
            continue;
          }
          const root = Math.pow(target, 1 / degree);
          values.push(-root, root);
        } else {
          values.push(Math.sign(target) * Math.pow(Math.abs(target), 1 / degree));
        }
      }
      return values.filter((value) => Number.isFinite(value));
    }
  }

  return [];
}

function buildPeriodicFamilyInfo(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
  carrierNodeForIntervals?: unknown,
  parameterConstraintLatex: string[] = [],
): PeriodicFamilyInfo {
  const representatives = buildRepresentativeBranches(carrierLatex, branches, carrierNodeForIntervals);
  const intervalRoots = carrierNodeForIntervals
    ? approximateCarrierRoots(carrierNodeForIntervals, branches)
    : [];
  const suggestedIntervals = buildIntervalSuggestionsFromRoots(
    intervalRoots.filter((value) => {
      const violation = checkCandidateAgainstConstraints(value, constraints, angleUnit);
      return !violation;
    }),
    inferSimpleDomainBounds(constraints),
  );

  return createPeriodicFamily({
    carrierLatex,
    parameterConstraintLatex,
    branchesLatex: branches.map((branch) => branch.latex),
    representatives,
    suggestedIntervals,
  });
}

function exactPolynomialDegree(polynomial: ReturnType<typeof parseExactPolynomial>) {
  if (!polynomial || polynomial.terms.size === 0) {
    return 0;
  }

  return Math.max(...polynomial.terms.keys());
}

function matchReducedPolynomialPeriodicCarrier(node: unknown) {
  const polynomial = parseExactPolynomial(normalizeAst(node), 'x', 4);
  if (!polynomial) {
    return null;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree <= 2 || degree > 4) {
    return null;
  }

  return {
    degree,
    polynomial,
  };
}

function isVariableFreeCarrierNode(node: unknown) {
  return !dependsOnVariable(normalizeAst(node), 'x');
}

function matchDirectLogarithmicReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    return dependsOnVariable(normalized[1], 'x') && isDirectAffineInner(normalized[1]);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[2]);
    return Boolean(
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[1], 'x')
      && isDirectAffineInner(normalized[1]),
    );
  }

  return false;
}

function matchDirectExponentialReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    return dependsOnVariable(normalized[1], 'x') && isDirectAffineInner(normalized[1]);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[1]);
    return Boolean(
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[2], 'x')
      && isDirectAffineInner(normalized[2]),
    );
  }

  return false;
}

function matchDirectReducedSingleFamilyCarrier(node: unknown): ReducedSingleFamilyCarrierKind | null {
  const normalized = normalizeAst(node);
  if (matchSharedAbsoluteValueTarget(normalized, 'x')) {
    return 'absolute-value';
  }

  if (matchSupportedRadical(normalized, 'x')) {
    return 'radical';
  }

  if (matchSupportedRationalPower(normalized, 'x')) {
    return 'rational-power';
  }

  if (matchDirectLogarithmicReducedCarrier(normalized)) {
    return 'logarithmic';
  }

  if (matchDirectExponentialReducedCarrier(normalized)) {
    return 'exponential';
  }

  return null;
}

function matchReducedSingleFamilyPeriodicCarrier(node: unknown): ReducedSingleFamilyCarrierKind | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const direct = matchDirectReducedSingleFamilyCarrier(normalized);
  if (direct) {
    return direct;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
  }

  if ((normalized[0] === 'Add' || normalized[0] === 'Subtract') && normalized.length === 3) {
    if (isVariableFreeCarrierNode(normalized[1])) {
      return matchReducedSingleFamilyPeriodicCarrier(normalized[2]);
    }

    if (isVariableFreeCarrierNode(normalized[2])) {
      return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
    }

    return null;
  }

  if (normalized[0] === 'Multiply' && normalized.length >= 3) {
    let matchedCarrier: ReducedSingleFamilyCarrierKind | null = null;
    for (const child of normalized.slice(1)) {
      const childCarrier = matchReducedSingleFamilyPeriodicCarrier(child);
      if (childCarrier) {
        if (matchedCarrier) {
          return null;
        }
        matchedCarrier = childCarrier;
        continue;
      }

      if (!isVariableFreeCarrierNode(child)) {
        return null;
      }
    }

    return matchedCarrier;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    if (!isVariableFreeCarrierNode(normalized[2])) {
      return null;
    }

    return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
  }

  return null;
}

function isMixedReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length < 3 || typeof normalized[0] !== 'string') {
    return false;
  }

  if (!['Add', 'Subtract', 'Multiply', 'Divide'].includes(normalized[0])) {
    return false;
  }

  const variableDependentOperands = normalized
    .slice(1)
    .filter((operand) => dependsOnVariable(normalizeAst(operand), 'x'));
  return variableDependentOperands.length > 1;
}

function classifyReducedCarrierGuidance(node: unknown) {
  const normalized = normalizeAst(node);
  const carrierLatex = boxLatex(normalized);
  const higherDegreePolynomial = parseExactPolynomial(normalized, 'x', 8);
  if (higherDegreePolynomial) {
    const degree = exactPolynomialDegree(higherDegreePolynomial);
    if (degree > 4) {
      return {
        error: `This recognized periodic family reduces to the polynomial carrier ${carrierLatex}, but the current exact reduced-carrier surface only closes bounded polynomial carriers through degree 4. Use Numeric Solve with one of the suggested intervals.`,
        summaryText: `Reduced-carrier boundary: ${carrierLatex} exceeds the current bounded reduced-polynomial degree-4 surface.`,
      };
    }
  }

  if (isMixedReducedCarrier(normalized)) {
    return {
      error: `This recognized periodic family reduces to the mixed carrier ${carrierLatex}, but exact reduced-carrier closure currently supports one admitted carrier family at a time. Use Numeric Solve with one of the suggested intervals.`,
      summaryText: `Reduced-carrier boundary: ${carrierLatex} mixes multiple variable-dependent carrier families, so this milestone stops before mixed reduced-carrier closure.`,
    };
  }

  return {
    error: `This recognized periodic family reduces to ${carrierLatex}, but the remaining continuation leaves the current bounded exact sink set. Use Numeric Solve with one of the suggested intervals.`,
    summaryText: `Continuation boundary: continuing from ${carrierLatex} would leave the current bounded exact sink set.`,
  };
}

function refineSingleFamilyContinuationGuidance(
  result: PeriodicFamilySolveResult,
  outerCarrierNode: unknown,
  familyLabel: string,
): PeriodicFamilySolveResult {
  if (result.kind !== 'guided' || result.family.structuredStopReason) {
    return result;
  }

  const outerLatex = boxLatex(normalizeAst(outerCarrierNode));
  const summaryPrefix = `Continuation boundary: ${outerLatex} is a recognized ${familyLabel} carrier, but finishing its downstream continuation would leave the current bounded exact sink set.`;
  return {
    ...result,
    error: `This recognized ${familyLabel} periodic family reduces through ${outerLatex}, but the remaining continuation leaves the current bounded exact sink set. Use Numeric Solve with one of the suggested intervals.`,
    summaryText: result.summaryText
      ? `${summaryPrefix} ${result.summaryText}`
      : summaryPrefix,
  };
}

function buildReducedCarrierExactFamily(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
) {
  const reducedCarrierLatex = boxLatex(normalizeAst(carrierNode));
  return createPeriodicFamily({
    carrierLatex: reducedCarrierLatex,
    branchesLatex: branches.map((branch) => branch.latex),
    reducedCarrierLatex,
  });
}

function buildTrigPeriodNode(kind: 'sin' | 'cos' | 'tan', angleUnit: AngleUnit): unknown {
  if (angleUnit === 'rad') {
    return kind === 'tan' ? 'Pi' : normalizeAst(['Multiply', 2, 'Pi']);
  }

  if (angleUnit === 'grad') {
    return kind === 'tan' ? 200 : 400;
  }

  return kind === 'tan' ? 180 : 360;
}

function supportsSelectedTwoParameterTanClosure(
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
) {
  return branches.length > 0 && branches.every((branch) => {
    if (!branchDependsOnParameter(branch)) {
      return false;
    }

    if (/\\arc(?:sin|cos|tan)/.test(branch.latex)) {
      return true;
    }

    if (angleUnit === 'rad') {
      return /\\pi/.test(branch.latex);
    }

    return !/\d\.\d|\\,/.test(branch.latex);
  });
}

function buildAffineSolvedNode(
  affine: NonNullable<ReturnType<typeof numericAffineCarrier>>,
  targetNode: unknown,
) {
  const numerator = normalizeAst(['Subtract', targetNode, affine.offsetNode]);
  if (affine.coefficient === 1) {
    return numerator;
  }

  return normalizeAst(['Divide', numerator, affine.coefficient]);
}

function buildTwoParameterTanFamily(
  affine: NonNullable<ReturnType<typeof numericAffineCarrier>>,
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
) {
  const periodNode = buildTrigPeriodNode('tan', angleUnit);
  const solvedBranches = branches.flatMap((branch) => {
    const baseNode = rewriteInverseTrigResultForAngleUnit(['Arctan', branch.node], angleUnit);
    const periodicNode = normalizeAst(['Add', baseNode, ['Multiply', periodNode, 'm']]);
    return [boxLatex(buildAffineSolvedNode(affine, periodicNode))];
  });

  return createPeriodicFamily({
    carrierLatex: 'x',
    parameterLatex: 'k,m\\in\\mathbb{Z}',
    branchesLatex: solvedBranches,
  });
}

function transformExponentialFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = baseNode === 'ExponentialE'
      ? normalizeAst(['Ln', branch.node])
      : normalizeAst(['Log', branch.node, baseNode]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function buildPoweredTarget(target: NumericTarget, numerator: number, denominator: number) {
  return ['Power', target.node, buildScalarNode(numerator, denominator)] as const;
}

function isBareVariable(node: unknown) {
  return normalizeAst(node) === 'x';
}

function isDirectAffineInner(node: unknown) {
  return isBareVariable(node) || Boolean(matchAffineVariableArgument(node));
}

function transformBlocked(error: string): NonPeriodicTransform {
  return {
    equations: buildCompositionBranchSet([]).equations,
    solveBadges: ['Outer Inversion'],
    solveSummaryText: '',
    unresolvedError: error,
  };
}

function matchNonPeriodicTransform(
  node: unknown,
  target: NumericTarget,
  angleUnit: AngleUnit,
): NonPeriodicTransform | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const inverseTrigKind =
    isNodeArray(normalized) && normalized.length === 2 && typeof normalized[0] === 'string'
      ? normalized[0] === 'Arcsin'
        ? 'asin'
        : normalized[0] === 'Arccos'
          ? 'acos'
          : normalized[0] === 'Arctan'
            ? 'atan'
            : null
      : null;

  if (inverseTrigKind && isNodeArray(normalized)) {
    const directInner =
      isNodeArray(normalized[1])
      && normalized[1].length === 2
      && typeof normalized[1][0] === 'string'
      && (
        (inverseTrigKind === 'asin' && normalized[1][0] === 'Sin')
        || (inverseTrigKind === 'acos' && normalized[1][0] === 'Cos')
        || (inverseTrigKind === 'atan' && normalized[1][0] === 'Tan')
      )
        ? normalized[1]
        : null;
    const principalRange = inverseTrigPrincipalRange(inverseTrigKind, angleUnit);
    const principalRangeLatex = buildInverseTrigPrincipalRangeLatex(inverseTrigKind, angleUnit);
    const outerLatex = boxLatex(normalized);
    if (directInner) {
      const reducedCarrierLatex = boxLatex(directInner[1]);
      const directInnerRange = proveRealRange(directInner[1]);
      if (
        directInnerRange.kind === 'exact'
        && intervalWithinPrincipalRange(directInnerRange.interval, principalRange)
      ) {
        return {
          equations: buildCompositionBranchSet([buildEquationLatex(directInner[1], target.node)]).equations,
          solveBadges: ['Principal Range'],
          solveSummaryText: `Principal range: ${reducedCarrierLatex} stays in ${formatRangeInterval(directInnerRange.interval)}, so ${outerLatex} reduces to ${reducedCarrierLatex}=${target.latex}.`,
          unresolvedError: 'This recognized inverse/direct trig identity is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
          exactSupplementLatex: [
            `\\text{Principal range: } ${principalRangeLatex}`,
            `\\text{Canonical reduction: } ${outerLatex}=${reducedCarrierLatex}`,
          ],
          detailSections: [
            {
              title: 'Piecewise Exact',
              lines: [
                `${outerLatex} = ${reducedCarrierLatex} when ${reducedCarrierLatex} stays in ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
              ],
            },
          ],
          periodicFamilyExtras: {
            principalRangeLatex,
            reducedCarrierLatex,
            piecewiseBranches: [
              {
                conditionLatex: `${reducedCarrierLatex}\\in${principalRangeLatex}`,
                resultLatex: `${outerLatex}=${reducedCarrierLatex}`,
              },
            ] as PeriodicPiecewiseBranch[],
          },
        };
      }

      if (!isWithinPrincipalRange(target.value, principalRange)) {
        const label =
          inverseTrigKind === 'asin'
            ? 'arcsin'
            : inverseTrigKind === 'acos'
              ? 'arccos'
              : 'arctan';
        return {
          equations: buildCompositionBranchSet([]).equations,
          solveBadges: ['Principal Range'],
          solveSummaryText: `Principal range: ${outerLatex} cannot equal ${target.latex} because ${label} only returns values on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
          unresolvedError: `No real solutions because ${label} returns principal values only on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
          exactSupplementLatex: [`\\text{Principal range: } ${principalRangeLatex}`],
          periodicFamilyExtras: {
            carrierLatex: reducedCarrierLatex,
            parameterLatex: 'k\\in\\mathbb{Z}',
            branchesLatex: [],
            principalRangeLatex,
            reducedCarrierLatex,
            structuredStopReason: 'outside-principal-range',
          },
        };
      }

      const mappedKind =
        inverseTrigKind === 'asin'
          ? 'sin'
          : inverseTrigKind === 'acos'
            ? 'cos'
            : 'tan';
      const invertedTarget = buildInverseTrigValueTarget(mappedKind, target, angleUnit);
      if (!invertedTarget) {
        return null;
      }
      const template = buildTrigPeriodicTemplate(mappedKind, invertedTarget.value, invertedTarget.latex, angleUnit);
      const piecewiseBranches = template
        ? template.branches.map((branch) => ({
            conditionLatex: `${reducedCarrierLatex}=${branch.latex}`,
            resultLatex: `${outerLatex}=${target.latex}`,
          }))
        : [];

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(directInner, invertedTarget.node)]).equations,
        solveBadges: ['Outer Inversion', 'Principal Range'],
        solveSummaryText: `Sawtooth closure: ${outerLatex}=${target.latex} reduces to ${boxLatex(directInner)}=${invertedTarget.latex} on bounded principal-range branches.`,
        unresolvedError: 'This recognized inverse/direct trig identity is outside the current exact bounded sawtooth-closure set. Use Numeric Solve with a chosen interval in Equation mode.',
        exactSupplementLatex: [`\\text{Principal range: } ${principalRangeLatex}`],
        detailSections: [
          {
            title: 'Piecewise Exact',
            lines: [
              `${outerLatex} matches ${target.latex} on the bounded sawtooth branches of ${reducedCarrierLatex}.`,
            ],
          },
        ],
        periodicFamilyExtras: {
          carrierLatex: reducedCarrierLatex,
          parameterLatex: 'k\\in\\mathbb{Z}',
          branchesLatex: [],
          principalRangeLatex,
          reducedCarrierLatex,
          piecewiseBranches,
        },
      };
    }

    if (!isWithinPrincipalRange(target.value, principalRange)) {
      const label =
        inverseTrigKind === 'asin'
          ? 'arcsin'
          : inverseTrigKind === 'acos'
            ? 'arccos'
            : 'arctan';
      return transformBlocked(
        `No real solutions because ${label} returns principal values only on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
      );
    }

    const invertedTarget = buildInverseTrigValueTarget(
      inverseTrigKind === 'asin'
        ? 'sin'
        : inverseTrigKind === 'acos'
          ? 'cos'
          : 'tan',
      target,
      angleUnit,
    );
    if (!invertedTarget) {
      return null;
    }

    return {
      equations: buildCompositionBranchSet([buildEquationLatex(normalized[1], invertedTarget.node)]).equations,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${invertedTarget.latex}`,
      unresolvedError: 'This recognized inverse-trig composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', 'ExponentialE', target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=e^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', 10, target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=10^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const base = parseNumericTarget(normalized[2]);
    if (!base || base.value <= 0 || Math.abs(base.value - 1) < EPSILON) {
      return null;
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', normalized[2], target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(normalized[2])}^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value <= 0) {
      return transformBlocked('No real solutions because exponential expressions are always positive.');
    }

    return {
      equations: buildCompositionBranchSet([buildEquationLatex(normalized[1], ['Ln', target.node])]).equations,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=\\ln\\left(${target.latex}\\right)`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = normalized[1];
    const exponent = normalized[2];
    const numericBase = parseNumericTarget(base);

    if (base === 'ExponentialE' && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(exponent, ['Ln', target.node])]).equations,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\ln\\left(${target.latex}\\right)`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    if (numericBase && numericBase.value > 0 && Math.abs(numericBase.value - 1) > EPSILON && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(exponent, ['Divide', ['Ln', target.node], ['Ln', base]])]).equations,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\frac{\\ln\\left(${target.latex}\\right)}{\\ln\\left(${boxLatex(base)}\\right)}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    const exponentScalar = readExactScalar(exponent);
    if (dependsOnVariable(base, 'x') && !isDirectAffineInner(base) && exponentScalar && exponentScalar.numerator > 0 && exponentScalar.denominator > 1) {
      const numerator = exponentScalar.numerator;
      const denominator = exponentScalar.denominator;
      const inversePower = buildPoweredTarget(target, denominator, numerator);

      if (denominator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because an even-root composition cannot equal a negative target in the real domain.');
      }

      if (numerator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because this rational-power composition is non-negative over the real domain.');
      }

      const equations = [buildEquationLatex(base, inversePower)];
      if (denominator % 2 !== 0 && numerator % 2 === 0) {
        equations.push(buildEquationLatex(base, ['Negate', inversePower]));
      }
      const branchSet = buildCompositionBranchSet(
        equations,
        denominator % 2 === 0
          ? [{ kind: 'nonnegative', expressionLatex: boxLatex(base) }]
          : undefined,
      );

      return {
        equations: branchSet.equations,
        domainConstraints: branchSet.constraints,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Lifted ${boxLatex(normalized)} into ${branchSet.equations.join(',\\;')}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', target.node, 2])],
      [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, 2])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Root' && normalized.length === 3 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const index = parseNumericTarget(normalized[2]);
    if (!index || !Number.isInteger(index.value) || index.value < 2) {
      return null;
    }

    if (index.value % 2 === 0 && target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', target.node, index.value])],
      index.value % 2 === 0
        ? [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }]
        : undefined,
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, index.value])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

type NormalizedTrigComposite =
  | {
      kind: 'normalized';
      trigKind: 'sin' | 'cos' | 'tan';
      target: NumericTarget;
      inner: unknown;
      innerLatex: string;
      outerLatex: string;
      reducedCarrierLatex?: string;
      solveBadges?: SolveBadge[];
      summaryPrefix?: string;
    }
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
      reducedCarrierLatex?: string;
      structuredStopReason?: PeriodicFamilyInfo['structuredStopReason'];
    };

function buildReciprocalTarget(target: NumericTarget): NumericTarget {
  const node = normalizeAst(['Divide', 1, target.node]);
  return {
    node,
    latex: boxLatex(node),
    value: 1 / target.value,
  };
}

function normalizeTrigComposite(
  node: unknown,
  target: NumericTarget,
): NormalizedTrigComposite | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length !== 2 || typeof normalized[0] !== 'string') {
    return null;
  }

  const operator = normalized[0];
  const inner = normalized[1];
  if (!dependsOnVariable(inner, 'x')) {
    return null;
  }

  const innerLatex = boxLatex(inner);
  const outerLatex = boxLatex(normalized);

  if (operator === 'Sin' || operator === 'Cos' || operator === 'Tan') {
    return {
      kind: 'normalized',
      trigKind: operator === 'Sin' ? 'sin' : operator === 'Cos' ? 'cos' : 'tan',
      target,
      inner,
      innerLatex,
      outerLatex,
    };
  }

  if (operator === 'Sec' || operator === 'Csc') {
    if (Math.abs(target.value) <= EPSILON || Math.abs(target.value) < 1 - EPSILON) {
      return {
        kind: 'impossible',
        error: `No real solutions because ${operator === 'Sec' ? '\\sec' : '\\csc'} only takes values with |y|\\ge1 and never 0.`,
        summaryText: `Reciprocal rewrite: ${outerLatex}=${target.latex} would require ${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)=${boxLatex(['Divide', 1, target.node])}, but reciprocal trig targets must satisfy |${target.latex}|\\ge1 and ${target.latex}\\ne0.`,
        solveBadges: ['Reciprocal Rewrite'],
        reducedCarrierLatex: `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`,
      };
    }

    const reciprocalTarget = buildReciprocalTarget(target);
    const reducedCarrierLatex = `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: operator === 'Sec' ? 'cos' : 'sin',
      target: reciprocalTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${reciprocalTarget.latex}.`,
    };
  }

  if (operator === 'Cot') {
    const cotTarget = Math.abs(target.value) <= EPSILON
      ? {
          node: 0 as unknown,
          latex: '0',
          value: 0,
        } satisfies NumericTarget
      : buildReciprocalTarget(target);
    const reducedCarrierLatex = `${Math.abs(target.value) <= EPSILON ? '\\cos' : '\\tan'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: Math.abs(target.value) <= EPSILON ? 'cos' : 'tan',
      target: cotTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${cotTarget.latex}.`,
    };
  }

  return null;
}

function solveTrigOnInterval(
  kind: 'sin' | 'cos' | 'tan',
  target: number,
  intervalMin: number,
  intervalMax: number,
  angleUnit: AngleUnit,
): number[] | null {
  if (!Number.isFinite(intervalMin) || !Number.isFinite(intervalMax)) {
    return null;
  }

  if ((kind === 'sin' || kind === 'cos') && (target < -1 - EPSILON || target > 1 + EPSILON)) {
    return [];
  }

  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const period = kind === 'tan' ? Math.PI : Math.PI * 2;
  const bases =
    kind === 'sin'
      ? [Math.asin(target), Math.PI - Math.asin(target)]
      : kind === 'cos'
        ? [Math.acos(target), -Math.acos(target)]
        : [Math.atan(target)];

  const solutions = new Set<number>();
  for (const base of bases) {
    if (!Number.isFinite(base)) {
      continue;
    }

    const startK = Math.ceil((lower - base) / period - EPSILON);
    const endK = Math.floor((upper - base) / period + EPSILON);
    for (let k = startK; k <= endK; k += 1) {
      const valueRad = base + k * period;
      if (valueRad < lower - EPSILON || valueRad > upper + EPSILON) {
        continue;
      }
      solutions.add(convertAngle(valueRad, 'rad', angleUnit));
      if (solutions.size > MAX_TRIG_BRANCHES) {
        return null;
      }
    }
  }

  return dedupeNumericRoots([...solutions]);
}

function criticalAngles(kind: 'sin' | 'cos', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const base = kind === 'sin' ? Math.PI / 2 : 0;
  const period = Math.PI;
  const points: number[] = [];
  const startK = Math.ceil((lower - base) / period - EPSILON);
  const endK = Math.floor((upper - base) / period + EPSILON);
  for (let k = startK; k <= endK; k += 1) {
    const point = base + k * period;
    if (point >= lower - EPSILON && point <= upper + EPSILON) {
      points.push(point);
    }
  }
  return points;
}

function trigValue(kind: 'sin' | 'cos' | 'tan', valueRad: number) {
  if (kind === 'sin') {
    return Math.sin(valueRad);
  }
  if (kind === 'cos') {
    return Math.cos(valueRad);
  }
  return Math.tan(valueRad);
}

function composeTrigImage(kind: 'sin' | 'cos' | 'tan', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const samplePoints = [lower, upper];

  if (kind === 'sin' || kind === 'cos') {
    samplePoints.push(...criticalAngles(kind, intervalMin, intervalMax, angleUnit));
  } else {
    const asymptoteBase = Math.PI / 2;
    const period = Math.PI;
    const startK = Math.ceil((lower - asymptoteBase) / period - EPSILON);
    const endK = Math.floor((upper - asymptoteBase) / period + EPSILON);
    if (startK <= endK) {
      return null;
    }
  }

  const values = samplePoints.map((point) => trigValue(kind, point));
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    minInclusive: true,
    maxInclusive: true,
  };
}

function matchTrigBranches(node: unknown, target: NumericTarget, angleUnit: AngleUnit): TrigBranchResult | null {
  const normalizedTrig = normalizeTrigComposite(node, target);
  if (!normalizedTrig) {
    return null;
  }

  if (normalizedTrig.kind === 'impossible') {
    return normalizedTrig;
  }

  if (isDirectAffineInner(normalizedTrig.inner)) {
    return null;
  }

  const { trigKind: kind, target: effectiveTarget, inner, innerLatex, outerLatex, summaryPrefix } = normalizedTrig;
  const innerProof: ReturnType<typeof proveRealRange> = proveRealRange(inner);

  if (innerProof.kind !== 'exact') {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`
        : `Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchValues = solveTrigOnInterval(
    kind,
    effectiveTarget.value,
    innerProof.interval.min,
    innerProof.interval.max,
    angleUnit,
  );

  if (branchValues === null) {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves too many inverse branches for the current bounded symbolic solve set. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`
        : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  if (branchValues.length === 0) {
    const outerImage = composeTrigImage(kind, innerProof.interval.min, innerProof.interval.max, angleUnit);
    return {
      kind: 'impossible',
      error: 'No real solutions because the proven inner image makes the outer trig target unreachable.',
      summaryText: outerImage
        ? summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
        : summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} cannot equal ${effectiveTarget.latex}.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchSet = buildCompositionBranchSet(
    branchValues.map((value) => `${innerLatex}=${formatBranchConstant(value, angleUnit)}`),
  );
  return {
    kind: 'branches',
    equations: branchSet.equations,
    summaryText: summaryPrefix
      ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex}=${effectiveTarget.latex} reduces to ${branchSet.equations.join(',\\;')}.`
      : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex}=${effectiveTarget.latex} reduces to ${branchSet.equations.join(',\\;')}.`,
    solveBadges: normalizedTrig.solveBadges,
  };
}

function transformLogFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', baseNode, branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function transformLnFamilyBranches(branches: SymbolicFamilyBranch[]) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', 'ExponentialE', branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function trigCarrierRange(kind: 'sin' | 'cos' | 'tan') {
  if (kind === 'tan') {
    return null;
  }

  return {
    min: -1,
    max: 1,
  };
}

function solveNestedTrigCarrierPeriodicFamily(
  normalized: unknown[],
  kind: 'sin' | 'cos' | 'tan',
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[],
  supplementLatex: string[],
  periodicNestingDepth: number,
  executionBudget: EquationExecutionBudget,
): PeriodicFamilySolveResult {
  const inner = normalized[1];
  const family: PeriodicFamilyInfo = {
    ...buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized),
    reducedCarrierLatex: boxLatex(normalized),
  };
  const discoveredFamilies = [periodicFamilyToExactLatex(family)];

  if (periodicNestingDepth >= executionBudget.maxPeriodicReductionDepth) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies({
        ...family,
        structuredStopReason: 'periodic-depth-cap',
      }, discoveredFamilies),
      error: 'This recognized periodic family reaches the current bounded periodic-reduction depth cap before exact closure. Use Numeric Solve with one of the suggested intervals.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Further reducing ${boxLatex(normalized)} would exceed the current bounded three-step periodic reduction cap.`,
      solveBadges: ['Nested Recursion'],
    };
  }

  const affineInner = numericAffineCarrier(inner);
  if (
    kind === 'tan'
    && affineInner
    && periodicNestingDepth === 0
    && supportsSelectedTwoParameterTanClosure(branches, angleUnit)
  ) {
    const solvedFamily = buildTwoParameterTanFamily(affineInner, branches, angleUnit);
    return {
      kind: 'solved',
      family: appendDiscoveredFamilies(
        solvedFamily,
        dedupe([...discoveredFamilies, periodicFamilyToExactLatex(solvedFamily)]),
      ),
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: '',
      solveBadges: ['Nested Recursion'],
    };
  }

  let constantBranches = branches;
  if (branches.some(branchDependsOnParameter)) {
    const range = trigCarrierRange(kind);
    if (!range) {
      return {
        kind: 'guided',
        family: appendDiscoveredFamilies({
          ...family,
          structuredStopReason: 'multi-parameter-periodic-family',
        }, discoveredFamilies),
        error: 'This recognized periodic family would require a second independent periodic parameter to continue exactly. Use Numeric Solve with one of the suggested intervals.',
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `Further reducing ${boxLatex(normalized)} would introduce another periodic branch parameter beyond the current bounded exact solve set.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    const expanded = expandBranchesWithinInterval(branches, range.min, range.max);
    if (expanded === null) {
      return {
        kind: 'guided',
        family: appendDiscoveredFamilies({
          ...family,
          structuredStopReason: 'unmerged-periodic-branches',
        }, discoveredFamilies),
        error: 'This recognized periodic family leaves too many bounded follow-on trig branches to merge into a single exact family. Use Numeric Solve with one of the suggested intervals.',
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `Further reducing ${boxLatex(normalized)} would require bounded periodic branch merging beyond the current exact solve set.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    if (expanded.length === 0) {
      return {
        kind: 'guided',
        family: appendDiscoveredFamilies(family, discoveredFamilies),
        error: `No real solutions remain because this periodic family never enters the real range of ${kind}.`,
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `All periodic targets for ${boxLatex(normalized)} stay outside the real range of ${kind}.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    constantBranches = expanded;
  }

  const transformedBranches: SymbolicFamilyBranch[] = [];
  for (const branch of constantBranches) {
    const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
    if (!target) {
      continue;
    }

    const template = buildTrigPeriodicTemplate(kind, target.value, target.latex, angleUnit);
    if (!template) {
      continue;
    }

    transformedBranches.push(...template.branches.map(buildSymbolicFamilyBranch));
  }

  const dedupedTransformedBranches = dedupeSymbolicFamilyBranches(transformedBranches);
  if (dedupedTransformedBranches.length === 0) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies(family, discoveredFamilies),
      error: 'No real solutions remain after reducing this nested periodic carrier in the real domain.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Reducing ${boxLatex(normalized)} left no real bounded branch targets to continue exactly.`,
      solveBadges: ['Nested Recursion'],
    };
  }

  const nextFamily = buildPeriodicFamilyInfo(
    boxLatex(inner),
    dedupedTransformedBranches,
    constraints,
    angleUnit,
    inner,
  );
  const recursive = appendPeriodicSolveBadges(
    resolveCarrierPeriodicFamily(
      inner,
      dedupedTransformedBranches,
      angleUnit,
      constraints,
      supplementLatex,
      periodicNestingDepth + 1,
      executionBudget,
    ),
    ['Nested Recursion'],
  );
  return appendDiscoveredFamiliesToResult(
    recursive,
    dedupe([...discoveredFamilies, periodicFamilyToExactLatex(nextFamily)]),
  );
}

function solveNestedInverseTrigCarrierPeriodicFamily(
  normalized: unknown[],
  kind: 'asin' | 'acos' | 'atan',
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[],
  supplementLatex: string[],
  periodicNestingDepth: number,
  executionBudget: EquationExecutionBudget,
): PeriodicFamilySolveResult {
  const inner = normalized[1];
  const inverseTrigLatex =
    kind === 'asin'
      ? '\\arcsin'
      : kind === 'acos'
        ? '\\arccos'
        : '\\arctan';
  const principalRangeLatex = buildInverseTrigPrincipalRangeLatex(kind, angleUnit);
  const family: PeriodicFamilyInfo = {
    ...buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized),
    reducedCarrierLatex: boxLatex(normalized),
    principalRangeLatex,
  };
  const discoveredFamilies = [periodicFamilyToExactLatex(family)];

  if (periodicNestingDepth >= executionBudget.maxPeriodicReductionDepth) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies({
        ...family,
        structuredStopReason: 'periodic-depth-cap',
      }, discoveredFamilies),
      error: 'This recognized inverse-trig periodic family reaches the current bounded periodic-reduction depth cap before exact closure. Use Numeric Solve with one of the suggested intervals.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Further reducing ${boxLatex(normalized)} would exceed the current bounded three-step periodic reduction cap.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const expanded = expandBranchesWithinInterval(branches, range.min, range.max);

  if (expanded === null) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies({
        ...family,
        structuredStopReason: 'unsupported-sawtooth-closure',
      }, discoveredFamilies),
      error: 'This recognized inverse-trig periodic family still needs broader branch pruning than the current bounded exact solve set supports. Use Numeric Solve with one of the suggested intervals.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Further reducing ${boxLatex(normalized)} would require broader principal-range branch pruning than the current exact solve set supports.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  if (expanded.length === 0) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies({
        ...family,
        structuredStopReason: 'outside-principal-range',
      }, discoveredFamilies),
      error: `No real solutions remain because this periodic family never enters the principal range ${buildInverseTrigPrincipalRangeMessage(kind, angleUnit)} of ${inverseTrigLatex}.`,
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `All periodic targets for ${boxLatex(normalized)} fall outside its principal range ${buildInverseTrigPrincipalRangeMessage(kind, angleUnit)}.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  const mappedKind =
    kind === 'asin'
      ? 'sin'
      : kind === 'acos'
        ? 'cos'
        : 'tan';

  const transformedBranches = expanded.flatMap((branch) => {
    const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
    if (!target) {
      return [];
    }

    const valueTarget = buildInverseTrigValueTarget(mappedKind, target, angleUnit);
    if (!valueTarget) {
      return [];
    }
    return [buildSymbolicFamilyBranchFromNode(valueTarget.node, valueTarget.value)];
  });

  const dedupedTransformedBranches = dedupeSymbolicFamilyBranches(transformedBranches);
  if (dedupedTransformedBranches.length === 0) {
    return {
      kind: 'guided',
      family: appendDiscoveredFamilies(family, discoveredFamilies),
      error: 'No real solutions remain after bounded inverse-trig branch reduction.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Reducing ${boxLatex(normalized)} left no real branch targets to continue exactly.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  const nextFamily = buildPeriodicFamilyInfo(
    boxLatex(inner),
    dedupedTransformedBranches,
    constraints,
    angleUnit,
    inner,
  );
  const recursive = appendPeriodicSolveBadges(
    resolveCarrierPeriodicFamily(
      inner,
      dedupedTransformedBranches,
      angleUnit,
      constraints,
      supplementLatex,
      periodicNestingDepth,
      executionBudget,
    ),
    ['Nested Recursion', 'Principal Range'],
  );
  return appendDiscoveredFamiliesToResult(
    recursive,
    dedupe([...discoveredFamilies, periodicFamilyToExactLatex(nextFamily)]),
  );
}

function resolveCarrierPeriodicFamily(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[] = [],
  supplementLatex: string[] = [],
  periodicNestingDepth = 0,
  executionBudget: EquationExecutionBudget,
): PeriodicFamilySolveResult {
  const normalized = normalizeAst(carrierNode);
  const affine = numericAffineCarrier(normalized);
  if (affine) {
    const solvedBranches = transformAffineBranches(affine, branches);
    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo('x', solvedBranches, constraints, angleUnit, 'x'),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
    };
  }

  const shiftedCarrier = matchShiftedSupportedCarrier(normalized);
  if (shiftedCarrier) {
    return resolveCarrierPeriodicFamily(
      shiftedCarrier.innerNode,
      buildShiftedCarrierBranches(shiftedCarrier, branches),
      angleUnit,
      constraints,
      supplementLatex,
      periodicNestingDepth,
      executionBudget,
    );
  }

  const parameterizedPower = matchParameterizedPowerCarrier(normalized);
  if (parameterizedPower) {
    const transformed = buildParameterizedPowerBranches(parameterizedPower, branches);
    if (transformed.branches.length === 0) {
      return {
        kind: 'guided',
      family: buildPeriodicFamilyInfo('x', [], constraints, angleUnit, 'x'),
      error: 'No real solutions remain because this even-power periodic family requires a negative branch target in the real domain.',
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
        solveBadges: ['Parameterized Family'],
      };
    }

    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo(
        'x',
        transformed.branches,
        constraints,
        angleUnit,
        'x',
        transformed.parameterConstraintLatex,
      ),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
      solveBadges: ['Parameterized Family'],
    };
  }

  const parameterizedRationalPower = matchParameterizedRationalPowerCarrier(normalized);
  if (parameterizedRationalPower) {
    const transformed = buildParameterizedRationalPowerBranches(parameterizedRationalPower, branches);
    const mergedConstraints = mergeConstraints(constraints, transformed.domainConstraints);
    if (transformed.branches.length === 0) {
      return {
        kind: 'guided',
        family: buildPeriodicFamilyInfo('x', [], mergedConstraints, angleUnit, 'x'),
        error: 'No real solutions remain because this rational-power periodic family requires branch targets that stay in the real-domain image of the carrier.',
        domainConstraints: mergedConstraints,
        supplementLatex,
        summaryText: '',
        solveBadges: ['Parameterized Family'],
      };
    }

    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo(
        'x',
        transformed.branches,
        mergedConstraints,
        angleUnit,
        'x',
        transformed.parameterConstraintLatex,
      ),
      domainConstraints: mergedConstraints,
      supplementLatex,
      summaryText: '',
      solveBadges: ['Parameterized Family'],
    };
  }

  const quadraticCarrier = matchQuadraticCarrier(normalized);
  if (quadraticCarrier) {
    const transformed = buildQuadraticBranches(quadraticCarrier, branches);
    if (transformed.branches.length === 0) {
      return {
        kind: 'guided',
        family: buildPeriodicFamilyInfo('x', [], constraints, angleUnit, 'x'),
        error: 'No real solutions remain because this quadratic periodic family requires a negative discriminant in the real domain.',
        domainConstraints: constraints,
        supplementLatex,
        summaryText: '',
        solveBadges: ['Parameterized Family'],
      };
    }

    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo(
        'x',
        transformed.branches,
        constraints,
        angleUnit,
        'x',
        transformed.parameterConstraintLatex,
      ),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
      solveBadges: ['Parameterized Family'],
    };
  }

  const reducedPolynomialCarrier = matchReducedPolynomialPeriodicCarrier(normalized);
  if (reducedPolynomialCarrier) {
    return {
      kind: 'solved',
      family: buildReducedCarrierExactFamily(normalized, branches),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && typeof normalized[0] === 'string') {
    const directTrigKind =
      normalized[0] === 'Sin'
        ? 'sin'
        : normalized[0] === 'Cos'
          ? 'cos'
          : normalized[0] === 'Tan'
            ? 'tan'
            : null;
    if (directTrigKind && dependsOnVariable(normalized[1], 'x')) {
      return solveNestedTrigCarrierPeriodicFamily(
        normalized,
        directTrigKind,
        branches,
        angleUnit,
        constraints,
        supplementLatex,
        periodicNestingDepth,
        executionBudget,
      );
    }

    const inverseTrigKind =
      normalized[0] === 'Arcsin'
        ? 'asin'
        : normalized[0] === 'Arccos'
          ? 'acos'
          : normalized[0] === 'Arctan'
            ? 'atan'
            : null;
    if (inverseTrigKind && dependsOnVariable(normalized[1], 'x')) {
      return solveNestedInverseTrigCarrierPeriodicFamily(
        normalized,
        inverseTrigKind,
        branches,
        angleUnit,
        constraints,
        supplementLatex,
        periodicNestingDepth,
        executionBudget,
      );
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    return refineSingleFamilyContinuationGuidance(
      resolveCarrierPeriodicFamily(
        normalized[1],
        transformLnFamilyBranches(branches),
        angleUnit,
        mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
        supplementLatex,
        periodicNestingDepth,
        executionBudget,
      ),
      normalized,
      'logarithmic',
    );
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 2) {
    return refineSingleFamilyContinuationGuidance(
      resolveCarrierPeriodicFamily(
        normalized[1],
        transformLogFamilyBranches(branches, 10),
        angleUnit,
        mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
        supplementLatex,
        periodicNestingDepth,
        executionBudget,
      ),
      normalized,
      'logarithmic',
    );
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[2]);
    if (base && base.value > 0 && Math.abs(base.value - 1) > EPSILON) {
      return refineSingleFamilyContinuationGuidance(
        resolveCarrierPeriodicFamily(
          normalized[1],
          transformLogFamilyBranches(branches, normalized[2]),
          angleUnit,
          mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
          supplementLatex,
          periodicNestingDepth,
          executionBudget,
        ),
        normalized,
        'logarithmic',
      );
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[1]);
    if (
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[2], 'x')
      && !dependsOnVariable(normalized[1], 'x')
    ) {
      return refineSingleFamilyContinuationGuidance(
        resolveCarrierPeriodicFamily(
          normalized[2],
          transformExponentialFamilyBranches(branches, normalized[1]),
          angleUnit,
          constraints,
          buildPeriodicBranchConditionSupplement(
            branches.map((branch) => `${branch.latex}>0`),
          ),
          periodicNestingDepth,
          executionBudget,
        ),
        normalized,
        'exponential',
      );
    }
  }

  const reducedSingleFamilyCarrier = matchReducedSingleFamilyPeriodicCarrier(normalized);
  if (reducedSingleFamilyCarrier) {
    return {
      kind: 'solved',
      family: buildReducedCarrierExactFamily(normalized, branches),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
    };
  }

  const family = buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized);
  const unresolvedGuidance = classifyReducedCarrierGuidance(normalized);
  return {
    kind: 'guided',
    family: appendDiscoveredFamilies(family, [periodicFamilyToExactLatex(family)]),
    error: unresolvedGuidance.error,
    domainConstraints: constraints,
    supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
    summaryText: unresolvedGuidance.summaryText,
  };
}

function solveTrigPeriodicFamily(
  node: unknown,
  target: NumericTarget,
  request: GuardedSolveRequest,
  executionBudget: EquationExecutionBudget,
): PeriodicFamilySolveResult | null {
  const normalizedTrig = normalizeTrigComposite(node, target);
  if (!normalizedTrig) {
    return null;
  }

  if (normalizedTrig.kind === 'impossible') {
    return {
      kind: 'guided',
      family: {
        carrierLatex: normalizedTrig.reducedCarrierLatex ?? normalizedTrig.summaryText,
        parameterLatex: 'k\\in\\mathbb{Z}',
        branchesLatex: [],
        reducedCarrierLatex: normalizedTrig.reducedCarrierLatex,
        structuredStopReason: normalizedTrig.structuredStopReason,
      },
      error: normalizedTrig.error,
      summaryText: normalizedTrig.summaryText,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const { trigKind: kind, target: effectiveTarget, inner, reducedCarrierLatex, solveBadges, summaryPrefix } = normalizedTrig;
  const innerIsDirect = Boolean(numericAffineCarrier(inner));
  if ((request.compositionInversionDepth ?? 0) === 0 && innerIsDirect && !(solveBadges?.length)) {
    return null;
  }

  const template = buildTrigPeriodicTemplate(kind, effectiveTarget.value, effectiveTarget.latex, request.angleUnit);
  if (!template) {
    return {
      kind: 'guided',
      family: {
        carrierLatex: boxLatex(inner),
        parameterLatex: 'k\\in\\mathbb{Z}',
        branchesLatex: [],
        reducedCarrierLatex,
      },
      error: 'No real solutions because this trig target lies outside the real range of the carrier.',
      summaryText: summaryPrefix ?? '',
      solveBadges,
    };
  }

  const resolved = resolveCarrierPeriodicFamily(
    inner,
    template.branches.map(buildSymbolicFamilyBranch),
    request.angleUnit,
    undefined,
    undefined,
    request.periodicReductionDepth ?? 0,
    executionBudget,
  );
  if (!summaryPrefix && !reducedCarrierLatex && !(solveBadges?.length)) {
    return resolved;
  }

  return {
    ...resolved,
    family: {
      ...resolved.family,
      reducedCarrierLatex: reducedCarrierLatex ?? resolved.family.reducedCarrierLatex,
    },
    summaryText: summaryPrefix
      ? resolved.kind === 'solved'
        && summaryPrefix.startsWith('Sawtooth closure:')
        && isReducedCarrierExactFamily(resolved.family)
          ? `Exact reduced-carrier sawtooth family: ${boxLatex(normalizeAst(node))}=${target.latex} closes over ${resolved.family.carrierLatex}.`
          : resolved.summaryText
            ? `${summaryPrefix} ${resolved.summaryText}`
            : summaryPrefix
      : resolved.summaryText,
    solveBadges: dedupe([...(resolved.solveBadges ?? []), ...(solveBadges ?? [])]),
  };
}

function recurseComposition(
  request: GuardedSolveRequest,
  equations: string[],
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
  badges: SolveBadge[],
  summaryText: string,
  domainConstraints: SolveDomainConstraint[] = [],
  unresolvedError?: string,
  extraSupplementLatex: string[] = [],
  extraDetailSections: DisplayDetailSection[] = [],
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>,
): DisplayOutcome | null {
  const depthPolicy = resolveCompositionRecursionDepth(
    request.compositionInversionDepth ?? 0,
    executionBudget,
  );
  if (depthPolicy.kind === 'blocked') {
    return compositionDepthLimitError(badges, summaryText);
  }
  const nextCompositionDepth = depthPolicy.nextDepth;

  const effectiveBadges = withNestedRecursionBadges(badges);
  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      effectiveBadges,
      summaryText,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = dedupe(equations).filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    return null;
  }

  const recursiveOutcomes = branchEquations.map((equationLatex) =>
    runGuardedEquationSolve(
      {
        ...request,
        originalLatex: equationLatex,
        resolvedLatex: equationLatex,
        validationLatex: request.validationLatex ?? request.resolvedLatex,
        compositionInversionDepth: nextCompositionDepth,
        numericInterval: undefined,
        domainConstraints: mergeConstraints(request.domainConstraints, domainConstraints),
      },
      depth + 1,
      new Set(trail),
    ));

  const merged = recursiveOutcomes.length === 1
    ? recursiveOutcomes[0]
    : mergeDisplayOutcomes(recursiveOutcomes, effectiveBadges, summaryText);

  const mergedPeriodicFamilyWithStructuredStop = (() => {
    const mergedFamily = merged.kind === 'prompt'
      ? undefined
      : mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras);
    if (
      merged.kind === 'error'
      && mergedFamily
      && !mergedFamily.structuredStopReason
      && periodicFamilyExtras?.piecewiseBranches?.length
    ) {
      return {
        ...mergedFamily,
        structuredStopReason: 'unsupported-sawtooth-closure',
      } satisfies PeriodicFamilyInfo;
    }
    return mergedFamily;
  })();

  if (merged.kind === 'error' && merged.error === UNSUPPORTED_FAMILY_ERROR && unresolvedError) {
    return errorOutcome(
      'Solve',
      unresolvedError,
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges]),
      summaryText,
      merged.rejectedCandidateCount,
      merged.substitutionDiagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind === 'error') {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    return appendSolveMetadata({
      ...merged,
      periodicFamily: mergedPeriodicFamilyWithStructuredStop,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
    }, effectiveBadges, summaryText);
  }

  if (merged.kind === 'prompt') {
    return appendSolveMetadata(merged, effectiveBadges, summaryText);
  }

  const validationCandidates = collectOutcomeCandidates(merged);
  if (validationCandidates.length === 0) {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    const mergedPeriodicFamily = mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras);
    if (
      mergedPeriodicFamily
      && isReducedCarrierExactFamily(mergedPeriodicFamily)
      && (mergedPeriodicFamily.piecewiseBranches?.length ?? 0) > 0
      && periodicFamilyExtras?.piecewiseBranches?.length
    ) {
      return {
        ...merged,
        periodicFamily: mergedPeriodicFamily,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        detailSections: detailSections.length > 0 ? detailSections : undefined,
        solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges]),
        solveSummaryText: buildReducedCarrierSawtoothSummary(request.resolvedLatex, mergedPeriodicFamily),
      };
    }

    return appendSolveMetadata({
      ...merged,
      periodicFamily: mergedPeriodicFamily,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
    }, effectiveBadges, summaryText);
  }

  const validation = validateCompositionCandidates(
    request.validationLatex ?? request.resolvedLatex,
    validationCandidates,
    mergeConstraints(request.domainConstraints, domainConstraints),
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    return {
      kind: 'error',
      title: 'Solve',
      error: compositionRejectionMessage(validation.rejected, domainConstraints),
      exactLatex: merged.exactLatex,
      periodicFamily: mergedPeriodicFamilyWithStructuredStop,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      approxText: merged.approxText,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
      warnings: merged.warnings,
      plannerBadges: merged.plannerBadges ?? [],
      solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
      solveSummaryText: summaryText,
      rejectedCandidateCount: validation.rejected.length,
      substitutionDiagnostics: merged.substitutionDiagnostics,
      numericMethod: merged.numericMethod,
    };
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const exactLatex = acceptedExactLatex.length === validation.accepted.length
    && acceptedExactLatex.length > 0
    && acceptedExactLatex.every((value) => !isApproximateOnlySolutionLatex(value))
      ? solutionsToLatex('x', acceptedExactLatex)
      : undefined;
  const branchReadback = exactLatex && acceptedExactLatex.length >= 2
    ? finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\in',
      branchesLatex: acceptedExactLatex,
      source: 'equation-composition-candidate-validation',
    })
    : finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\approx',
      branchesLatex: validation.accepted.map((value) => formatApproxNumber(value)),
      source: 'equation-composition-candidate-validation',
    });

  const supplements = mergeExactSupplementLatex(
    { latex: merged.exactSupplementLatex, source: 'legacy' },
    { latex: extraSupplementLatex, source: 'legacy' },
    { constraints: domainConstraints, source: 'transform' },
  );
  const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback,
    periodicFamily: mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras),
    exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
    approxText: `x ~= ${validation.accepted.map((value) => formatApproxNumber(value)).join(', ')}`,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
    solveSummaryText: merged.solveSummaryText
      ? `${summaryText}; ${merged.solveSummaryText}`
      : summaryText,
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitutionDiagnostics: merged.substitutionDiagnostics,
    numericMethod: merged.numericMethod,
  };
}

function compositionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const nestedContextBadges = (request.compositionInversionDepth ?? 0) > 0
    ? ['Nested Recursion'] as SolveBadge[]
    : [];
  let parsed: unknown;
  try {
    parsed = normalizeAst(ce.parse(request.resolvedLatex).json);
  } catch {
    return null;
  }

  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const attempts: Array<{ composite: unknown; target: unknown }> = [
    { composite: parsed[1], target: parsed[2] },
    { composite: parsed[2], target: parsed[1] },
  ];

  for (const attempt of attempts) {
    const target = parseNumericTarget(attempt.target);
    if (!target) {
      continue;
    }

    const trigBranches = matchTrigBranches(attempt.composite, target, request.angleUnit);
    if (trigBranches?.kind === 'impossible') {
      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Range Guard', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches.summaryText,
      );
    }
    if (trigBranches?.kind === 'unresolved') {
      const periodic = solveTrigPeriodicFamily(attempt.composite, target, request, executionBudget);
      if (periodic?.kind === 'solved') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return {
          kind: 'success',
          title: 'Solve',
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: badges,
          solveSummaryText: buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'yields',
          ),
        };
      }
      if (periodic?.kind === 'guided') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return {
          kind: 'error',
          title: 'Solve',
          error: periodic.error,
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          plannerBadges: [],
          solveBadges: badges,
          solveSummaryText: buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'reduces to',
          ),
        };
      }

      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches.summaryText,
      );
    }
    if (trigBranches?.kind === 'branches') {
      const branchSet = buildCompositionBranchSet(trigBranches.equations);
      const discoveredFamilies = dedupe(branchSet.equations);
      const recursive = recurseComposition(
        request,
        branchSet.equations,
        depth,
        trail,
        executionBudget,
        runGuardedEquationSolve,
        dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? [])]),
        trigBranches.summaryText,
        [],
        'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
        [],
        [],
        { discoveredFamilies },
      );
      if (recursive) {
        return recursive;
      }
    }

    const periodic = solveTrigPeriodicFamily(attempt.composite, target, request, executionBudget);
    if (periodic?.kind === 'solved') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return {
        kind: 'success',
        title: 'Solve',
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        resultOrigin: 'symbolic',
        plannerBadges: [],
        solveBadges: badges,
        solveSummaryText: buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'yields',
        ),
      };
    }
    if (periodic?.kind === 'guided') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return {
        kind: 'error',
        title: 'Solve',
        error: periodic.error,
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        plannerBadges: [],
        solveBadges: badges,
        solveSummaryText: buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'reduces to',
        ),
      };
    }

    const transform = matchNonPeriodicTransform(attempt.composite, target, request.angleUnit);
    if (!transform) {
      continue;
    }

    if (transform.equations.length === 0) {
      const blocked = errorOutcome(
        'Solve',
        transform.unresolvedError,
        [],
        [],
        dedupe<SolveBadge>([...transform.solveBadges, ...nestedContextBadges]),
        transform.solveSummaryText || undefined,
      );
      if (blocked.kind !== 'error') {
        return blocked;
      }
      const supplements = mergeExactSupplementLatex(
        { latex: transform.exactSupplementLatex, source: 'transform' },
        { constraints: transform.domainConstraints, source: 'transform' },
      );
      return {
        ...blocked,
        periodicFamily: mergePeriodicFamilyExtras(undefined, transform.periodicFamilyExtras),
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        detailSections: transform.detailSections?.length ? transform.detailSections : undefined,
      };
    }

    const recursive = recurseComposition(
      request,
      transform.equations,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
      transform.solveBadges,
      transform.solveSummaryText,
      transform.domainConstraints,
      transform.unresolvedError,
      transform.exactSupplementLatex,
      transform.detailSections,
      transform.periodicFamilyExtras,
    );
    if (recursive) {
      return recursive;
    }
  }

  return null;
}

export { compositionSolve };
