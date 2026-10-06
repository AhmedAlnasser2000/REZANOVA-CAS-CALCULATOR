import type { CanonicalMathValue } from '../../../types/calculator/canonical-result-common';
import type { CanonicalResultDocument } from '../../../types/calculator/canonical-result-current';
import type { CurrentCanonicalRuntimeAction, CurrentResultProducerDraft } from '../../../types/calculator/canonical-result-runtime';
import type { ResultProducerDraft } from '../../../types/calculator';
import type { ProvenCanonicalMathValueV2 as ProvenCanonicalMathValue, ProvenStandardAnswerMathJson } from '../proven-answer-mathjson';
import { buildCanonicalResultDocument as buildDocument } from './index';
export { buildCanonicalResultDocument } from './index';

type ProducerOwnedMathShape<Value> =
  Value extends CanonicalMathValue
    ? Omit<Value, 'mathJson'> & { mathJson: ProvenStandardAnswerMathJson }
    : Value extends readonly (infer Entry)[]
      ? ProducerOwnedMathShape<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: ProducerOwnedMathShape<Value[Key]> }
        : Value;

export type CanonicalResultProducerInput = Omit<
  ProducerOwnedMathShape<CanonicalResultDocument>,
  'version'
>;

export type CanonicalRuntimeActionProducerInput =
  | {
      kind: 'send';
      target: 'calculate' | 'equation';
      math: ProvenCanonicalMathValue;
    }
  | {
      kind: 'load-core-draft';
      mode: 'geometry' | 'trigonometry' | 'statistics';
      math: ProvenCanonicalMathValue;
    };

type ResultProducerOutcomeDraft = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

export type CanonicalResultMathResolver = (
  canonicalLatex: string,
  path: string,
) => ProvenCanonicalMathValue;

export type CanonicalResultProducerDraftAdapter = {
  draft: ResultProducerOutcomeDraft;
  mathValue: CanonicalResultMathResolver;
  primary?: CanonicalResultProducerInput['primary'];
  request?: CanonicalResultProducerInput['request'];
  answerRows?: CanonicalResultProducerInput['answerRows'] | null;
  supplements?: CanonicalResultProducerInput['supplements'];
  details?: CanonicalResultProducerInput['details'];
  table?: CanonicalResultProducerInput['table'];
};

function detailParts(
  draft: ResultProducerOutcomeDraft,
  mathValue: CanonicalResultMathResolver,
  primary?: CanonicalResultProducerInput['primary'],
): CanonicalResultProducerInput['details'] {
  const mathPart = (latex: string, path: string) => primary?.kind === 'special-function-expression'
    && latex === draft.exactLatex
    ? { kind: 'special-function' as const, expression: primary.expression }
    : { kind: 'math' as const, math: mathValue(latex, path) };
  return draft.detailSections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) {
        return parts.map((part, partIndex) => part.kind === 'math'
          ? mathPart(
                part.latex,
                `details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math`,
              )
          : { kind: 'text' as const, text: part.text });
      }
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (lineKind === 'math') {
        return [mathPart(line, `details[${sectionIndex}].lines[${lineIndex}][0].math`)];
      }
      if (lineKind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(
        `Canonical producer detail ${sectionIndex}:${lineIndex} has no typed intent.`,
      );
    }),
  }));
}

function summaryParts(
  draft: ResultProducerOutcomeDraft,
  mathValue: CanonicalResultMathResolver,
): CanonicalResultProducerInput['summaries'] {
  const solve = draft.solveSummaryParts?.map((line, lineIndex) => line.map(
    (part, partIndex) => part.kind === 'math'
      ? {
          kind: 'math' as const,
          math: mathValue(
            part.latex,
            `summaries.solve[${lineIndex}][${partIndex}].math`,
          ),
        }
      : { kind: 'text' as const, text: part.text },
  ));
  const transform = draft.transformSummaryText || draft.transformSummaryLatex
    ? {
        ...(draft.transformSummaryText ? { text: draft.transformSummaryText } : {}),
        ...(draft.transformSummaryLatex
          ? {
              math: mathValue(
                draft.transformSummaryLatex,
                'summaries.transform.math',
              ),
            }
          : {}),
      }
    : undefined;
  return solve || transform
    ? {
        ...(solve ? { solve } : {}),
        ...(transform ? { transform } : {}),
      }
    : undefined;
}

