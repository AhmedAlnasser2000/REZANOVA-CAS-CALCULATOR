import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import {
  runEquationModeWithOoePilot,
  type RunEquationModeRequest,
} from '../../lib/modes/equation';
import { resolveCanonicalResultForConsumer } from '../../lib/result-contract';
import type {
  AngleUnit,
  ComplexExactForm,
  CanonicalRuntimeOutcome,
  EquationAnswerMode,
  EquationScreen,
  ModeId,
  NumericSolveInterval,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { equationReplaySeedFromRequest } from './equationHistorySeed';

type TransitionFn = (callback: () => void) => void;
type CommitOutcomeFn = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  replayContext?: Record<string, unknown>,
) => void;

export type EquationNumericSolvePanelState = {
  enabled: boolean;
  start: string;
  end: string;
  subdivisions: number;
};

type EquationStoredValueSolveOptions = {
  variableSubstitutionSnapshot?: VariableSubstitutionSnapshot[];
  useStoredValueSubstitution?: boolean;
};

type EquationNumericIntervalRuntimeDeps = {
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
  ansLatex: string;
  settings: {
    angleUnit: AngleUnit;
    outputStyle: OutputStyle;
    equationAnswerMode?: EquationAnswerMode;
    equationDomainIntent?: 'real' | 'complex';
    complexExactForm?: ComplexExactForm;
  };
  variableMemory: StoredVariableValue[];
  clearReplayVariableSubstitutions?: () => void;
  startTransition: TransitionFn;
  commitOutcome: CommitOutcomeFn;
  reserveHistoryTicket?: (input: {
    mode: 'equation';
    inputLatex: string;
    capabilityId: string;
    inputRevisionId: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket?: (ticketId?: string | null) => void;
  getActiveEquationRequest?: (kind: 'numeric-interval') => RunEquationModeRequest | null;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  resolveActiveEquationInputRevision?: (
    kind: 'numeric-interval',
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunEquationModeRequest) => string,
  ) => string | null;
  getLiveEquationSnapshot?: () => {
    equationLatex: string;
    equationInputLatex: string;
  } | null;
};

type RunEquationNumericIntervalRuntimeActionInput = {
  deps: EquationNumericIntervalRuntimeDeps;
  options: EquationStoredValueSolveOptions;
  buildInputRevisionIdForRun: (
    request: RunEquationModeRequest,
    options: EquationStoredValueSolveOptions,
  ) => string;
  replayedEquationSubstitutionSnapshot: (committedInput: string) => VariableSubstitutionSnapshot[] | undefined;
  shouldSuppressVisibleCommit: (input: {
    routeKind: 'numeric-interval';
    inputRevisionId: string;
  }) => boolean;
  handleCancelledEnvelope: (
    envelope: Awaited<ReturnType<typeof runEquationModeWithOoePilot>>,
  ) => boolean;
  buildRuntimeLoadError: (title: string, error: unknown) => CanonicalRuntimeOutcome;
};

function intervalFromPanel(panel: EquationNumericSolvePanelState): NumericSolveInterval {
  return {
    start: panel.start,
    end: panel.end,
    subdivisions: panel.subdivisions,
  };
}

export function runEquationNumericIntervalRuntimeAction({
  deps,
  options,
  buildInputRevisionIdForRun,
  replayedEquationSubstitutionSnapshot,
  shouldSuppressVisibleCommit,
  handleCancelledEnvelope,
  buildRuntimeLoadError,
}: RunEquationNumericIntervalRuntimeActionInput) {
  if (deps.equationScreen !== 'symbolic') {
    return;
  }

  deps.startTransition(() => {
    const launchSnapshot = deps.getLiveEquationSnapshot?.() ?? {
      equationLatex: deps.equationLatex,
      equationInputLatex: deps.equationInputLatex,
    };
    const launchWorkspaceInstance = deps.getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
    const executionLatex = trimHarmlessTrailingMathSpacing(launchSnapshot.equationLatex);
    const committedInput = trimHarmlessTrailingMathSpacing(launchSnapshot.equationInputLatex);
    const interval = intervalFromPanel(deps.equationNumericSolvePanel);
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
            options.variableSubstitutionSnapshot ?? replayedEquationSubstitutionSnapshot(committedInput),
          useStoredValueSubstitution: options.useStoredValueSubstitution,
        };
        const inputRevisionId = buildInputRevisionIdForRun(request, options);
        const historyTicket = deps.reserveHistoryTicket?.({
          mode: 'equation',
          inputLatex: committedInput,
          capabilityId: 'equation.solve',
          inputRevisionId,
          workspaceInstance: launchWorkspaceInstance,
        }) ?? null;
        launchedHistoryTicket = historyTicket;
        const suppressDisplayCommit = shouldSuppressVisibleCommit({
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
                        (activeRequest) => buildInputRevisionIdForRun(activeRequest, options),
                      )
                      : (() => {
                          const activeRequest = deps.getActiveEquationRequest?.('numeric-interval');
                          return activeRequest
                            ? buildInputRevisionIdForRun(activeRequest, options)
                            : null;
                        })(),
                }
              : {}),
            ...ooeJobContextFromHistoryTicket(historyTicket),
          },
        );

        if (handleCancelledEnvelope(envelope)) {
          deps.discardHistoryTicket?.(historyTicket?.id);
          return;
        }

        if (!isOoeCommitAllowed(envelope.ooe.commitAssessment)) {
          deps.discardHistoryTicket?.(historyTicket?.id);
          return;
        }

        const payloadResolution = envelope.payload.kind === 'prompt'
          ? undefined
          : resolveCanonicalResultForConsumer(envelope.payload);
        deps.commitOutcome(
          envelope.payload,
          committedInput,
          'equation',
          {
            equationScreen: request.equationScreen,
            equationSeed: equationReplaySeedFromRequest(request, committedInput),
            ...(envelope.payload.kind === 'success'
              && payloadResolution?.ok
              && payloadResolution.semantics.metadata?.solveBadges?.includes('Numeric Interval')
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
