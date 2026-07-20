import {
  validateGraphDocument,
  validateGraphDocumentV1,
  validateGraphSurfaceState,
} from '../../lib/graphing/contracts/validation';
import type { GraphDocumentV2 } from '../../lib/graphing/contracts/types';
import type {
  GraphWorkspaceSessionStateV1,
  GraphWorkspaceSessionStateV2,
} from './graph-workspace-session';

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
