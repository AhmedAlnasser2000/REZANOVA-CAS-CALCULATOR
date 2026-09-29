import { DEFAULT_INTEGRATION_LIMITS, validIntegrationLimits, type IntegrationDraft } from '../../lib/calculus/new-integration/types';
export const INTEGRATION_DRAFT_KEY = 'rezanova.new-integration.drafts.v1';
export type SavedIntegrationDraft = {title: string; draft: IntegrationDraft};
export function readIntegrationDraft(v: unknown): IntegrationDraft {
  if (v && typeof v === 'object') {
    const a = v as Record<string, unknown>;
    if (typeof a.source === 'string' && validIntegrationLimits(a.limits)) return {source: a.source, limits: {...a.limits}};
  }
  return {source: '', limits: {...DEFAULT_INTEGRATION_LIMITS}};
}
export function loadIntegrationDrafts(storage: Pick<Storage, 'getItem'>): SavedIntegrationDraft[] {
  try {
    const text = storage.getItem(INTEGRATION_DRAFT_KEY); if (!text || text.length > 4 * 1024 * 1024) return [];
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw) || raw.length > 64) return [];
    return raw.flatMap(item => item && typeof item === 'object' && typeof item.title === 'string' && item.title.length <= 120
      && item.draft && typeof item.draft.source === 'string' && validIntegrationLimits(item.draft.limits)
      ? [{title: item.title, draft: readIntegrationDraft(item.draft)}] : []);
  } catch {return [];}
}
export function saveIntegrationDrafts(storage: Pick<Storage, 'setItem'>, drafts: SavedIntegrationDraft[]) {
  const text = JSON.stringify(drafts);
  if (drafts.length > 64 || text.length > 4 * 1024 * 1024) throw Error('Open drafts exceed the local restore size limit. Export important derivations before closing.');
  storage.setItem(INTEGRATION_DRAFT_KEY, text);
}
