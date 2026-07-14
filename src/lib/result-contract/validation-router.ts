import type { CanonicalResultDocument } from '../../types/calculator';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
  validateCanonicalResultDocumentV1,
  type CanonicalResultValidationFailure,
  type CanonicalResultValidationLimits,
} from './validation';
import {
  validateCanonicalResultDocumentV2,
} from './validation-v2';

export type ValidatedCanonicalResultDocumentVersioned = {
  value: CanonicalResultDocument;
  nodeCount: number;
  depth: number;
  byteLength: number;
  mathValueCount: number;
};

export type CanonicalResultVersionedValidationResult =
  | { ok: true; validated: ValidatedCanonicalResultDocumentVersioned }
  | { ok: false; failure: CanonicalResultValidationFailure };

export function validateCanonicalResultDocumentVersioned(
  input: unknown,
  limits: CanonicalResultValidationLimits = {},
): CanonicalResultVersionedValidationResult {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Versioned canonical result',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES,
    maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const cloned = JSON.parse(inspection.serialized) as unknown;
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-root',
        message: 'Canonical result must be a versioned plain object.',
        path: '$',
      },
    };
  }
  const version = (cloned as Record<string, unknown>).version;
  if (version === 1) return validateCanonicalResultDocumentV1(cloned, limits);
  if (version === 2) return validateCanonicalResultDocumentV2(cloned, limits);
  return {
    ok: false,
    failure: {
      reason: 'unsupported-version',
      message: 'Unsupported active canonical result version: ' + String(version) + '.',
      path: '$.version',
    },
  };
}
