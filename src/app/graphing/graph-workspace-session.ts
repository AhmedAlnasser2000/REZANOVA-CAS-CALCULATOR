import {
  validateGraphDocument,
  validateGraphDocumentV1,
  validateGraphSurfaceState,
  type GraphDocumentV1,
  type GraphDocumentV2,
  type GraphSurfaceStateV1,
} from '../../lib/graphing';

export const GRAPH_WORKSPACE_SESSION_VERSION = 2 as const;

export type GraphPiecewiseAuthoringDraftV1 = {
  version: 1;
  draftId: string;
  itemId: string;
  mode: 'create' | 'replace';
  target: 'y' | 'x';
  branches: Array<{
    branchId: string;
    valueLatex: string;
    conditionLatex: string;
  }>;
};

type GraphWorkspaceAuthoringStateV1 = {
  piecewiseDrafts: GraphPiecewiseAuthoringDraftV1[];
};

export type GraphWorkspaceSessionStateV1 = {
  version: 1;
  document: GraphDocumentV1;
  surface: GraphSurfaceStateV1;
  authoring?: GraphWorkspaceAuthoringStateV1;
};

export type GraphWorkspaceSessionStateV2 = {
  version: typeof GRAPH_WORKSPACE_SESSION_VERSION;
  document: GraphDocumentV2;
  surface: GraphSurfaceStateV1;
  authoring?: GraphWorkspaceAuthoringStateV1;
};

export function graphWorkspaceDefaultTitle(sequence: number) {
  return sequence <= 1 ? 'Untitled Graph' : `Untitled Graph ${sequence}`;
}

export function createGraphWorkspaceSessionState(
  workspaceInstanceId: string,
  title: string,
): GraphWorkspaceSessionStateV2 {
  return {
    version: GRAPH_WORKSPACE_SESSION_VERSION,
    document: {
      version: 2,
      documentId: `graph-document.${workspaceInstanceId}`,
      title,
      contentRevision: 0,
      mathematicsRevision: 0,
      items: [],
    },
    authoring: { piecewiseDrafts: [] },
    surface: {
      version: 1,
      viewport: {
        coordinateSystem: 'cartesian',
        xMin: -10,
        xMax: 10,
        yMin: -6,
        yMax: 6,
      },
      viewportRevision: 0,
      parameterRevision: 0,
      viewPolicy: { mode: 'real' },
      grid: {
        kind: 'cartesian',
        major: true,
        minor: true,
        axisNumbers: true,
        angleLabels: false,
        unitCircle: false,
      },
      expressionRailCollapsed: false,
      analyzeOpen: false,
      selectedItemId: null,
      presentationMode: false,
    },
  };
}

export function migrateGraphWorkspaceSessionState(
  value: unknown,
): GraphWorkspaceSessionStateV2 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<GraphWorkspaceSessionStateV1 | GraphWorkspaceSessionStateV2>;
  const surface = validateGraphSurfaceState(candidate.surface);
  if (!surface.ok) return null;
  const authoring = candidate.authoring;
  if (authoring !== undefined && !Array.isArray(authoring.piecewiseDrafts)) return null;
  if (candidate.version === 2) {
    const document = validateGraphDocument(candidate.document);
    if (!document.ok) return null;
    return {
      version: 2,
      document: document.validated.value,
      surface: surface.validated.value,
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version !== 1) return null;
  const document = validateGraphDocumentV1(candidate.document);
  if (!document.ok) return null;
  const migrated: GraphDocumentV2 = {
    version: 2,
    documentId: document.validated.value.documentId,
    title: document.validated.value.title,
    contentRevision: document.validated.value.documentRevision,
    mathematicsRevision: document.validated.value.documentRevision,
    items: document.validated.value.items,
  };
  return {
    version: 2,
    document: migrated,
    surface: surface.validated.value,
    ...(authoring ? { authoring } : {}),
  };
}

export function isGraphWorkspaceSessionState(
  value: unknown,
): value is GraphWorkspaceSessionStateV2 {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && (value as { version?: unknown }).version === 2
    && migrateGraphWorkspaceSessionState(value));
}

export function renameGraphWorkspaceSessionState(
  value: unknown,
  title: string,
) {
  const session = migrateGraphWorkspaceSessionState(value);
  if (!session || session.document.title === title) return value;
  return {
    ...session,
    document: {
      ...session.document,
      title,
      contentRevision: session.document.contentRevision + 1,
    },
  } satisfies GraphWorkspaceSessionStateV2;
}
