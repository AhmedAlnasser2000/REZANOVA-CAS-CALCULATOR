import type { CanonicalResultDocument } from '../../../types/calculator/canonical-result-current';
export interface IntegrationLimits { work: number; allocation: number; integerBits: number; degree: number }
export const DEFAULT_INTEGRATION_LIMITS: Readonly<IntegrationLimits> = Object.freeze({work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256});
export const MAX_INTEGRATION_SOURCE_BYTES = 64 * 1024;
export const MAX_INTEGRATION_ARTIFACT_BYTES = 16 * 1024 * 1024;
export interface IntegrationRequest { source: string; limits: IntegrationLimits }
export type IntegrationJob = {request: IntegrationRequest; artifact?: string; action?: 'open' | 'verify'};
export interface IntegrationResponse {
  document: CanonicalResultDocument;
  request: IntegrationRequest;
  artifact?: string;
  exportUnavailable?: string;
  elapsedMs: number;
  usage: {work: number; allocation: number};
  checks: string[];
  timings?: Partial<Record<'construction' | 'candidate' | 'verification' | 'projection' | 'export', number>>;
  stop?: string;
  failedStage?: 'solve' | 'verify';
}
export interface IntegrationPreview {
  request: IntegrationRequest;
  presentation: {
    compact: string; full: string; copy: string; negative: boolean;
    generatorDefinition?: string; fallbackDefinition?: string; expansionUnavailable?: string;
    terms: {definition: string; modulus: string; argument: string}[];
    conditions: {latex: string; origins: string[]}[];
    originals: {latex: string; origins: string[]}[];
  };
  elapsedMs: number;
  usage: {work: number; allocation: number};
}
export type IntegrationWorkerRequest = {phase: 'solve'; id: string; job: IntegrationJob} | {phase: 'export'; id: string};
export type IntegrationWorkerMessage =
  | {phase: 'candidate'; id: string; preview: IntegrationPreview}
  | {phase: 'verified'; id: string; response: IntegrationResponse; exportPending: boolean}
  | {phase: 'export'; id: string; artifact?: string; exportUnavailable?: string; elapsedMs: number; usage: {work: number; allocation: number}}
  | {phase: 'failure'; id: string; response: IntegrationResponse};
export interface IntegrationJobCallbacks {
  candidate?: (preview: IntegrationPreview) => void;
  verified?: (response: IntegrationResponse) => void;
  exporting?: () => void;
}
export interface IntegrationDraft {source: string; limits: IntegrationLimits}
export function validIntegrationLimits(v: unknown): v is IntegrationLimits {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Object.keys(r).length === 4 && ['work', 'allocation', 'integerBits', 'degree'].every(k => typeof r[k] === 'number' && Number.isSafeInteger(r[k]) && (r[k] as number) >= (k === 'integerBits' ? 1 : 0));
}
export function boundedSource(source: unknown): source is string {
  return typeof source === 'string' && source.length <= MAX_INTEGRATION_SOURCE_BYTES && new TextEncoder().encode(source).length <= MAX_INTEGRATION_SOURCE_BYTES;
}
export function validIntegrationObservation(v: {elapsedMs: number; usage: {work: number; allocation: number}}): boolean {
  return !!v && Number.isFinite(v.elapsedMs) && v.elapsedMs >= 0 && !!v.usage
    && ['work','allocation'].every(k => {const n=v.usage[k as keyof typeof v.usage];return Number.isSafeInteger(n) && n >= 0;});
}
/** Worker previews are a flat presentation snapshot, never result authority. */
export function validIntegrationPreview(value: unknown, expected: IntegrationRequest): value is IntegrationPreview {
  if (!value || typeof value !== 'object') return false;
  const preview = value as IntegrationPreview, p = preview.presentation;
  const keys = (o: unknown, allowed: string[], required: string[] = allowed) => !!o && typeof o === 'object'
    && Object.keys(o).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(o, k));
  if (!keys(preview, ['request','presentation','elapsedMs','usage']) || !keys(preview.request,['source','limits'])
    || !keys(preview.usage,['work','allocation']) || !keys(p,
      ['compact','full','copy','negative','terms','conditions','originals','generatorDefinition','fallbackDefinition','expansionUnavailable'],
      ['compact','full','copy','negative','terms','conditions','originals'])) return false;
  if (!preview.request || preview.request.source !== expected.source || !validIntegrationLimits(preview.request.limits)
    || JSON.stringify(preview.request.limits) !== JSON.stringify(expected.limits) || !p
    || typeof p.negative !== 'boolean' || !Number.isFinite(preview.elapsedMs) || preview.elapsedMs < 0
    || !preview.usage || !Number.isSafeInteger(preview.usage.work) || !Number.isSafeInteger(preview.usage.allocation)
    || preview.usage.work < 0 || preview.usage.allocation < 0) return false;
  let chars = 0, nodes = 0;
  const text = (s: unknown) => {if (typeof s !== 'string') return false; chars += s.length; nodes++; return chars <= MAX_INTEGRATION_ARTIFACT_BYTES && nodes <= 100_000;};
  if (![p.compact, p.full, p.copy].every(text)) return false;
  for (const s of [p.generatorDefinition, p.fallbackDefinition, p.expansionUnavailable]) if (s !== undefined && !text(s)) return false;
  if (!Array.isArray(p.terms) || p.terms.length > 100_000 || !Array.isArray(p.conditions) || p.conditions.length > 100_000
    || !Array.isArray(p.originals) || p.originals.length > 100_000) return false;
  for (const t of p.terms) if (!keys(t,['definition','modulus','argument']) || ![t.definition, t.modulus, t.argument].every(text)) return false;
  for (const c of [...p.conditions, ...p.originals]) {
    if (!keys(c,['latex','origins']) || !text(c.latex) || !Array.isArray(c.origins) || c.origins.length > 100_000) return false;
    for (const origin of c.origins) if (!text(origin)) return false;
  }
  // Only stringify after the bounded flat walk. Include UTF-8, not just UTF-16.
  const encoded = JSON.stringify(value);
  return encoded.length <= MAX_INTEGRATION_ARTIFACT_BYTES && new TextEncoder().encode(encoded).length <= MAX_INTEGRATION_ARTIFACT_BYTES;
}
