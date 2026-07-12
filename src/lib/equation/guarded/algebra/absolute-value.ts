import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildAbsoluteValueDetailSections,
  buildAbsoluteValueEquationFamily,
  buildAbsoluteValueSolveSummary,
  buildAbsoluteValueUnresolvedError,
  collectAbsoluteValueTargets as collectSharedAbsoluteValueTargets,
  isSupportedAbsoluteValueExpression as isSharedAbsoluteValueExpression,
  matchDirectAbsoluteValueEquationNode,
  type RecognizedAbsoluteValueEquationFamily,
  matchAbsoluteValueTarget as matchSharedAbsoluteValueTarget,
  matchPerfectSquareAbsoluteValueCarrier as matchSharedPerfectSquareAbsoluteValueCarrier,
} from '../../../algebra/abs-core';
import { mergeBranchFamilies } from '../../../algebra/branch-core';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { normalizeAst } from '../../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../../symbolic-engine/patterns';
import type {
  AbsoluteValueTargetDescriptor,
  DisplayDetailSection,
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../../types/calculator';
import { UNSUPPORTED_FAMILY_ERROR } from '../outcome';
import { dedupe } from '../merge';
import { equationStateKey } from '../state-key';
import type { AlgebraTransform } from './types';
import {
  buildIsolatedExpression,
  isSupportedRightSideExpression,
} from './radicals';
import {
  getSolveVariable,
  subtractConstraints,
} from './math-json';
import {
  dedupeSolveSummaries,
  proseSolveSummary,
  solveSummaryFromDisplayFields,
} from '../../../display/result-detail-lines';
import { createEquationResultOutcome } from '../../solve-result/producer';

const ce = new ComputeEngine();

function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  return isSharedAbsoluteValueExpression(node, variable);
}

function collectAbsoluteValueTargets(node: unknown, variable: string, targets: AbsoluteValueTargetDescriptor[] = []) {
  return collectSharedAbsoluteValueTargets(node, variable, targets);
}

function matchPerfectSquareRadicalCarrier(node: unknown, variable: string) {
  return matchSharedPerfectSquareAbsoluteValueCarrier(node, variable);
}

function collectPerfectSquareAbsoluteValueCarriers(
  node: unknown,
  variable: string,
  targets: Array<Exclude<ReturnType<typeof matchPerfectSquareRadicalCarrier>, null>> = [],
) {
  const normalized = normalizeAst(node);
  const target = matchPerfectSquareRadicalCarrier(normalized, variable);
  if (target) {
    targets.push(target);
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectPerfectSquareAbsoluteValueCarriers(child, variable, targets);
  }

  return targets;
}

