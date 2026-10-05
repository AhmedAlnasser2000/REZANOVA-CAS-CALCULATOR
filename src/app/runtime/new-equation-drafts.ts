import type { OutputStyle } from '../../types/calculator';
import { DEFAULT_EQUATION_LIMITS, PRESENTATION_STYLES, validEquationLimits, type EquationDraft } from '../../lib/new-equation/types';

/** New Equation drafts, restored per tab: rows, unknowns, domain, answer style and limits. Answers are never stored. */
export const EQUATION_DRAFT_KEY = 'rezanova.new-equation.drafts.v1';
export const MAX_EQUATION_DRAFTS = 64;
export const MAX_EQUATION_DRAFT_BYTES = 4 * 1024 * 1024;
export type SavedEquationDraft = { title: string; draft: EquationDraft };
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export function blankEquationDraft(style: OutputStyle = 'exact'): EquationDraft {
  return { rows: ['', ''], targets: null, domain: 'real', style, limits: { ...DEFAULT_EQUATION_LIMITS } };
}

export function readEquationDraft(v: unknown, style: OutputStyle = 'exact'): EquationDraft {
  if (!v || typeof v !== 'object') return blankEquationDraft(style);
  const a = v as Record<string, unknown>;
  const rows = Array.isArray(a.rows) && a.rows.length > 0 && a.rows.every(r => typeof r === 'string') ? [...a.rows as string[]] : undefined;
  const targets = a.targets === null ? null : Array.isArray(a.targets) && a.targets.every(t => typeof t === 'string' && NAME.test(t)) ? [...new Set(a.targets as string[])] : undefined;
  if (!rows || targets === undefined || (a.domain !== 'real' && a.domain !== 'complex') || !PRESENTATION_STYLES.includes(a.style as OutputStyle) || !validEquationLimits(a.limits)) {
    return blankEquationDraft(style);
  }
  return { rows, targets, domain: a.domain, style: a.style as OutputStyle, limits: { ...a.limits } };
}

export function loadEquationDrafts(storage: Pick<Storage, 'getItem'>): SavedEquationDraft[] {
  try {
    const text = storage.getItem(EQUATION_DRAFT_KEY);
    if (!text || text.length > MAX_EQUATION_DRAFT_BYTES) return [];
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw) || raw.length > MAX_EQUATION_DRAFTS) return [];
    return raw.flatMap(item => (item && typeof item === 'object' && typeof item.title === 'string' && item.title.length <= 120 && item.draft && typeof item.draft === 'object'
      ? [{ title: item.title, draft: readEquationDraft(item.draft) }] : []));
  } catch {
    return [];
  }
}

export function saveEquationDrafts(storage: Pick<Storage, 'setItem'>, drafts: SavedEquationDraft[]) {
  const text = JSON.stringify(drafts);
  if (drafts.length > MAX_EQUATION_DRAFTS || text.length > MAX_EQUATION_DRAFT_BYTES) throw new Error('Open New Equation tabs exceed the local restore size limit; the newest changes are not saved.');
  storage.setItem(EQUATION_DRAFT_KEY, text);
}
