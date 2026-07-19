import {
  validateGraphDocument,
  validateGraphSurfaceState,
} from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV1 } from './graph-workspace-session';

export const GRAPH_WORKSPACE_RUNTIME_MODULE_ID = 'graphing-runtime-v1' as const;

export type GraphWorkspaceSessionValidation =
  | { ok: true; value: GraphWorkspaceSessionStateV1 }
  | { ok: false; failure: string };

export function validateGraphWorkspaceSession(
  input: unknown,
): GraphWorkspaceSessionValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, failure: 'Graph workspace session must be an object.' };
  }
  const session = input as GraphWorkspaceSessionStateV1;
  if (session.version !== 1) {
    return { ok: false, failure: 'Unsupported Graph workspace session version.' };
  }
  const document = validateGraphDocument(session.document);
  if (!document.ok) {
    return { ok: false, failure: document.failure.message };
  }
  const surface = validateGraphSurfaceState(session.surface);
  if (!surface.ok) {
    return { ok: false, failure: surface.failure.message };
  }
  return {
    ok: true,
    value: {
      version: 1,
      document: document.validated.value,
      surface: surface.validated.value,
    },
  };
}
