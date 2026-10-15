import type { ResultProducerDraft } from '../../types/calculator';

/**
 * The typed stop for code paths that used the old Equation engine, retired in EQUATION-RECONSTRUCTION-CLOSEOUT1
 * PR B. Only workspaces that are unavailable until they are rebuilt reach it; nothing of the old engine is copied.
 */
export const RETIRED_ENGINE_MESSAGE = 'Unavailable: this workspace is being rebuilt.';

export function retiredEngineStop(title: string): Extract<ResultProducerDraft, { kind: 'error' }> {
  return {
    kind: 'error',
    title,
    error: RETIRED_ENGINE_MESSAGE,
    warnings: [],
    runtimeAdvisories: { stopReason: { kind: 'unsupported-family', source: 'host' } },
  };
}
