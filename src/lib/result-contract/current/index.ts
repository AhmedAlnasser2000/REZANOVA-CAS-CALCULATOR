import type { CanonicalResultDocument, CanonicalResultDraft, CanonicalResultPrimary } from '../../../types/calculator/canonical-result-current';
import type { CanonicalResultValidationFailure, CanonicalResultValidationLimits } from '../limits';
import { collectMathValues } from './math';
import { validateCanonicalAnswer, validateCanonicalResultDocument } from './validation';

export type { CanonicalResultDocument, CanonicalResultDraft, CanonicalResultPrimary };
export * from './validation';

export class CanonicalResultAuthorityError extends Error {
  readonly failure: CanonicalResultValidationFailure;
  constructor(failure: CanonicalResultValidationFailure) {
    super(`Canonical result rejected: ${failure.message}`);
    this.name = 'CanonicalResultAuthorityError';
    this.failure = failure;
  }
}

/** Validation cannot replace the workspace adapter's native mathematical proof. */
export function requireCanonicalResultAuthority(input: unknown, limits?: CanonicalResultValidationLimits): CanonicalResultDocument {
  const checked = validateCanonicalResultDocument(input, limits);
  if (!checked.ok) throw new CanonicalResultAuthorityError(checked.failure);
  return checked.validated.value;
}

export function buildCanonicalResultDocument<const D extends CanonicalResultDraft>(draft: D, limits?: CanonicalResultValidationLimits): CanonicalResultDocument & Pick<D, 'primary'> {
  return requireCanonicalResultAuthority({ ...draft, version: 7 }, limits) as CanonicalResultDocument & Pick<D, 'primary'>;
}

export function requireCanonicalAnswer<K extends CanonicalResultPrimary['kind']>(input: unknown, kind: K, limits?: CanonicalResultValidationLimits) {
  const checked = validateCanonicalAnswer(input, kind, limits);
  if (!checked.ok) throw new CanonicalResultAuthorityError(checked.failure);
  return checked.validated.value;
}

export function collectCanonicalResultMathValues(input: unknown, limits?: CanonicalResultValidationLimits) {
  return collectMathValues(requireCanonicalResultAuthority(input, limits));
}

export type CanonicalAnswerHandlers<T> = {
  [K in CanonicalResultPrimary['kind']]?: (answer: Extract<CanonicalResultPrimary, { kind: K }>, document: CanonicalResultDocument) => T;
} & {
  withoutPrimary?: (document: CanonicalResultDocument) => T;
};

/** No implicit flattening of a new answer kind into an ordinary mathematical value. */
export function resolveCanonicalResultForConsumer<T>(input: unknown, handlers: CanonicalAnswerHandlers<T>):
  { ok: true; value: T } | { ok: false; reason: 'unsupported-answer-kind'; kind: string } {
  const document = requireCanonicalResultAuthority(input);
  if (!document.primary) return handlers.withoutPrimary ? { ok: true, value: handlers.withoutPrimary(document) }
    : { ok: false, reason: 'unsupported-answer-kind', kind: 'without-primary' };
  const answer = document.primary;
  const handler = handlers[answer.kind] as ((a: CanonicalResultPrimary, d: CanonicalResultDocument) => T) | undefined;
  return handler ? { ok: true, value: handler(answer, document) }
    : { ok: false, reason: 'unsupported-answer-kind', kind: answer.kind };
}
