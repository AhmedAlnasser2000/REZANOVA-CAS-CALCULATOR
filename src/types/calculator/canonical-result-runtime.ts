import type { CanonicalMathValue } from './canonical-result-common';
import type { CanonicalResultDocument } from './canonical-result-current';
import type { ResultProducerDraft } from './display-types';
import type { TransferTarget } from './execution-types';
import type { RuntimeAdvisories } from './runtime-policy-types';

export type CurrentCanonicalRuntimeAction =
  | { version: 7; kind: 'send'; target: TransferTarget; math: CanonicalMathValue }
  | { version: 7; kind: 'load-core-draft'; mode: 'geometry' | 'trigonometry' | 'statistics'; math: CanonicalMathValue };

type CurrentCanonicalRuntimeBase = {
  canonicalResult: CanonicalResultDocument;
  actions?: CurrentCanonicalRuntimeAction[];
  runtimeAdvisories?: RuntimeAdvisories;
};
export type CurrentCanonicalRuntimeResult = CurrentCanonicalRuntimeBase & ({ kind: 'success' } | { kind: 'error' });

/** Temporary draft coexistence; the wire payload carries only current canonical authority. */
export type CurrentResultProducerDraft =
  | (Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocument; actions?: CurrentCanonicalRuntimeAction[];
    })
  | (Omit<Extract<ResultProducerDraft, { kind: 'error' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocument; actions?: CurrentCanonicalRuntimeAction[];
    });
