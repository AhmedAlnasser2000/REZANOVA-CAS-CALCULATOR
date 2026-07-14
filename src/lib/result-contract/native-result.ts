import type {
  CanonicalResultDocument,
  CanonicalResultDocumentV1,
  CanonicalResultDocumentV2,
  CanonicalResultDocumentV3,
  ResultProducerDraft,
  ResultProducerDraftV2,
  ResultProducerDraftV3,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { validateCanonicalResultDocumentVersioned } from './validation-router';

export function requireCanonicalResultAuthority<
  Outcome extends Exclude<ResultProducerDraft, { kind: 'prompt' }>,
>(
  outcome: Outcome,
  owner: string,
): Outcome & { canonicalResult: CanonicalResultDocumentV1 };
export function requireCanonicalResultAuthority<
  Outcome extends ResultProducerDraftV2,
>(
  outcome: Outcome,
  owner: string,
): Outcome & { canonicalResult: CanonicalResultDocumentV2 };
export function requireCanonicalResultAuthority<
  Outcome extends ResultProducerDraftV3,
>(
  outcome: Outcome,
  owner: string,
): Outcome & { canonicalResult: CanonicalResultDocumentV3 };
export function requireCanonicalResultAuthority(
  outcome: Exclude<VersionedResultProducerDraft, { kind: 'prompt' }>,
  owner: string,
): Exclude<VersionedResultProducerDraft, { kind: 'prompt' }> & {
  canonicalResult: CanonicalResultDocument;
};
export function requireCanonicalResultAuthority(
  outcome: Extract<VersionedResultProducerDraft, { kind: 'prompt' }>,
  owner: string,
): Extract<VersionedResultProducerDraft, { kind: 'prompt' }>;
export function requireCanonicalResultAuthority(
  outcome: ResultProducerDraft,
  owner: string,
): ResultProducerDraft;
export function requireCanonicalResultAuthority(
  outcome: VersionedResultProducerDraft,
  owner: string,
): VersionedResultProducerDraft;
export function requireCanonicalResultAuthority(
  outcome: VersionedResultProducerDraft,
  owner: string,
): VersionedResultProducerDraft {
  if (outcome.kind === 'prompt') return outcome;
  if (!outcome.canonicalResult) {
    throw new Error(`${owner} ${outcome.kind} is missing native canonical result authority.`);
  }
  const validation = validateCanonicalResultDocumentVersioned(outcome.canonicalResult);
  if (!validation.ok) {
    throw new Error(
      `${owner} ${outcome.kind} has invalid canonical result authority: ${validation.failure.message}`,
    );
  }
  if (validation.validated.value.outcomeKind !== outcome.kind) {
    throw new Error(`${owner} canonical result kind does not match its producer draft.`);
  }
  return {
    ...outcome,
    canonicalResult: validation.validated.value,
  } as VersionedResultProducerDraft;
}