function metadata(
  draft: ResultProducerOutcomeDraft,
  request: CanonicalResultProducerInput['request'] | undefined,
  mathValue: CanonicalResultMathResolver,
): CanonicalResultProducerInput['metadata'] {
  const success = draft.kind === 'success' ? draft : undefined;
  const value: NonNullable<CanonicalResultProducerInput['metadata']> = {
    ...(draft.answerMode ? { answerMode: draft.answerMode } : {}),
    ...(draft.answerDomain ? { answerDomain: draft.answerDomain } : {}),
    ...(draft.solutionKind ? { solutionKind: draft.solutionKind } : {}),
    ...(success?.resultOrigin ? { resultOrigin: success.resultOrigin } : {}),
    ...(success?.calculusStrategy ? { calculusStrategy: success.calculusStrategy } : {}),
    ...(success?.calculusDerivativeStrategies?.length
      ? { calculusDerivativeStrategies: [...success.calculusDerivativeStrategies] }
      : {}),
    ...(draft.plannerBadges?.length ? { plannerBadges: [...draft.plannerBadges] } : {}),
    ...(draft.solveBadges?.length ? { solveBadges: [...draft.solveBadges] } : {}),
    ...(draft.transformBadges?.length ? { transformBadges: [...draft.transformBadges] } : {}),
    ...(!request && draft.resolvedInputLatex
      ? {
          resolvedInput: mathValue(
            draft.resolvedInputLatex,
            'metadata.resolvedInput',
          ),
        }
      : {}),
    ...(success?.candidateValues?.length ? { candidateValues: [...success.candidateValues] } : {}),
    ...(draft.rejectedCandidateCount !== undefined
      ? { rejectedCandidateCount: draft.rejectedCandidateCount }
      : {}),
    ...(draft.substitutionDiagnostics
      ? { substitutionDiagnostics: { ...draft.substitutionDiagnostics } }
      : {}),
    ...(draft.numericMethod ? { numericMethod: draft.numericMethod } : {}),
    ...(draft.sourceMode ? { sourceMode: draft.sourceMode } : {}),
    ...(success?.variableSubstitutions?.length
      ? {
          variableSubstitutions: success.variableSubstitutions.map((substitution, index) => ({
            name: substitution.name,
            value: mathValue(
              substitution.valueLatex,
              `metadata.variableSubstitutions[${index}].value`,
            ),
            numericValue: substitution.numericValue,
          })),
        }
      : {}),
  };
  return Object.keys(value).length > 0 ? value : undefined;
}

