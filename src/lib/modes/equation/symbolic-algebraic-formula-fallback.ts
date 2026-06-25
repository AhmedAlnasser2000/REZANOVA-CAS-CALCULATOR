import { ComputeEngine } from '@cortex-js/compute-engine';
import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import {
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrier,
  numericValueOfCompositionNode,
  type CompositionMathJson,
} from '../../equation/composition/core';
import { profileEquationTargetShape } from '../../equation/equation-target-shape';
import {
  resolveEquationSolveTarget,
  type EquationSolveTargetResolution,
} from '../../equation/equation-target';
import { solveParameterizedCompositionEquation } from '../../equation/parameterized/composition';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationDomainIntent,
  LegacyEquationAnswerMode,
  NumericSolveInterval,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';

const ce = new ComputeEngine();
const UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR =
  'This equation is outside the supported exact symbolic solve families.';
const FORMULA_WRAPPER_KINDS = new Set(['absolute-value', 'square-root', 'square-power', 'even-power', 'odd-power', 'nth-root']);

function parameterizedOptionsFromTargetResolution(targetResolution: EquationSolveTargetResolution) {
  return {
    allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
      new Set(product.characters).size > 1),
  };
}

function isAbsoluteValueFormulaSharedStop(sharedOutcome: DisplayOutcome) {
  return sharedOutcome.kind === 'error'
    && sharedOutcome.error.includes('absolute-value')
    && sharedOutcome.error.includes('outside the current exact bounded solve set');
}

function isSquarePowerFormulaFallbackCandidate(input: {
  sharedOutcome: DisplayOutcome;
  sharedResolvedLatex: string;
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
}) {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.sharedOutcome.error !== UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
    || !input.targetResolution.selectedTarget
  ) {
    return false;
  }

  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const profile = profileEquationTargetShape(
    input.sharedResolvedLatex,
    input.targetResolution.selectedTarget,
    parameterizedOptions,
  );
  return profile.status === 'ok'
    && profile.flags.targetInSquarePowerBase
    && (profile.polynomialDegree ?? 0) > 4;
}

function isOddPowerFormulaFallbackCandidate(input: {
  sharedOutcome: DisplayOutcome;
  sharedResolvedLatex: string;
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
}) {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.sharedOutcome.error !== UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
    || !input.targetResolution.selectedTarget
  ) {
    return false;
  }

  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const profile = profileEquationTargetShape(
    input.sharedResolvedLatex,
    input.targetResolution.selectedTarget,
    parameterizedOptions,
  );
  return profile.status === 'ok'
    && profile.flags.targetInOddPowerBase
    && (profile.polynomialDegree ?? 0) > 4;
}

function isEvenPowerFormulaFallbackCandidate(input: {
  sharedOutcome: DisplayOutcome;
  sharedResolvedLatex: string;
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
}) {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.sharedOutcome.error !== UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
    || !input.targetResolution.selectedTarget
  ) {
    return false;
  }

  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const profile = profileEquationTargetShape(
    input.sharedResolvedLatex,
    input.targetResolution.selectedTarget,
    parameterizedOptions,
  );
  return profile.status === 'ok'
    && profile.flags.targetInEvenPowerBase
    && (profile.polynomialDegree ?? 0) > 4;
}

function preparedParameterizedEquationLatex(input: {
  sourceLatex: string;
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
}) {
  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(input.sourceLatex).latex;
  const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
    ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
    : parameterizedSourceLatex;
  return { parameterizedEquationLatex, parameterizedOptions };
}

function isExactZeroFormulaWrapperEquation(equationLatex: string, target: string) {
  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return false;
  }

  const json = parsed.json;
  if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return false;
  }

  const [left, right] = [json[1] as CompositionMathJson, json[2] as CompositionMathJson];
  return [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ].some((candidate) => {
    if (
      !hasCompositionTarget(candidate.carrierSide, target)
      || hasCompositionTarget(candidate.valueSide, target)
      || numericValueOfCompositionNode(candidate.valueSide) !== 0
    ) {
      return false;
    }
    const match = matchSelectedCompositionCarrier(candidate.carrierSide, target);
    return match.kind === 'matched' && FORMULA_WRAPPER_KINDS.has(match.carrier.kind);
  });
}

function solveRealAlgebraicFormulaComposition(input: {
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
  angleUnit: AngleUnit;
}): DisplayOutcome | undefined {
  const selectedTarget = input.targetResolution.selectedTarget;
  if (!selectedTarget) {
    return undefined;
  }

  const { parameterizedEquationLatex, parameterizedOptions } = preparedParameterizedEquationLatex({
    sourceLatex: input.sharedResolvedLatex,
    targetResolution: input.targetResolution,
  });
  const composition = solveParameterizedCompositionEquation(
    parameterizedEquationLatex,
    selectedTarget,
    input.angleUnit,
    {
      ...parameterizedOptions,
      formulaHandoff: { domain: 'real' },
    },
  );

  if (composition.kind === 'unsupported' && composition.reason === 'domain-empty') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: composition.message,
        warnings: [],
      },
      input.equationLatex,
      input.sharedResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }
  if (composition.kind !== 'success') {
    return undefined;
  }

  const outcome: DisplayOutcome = {
    kind: 'success',
    title: 'Solve',
    exactLatex: composition.exactLatex,
    branchReadback: composition.branchReadback,
    exactSupplementLatex: composition.exactSupplementLatex,
    detailSections: composition.detailSections,
    warnings: [],
    resultOrigin: 'symbolic',
    ...(composition.answerDomain ? { answerDomain: composition.answerDomain } : {}),
  };
  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.sharedResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function tryRealAlgebraicFormulaPreSharedFallback(input: {
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
  answerMode: LegacyEquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  angleUnit: AngleUnit;
}): DisplayOutcome | undefined {
  if (
    input.answerMode !== 'exact'
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
    || !input.targetResolution.selectedTarget
  ) {
    return undefined;
  }

  const { parameterizedEquationLatex } = preparedParameterizedEquationLatex({
    sourceLatex: input.sharedResolvedLatex,
    targetResolution: input.targetResolution,
  });
  if (!isExactZeroFormulaWrapperEquation(parameterizedEquationLatex, input.targetResolution.selectedTarget)) {
    return undefined;
  }

  return solveRealAlgebraicFormulaComposition(input);
}

export function tryRealAlgebraicFormulaSharedFallback(input: {
  sharedOutcome: DisplayOutcome;
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
  answerMode: LegacyEquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  angleUnit: AngleUnit;
}): DisplayOutcome | undefined {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.answerMode !== 'exact'
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
    || !input.targetResolution.selectedTarget
  ) {
    return undefined;
  }

  const shouldAttempt = isAbsoluteValueFormulaSharedStop(input.sharedOutcome)
    || isSquarePowerFormulaFallbackCandidate({
      sharedOutcome: input.sharedOutcome,
      sharedResolvedLatex: input.sharedResolvedLatex,
      targetResolution: input.targetResolution,
    })
    || isEvenPowerFormulaFallbackCandidate({
      sharedOutcome: input.sharedOutcome,
      sharedResolvedLatex: input.sharedResolvedLatex,
      targetResolution: input.targetResolution,
    })
    || isOddPowerFormulaFallbackCandidate({
      sharedOutcome: input.sharedOutcome,
      sharedResolvedLatex: input.sharedResolvedLatex,
      targetResolution: input.targetResolution,
    });
  if (!shouldAttempt) {
    return undefined;
  }

  return solveRealAlgebraicFormulaComposition(input);
}
