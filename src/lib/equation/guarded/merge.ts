import { solutionsToLatex } from '../../display/format';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  createPeriodicFamily,
  renderPeriodicFamilies,
  type PeriodicFamily,
} from '../solution/periodic-family';
import type {
  DisplaySolveSummary,
  PeriodicFamilyInfo,
  SerializableMathJson,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { mergeBranchFamilies } from '../../algebra/branch-core';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../solve-result/producer';
import {
  equationMathValuesWithOwnedReadback,
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
  type EquationMathJsonRouteId,
} from '../solve-result/owned-readback-math';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
  type EquationStageResultReadModel,
} from '../solve-result/stage-carrier';

function extractExactSolutions(exactLatex?: string) {
  if (!exactLatex) {
    return [];
  }

  if (exactLatex.startsWith('x=')) {
    return [exactLatex.slice(2)];
  }

  const prefix = 'x\\in\\left\\{';
  const suffix = '\\right\\}';
  if (exactLatex.startsWith(prefix) && exactLatex.endsWith(suffix)) {
    return exactLatex
      .slice(prefix.length, -suffix.length)
      .split(/,\s*/)
      .filter(Boolean);
  }

  return [exactLatex];
}

function extractApproxSolutions(approxText?: string) {
  if (!approxText) {
    return [];
  }

  const prefix = 'x ~= ';
  if (approxText.startsWith(prefix)) {
    return approxText.slice(prefix.length).split(/,\s*/).filter(Boolean);
  }

  return [approxText];
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

type PeriodicAngleUnit = 'rad' | 'deg' | 'grad';

type ParsedPeriodicBranch = {
  offset: ExactScalar;
  period: ExactScalar;
  unit: PeriodicAngleUnit;
};

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };

function nodeArray(node: SerializableMathJson): SerializableMathJson[] | null {
  return Array.isArray(node) ? node as SerializableMathJson[] : null;
}

function multiplyNodes(nodes: readonly SerializableMathJson[]): SerializableMathJson {
  return nodes.length === 1 ? nodes[0] : ['Multiply', ...nodes] as SerializableMathJson;
}

function exactScalarFromNode(node: SerializableMathJson): ExactScalar | null {
  const direct = readExactScalarNode(node);
  if (direct) return direct;
  const array = nodeArray(node);
  if (!array || array.length === 0) return null;
  if (array[0] === 'Negate' && array.length === 2) {
    const child = exactScalarFromNode(array[1]);
    return child ? { numerator: -child.numerator, denominator: child.denominator } : null;
  }
  if (array[0] === 'Divide' && array.length === 3) {
    const numerator = exactScalarFromNode(array[1]);
    const denominator = exactScalarFromNode(array[2]);
    return numerator && denominator ? divideExactScalars(numerator, denominator) : null;
  }
  if (array[0] === 'Multiply' && array.length > 2) {
    return array.slice(1).reduce<ExactScalar | null>((product, factor) => {
      const scalar = exactScalarFromNode(factor);
      return product && scalar ? multiplyExactScalars(product, scalar) : null;
    }, ONE);
  }
  return null;
}

function piScalarFromNode(node: SerializableMathJson): ExactScalar | null {
  if (node === 'Pi') return ONE;
  const array = nodeArray(node);
  if (!array || array.length === 0) return null;
  if (array[0] === 'Negate' && array.length === 2) {
    const child = piScalarFromNode(array[1]);
    return child ? { numerator: -child.numerator, denominator: child.denominator } : null;
  }
  if (array[0] === 'Divide' && array.length === 3) {
    const numerator = piScalarFromNode(array[1]);
    const denominator = exactScalarFromNode(array[2]);
    return numerator && denominator ? divideExactScalars(numerator, denominator) : null;
  }
  if (array[0] !== 'Multiply' || array.length < 3) return null;
  const factors = array.slice(1);
  const piFactors = factors.filter((factor) => factor === 'Pi');
  if (piFactors.length !== 1) return null;
  return factors
    .filter((factor) => factor !== 'Pi')
    .reduce<ExactScalar | null>((product, factor) => {
      const scalar = exactScalarFromNode(factor);
      return product && scalar ? multiplyExactScalars(product, scalar) : null;
    }, ONE);
}

