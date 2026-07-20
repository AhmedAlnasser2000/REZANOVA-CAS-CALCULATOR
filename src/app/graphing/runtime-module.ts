import type { GraphWorkspaceSessionStateV5 } from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

export const GRAPH_WORKSPACE_RUNTIME_MODULE_ID = 'graphing-runtime-v1' as const;

export type GraphWorkspaceSessionValidation =
  | { ok: true; value: GraphWorkspaceSessionStateV5 }
  | { ok: false; failure: string };

export function validateGraphWorkspaceSession(
  input: unknown,
): GraphWorkspaceSessionValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, failure: 'Graph workspace session must be an object.' };
  }
  const session = migrateGraphWorkspaceSessionState(input);
  return session
    ? { ok: true, value: session }
    : { ok: false, failure: 'Unsupported or invalid Graph workspace session.' };
}
