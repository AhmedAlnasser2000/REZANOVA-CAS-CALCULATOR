import type {
  CanonicalSpecialFunctionExpressionV4,
  ResultProducerDraft,
  ResultProducerDraftV2,
  ResultProducerDraftV4,
} from '../../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  buildCanonicalResultDocumentV4,
  type CanonicalResultProducerInputV2,
  type CanonicalResultProducerInputV4,
  type CanonicalResultV2MathResolver,
} from '../../result-contract';
import type {
  CalculusIndefiniteIntegralAuthority,
  CalculusCoreEvaluation,
} from '../engine/shared';

type Outcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
type SpecialExpressionProducerInput = NonNullable<
  CanonicalResultProducerInputV4['primary']
>['expression'];

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

function typedDetailsV4(
  nodes: CalculusCoreEvaluation['integrationDetailNodes'],
  mathValue: CanonicalResultV2MathResolver,
): NonNullable<CanonicalResultProducerInputV4['details']> {
  return typedDetails(nodes, mathValue);
}

function supplementsV4(
  nodes: CalculusCoreEvaluation['integrationFactNodes'],
  mathValue: CanonicalResultV2MathResolver,
): NonNullable<CanonicalResultProducerInputV4['supplements']> {
  return supplements(nodes, mathValue);
}

function provenSpecialExpression(
  expression: CanonicalSpecialFunctionExpressionV4,
  mathValue: CanonicalResultV2MathResolver,
  path: string,
): SpecialExpressionProducerInput {
  if (expression.kind === 'standard-math') {
    return {
      kind: 'standard-math',
      value: mathValue(expression.value.canonicalLatex, `${path}.value`),
    };
  }
  if (expression.kind === 'named-function') {
    return {
      kind: 'named-function',
      name: expression.name,
      arguments: expression.arguments.map((argument, index) =>
        provenSpecialExpression(argument, mathValue, `${path}.arguments[${index}]`)),
    };
  }
  if (expression.kind === 'sum') {
    return {
      kind: 'sum',
      terms: expression.terms.map((term, index) =>
        provenSpecialExpression(term, mathValue, `${path}.terms[${index}]`)),
    };
  }
  if (expression.kind === 'product') {
    return {
      kind: 'product',
      factors: expression.factors.map((factor, index) =>
        provenSpecialExpression(factor, mathValue, `${path}.factors[${index}]`)),
    };
  }
  if (expression.kind === 'quotient') {
    return {
      kind: 'quotient',
      numerator: provenSpecialExpression(expression.numerator, mathValue, `${path}.numerator`),
      denominator: provenSpecialExpression(expression.denominator, mathValue, `${path}.denominator`),
    };
  }
  if (expression.kind === 'power') {
    return {
      kind: 'power',
      base: provenSpecialExpression(expression.base, mathValue, `${path}.base`),
      exponent: provenSpecialExpression(expression.exponent, mathValue, `${path}.exponent`),
    };
  }
  if (expression.kind === 'negation') {
    return {
      kind: 'negation',
      operand: provenSpecialExpression(expression.operand, mathValue, `${path}.operand`),
    };
  }
  return {
    kind: 'piecewise',
    branches: expression.branches.map((branch, index) => ({
      value: provenSpecialExpression(branch.value, mathValue, `${path}.branches[${index}].value`),
      condition: mathValue(
        branch.condition.canonicalLatex,
        `${path}.branches[${index}].condition`,
      ),
    })),
    ...(expression.otherwise
      ? {
          otherwise: provenSpecialExpression(
            expression.otherwise,
            mathValue,
            `${path}.otherwise`,
          ),
        }
      : {}),
  };
}

function metadataV4(
  outcome: Outcome,
): CanonicalResultProducerInputV4['metadata'] {
  const success = outcome.kind === 'success' ? outcome : undefined;
  const metadata: NonNullable<CanonicalResultProducerInputV4['metadata']> = {
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

export function createCalculusIndefiniteIntegralOutcomeV4(input: {
  outcome: Outcome;
  evaluation: CalculusCoreEvaluation;
  authority: CalculusIndefiniteIntegralAuthority;
  mathValue: CanonicalResultV2MathResolver;
}): ResultProducerDraftV4 {
  const { outcome, evaluation, authority, mathValue } = input;
  if (outcome.kind !== 'success') {
    throw new Error('Special-function indefinite integration selected V4 for a non-success.');
  }
  if (!authority.specialExpression) {
    throw new Error('Special-function indefinite integration selected V4 without a typed expression.');
  }
  const metadata = metadataV4(outcome);
  const details = [
    ...textOnlyDetails(evaluation.detailSections),
    ...typedDetailsV4(evaluation.integrationDetailNodes, mathValue),
  ];
  const canonicalResult = buildCanonicalResultDocumentV4({
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
    request: {
      kind: 'math',
      value: mathValue(authority.request.canonicalLatex, 'request.value'),
    },
    supplements: supplementsV4(evaluation.integrationFactNodes, mathValue),
    details,
    warnings: outcome.warnings,
    ...(outcome.approxText ? { approximations: { primary: outcome.approxText } } : {}),
    ...(metadata ? { metadata } : {}),
  });
  const { actions: _actions, ...draftWithoutActions } = outcome;
  return {
    ...draftWithoutActions,
    canonicalResult,
  };
}
