import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  complexSolutionsToApproxText,
  complexSolutionsToLatex,
  formatApproxNumber,
  formatNumber,
} from '../display/format';
import {
  applyEquationTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../algebra/algebra-transform';
import {
  classifyEquationRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../kernel/runtime-policy';
import { runExpressionAction } from '../engine/math-engine';
import { analyzeLatex, isRelationalOperator } from '../engine/math-analysis';
import { runSharedEquationSolve } from '../equation/shared-solve';
import { solveParameterizedLinearEquation } from '../equation/equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from '../equation/equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from '../equation/equation-parameterized-rational';
import { solveParameterizedFactorablePolynomialEquation } from '../equation/equation-parameterized-factorable-polynomial';
import { solveParameterizedCarrierEquation } from '../equation/equation-parameterized-carrier';
import { solveParameterizedCompositionEquation } from '../equation/equation-parameterized-composition';
import { solveParameterizedExpLogEquation } from '../equation/equation-parameterized-exp-log';
import { solveParameterizedMixedAlgebraicEquation } from '../equation/equation-parameterized-mixed-algebraic';
import { solveParameterizedTrigEquation } from '../equation/equation-parameterized-trig';
import { buildParameterizedBoundaryReadback } from '../equation/equation-parameterized-readback';
import { solveSelectedTargetIsolationEquation } from '../equation/equation-selected-target-isolation';
import { solvePolynomialSystem2x2 } from '../equation/equation-polynomial-system';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  type StoredVariableSubstitutionResult,
} from '../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import {
  formatNamedEquationOutcomeTarget,
  resolveEquationSolveTarget,
  retargetDomainConstraintsToX,
  retargetEquationLatexToX,
  rewriteEquationOutcomeTarget,
} from '../equation/equation-target';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../kernel/runtime-envelope';
import { planMathExecution } from '../engine/semantic-planner';
import { normalizeExactPowerLogNode } from '../symbolic-engine/power-log';
import { solveLinearSystem } from '../linear-algebra/matrix';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { solvePolynomialRoots } from '../algebra/polynomial-roots';
import {
  buildPolynomialEquationLatex,
  normalizedPolynomialCoefficients,
  POLYNOMIAL_VIEW_META,
} from './equation-ui-model';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationScreen,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
  PolynomialEquationView,
  SolveDomainConstraint,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

const ce = new ComputeEngine();
export {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  equationInputLatexForScreen,
  POLYNOMIAL_VIEW_META,
} from './equation-ui-model';

type RunEquationModeRequest = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
};

function attachEquationRuntimeEnvelope(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
  plannerBadges: PlannerBadge[] | undefined,
  runtimeAdvisories?: DisplayOutcome['runtimeAdvisories'],
) {
  return attachRuntimeEnvelope(outcome, {
    originalLatex,
    resolvedLatex,
    plannerBadges,
    plannerBadgeMode: 'merge',
    runtimeAdvisories,
  });
}

function withStoredValueDetails(
  outcome: DisplayOutcome,
  input: {
    substitution: StoredVariableSubstitutionResult;
    target?: string;
    interval?: NumericSolveInterval;
    originalLatex: string;
    replayedSnapshot: boolean;
    ignoredLines?: readonly string[];
  },
): DisplayOutcome {
  const storedValueDetails = storedValueReadbackSections({
    substitutions: input.substitution.substitutions,
    protectedSubstitutions: input.substitution.protectedSubstitutions,
    protectedNameDescriptions: input.target ? { [input.target]: 'the solve target' } : {},
    originalLatex: input.originalLatex,
    effectiveLatex: input.substitution.latex,
    effectiveLabel: input.target ? `Effective equation for ${input.target}` : 'Effective equation',
    replayedSnapshot: input.replayedSnapshot,
    ignoredLines: input.ignoredLines,
  });

  if (storedValueDetails.length === 0 || outcome.kind === 'prompt') {
    return outcome;
  }

  const intervalText = input.interval ? `[${input.interval.start}, ${input.interval.end}]` : 'the chosen interval';
  const scopedNoRootError =
    outcome.kind === 'error'
    && input.target
    && input.interval
    && input.substitution.substitutions.length > 0
    && /No bracketed or near-zero real roots were found on the chosen interval\./u.test(outcome.error ?? '')
      ? `No real root for ${input.target} was found inside ${intervalText} for the substituted equation ${input.substitution.latex}. Try widening the interval, shifting the interval center, or increasing subdivisions.`
      : undefined;

  const nextOutcome = {
    ...outcome,
    ...(scopedNoRootError ? { error: scopedNoRootError } : {}),
    detailSections: [
      ...storedValueDetails,
      ...(outcome.detailSections ?? []),
    ],
  };

  return nextOutcome.kind === 'success' && input.substitution.substitutions.length > 0
    ? { ...nextOutcome, variableSubstitutions: [...input.substitution.substitutions] }
    : nextOutcome;
}

