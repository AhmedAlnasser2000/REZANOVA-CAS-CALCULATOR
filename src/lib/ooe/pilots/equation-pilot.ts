import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import { finalizeEquationCanonicalRuntimeOutcome } from '../../equation/equation-solve-result';
import { resolveCanonicalResultForConsumer } from '../../result-contract';
import {
  listSharedEquationSolveStageOrder,
  runSharedEquationSolveWithTraceAsync,
  type SharedSolveRequest,
} from '../../equation/shared-solve';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  runGuardedDirectSymbolicFallback,
  type GuardedEquationSolveControl,
  type GuardedEquationStageReplayTrace,
} from '../../equation/guarded-solve';
import { type OoeTraceEvent } from '../bridge-schema/ooe-bridge';
import { summarizeCanonicalRuntimeOutcome } from '../diagnostics/diagnostics-buffer';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from '../job-launch/job-contract';
import { runOoeRuntimeJob } from '../runtime-control/runtime-coordinator';
import type { OoeRuntimeControlContext } from '../runtime-control/runtime-coordinator';
import {
  buildOoePreflightTraceEvent,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../runtime-control/runtime-envelope';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeStageAttemptTraceEvent,
  buildOoeTraceEvent,
} from '../runtime-control/trace';
import {
  buildOoeRuntimeShellEvidence,
  type OoeRuntimeShellEvidence,
} from '../runtime-control/runtime-shell-contract';

export const OOE_EQUATION_SOLVE_PLAN_ID = 'plan.equation.solve' as const;
export const OOE_EQUATION_SOLVE_CAPABILITY_ID = 'equation.solve' as const;
export const OOE_EQUATION_SOLVE_HOST_ID = 'equation-worker-runtime' as const;
export const OOE_EQUATION_SOLVE_FALLBACK_HOST_ID = 'equation-runtime' as const;
export const OOE_EQUATION_SOLVE_NODE_ID = 'node.equation.solve' as const;
export const OOE_EQUATION_SOLVE_PHASE_ID = 'equation.solve' as const;

type EquationPilotDefinition = {
  planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
  capabilityId: typeof OOE_EQUATION_SOLVE_CAPABILITY_ID;
  hostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
  nodeId: typeof OOE_EQUATION_SOLVE_NODE_ID;
  phaseId: typeof OOE_EQUATION_SOLVE_PHASE_ID;
};

export type EquationOoePilotStatus = OoePilotStatus<typeof OOE_EQUATION_SOLVE_PLAN_ID>;

export type EquationOoePilotMetadata = OoeRuntimeMetadata<
  EquationPilotDefinition,
  EquationOoePilotStatus
> & {
  stageOrder: string[];
  guardedTrace?: GuardedEquationStageReplayTrace;
  runtimeHostExecution?: EquationRuntimeHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type EquationRuntimeHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_EQUATION_SOLVE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
      reason: string;
    };

export type EquationOoePilotSolveResult = OoeRuntimeEnvelope<
  CanonicalRuntimeOutcome,
  EquationOoePilotMetadata
>;

export function equationPilotDefinition(): EquationPilotDefinition {
  return {
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
  };
}

export async function prepareEquationOoePilot(): Promise<EquationOoePilotStatus> {
  return prepareOoePlanPreflight(equationPilotDefinition());
}

export function buildEquationSolveControlFromOoe(
  context: OoeRuntimeControlContext,
): GuardedEquationSolveControl {
  return {
    shouldCancel: context.shouldCancel,
    checkpoint: context.checkpoint,
    yieldIfBudgetExceeded: context.yieldIfBudgetExceeded,
  };
}