function buildAbsoluteValueRadicalTransform(
  absNode: unknown,
  otherSide: unknown,
  variable: string,
): AlgebraTransform {
  const target = matchSharedAbsoluteValueTarget(absNode, variable);
  if (target) {
    const family = buildAbsoluteValueEquationFamily(target, otherSide, variable);
    return {
      equationLatex: family.branchEquations[0],
      branchEquations: family.branchEquations,
      domainConstraints: family.branchConstraints,
      solveBadges: ['Radical Isolation'],
      ...proseSolveSummary('Reduced an exact square-root square into a bounded absolute-value carrier'),
      unresolvedError: buildAbsoluteValueUnresolvedError(family),
      radicalStepCost: 1,
    };
  }

  return {
    equationLatex: `${boxLatex(absNode)}=${boxLatex(otherSide)}`,
    solveBadges: ['Radical Isolation'],
    ...proseSolveSummary('Reduced an exact square-root square into a bounded absolute-value carrier'),
    unresolvedError: 'This recognized absolute-value family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function buildAbsoluteValueBranchTransform(family: RecognizedAbsoluteValueEquationFamily): AlgebraTransform {
  const detailSections = buildAbsoluteValueDetailSections(family);
  const unresolvedDetailSections = family.normalizationKind === 'outer-nonperiodic'
    ? buildAbsoluteValueDetailSections(family, { boundaryReason: 'outer-sink' })
    : undefined;
  const emptyDetailSections = family.normalizationKind === 'outer-nonperiodic' && family.emptyBranchError
    ? buildAbsoluteValueDetailSections(
        family,
        {
          boundaryReason: family.emptyBranchError.includes('more than one extra bounded non-periodic outer layer')
            ? 'outer-depth'
            : 'no-roots',
        },
      )
    : undefined;
  const guidedBranchDetailSections = family.normalizationKind === 'outer-nonperiodic'
    ? buildAbsoluteValueDetailSections(family, { boundaryReason: 'guided-branch' })
    : undefined;

  return {
    equationLatex: family.branchEquations[0] ?? '',
    branchEquations: family.branchEquations,
    domainConstraints: family.branchConstraints,
    solveBadges: [],
    ...proseSolveSummary(buildAbsoluteValueSolveSummary(family)),
    summaryMergeMode: family.normalizationKind === 'outer-nonperiodic' ? 'replace' : 'prepend',
    detailSections,
    unresolvedDetailSections,
    emptyDetailSections,
    guidedBranchDetailSections,
    unresolvedError: buildAbsoluteValueUnresolvedError(family),
    emptyBranchError: family.emptyBranchError,
    blockOnGuidedBranchError: family.blockOnGuidedBranchError,
  };
}

function matchPerfectSquareAbsoluteValueTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const candidates = collectPerfectSquareAbsoluteValueCarriers(attempt.targetSide, variable);

    for (const target of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(target.targetNode),
      );
      if (!isolatedBase || !isSupportedRightSideExpression(isolatedBase.isolated, variable)) {
        continue;
      }

      const transform = buildAbsoluteValueRadicalTransform(target.absNode, isolatedBase.isolated, variable);
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

function matchBoundedAbsoluteValueTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const directFamily = matchDirectAbsoluteValueEquationNode(parsed);
  if (directFamily) {
    const transform = buildAbsoluteValueBranchTransform(directFamily);
    if (transform.emptyBranchError) {
      return transform;
    }
    if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return transform;
    }
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    if (!isSupportedAbsoluteValueExpression(attempt.otherSide, variable)) {
      continue;
    }

    const candidates = collectAbsoluteValueTargets(attempt.targetSide, variable);
    for (const candidate of candidates) {
      const isolatedMagnitude = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedMagnitude) {
        continue;
      }

      const transform = buildAbsoluteValueBranchTransform(
        buildAbsoluteValueEquationFamily(candidate, isolatedMagnitude.isolated, variable),
      );
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

function isGuidedUnsupportedAbsBranchOutcome(outcome: DisplayOutcome) {
  if (outcome.kind !== 'error') {
    return false;
  }

  if (outcome.error === UNSUPPORTED_FAMILY_ERROR) {
    return true;
  }

  const solveBadges = outcome.solveBadges ?? [];
  return solveBadges.includes('Periodic Family')
    || solveBadges.includes('Composition Branch');
}

function buildBlockedAbsBranchOutcome(
  request: GuardedSolveRequest,
  transform: AlgebraTransform,
  recursiveOutcomes: DisplayOutcome[],
): DisplayOutcome {
  const warnings = dedupe(recursiveOutcomes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(
    recursiveOutcomes.flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.plannerBadges ?? []),
  );
  const solveBadges = dedupe(
    recursiveOutcomes.flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.solveBadges ?? []).concat(transform.solveBadges),
  );
  const periodicFamily = mergeBranchFamilies(
    recursiveOutcomes
      .flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.periodicFamily ? [outcome.periodicFamily] : []),
  );
  const newTransformConstraints = subtractConstraints(
    transform.domainConstraints,
    request.domainConstraints,
  );
  const exactSupplementLatex = mergeExactSupplementLatex(
    ...recursiveOutcomes
      .flatMap((outcome) =>
        outcome.kind === 'prompt'
          ? []
          : [{ latex: outcome.exactSupplementLatex, source: 'legacy' as const }]),
    { constraints: newTransformConstraints, source: 'transform' },
  );
  const detailSections = dedupe([
    ...(transform.guidedBranchDetailSections ?? []).map((section) => JSON.stringify(section)),
    ...recursiveOutcomes
      .flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.detailSections ?? [])
      .map((section) => JSON.stringify(section)),
  ]).map((section) => JSON.parse(section) as DisplayDetailSection);
  const transformSummary = solveSummaryFromDisplayFields(transform);
  if (!transformSummary) {
    throw new Error('Absolute-value transform must declare solve-summary intent.');
  }
  const solveSummary = transform.summaryMergeMode === 'replace'
    ? transformSummary
    : dedupeSolveSummaries(
      transformSummary,
      ...recursiveOutcomes.flatMap((outcome) => {
        if (outcome.kind === 'prompt') return [];
        const summary = solveSummaryFromDisplayFields(outcome);
        return summary ? [summary] : [];
      }),
    );

  return createEquationResultOutcome({
    kind: 'error',
    title: 'Solve',
    error: transform.unresolvedError,
    warnings,
    plannerBadges,
    solveBadges,
    ...solveSummary,
    periodicFamily,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    rejectedCandidateCount: recursiveOutcomes.reduce(
      (total, outcome) => total + (outcome.kind === 'prompt' ? 0 : outcome.rejectedCandidateCount ?? 0),
      0,
    ) || undefined,
  });
}

export {
  buildBlockedAbsBranchOutcome,
  isGuidedUnsupportedAbsBranchOutcome,
  matchBoundedAbsoluteValueTransform,
  matchPerfectSquareAbsoluteValueTransform,
};
