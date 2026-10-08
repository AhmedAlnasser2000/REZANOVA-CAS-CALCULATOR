import type { OutputStyle } from '../../types/calculator';
import type { CanonicalResultDocument } from '../../types/calculator/canonical-result-current';

/** New Equation (EQUATION-ADOPTION1): the request, response and draft shapes shared by the page and the worker. */
export interface EquationLimits { work: number; allocation: number }
export const DEFAULT_EQUATION_LIMITS: Readonly<EquationLimits> = Object.freeze({ work: 20_000_000_000, allocation: 1_000_000_000_000 });
/** All rows together, UTF-8. */
export const MAX_EQUATION_SOURCE_BYTES = 64 * 1024;
export type EquationDomain = 'real' | 'complex';
export const PRESENTATION_STYLES: readonly OutputStyle[] = ['exact', 'decimal', 'both'];

export interface EquationRequest {
  /** One relation per row (LaTeX from the editor); empty rows are ignored. */
  rows: string[];
  /** The unknowns, resolved by the page (automatic pick or the user's chips). */
  targets: string[];
  domain: EquationDomain;
  limits: EquationLimits;
  /** Decimal places for the Decimal and Both presentations. */
  digits: number;
}

export interface EquationPresentationRow { role: 'assumption' | 'solution' | 'case' | 'definition' | 'message'; depth: number; latex: string; text: string }
export interface EquationPresentationSnapshot {
  rows: EquationPresentationRow[];
  copyLatex: string;
  plainText: string;
  fallback: boolean;
}
export interface EquationShownCondition { latex: string; text: string }

export interface EquationResponse {
  request: EquationRequest;
  /** The typed Equation outcome, or an ordinary controlled error when the input could not be read or the run failed. */
  document: CanonicalResultDocument;
  /** Per row: what the row became, or why it could not be read (same length as `request.rows`). */
  rowNotes: EquationRowNote[];
  /** Presentations per answer style (current documents only). */
  presentations?: Partial<Record<OutputStyle, EquationPresentationSnapshot>>;
  /** Where the expressions are defined (x > 0 for ln x), as the engine applies it. */
  domainConditions: EquationShownCondition[];
  /** False when some case could not be decided against the assumptions and was kept as it is. */
  assumptionsComplete: boolean;
  elapsedMs: number;
  usage: { work: number; allocation: number };
}

/**
 * The decided answer before verification (NEW-EQUATION-RESPONSIVE1): presentation rows only, shown as "not checked
 * yet". It is never a canonical document; the document is built only once verification passes.
 */
export interface EquationPreview {
  request: EquationRequest;
  presentations: Partial<Record<OutputStyle, EquationPresentationSnapshot>>;
  rowNotes: EquationRowNote[];
  assumptionsComplete: boolean;
}

/** Worker messages: at most one preview, then the final response. */
export type EquationWorkerMessage = { phase: 'preview'; preview: EquationPreview } | { phase: 'final'; response: EquationResponse };

export type EquationRowNote =
  | { kind: 'empty' }
  | { kind: 'relation' }
  | { kind: 'assumption' }
  | { kind: 'error'; message: string };

export interface EquationDraft {
  rows: string[];
  /** Null: picked automatically from the rows. */
  targets: string[] | null;
  domain: EquationDomain;
  style: OutputStyle;
  limits: EquationLimits;
}

export function validEquationLimits(v: unknown): v is EquationLimits {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Object.keys(r).length === 2 && ['work', 'allocation'].every(k => typeof r[k] === 'number' && Number.isSafeInteger(r[k]) && (r[k] as number) >= 0);
}

const SYMBOL = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export function sourceBytes(rows: readonly string[]): number {
  return rows.reduce((n, r) => n + new TextEncoder().encode(r).length, 0);
}

export function validEquationRequest(v: unknown): v is EquationRequest {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Object.keys(r).length === 5 && Array.isArray(r.rows) && r.rows.every(x => typeof x === 'string') && r.rows.length > 0
    && r.rows.reduce<number>((n, x) => n + (x as string).length, 0) <= MAX_EQUATION_SOURCE_BYTES && sourceBytes(r.rows as string[]) <= MAX_EQUATION_SOURCE_BYTES
    && Array.isArray(r.targets) && r.targets.every(t => typeof t === 'string' && SYMBOL.test(t)) && new Set(r.targets).size === r.targets.length
    && (r.domain === 'real' || r.domain === 'complex') && validEquationLimits(r.limits)
    && typeof r.digits === 'number' && Number.isSafeInteger(r.digits) && r.digits >= 1 && r.digits <= 50;
}
