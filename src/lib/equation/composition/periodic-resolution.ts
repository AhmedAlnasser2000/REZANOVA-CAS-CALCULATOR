import { ComputeEngine } from '@cortex-js/compute-engine';
import { dedupe } from '../guarded/merge';
import {
  appendDiscoveredFamilies,
  appendDiscoveredFamiliesToResult,
  appendPeriodicSolveBadges,
  buildInverseTrigPrincipalRangeLatex,
  buildInverseTrigPrincipalRangeMessage,
  buildPeriodicBranchConditionSupplement,
  inverseTrigPrincipalRange,
  isReducedCarrierExactFamily,
  periodicFamilyToExactLatex,
  type PeriodicFamilySolveResult,
} from './periodic-family';
import { buildTrigPeriodicTemplate } from '../../trigonometry/equations';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import type {
  AngleUnit,
  EquationExecutionBudget,
  GuardedSolveRequest,
  PeriodicFamilyInfo,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  branchDependsOnParameter,
  buildInverseTrigValueTarget,
  buildNumericTargetFromNode,
  buildParameterizedRationalPowerBranches,
  buildPeriodicFamilyInfo,
  buildSymbolicFamilyBranch,
  expandBranchesWithinInterval,
  matchParameterizedRationalPowerCarrier,
  parseNumericTarget,
  type NumericTarget,
} from './targets';
import {
  buildReducedCarrierExactFamily,
  buildTwoParameterTanFamily,
  classifyReducedCarrierGuidance,
  matchReducedPolynomialPeriodicCarrier,
  matchReducedSingleFamilyPeriodicCarrier,
  refineSingleFamilyContinuationGuidance,
  supportsSelectedTwoParameterTanClosure,
  transformExponentialFamilyBranches,
} from './non-periodic-transform';
import {
  normalizeTrigComposite,
  transformLnFamilyBranches,
  transformLogFamilyBranches,
  trigCarrierRange,
} from './trig-carrier';
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
import { mergeBranchConstraints as mergeSharedBranchConstraints } from '../../algebra/branch-core';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function mergeConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  return mergeSharedBranchConstraints(left, right);
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
        carrierLatex: normalizedTrig.reducedCarrierLatex ?? normalizedTrig.solveSummaryText,
        parameterLatex: 'k\\in\\mathbb{Z}',
        branchesLatex: [],
        reducedCarrierLatex: normalizedTrig.reducedCarrierLatex,
        structuredStopReason: normalizedTrig.structuredStopReason,
      },
      error: normalizedTrig.error,
      summaryText: normalizedTrig.solveSummaryText,
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
      summaryText: summaryPrefix?.solveSummaryText ?? '',
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
        && summaryPrefix.solveSummaryText.startsWith('Sawtooth closure:')
        && isReducedCarrierExactFamily(resolved.family)
          ? `Exact reduced-carrier sawtooth family: ${boxLatex(normalizeAst(node))}=${target.latex} closes over ${resolved.family.carrierLatex}.`
          : resolved.summaryText
            ? `${summaryPrefix.solveSummaryText} ${resolved.summaryText}`
            : summaryPrefix.solveSummaryText
      : resolved.summaryText,
    solveBadges: dedupe([...(resolved.solveBadges ?? []), ...(solveBadges ?? [])]),
  };
}


export { solveTrigPeriodicFamily };
