import {
  buildOoeInputRevisionId,
  isOoeCommitAllowed,
  type OoeJobCommitContext,
} from '../ooe/job-launch/job-contract';
import { runOoeRuntimeJob } from '../ooe/runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../ooe/runtime-envelope';

export type EditorAnalysisLane =
  | 'variableHints'
  | 'equationTargetDiscovery'
  | 'calculateTransformEligibility'
  | 'equationTransformEligibility'
  | 'previewRender';

export type EditorAnalysisOoeConfig = {
  lane: EditorAnalysisLane;
  contextKey?: string;
  generation?: number;
};

type EditorAnalysisOoeSnapshot = Required<EditorAnalysisOoeConfig> & {
  source: string;
};

type EditorAnalysisOoeDefinition = OoePilotDefinition & {
  lane: EditorAnalysisLane;
};

export type EditorAnalysisOoeStatus = OoePilotStatus;

export type EditorAnalysisOoeMetadata =
  OoeRuntimeMetadata<EditorAnalysisOoeDefinition, EditorAnalysisOoeStatus> & {
    lane: EditorAnalysisLane;
    contextKey: string;
    sourceLength: number;
  };

type RunEditorAnalysisWithOoeBudgetInput<T> = EditorAnalysisOoeConfig & {
  source: string;
  analyze: (source: string) => T | Promise<T>;
  getActiveSnapshot?: () => EditorAnalysisOoeSnapshot | null;
};

const EDITOR_ANALYSIS_HOST_ID = 'editor-analysis-runtime';

const EDITOR_ANALYSIS_DEFINITIONS: Record<EditorAnalysisLane, EditorAnalysisOoeDefinition> = {
  variableHints: {
    lane: 'variableHints',
    planId: 'plan.editor.variableHints',
    capabilityId: 'editor.variableHints',
    hostId: EDITOR_ANALYSIS_HOST_ID,
    nodeId: 'node.editor.variableHints',
    phaseId: 'editor.variableHints',
  },
  equationTargetDiscovery: {
    lane: 'equationTargetDiscovery',
    planId: 'plan.editor.equationTargetDiscovery',
    capabilityId: 'editor.equationTargetDiscovery',
    hostId: EDITOR_ANALYSIS_HOST_ID,
    nodeId: 'node.editor.equationTargetDiscovery',
    phaseId: 'editor.equationTargetDiscovery',
  },
  calculateTransformEligibility: {
    lane: 'calculateTransformEligibility',
    planId: 'plan.editor.calculateTransformEligibility',
    capabilityId: 'editor.calculateTransformEligibility',
    hostId: EDITOR_ANALYSIS_HOST_ID,
    nodeId: 'node.editor.calculateTransformEligibility',
    phaseId: 'editor.calculateTransformEligibility',
  },
  equationTransformEligibility: {
    lane: 'equationTransformEligibility',
    planId: 'plan.editor.equationTransformEligibility',
    capabilityId: 'editor.equationTransformEligibility',
    hostId: EDITOR_ANALYSIS_HOST_ID,
    nodeId: 'node.editor.equationTransformEligibility',
    phaseId: 'editor.equationTransformEligibility',
  },
  previewRender: {
    lane: 'previewRender',
    planId: 'plan.editor.previewRender',
    capabilityId: 'editor.previewRender',
    hostId: EDITOR_ANALYSIS_HOST_ID,
    nodeId: 'node.editor.previewRender',
    phaseId: 'editor.previewRender',
  },
};

export function editorAnalysisOoeDefinition(lane: EditorAnalysisLane) {
  return EDITOR_ANALYSIS_DEFINITIONS[lane];
}

export function buildEditorAnalysisOoeSnapshot({
  lane,
  source,
  contextKey = '',
  generation = 0,
}: EditorAnalysisOoeConfig & { source: string }): EditorAnalysisOoeSnapshot {
  return {
    lane,
    source,
    contextKey,
    generation,
  };
}

export function buildEditorAnalysisOoeInputRevisionId(
  snapshot: EditorAnalysisOoeSnapshot,
) {
  return buildOoeInputRevisionId(
    editorAnalysisOoeDefinition(snapshot.lane).capabilityId,
    snapshot,
  );
}

function buildMetadata(
  definition: EditorAnalysisOoeDefinition,
  status: EditorAnalysisOoeStatus,
  snapshot: EditorAnalysisOoeSnapshot,
  jobContext: OoeJobCommitContext,
): EditorAnalysisOoeMetadata {
  return {
    ...definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    lane: snapshot.lane,
    contextKey: snapshot.contextKey,
    sourceLength: snapshot.source.length,
    traceEvents: buildCoarseLifecycleOoeTraceEvents({
      definition,
      status,
      job: jobContext.job,
      commitAssessment: jobContext.commitAssessment,
      preflightMessage: `Editor analysis ${snapshot.lane} preflight completed.`,
      startedMessage: `Editor analysis ${snapshot.lane} started.`,
      finalMessage: `Editor analysis ${snapshot.lane} produced a budgeted result.`,
    }),
  };
}

export async function runEditorAnalysisWithOoeBudget<T>(
  input: RunEditorAnalysisWithOoeBudgetInput<T>,
): Promise<OoeRuntimeEnvelope<T, EditorAnalysisOoeMetadata>> {
  const snapshot = buildEditorAnalysisOoeSnapshot(input);
  const definition = editorAnalysisOoeDefinition(input.lane);

  return runOoeRuntimeJob({
    definition,
    routeLabel: `editor.${input.lane}`,
    routeSnapshot: snapshot,
    options: {
      commitPolicy: 'commitIfCurrent',
      activeInputRevisionId: () => {
        const activeSnapshot = input.getActiveSnapshot
          ? input.getActiveSnapshot()
          : snapshot;
        return activeSnapshot
          ? buildEditorAnalysisOoeInputRevisionId(activeSnapshot)
          : null;
      },
    },
    run: () => input.analyze(input.source),
    buildMetadata: ({ status, jobContext }) => buildMetadata(
      definition,
      status,
      snapshot,
      jobContext,
    ),
    buildProvenance: ({ metadata }) => ({
      depth: 'coarse',
      mode: 'editor',
      route: `editor.${snapshot.lane}`,
      action: snapshot.lane,
      inputSummary: {
        sourceLength: snapshot.source.length,
        contextKey: snapshot.contextKey,
        generation: snapshot.generation,
      },
      runtimeHost: metadata.hostId,
      commitDecision: metadata.commitAssessment.commitDecision,
      editor: {
        lane: snapshot.lane,
        sourceLength: snapshot.source.length,
        contextKey: snapshot.contextKey,
        generation: snapshot.generation,
      },
    }),
  });
}

export function shouldCommitEditorAnalysis(
  metadata: EditorAnalysisOoeMetadata,
) {
  return isOoeCommitAllowed(metadata.commitAssessment);
}
