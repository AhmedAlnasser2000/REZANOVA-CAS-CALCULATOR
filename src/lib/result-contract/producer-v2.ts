import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV2,
  CanonicalRuntimeActionV2,
} from '../../types/calculator';
import type {
  ProvenCanonicalMathValueV2,
  ProvenStandardAnswerMathJson,
} from './proven-answer-mathjson';
import { validateCanonicalResultDocumentV2 } from './validation-v2';

type ProducerOwnedMathShapeV2<Value> =
  Value extends CanonicalMathValueV2
    ? Omit<Value, 'mathJson'> & { mathJson: ProvenStandardAnswerMathJson }
    : Value extends readonly (infer Entry)[]
      ? ProducerOwnedMathShapeV2<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: ProducerOwnedMathShapeV2<Value[Key]> }
        : Value;

export type CanonicalResultProducerInputV2 = Omit<
  ProducerOwnedMathShapeV2<CanonicalResultDocumentV2>,
  'version'
>;

export type CanonicalRuntimeActionProducerInputV2 =
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

export function buildCanonicalResultDocumentV2(
  input: CanonicalResultProducerInputV2,
): CanonicalResultDocumentV2 {
  const candidate = {
    ...input,
    version: 2,
  };
  const validation = validateCanonicalResultDocumentV2(candidate);
  if (!validation.ok) {
    throw new Error(
      'Invalid producer canonical result V2: '
        + validation.failure.reason
        + ': '
        + validation.failure.message,
    );
  }
  return validation.validated.value;
}

export function buildCanonicalRuntimeActionV2(
  input: CanonicalRuntimeActionProducerInputV2,
): CanonicalRuntimeActionV2 {
  const validation = validateCanonicalResultDocumentV2({
    version: 2,
    outcomeKind: 'success',
    title: 'Runtime action',
    primary: { kind: 'math', value: input.math },
    warnings: [],
  });
  if (!validation.ok) {
    throw new Error(
      'Invalid producer canonical runtime action V2: '
        + validation.failure.reason
        + ': '
        + validation.failure.message,
    );
  }
  return input.kind === 'send'
    ? { version: 2, kind: 'send', target: input.target, math: input.math }
    : { version: 2, kind: 'load-core-draft', mode: input.mode, math: input.math };
}