export function buildCanonicalResultFromDraft({
  draft,
  mathValue,
  primary,
  request,
  answerRows,
  supplements,
  details,
  table,
}: CanonicalResultProducerDraftAdapter): CanonicalResultDocument {
  const success = draft.kind === 'success' ? draft : undefined;
  const adaptedPrimary = primary ?? (draft.exactLatex
    ? { kind: 'math' as const, value: mathValue(draft.exactLatex, 'primary.value') }
    : undefined);
  const adaptedDetails = details ?? detailParts(draft, mathValue, adaptedPrimary);
  const summaries = summaryParts(draft, mathValue);
  const adaptedMetadata = metadata(draft, request, mathValue);
  const adaptedAnswerRows = answerRows === null
    ? undefined
    : answerRows ?? (success?.answerRows
      ? {
          ...(success.answerRows.label ? { label: success.answerRows.label } : {}),
          rows: success.answerRows.rows.map((row, index) => ({
            math: mathValue(row.latex, `answerRows.rows[${index}].math`),
            ...(row.label ? { label: row.label } : {}),
          })),
        }
      : undefined);

  return buildDocument({
    outcomeKind: draft.kind,
    title: draft.title,
    ...(draft.kind === 'error' ? { error: draft.error } : {}),
    ...(adaptedPrimary ? { primary: adaptedPrimary } : {}),
    ...(request ? { request } : {}),
    ...(adaptedAnswerRows ? { answerRows: adaptedAnswerRows } : {}),
    ...(draft.branchReadback
      ? {
          branchReadback: {
            target: mathValue(draft.branchReadback.targetLatex, 'branchReadback.target'),
            relation: draft.branchReadback.relationLatex,
            branches: draft.branchReadback.branchesLatex.map((branch, index) =>
              mathValue(branch, `branchReadback.branches[${index}]`)),
            ...(draft.branchReadback.countLabel
              ? { countLabel: draft.branchReadback.countLabel }
              : {}),
            ...(draft.branchReadback.label ? { label: draft.branchReadback.label } : {}),
            ...(draft.branchReadback.source ? { source: draft.branchReadback.source } : {}),
          },
        }
      : {}),
    ...(success?.systemReadback
      ? {
          systemReadback: {
            variables: success.systemReadback.variablesLatex.map((value, index) =>
              mathValue(value, `systemReadback.variables[${index}]`)),
            rows: success.systemReadback.rows.map((row, rowIndex) => ({
              values: row.valuesLatex.map((value, valueIndex) => mathValue(
                value,
                `systemReadback.rows[${rowIndex}].values[${valueIndex}]`,
              )),
              ...(row.approxText ? { approxText: row.approxText } : {}),
            })),
            ...(success.systemReadback.label ? { label: success.systemReadback.label } : {}),
            ...(success.systemReadback.source ? { source: success.systemReadback.source } : {}),
          },
        }
      : {}),
    ...(draft.periodicFamily
      ? {
          periodicFamily: {
            carrier: mathValue(draft.periodicFamily.carrierLatex, 'periodicFamily.carrier'),
            parameter: mathValue(draft.periodicFamily.parameterLatex, 'periodicFamily.parameter'),
            ...(draft.periodicFamily.parameterConstraintLatex?.length
              ? {
                  parameterConstraints: draft.periodicFamily.parameterConstraintLatex.map(
                    (value, index) => mathValue(
                      value,
                      `periodicFamily.parameterConstraints[${index}]`,
                    ),
                  ),
                }
              : {}),
            branches: draft.periodicFamily.branchesLatex.map((value, index) =>
              mathValue(value, `periodicFamily.branches[${index}]`)),
            ...(draft.periodicFamily.discoveredFamilies?.length
              ? {
                  discoveredFamilies: draft.periodicFamily.discoveredFamilies.map(
                    (value, index) => mathValue(
                      value,
                      `periodicFamily.discoveredFamilies[${index}]`,
                    ),
                  ),
                }
              : {}),
            ...(draft.periodicFamily.representatives?.length
              ? {
                  representatives: draft.periodicFamily.representatives.map(
                    (representative, index) => ({
                      label: representative.label,
                      ...(representative.exactLatex
                        ? {
                            exact: mathValue(
                              representative.exactLatex,
                              `periodicFamily.representatives[${index}].exact`,
                            ),
                          }
                        : {}),
                      ...(representative.approxText
                        ? { approxText: representative.approxText }
                        : {}),
                    }),
                  ),
                }
              : {}),
            ...(draft.periodicFamily.suggestedIntervals?.length
              ? {
                  suggestedIntervals: draft.periodicFamily.suggestedIntervals.map(
                    (interval, index) => ({
                      label: interval.label,
                      start: mathValue(
                        interval.start,
                        `periodicFamily.suggestedIntervals[${index}].start`,
                      ),
                      end: mathValue(
                        interval.end,
                        `periodicFamily.suggestedIntervals[${index}].end`,
                      ),
                    }),
                  ),
                }
              : {}),
            ...(draft.periodicFamily.piecewiseBranches?.length
              ? {
                  piecewiseBranches: draft.periodicFamily.piecewiseBranches.map(
                    (branch, index) => ({
                      condition: mathValue(
                        branch.conditionLatex,
                        `periodicFamily.piecewiseBranches[${index}].condition`,
                      ),
                      result: mathValue(
                        branch.resultLatex,
                        `periodicFamily.piecewiseBranches[${index}].result`,
                      ),
                    }),
                  ),
                }
              : {}),
            ...(draft.periodicFamily.principalRangeLatex
              ? {
                  principalRange: mathValue(
                    draft.periodicFamily.principalRangeLatex,
                    'periodicFamily.principalRange',
                  ),
                }
              : {}),
            ...(draft.periodicFamily.reducedCarrierLatex
              ? {
                  reducedCarrier: mathValue(
                    draft.periodicFamily.reducedCarrierLatex,
                    'periodicFamily.reducedCarrier',
                  ),
                }
              : {}),
            ...(draft.periodicFamily.structuredStopReason
              ? { structuredStopReason: draft.periodicFamily.structuredStopReason }
              : {}),
          },
        }
      : {}),
    ...(supplements
      ? { supplements }
      : draft.exactSupplementLatex?.length
        ? {
            supplements: draft.exactSupplementLatex.map((value, index) => ({
              role: 'general' as const,
              presentationLatex: value,
              math: mathValue(value, `supplements[${index}].math`),
            })),
          }
        : {}),
    ...(draft.approxText ? { approximations: { primary: draft.approxText } } : {}),
    ...(adaptedDetails?.length ? { details: adaptedDetails } : {}),
    ...(summaries ? { summaries } : {}),
    warnings: [...draft.warnings],
    ...(adaptedMetadata ? { metadata: adaptedMetadata } : {}),
    ...(table ? { table } : {}),
  });
}

export function attachCurrentResultToDraft(
  document: CanonicalResultDocument,
  producerDraft: Omit<CurrentResultProducerDraft, 'canonicalResult'> | ResultProducerOutcomeDraft,
): CurrentResultProducerDraft {
  return {
    ...producerDraft,
    canonicalResult: document,
  } as CurrentResultProducerDraft;
}

export function buildCanonicalRuntimeAction(
  input: CanonicalRuntimeActionProducerInput,
): CurrentCanonicalRuntimeAction {
  buildDocument({
    outcomeKind: 'success', title: 'Runtime action',
    primary: { kind: 'math', value: input.math }, warnings: [],
  });
  return input.kind === 'send'
    ? { version: 7, kind: 'send', target: input.target, math: input.math }
    : { version: 7, kind: 'load-core-draft', mode: input.mode, math: input.math };
}
