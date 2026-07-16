import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  type CanonicalResultProducerInputV2,
  type CanonicalResultV2MathResolver,
} from '../../result-contract';
import type {
  CalculusIndefiniteIntegralAuthority,
  CalculusCoreEvaluation,
} from '../engine/shared';

type Outcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

function textOnlyDetails(
  sections: CalculusCoreEvaluation['detailSections'],
): NonNullable<CanonicalResultProducerInputV2['details']> {
  return (sections ?? []).flatMap((section) => {
    const lines = section.lines.flatMap((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.some((part) => part.kind === 'math')) return [];
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (!parts && lineKind === 'math') return [];
      return [[{ kind: 'text' as const, text: parts?.map((part) =>
        part.kind === 'text' ? part.text : '').join('') || line }]];
    });
    return lines.length > 0 ? [{ title: section.title, lines }] : [];
  });
}

function typedDetails(
  nodes: CalculusCoreEvaluation['integrationDetailNodes'],
  mathValue: CanonicalResultV2MathResolver,
): NonNullable<CanonicalResultProducerInputV2['details']> {
  return (nodes ?? []).map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => line.map((part, partIndex) =>
      part.kind === 'text'
        ? { kind: 'text' as const, text: part.text }
        : {
            kind: 'math' as const,
            math: mathValue(
              part.canonicalLatex,
              `details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math`,
            ),
          })),
  }));
}

function supplements(
  nodes: CalculusCoreEvaluation['integrationFactNodes'],
  mathValue: CanonicalResultV2MathResolver,
): NonNullable<CanonicalResultProducerInputV2['supplements']> {
  return (nodes ?? []).map((fact, index) => ({
    role: fact.role,
    presentationLatex: fact.presentationLatex,
    math: mathValue(fact.presentationLatex, `supplements[${index}].math`),
  }));
}

export function createCalculusIndefiniteIntegralOutcomeV2(input: {
  outcome: Outcome;
  evaluation: CalculusCoreEvaluation;
  authority: CalculusIndefiniteIntegralAuthority;
  mathValue: CanonicalResultV2MathResolver;
}): ResultProducerDraftV2 {
  const { outcome, evaluation, authority, mathValue } = input;
  if (outcome.kind === 'success' && !authority.primary) {
    throw new Error('Standard indefinite integration selected V2 without a native primary tree.');
  }
  const details = [
    ...textOnlyDetails(evaluation.detailSections),
    ...typedDetails(evaluation.integrationDetailNodes, mathValue),
  ];
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: outcome,
    mathValue,
    ...(authority.primary
      ? {
          primary: {
            kind: 'math' as const,
            value: mathValue(authority.primary.canonicalLatex, 'primary.value'),
          },
        }
      : {}),
    request: {
      kind: 'math',
      value: mathValue(authority.request.canonicalLatex, 'request.value'),
    },
    answerRows: authority.primary
      ? { rows: [{ math: mathValue(authority.primary.canonicalLatex, 'answerRows.rows[0].math') }] }
      : null,
    supplements: supplements(evaluation.integrationFactNodes, mathValue),
    details,
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, outcome);
}
