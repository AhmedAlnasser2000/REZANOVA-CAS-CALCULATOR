import { ComputeEngine } from '@cortex-js/compute-engine';
import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { planMathExecution } from '../../engine/semantic-planner';
import { runSharedEquationSolve } from '../../equation/shared-solve';
import type { SharedSolveRequest } from '../../equation/shared-solve';
import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import { isTopLevelInequalityLatex, solveBoundedLinearInequality } from '../../equation/equation-inequality';
import { isolateSelectedTargetEquation } from '../../equation/equation-selected-target-isolation';
import {
  solveBoundedComplexPolynomialCarrierEquationAst,
  solveBoundedPolynomialCarrierEquationAst,
} from '../../equation/polynomial-carrier-follow-on';
import { solveBoundedComplexEquation, solveComplexSpecialFormRootsEquation } from '../../equation/equation-complex';
import { buildBranchReadback } from '../../equation/complex/branches';
import { solveParameterizedRealCubicCardanoEquation } from '../../equation/parameterized/cubic-cardano';
import { buildParameterizedBoundaryReadback } from '../../equation/parameterized/readback';
import { solutionsToLatex } from '../../display/format';
import {
  resolveEquationSolveTarget,
  retargetDomainConstraintsToX,
  retargetEquationLatexToX,
} from '../../equation/equation-target';
import { normalizeExactPowerLogNode } from '../../symbolic-engine/power-log';
import { classifyEquationRuntimeAdvisories, classifyPlannerBlockedRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { AngleUnit, ComplexExactForm, ComplexSolveRegion, DisplayOutcome, EquationDomainIntent, LegacyEquationAnswerMode, NumericSolveInterval, OutputStyle, PlannerBadge, SolveDomainConstraint } from '../../../types/calculator';
import type { AsyncSharedEquationSolveRunner, SharedEquationSolveRunner } from './types';
import { runParameterizedUnsupportedRoute } from './parameterized';
import { tryComplexWrapperRoutes } from './complex-wrapper-routes';
import {
  isDeferredComplexWrapperBoundary,
  withDeferredComplexWrapperBoundary,
} from './complex-wrapper-fallback';
import { tryComplexSymbolicBoundaryOutcome } from './complex-symbolic-boundary';
import { tryDeferredComplexPeriodicFallback } from './complex-periodic-fallback';
import { tryRealNumericFallbackOutcome } from './real-numeric-fallbacks';
import { trySelectedTargetParameterizedExactSolve } from './symbolic-parameterized-exact';
import {
  tryRealAlgebraicFormulaPreSharedFallback,
  tryRealAlgebraicFormulaSharedFallback,
} from './symbolic-algebraic-formula-fallback';
import {
  attachEquationRuntimeEnvelope,
  complexIntentRequiredOutcome,
  containsNonEqualityRelation,
  containsTargetedAbsLatex,
  finalizeSelectedTargetSymbolicOutcome,
  finalizeSharedSymbolicOutcome,
} from './outcomes';

const ce = new ComputeEngine();

class AsyncSharedSolveCapture extends Error {
  request: SharedSolveRequest;
  sharedResolvedLatex?: string;
  deferredComplexWrapperOutcome?: DisplayOutcome;

  constructor(request: SharedSolveRequest) {
    super('Async shared Equation solve requested.');
    this.request = request;
  }
}

const UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR =
  'This equation is outside the supported exact symbolic solve families.';

function parameterizedOptionsFromTargetResolution(targetResolution: ReturnType<typeof resolveEquationSolveTarget>) {
  return {
    allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
      new Set(product.characters).size > 1),
  };
}