function solveSystem(source: number[][], size: 2 | 3): DisplayOutcome {
  const coefficients = source.map((row) => row.slice(0, size));
  const constants = source.map((row) => row[size]);
  const solution = solveLinearSystem(coefficients, constants);

  if (!solution) {
    return {
      kind: 'error',
      title: `${size}x${size}`,
      error: 'The linear system does not have a unique solution.',
      warnings: [],
    };
  }

  const exactLatex = solution
    .map((value, index) => `${['x', 'y', 'z'][index]}=${formatNumber(value, 4)}`)
    .join(',\\;');
  const approxText = solution
    .map((value, index) => `${['x', 'y', 'z'][index]} ~= ${formatApproxNumber(value)}`)
    .join(', ');

  return {
    kind: 'success',
    title: `${size}x${size}`,
    exactLatex,
    approxText,
    warnings: [],
  };
}

function containsNonEqualityRelation(latex: string) {
  return /\\(?:le|leq|ge|geq|ne|neq)(?![A-Za-z])|[<>]|[≤≥≠]/.test(latex);
}

function solvePolynomial(
  screen: PolynomialEquationView,
  coefficients: number[],
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
): DisplayOutcome {
  const meta = POLYNOMIAL_VIEW_META[screen];
  const normalized = normalizedPolynomialCoefficients(coefficients, meta.degree + 1);

  if (Math.abs(normalized[0]) < 1e-10) {
    return {
      kind: 'error',
      title: meta.title,
      error: `Set ${meta.coefficientLabels[0]} to a non-zero value for the ${meta.title.toLowerCase()} equation.`,
      warnings: [],
    };
  }

  const polynomialLatex = buildPolynomialEquationLatex(screen, normalized);
  if (screen === 'cubic' || screen === 'quartic') {
    const bounded = solveBoundedPolynomialEquationAst(ce.parse(polynomialLatex).json, 'x');
    if (bounded) {
      return buildRuntimeOutcome({
        title: meta.title,
        exactLatex: bounded.exactLatex,
        approxText: bounded.approxText,
        warnings: [],
        resultOrigin: 'symbolic',
      });
    }
  }

  const response = screen === 'quadratic'
    ? runExpressionAction(
      {
        mode: 'equation',
        document: { latex: polynomialLatex },
        angleUnit,
        outputStyle,
        variables: { Ans: ansLatex },
      },
      'solve',
    )
    : {
      exactLatex: undefined,
      exactSupplementLatex: undefined,
      approxText: undefined,
      warnings: [] as string[],
      error: 'No bounded exact symbolic solution was found.',
    };

  if (screen === 'quadratic' && !response.error && response.exactLatex) {
    return buildRuntimeOutcome({
      title: meta.title,
      exactLatex: response.exactLatex,
      exactSupplementLatex: response.exactSupplementLatex,
      approxText: response.approxText,
      warnings: response.warnings,
      resultOrigin: 'symbolic',
    });
  }

  const numericRoots = solvePolynomialRoots({ coefficients: normalized });
  if (numericRoots.kind === 'error') {
    return {
      kind: 'error',
      title: meta.title,
      error: response.error ?? numericRoots.error,
      warnings: response.warnings,
    };
  }

  return {
    kind: 'success',
    title: meta.title,
    exactLatex: complexSolutionsToLatex('x', numericRoots.roots),
    approxText: complexSolutionsToApproxText('x', numericRoots.roots),
    warnings: ['Symbolic solve unavailable; showing numeric roots.'],
    resultOrigin: 'numeric-fallback',
  };
}

