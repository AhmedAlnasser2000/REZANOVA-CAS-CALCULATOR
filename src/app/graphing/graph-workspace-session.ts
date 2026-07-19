import type {
  GraphDocumentV1,
  GraphSurfaceStateV1,
} from '../../lib/graphing';

export const GRAPH_WORKSPACE_SESSION_VERSION = 1 as const;

export type GraphWorkspaceSessionStateV1 = {
  version: typeof GRAPH_WORKSPACE_SESSION_VERSION;
  document: GraphDocumentV1;
  surface: GraphSurfaceStateV1;
};

export function graphWorkspaceDefaultTitle(sequence: number) {
  return sequence <= 1 ? 'Untitled Graph' : `Untitled Graph ${sequence}`;
}

export function createGraphWorkspaceSessionState(
  workspaceInstanceId: string,
  title: string,
): GraphWorkspaceSessionStateV1 {
  return {
    version: GRAPH_WORKSPACE_SESSION_VERSION,
    document: {
      version: 1,
      documentId: `graph-document.${workspaceInstanceId}`,
      title,
      documentRevision: 0,
      items: [],
    },
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

export function isGraphWorkspaceSessionState(
  value: unknown,
): value is GraphWorkspaceSessionStateV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<GraphWorkspaceSessionStateV1>;
  return candidate.version === GRAPH_WORKSPACE_SESSION_VERSION
    && candidate.document?.version === 1
    && typeof candidate.document.documentId === 'string'
    && candidate.surface?.version === 1;
}

export function renameGraphWorkspaceSessionState(
  value: unknown,
  title: string,
) {
  if (!isGraphWorkspaceSessionState(value) || value.document.title === title) {
    return value;
  }
  return {
    ...value,
    document: {
      ...value.document,
      title,
      documentRevision: value.document.documentRevision + 1,
    },
  } satisfies GraphWorkspaceSessionStateV1;
}
