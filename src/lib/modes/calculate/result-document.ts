import type { ResultProducerDraft, SolveDomainConstraint } from '../../../types/calculator';
import {
  attachCurrentResultToDraft, buildCanonicalResultFromDraft,
  type CanonicalResultMathResolver, type CanonicalResultProducerInput,
} from '../../result-contract/current/producer-draft';
import { printMathJson } from '../../display/printer';
import { constraintSupplementEvidence } from '../../algebra/constraint-evidence';
import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';

type Outcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

export function createCalculateResultOutcome(
  draft: Outcome,
  mathValue: CanonicalResultMathResolver,
  constraints: readonly SolveDomainConstraint[] = [],
  primary?: CanonicalResultProducerInput['primary'],
) {
  const constraintValues = constraintSupplementEvidence(constraints);
  const supplements = draft.exactSupplementLatex?.map((presentationLatex, index) => {
    const native = constraintValues.find(value => value.presentationLatex === presentationLatex);
    const printed = native ? printMathJson({ mathJson: native.mathJson, profile: 'pedagogical-v1', target: 'canonical-latex' }) : undefined;
    if (printed && !printed.ok) throw new Error('Unable to present native domain constraint.');
    return {
      role: native?.role ?? 'general' as const,
      presentationLatex,
      math: native ? requireProvenCanonicalMathValueV2({
        canonicalLatex: printed?.ok ? printed.canonicalLatex : '',
        mathJson: native.mathJson, owner: 'calculate', routeId: 'calculate.transforms', source: 'native-domain-constraints',
      }) : mathValue(presentationLatex, `supplements[${index}].math`),
    };
  });
  return attachCurrentResultToDraft(buildCanonicalResultFromDraft({ draft, mathValue, supplements, primary }), draft);
}

export function createCalculateErrorResultOutcome(draft: Extract<Outcome, { kind: 'error' }>, mathValue?: CanonicalResultMathResolver) {
  return createCalculateResultOutcome(draft, mathValue ?? ((_latex, path) => {
    throw new Error(`Calculate error requires native mathematical evidence at ${path}.`);
  }));
}