function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget?: string | null,
  numericInterval?: NumericSolveInterval,
): DisplayOutcome {
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

  if (targetResolution.status === 'parameterized-unsupported') {
    if (targetResolution.selectedTarget) {
      const parameterizedOptions = {
        allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
          new Set(product.characters).size > 1),
      };
      const parameterizedLinear = solveParameterizedLinearEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedLinear.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedLinear.exactLatex,
          exactSupplementLatex: parameterizedLinear.exactSupplementLatex,
          detailSections: parameterizedLinear.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedPolynomial = solveParameterizedPolynomialEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedPolynomial.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedPolynomial.exactLatex,
          exactSupplementLatex: parameterizedPolynomial.exactSupplementLatex,
          detailSections: parameterizedPolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedRational = solveParameterizedRationalEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedRational.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedRational.exactLatex,
          exactSupplementLatex: parameterizedRational.exactSupplementLatex,
          detailSections: parameterizedRational.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedFactorablePolynomial = solveParameterizedFactorablePolynomialEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedFactorablePolynomial.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedFactorablePolynomial.exactLatex,
          exactSupplementLatex: parameterizedFactorablePolynomial.exactSupplementLatex,
          detailSections: parameterizedFactorablePolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedCarrier = solveParameterizedCarrierEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedCarrier.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedCarrier.exactLatex,
          exactSupplementLatex: parameterizedCarrier.exactSupplementLatex,
          detailSections: parameterizedCarrier.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedExpLog = solveParameterizedExpLogEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedExpLog.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedExpLog.exactLatex,
          exactSupplementLatex: parameterizedExpLog.exactSupplementLatex,
          detailSections: parameterizedExpLog.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedTrig = solveParameterizedTrigEquation(
        equationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (parameterizedTrig.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedTrig.exactLatex,
          exactSupplementLatex: parameterizedTrig.exactSupplementLatex,
          detailSections: parameterizedTrig.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedComposition = solveParameterizedCompositionEquation(
        equationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (parameterizedComposition.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedComposition.exactLatex,
          exactSupplementLatex: parameterizedComposition.exactSupplementLatex,
          detailSections: parameterizedComposition.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedMixedAlgebraic = solveParameterizedMixedAlgebraicEquation(
        equationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedMixedAlgebraic.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedMixedAlgebraic.exactLatex,
          exactSupplementLatex: parameterizedMixedAlgebraic.exactSupplementLatex,
          detailSections: parameterizedMixedAlgebraic.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const selectedTargetIsolation = solveSelectedTargetIsolationEquation(
        equationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (selectedTargetIsolation.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: selectedTargetIsolation.exactLatex,
          exactSupplementLatex: selectedTargetIsolation.exactSupplementLatex,
          detailSections: selectedTargetIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = formatNamedEquationOutcomeTarget(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      let boundaryStop: { reason: string; message: string } = {
        reason: parameterizedPolynomial.reason,
        message: parameterizedPolynomial.message,
      };
      if (parameterizedComposition.reason !== 'no-composition') {
        boundaryStop = {
          reason: parameterizedComposition.reason,
          message: parameterizedComposition.message,
        };
      } else if (parameterizedMixedAlgebraic.reason !== 'no-mixed-algebraic') {
        boundaryStop = {
          reason: parameterizedMixedAlgebraic.reason,
          message: parameterizedMixedAlgebraic.message,
        };
      } else if (parameterizedTrig.reason !== 'no-trig') {
        boundaryStop = {
          reason: parameterizedTrig.reason,
          message: parameterizedTrig.message,
        };
      } else if (parameterizedExpLog.reason !== 'no-exp-log') {
        boundaryStop = {
          reason: parameterizedExpLog.reason,
          message: parameterizedExpLog.message,
        };
      } else if (parameterizedCarrier.reason !== 'no-carrier') {
        boundaryStop = {
          reason: parameterizedCarrier.reason,
          message: parameterizedCarrier.message,
        };
      } else if (parameterizedRational.reason !== 'not-rational') {
        boundaryStop = {
          reason: parameterizedRational.reason,
          message: parameterizedRational.message,
        };
      } else if (parameterizedFactorablePolynomial.reason !== 'not-factorable') {
        boundaryStop = {
          reason: parameterizedFactorablePolynomial.reason,
          message: parameterizedFactorablePolynomial.message,
        };
      }
      if (
        selectedTargetIsolation.reason !== 'no-isolation'
        && !(
          selectedTargetIsolation.reason === 'multiple-target-islands'
          && boundaryStop.reason === 'mixed-carriers'
        )
      ) {
        boundaryStop = {
          reason: selectedTargetIsolation.reason,
          message: selectedTargetIsolation.message,
        };
      }
      const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
      const readback = buildParameterizedBoundaryReadback({
        ...boundaryStop,
        target: targetResolution.selectedTarget,
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
        error: targetResolution.message ?? 'Choose a solve target before solving this multi-symbol equation.',
        warnings: [],
        detailSections: [{
          title: 'Solve Target',
          lines: [
            `Detected variables: ${targetResolution.candidates.map((candidate) => candidate.name).join(', ')}`,
            targetResolution.selectedTarget
              ? `Selected target: ${targetResolution.selectedTarget}`
              : 'No solve target is selected.',
          ],
        }],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const solveTarget = targetResolution.selectedTarget ?? 'x';
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

  const outcome = rewriteEquationOutcomeTarget(
    runSharedEquationSolve({
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
  );

  return attachEquationRuntimeEnvelope(
    outcome,
    equationLatex,
    sharedResolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({ outcome }),
  );
}

type RunEquationAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  equationLatex: string;
  angleUnit: AngleUnit;
};

export function runEquationAlgebraTransform({
  action,
  equationLatex,
  angleUnit,
}: RunEquationAlgebraTransformRequest): DisplayOutcome {
  const title = getAlgebraTransformLabel(action);

  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Equation algebra transforms currently work only on = equations.',
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
        title,
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
  if (analysis.kind !== 'equation' || isRelationalOperator(analysis.topLevelOperator)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Enter a symbolic = equation before using an explicit algebra transform.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const result = applyEquationTransform(planner.resolvedLatex, action);
  if (!result) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'No explicit algebra transform is available for this equation yet.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({
        outcome: {
          kind: 'error',
          title,
          error: 'No explicit algebra transform is available for this equation yet.',
          warnings: [],
        },
      }),
    );
  }

  return attachEquationRuntimeEnvelope(
    {
      kind: 'success',
      title,
      exactLatex: result.exactLatex,
      exactSupplementLatex:
        result.exactSupplementLatex && result.exactSupplementLatex.length > 0
          ? result.exactSupplementLatex
          : undefined,
      warnings: [],
      resultOrigin: 'symbolic-engine',
      transformBadges: result.transformBadges,
      transformSummaryText: result.transformSummaryText,
      transformSummaryLatex: result.transformSummaryLatex,
    },
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({
      outcome: {
        kind: 'success',
        title,
        exactLatex: result.exactLatex,
        exactSupplementLatex:
          result.exactSupplementLatex && result.exactSupplementLatex.length > 0
            ? result.exactSupplementLatex
            : undefined,
        warnings: [],
        resultOrigin: 'symbolic-engine',
        transformBadges: result.transformBadges,
        transformSummaryText: result.transformSummaryText,
        transformSummaryLatex: result.transformSummaryLatex,
      },
    }),
  );
}

export function runEquationMode({
  equationScreen,
  equationLatex,
  equationSolveTarget,
  quadraticCoefficients,
  cubicCoefficients,
  quarticCoefficients,
  polynomialSystem2Latex,
  system2,
  system3,
  angleUnit,
  outputStyle,
  ansLatex,
  numericInterval,
  storedVariables,
  variableSubstitutionSnapshot,
}: RunEquationModeRequest): DisplayOutcome {
  if (equationScreen === 'linear2') {
    return solveSystem(system2, 2);
  }

  if (equationScreen === 'linear3') {
    return solveSystem(system3, 3);
  }

  if (equationScreen === 'polynomialSystem2') {
    return solvePolynomialSystem2x2(polynomialSystem2Latex, {
      storedVariables,
    });
  }

  if (equationScreen === 'quadratic') {
    return solvePolynomial('quadratic', quadraticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'cubic') {
    return solvePolynomial('cubic', cubicCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'quartic') {
    return solvePolynomial('quartic', quarticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'symbolic') {
    const namedNormalizedEquationLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
    const targetResolution = numericInterval
      ? resolveEquationSolveTarget(equationLatex, equationSolveTarget)
      : null;
    const protectedTarget = targetResolution?.selectedTarget ?? equationSolveTarget ?? undefined;
    const storedValuePolicy =
      numericInterval && protectedTarget
        ? resolveStoredValueModePolicy({
            mode: 'equation',
            action: 'equation-numeric-solve',
            protectedNames: [protectedTarget],
            protectedNameDescriptions: { [protectedTarget]: 'the solve target' },
          })
        : resolveStoredValueModePolicy({
            mode: 'equation',
            action: 'equation-symbolic-solve',
          });
    const substitution =
      storedValuePolicy.kind === 'apply'
        ? applyStoredVariableSubstitutions(equationLatex, substitutionSource, {
            protectedNames: storedValuePolicy.protectedNames,
          })
        : { latex: namedNormalizedEquationLatex, substitutions: [], protectedSubstitutions: [] };
    const outcome = solveSymbolicEquation(
      substitution.latex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
    );

    return withStoredValueDetails(outcome, {
      substitution,
      target: protectedTarget,
      interval: numericInterval,
      originalLatex: equationLatex,
      replayedSnapshot: Boolean(variableSubstitutionSnapshot),
      ignoredLines: ignoredStoredValuePolicyLines({
        latex: equationLatex,
        entries: substitutionSource,
        policy: storedValuePolicy,
      }),
    });
  }

  return {
    kind: 'error',
    title: 'Equation',
    error: 'Choose an equation tool before solving.',
    warnings: [],
  };
}