function tryRealCubicCardanoSharedFallback(input: {
  sharedOutcome: DisplayOutcome;
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: ReturnType<typeof resolveEquationSolveTarget>;
  answerMode: LegacyEquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
}): DisplayOutcome | undefined {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.sharedOutcome.error !== UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
    || input.answerMode !== 'exact'
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
    || !input.targetResolution.selectedTarget
  ) {
    return undefined;
  }

  const selectedTarget = input.targetResolution.selectedTarget;
  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(input.sharedResolvedLatex).latex;
  const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
    ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
    : parameterizedSourceLatex;
  const cardano = solveParameterizedRealCubicCardanoEquation(
    parameterizedEquationLatex,
    selectedTarget,
    parameterizedOptions,
  );
  if (cardano.kind !== 'success') {
    return undefined;
  }

  const outcome: DisplayOutcome = {
    kind: 'success',
    title: 'Solve',
    exactLatex: cardano.exactLatex,
    exactSupplementLatex: cardano.exactSupplementLatex,
    detailSections: cardano.detailSections,
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: 'real',
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

export function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget?: string | null,
  numericInterval?: NumericSolveInterval,
  answerMode: LegacyEquationAnswerMode = 'exact',
  equationDomainIntent: EquationDomainIntent = 'real',
  complexExactForm: ComplexExactForm = 'rectangular',
  complexRegion: ComplexSolveRegion | undefined = undefined,
  sharedSolveRunner: SharedEquationSolveRunner = runSharedEquationSolve,
): DisplayOutcome {
  const activeAnswerMode = answerMode === 'isolate' ? 'isolate' : 'exact';
  if (isTopLevelInequalityLatex(equationLatex)) {
    const inequalityOutcome = solveBoundedLinearInequality({
      equationLatex,
      target: equationSolveTarget,
      answerMode,
      equationDomainIntent,
      angleUnit,
      outputStyle,
    });
    return attachEquationRuntimeEnvelope(
      inequalityOutcome,
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({
        outcome: inequalityOutcome,
        invalidRequest: inequalityOutcome.kind !== 'success',
      }),
    );
  }

  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later update.',
        warnings: [],
      },
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
      classifyPlannerBlockedRuntimeAdvisories(planner, 'equation'),
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (
    isRelationalOperator(analysis.topLevelOperator)
    || containsNonEqualityRelation(equationLatex)
    || containsNonEqualityRelation(planner.resolvedLatex)
  ) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later update.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (analysis.kind !== 'equation') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Enter an equation containing a supported solve target.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (
    answerMode === 'exact'
    && equationDomainIntent !== 'complex'
    && containsEquationImaginaryUnitLatex(equationLatex)
  ) {
    const outcome = complexIntentRequiredOutcome();
    return attachEquationRuntimeEnvelope(
      outcome,
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  let targetResolution = resolveEquationSolveTarget(equationLatex, equationSolveTarget);
  if (
    (
      targetResolution.status === 'no-target'
      || targetResolution.status === 'unsupported'
      || targetResolution.status === 'parameterized-unsupported'
    )
    && equationLatex.replace(/\s+/g, '') !== planner.resolvedLatex.replace(/\s+/g, '')
  ) {
    const resolvedTarget = resolveEquationSolveTarget(planner.resolvedLatex, equationSolveTarget);
    if (resolvedTarget.status !== 'no-target' && resolvedTarget.status !== 'unsupported') {
      targetResolution = resolvedTarget;
    }
  }
  if (targetResolution.status === 'no-target' || targetResolution.status === 'unsupported') {
    const hasAmbiguousAdjacentProduct = targetResolution.analysis.implicitCharacterProducts.some((product) =>
      new Set(product.characters).size > 1);
    if (targetResolution.status === 'unsupported' && hasAmbiguousAdjacentProduct) {
      const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
      const readback = buildParameterizedBoundaryReadback({
        reason: 'ambiguous-adjacent-product',
        message: targetResolution.message ?? '',
        target: equationSolveTarget ?? targetResolution.selectedTarget ?? detectedVariables[0] ?? 'selected target',
        detectedVariables,
        equationLatex,
      });

      return attachEquationRuntimeEnvelope(
        {
          kind: 'error',
          title: 'Solve',
          error: readback.error,
          warnings: [],
          detailSections: readback.detailSections,
        },
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
    }

    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: targetResolution.message ?? 'Enter an equation containing a supported solve target.',
        warnings: [],
        detailSections:
          targetResolution.analysis.reservedIdentifiers.length > 0
            ? [{
                title: 'Variable Check',
                lines: [
                  `Reserved identifiers: ${targetResolution.analysis.reservedIdentifiers.map((entry) => entry.name).join(', ')}`,
                ],
              }]
            : undefined,
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (answerMode === 'isolate' && targetResolution.selectedTarget) {
    const parameterizedOptions = parameterizedOptionsFromTargetResolution(targetResolution);
    const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
      ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
      : parameterizedSourceLatex;
    const isolated = isolateSelectedTargetEquation(
      parameterizedEquationLatex,
      targetResolution.selectedTarget,
      angleUnit,
      parameterizedOptions,
    );

    if (isolated.kind === 'success') {
      const outcome: DisplayOutcome = {
        kind: 'success',
        title: 'Solve',
        exactLatex: isolated.exactLatex,
        exactSupplementLatex: isolated.exactSupplementLatex,
        detailSections: isolated.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
      };

      const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

      return attachEquationRuntimeEnvelope(
        finalOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
      );
    }

    const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
    const readback = buildParameterizedBoundaryReadback({
      reason: isolated.reason,
      message: isolated.message,
      target: targetResolution.selectedTarget,
      detectedVariables,
      equationLatex: parameterizedEquationLatex,
    });

    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: readback.error,
        warnings: [],
        detailSections: [
          {
            title: 'Answer Mode',
            lines: ['Answer mode: Isolate.'],
          },
          ...readback.detailSections,
        ],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const parameterizedOutcome = runParameterizedUnsupportedRoute({
    equationLatex,
    answerMode: activeAnswerMode,
    equationDomainIntent,
    numericInterval,
    angleUnit,
    outputStyle,
    complexExactForm,
    targetResolution,
    plannerResolvedLatex: planner.resolvedLatex,
    plannerBadges: planner.badges,
  });
  if (parameterizedOutcome) {
    return parameterizedOutcome;
  }

  const solveTarget = targetResolution.selectedTarget ?? 'x';
  let deferredComplexWrapperOutcome: DisplayOutcome | undefined;

  if (activeAnswerMode === 'exact' && equationDomainIntent === 'real' && !numericInterval && targetResolution.selectedTarget) {
    const selectedTargetParameterized = trySelectedTargetParameterizedExactSolve({
      equationLatex,
      angleUnit,
      plannerResolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
      targetResolution,
    });
    if (selectedTargetParameterized) {
      return selectedTargetParameterized;
    }
  }

  if (answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval) {
    const parameterizedOptions = parameterizedOptionsFromTargetResolution(targetResolution);
    const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
      ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
      : parameterizedSourceLatex;
    const complexSpecialForm = solveComplexSpecialFormRootsEquation(
      parameterizedEquationLatex,
      solveTarget,
      {
        ...parameterizedOptions,
        outputStyle,
        complexExactForm,
        angleUnit,
      },
    );
    if (complexSpecialForm.kind === 'success') {
      const outcome: DisplayOutcome = {
        kind: 'success',
        title: 'Solve',
        exactLatex: complexSpecialForm.exactLatex,
        branchReadback: complexSpecialForm.branchReadback,
        approxText: complexSpecialForm.approxText,
        detailSections: complexSpecialForm.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
        answerDomain: 'complex',
      };

      const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, solveTarget);

      return attachEquationRuntimeEnvelope(
        finalOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
      );
    }

    if (
      complexSpecialForm.reason === 'total-degree-limit'
      || complexSpecialForm.reason === 'symbolic-coefficients'
      || complexSpecialForm.reason === 'complex-carrier-root'
    ) {
      return attachEquationRuntimeEnvelope(
        {
          kind: 'error',
          title: 'Solve',
          error: complexSpecialForm.message,
          warnings: [],
          detailSections: [{
            title: 'Complex Boundary',
            lines: [
              'Complex special-form solving is currently bounded to exact-rational direct and carrier-quadratic shapes through 12 visible branches.',
              'Symbolic carrier coefficients or constants require a formal principal-branch root policy, so they stay deferred for now.',
              'Turn Complex Off for the widened real Exact route when appropriate, or use Numeric Interval Solve for local real numeric roots.',
            ],
          }],
        },
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
    }

    const boundedComplex = solveBoundedComplexEquation(
      parameterizedEquationLatex,
      solveTarget,
      {
        ...parameterizedOptions,
        outputStyle,
        complexExactForm,
        angleUnit,
      },
    );

    if (boundedComplex) {
      const outcome: DisplayOutcome = {
        kind: 'success',
        title: 'Solve',
        exactLatex: boundedComplex.exactLatex,
        branchReadback: boundedComplex.branchReadback,
        approxText: boundedComplex.approxText,
        exactSupplementLatex: boundedComplex.exactSupplementLatex,
        detailSections: boundedComplex.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
        answerDomain: 'complex',
      };

      const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, solveTarget);

      return attachEquationRuntimeEnvelope(
        finalOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
      );
    }

    const complexWrapperOutcome = tryComplexWrapperRoutes({
      equationLatex,
      parameterizedEquationLatex,
      selectedTarget: solveTarget,
      parameterizedOptions,
      angleUnit,
      outputStyle,
      complexExactForm,
      plannerResolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
      stopOnRecognizedPreimageUnsupported: !complexRegion,
    });
    if (complexWrapperOutcome) {
      if (isDeferredComplexWrapperBoundary(complexWrapperOutcome)) {
        deferredComplexWrapperOutcome = complexWrapperOutcome;
      } else {
        return complexWrapperOutcome;
      }
    }

    const deferredPeriodicFallback = tryDeferredComplexPeriodicFallback({
      deferredComplexWrapperOutcome,
      equationLatex,
      angleUnit,
      plannerResolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
      targetResolution,
    });
    if (deferredPeriodicFallback) {
      return deferredPeriodicFallback;
    }

    if (solveTarget === 'x') {
      try {
        const complexCarrier = solveBoundedComplexPolynomialCarrierEquationAst(ce.parse(planner.resolvedLatex).json);
        if (complexCarrier.kind === 'solved') {
          const readback = buildBranchReadback(solveTarget, complexCarrier.branches, outputStyle, complexExactForm);
          const outcome: DisplayOutcome = {
            kind: 'success',
            title: 'Solve',
            exactLatex: readback.exactLatex,
            branchReadback: readback.branchReadback,
            approxText: readback.approxText,
            exactSupplementLatex:
              complexCarrier.exactSupplementLatex && complexCarrier.exactSupplementLatex.length > 0
                ? complexCarrier.exactSupplementLatex
                : undefined,
            detailSections: [
              {
                title: 'Complex Carrier Follow-On',
                lines: [
                  'Domain intent: Complex.',
                  'Expanded the equation into a bounded quadratic carrier and solved each carrier branch over the complex domain.',
                  'This route is limited to quadratic selected-target carriers with real carrier roots.',
                ],
              },
            ],
            warnings: [],
            resultOrigin: 'symbolic',
            answerDomain: 'complex',
          };
          const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, solveTarget);

          return attachEquationRuntimeEnvelope(
            finalOutcome,
            equationLatex,
            planner.resolvedLatex,
            planner.badges,
            classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
          );
        }
      } catch {
        // Keep the generic complex fallback when the bounded carrier bridge cannot parse.
      }
    }

    const complexBoundaryOutcome = tryComplexSymbolicBoundaryOutcome({
      equationLatex,
      parameterizedEquationLatex,
      solveTarget,
      complexRegion,
      plannerResolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
    });
    if (complexBoundaryOutcome) return complexBoundaryOutcome;
  }

  if (
    activeAnswerMode === 'exact'
    && equationDomainIntent === 'real'
    && !numericInterval
    && solveTarget === 'x'
    && !containsTargetedAbsLatex(planner.resolvedLatex, solveTarget)
  ) {
    try {
      const carrierAttempt = solveBoundedPolynomialCarrierEquationAst(ce.parse(planner.resolvedLatex).json);
      if (carrierAttempt.kind === 'solved') {
        const exactSolutions = carrierAttempt.roots.map((root) => root.latex);
        const exactLatex = exactSolutions.length > 0
          ? solutionsToLatex('x', exactSolutions)
          : undefined;
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex,
          exactSupplementLatex:
            carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
              ? carrierAttempt.exactSupplementLatex
              : undefined,
          approxText: carrierAttempt.roots.length > 0
            ? `x \\approx ${carrierAttempt.roots.map((root) => root.numeric.toPrecision(8)).join(', ')}`
            : undefined,
          warnings: [],
          resultOrigin: 'symbolic',
        };
        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, solveTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }
    } catch {
      // Keep the generic shared symbolic fallback when the bounded carrier bridge cannot parse.
    }
  }

  let sharedResolvedLatex = planner.resolvedLatex;
  let preprocessSupplementLatex: string[] | undefined;
  let preprocessDomainConstraints: SolveDomainConstraint[] | undefined;

  try {
    const preprocess = normalizeExactPowerLogNode(
      ce.parse(planner.resolvedLatex).json,
      'equation-preprocess',
    );
    if (
      preprocess
      && (
        preprocess.normalizedLatex.replace(/\s+/g, '') !== planner.resolvedLatex.replace(/\s+/g, '')
        || preprocess.exactSupplementLatex.length > 0
      )
    ) {
      sharedResolvedLatex = preprocess.normalizedLatex;
      preprocessSupplementLatex =
        preprocess.exactSupplementLatex.length > 0 ? preprocess.exactSupplementLatex : undefined;
      preprocessDomainConstraints =
        preprocess.conditionConstraints.length > 0 ? preprocess.conditionConstraints : undefined;
    }
  } catch {
    // Keep the original resolved equation when bounded preprocessing cannot parse cleanly.
  }

  const solverOriginalLatex = numericInterval
    ? equationLatex
    : retargetEquationLatexToX(equationLatex, solveTarget);
  const solverResolvedLatex = numericInterval
    ? sharedResolvedLatex
    : retargetEquationLatexToX(sharedResolvedLatex, solveTarget);
  const solverSupplementLatex = solveTarget === 'x' || numericInterval
    ? preprocessSupplementLatex
    : preprocessSupplementLatex?.map((entry) => entry.replace(/\b[a-zA-Z]\b/g, (match) =>
      match === solveTarget ? 'x' : match));
  const solverDomainConstraints = numericInterval
    ? preprocessDomainConstraints
    : retargetDomainConstraintsToX(
      preprocessDomainConstraints,
      solveTarget,
    );

  const sharedRequest: SharedSolveRequest = {
    originalLatex: solverOriginalLatex,
    resolvedLatex: solverResolvedLatex,
    solveTarget,
    angleUnit,
    outputStyle,
    ansLatex,
    numericInterval,
    domainConstraints: solverDomainConstraints,
    exactSupplementLatex: solverSupplementLatex,
  };
  const preSharedAlgebraicFormulaFallback = tryRealAlgebraicFormulaPreSharedFallback({
    answerMode: activeAnswerMode,
    equationDomainIntent,
    numericInterval,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
    targetResolution,
    angleUnit,
  });
  if (preSharedAlgebraicFormulaFallback) {
    return preSharedAlgebraicFormulaFallback;
  }
  let sharedOutcome: DisplayOutcome;
  try {
    sharedOutcome = sharedSolveRunner(sharedRequest);
  } catch (error) {
    if (error instanceof AsyncSharedSolveCapture) {
      error.sharedResolvedLatex = sharedResolvedLatex;
      error.deferredComplexWrapperOutcome = deferredComplexWrapperOutcome;
    }
    throw error;
  }
  const realCardanoFallback = tryRealCubicCardanoSharedFallback({
    sharedOutcome,
    answerMode: activeAnswerMode,
    equationDomainIntent,
    numericInterval,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
    targetResolution,
  });
  if (realCardanoFallback) {
    return realCardanoFallback;
  }
  const realAlgebraicFormulaFallback = tryRealAlgebraicFormulaSharedFallback({
    sharedOutcome,
    answerMode: activeAnswerMode,
    equationDomainIntent,
    numericInterval,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
    targetResolution,
    angleUnit,
  });
  if (realAlgebraicFormulaFallback) {
    return realAlgebraicFormulaFallback;
  }
  const realNumericFallback = tryRealNumericFallbackOutcome({
    equationLatex,
    equationSolveTarget: solveTarget,
    angleUnit,
    equationDomainIntent,
    numericInterval,
    complexRegion,
    complexExactForm,
    sharedOutcome,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
  });
  if (realNumericFallback) {
    return withDeferredComplexWrapperBoundary(realNumericFallback, deferredComplexWrapperOutcome);
  }

  return withDeferredComplexWrapperBoundary(finalizeSharedSymbolicOutcome({
    sharedOutcome,
    solveTarget,
    answerMode: activeAnswerMode,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
    allowNumericOnly: Boolean(numericInterval),
    realDomainOnly: equationDomainIntent === 'real',
  }), deferredComplexWrapperOutcome);
}

export async function solveSymbolicEquationAsync(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget: string | null | undefined,
  numericInterval: NumericSolveInterval | undefined,
  answerMode: LegacyEquationAnswerMode,
  equationDomainIntent: EquationDomainIntent,
  complexExactForm: ComplexExactForm,
  complexRegion: ComplexSolveRegion | undefined,
  sharedSolveRunner: AsyncSharedEquationSolveRunner,
): Promise<DisplayOutcome> {
  const activeAnswerMode = answerMode === 'isolate' ? 'isolate' : 'exact';
  try {
    return solveSymbolicEquation(
      equationLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
      activeAnswerMode,
      equationDomainIntent,
      complexExactForm,
      complexRegion,
      (request) => {
        throw new AsyncSharedSolveCapture(request);
      },
    );
  } catch (error) {
    if (!(error instanceof AsyncSharedSolveCapture)) {
      throw error;
    }

    const planner = planMathExecution(equationLatex, {
      mode: 'equation',
      intent: 'equation-solve',
      angleUnit,
      screenHint: 'symbolic',
    });
    const targetResolution = resolveEquationSolveTarget(equationLatex, equationSolveTarget);
    const solveTarget = targetResolution.selectedTarget ?? equationSolveTarget ?? 'x';
    const sharedOutcome = await sharedSolveRunner(error.request);
    const plannerBadges = planner.kind === 'blocked' ? undefined : planner.badges;
    const realCardanoFallback = tryRealCubicCardanoSharedFallback({
      sharedOutcome,
      answerMode: activeAnswerMode,
      equationDomainIntent,
      numericInterval,
      equationLatex,
      sharedResolvedLatex: error.sharedResolvedLatex ?? error.request.resolvedLatex,
      plannerBadges,
      targetResolution,
    });
    if (realCardanoFallback) {
      return realCardanoFallback;
    }
    const realAlgebraicFormulaFallback = tryRealAlgebraicFormulaSharedFallback({
      sharedOutcome,
      answerMode: activeAnswerMode,
      equationDomainIntent,
      numericInterval,
      equationLatex,
      sharedResolvedLatex: error.sharedResolvedLatex ?? error.request.resolvedLatex,
      plannerBadges,
      targetResolution,
      angleUnit,
    });
    if (realAlgebraicFormulaFallback) {
      return realAlgebraicFormulaFallback;
    }
    const realNumericFallback = tryRealNumericFallbackOutcome({
      equationLatex,
      equationSolveTarget: solveTarget,
      angleUnit,
      equationDomainIntent,
      numericInterval,
      complexRegion,
      complexExactForm,
      sharedOutcome,
      sharedResolvedLatex: error.sharedResolvedLatex ?? error.request.resolvedLatex,
      plannerBadges,
    });
    if (realNumericFallback) {
      return withDeferredComplexWrapperBoundary(realNumericFallback, error.deferredComplexWrapperOutcome);
    }

    return withDeferredComplexWrapperBoundary(finalizeSharedSymbolicOutcome({
      sharedOutcome,
      solveTarget,
      answerMode: activeAnswerMode,
      equationLatex,
      sharedResolvedLatex: error.sharedResolvedLatex ?? error.request.resolvedLatex,
      plannerBadges,
      allowNumericOnly: Boolean(numericInterval),
      realDomainOnly: equationDomainIntent === 'real',
    }), error.deferredComplexWrapperOutcome);
  }
}