function traceMessageForStatus(status: EquationOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE equation solve plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE equation solve plan was not found.';
    case 'invalid-plan':
      return `OOE equation solve plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildEquationOoeStatusTraceEvent(
  status: EquationOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
): OoeTraceEvent {
  return buildOoePreflightTraceEvent(
    equationPilotDefinition(),
    status,
    traceMessageForStatus(status),
    jobContext.job,
  );
}

function buildEquationOoeTraceEvents(
  status: EquationOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  guardedTrace?: GuardedEquationStageReplayTrace,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  runtimeHostExecution?: EquationRuntimeHostExecution,
): OoeTraceEvent[] {
  const stageEvents = guardedTrace?.attempts.map((attempt) => buildOoeStageAttemptTraceEvent({
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
    stageId: attempt.stageId,
    depth: attempt.depth,
    returnedOutcome: attempt.returnedOutcome,
    job: jobContext.job,
  })) ?? [];
  const helperHostEvents = guardedTrace?.directSymbolicHostExecutions?.map((execution) => buildOoeTraceEvent({
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: execution.selectedHostId,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
    stageId: execution.stageId,
    jobId: jobContext.job.jobId,
    inputRevisionId: jobContext.job.inputRevisionId,
    status: execution.terminalStatus === 'cancelled'
      ? 'cancelled'
      : execution.terminalStatus === 'failed'
        ? 'failed'
        : 'provisionalReady',
    resultStability: execution.terminalStatus === 'cancelled'
      ? 'stale'
      : execution.terminalStatus === 'failed'
        ? 'failed'
        : 'provisional',
    commitDecision: 'notApplicable',
    message: execution.fallbackFromHostId
      ? `Equation direct-symbolic helper fell back from ${execution.fallbackFromHostId} to ${execution.selectedHostId}: ${execution.fallbackReason ?? 'unknown reason'}.`
      : execution.terminalStatus === 'cancelled'
        ? `Equation direct-symbolic helper ${execution.selectedHostId} was hard-stopped.`
        : `Equation direct-symbolic helper ran on ${execution.selectedHostId}.`,
  })) ?? [];
  const runtimeHostEvent = runtimeHostExecution
    ? buildOoeTraceEvent({
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        nodeId: OOE_EQUATION_SOLVE_NODE_ID,
        capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
        hostId: runtimeHostExecution.hostId,
        phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
        jobId: jobContext.job.jobId,
        inputRevisionId: jobContext.job.inputRevisionId,
        status: runtimeHostExecution.terminalStatus === 'cancelled'
          ? 'cancelled'
          : 'provisionalReady',
        resultStability: runtimeHostExecution.terminalStatus === 'cancelled'
          ? 'stale'
          : 'provisional',
        commitDecision: 'notApplicable',
        message: runtimeHostExecution.kind === 'fallback'
          ? `Equation worker runtime fell back from ${runtimeHostExecution.fallbackFromHostId} to ${runtimeHostExecution.hostId}: ${runtimeHostExecution.reason}.`
          : runtimeHostExecution.kind === 'worker-cancelled'
            ? `Equation worker runtime ${runtimeHostExecution.hostId} was hard-stopped.`
            : `Equation worker runtime ran on ${runtimeHostExecution.hostId}.`,
      })
    : null;
  const cancellation = guardedTrace?.cancellation;
  const cancellationEvidence = cancellation
    ? [
        cancellation.helperId ? `helper ${cancellation.helperId}` : null,
        cancellation.family ? `family ${cancellation.family}` : null,
        cancellation.branchIndex !== undefined ? `branch ${cancellation.branchIndex}` : null,
        cancellation.candidateIndex !== undefined ? `candidate ${cancellation.candidateIndex}` : null,
      ].filter(Boolean).join(', ')
    : '';
  const finalTraceEvent = cancellation
    ? buildOoeTraceEvent({
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        nodeId: OOE_EQUATION_SOLVE_NODE_ID,
        capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
        hostId: OOE_EQUATION_SOLVE_HOST_ID,
        phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
        stageId: cancellation.stageId ?? null,
        jobId: jobContext.job.jobId,
        inputRevisionId: jobContext.job.inputRevisionId,
        status: 'cancelled',
        resultStability: 'stale',
        commitDecision: 'notApplicable',
        message: `${cancellation.reason} (${cancellation.phase} at depth ${cancellation.depth}${cancellationEvidence ? `; ${cancellationEvidence}` : ''}.)`,
      })
    : buildOoeFinalOutcomeTraceEvent({
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        nodeId: OOE_EQUATION_SOLVE_NODE_ID,
        capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
        hostId: OOE_EQUATION_SOLVE_HOST_ID,
        phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
        job: jobContext.job,
        commitDecision: jobContext.commitAssessment.commitDecision,
      });

  return [
    buildEquationOoeStatusTraceEvent(status, jobContext),
    ...controlTraceEvents,
    ...(runtimeHostEvent ? [runtimeHostEvent] : []),
    ...stageEvents,
    ...helperHostEvents,
    finalTraceEvent,
  ];
}

function detailSectionTitles(outcome: CanonicalRuntimeOutcome) {
  if (outcome.kind === 'prompt') return [];
  const resolution = resolveCanonicalResultForConsumer(outcome);
  return resolution.ok
    ? resolution.presentation.details?.map((section) => section.title) ?? []
    : [];
}

function generatedEquationDetails(outcome: CanonicalRuntimeOutcome) {
  if (outcome.kind === 'prompt') {
    return [];
  }
  const resolution = resolveCanonicalResultForConsumer(outcome);
  const details = resolution.ok ? resolution.presentation.details : undefined;
  if (!details) return [];

  return details.flatMap((section) => {
    const title = section.title.toLowerCase();
    if (
      !title.includes('isolation')
      && !title.includes('solve')
      && !title.includes('transform')
    ) {
      return [];
    }

    return section.lines
      .map((line) => line.map((part) => part.kind === 'text' ? part.text : part.latex).join(''))
      .filter((line) =>
        /generated equation|isolated form|formula form|formula branches|isolation facts/i.test(line));
  });
}

function explicitImaginaryInputFromSnapshot(snapshot: {
  explicitImaginaryInput?: unknown;
}) {
  return snapshot.explicitImaginaryInput === true;
}

export function buildEquationProvenance(input: {
  payload: CanonicalRuntimeOutcome;
  metadata: EquationOoePilotMetadata;
  routeSnapshot: unknown;
}) {
  const snapshot = input.routeSnapshot as {
    route?: string;
    explicitImaginaryInput?: unknown;
    request?: {
      equationScreen?: string;
      equationLatex?: string;
      equationSolveTarget?: string | null;
      equationAnswerMode?: string;
      equationDomainIntent?: string;
      complexExactForm?: string;
      numericInterval?: unknown;
    };
  };
  const winningAttempt = input.metadata.guardedTrace?.attempts.find((attempt) =>
    attempt.returnedOutcome);
  const cancellation = input.metadata.guardedTrace?.cancellation;
  const runtimeHostExecution = input.metadata.runtimeHostExecution;
  const explicitImaginaryInput = explicitImaginaryInputFromSnapshot(snapshot);
  const resolution = input.payload.kind === 'prompt'
    ? undefined
    : resolveCanonicalResultForConsumer(input.payload);
  const presentation = resolution?.ok ? resolution.presentation : undefined;
  const resultMetadata = resolution?.ok ? resolution.semantics.metadata : undefined;

  return {
    depth: 'rich' as const,
    mode: 'equation',
    route: snapshot.route ?? 'equation.solve',
    screen: snapshot.request?.equationScreen,
    action: snapshot.request?.numericInterval ? 'numeric-interval-solve' : 'symbolic-solve',
    inputSummary: {
      route: snapshot.route,
      latexLength: snapshot.request?.equationLatex?.length,
      hasNumericInterval: Boolean(snapshot.request?.numericInterval),
    },
    outputSummary: summarizeCanonicalRuntimeOutcome(input.payload),
    runtimeHost: input.metadata.hostId,
    runtimeShell: input.metadata.runtimeShell,
    runtimeHostExecution,
    commitDecision: input.metadata.commitAssessment.commitDecision,
    equation: {
      answerMode: snapshot.request?.equationAnswerMode ?? 'exact',
      domainIntent: snapshot.request?.equationDomainIntent ?? 'real',
      complexExactForm: snapshot.request?.complexExactForm ?? 'rectangular',
      answerDomain: resultMetadata?.answerDomain,
      solutionKind: resultMetadata?.solutionKind,
      inequalityRouteEvidence: resultMetadata?.solutionKind === 'inequality-solution-set'
        ? {
            relation: snapshot.request?.equationLatex?.match(/\\(?:le|leq|ge|geq)(?![A-Za-z])|[<>≤≥]/u)?.[0],
            detailSectionTitles: detailSectionTitles(input.payload),
            exactLatexLength: presentation?.primaryLatex?.length,
          }
        : undefined,
      complexRouteEvidence: resultMetadata?.answerDomain === 'complex'
        ? {
            detailSectionTitles: detailSectionTitles(input.payload),
            exactLatexLength: presentation?.primaryLatex?.length,
            explicitImaginaryInput,
          }
        : undefined,
      explicitImaginaryInput,
      selectedTarget: snapshot.request?.equationSolveTarget ?? null,
      targetDiscovery: snapshot.request?.equationSolveTarget
        ? 'selected-target'
        : 'default-target',
      stageOrder: input.metadata.stageOrder,
      guardedStageAttempts: input.metadata.guardedTrace?.attempts.map((attempt) => ({
        stageId: attempt.stageId,
        depth: attempt.depth,
        returnedOutcome: attempt.returnedOutcome,
      })) ?? [],
      directSymbolicHelperHostExecutions: input.metadata.guardedTrace?.directSymbolicHostExecutions?.map((execution) => ({
        helperId: execution.helperId,
        stageId: execution.stageId,
        depth: execution.depth,
        selectedHostId: execution.selectedHostId,
        fallbackFromHostId: execution.fallbackFromHostId,
        fallbackReason: execution.fallbackReason,
        isolated: execution.isolated,
        terminalStatus: execution.terminalStatus,
        termination: execution.termination,
      })) ?? [],
      cancellation: cancellation
        ? {
            stageId: cancellation.stageId ?? null,
            depth: cancellation.depth,
            phase: cancellation.phase,
            reason: cancellation.reason,
            helperId: cancellation.helperId,
            family: cancellation.family,
            branchIndex: cancellation.branchIndex,
            candidateIndex: cancellation.candidateIndex,
            message: cancellation.message,
          }
        : undefined,
      winningStageId: cancellation ? null : winningAttempt?.stageId ?? null,
      stopReason: input.payload.kind === 'error' ? presentation?.error ?? null : null,
      detailSectionTitles: detailSectionTitles(input.payload),
      generatedRewriteOrIsolationDetails: generatedEquationDetails(input.payload),
      outputHygiene: summarizeCanonicalRuntimeOutcome(input.payload).unsafeReadbackMarkers?.length
        ? 'unsafe-markers-detected'
        : 'display-safe',
    },
  };
}

export function buildEquationOoePilotMetadata(
  status: EquationOoePilotStatus,
  guardedTrace?: GuardedEquationStageReplayTrace,
  routeSnapshot: unknown = { capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    equationPilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  runtimeHostExecution?: EquationRuntimeHostExecution,
): EquationOoePilotMetadata {
  const cancelled = Boolean(guardedTrace?.cancellation)
    || runtimeHostExecution?.terminalStatus === 'cancelled';
  const commitAssessment = cancelled
    ? {
        ...jobContext.commitAssessment,
        legality: 'notApplicable' as const,
        commitDecision: 'notApplicable' as const,
        resultStability: 'stale' as const,
      }
    : jobContext.commitAssessment;
  const metadataJobContext = {
    ...jobContext,
    commitAssessment,
  };
  const runtimeShell = buildOoeRuntimeShellEvidence({
    shellId: 'equation-worker-shell',
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    primaryHostId: OOE_EQUATION_SOLVE_HOST_ID,
    fallbackHostId: OOE_EQUATION_SOLVE_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution: runtimeHostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...equationPilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: guardedTrace?.cancellation?.reason ?? EQUATION_SOLVE_CANCELLED_MESSAGE,
        }
      : undefined,
    commitAssessment,
    stageOrder: listSharedEquationSolveStageOrder(),
    guardedTrace,
    runtimeHostExecution,
    runtimeShell,
    traceEvents: buildEquationOoeTraceEvents(
      status,
      metadataJobContext,
      guardedTrace,
      controlTraceEvents,
      runtimeHostExecution,
    ),
  };
}

export async function runSharedEquationSolveWithOoePilot(
  request: SharedSolveRequest,
  options?: OoeJobContextOptions,
): Promise<EquationOoePilotSolveResult> {
  const routeSnapshot = { request };
  const definition = equationPilotDefinition();
  let guardedTrace: GuardedEquationStageReplayTrace | undefined;

  return runOoeRuntimeJob({
    definition,
    routeLabel: 'equation.solve',
    routeSnapshot,
    options,
    prepareStatus: prepareEquationOoePilot,
    run: async (controlContext) => {
      const control = buildEquationSolveControlFromOoe(controlContext);
      const traced = await runSharedEquationSolveWithTraceAsync(request, {
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
      return finalizeEquationCanonicalRuntimeOutcome(traced.outcome);
    },
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildEquationOoePilotMetadata(
      status,
      guardedTrace,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => buildEquationProvenance({
      payload,
      metadata,
      routeSnapshot,
    }),
  });
}
