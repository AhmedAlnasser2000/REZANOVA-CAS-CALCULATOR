import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV3,
  CanonicalRuntimeActionV3,
  ResultProducerDraft,
  ResultProducerDraftV3,
} from '../../types/calculator';
import type {
  ProvenCanonicalMathValueV2,
  ProvenStandardAnswerMathJson,
} from './proven-answer-mathjson';
import { validateCanonicalResultDocumentV3 } from './validation-v3';

type ProducerOwnedMathShapeV3<Value> =
  Value extends CanonicalMathValueV2
    ? Omit<Value, 'mathJson'> & { mathJson: ProvenStandardAnswerMathJson }
    : Value extends readonly (infer Entry)[]
      ? ProducerOwnedMathShapeV3<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: ProducerOwnedMathShapeV3<Value[Key]> }
        : Value;

export type CanonicalResultProducerInputV3 = Omit<
  ProducerOwnedMathShapeV3<CanonicalResultDocumentV3>,
  'version'
>;

export type CanonicalRuntimeActionProducerInputV3 =
  | {
      kind: 'send';
      target: 'calculate' | 'equation';
      math: ProvenCanonicalMathValueV2;
    }
  | {
      kind: 'load-core-draft';
      mode: 'geometry' | 'trigonometry' | 'statistics';
      math: ProvenCanonicalMathValueV2;
    };

type ResultProducerOutcomeDraft = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
type ResultProducerOutcomeWithoutLegacyActions = Omit<ResultProducerOutcomeDraft, 'actions'> & {
  actions?: CanonicalRuntimeActionV3[];
};

export function buildCanonicalResultDocumentV3(
  input: CanonicalResultProducerInputV3,
): CanonicalResultDocumentV3 {
  const candidate = { ...input, version: 3 };
  const validation = validateCanonicalResultDocumentV3(candidate);
  if (!validation.ok) {
    throw new Error(
      'Invalid producer canonical result V3: '
        + validation.failure.reason
        + ': '
        + validation.failure.message,
    );
  }
  return validation.validated.value;
}

export function attachCanonicalResultV3ToProducerDraft(
  document: CanonicalResultDocumentV3,
  producerDraft:
    | Omit<ResultProducerDraftV3, 'canonicalResult'>
    | ResultProducerOutcomeWithoutLegacyActions,
): ResultProducerDraftV3 {
  return {
    ...producerDraft,
    canonicalResult: document,
  } as ResultProducerDraftV3;
}

export function buildCanonicalRuntimeActionV3(
  input: CanonicalRuntimeActionProducerInputV3,
): CanonicalRuntimeActionV3 {
  const validation = validateCanonicalResultDocumentV3({
    version: 3,
    outcomeKind: 'success',
    title: 'Runtime action',
    primary: { kind: 'math', value: input.math },
    warnings: [],
  });
  if (!validation.ok) {
    throw new Error(
      'Invalid producer canonical runtime action V3: '
        + validation.failure.reason
        + ': '
        + validation.failure.message,
    );
  }
  return input.kind === 'send'
    ? { version: 3, kind: 'send', target: input.target, math: input.math }
    : { version: 3, kind: 'load-core-draft', mode: input.mode, math: input.math };
}
