import {
  validateGraphDocument,
  validateGraphDocumentV1,
  validateGraphSurfaceState,
  validateGraphSurfaceStateV1,
  validateGraphSurfaceStateV2,
  validateGraphSurfaceStateV3,
} from '../../lib/graphing/contracts/validation';
import type { GraphDocumentV2 } from '../../lib/graphing/contracts/types';
import {
  createDefaultGraphPaneViewState,
  type GraphWorkspaceSessionStateV4,
  type GraphWorkspaceSessionStateV5,
  type GraphWorkspaceSessionStateV1,
  type GraphWorkspaceSessionStateV2,
  type GraphWorkspaceSessionStateV3,
} from './graph-workspace-session';

export function migrateGraphWorkspaceSessionState(
  value: unknown,
): GraphWorkspaceSessionStateV5 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<GraphWorkspaceSessionStateV1 | GraphWorkspaceSessionStateV2
    | GraphWorkspaceSessionStateV3 | GraphWorkspaceSessionStateV4 | GraphWorkspaceSessionStateV5>;
  const authoring = candidate.authoring;
  if (authoring !== undefined && !Array.isArray(authoring.piecewiseDrafts)) return null;
  if (candidate.version === 5) {
    const surface = validateGraphSurfaceState(candidate.surface);
    if (!surface.ok) return null;
    const document = validateGraphDocument(candidate.document);
    if (!document.ok) return null;
    return {
      version: 5,
      document: document.validated.value,
      surface: surface.validated.value,
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version === 4) {
    const surface = validateGraphSurfaceStateV3(candidate.surface);
    const document = validateGraphDocument(candidate.document);
    if (!surface.ok || !document.ok) return null;
    return {
      version: 5,
      document: document.validated.value,
      surface: {
        ...surface.validated.value,
        version: 4,
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version === 3) {
    const surface = validateGraphSurfaceStateV2(candidate.surface);
    const document = validateGraphDocument(candidate.document);
    if (!surface.ok || !document.ok) return null;
    return {
      version: 5,
      document: document.validated.value,
      surface: {
        ...surface.validated.value,
        version: 4,
        panes: { real: createDefaultGraphPaneViewState(), complex: createDefaultGraphPaneViewState() },
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
      ...(authoring ? { authoring } : {}),
    };
  }
  const legacySurface = validateGraphSurfaceStateV1(candidate.surface);
  if (!legacySurface.ok) return null;
  let migrated: GraphDocumentV2;
  if (candidate.version === 2) {
    const document = validateGraphDocument(candidate.document);
    if (!document.ok) return null;
    migrated = document.validated.value;
  } else if (candidate.version === 1) {
    const document = validateGraphDocumentV1(candidate.document);
    if (!document.ok) return null;
    migrated = {
      version: 2,
      documentId: document.validated.value.documentId,
      title: document.validated.value.title,
      contentRevision: document.validated.value.documentRevision,
      mathematicsRevision: document.validated.value.documentRevision,
      items: document.validated.value.items,
    };
  } else return null;
  return {
    version: 5,
    document: migrated,
    surface: {
      ...legacySurface.validated.value,
      version: 4,
      appearance: { theme: 'technical', colorVisionMode: 'standard' },
      panes: { real: createDefaultGraphPaneViewState(), complex: createDefaultGraphPaneViewState() },
      analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
    },
    ...(authoring ? { authoring } : {}),
  };
}

export function isGraphWorkspaceSessionState(
  value: unknown,
): value is GraphWorkspaceSessionStateV5 {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && (value as { version?: unknown }).version === 5
    && migrateGraphWorkspaceSessionState(value));
}
