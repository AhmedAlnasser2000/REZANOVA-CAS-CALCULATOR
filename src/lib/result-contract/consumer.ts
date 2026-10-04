import type {
  CanonicalRuntimeOutcome,
} from '../../types/calculator';
import {
  normalizeCanonicalResultDocument,
  type NormalizedCanonicalResult,
} from './normalized-result';
import { validateCanonicalResultDocumentVersioned } from './validation-router';

export type {
  CanonicalResultPresentation,
  CanonicalResultPresentationDetailPart,
  CanonicalResultSemantics,
} from './normalized-result';

export type CanonicalResultConsumerFailure = {
  reason: 'prompt-outcome' | 'missing-document' | 'invalid-document' | 'unsupported-semantics';
  message: string;
};

export type CanonicalResultConsumerResolution =
  | {
      ok: true;
      source: 'native';
      sourceVersion: 1 | 2 | 3 | 4;
      rawDocument: NormalizedCanonicalResult['rawDocument'];
      presentation: NormalizedCanonicalResult['presentation'];
      semantics: NormalizedCanonicalResult['semantics'];
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

  const validation = validateCanonicalResultDocumentVersioned(outcome.canonicalResult);
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
  if (validation.validated.value.version === 5) return {ok: false, failure: {reason: 'unsupported-semantics', message: 'Use the rational-antiderivative V5 read model; generic answer reuse is unsupported.'}};
  if (validation.validated.value.version === 6) return {ok: false, failure: {reason: 'unsupported-semantics', message: 'Use the Equation outcome V6 read model; generic answer reuse is unsupported.'}};
  const normalized = normalizeCanonicalResultDocument(validation.validated.value);
  return {
    ok: true,
    source: 'native',
    ...normalized,
  };
}
