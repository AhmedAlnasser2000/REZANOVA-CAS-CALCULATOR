import type {
  CanonicalResultDocumentV1,
  ResultProducerDraft,
} from '../../types/calculator';
import { validateCanonicalResultDocument } from './validation';

export function requireCanonicalResultAuthority<
  Outcome extends Exclude<ResultProducerDraft, { kind: 'prompt' }>,
>(
  outcome: Outcome,
  owner: string,
): Outcome & { canonicalResult: CanonicalResultDocumentV1 };
export function requireCanonicalResultAuthority(
  outcome: Extract<ResultProducerDraft, { kind: 'prompt' }>,
  owner: string,
): Extract<ResultProducerDraft, { kind: 'prompt' }>;
export function requireCanonicalResultAuthority(
  outcome: ResultProducerDraft,
  owner: string,
): ResultProducerDraft;
export function requireCanonicalResultAuthority(
  outcome: ResultProducerDraft,
  owner: string,
): ResultProducerDraft {
  if (outcome.kind === 'prompt') return outcome;
  if (!outcome.canonicalResult) {
    throw new Error(`${owner} ${outcome.kind} is missing native canonical result authority.`);
  }
  const validation = validateCanonicalResultDocument(outcome.canonicalResult);
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
  } as ResultProducerDraft;
}
