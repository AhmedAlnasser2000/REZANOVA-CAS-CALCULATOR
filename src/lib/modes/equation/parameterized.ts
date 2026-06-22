import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { solveParameterizedLinearEquation } from '../../equation/parameterized/linear';
import { solveParameterizedPolynomialEquation } from '../../equation/parameterized/polynomial';
import { solveParameterizedRationalEquation } from '../../equation/parameterized/rational';
import { solveParameterizedFactorablePolynomialEquation } from '../../equation/parameterized/factorable-polynomial';
import { solveParameterizedSpecialFormRootsEquation } from '../../equation/parameterized/special-form-roots';
import { solveParameterizedCarrierEliminationEquation } from '../../equation/parameterized/carrier-elimination';
import { solveParameterizedCarrierEquation } from '../../equation/parameterized/carrier';
import { solveParameterizedCompositionEquation } from '../../equation/parameterized/composition';
import { solveParameterizedExpLogEquation } from '../../equation/parameterized/exp-log';
import { solveParameterizedMixedAlgebraicEquation } from '../../equation/parameterized/mixed-algebraic';
import { solveParameterizedTrigEquation } from '../../equation/parameterized/trig';
import { buildParameterizedBoundaryReadback } from '../../equation/parameterized/readback';
import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import { solveEquationAlgebraicIsolation } from '../../equation/equation-algebraic-isolation';
import { solveBoundedComplexEquation, solveComplexSpecialFormRootsEquation } from '../../equation/equation-complex';
import { solveSelectedTargetIsolationEquation } from '../../equation/equation-selected-target-isolation';
import {
  type EquationSelectedTargetSearchTraceRecorder,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
  recordSelectedTargetRoutePlan,
  shouldAttemptSelectedTargetRoute,
} from '../../equation/equation-target-shape';
import type { EquationSolveTargetResolution } from '../../equation/equation-target';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  AngleUnit,
  ComplexExactForm,
  DisplayOutcome,
  EquationDomainIntent,
  LegacyEquationAnswerMode,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  containsTargetedAbsLatex,
  finalizeSelectedTargetSymbolicOutcome,
  unsupportedComplexPreimageOutcome,
} from './outcomes';

type ParameterizedRouteInput = {
  equationLatex: string;
  answerMode: LegacyEquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  complexExactForm: ComplexExactForm;
  targetResolution: EquationSolveTargetResolution;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
};

function runTracedTopLevelFamily<T>(
  searchTrace: EquationSelectedTargetSearchTraceRecorder | undefined,
  family: Parameters<typeof recordSelectedTargetFamilyAttempt>[2],
  run: () => T,
) {
  recordSelectedTargetFamilyAttempt(searchTrace, 'top-level', family);
  return run();
}

