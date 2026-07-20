import {
  type GraphDocumentV1,
  type GraphDocumentV2,
  type GraphSurfaceStateV1,
} from '../../lib/graphing/contracts/types';

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

export type GraphWorkspaceAuthoringStateV1 = {
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

export function renameGraphWorkspaceSessionState(
  value: unknown,
  title: string,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const session = value as Partial<GraphWorkspaceSessionStateV2>;
  if (
    session.version !== 2
    || !session.document
    || session.document.version !== 2
    || session.document.title === title
  ) return value;
  return {
    ...session,
    document: {
      ...session.document,
      title,
      contentRevision: session.document.contentRevision + 1,
    },
  } as GraphWorkspaceSessionStateV2;
}
