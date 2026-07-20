import {
  validateGraphDocumentV1,
  validateGraphDocumentV2,
  validateGraphDocumentV3,
  validateGraphSurfaceStateV1,
  validateGraphSurfaceStateV2,
  validateGraphSurfaceStateV3,
  validateGraphSurfaceStateV4,
  validateGraphSurfaceStateV5,
} from '../../lib/graphing/contracts/validation';
import type { GraphDocumentV3 } from '../../lib/graphing/contracts/types';
import {
  createDefaultGraphPaneViewState,
  type GraphWorkspaceSessionStateV4,
  type GraphWorkspaceSessionStateV5,
  type GraphWorkspaceSessionStateV6,
  type GraphWorkspaceSessionStateV1,
  type GraphWorkspaceSessionStateV2,
  type GraphWorkspaceSessionStateV3,
} from './graph-workspace-session';

export function migrateGraphWorkspaceSessionState(
  value: unknown,
): GraphWorkspaceSessionStateV6 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<GraphWorkspaceSessionStateV1 | GraphWorkspaceSessionStateV2
    | GraphWorkspaceSessionStateV3 | GraphWorkspaceSessionStateV4 | GraphWorkspaceSessionStateV5
    | GraphWorkspaceSessionStateV6>;
  const authoring = candidate.authoring;
  if (authoring !== undefined && !Array.isArray(authoring.piecewiseDrafts)) return null;
  if (candidate.version === 6) {
    const surface = validateGraphSurfaceStateV5(candidate.surface);
    const document = validateGraphDocumentV3(candidate.document);
    if (!surface.ok || !document.ok) return null;
    return {
      version: 6,
      document: document.validated.value,
      surface: surface.validated.value,
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version === 5) {
    const surface = validateGraphSurfaceStateV4(candidate.surface);
    const document = validateGraphDocumentV2(candidate.document);
    if (!surface.ok || !document.ok) return null;
    return {
      version: 6,
      document: { ...document.validated.value, version: 3 },
      surface: {
        ...surface.validated.value,
        version: 5,
        analyze: {
          ...surface.validated.value.analyze,
          pinnedAnnotations: surface.validated.value.analyze.pinnedAnnotations.map((pin) => ({
            ...pin, version: 2 as const,
          })),
        },
      },
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version === 4) {
    const surface = validateGraphSurfaceStateV3(candidate.surface);
    if (!surface.ok) return null;
    const document = validateGraphDocumentV2(candidate.document);
    if (!document.ok) return null;
    return {
      version: 6,
      document: { ...document.validated.value, version: 3 },
      surface: {
        ...surface.validated.value,
        version: 5,
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
      ...(authoring ? { authoring } : {}),
    };
  }
  if (candidate.version === 3) {
    const surface = validateGraphSurfaceStateV2(candidate.surface);
    const document = validateGraphDocumentV2(candidate.document);
    if (!surface.ok || !document.ok) return null;
    return {
      version: 6,
      document: { ...document.validated.value, version: 3 },
      surface: {
        ...surface.validated.value,
        version: 5,
        panes: { real: createDefaultGraphPaneViewState(), complex: createDefaultGraphPaneViewState() },
        analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      },
      ...(authoring ? { authoring } : {}),
    };
  }
  const legacySurface = validateGraphSurfaceStateV1(candidate.surface);
  if (!legacySurface.ok) return null;
  let migrated: GraphDocumentV3;
  if (candidate.version === 2) {
    const document = validateGraphDocumentV2(candidate.document);
    if (!document.ok) return null;
    migrated = { ...document.validated.value, version: 3 };
  } else if (candidate.version === 1) {
    const document = validateGraphDocumentV1(candidate.document);
    if (!document.ok) return null;
    migrated = {
      version: 3,
      documentId: document.validated.value.documentId,
      title: document.validated.value.title,
      contentRevision: document.validated.value.documentRevision,
      mathematicsRevision: document.validated.value.documentRevision,
      items: document.validated.value.items,
    };
  } else return null;
  return {
    version: 6,
    document: migrated,
    surface: {
      ...legacySurface.validated.value,
      version: 5,
      appearance: { theme: 'technical', colorVisionMode: 'standard' },
      panes: { real: createDefaultGraphPaneViewState(), complex: createDefaultGraphPaneViewState() },
      analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
    },
    ...(authoring ? { authoring } : {}),
  };
}

export function isGraphWorkspaceSessionState(
  value: unknown,
): value is GraphWorkspaceSessionStateV6 {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && (value as { version?: unknown }).version === 6
    && migrateGraphWorkspaceSessionState(value));
}
