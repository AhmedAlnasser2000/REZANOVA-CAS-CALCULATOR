import { runGuardedDirectSymbolicFallback } from '../../equation/guarded-solve';
import { isTopLevelInequalityLatex } from '../../equation/equation-inequality';
import { solvePolynomialSystem2x2 } from '../../equation/equation-polynomial-system';
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
import type { OoeRuntimeEnvelope } from '../../ooe/runtime-envelope';
import { runOoeRuntimeJob } from '../../ooe/runtime-coordinator';
import type { OoeJobContextOptions } from '../../ooe/job-contract';
import type { DisplayOutcome } from '../../../types/calculator';
import { solveSystem, solvePolynomial } from './guided-polynomial';
import { buildEquationOoeRevisionSnapshot } from './ooe-snapshot';
import { approximateModeNeedsIntervalOutcome, approximateModeNeedsNumericParametersOutcome, withEquationAnswerMode } from './outcomes';
import {
  prepareEquationStoredValueSubstitution,
  remainingApproximateModeParameters,
  withStoredValueDetails,
} from './stored-values';
import { solveSymbolicEquation, solveSymbolicEquationAsync } from './symbolic';
import type {
  AsyncSharedEquationSolveRunner,
  EquationModeIsolatedWorkerRunResult,
  RunEquationModeRequest,
} from './types';

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
  storedVariables,
  variableSubstitutionSnapshot,
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
    if (equationAnswerMode === 'approximate' && !numericInterval && !hasTopLevelInequality) {
      return approximateModeNeedsIntervalOutcome();
    }

    const { protectedTarget, substitution, ignoredLines } = prepareEquationStoredValueSubstitution({
      equationLatex,
      equationSolveTarget,
      numericInterval,
      storedVariables,
      variableSubstitutionSnapshot,
    });
    if (equationAnswerMode === 'approximate' && numericInterval && !hasTopLevelInequality) {
      const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
      if (remainingParameters.length > 0) {
        return withStoredValueDetails(approximateModeNeedsNumericParametersOutcome(remainingParameters), {
          substitution,
          target: protectedTarget,
          interval: numericInterval,
          originalLatex: equationLatex,
          replayedSnapshot: Boolean(variableSubstitutionSnapshot),
          ignoredLines,
        });
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
      sharedSolveRunner,
    );

    return withEquationAnswerMode(withStoredValueDetails(outcome, {
      substitution,
      target: protectedTarget,
      interval: numericInterval,
      originalLatex: equationLatex,
      replayedSnapshot: Boolean(variableSubstitutionSnapshot),
      ignoredLines,
    }), equationAnswerMode);
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
    storedVariables,
    variableSubstitutionSnapshot,
  } = request;

  const hasTopLevelInequality = isTopLevelInequalityLatex(equationLatex);
  if (equationAnswerMode === 'approximate' && !numericInterval && !hasTopLevelInequality) {
    return approximateModeNeedsIntervalOutcome();
  }

  const { protectedTarget, substitution, ignoredLines } = prepareEquationStoredValueSubstitution({
    equationLatex,
    equationSolveTarget,
    numericInterval,
    storedVariables,
    variableSubstitutionSnapshot,
  });
  if (equationAnswerMode === 'approximate' && numericInterval && !hasTopLevelInequality) {
    const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
    if (remainingParameters.length > 0) {
      return withStoredValueDetails(approximateModeNeedsNumericParametersOutcome(remainingParameters), {
        substitution,
        target: protectedTarget,
        interval: numericInterval,
        originalLatex: equationLatex,
        replayedSnapshot: Boolean(variableSubstitutionSnapshot),
        ignoredLines,
      });
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
    asyncSharedSolveRunner,
  );

  return withEquationAnswerMode(withStoredValueDetails(outcome, {
    substitution,
    target: protectedTarget,
    interval: numericInterval,
    originalLatex: equationLatex,
    replayedSnapshot: Boolean(variableSubstitutionSnapshot),
    ignoredLines,
  }), equationAnswerMode);
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
