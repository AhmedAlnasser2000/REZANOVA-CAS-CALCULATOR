import type {
  AlgebraTransformAction,
} from '../../lib/algebra/algebra-transform';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import { isOoeCommitAllowed } from '../../lib/ooe/job-contract';
import { runWorkspaceWithOoeProvenance } from '../../lib/ooe/workspace-pilot';
import type { RunCalculateModeRequest } from '../../lib/modes/calculate';
import {
  buildEquationOoeInputRevisionId,
  runEquationAlgebraTransform,
  runEquationModeWithOoePilot,
  type RunEquationModeRequest,
} from '../../lib/modes/equation';
import type {
  CalculateAction,
  CalculateRouteMeta,
  CalculateScreen,
  DisplayOutcome,
  EquationScreen,
  IntegralWorkbenchState,
  LimitDirection,
  LimitWorkbenchState,
  ModeId,
  NumericSolveInterval,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

type TransitionFn = (callback: () => void) => void;

type CommitOutcomeFn = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  replayContext?: Record<string, unknown>,
) => void;

type RetitleOutcomeFn = (outcome: DisplayOutcome, title: string) => DisplayOutcome;

type EquationNumericSolvePanelState = {
  enabled: boolean;
  start: string;
  end: string;
  subdivisions: number;
};

type PendingHistoryTicketReservation = {
  id: string;
  historyLaunchOrder: number;
};

type EquationOoeRouteKind = 'symbolic' | 'numeric-interval';