function flattenAdd(node: SerializableMathJson): SerializableMathJson[] {
  const array = nodeArray(node);
  return array?.[0] === 'Add'
    ? array.slice(1).flatMap((term) => flattenAdd(term))
    : [node];
}

function flattenMultiply(node: SerializableMathJson): SerializableMathJson[] {
  const array = nodeArray(node);
  return array?.[0] === 'Multiply'
    ? array.slice(1).flatMap((factor) => flattenMultiply(factor))
    : [node];
}

function periodicScalarFromNode(node: SerializableMathJson) {
  const piScalar = piScalarFromNode(node);
  if (piScalar) return { scalar: piScalar, unit: 'rad' as const };
  const scalar = exactScalarFromNode(node);
  return scalar ? { scalar, unit: 'linear' as const } : null;
}

function parsePeriodicBranch(node: SerializableMathJson, unit: PeriodicAngleUnit): ParsedPeriodicBranch | null {
  let offset = ZERO;
  let period: ExactScalar | undefined;
  for (const term of flattenAdd(node)) {
    const factors = flattenMultiply(term);
    const parameterIndex = factors.findIndex((factor) => factor === 'n');
    const withoutParameter = parameterIndex < 0
      ? term
      : multiplyNodes(factors.filter((_, index) => index !== parameterIndex));
    const parsed = periodicScalarFromNode(withoutParameter);
    if (!parsed || (parsed.unit === 'rad') !== (unit === 'rad')) return null;
    if (parameterIndex < 0) {
      offset = addExactScalars(offset, parsed.scalar);
    } else if (period || factors.filter((factor) => factor === 'n').length !== 1) {
      return null;
    } else {
      period = parsed.scalar;
    }
  }
  return period && !exactScalarIsZero(period) ? { offset, period, unit } : null;
}

function angleUnitFromOutcomes(outcomes: readonly EquationStageResultReadModel[]): PeriodicAngleUnit | null {
  const text = outcomes
    .flatMap((outcome) => outcome.detailSections ?? [])
    .flatMap((section) => section.lines ?? [])
    .join(' ');
  if (/Angle unit:\s*DEG\b/u.test(text)) return 'deg';
  if (/Angle unit:\s*GRAD\b/u.test(text)) return 'grad';
  return /Angle unit:\s*RAD\b/u.test(text) ? 'rad' : null;
}

function periodicExpressionMathJson(family: PeriodicFamily, unit: PeriodicAngleUnit): SerializableMathJson {
  const scale = unit === 'rad' ? undefined : unit === 'deg' ? 180 : 200;
  const angleNode = (value: ExactScalar): SerializableMathJson => scale
    ? ['Multiply', buildExactScalarNode(value) as SerializableMathJson, scale]
    : ['Multiply', buildExactScalarNode(value) as SerializableMathJson, 'Pi'];
  const offset = angleNode(family.offset);
  const period = ['Multiply', angleNode(family.period), family.parameter] as SerializableMathJson;
  return exactScalarIsZero(family.offset) ? period : ['Add', offset, period] as SerializableMathJson;
}

function compactPeriodicBranches(
  outcomes: readonly EquationStageResultReadModel[],
  targetLatex: string,
): { exactLatex: string; branchesLatex: string[]; mathJson: SerializableMathJson; branchReadback: ReturnType<typeof finiteBranchReadbackMetadata> } | null {
  const unit = angleUnitFromOutcomes(outcomes);
  if (!unit) return null;
  const branches = outcomes.flatMap((outcome) => {
    const root = outcome.canonicalResult?.primaryMath?.mathJson;
    const nodes = Array.isArray(root) && root[0] === 'Equal' && root.length === 3
      ? [root[2] as SerializableMathJson]
      : Array.isArray(root) && root[0] === 'Element' && Array.isArray(root[2]) && root[2][0] === 'Set'
        ? root[2].slice(1) as SerializableMathJson[]
        : [];
    const latex = extractExactSolutions(outcome.canonicalResult?.primaryMath?.canonicalLatex);
    return nodes.length === latex.length ? latex.map((entry, index) => ({ latex: entry, node: nodes[index] })) : [];
  });
  // Two periodic branches are often deliberately distinct representatives
  // (for example, +/- pi/3 with period pi). Only compact a full multi-branch
  // cycle where the structured spacing is unambiguous.
  if (branches.length < 3) return null;
  const parsed = branches.map((branch) => parsePeriodicBranch(branch.node, unit));
  if (parsed.some((branch) => !branch)) return null;
  const scale = unit === 'rad'
    ? ONE
    : { numerator: unit === 'deg' ? 180 : 200, denominator: 1 };
  const families = parsed.map((branch) => createPeriodicFamily({
    targetLatex,
    offset: divideExactScalars(branch!.offset, scale)!,
    period: divideExactScalars(branch!.period, scale)!,
    parameter: 'n',
    domain: 'real',
  }));
  const rendered = renderPeriodicFamilies(families, {
    source: 'equation-substitution-periodic-compaction',
    angleUnit: unit,
  });
  if (rendered.families.length >= families.length) return null;
  const expressions = rendered.families.map((family) => periodicExpressionMathJson(family, unit));
  const mathJson: SerializableMathJson = expressions.length === 1
    ? ['Equal', targetLatex, expressions[0]]
    : ['Element', targetLatex, ['Set', ...expressions]];
  return {
    exactLatex: rendered.exactLatex,
    branchesLatex: rendered.branchesLatex,
    mathJson,
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\in',
      branchesLatex: rendered.branchesLatex,
      source: 'equation-substitution-periodic-compaction',
    }),
  };
}

