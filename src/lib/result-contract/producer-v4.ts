import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV4,
} from '../../types/calculator';
import type { ProvenStandardAnswerMathJson } from './proven-answer-mathjson';
import { validateCanonicalResultDocumentV4 } from './validation-v4';

type ProducerOwnedMathShapeV4<Value> =
  Value extends CanonicalMathValueV2
    ? Omit<Value, 'mathJson'> & { mathJson: ProvenStandardAnswerMathJson }
    : Value extends readonly (infer Entry)[]
      ? ProducerOwnedMathShapeV4<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: ProducerOwnedMathShapeV4<Value[Key]> }
        : Value;

export type CanonicalResultProducerInputV4 = Omit<
  ProducerOwnedMathShapeV4<CanonicalResultDocumentV4>,
  'version'
>;

export function buildCanonicalResultDocumentV4(
  input: CanonicalResultProducerInputV4,
): CanonicalResultDocumentV4 {
  const candidate = { ...input, version: 4 };
  const validation = validateCanonicalResultDocumentV4(candidate);
  if (!validation.ok) {
    throw new Error(
      'Invalid producer canonical result V4: '
        + validation.failure.reason
        + ': '
        + validation.failure.message,
    );
  }
  return validation.validated.value;
}
