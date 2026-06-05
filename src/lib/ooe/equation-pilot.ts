import type { DisplayOutcome } from '../../types/calculator';
import {
  listSharedEquationSolveStageOrder,
  runSharedEquationSolveWithTrace,
  type SharedSolveRequest,
} from '../equation/shared-solve';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  type GuardedEquationSolveControl,
  type GuardedEquationStageReplayTrace,
} from '../equation/guarded-solve';
import { type OoeTraceEvent } from './ooe-bridge';
import { summarizeDisplayOutcome } from './diagnostics-buffer';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import { runOoeRuntimeJob } from './runtime-coordinator';
import type { OoeRuntimeControlContext } from './runtime-coordinator';
import {
  buildOoePreflightTraceEvent,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeStageAttemptTraceEvent,
  buildOoeTraceEvent,
} from './trace';

export const OOE_EQUATION_SOLVE_PLAN_ID = 'plan.equation.solve' as const;
export const OOE_EQUATION_SOLVE_CAPABILITY_ID = 'equation.solve' as const;
export const OOE_EQUATION_SOLVE_HOST_ID = 'equation-runtime' as const;
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
};

export type EquationOoePilotSolveResult = OoeRuntimeEnvelope<
  DisplayOutcome,
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
  const cancellation = guardedTrace?.cancellation;
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
        message: `${cancellation.reason} (${cancellation.phase} at depth ${cancellation.depth}.)`,
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
    ...stageEvents,
    finalTraceEvent,
  ];
}

function detailSectionTitles(outcome: DisplayOutcome) {
  return 'detailSections' in outcome && outcome.detailSections
    ? outcome.detailSections.map((section) => section.title)
    : [];
}

function generatedEquationDetails(outcome: DisplayOutcome) {
  if (!('detailSections' in outcome) || !outcome.detailSections) {
    return [];
  }

  return outcome.detailSections.flatMap((section) => {
    const title = section.title.toLowerCase();
    if (
      !title.includes('isolation')
      && !title.includes('solve')
      && !title.includes('transform')
    ) {
      return [];
    }

    return section.lines.filter((line) =>
      /generated equation|isolated form|formula form|formula branches|isolation facts/i.test(line));
  });
}

function hasExplicitImaginaryInput(latex?: string) {
  return Boolean(latex && /\\imaginaryI(?![A-Za-z])|(^|[^\\A-Za-z])i(?=$|[^A-Za-z])/u.test(latex));
}

export function buildEquationProvenance(input: {
  payload: DisplayOutcome;
  metadata: EquationOoePilotMetadata;
  routeSnapshot: unknown;
}) {
  const snapshot = input.routeSnapshot as {
    route?: string;
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
    outputSummary: summarizeDisplayOutcome(input.payload),
    runtimeHost: input.metadata.hostId,
    commitDecision: input.metadata.commitAssessment.commitDecision,
    equation: {
      answerMode: snapshot.request?.equationAnswerMode ?? 'exact',
      domainIntent: snapshot.request?.equationDomainIntent ?? 'real',
      complexExactForm: snapshot.request?.complexExactForm ?? 'rectangular',
      answerDomain: input.payload.kind === 'prompt' ? undefined : input.payload.answerDomain,
      solutionKind: input.payload.kind === 'prompt' ? undefined : input.payload.solutionKind,
      inequalityRouteEvidence: input.payload.kind !== 'prompt' && input.payload.solutionKind === 'inequality-solution-set'
        ? {
            relation: snapshot.request?.equationLatex?.match(/\\(?:le|leq|ge|geq)(?![A-Za-z])|[<>≤≥]/u)?.[0],
            detailSectionTitles: detailSectionTitles(input.payload),
            exactLatexLength: input.payload.exactLatex?.length,
          }
        : undefined,
      complexRouteEvidence: input.payload.kind !== 'prompt' && input.payload.answerDomain === 'complex'
        ? {
            detailSectionTitles: detailSectionTitles(input.payload),
            exactLatexLength: input.payload.exactLatex?.length,
            explicitImaginaryInput: hasExplicitImaginaryInput(snapshot.request?.equationLatex),
          }
        : undefined,
      explicitImaginaryInput: hasExplicitImaginaryInput(snapshot.request?.equationLatex),
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
      cancellation: cancellation
        ? {
            stageId: cancellation.stageId ?? null,
            depth: cancellation.depth,
            phase: cancellation.phase,
            reason: cancellation.reason,
          }
        : undefined,
      winningStageId: cancellation ? null : winningAttempt?.stageId ?? null,
      stopReason: input.payload.kind === 'error' ? input.payload.error : null,
      detailSectionTitles: detailSectionTitles(input.payload),
      generatedRewriteOrIsolationDetails: generatedEquationDetails(input.payload),
      outputHygiene: summarizeDisplayOutcome(input.payload).unsafeReadbackMarkers?.length
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
): EquationOoePilotMetadata {
  const cancelled = Boolean(guardedTrace?.cancellation);
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
    traceEvents: buildEquationOoeTraceEvents(
      status,
      metadataJobContext,
      guardedTrace,
      controlTraceEvents,
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
    run: (controlContext) => {
      const traced = runSharedEquationSolveWithTrace(request, {
        control: buildEquationSolveControlFromOoe(controlContext),
      });
      guardedTrace = traced.trace;
      return traced.outcome;
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
