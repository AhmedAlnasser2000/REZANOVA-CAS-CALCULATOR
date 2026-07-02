import { runGuardedDirectSymbolicFallback } from '../../equation/guarded-solve';
import { isTopLevelInequalityLatex } from '../../equation/equation-inequality';
import { solvePolynomialSystem2x2 } from '../../equation/equation-polynomial-system';
import {
  attachEquationAnalysisEvidence,
  buildEquationDomainFactEvidence,
  buildEquationRouteEvidence,
  buildEquationSingularityEvidence,
} from '../../equation/analysis-evidence';
import { runSharedEquationSolveWithTraceAsync } from '../../equation/shared-solve';
import {
  buildEquationOoePilotMetadata,
  buildEquationProvenance,
  buildEquationSolveControlFromOoe,
  equationPilotDefinition,
  prepareEquationOoePilot,
  type EquationOoePilotMetadata,
  type EquationRuntimeHostExecution,
} from '../../ooe/pilots/equation-pilot';
import type { OoeRuntimeEnvelope } from '../../ooe/runtime-control/runtime-envelope';
import { runOoeRuntimeJob } from '../../ooe/runtime-control/runtime-coordinator';
import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import type { DisplayOutcome } from '../../../types/calculator';
import { solveSystem, solvePolynomial } from './guided-polynomial';
import { buildEquationOoeRevisionSnapshot } from './ooe-snapshot';
import {
  complexRegionSolveNeedsNumericParametersOutcome,
  numericIntervalSolveNeedsIntervalOutcome,
  numericIntervalSolveNeedsNumericParametersOutcome,
  withEquationAnswerMode,
  withEquationNumericRouteKind,
} from './outcomes';
import {
  prepareEquationStoredValueSubstitution,
  remainingApproximateModeParameters,
  withStoredValueDetails,
} from './stored-values';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import { solveSymbolicEquation, solveSymbolicEquationAsync } from './symbolic';
import type {
  AsyncSharedEquationSolveRunner,
  EquationModeIsolatedWorkerRunResult,
  RunEquationModeRequest,
} from './types';

function buildEquationRunEvidence(input: {
  outcome: DisplayOutcome;
  equationLatex: string;
  target?: string | null;
  angleUnit: RunEquationModeRequest['angleUnit'];
  numericInterval?: RunEquationModeRequest['numericInterval'];
  complexRegion?: RunEquationModeRequest['complexRegion'];
  equationDomainIntent: RunEquationModeRequest['equationDomainIntent'];
}) {
  const routeEvidence = buildEquationRouteEvidence({
    outcome: input.outcome,
    target: input.target ?? undefined,
    numericInterval: input.numericInterval,
    complexRegion: input.complexRegion,
    equationDomainIntent: input.equationDomainIntent ?? 'real',
  });
  const route = routeEvidence[0]?.sourceRoute ?? 'equation';
  const selectedTarget = input.target ?? routeEvidence[0]?.target;
  if (!selectedTarget) {
    return routeEvidence;
  }
  const classification = classifyEquationNumericShape({
    equationLatex: input.equationLatex,
    equationSolveTarget: selectedTarget,
    angleUnit: input.angleUnit,
  });

  return [
    ...routeEvidence,
    ...buildEquationDomainFactEvidence({
      facts: classification.domainFacts,
      target: selectedTarget,
      sourceRoute: route,
    }),
    ...buildEquationSingularityEvidence({
      facts: classification.domainFacts,
      equationLatex: input.equationLatex,
      target: selectedTarget,
      sourceRoute: route,
      angleUnit: input.angleUnit,
    }),
  ];
}

