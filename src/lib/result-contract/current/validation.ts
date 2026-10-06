import { z } from 'zod';
import type { CanonicalAnswerDocument, CanonicalResultDocument, CanonicalResultPrimary } from '../../../types/calculator/canonical-result-current';
import { inspectJsonCompatibleStructuredValue } from '../structured-value';
import { CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_DEPTH, CANONICAL_RESULT_MAX_NODES,
  type CanonicalResultValidationFailure, type CanonicalResultValidationLimits } from '../limits';
import { canonicalResultEnvelopeSchema, canonicalMathSchema, ordinaryPrimarySchema } from './common-schema';
import { collectMathValues, InvalidResult, keys, record, symbol } from './math';
import { checkEquationPrimary, InvalidEquationPrimary } from './equation-schema';
import { checkIntegrationPrimary, checkIntegrationRestrictions } from './integration-schema';
import { checkSpecialExpression } from './special-schema';

export type CanonicalResultValidationResult =
  | { ok: true; validated: { value: CanonicalResultDocument; nodeCount: number; depth: number;
      byteLength: number; mathValueCount: number } }
  | { ok: false; failure: CanonicalResultValidationFailure };

const angleSchema = z.object({
  kind: z.literal('angle-quantity'), magnitude: canonicalMathSchema, unit: z.enum(['deg', 'rad', 'grad']),
  presentation: z.object({ primaryLatex: z.string().min(1), answerRows: z.object({
    label: z.string().optional(), rows: z.array(z.object({ latex: z.string().min(1), label: z.string().optional() }).strict()),
  }).strict().optional() }).strict(),
}).strict();

function primary(value: unknown, outcomeKind: unknown): void {
  if (value === undefined) return;
  if (!record(value)) throw new InvalidResult('Answer must have a semantic kind.', '$.primary');
  switch (value.kind) {
    case 'equation-outcome': return checkEquationPrimary(value, outcomeKind, () => {});
    case 'rational-antiderivative': case 'exponential-antiderivative': case 'non-elementary':
      return checkIntegrationPrimary(value, outcomeKind);
    case 'special-function-expression':
      if (!keys(value, ['kind', 'expression'])) throw new InvalidResult('Invalid special expression keys.', '$.primary');
      return checkSpecialExpression(value.expression, '$.primary.expression');
    default: {
      const checked = (value.kind === 'angle-quantity' ? angleSchema : ordinaryPrimarySchema).safeParse(value);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        throw new InvalidResult(issue?.message ?? 'Unknown answer kind.', `$.primary.${issue?.path.join('.') ?? ''}`);
      }
    }
  }
}

/** A current document is validated directly; no historical version or projection is involved. */
export function validateCanonicalResultDocument(input: unknown, limits: CanonicalResultValidationLimits = {}): CanonicalResultValidationResult {
  const bound = (n: number | undefined, fallback: number) => n === undefined ? fallback : n;
  const maxNodes = bound(limits.maxNodes, CANONICAL_RESULT_MAX_NODES), maxDepth = bound(limits.maxDepth, CANONICAL_RESULT_MAX_DEPTH);
  const maxBytes = bound(limits.maxBytes, CANONICAL_RESULT_MAX_BYTES);
  if (![maxNodes, maxDepth, maxBytes].every(n => Number.isSafeInteger(n) && n > 0)) {
    return { ok: false, failure: { reason: 'invalid-shape', message: 'Result limits must be positive finite integers.' } };
  }
  const inspection = inspectJsonCompatibleStructuredValue(input, { label: 'Canonical result', maxNodes, maxDepth, maxBytes });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };
  const clone: unknown = JSON.parse(inspection.serialized);
  if (!record(clone) || clone.version !== 7) return { ok: false, failure: {
    reason: 'unsupported-version', message: 'This result format is unsupported; schema 7 is required.', path: '$.version',
  } };
  const shape = canonicalResultEnvelopeSchema.safeParse(clone);
  if (!shape.success) {
    const issue = shape.error.issues[0];
    return { ok: false, failure: { reason: 'invalid-shape', message: issue?.message ?? 'Invalid result envelope.', path: `$.${issue?.path.join('.') ?? ''}` } };
  }
  try {
    primary(clone.primary, clone.outcomeKind);
    const restrictions = clone.integrationRestrictions;
    if (restrictions !== undefined) {
      if (!record(restrictions) || !keys(restrictions, ['variable', 'entries']) || !symbol(restrictions.variable)) {
        throw new InvalidResult('Invalid integration restriction scope.', '$.integrationRestrictions');
      }
      if (record(clone.primary) && ['rational-antiderivative', 'exponential-antiderivative', 'non-elementary'].includes(String(clone.primary.kind))
        && clone.primary.variable !== restrictions.variable) throw new InvalidResult('Restriction variable differs from the answer.', '$.integrationRestrictions.variable');
      checkIntegrationRestrictions(restrictions.entries, restrictions.variable, [restrictions.variable], '$.integrationRestrictions.entries');
    }
    const math = collectMathValues(clone);
    return { ok: true, validated: { value: clone as unknown as CanonicalResultDocument,
      nodeCount: inspection.nodeCount, depth: inspection.depth, byteLength: inspection.byteLength, mathValueCount: math.length } };
  } catch (error) {
    if (error instanceof InvalidResult) return { ok: false, failure: error.failure };
    if (error instanceof InvalidEquationPrimary) return { ok: false, failure: { reason: 'invalid-shape', message: error.message, path: error.path } };
    throw error;
  }
}

export function validateCanonicalAnswer<K extends CanonicalResultPrimary['kind']>(input: unknown, kind: K, limits?: CanonicalResultValidationLimits):
  { ok: true; validated: Omit<Extract<CanonicalResultValidationResult, { ok: true }>['validated'], 'value'> & { value: CanonicalAnswerDocument<K> } }
  | { ok: false; failure: CanonicalResultValidationFailure } {
  const checked = validateCanonicalResultDocument(input, limits);
  if (!checked.ok) return checked;
  if (checked.validated.value.primary?.kind !== kind) return { ok: false, failure: {
    reason: 'invalid-shape', message: `Consumer requires answer kind ${kind}.`, path: '$.primary.kind',
  } };
  return { ok: true, validated: { ...checked.validated, value: checked.validated.value as CanonicalAnswerDocument<K> } };
}
