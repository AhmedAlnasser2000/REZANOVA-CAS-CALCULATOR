import type {
  AlgebraTransformAction,
} from '../../lib/algebra/algebra-transform';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type {
  RunCalculateModeRequest,
  RunCalculateRuntimeRequest,
} from '../../lib/modes/calculate';
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
  EquationAnswerMode,
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

type EquationOoeRouteKind = 'symbolic' | 'numeric-interval';

type CalculateOoeRouteDescriptor =
  | {
      kind: 'standard';
      action: CalculateAction;
    }
  | {
      kind: 'algebraTransform';
      action: AlgebraTransformAction;
    }
  | {
      kind: 'legacyWorkbench';
    };

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
  setRuntimeStatusOverride?: (message: string) => void;
  reserveHistoryTicket?: (input: {
    mode: 'calculate';
    inputLatex: string;
    capabilityId: string;
    inputRevisionId: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket?: (ticketId?: string | null) => void;
  shouldCommitVisibleCalculateOutcome?: (input: {
    capabilityId: string;
    inputRevisionId: string;
  }) => boolean;
  getActiveCalculateRuntimeRequest?: (
    route: CalculateOoeRouteDescriptor,
  ) => RunCalculateRuntimeRequest | null;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  resolveActiveCalculateInputRevision?: (
    route: CalculateOoeRouteDescriptor,
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunCalculateRuntimeRequest) => string,
  ) => string | null;
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
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
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
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  resolveActiveEquationInputRevision?: (
    kind: EquationOoeRouteKind,
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunEquationModeRequest) => string,
  ) => string | null;
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
    equationAnswerMode: EquationAnswerMode;
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
  function handleCancelledCalculateEnvelope(envelope: {
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

    deps.setRuntimeStatusOverride?.('Calculate stopped');
    return true;
  }

  function shouldSuppressCalculateVisibleCommit(input: {
    capabilityId: string;
    inputRevisionId: string;
  }) {
    return deps.shouldCommitVisibleCalculateOutcome
      ? !deps.shouldCommitVisibleCalculateOutcome(input)
      : false;
  }

  function buildCalculateHistoryContext(input: {
    historyTicket: PendingHistoryTicketReservation | null;
    suppressDisplayCommit: boolean;
  }) {
    return {
      ...(input.historyTicket
        ? {
            historyTicketId: input.historyTicket.id,
            historyLaunchOrder: input.historyTicket.historyLaunchOrder,
          }
        : {}),
      ...(input.suppressDisplayCommit ? { suppressDisplayCommit: true } : {}),
    };
  }

  async function runCalculateRuntimeBranch(input: {
    runtimeRequest: RunCalculateRuntimeRequest;
    route: CalculateOoeRouteDescriptor;
    committedInput: string;
    retitle?: string;
  }) {
    const launchWorkspaceInstance = deps.getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
    const {
      buildCalculateRuntimeOoeInputRevisionId,
      calculateCapabilityIdForRuntimeRequest,
      runCalculateRuntimeWithOoePilot,
    } = await import('../../lib/modes/calculate');
    const capabilityId = calculateCapabilityIdForRuntimeRequest(input.runtimeRequest);
    const inputRevisionId = buildCalculateRuntimeOoeInputRevisionId(input.runtimeRequest);
    const historyTicket = deps.reserveHistoryTicket?.({
      mode: 'calculate',
      inputLatex: input.committedInput,
      capabilityId,
      inputRevisionId,
      workspaceInstance: launchWorkspaceInstance,
    }) ?? null;
    const suppressDisplayCommit = shouldSuppressCalculateVisibleCommit({
      capabilityId,
      inputRevisionId,
    });
    const envelope = await runCalculateRuntimeWithOoePilot(input.runtimeRequest, {
      ...(deps.getActiveCalculateRuntimeRequest
        ? {
            activeInputRevisionId: (job: OoeJobIdentity) =>
              deps.resolveActiveCalculateInputRevision
                ? deps.resolveActiveCalculateInputRevision(
                  input.route,
                  job,
                  buildCalculateRuntimeOoeInputRevisionId,
                )
                : (() => {
                    const activeRequest = deps.getActiveCalculateRuntimeRequest?.(input.route);
                    return activeRequest
                      ? buildCalculateRuntimeOoeInputRevisionId(activeRequest)
                      : null;
                  })(),
          }
        : {}),
      ...ooeJobContextFromHistoryTicket(historyTicket),
    });

    if (handleCancelledCalculateEnvelope(envelope)) {
      deps.discardHistoryTicket?.(historyTicket?.id);
      return;
    }

    if (!isOoeCommitAllowed(envelope.ooe.commitAssessment)) {
      deps.discardHistoryTicket?.(historyTicket?.id);
      return;
    }

    const payload = input.retitle
      ? deps.retitleOutcome(envelope.payload, input.retitle)
      : envelope.payload;
    const historyContext = buildCalculateHistoryContext({
      historyTicket,
      suppressDisplayCommit,
    });
    deps.commitOutcome(
      payload,
      input.committedInput,
      'calculate',
      Object.keys(historyContext).length > 0 ? historyContext : undefined,
    );
    if (!suppressDisplayCommit) {
      deps.clearCalculateReplayVariableSubstitutions?.();
    }
  }

  function runCalculateAction(action: CalculateAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void (async () => {
        try {
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
          const runtimeRequest: RunCalculateRuntimeRequest = deps.calculateScreen === 'standard'
            ? { kind: 'standard', request }
            : { kind: 'legacyWorkbench', request };
          await runCalculateRuntimeBranch({
            runtimeRequest,
            route: deps.calculateScreen === 'standard'
              ? { kind: 'standard', action }
              : { kind: 'legacyWorkbench' },
            committedInput: executionLatex,
          });
        } catch (error: unknown) {
          deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error));
        }
      })();
    });
  }

  function runCalculateAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void (async () => {
        try {
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
          await runCalculateRuntimeBranch({
            runtimeRequest: { kind: 'algebraTransform', request },
            route: { kind: 'algebraTransform', action },
            committedInput: executionLatex,
          });
        } catch (error: unknown) {
          deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error));
        }
      })();
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
      void (async () => {
        try {
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
          await runCalculateRuntimeBranch({
            runtimeRequest: {
              kind: 'legacyWorkbench',
              request,
              title: deps.calculateRouteMeta?.label ?? 'Calculate',
            },
            route: { kind: 'legacyWorkbench' },
            committedInput: generated,
            retitle: deps.calculateRouteMeta?.label ?? 'Calculate',
          });
        } catch (error: unknown) {
          deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error));
        }
      })();
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
      const launchWorkspaceInstance = deps.getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
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
          if (deps.equationScreen === 'symbolic') {
            const routeKind: EquationOoeRouteKind = 'symbolic';
            const inputRevisionId = buildEquationOoeInputRevisionId(request);
            const historyTicket = deps.reserveHistoryTicket?.({
              mode: 'equation',
              inputLatex: committedInput,
              capabilityId: 'equation.solve',
              inputRevisionId,
              workspaceInstance: launchWorkspaceInstance,
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
                      activeInputRevisionId: (job: OoeJobIdentity) =>
                        deps.resolveActiveEquationInputRevision
                          ? deps.resolveActiveEquationInputRevision(
                            routeKind,
                            job,
                            buildEquationOoeInputRevisionId,
                          )
                          : (() => {
                              const activeRequest = deps.getActiveEquationRequest?.(routeKind);
                              return activeRequest
                                ? buildEquationOoeInputRevisionId(activeRequest)
                                : null;
                            })(),
                    }
                  : {}),
                ...ooeJobContextFromHistoryTicket(historyTicket),
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
              }),
            );
            return;
          }

          const inputRevisionId = buildEquationOoeInputRevisionId(request);
          const historyTicket = deps.reserveHistoryTicket?.({
            mode: 'equation',
            inputLatex: committedInput,
            capabilityId: 'equation.solve',
            inputRevisionId,
            workspaceInstance: launchWorkspaceInstance,
          }) ?? null;
          launchedHistoryTicket = historyTicket;
          const suppressDisplayCommit = shouldSuppressEquationVisibleCommit(deps, {
            routeKind: 'symbolic',
            inputRevisionId,
          });
          const envelope = await runEquationModeWithOoePilot(
            request,
            ooeJobContextFromHistoryTicket(historyTicket),
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
      const launchWorkspaceInstance = deps.getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
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
            equationAnswerMode: 'exact',
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
            workspaceInstance: launchWorkspaceInstance,
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
                    activeInputRevisionId: (job: OoeJobIdentity) =>
                      deps.resolveActiveEquationInputRevision
                        ? deps.resolveActiveEquationInputRevision(
                          'numeric-interval',
                          job,
                          buildEquationOoeInputRevisionId,
                        )
                        : (() => {
                            const activeRequest = deps.getActiveEquationRequest?.('numeric-interval');
                            return activeRequest
                              ? buildEquationOoeInputRevisionId(activeRequest)
                              : null;
                          })(),
                  }
                : {}),
              ...ooeJobContextFromHistoryTicket(historyTicket),
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
              equationAnswerMode: 'exact',
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

    if (deps.currentMode !== 'equation' || !deps.displayOutcome || deps.displayOutcome.kind === 'prompt') {
      return deps.equationNumericSolvePanel.enabled;
    }

    if (deps.displayOutcome.periodicFamily?.suggestedIntervals?.length) {
      return true;
    }

    return equationNumericSolveAdvisory(deps.displayOutcome)?.kind === 'suggest-on-error';
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