export function runEquationMode({
  equationScreen,
  equationLatex,
  equationSolveTarget,
  equationAnswerMode = 'exact',
  equationDomainIntent = 'real',
  complexExactForm = 'rectangular',
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
  complexRegion,
  storedVariables,
  variableSubstitutionSnapshot,
  useStoredValueSubstitution,
  sharedSolveRunner,
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
    return solvePolynomial('quadratic', quadraticCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'cubic') {
    return solvePolynomial('cubic', cubicCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'quartic') {
    return solvePolynomial('quartic', quarticCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'symbolic') {
    const hasTopLevelInequality = isTopLevelInequalityLatex(equationLatex);
    const isNumericIntervalRoute = Boolean(numericInterval) && !hasTopLevelInequality;
    const isComplexRegionRoute = Boolean(complexRegion) && equationDomainIntent === 'complex' && !hasTopLevelInequality;
    if (equationAnswerMode === 'approximate' && !numericInterval && !isComplexRegionRoute && !hasTopLevelInequality) {
      return numericIntervalSolveNeedsIntervalOutcome();
    }

    const { protectedTarget, substitution, ignoredLines } = prepareEquationStoredValueSubstitution({
      equationLatex,
      equationSolveTarget,
      forceNumericPolicy: isComplexRegionRoute,
      forceStoredValueSubstitution: useStoredValueSubstitution,
      numericInterval,
      storedVariables,
      variableSubstitutionSnapshot,
    });
    const additionalPolicyLines = useStoredValueSubstitution && protectedTarget
      ? [`Kept ${protectedTarget} symbolic as the solve target.`]
      : undefined;
    if (isNumericIntervalRoute || isComplexRegionRoute) {
      const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
      if (remainingParameters.length > 0) {
        const missingParameterOutcome = withStoredValueDetails(
          isComplexRegionRoute
            ? complexRegionSolveNeedsNumericParametersOutcome(remainingParameters, protectedTarget)
            : numericIntervalSolveNeedsNumericParametersOutcome(remainingParameters),
          {
            substitution,
            target: protectedTarget,
            interval: numericInterval,
            originalLatex: equationLatex,
            replayedSnapshot: Boolean(variableSubstitutionSnapshot) && !useStoredValueSubstitution,
            ignoredLines,
            additionalPolicyLines,
          },
        );
        return attachEquationAnalysisEvidence(
          missingParameterOutcome,
          buildEquationRunEvidence({
            outcome: missingParameterOutcome,
            equationLatex: substitution.latex,
            target: protectedTarget ?? equationSolveTarget ?? undefined,
            angleUnit,
            numericInterval,
            complexRegion,
            equationDomainIntent,
          }),
        );
      }
    }
    const outcome = solveSymbolicEquation(
      substitution.latex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
      equationAnswerMode,
      equationDomainIntent,
      complexExactForm,
      complexRegion,
      sharedSolveRunner,
    );

    const storedValueOutcome = withStoredValueDetails(outcome, {
      substitution,
      target: protectedTarget,
      interval: numericInterval,
      originalLatex: equationLatex,
      replayedSnapshot: Boolean(variableSubstitutionSnapshot) && !useStoredValueSubstitution,
      ignoredLines,
      additionalPolicyLines,
    });

    const finalOutcome = isNumericIntervalRoute
      ? withEquationNumericRouteKind(storedValueOutcome)
      : withEquationAnswerMode(storedValueOutcome, equationAnswerMode === 'isolate' ? 'isolate' : 'exact');
    return attachEquationAnalysisEvidence(
      finalOutcome,
      buildEquationRunEvidence({
        outcome: finalOutcome,
        equationLatex: substitution.latex,
        target: protectedTarget ?? equationSolveTarget ?? undefined,
        angleUnit,
        numericInterval,
        complexRegion,
        equationDomainIntent,
      }),
    );
  }

  return {
    kind: 'error',
    title: 'Equation',
    error: 'Choose an equation tool before solving.',
    warnings: [],
  };
}

export async function runEquationModeWithAsyncSharedSolve(
  request: RunEquationModeRequest,
  asyncSharedSolveRunner: AsyncSharedEquationSolveRunner,
): Promise<DisplayOutcome> {
  if (request.equationScreen !== 'symbolic') {
    return runEquationMode(request);
  }

  const {
    equationLatex,
    equationSolveTarget,
    equationAnswerMode = 'exact',
    equationDomainIntent = 'real',
    complexExactForm = 'rectangular',
    angleUnit,
    outputStyle,
    ansLatex,
    numericInterval,
    complexRegion,
    storedVariables,
    variableSubstitutionSnapshot,
    useStoredValueSubstitution,
  } = request;

  const hasTopLevelInequality = isTopLevelInequalityLatex(equationLatex);
  const isNumericIntervalRoute = Boolean(numericInterval) && !hasTopLevelInequality;
  const isComplexRegionRoute = Boolean(complexRegion) && equationDomainIntent === 'complex' && !hasTopLevelInequality;
  if (equationAnswerMode === 'approximate' && !numericInterval && !isComplexRegionRoute && !hasTopLevelInequality) {
    return numericIntervalSolveNeedsIntervalOutcome();
  }

  const { protectedTarget, substitution, ignoredLines } = prepareEquationStoredValueSubstitution({
    equationLatex,
    equationSolveTarget,
    forceNumericPolicy: isComplexRegionRoute,
    forceStoredValueSubstitution: useStoredValueSubstitution,
    numericInterval,
    storedVariables,
    variableSubstitutionSnapshot,
  });
  const additionalPolicyLines = useStoredValueSubstitution && protectedTarget
    ? [`Kept ${protectedTarget} symbolic as the solve target.`]
    : undefined;
  if (isNumericIntervalRoute || isComplexRegionRoute) {
    const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
    if (remainingParameters.length > 0) {
      const missingParameterOutcome = withStoredValueDetails(
        isComplexRegionRoute
          ? complexRegionSolveNeedsNumericParametersOutcome(remainingParameters, protectedTarget)
          : numericIntervalSolveNeedsNumericParametersOutcome(remainingParameters),
        {
          substitution,
          target: protectedTarget,
          interval: numericInterval,
          originalLatex: equationLatex,
          replayedSnapshot: Boolean(variableSubstitutionSnapshot) && !useStoredValueSubstitution,
          ignoredLines,
          additionalPolicyLines,
        },
      );
      return attachEquationAnalysisEvidence(
        missingParameterOutcome,
        buildEquationRunEvidence({
          outcome: missingParameterOutcome,
          equationLatex: substitution.latex,
          target: protectedTarget ?? equationSolveTarget ?? undefined,
          angleUnit,
          numericInterval,
          complexRegion,
          equationDomainIntent,
        }),
      );
    }
  }

  const outcome = await solveSymbolicEquationAsync(
    substitution.latex,
    angleUnit,
    outputStyle,
    ansLatex,
    equationSolveTarget,
    numericInterval,
    equationAnswerMode,
    equationDomainIntent,
    complexExactForm,
    complexRegion,
    asyncSharedSolveRunner,
  );

  const storedValueOutcome = withStoredValueDetails(outcome, {
    substitution,
    target: protectedTarget,
    interval: numericInterval,
    originalLatex: equationLatex,
    replayedSnapshot: Boolean(variableSubstitutionSnapshot) && !useStoredValueSubstitution,
    ignoredLines,
    additionalPolicyLines,
  });

  const finalOutcome = isNumericIntervalRoute
    ? withEquationNumericRouteKind(storedValueOutcome)
    : withEquationAnswerMode(storedValueOutcome, equationAnswerMode === 'isolate' ? 'isolate' : 'exact');
  return attachEquationAnalysisEvidence(
    finalOutcome,
    buildEquationRunEvidence({
      outcome: finalOutcome,
      equationLatex: substitution.latex,
      target: protectedTarget ?? equationSolveTarget ?? undefined,
      angleUnit,
      numericInterval,
      complexRegion,
      equationDomainIntent,
    }),
  );
}

export async function runEquationModeForIsolatedWorker(
  request: RunEquationModeRequest,
): Promise<EquationModeIsolatedWorkerRunResult> {
  let guardedTrace: EquationOoePilotMetadata['guardedTrace'];
  const payload = await runEquationModeWithAsyncSharedSolve(
    request,
    async (sharedRequest) => {
      const traced = await runSharedEquationSolveWithTraceAsync(sharedRequest);
      guardedTrace = traced.trace;
      return traced.outcome;
    },
  );

  return {
    payload,
    guardedTrace,
  };
}

export async function runEquationModeWithOoePilot(
  request: RunEquationModeRequest,
  options?: OoeJobContextOptions,
): Promise<OoeRuntimeEnvelope<DisplayOutcome, EquationOoePilotMetadata>> {
  let guardedTrace: EquationOoePilotMetadata['guardedTrace'];
  let runtimeHostExecution: EquationRuntimeHostExecution | undefined;
  const routeSnapshot = buildEquationOoeRevisionSnapshot(request);

  return runOoeRuntimeJob({
    definition: equationPilotDefinition(),
    routeLabel: 'equation.solve',
    routeSnapshot,
    options,
    prepareStatus: prepareEquationOoePilot,
    run: async (controlContext) => {
      const { runEquationModeViaIsolatedWorker } = await import('../worker-clients/equation-worker-client');
      const result = await runEquationModeViaIsolatedWorker(
        request,
        controlContext,
        {
          fallback: async () => {
            const payload = await runEquationModeWithAsyncSharedSolve(
              request,
              async (sharedRequest) => {
                const control = buildEquationSolveControlFromOoe(controlContext);
                const traced = await runSharedEquationSolveWithTraceAsync(sharedRequest, {
                  control,
                  directSymbolicRunner: async (input) => {
                    const { runEquationDirectSymbolicViaIsolatedWorker } = await import(
                      '../../equation/equation-direct-symbolic-worker-client'
                    );
                    return runEquationDirectSymbolicViaIsolatedWorker(
                      {
                        request: input.request,
                        depth: input.depth,
                      },
                      controlContext,
                      {
                        fallback: () => runGuardedDirectSymbolicFallback(input.request),
                      },
                    );
                  },
                });
                guardedTrace = traced.trace;
                return traced.outcome;
              },
            );
            return {
              payload,
              guardedTrace,
            };
          },
        },
      );
      guardedTrace = result.guardedTrace;
      runtimeHostExecution = result.hostExecution;
      return result.payload;
    },
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildEquationOoePilotMetadata(
      status,
      guardedTrace,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      runtimeHostExecution,
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => buildEquationProvenance({
      payload,
      metadata,
      routeSnapshot,
    }),
  });
}
