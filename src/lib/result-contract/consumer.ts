import type {
  CanonicalResultDocumentV1,
  DisplayOutcome,
} from '../../types/calculator';
import {
  projectDisplayOutcomeToCanonicalResult,
  type CanonicalResultProjectionFailure,
} from './projection';
import { validateCanonicalResultDocument } from './validation';

export type CanonicalResultConsumerResolution =
  | {
      ok: true;
      source: 'native' | 'compatibility';
      document: CanonicalResultDocumentV1;
    }
  | {
      ok: false;
      failure: CanonicalResultProjectionFailure;
    };

export function resolveCanonicalResultForConsumer(
  outcome: DisplayOutcome,
): CanonicalResultConsumerResolution {
  if (outcome.kind === 'prompt') {
    return {
      ok: false,
      failure: {
        reason: 'prompt-outcome',
        message: 'Prompt outcomes are control flow, not canonical results.',
      },
    };
  }

  if (outcome.canonicalResult !== undefined) {
    const validation = validateCanonicalResultDocument(outcome.canonicalResult);
    if (!validation.ok) {
      return {
        ok: false,
        failure: {
          reason: 'invalid-document',
          message: validation.failure.message,
          validationFailure: validation.failure,
        },
      };
    }
    return {
      ok: true,
      source: 'native',
      document: validation.validated.value,
    };
  }

  const projected = projectDisplayOutcomeToCanonicalResult(outcome);
  return projected.ok
    ? { ok: true, source: 'compatibility', document: projected.document }
    : projected;
}
