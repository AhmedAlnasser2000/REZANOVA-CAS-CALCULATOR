import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { solveParameterizedLinearEquation } from '../../equation/parameterized/linear';
import { solveParameterizedPolynomialEquation } from '../../equation/parameterized/polynomial';
import { solveParameterizedRationalEquation } from '../../equation/parameterized/rational';
import { solveParameterizedFactorablePolynomialEquation } from '../../equation/parameterized/factorable-polynomial';
import { solveParameterizedSpecialFormRootsEquation } from '../../equation/parameterized/special-form-roots';
import { solveParameterizedCarrierEliminationEquation } from '../../equation/parameterized/carrier-elimination';
import { solveParameterizedCarrierEquation } from '../../equation/parameterized/carrier';
import { inspectHigherDegreePolynomialEquation } from '../../equation/parameterized/higher-degree-polynomial-policy';
import { solveParameterizedCompositionEquation } from '../../equation/parameterized/composition';
import { solveParameterizedExpLogEquation } from '../../equation/parameterized/exp-log';
import { solveParameterizedMixedAlgebraicEquation } from '../../equation/parameterized/mixed-algebraic';
import { solveParameterizedTrigEquation } from '../../equation/parameterized/trig';
import { buildParameterizedBoundaryReadback } from '../../equation/parameterized/readback';
import { runParameterizedFormulaRoutes } from './parameterized-formula-routes';
import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import { diagnoseComplexLocusPolicyForLatex } from '../../equation/complex/locus-policy';
import { solveEquationAlgebraicIsolation } from '../../equation/equation-algebraic-isolation';
import { solveBoundedComplexEquation, solveComplexSpecialFormRootsEquation } from '../../equation/equation-complex';
import { solveSelectedTargetIsolationEquation } from '../../equation/equation-selected-target-isolation';
import {
  createEquationFiniteRootSuccessOutcome,
  createEquationResultOutcome,
} from '../../equation/equation-solve-result';
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
import {
  createBoundedComplexEquationOutcome,
  createParameterizedCarrierOutcome,
  createParameterizedExpLogOutcome,
  createParameterizedTrigOutcome,
} from './parameterized-result-outcomes';
import type {
  AngleUnit,
  ComplexExactForm,
  ComplexSolveRegion,
  DisplayOutcome,
  EquationDomainIntent,
  LegacyEquationAnswerMode,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
  unsupportedComplexLocusOutcome,
  unsupportedComplexPreimageOutcome,
} from './outcomes';
import { tryComplexWrapperRoutes } from './complex-wrapper-routes';
import {
  isDeferredComplexWrapperBoundary,
  withDeferredComplexWrapperBoundary,
} from './complex-wrapper-fallback';

