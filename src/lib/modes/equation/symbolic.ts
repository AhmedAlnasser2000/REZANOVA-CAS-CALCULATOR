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
import { solveBoundedComplexEquation } from '../../equation/equation-complex';
import { buildParameterizedBoundaryReadback } from '../../equation/parameterized/readback';
import {
  resolveEquationSolveTarget,
  retargetDomainConstraintsToX,
  retargetEquationLatexToX,
} from '../../equation/equation-target';
import { normalizeExactPowerLogNode } from '../../symbolic-engine/power-log';
import { classifyEquationRuntimeAdvisories, classifyPlannerBlockedRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { AngleUnit, ComplexExactForm, DisplayOutcome, EquationAnswerMode, EquationDomainIntent, NumericSolveInterval, OutputStyle, SolveDomainConstraint } from '../../../types/calculator';
import type { AsyncSharedEquationSolveRunner, SharedEquationSolveRunner } from './types';
import { runParameterizedUnsupportedRoute } from './parameterized';
import {
  attachEquationRuntimeEnvelope,
  complexIntentRequiredOutcome,
  containsNonEqualityRelation,
  containsTargetedAbsLatex,
  finalizeSelectedTargetSymbolicOutcome,
  finalizeSharedSymbolicOutcome,
  unsupportedComplexPreimageOutcome,
} from './outcomes';

const ce = new ComputeEngine();

class AsyncSharedSolveCapture extends Error {
  request: SharedSolveRequest;

  constructor(request: SharedSolveRequest) {
    super('Async shared Equation solve requested.');
    this.request = request;
  }
}

export function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget?: string | null,
  numericInterval?: NumericSolveInterval,
  answerMode: EquationAnswerMode = 'exact',
  equationDomainIntent: EquationDomainIntent = 'real',
  complexExactForm: ComplexExactForm = 'rectangular',
  sharedSolveRunner: SharedEquationSolveRunner = runSharedEquationSolve,
): DisplayOutcome {
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
    (targetResolution.status === 'no-target' || targetResolution.status === 'unsupported')
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
    const parameterizedOptions = {
      allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
        new Set(product.characters).size > 1),
    };
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
    answerMode,
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

  if (answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval) {
    const parameterizedOptions = {
      allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
        new Set(product.characters).size > 1),
    };
    const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
      ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
      : parameterizedSourceLatex;
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

    if (
      containsEquationImaginaryUnitLatex(parameterizedEquationLatex)
      || containsTargetedAbsLatex(parameterizedEquationLatex, solveTarget)
    ) {
      const boundaryOutcome = unsupportedComplexPreimageOutcome();
      return attachEquationRuntimeEnvelope(
        boundaryOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
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

  const solverOriginalLatex = retargetEquationLatexToX(equationLatex, solveTarget);
  const solverResolvedLatex = retargetEquationLatexToX(sharedResolvedLatex, solveTarget);
  const solverSupplementLatex = solveTarget === 'x'
    ? preprocessSupplementLatex
    : preprocessSupplementLatex?.map((entry) => entry.replace(/\b[a-zA-Z]\b/g, (match) =>
      match === solveTarget ? 'x' : match));
  const solverDomainConstraints = retargetDomainConstraintsToX(
    preprocessDomainConstraints,
    solveTarget,
  );

  return finalizeSharedSymbolicOutcome({
    sharedOutcome: sharedSolveRunner({
      originalLatex: solverOriginalLatex,
      resolvedLatex: solverResolvedLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      numericInterval,
      domainConstraints: solverDomainConstraints,
      exactSupplementLatex: solverSupplementLatex,
    }),
    solveTarget,
    answerMode,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
  });
}

export async function solveSymbolicEquationAsync(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget: string | null | undefined,
  numericInterval: NumericSolveInterval | undefined,
  answerMode: EquationAnswerMode,
  equationDomainIntent: EquationDomainIntent,
  complexExactForm: ComplexExactForm,
  sharedSolveRunner: AsyncSharedEquationSolveRunner,
): Promise<DisplayOutcome> {
  try {
    return solveSymbolicEquation(
      equationLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
      answerMode,
      equationDomainIntent,
      complexExactForm,
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

    return finalizeSharedSymbolicOutcome({
      sharedOutcome,
      solveTarget,
      answerMode,
      equationLatex,
      sharedResolvedLatex: error.request.resolvedLatex,
      plannerBadges: planner.kind === 'blocked' ? undefined : planner.badges,
    });
  }
}
