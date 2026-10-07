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
