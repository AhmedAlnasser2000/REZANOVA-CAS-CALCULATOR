import type {
  CanonicalResultDocumentV1,
  CanonicalResultOmissionReason,
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from './projection';
import {
  validateCanonicalResultDocument,
  type CanonicalResultValidationFailure,
} from './validation';

export type CanonicalResultStorageResolution =
  | { ok: true; document: CanonicalResultDocumentV1; source: 'native' | 'compatibility' }
  | {
      ok: false;
      omissionReason: CanonicalResultOmissionReason;
      message: string;
    };

function isOverSizeFailure(failure: CanonicalResultValidationFailure | undefined) {
  if (!failure) return false;
  if (failure.reason === 'node-limit' || failure.reason === 'depth-limit' || failure.reason === 'byte-limit') {
    return true;
  }
  const mathFailure = failure.mathJsonFailure;
  return mathFailure?.reason === 'node-limit'
    || mathFailure?.reason === 'depth-limit'
    || mathFailure?.reason === 'byte-limit';
}

function invalidResolution(
  message: string,
  validationFailure?: CanonicalResultValidationFailure,
): CanonicalResultStorageResolution {
  return {
    ok: false,
    omissionReason: isOverSizeFailure(validationFailure) ? 'over-size' : 'invalid',
    message,
  };
}

function canonicalAuthorityEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => canonicalAuthorityEqual(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).filter((key) =>
    key !== 'mathJson' || key in rightRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index]
      && canonicalAuthorityEqual(leftRecord[key], rightRecord[key]));
}

export function resolveCanonicalResultForStorage(
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
  options: { tableResponse?: TableResponse } = {},
): CanonicalResultStorageResolution {
  try {
    const compatibility = projectDisplayOutcomeToCanonicalResult(outcome, options);
    if (outcome.canonicalResult === undefined) {
      return compatibility.ok
        ? { ok: true, document: compatibility.document, source: 'compatibility' }
        : invalidResolution(
            compatibility.failure.message,
            compatibility.failure.validationFailure,
          );
    }

    const nativeValidation = validateCanonicalResultDocument(outcome.canonicalResult);
    if (!nativeValidation.ok) {
      return invalidResolution(nativeValidation.failure.message, nativeValidation.failure);
    }
    if (!compatibility.ok) {
      return invalidResolution(
        compatibility.failure.message,
        compatibility.failure.validationFailure,
      );
    }
    if (!canonicalAuthorityEqual(nativeValidation.validated.value, compatibility.document)) {
      return invalidResolution(
        'Native canonical result does not match the typed compatibility projection.',
      );
    }
    return {
      ok: true,
      document: nativeValidation.validated.value,
      source: 'native',
    };
  } catch {
    return {
      ok: false,
      omissionReason: 'unavailable',
      message: 'Canonical result projection was unavailable.',
    };
  }
}