type CalculateRuntimeDeps = {
  calculateLatex: string;
  calculateScreen: CalculateScreen;
  calculateRouteMeta: CalculateRouteMeta | null;
  calculateWorkbenchExpression: {
    latex: string;
    limitDirection?: LimitDirection;
  };
  integralWorkbench: IntegralWorkbenchState;
  limitWorkbench: LimitWorkbenchState;
  isCalculateToolOpen: boolean;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  calculateReplayVariableSubstitutions?: {
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
  clearCalculateReplayVariableSubstitutions?: () => void;
  startTransition: TransitionFn;
  setDisplayOutcome: (outcome: DisplayOutcome) => void;
  commitOutcome: CommitOutcomeFn;
  retitleOutcome: RetitleOutcomeFn;
  getActiveStandardCalculateRequest?: (action: CalculateAction) => RunCalculateModeRequest | null;
};

type EquationRuntimeDeps = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  equationInputLatex: string;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  equationNumericSolvePanel: EquationNumericSolvePanelState;
  currentMode: ModeId;
  displayOutcome: DisplayOutcome | null;
  ansLatex: string;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>
    & Partial<Pick<Settings, 'equationAnswerMode' | 'equationDomainIntent' | 'complexExactForm'>>;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions?: {
    mode: ModeId;
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
  clearReplayVariableSubstitutions?: () => void;
  setRuntimeStatusOverride?: (message: string) => void;
  reserveHistoryTicket?: (input: {
    mode: 'equation';
    inputLatex: string;
    capabilityId: string;
    inputRevisionId: string;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket?: (ticketId?: string | null) => void;
  shouldCommitVisibleEquationOutcome?: (input: {
    routeKind: EquationOoeRouteKind;
    inputRevisionId: string;
  }) => boolean;
  startTransition: TransitionFn;
  commitOutcome: CommitOutcomeFn;
  switchToEquationWithLatex: (latex: string) => void;
  isSimultaneousEquationScreen: (screen: EquationScreen) => boolean;
  getActiveEquationRequest?: (kind: EquationOoeRouteKind) => RunEquationModeRequest | null;
  getLiveEquationSnapshot?: () => {
    equationLatex: string;
    equationInputLatex: string;
  } | null;
};

function buildCalculateWorkbenchError(
  deps: CalculateRuntimeDeps,
): DisplayOutcome {
  const screenTitle =
    deps.calculateScreen === 'derivativePoint'
      ? 'Derivative at Point'
      : deps.calculateRouteMeta?.label ?? 'Calculate';

  const error =
    deps.calculateScreen === 'derivative'
      ? 'Enter an expression in x before differentiating.'
      : deps.calculateScreen === 'derivativePoint'
        ? 'Enter an expression in x and a numeric point before evaluating the derivative.'
        : deps.calculateScreen === 'integral'
          ? deps.integralWorkbench.kind === 'indefinite'
            ? 'Enter an integrand in x before evaluating the integral.'
            : 'Enter an integrand in x and numeric bounds before evaluating the integral.'
          : deps.limitWorkbench.targetKind === 'finite'
            ? 'Enter an expression in x and a numeric target before evaluating the limit.'
            : 'Enter an expression in x before evaluating the limit at infinity.';

  return {
    kind: 'error',
    title: screenTitle,
    error,
    warnings: [],
  };
}

function equationNumericSolveAdvisory(outcome: DisplayOutcome | null) {
  return outcome?.runtimeAdvisories?.equationNumericSolve;
}

function buildRuntimeLoadError(title: string, error: unknown): DisplayOutcome {
  return {
    kind: 'error',
    title,
    error: error instanceof Error
      ? `Could not load the ${title} runtime: ${error.message}`
      : `Could not load the ${title} runtime.`,
    warnings: [],
  };
}

function shouldSuppressEquationVisibleCommit(
  deps: EquationRuntimeDeps,
  input: {
    routeKind: EquationOoeRouteKind;
    inputRevisionId: string;
  },
) {
  return deps.shouldCommitVisibleEquationOutcome
    ? !deps.shouldCommitVisibleEquationOutcome(input)
    : false;
}

function buildEquationHistoryContext(
  deps: EquationRuntimeDeps,
  input: {
    historyTicket: PendingHistoryTicketReservation | null;
    suppressDisplayCommit: boolean;
    equationAnswerMode: 'exact' | 'approximate' | 'isolate';
    equationDomainIntent: 'real' | 'complex';
    numericInterval?: NumericSolveInterval;
  },
) {
  return {
    equationAnswerMode: input.equationAnswerMode,
    equationDomainIntent: input.equationDomainIntent,
    complexExactForm: deps.settings.complexExactForm ?? 'rectangular',
    ...(input.numericInterval ? { numericInterval: input.numericInterval } : {}),
    ...(deps.equationSolveTarget ? { equationSolveTarget: deps.equationSolveTarget } : {}),
    ...(input.historyTicket
      ? {
          historyTicketId: input.historyTicket.id,
          historyLaunchOrder: input.historyTicket.historyLaunchOrder,
        }
      : {}),
    ...(input.suppressDisplayCommit ? { suppressDisplayCommit: true } : {}),
  };
}

export function createCalculateRuntimeController(deps: CalculateRuntimeDeps) {
  function runCalculateAction(action: CalculateAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void import('../../lib/modes/calculate')
        .then(async ({
          buildStandardCalculateOoeInputRevisionId,
          runCalculateMode,
          runCalculateModeWithOoePilot,
        }) => {
          const request: RunCalculateModeRequest = {
            action,
            latex: executionLatex,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            calculateScreen: deps.calculateScreen,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          };

          if (deps.calculateScreen === 'standard') {
            const envelope = await runCalculateModeWithOoePilot(
              request,
              deps.getActiveStandardCalculateRequest
                ? {
                    activeInputRevisionId: () => {
                      const activeRequest = deps.getActiveStandardCalculateRequest?.(action);
                      return activeRequest
                        ? buildStandardCalculateOoeInputRevisionId(activeRequest)
                        : null;
                    },
                  }
                : undefined,
            );

            if (!isOoeCommitAllowed(envelope.ooe.commitAssessment)) {
              return;
            }

            deps.commitOutcome(envelope.payload, executionLatex, 'calculate');
            deps.clearCalculateReplayVariableSubstitutions?.();
            return;
          }

          const envelope = await runWorkspaceWithOoeProvenance({
            capabilityId: 'calculate.workbench',
            mode: 'calculate',
            routeLabel: `calculate.${deps.calculateScreen}.${action}`,
            routeSnapshot: { action, request },
            screen: deps.calculateScreen,
            action,
            inputSummary: {
              action,
              screen: deps.calculateScreen,
              latexLength: request.latex.length,
            },
            run: () => runCalculateMode(request),
          });
          deps.commitOutcome(envelope.payload, executionLatex, 'calculate');
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
    });
  }

  function runCalculateAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void import('../../lib/modes/calculate')
        .then(async ({ runCalculateAlgebraTransform }) => {
          const request = {
            action,
            latex: executionLatex,
            angleUnit: deps.settings.angleUnit,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          };
          const envelope = await runWorkspaceWithOoeProvenance({
            capabilityId: 'calculate.algebraTransform',
            mode: 'calculate',
            routeLabel: `calculate.algebraTransform.${action}`,
            routeSnapshot: { action, request },
            screen: deps.calculateScreen,
            action,
            inputSummary: {
              action,
              screen: deps.calculateScreen,
              latexLength: executionLatex.length,
            },
            run: () => runCalculateAlgebraTransform(request),
          });

          deps.commitOutcome(envelope.payload, executionLatex, 'calculate');
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
    });
  }

  function runCalculateWorkbenchAction() {
    if (!deps.isCalculateToolOpen || !deps.calculateRouteMeta) {
      return;
    }

    const generated = trimHarmlessTrailingMathSpacing(deps.calculateWorkbenchExpression.latex);
    if (!generated) {
      deps.setDisplayOutcome(buildCalculateWorkbenchError(deps));
      return;
    }

    deps.startTransition(() => {
      void import('../../lib/modes/calculate')
        .then(async ({ runCalculateMode }) => {
          const request: RunCalculateModeRequest = {
            action: 'evaluate',
            latex: generated,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            calculateScreen: deps.calculateScreen,
            limitDirection: deps.calculateWorkbenchExpression.limitDirection,
            limitTargetKind:
              deps.calculateScreen === 'limit' ? deps.limitWorkbench.targetKind : undefined,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === generated
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          };
          const envelope = await runWorkspaceWithOoeProvenance({
            capabilityId: 'calculate.workbench',
            mode: 'calculate',
            routeLabel: `calculate.workbench.${deps.calculateScreen}`,
            routeSnapshot: { request },
            screen: deps.calculateScreen,
            action: 'evaluate',
            inputSummary: {
              screen: deps.calculateScreen,
              latexLength: generated.length,
            },
            run: () => runCalculateMode(request),
          });

          deps.commitOutcome(
            deps.retitleOutcome(envelope.payload, deps.calculateRouteMeta?.label ?? 'Calculate'),
            generated,
            'calculate',
          );
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
    });
  }

  return {
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
  };
}

export function createEquationRuntimeController(deps: EquationRuntimeDeps) {
  function getLaunchEquationSnapshot() {
    return deps.getLiveEquationSnapshot?.() ?? {
      equationLatex: deps.equationLatex,
      equationInputLatex: deps.equationInputLatex,
    };
  }

  function handleCancelledEquationEnvelope(envelope: {
    ooe: {
      completion?: {
        kind: 'cancelled';
        reason?: string;
      };
    };
  }) {
    if (envelope.ooe.completion?.kind !== 'cancelled') {
      return false;
    }

    deps.setRuntimeStatusOverride?.('Equation solve stopped');
    return true;
  }

  function runEquationAction() {
    deps.startTransition(() => {
      const launchSnapshot = getLaunchEquationSnapshot();
      const executionLatex = trimHarmlessTrailingMathSpacing(launchSnapshot.equationLatex);
      const committedInput =
        deps.equationScreen === 'linear2' || deps.equationScreen === 'linear3'
          ? 'linear-system'
          : trimHarmlessTrailingMathSpacing(launchSnapshot.equationInputLatex);
      let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;

      void (async () => {
        try {
          const request: RunEquationModeRequest = {
            equationScreen: deps.equationScreen,
            equationLatex: executionLatex,
            equationSolveTarget: deps.equationSolveTarget,
            equationAnswerMode: deps.settings.equationAnswerMode ?? 'exact',
            equationDomainIntent: deps.settings.equationDomainIntent ?? 'real',
            complexExactForm: deps.settings.complexExactForm ?? 'rectangular',
            quadraticCoefficients: deps.quadraticCoefficients,
            cubicCoefficients: deps.cubicCoefficients,
            quarticCoefficients: deps.quarticCoefficients,
            polynomialSystem2Latex: deps.polynomialSystem2Latex,
            system2: deps.system2,
            system3: deps.system3,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            storedVariables: deps.variableMemory,
          };
          if (
            deps.equationScreen === 'symbolic'
            && (deps.settings.equationAnswerMode ?? 'exact') === 'approximate'
            && deps.equationNumericSolvePanel.enabled
          ) {
            request.numericInterval = {
              start: deps.equationNumericSolvePanel.start,
              end: deps.equationNumericSolvePanel.end,
              subdivisions: deps.equationNumericSolvePanel.subdivisions,
            };
            request.variableSubstitutionSnapshot =
              deps.replayVariableSubstitutions?.mode === 'equation'
              && deps.replayVariableSubstitutions.inputLatex === committedInput
                ? deps.replayVariableSubstitutions.substitutions
                : undefined;
          }
          if (deps.equationScreen === 'symbolic') {
            const routeKind: EquationOoeRouteKind = request.numericInterval ? 'numeric-interval' : 'symbolic';
            const inputRevisionId = buildEquationOoeInputRevisionId(request);
            const historyTicket = deps.reserveHistoryTicket?.({
              mode: 'equation',
              inputLatex: committedInput,
              capabilityId: 'equation.solve',
              inputRevisionId,
            }) ?? null;
            launchedHistoryTicket = historyTicket;
            const suppressDisplayCommit = shouldSuppressEquationVisibleCommit(deps, {
              routeKind,
              inputRevisionId,
            });
            const envelope = await runEquationModeWithOoePilot(
              request,
              {
                ...(deps.getActiveEquationRequest
                  ? {
                      activeInputRevisionId: () => {
                        const activeRequest = deps.getActiveEquationRequest?.(routeKind);
                        return activeRequest
                          ? buildEquationOoeInputRevisionId(activeRequest)
                          : null;
                      },
                    }
                  : {}),
                ...(historyTicket ? { launchTicket: historyTicket } : {}),
              },
            );

            if (handleCancelledEquationEnvelope(envelope)) {
              deps.discardHistoryTicket?.(historyTicket?.id);
              return;
            }

            if (!isOoeCommitAllowed(envelope.ooe.commitAssessment)) {
              deps.discardHistoryTicket?.(historyTicket?.id);
              return;
            }

            deps.commitOutcome(
              envelope.payload,
              committedInput,
              'equation',
              buildEquationHistoryContext(deps, {
                historyTicket,
                suppressDisplayCommit,
                equationAnswerMode: deps.settings.equationAnswerMode ?? 'exact',
                equationDomainIntent: deps.settings.equationDomainIntent ?? 'real',
                numericInterval: request.numericInterval,
              }),
            );
            if (request.numericInterval && !suppressDisplayCommit) {
              deps.clearReplayVariableSubstitutions?.();
            }
            return;
          }

          const inputRevisionId = buildEquationOoeInputRevisionId(request);
          const historyTicket = deps.reserveHistoryTicket?.({
            mode: 'equation',
            inputLatex: committedInput,
            capabilityId: 'equation.solve',
            inputRevisionId,
          }) ?? null;
          launchedHistoryTicket = historyTicket;
          const suppressDisplayCommit = shouldSuppressEquationVisibleCommit(deps, {
            routeKind: 'symbolic',
            inputRevisionId,
          });
          const envelope = await runEquationModeWithOoePilot(
            request,
            historyTicket ? { launchTicket: historyTicket } : undefined,
          );
          if (handleCancelledEquationEnvelope(envelope)) {
            deps.discardHistoryTicket?.(historyTicket?.id);
            return;
          }

          deps.commitOutcome(
            envelope.payload,
            committedInput,
            'equation',
            buildEquationHistoryContext(deps, {
              historyTicket,
              suppressDisplayCommit,
              equationAnswerMode: deps.settings.equationAnswerMode ?? 'exact',
              equationDomainIntent: deps.settings.equationDomainIntent ?? 'real',
            }),
          );
        } catch (error: unknown) {
          deps.discardHistoryTicket?.(launchedHistoryTicket?.id);
          deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
        }
      })();
    });
  }

  function runEquationAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const launchSnapshot = getLaunchEquationSnapshot();
      const executionLatex = trimHarmlessTrailingMathSpacing(launchSnapshot.equationLatex);
      const committedInput = trimHarmlessTrailingMathSpacing(launchSnapshot.equationInputLatex);
      try {
        const outcome = runEquationAlgebraTransform({
          action,
          equationLatex: executionLatex,
          angleUnit: deps.settings.angleUnit,
        });

        deps.commitOutcome(outcome, committedInput, 'equation');
      } catch (error: unknown) {
        deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
      }
    });
  }

  function runEquationNumericSolveAction() {
    if (deps.equationScreen !== 'symbolic') {
      return;
    }

    deps.startTransition(() => {
      const launchSnapshot = getLaunchEquationSnapshot();
      const executionLatex = trimHarmlessTrailingMathSpacing(launchSnapshot.equationLatex);
      const committedInput = trimHarmlessTrailingMathSpacing(launchSnapshot.equationInputLatex);
      const interval: NumericSolveInterval = {
        start: deps.equationNumericSolvePanel.start,
        end: deps.equationNumericSolvePanel.end,
        subdivisions: deps.equationNumericSolvePanel.subdivisions,
      };
      let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;

      void (async () => {
        try {
          const request: RunEquationModeRequest = {
            equationScreen: deps.equationScreen,
            equationLatex: executionLatex,
            equationSolveTarget: deps.equationSolveTarget,
            equationAnswerMode: 'approximate',
            equationDomainIntent: 'real',
            complexExactForm: deps.settings.complexExactForm ?? 'rectangular',
            quadraticCoefficients: deps.quadraticCoefficients,
            cubicCoefficients: deps.cubicCoefficients,
            quarticCoefficients: deps.quarticCoefficients,
            polynomialSystem2Latex: deps.polynomialSystem2Latex,
            system2: deps.system2,
            system3: deps.system3,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            numericInterval: interval,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.replayVariableSubstitutions?.mode === 'equation'
              && deps.replayVariableSubstitutions.inputLatex === committedInput
                ? deps.replayVariableSubstitutions.substitutions
                : undefined,
          };
          const inputRevisionId = buildEquationOoeInputRevisionId(request);
          const historyTicket = deps.reserveHistoryTicket?.({
            mode: 'equation',
            inputLatex: committedInput,
            capabilityId: 'equation.solve',
            inputRevisionId,
          }) ?? null;
          launchedHistoryTicket = historyTicket;
          const suppressDisplayCommit = shouldSuppressEquationVisibleCommit(deps, {
            routeKind: 'numeric-interval',
            inputRevisionId,
          });
          const envelope = await runEquationModeWithOoePilot(
            request,
            {
              ...(deps.getActiveEquationRequest
                ? {
                    activeInputRevisionId: () => {
                      const activeRequest = deps.getActiveEquationRequest?.('numeric-interval');
                      return activeRequest
                        ? buildEquationOoeInputRevisionId(activeRequest)
                        : null;
                    },
                  }
                : {}),
              ...(historyTicket ? { launchTicket: historyTicket } : {}),
            },
          );

          if (handleCancelledEquationEnvelope(envelope)) {
            deps.discardHistoryTicket?.(historyTicket?.id);
            return;
          }

          if (!isOoeCommitAllowed(envelope.ooe.commitAssessment)) {
            deps.discardHistoryTicket?.(historyTicket?.id);
            return;
          }

          deps.commitOutcome(
            envelope.payload,
            committedInput,
            'equation',
            {
              ...(envelope.payload.kind === 'success'
                && envelope.payload.solveBadges?.includes('Numeric Interval')
                ? { numericInterval: interval }
                : {}),
              ...(deps.equationSolveTarget ? { equationSolveTarget: deps.equationSolveTarget } : {}),
              equationAnswerMode: 'approximate',
              equationDomainIntent: 'real',
              complexExactForm: deps.settings.complexExactForm ?? 'rectangular',
              ...(historyTicket
                ? {
                    historyTicketId: historyTicket.id,
                    historyLaunchOrder: historyTicket.historyLaunchOrder,
                  }
                : {}),
              ...(suppressDisplayCommit ? { suppressDisplayCommit: true } : {}),
            },
          );
          if (!suppressDisplayCommit) {
            deps.clearReplayVariableSubstitutions?.();
          }
        } catch (error: unknown) {
          deps.discardHistoryTicket?.(launchedHistoryTicket?.id);
          deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
        }
      })();
    });
  }

  function shouldAllowEquationNumericSolve() {
    if (deps.equationScreen !== 'symbolic') {
      return false;
    }

    if ((deps.settings.equationAnswerMode ?? 'exact') === 'approximate') {
      return true;
    }

    if (deps.currentMode !== 'equation' || !deps.displayOutcome || deps.displayOutcome.kind === 'prompt') {
      return true;
    }

    return equationNumericSolveAdvisory(deps.displayOutcome)?.kind !== 'blocked';
  }

  function shouldShowEquationNumericSolvePanel() {
    if (deps.equationScreen !== 'symbolic') {
      return false;
    }

    if (!shouldAllowEquationNumericSolve()) {
      return false;
    }

    if (deps.equationNumericSolvePanel.enabled) {
      return true;
    }

    if (deps.currentMode !== 'equation' || deps.displayOutcome?.kind !== 'error') {
      return false;
    }

    return equationNumericSolveAdvisory(deps.displayOutcome)?.kind === 'suggest-on-error';
  }

  function openPromptTarget() {
    if (deps.displayOutcome?.kind !== 'prompt' || deps.displayOutcome.targetMode !== 'equation') {
      return;
    }

    deps.switchToEquationWithLatex(deps.displayOutcome.carryLatex);
  }

  return {
    openPromptTarget,
    runEquationAction,
    runEquationAlgebraTransformAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  };
}