export function runParameterizedUnsupportedRoute(input: ParameterizedRouteInput): DisplayOutcome | undefined {
  const {
    equationLatex,
    answerMode,
    equationDomainIntent,
    numericInterval,
    angleUnit,
    outputStyle,
    complexExactForm,
    targetResolution,
  } = input;
  const planner = { resolvedLatex: input.plannerResolvedLatex, badges: input.plannerBadges };
  const searchTrace = input.searchTrace;

  if (targetResolution.status !== 'parameterized-unsupported') {
    return undefined;
  }

    if (targetResolution.selectedTarget) {
      const selectedTarget = targetResolution.selectedTarget;
      const parameterizedOptions = {
        allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
          new Set(product.characters).size > 1),
      };
      const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
      const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
        ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
        : parameterizedSourceLatex;
      const routePlan = planSelectedTargetRouteFamilies(
        profileEquationTargetShape(
          parameterizedEquationLatex,
          selectedTarget,
          parameterizedOptions,
        ),
      );
      recordSelectedTargetRoutePlan(searchTrace, routePlan);

      if (answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval) {
        const complexSpecialForm = solveComplexSpecialFormRootsEquation(
          parameterizedEquationLatex,
          selectedTarget,
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

          const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

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
          selectedTarget,
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

          const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

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
          || containsTargetedAbsLatex(parameterizedEquationLatex, selectedTarget)
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

      const parameterizedLinear = shouldAttemptSelectedTargetRoute(routePlan, 'linear')
        ? runTracedTopLevelFamily(searchTrace, 'linear', () =>
          solveParameterizedLinearEquation(
          parameterizedEquationLatex,
          selectedTarget,
          parameterizedOptions,
          ))
        : undefined;

      if (parameterizedLinear?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'linear');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedLinear.exactLatex,
          exactSupplementLatex: parameterizedLinear.exactSupplementLatex,
          detailSections: parameterizedLinear.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedPolynomial = shouldAttemptSelectedTargetRoute(routePlan, 'polynomial')
        ? runTracedTopLevelFamily(searchTrace, 'polynomial', () =>
          solveParameterizedPolynomialEquation(
          parameterizedEquationLatex,
            selectedTarget,
            parameterizedOptions,
          ))
        : undefined;

      if (parameterizedPolynomial?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'polynomial');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedPolynomial.exactLatex,
          branchReadback: parameterizedPolynomial.branchReadback,
          exactSupplementLatex: parameterizedPolynomial.exactSupplementLatex,
          detailSections: parameterizedPolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedRational = shouldAttemptSelectedTargetRoute(routePlan, 'rational')
        ? runTracedTopLevelFamily(searchTrace, 'rational', () =>
          solveParameterizedRationalEquation(
          parameterizedEquationLatex,
            selectedTarget,
            parameterizedOptions,
          ))
        : undefined;

      if (parameterizedRational?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'rational');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedRational.exactLatex,
          branchReadback: parameterizedRational.branchReadback,
          exactSupplementLatex: parameterizedRational.exactSupplementLatex,
          detailSections: parameterizedRational.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedFactorablePolynomial = shouldAttemptSelectedTargetRoute(routePlan, 'factorable-polynomial')
        ? runTracedTopLevelFamily(searchTrace, 'factorable-polynomial', () =>
          solveParameterizedFactorablePolynomialEquation(
          parameterizedEquationLatex,
            selectedTarget,
            parameterizedOptions,
          ))
        : undefined;

      if (parameterizedFactorablePolynomial?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'factorable-polynomial');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedFactorablePolynomial.exactLatex,
          branchReadback: parameterizedFactorablePolynomial.branchReadback,
          exactSupplementLatex: parameterizedFactorablePolynomial.exactSupplementLatex,
          detailSections: parameterizedFactorablePolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const complexExactRoute = answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval;
      const parameterizedSpecialFormRoots = !complexExactRoute
        && shouldAttemptSelectedTargetRoute(routePlan, 'special-form-roots')
        ? runTracedTopLevelFamily(searchTrace, 'special-form-roots', () =>
          solveParameterizedSpecialFormRootsEquation(
            parameterizedEquationLatex,
            selectedTarget,
            parameterizedOptions,
          ))
        : undefined;

      if (parameterizedSpecialFormRoots?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'special-form-roots');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedSpecialFormRoots.exactLatex,
          branchReadback: parameterizedSpecialFormRoots.branchReadback,
          exactSupplementLatex: parameterizedSpecialFormRoots.exactSupplementLatex,
          detailSections: parameterizedSpecialFormRoots.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedCarrierElimination = shouldAttemptSelectedTargetRoute(routePlan, 'carrier-elimination')
        ? runTracedTopLevelFamily(searchTrace, 'carrier-elimination', () =>
          solveParameterizedCarrierEliminationEquation(
            parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (parameterizedCarrierElimination?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'carrier-elimination');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedCarrierElimination.exactLatex,
          branchReadback: parameterizedCarrierElimination.branchReadback,
          exactSupplementLatex: parameterizedCarrierElimination.exactSupplementLatex,
          detailSections: parameterizedCarrierElimination.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedCarrier = shouldAttemptSelectedTargetRoute(routePlan, 'carrier')
        ? runTracedTopLevelFamily(searchTrace, 'carrier', () =>
          solveParameterizedCarrierEquation(
          parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (parameterizedCarrier?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'carrier');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedCarrier.exactLatex,
          branchReadback: parameterizedCarrier.branchReadback,
          exactSupplementLatex: parameterizedCarrier.exactSupplementLatex,
          detailSections: parameterizedCarrier.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedAlgebraicIsolation = shouldAttemptSelectedTargetRoute(routePlan, 'algebraic-isolation')
        ? runTracedTopLevelFamily(searchTrace, 'algebraic-isolation', () =>
          solveEquationAlgebraicIsolation(
            parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              ...(answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval
                ? { answerDomain: 'complex' as const, outputStyle, complexExactForm }
                : {}),
            },
          ))
        : undefined;

      if (parameterizedAlgebraicIsolation?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'algebraic-isolation');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedAlgebraicIsolation.exactLatex,
          branchReadback: parameterizedAlgebraicIsolation.branchReadback,
          exactSupplementLatex: parameterizedAlgebraicIsolation.exactSupplementLatex,
          detailSections: parameterizedAlgebraicIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
          ...(parameterizedAlgebraicIsolation.answerDomain
            ? { answerDomain: parameterizedAlgebraicIsolation.answerDomain }
            : {}),
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedExpLog = shouldAttemptSelectedTargetRoute(routePlan, 'exp-log')
        ? runTracedTopLevelFamily(searchTrace, 'exp-log', () =>
          solveParameterizedExpLogEquation(
          parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (parameterizedExpLog?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'exp-log');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedExpLog.exactLatex,
          branchReadback: parameterizedExpLog.branchReadback,
          exactSupplementLatex: parameterizedExpLog.exactSupplementLatex,
          detailSections: parameterizedExpLog.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedTrig = shouldAttemptSelectedTargetRoute(routePlan, 'trig')
        ? runTracedTopLevelFamily(searchTrace, 'trig', () =>
          solveParameterizedTrigEquation(
          parameterizedEquationLatex,
            selectedTarget,
            angleUnit,
            parameterizedOptions,
          ))
        : undefined;

      if (parameterizedTrig?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'trig');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedTrig.exactLatex,
          branchReadback: parameterizedTrig.branchReadback,
          exactSupplementLatex: parameterizedTrig.exactSupplementLatex,
          detailSections: parameterizedTrig.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedComposition = shouldAttemptSelectedTargetRoute(routePlan, 'composition')
        ? runTracedTopLevelFamily(searchTrace, 'composition', () =>
          solveParameterizedCompositionEquation(
          parameterizedEquationLatex,
            selectedTarget,
            angleUnit,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (parameterizedComposition?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'composition');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedComposition.exactLatex,
          branchReadback: parameterizedComposition.branchReadback,
          exactSupplementLatex: parameterizedComposition.exactSupplementLatex,
          detailSections: parameterizedComposition.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedMixedAlgebraic = shouldAttemptSelectedTargetRoute(routePlan, 'mixed-algebraic')
        ? runTracedTopLevelFamily(searchTrace, 'mixed-algebraic', () =>
          solveParameterizedMixedAlgebraicEquation(
          parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (parameterizedMixedAlgebraic?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'mixed-algebraic');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedMixedAlgebraic.exactLatex,
          branchReadback: parameterizedMixedAlgebraic.branchReadback,
          exactSupplementLatex: parameterizedMixedAlgebraic.exactSupplementLatex,
          detailSections: parameterizedMixedAlgebraic.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const selectedTargetIsolation = shouldAttemptSelectedTargetRoute(routePlan, 'selected-target-isolation')
        ? runTracedTopLevelFamily(searchTrace, 'selected-target-isolation', () =>
          solveSelectedTargetIsolationEquation(
          parameterizedEquationLatex,
            selectedTarget,
            angleUnit,
            {
              ...parameterizedOptions,
              searchTrace,
            },
          ))
        : undefined;

      if (selectedTargetIsolation?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'selected-target-isolation');
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: selectedTargetIsolation.exactLatex,
          exactSupplementLatex: selectedTargetIsolation.exactSupplementLatex,
          detailSections: selectedTargetIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      let boundaryStop: { reason: string; message: string } =
        parameterizedPolynomial?.kind === 'unsupported'
          ? {
            reason: parameterizedPolynomial.reason,
            message: parameterizedPolynomial.message,
          }
          : {
            reason: 'target-in-unsupported-operation',
            message: 'No supported exact selected-target solving path matched this equation.',
          };
      if (parameterizedComposition?.kind === 'unsupported' && parameterizedComposition.reason !== 'no-composition') {
        boundaryStop = {
          reason: parameterizedComposition.reason,
          message: parameterizedComposition.message,
        };
      } else if (
        parameterizedMixedAlgebraic?.kind === 'unsupported'
        && parameterizedMixedAlgebraic.reason !== 'no-mixed-algebraic'
      ) {
        boundaryStop = {
          reason: parameterizedMixedAlgebraic.reason,
          message: parameterizedMixedAlgebraic.message,
        };
      } else if (parameterizedTrig?.kind === 'unsupported' && parameterizedTrig.reason !== 'no-trig') {
        boundaryStop = {
          reason: parameterizedTrig.reason,
          message: parameterizedTrig.message,
        };
      } else if (parameterizedExpLog?.kind === 'unsupported' && parameterizedExpLog.reason !== 'no-exp-log') {
        boundaryStop = {
          reason: parameterizedExpLog.reason,
          message: parameterizedExpLog.message,
        };
      } else if (parameterizedCarrier?.kind === 'unsupported' && parameterizedCarrier.reason !== 'no-carrier') {
        boundaryStop = {
          reason: parameterizedCarrier.reason,
          message: parameterizedCarrier.message,
        };
      } else if (
        parameterizedSpecialFormRoots?.kind === 'unsupported'
        && parameterizedSpecialFormRoots.reason !== 'no-special-form'
      ) {
        boundaryStop = {
          reason: parameterizedSpecialFormRoots.reason,
          message: parameterizedSpecialFormRoots.message,
        };
      } else if (
        parameterizedCarrierElimination?.kind === 'unsupported'
        && parameterizedCarrierElimination.reason !== 'no-carrier-elimination'
      ) {
        boundaryStop = {
          reason: parameterizedCarrierElimination.reason,
          message: parameterizedCarrierElimination.message,
        };
      } else if (parameterizedRational?.kind === 'unsupported' && parameterizedRational.reason !== 'not-rational') {
        boundaryStop = {
          reason: parameterizedRational.reason,
          message: parameterizedRational.message,
        };
      } else if (
        parameterizedFactorablePolynomial?.kind === 'unsupported'
        && parameterizedFactorablePolynomial.reason !== 'not-factorable'
      ) {
        boundaryStop = {
          reason: parameterizedFactorablePolynomial.reason,
          message: parameterizedFactorablePolynomial.message,
        };
      }
      if (
        selectedTargetIsolation?.kind === 'unsupported'
        && selectedTargetIsolation.reason !== 'no-isolation'
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
        target: selectedTarget,
        detectedVariables,
        equationLatex,
      });
      recordSelectedTargetFinalStop(searchTrace, 'top-level', boundaryStop.reason, boundaryStop.message);

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
