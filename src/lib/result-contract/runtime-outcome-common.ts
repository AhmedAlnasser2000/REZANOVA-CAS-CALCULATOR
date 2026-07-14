import type { RuntimeAdvisories } from '../../types/calculator';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
} from './validation';

export const CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS = 64;
export const CANONICAL_RUNTIME_OUTCOME_MAX_NODES = CANONICAL_RESULT_MAX_NODES + 1_024;
export const CANONICAL_RUNTIME_OUTCOME_MAX_DEPTH = CANONICAL_RESULT_MAX_DEPTH + 1;
export const CANONICAL_RUNTIME_OUTCOME_MAX_BYTES = CANONICAL_RESULT_MAX_BYTES + 64_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function validateRuntimeAdvisories(value: unknown): value is RuntimeAdvisories {
  if (!isRecord(value) || !hasOnlyKeys(value, ['stopReason', 'equationNumericSolve'])) {
    return false;
  }
  if (value.stopReason !== undefined) {
    if (
      !isRecord(value.stopReason)
      || !hasOnlyKeys(value.stopReason, ['kind', 'source'])
      || !['invalid-request', 'planner-hard-stop', 'range-guard', 'unsupported-family']
        .includes(String(value.stopReason.kind))
      || !['planner', 'host', 'stage'].includes(String(value.stopReason.source))
    ) {
      return false;
    }
  }
  if (value.equationNumericSolve !== undefined) {
    const advisory = value.equationNumericSolve;
    if (!isRecord(advisory) || typeof advisory.kind !== 'string') return false;
    if (advisory.kind === 'blocked') {
      if (
        !hasOnlyKeys(advisory, ['kind', 'reason'])
        || !['range-guard', 'invalid-request'].includes(String(advisory.reason))
      ) {
        return false;
      }
    } else if (
      !['manual-only', 'suggest-on-error'].includes(advisory.kind)
      || !hasOnlyKeys(advisory, ['kind'])
    ) {
      return false;
    }
  }
  return true;
}