type ParameterizedRouteInput = {
  equationLatex: string;
  answerMode: LegacyEquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  complexRegion?: ComplexSolveRegion;
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
      let deferredComplexWrapperOutcome: DisplayOutcome | undefined;
      const finalizeTopLevelOutcome = (outcome: DisplayOutcome) =>
        withDeferredComplexWrapperBoundary(
          finalizeSelectedTargetSymbolicOutcome(outcome, selectedTarget),
          deferredComplexWrapperOutcome,
        );
      const attachTopLevelOutcome = (outcome: DisplayOutcome) => {
        const finalOutcome = finalizeTopLevelOutcome(outcome);
        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      };

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
          const outcome: DisplayOutcome = createEquationResultOutcome({
            kind: 'success',
            title: 'Solve',
            exactLatex: complexSpecialForm.exactLatex,
            branchReadback: complexSpecialForm.branchReadback,
            approxText: complexSpecialForm.approxText,
            detailSections: complexSpecialForm.detailSections,
            warnings: [],
            resultOrigin: 'symbolic',
            answerDomain: 'complex',
          });

          return attachTopLevelOutcome(outcome);
        }

        const symbolicCoefficientCardanoReady = complexSpecialForm.reason === 'symbolic-coefficients'
          && inspectHigherDegreePolynomialEquation(
            parameterizedEquationLatex,
            selectedTarget,
            parameterizedOptions,
          ).kind === 'ready';
        if (
          complexSpecialForm.reason === 'total-degree-limit'
          || (complexSpecialForm.reason === 'symbolic-coefficients' && !symbolicCoefficientCardanoReady)
          || complexSpecialForm.reason === 'complex-carrier-root'
        ) {
          return attachEquationRuntimeEnvelope(
            createEquationResultOutcome({
              kind: 'error',
              title: 'Solve',
              error: complexSpecialForm.message,
              warnings: [],
              detailSections: [{
                title: 'Complex Boundary',
                lineKind: 'text',
                lines: [
                  'Complex special-form solving is currently bounded to exact-rational direct and carrier-quadratic shapes through 12 visible branches.',
                  'Symbolic carrier coefficients or constants require a formal principal-branch root policy, so they stay deferred for now.',
                  'Turn Complex Off for the widened real Exact route when appropriate, or use Numeric Interval Solve for local real numeric roots.',
                ],
              }],
            }),
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
          return attachTopLevelOutcome(createBoundedComplexEquationOutcome(
            boundedComplex,
            'equation-parameterized-bounded-complex-roots',
          ));
        }

        const complexWrapperOutcome = tryComplexWrapperRoutes({
          equationLatex,
          parameterizedEquationLatex,
          selectedTarget,
          parameterizedOptions,
          angleUnit, outputStyle, complexExactForm,
          plannerResolvedLatex: planner.resolvedLatex,
          plannerBadges: planner.badges,
          searchTrace, routePlan,
          stopOnRecognizedPreimageUnsupported: true,
        });
        if (complexWrapperOutcome) {
          if (isDeferredComplexWrapperBoundary(complexWrapperOutcome)) {
            deferredComplexWrapperOutcome = complexWrapperOutcome;
          } else {
            return complexWrapperOutcome;
          }
        }

        const locusPolicy = diagnoseComplexLocusPolicyForLatex(parameterizedEquationLatex, {
          target: selectedTarget,
        });
        if (locusPolicy.hasLocusDeferredCarrier) {
          const boundaryOutcome = unsupportedComplexLocusOutcome(locusPolicy, {
            equationLatex,
            target: selectedTarget,
            complexRegion: input.complexRegion,
          });
          return attachEquationRuntimeEnvelope(
            boundaryOutcome,
            equationLatex,
            planner.resolvedLatex,
            planner.badges,
            classifyEquationRuntimeAdvisories({ invalidRequest: true }),
          );
        }

        if (containsEquationImaginaryUnitLatex(parameterizedEquationLatex)) {
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
        const outcome: DisplayOutcome = parameterizedLinear.canonicalMath
          ? createEquationFiniteRootSuccessOutcome({
              title: 'Solve',
              exactLatex: parameterizedLinear.exactLatex,
              canonicalMath: parameterizedLinear.canonicalMath,
              exactSupplementLatex: parameterizedLinear.exactSupplementLatex,
              detailSections: parameterizedLinear.detailSections,
              warnings: [],
              resultOrigin: 'symbolic',
              mathJsonRouteId: 'equation.linear',
              mathJsonSource: 'equation-parameterized-linear-roots',
            })
          : createEquationResultOutcome({
              kind: 'success',
              title: 'Solve',
              exactLatex: parameterizedLinear.exactLatex,
              exactSupplementLatex: parameterizedLinear.exactSupplementLatex,
              detailSections: parameterizedLinear.detailSections,
              warnings: [],
              resultOrigin: 'symbolic',
            });


        return attachTopLevelOutcome(outcome);
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
        const outcome: DisplayOutcome = parameterizedPolynomial.canonicalMath
          ? createEquationFiniteRootSuccessOutcome({
              title: 'Solve',
              exactLatex: parameterizedPolynomial.exactLatex,
              canonicalMath: parameterizedPolynomial.canonicalMath,
              branchReadback: parameterizedPolynomial.branchReadback,
              exactSupplementLatex: parameterizedPolynomial.exactSupplementLatex,
              detailSections: parameterizedPolynomial.detailSections,
              warnings: [],
              resultOrigin: 'symbolic',
              mathJsonRouteId: 'equation.polynomial',
              mathJsonSource: 'equation-parameterized-polynomial-roots',
            })
          : createEquationResultOutcome({
              kind: 'success',
              title: 'Solve',
              exactLatex: parameterizedPolynomial.exactLatex,
              branchReadback: parameterizedPolynomial.branchReadback,
              exactSupplementLatex: parameterizedPolynomial.exactSupplementLatex,
              detailSections: parameterizedPolynomial.detailSections,
              warnings: [],
              resultOrigin: 'symbolic',
            });


        return attachTopLevelOutcome(outcome);
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
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedRational.exactLatex,
          branchReadback: parameterizedRational.branchReadback,
          exactSupplementLatex: parameterizedRational.exactSupplementLatex,
          detailSections: parameterizedRational.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        });


        return attachTopLevelOutcome(outcome);
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
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedFactorablePolynomial.exactLatex,
          branchReadback: parameterizedFactorablePolynomial.branchReadback,
          exactSupplementLatex: parameterizedFactorablePolynomial.exactSupplementLatex,
          detailSections: parameterizedFactorablePolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        });


        return attachTopLevelOutcome(outcome);
      }

      const complexExactRoute = answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval;
      const realExactRoute = answerMode === 'exact' && equationDomainIntent === 'real' && !numericInterval;
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
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedSpecialFormRoots.exactLatex,
          branchReadback: parameterizedSpecialFormRoots.branchReadback,
          exactSupplementLatex: parameterizedSpecialFormRoots.exactSupplementLatex,
          detailSections: parameterizedSpecialFormRoots.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        });


        return attachTopLevelOutcome(outcome);
      }

      const parameterizedCarrierElimination = shouldAttemptSelectedTargetRoute(routePlan, 'carrier-elimination')
        ? runTracedTopLevelFamily(searchTrace, 'carrier-elimination', () =>
          solveParameterizedCarrierEliminationEquation(
            parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedCarrierElimination?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'carrier-elimination');
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedCarrierElimination.exactLatex,
          branchReadback: parameterizedCarrierElimination.branchReadback,
          exactSupplementLatex: parameterizedCarrierElimination.exactSupplementLatex,
          detailSections: parameterizedCarrierElimination.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        });


        return attachTopLevelOutcome(outcome);
      }

      const parameterizedCarrier = shouldAttemptSelectedTargetRoute(routePlan, 'carrier')
        ? runTracedTopLevelFamily(searchTrace, 'carrier', () =>
          solveParameterizedCarrierEquation(
          parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedCarrier?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'carrier');
        return attachTopLevelOutcome(createParameterizedCarrierOutcome(
          parameterizedCarrier,
          parameterizedEquationLatex,
        ));
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
        const outcome: DisplayOutcome = createEquationResultOutcome({
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
        });


        return attachTopLevelOutcome(outcome);
      }

      const formulaRoutes = runParameterizedFormulaRoutes({
        equationLatex,
        parameterizedEquationLatex,
        selectedTarget,
        parameterizedOptions,
        routePlan,
        searchTrace,
        domain: complexExactRoute ? 'complex' : realExactRoute ? 'real' : undefined,
        complexExactForm,
        plannerResolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
      });
      if (formulaRoutes.outcome) {
        return withDeferredComplexWrapperBoundary(
          formulaRoutes.outcome,
          deferredComplexWrapperOutcome,
        );
      }
      const parameterizedCubicCardano = formulaRoutes.cubicCardano;
      const parameterizedQuarticFerrari = formulaRoutes.quarticFerrari;

      const parameterizedExpLog = shouldAttemptSelectedTargetRoute(routePlan, 'exp-log')
        ? runTracedTopLevelFamily(searchTrace, 'exp-log', () =>
          solveParameterizedExpLogEquation(
            parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedExpLog?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'exp-log');
        return attachTopLevelOutcome(createParameterizedExpLogOutcome(parameterizedExpLog));
      }

      const parameterizedTrig = shouldAttemptSelectedTargetRoute(routePlan, 'trig')
        ? runTracedTopLevelFamily(searchTrace, 'trig', () =>
          solveParameterizedTrigEquation(
          parameterizedEquationLatex,
            selectedTarget,
            angleUnit,
            {
              ...parameterizedOptions,
              searchTrace,
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedTrig?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'trig');
        return attachTopLevelOutcome(createParameterizedTrigOutcome(parameterizedTrig));
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
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedComposition?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'composition');
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedComposition.exactLatex,
          branchReadback: parameterizedComposition.branchReadback,
          exactSupplementLatex: parameterizedComposition.exactSupplementLatex,
          detailSections: parameterizedComposition.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
          ...(parameterizedComposition.answerDomain
            ? { answerDomain: parameterizedComposition.answerDomain }
            : {}),
        });


        return attachTopLevelOutcome(outcome);
      }

      const parameterizedMixedAlgebraic = shouldAttemptSelectedTargetRoute(routePlan, 'mixed-algebraic')
        ? runTracedTopLevelFamily(searchTrace, 'mixed-algebraic', () =>
          solveParameterizedMixedAlgebraicEquation(
          parameterizedEquationLatex,
            selectedTarget,
            {
              ...parameterizedOptions,
              searchTrace,
              ...(realExactRoute ? { formulaHandoff: { domain: 'real' as const } } : {}),
            },
          ))
        : undefined;

      if (parameterizedMixedAlgebraic?.kind === 'success') {
        recordSelectedTargetFamilySuccess(searchTrace, 'top-level', 'mixed-algebraic');
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedMixedAlgebraic.exactLatex,
          branchReadback: parameterizedMixedAlgebraic.branchReadback,
          exactSupplementLatex: parameterizedMixedAlgebraic.exactSupplementLatex,
          detailSections: parameterizedMixedAlgebraic.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
          ...(parameterizedMixedAlgebraic.answerDomain
            ? { answerDomain: parameterizedMixedAlgebraic.answerDomain }
            : {}),
        });


        return attachTopLevelOutcome(outcome);
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
        const outcome: DisplayOutcome = createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: selectedTargetIsolation.exactLatex,
          exactSupplementLatex: selectedTargetIsolation.exactSupplementLatex,
          detailSections: selectedTargetIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        });


        return attachTopLevelOutcome(outcome);
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
        parameterizedCubicCardano?.kind === 'unsupported'
        && parameterizedCubicCardano.reason !== 'not-cubic'
      ) {
        boundaryStop = {
          reason: parameterizedCubicCardano.reason,
          message: parameterizedCubicCardano.message,
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
        parameterizedCubicCardano?.kind === 'unsupported'
        && parameterizedCubicCardano.reason === 'ferrari-deferred'
      ) {
        boundaryStop = {
          reason: parameterizedCubicCardano.reason,
          message: parameterizedCubicCardano.message,
        };
      }
      if (
        parameterizedQuarticFerrari?.kind === 'unsupported'
        && parameterizedQuarticFerrari.reason !== 'not-quartic'
      ) {
        boundaryStop = {
          reason: parameterizedQuarticFerrari.reason,
          message: parameterizedQuarticFerrari.message,
        };
      }
      if (
        selectedTargetIsolation?.kind === 'unsupported'
        && selectedTargetIsolation.reason !== 'no-isolation'
        && !(
          selectedTargetIsolation.reason === 'multiple-target-islands'
          && (
            boundaryStop.reason === 'mixed-carriers'
            || boundaryStop.reason === 'ferrari-deferred'
          )
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
        createEquationResultOutcome({
          kind: 'error',
          title: 'Solve',
          error: readback.error,
          warnings: [],
          detailSections: readback.detailSections,
        }),
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
    }

    return attachEquationRuntimeEnvelope(
      createEquationResultOutcome({
        kind: 'error',
        title: 'Solve',
        error: targetResolution.message ?? 'Choose a solve target before solving this multi-symbol equation.',
        warnings: [],
        detailSections: [{
          title: 'Solve Target',
          lineKind: 'text',
          lines: [
            `Detected variables: ${targetResolution.candidates.map((candidate) => candidate.name).join(', ')}`,
            targetResolution.selectedTarget
              ? `Selected target: ${targetResolution.selectedTarget}`
              : 'No solve target is selected.',
          ],
        }],
      }),
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  
}
