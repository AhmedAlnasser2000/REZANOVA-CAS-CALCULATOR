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
import type {
  AngleUnit,
  ComplexExactForm,
  ComplexSolveRegion,
  DisplayOutcome,
  EquationAnswerMode,
  EquationScreen,
  ModeId,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { equationReplaySeedFromRequest } from './equationHistorySeed';

type TransitionFn = (callback: () => void) => void;
type CommitOutcomeFn = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  replayContext?: Record<string, unknown>,
) => void;

export type EquationComplexRegionPanelState = {
  enabled: boolean;
  reMin: string;
  reMax: string;
  imMin: string;
  imMax: string;
  gridSize: number;
};

type EquationStoredValueSolveOptions = {
  variableSubstitutionSnapshot?: VariableSubstitutionSnapshot[];
  useStoredValueSubstitution?: boolean;
};

type EquationComplexRegionRuntimeDeps = {
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
  equationComplexRegionPanel: EquationComplexRegionPanelState;
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
  getActiveEquationRequest?: (kind: 'complex-region') => RunEquationModeRequest | null;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  resolveActiveEquationInputRevision?: (
    kind: 'complex-region',
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunEquationModeRequest) => string,
  ) => string | null;
  getLiveEquationSnapshot?: () => {
    equationLatex: string;
    equationInputLatex: string;
  } | null;
};

type RunEquationComplexRegionRuntimeActionInput = {
  deps: EquationComplexRegionRuntimeDeps;
  options: EquationStoredValueSolveOptions;
  buildInputRevisionIdForRun: (
    request: RunEquationModeRequest,
    options: EquationStoredValueSolveOptions,
  ) => string;
  replayedEquationSubstitutionSnapshot: (committedInput: string) => VariableSubstitutionSnapshot[] | undefined;
  shouldSuppressVisibleCommit: (input: {
    routeKind: 'complex-region';
    inputRevisionId: string;
  }) => boolean;
  handleCancelledEnvelope: (
    envelope: Awaited<ReturnType<typeof runEquationModeWithOoePilot>>,
  ) => boolean;
  buildRuntimeLoadError: (title: string, error: unknown) => DisplayOutcome;
};

function regionFromPanel(panel: EquationComplexRegionPanelState): ComplexSolveRegion {
  return {
    reMin: panel.reMin,
    reMax: panel.reMax,
    imMin: panel.imMin,
    imMax: panel.imMax,
    gridSize: panel.gridSize,
  };
}

export function runEquationComplexRegionRuntimeAction({
  deps,
  options,
  buildInputRevisionIdForRun,
  replayedEquationSubstitutionSnapshot,
  shouldSuppressVisibleCommit,
  handleCancelledEnvelope,
  buildRuntimeLoadError,
}: RunEquationComplexRegionRuntimeActionInput) {
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
    const region = regionFromPanel(deps.equationComplexRegionPanel);
    let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;

    void (async () => {
      try {
        const request: RunEquationModeRequest = {
          equationScreen: deps.equationScreen,
          equationLatex: executionLatex,
          equationSolveTarget: deps.equationSolveTarget,
          equationAnswerMode: 'exact',
          equationDomainIntent: 'complex',
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
          complexRegion: region,
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
          routeKind: 'complex-region',
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
                        'complex-region',
                        job,
                        (activeRequest) => buildInputRevisionIdForRun(activeRequest, options),
                      )
                      : (() => {
                          const activeRequest = deps.getActiveEquationRequest?.('complex-region');
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

        deps.commitOutcome(
          envelope.payload,
          committedInput,
          'equation',
          {
            equationScreen: request.equationScreen,
            equationSeed: equationReplaySeedFromRequest(request, committedInput),
            ...(deps.equationSolveTarget ? { equationSolveTarget: deps.equationSolveTarget } : {}),
            equationAnswerMode: 'exact',
            equationDomainIntent: 'complex',
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
