import type {
  CanonicalRuntimeOutcome,
  CanonicalResultDocumentV1,
} from '../../types/calculator';
import { validateCanonicalResultDocument } from './validation';

export type CanonicalResultConsumerFailure = {
  reason: 'prompt-outcome' | 'missing-document' | 'invalid-document';
  message: string;
};

export type CanonicalResultConsumerResolution =
  | {
      ok: true;
      source: 'native';
      document: CanonicalResultDocumentV1;
    }
  | {
      ok: false;
      failure: CanonicalResultConsumerFailure;
    };

export function resolveCanonicalResultForConsumer(
  outcome: CanonicalRuntimeOutcome,
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

  if (!outcome.canonicalResult) {
    return {
      ok: false,
      failure: {
        reason: 'missing-document',
        message: 'Semantic result consumers require a native canonical result document.',
      },
    };
  }

  const validation = validateCanonicalResultDocument(outcome.canonicalResult);
  if (!validation.ok) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: validation.failure.message,
      },
    };
  }
  if (validation.validated.value.outcomeKind !== outcome.kind) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: 'Runtime kind must match the canonical result document outcome kind.',
      },
    };
  }
  return {
    ok: true,
    source: 'native',
    document: validation.validated.value,
  };
}
