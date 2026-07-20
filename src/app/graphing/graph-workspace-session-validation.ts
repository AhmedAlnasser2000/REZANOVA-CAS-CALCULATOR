import {
  validateGraphDocument,
  validateGraphDocumentV1,
  validateGraphSurfaceState,
  validateGraphSurfaceStateV1,
} from '../../lib/graphing/contracts/validation';
import type { GraphDocumentV2 } from '../../lib/graphing/contracts/types';
import type {
  GraphWorkspaceSessionStateV1,
  GraphWorkspaceSessionStateV2,
  GraphWorkspaceSessionStateV3,
} from './graph-workspace-session';

export function migrateGraphWorkspaceSessionState(
  value: unknown,
): GraphWorkspaceSessionStateV3 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<GraphWorkspaceSessionStateV1 | GraphWorkspaceSessionStateV2 | GraphWorkspaceSessionStateV3>;
  const authoring = candidate.authoring;
  if (authoring !== undefined && !Array.isArray(authoring.piecewiseDrafts)) return null;
  if (candidate.version === 3) {
    const surface = validateGraphSurfaceState(candidate.surface);
    if (!surface.ok) return null;
    const document = validateGraphDocument(candidate.document);
    if (!document.ok) return null;
    return {
      version: 3,
      document: document.validated.value,
      surface: surface.validated.value,
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
    version: 3,
    document: migrated,
    surface: {
      ...legacySurface.validated.value,
      version: 2,
      appearance: { theme: 'technical', colorVisionMode: 'standard' },
    },
    ...(authoring ? { authoring } : {}),
  };
}

export function isGraphWorkspaceSessionState(
  value: unknown,
): value is GraphWorkspaceSessionStateV3 {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && (value as { version?: unknown }).version === 3
    && migrateGraphWorkspaceSessionState(value));
}