function mergeDetailSections(outcomes: EquationStageResultReadModel[]) {
  const encoded = dedupe(
    outcomes
      .flatMap((outcome) => outcome.detailSections ?? [])
      .map((section) => JSON.stringify(section)),
  );
  return encoded.map((entry) => JSON.parse(entry));
}

function mergeEquationStageCarriers(
  carriers: readonly EquationStageResultCarrierV1[],
  solveBadges: SolveBadge[],
  solveSummary: DisplaySolveSummary,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  mathJsonOptions?: { routeId: EquationMathJsonRouteId; source: string },
): EquationStageResultCarrierV1 {
  const outcomes = carriers.map(readEquationStageResultCarrier);
  const successes = outcomes.filter((outcome) => outcome.kind === 'success');
  if (successes.length === 0) {
    const firstError = outcomes.find((outcome) => outcome.kind === 'error');
    if (firstError?.kind === 'error') {
      const outcome = errorOutcome(
        'Solve',
        firstError.error,
        firstError.warnings,
        firstError.plannerBadges ?? [],
        dedupe([...(firstError.solveBadges ?? []), ...solveBadges]),
        solveSummary,
        firstError.rejectedCandidateCount,
        substitutionDiagnostics ?? firstError.substitutionDiagnostics,
        firstError.numericMethod,
      );
      return buildEquationStageResultCarrier(createEquationResultOutcome({
        ...outcome,
        detailSections: firstError.detailSections,
      }));
    }

    return buildEquationStageResultCarrier(errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
      [],
      [],
      solveBadges,
      solveSummary,
      undefined,
      substitutionDiagnostics,
    ));
  }

  const compactPeriodic = compactPeriodicBranches(successes, 'x');
  const exactValues = compactPeriodic
    ? compactPeriodic.branchesLatex
    : dedupe(successes.flatMap((outcome) => extractExactSolutions(outcome.exactLatex)));
  const approxValues = dedupe(successes.flatMap((outcome) => extractApproxSolutions(outcome.approxText)));
  const warnings = dedupe(successes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(successes.flatMap((outcome) => outcome.plannerBadges ?? []));
  const badgeSet = dedupe(successes.flatMap((outcome) => outcome.solveBadges ?? []).concat(solveBadges));
  const exactSupplementLatex = mergeExactSupplementLatex(
    ...successes.map((outcome) => ({ latex: outcome.exactSupplementLatex, source: 'legacy' as const })),
  );
  const detailSections = mergeDetailSections(successes);
  const candidateValues = dedupe(successes.flatMap((outcome) => outcome.candidateValues ?? []));
  const rejectedCandidateCount = successes.reduce((total, outcome) => total + (outcome.rejectedCandidateCount ?? 0), 0);
  const numericMethod = dedupe(successes.map((outcome) => outcome.numericMethod).filter((method): method is string => Boolean(method))).join('; ');
  const periodicFamily = mergeBranchFamilies(
    successes
      .map((outcome) => outcome.periodicFamily)
      .filter((family): family is PeriodicFamilyInfo => Boolean(family)),
  );

  const exactLatex = exactValues.length > 0 ? solutionsToLatex('x', exactValues) : undefined;
  const rootsByLatex = new Map<string, SerializableMathJson>();
  for (const outcome of successes) {
    const mathJson = outcome.canonicalResult?.primaryMath?.mathJson;
    const root = Array.isArray(mathJson) ? mathJson : undefined;
    const nodes = root?.[0] === 'Equal' && root.length === 3
      ? [root[2]]
      : root?.[0] === 'Element'
        && Array.isArray(root[2])
        && root[2][0] === 'Set'
          ? root[2].slice(1)
          : [];
    const latex = extractExactSolutions(outcome.canonicalResult?.primaryMath?.canonicalLatex);
    if (nodes.length !== latex.length) continue;
    latex.forEach((value, index) => rootsByLatex.set(value, nodes[index]));
  }
  const aggregateMathJson: SerializableMathJson | undefined = compactPeriodic?.mathJson ?? (exactLatex
    && exactValues.every((value) => rootsByLatex.has(value))
    ? exactValues.length === 1
      ? ['Equal', 'x', rootsByLatex.get(exactValues[0])!]
      : ['Element', 'x', ['Set', ...exactValues.map((value) => rootsByLatex.get(value)! )]]
    : undefined);

  const producerInput = {
    kind: 'success' as const,
    title: 'Solve',
    exactLatex,
    ...(aggregateMathJson
      ? { primaryMath: { canonicalLatex: exactLatex!, mathJson: aggregateMathJson } }
      : {}),
    ...(compactPeriodic ? { branchReadback: compactPeriodic.branchReadback } : {}),
    ...(compactPeriodic ? {} : { periodicFamily }),
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    approxText: approxValues.length > 0 ? `x ~= ${approxValues.join(', ')}` : undefined,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    warnings,
    resultOrigin: approxValues.length > 0 && exactValues.length === 0
      ? 'numeric-fallback' as const
      : 'symbolic' as const,
    plannerBadges,
    solveBadges: badgeSet,
    solveSummaryParts: solveSummary.solveSummaryParts,
    candidateValues: candidateValues.length > 0 ? candidateValues : undefined,
    rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    substitutionDiagnostics: substitutionDiagnostics ?? successes.find((outcome) => outcome.substitutionDiagnostics)?.substitutionDiagnostics,
    numericMethod: numericMethod || undefined,
  };
  const candidateLeaves = successes.flatMap((outcome, index) =>
    equationOwnedMathJsonLeavesFromDocument(
      outcome.canonicalResult,
      `equation-merge-input:${index}`,
    ));
  const ambiguousLatex = new Set<string>();
  const nativeByLatex = new Map<string, typeof candidateLeaves[number]>();
  for (const leaf of candidateLeaves) {
    const existing = nativeByLatex.get(leaf.canonicalLatex);
    if (!existing) {
      nativeByLatex.set(leaf.canonicalLatex, leaf);
    } else if (JSON.stringify(existing.mathJson) !== JSON.stringify(leaf.mathJson)) {
      ambiguousLatex.add(leaf.canonicalLatex);
    }
  }
  const nativeLeaves = [...nativeByLatex.values()].filter((leaf) =>
    !ambiguousLatex.has(leaf.canonicalLatex)
    // The merged primary is the authoritative tree for this aggregate answer.
    && (!aggregateMathJson || leaf.canonicalLatex !== exactLatex));
  if (aggregateMathJson && exactLatex) {
    nativeLeaves.push({
      canonicalLatex: exactLatex,
      mathJson: aggregateMathJson,
      source: mathJsonOptions?.source ?? 'equation-merge-native-roots',
    });
  }
  const mergedMathValues = equationMathValuesWithOwnedReadback({
      outcome: producerInput,
      routeId: mathJsonOptions?.routeId ?? inferEquationMathJsonRoute(producerInput),
      leaves: nativeLeaves,
    });
  const supplementalMathValues = { ...mergedMathValues };
  delete supplementalMathValues.primaryMath;
  delete supplementalMathValues.branchReadback;
  return buildEquationStageResultCarrier(profileEquationResult(createEquationResultOutcome(producerInput, {
    mathValues: supplementalMathValues,
  })));
}

export {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeEquationStageCarriers,
};
