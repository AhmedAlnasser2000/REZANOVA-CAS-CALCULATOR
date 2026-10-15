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
import type {
  CalculateAction,
  CalculateRouteMeta,
  CalculateScreen,
  CanonicalRuntimeOutcome,
  IntegralWorkbenchState,
  LimitDirection,
  LimitWorkbenchState,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { createCanonicalRuntimeError } from '../../lib/result-contract/runtime-outcome';
import { RETIRED_ENGINE_MESSAGE } from '../../lib/kernel/retired-engine';

type TransitionFn = (callback: () => void) => void;

type CommitOutcomeFn = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  replayContext?: Record<string, unknown>,
) => void;

type RetitleOutcomeFn = (outcome: CanonicalRuntimeOutcome, title: string) => CanonicalRuntimeOutcome;

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
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome) => void;
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

/** What the retired Equation shell actions still read (see createEquationRuntimeController). */
type EquationRuntimeDeps = {
  displayOutcome: CanonicalRuntimeOutcome | null;
  equationInputLatex: string;
  commitOutcome: CommitOutcomeFn;
  switchToEquationWithLatex: (latex: string) => void;
};

function buildCalculateWorkbenchError(
  deps: CalculateRuntimeDeps,
): CanonicalRuntimeOutcome {
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

  return createCanonicalRuntimeError(screenTitle, error);
}

function buildRuntimeLoadError(title: string, error: unknown): CanonicalRuntimeOutcome {
  return createCanonicalRuntimeError(
    title,
    error instanceof Error
      ? `Could not load the ${title} runtime: ${error.message}`
      : `Could not load the ${title} runtime.`,
  );
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

/**
 * The old Equation workspace and its engine are retired (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B). The shell keeps
 * these actions with their names so its routers stay unchanged: solving commits the typed retired-engine stop, and the
 * numeric panels are never shown. The workspace itself cannot be opened.
 */
export function createEquationRuntimeController(deps: EquationRuntimeDeps) {
  function openPromptTarget() {
    if (deps.displayOutcome?.kind !== 'prompt' || deps.displayOutcome.targetMode !== 'equation') {
      return;
    }

    deps.switchToEquationWithLatex(deps.displayOutcome.carryLatex);
  }

  function runEquationAction() {
    deps.commitOutcome(createCanonicalRuntimeError('Equation', RETIRED_ENGINE_MESSAGE, {
      runtimeAdvisories: { stopReason: { kind: 'unsupported-family', source: 'host' } },
    }), deps.equationInputLatex, 'equation');
  }

  return {
    openPromptTarget,
    runEquationAction,
    runEquationNumericSolveAction: () => undefined,
    shouldAllowEquationNumericSolve: () => false,
    shouldShowEquationNumericSolvePanel: () => false,
  };
}
