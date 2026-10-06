import { provenSpecialExpression } from '../../result-contract/current/special-producer';
import type { CurrentResultProducerDraft } from '../../../types/calculator/canonical-result-runtime';
import type {
  ResultProducerDraft,
} from '../../../types/calculator';
import {
  attachCurrentResultToDraft,
  buildCanonicalResultFromDraft,
  buildCanonicalResultDocument,
  type CanonicalResultProducerInput,
  type CanonicalResultMathResolver,
} from '../../result-contract/current/producer-draft';
import type {
  CalculusIndefiniteIntegralAuthority,
  CalculusCoreEvaluation,
} from '../engine/shared';

type Outcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
function textOnlyDetails(
  sections: CalculusCoreEvaluation['detailSections'],
): NonNullable<CanonicalResultProducerInput['details']> {
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
  mathValue: CanonicalResultMathResolver,
): NonNullable<CanonicalResultProducerInput['details']> {
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
  mathValue: CanonicalResultMathResolver,
): NonNullable<CanonicalResultProducerInput['supplements']> {
  return (nodes ?? []).map((fact, index) => ({
    role: fact.role,
    presentationLatex: fact.presentationLatex,
    math: mathValue(fact.presentationLatex, `supplements[${index}].math`),
  }));
}

function metadata(
  outcome: Outcome,
): CanonicalResultProducerInput['metadata'] {
  const success = outcome.kind === 'success' ? outcome : undefined;
  const metadata: NonNullable<CanonicalResultProducerInput['metadata']> = {
    ...(outcome.answerMode ? { answerMode: outcome.answerMode } : {}),
    ...(outcome.answerDomain ? { answerDomain: outcome.answerDomain } : {}),
    ...(outcome.solutionKind ? { solutionKind: outcome.solutionKind } : {}),
    ...(success?.resultOrigin ? { resultOrigin: success.resultOrigin } : {}),
    ...(success?.calculusStrategy ? { calculusStrategy: success.calculusStrategy } : {}),
    ...(success?.calculusDerivativeStrategies?.length
      ? { calculusDerivativeStrategies: [...success.calculusDerivativeStrategies] }
      : {}),
    ...(outcome.plannerBadges?.length ? { plannerBadges: [...outcome.plannerBadges] } : {}),
    ...(outcome.solveBadges?.length ? { solveBadges: [...outcome.solveBadges] } : {}),
    ...(outcome.transformBadges?.length ? { transformBadges: [...outcome.transformBadges] } : {}),
    ...(success?.candidateValues?.length ? { candidateValues: [...success.candidateValues] } : {}),
    ...(outcome.rejectedCandidateCount !== undefined
      ? { rejectedCandidateCount: outcome.rejectedCandidateCount }
      : {}),
    ...(outcome.substitutionDiagnostics
      ? { substitutionDiagnostics: { ...outcome.substitutionDiagnostics } }
      : {}),
    ...(outcome.numericMethod ? { numericMethod: outcome.numericMethod } : {}),
    ...(outcome.sourceMode ? { sourceMode: outcome.sourceMode } : {}),
  };
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function createCalculusIndefiniteIntegralOutcome(input: {
  outcome: Outcome;
  evaluation: CalculusCoreEvaluation;
  authority: CalculusIndefiniteIntegralAuthority;
  mathValue: CanonicalResultMathResolver;
}): CurrentResultProducerDraft {
  const { outcome, evaluation, authority, mathValue } = input;
  if (outcome.kind === 'success' && !authority.primary) {
    throw new Error('Standard indefinite integration requires current authority without a native primary tree.');
  }
  const details = [
    ...textOnlyDetails(evaluation.detailSections),
    ...typedDetails(evaluation.integrationDetailNodes, mathValue),
  ];
  const canonicalResult = buildCanonicalResultFromDraft({
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
    ...(authority.request
      ? {
          request: {
            kind: 'math' as const,
            value: mathValue(authority.request.canonicalLatex, 'request.value'),
          },
        }
      : {}),
    answerRows: authority.primary
      ? { rows: [{ math: mathValue(authority.primary.canonicalLatex, 'answerRows.rows[0].math') }] }
      : null,
    supplements: supplements(evaluation.integrationFactNodes, mathValue),
    details,
  });
  return attachCurrentResultToDraft(canonicalResult, outcome);
}

export function createCalculusSpecialIntegralOutcome(input: {
  outcome: Outcome;
  evaluation: CalculusCoreEvaluation;
  authority: CalculusIndefiniteIntegralAuthority;
  mathValue: CanonicalResultMathResolver;
}): CurrentResultProducerDraft {
  const { outcome, evaluation, authority, mathValue } = input;
  if (outcome.kind !== 'success') {
    throw new Error('Special-function indefinite integration requires special-function authority for a non-success.');
  }
  if (!authority.specialExpression) {
    throw new Error('Special-function indefinite integration requires special-function authority without a typed expression.');
  }
  const adaptedMetadata = metadata(outcome);
  const details = [
    ...textOnlyDetails(evaluation.detailSections),
    ...typedDetails(evaluation.integrationDetailNodes, mathValue),
  ];
  const canonicalResult = buildCanonicalResultDocument({
    outcomeKind: outcome.kind,
    title: outcome.title,
    primary: {
      kind: 'special-function-expression',
      expression: provenSpecialExpression(
        authority.specialExpression,
        mathValue,
        'primary.expression',
      ),
    },
    ...(authority.request
      ? {
          request: {
            kind: 'math' as const,
            value: mathValue(authority.request.canonicalLatex, 'request.value'),
          },
        }
      : {}),
    supplements: supplements(evaluation.integrationFactNodes, mathValue),
    details,
    warnings: outcome.warnings,
    ...(outcome.approxText ? { approximations: { primary: outcome.approxText } } : {}),
    ...(adaptedMetadata ? { metadata: adaptedMetadata } : {}),
  });
  const { actions, ...draftWithoutActions } = outcome;
  void actions;
  return {
    ...draftWithoutActions,
    canonicalResult,
  };
}
