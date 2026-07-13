import type {
  CanonicalMathValueV1,
  CanonicalResultDetailPartV1,
  CanonicalResultDetailSectionV1,
  CanonicalResultDocumentV1,
  CanonicalResultPeriodicFamilyV1,
  CanonicalResultSemanticMetadataV1,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  PeriodicFamilyInfo,
  TableResponse,
} from '../../types/calculator';
import {
  validateCanonicalResultDocument,
  type CanonicalResultValidationFailure,
} from './validation';

export type CanonicalResultProjectionFailure = {
  reason:
    | 'prompt-outcome'
    | 'canonical-math-mismatch'
    | 'undeclared-detail'
    | 'undeclared-summary'
    | 'invalid-document';
  message: string;
  validationFailure?: CanonicalResultValidationFailure;
};

export type CanonicalResultProjectionResult =
  | { ok: true; document: CanonicalResultDocumentV1 }
  | { ok: false; failure: CanonicalResultProjectionFailure };

function projectionFailure(
  reason: CanonicalResultProjectionFailure['reason'],
  message: string,
  validationFailure?: CanonicalResultValidationFailure,
): CanonicalResultProjectionResult {
  return {
    ok: false,
    failure: {
      reason,
      message,
      ...(validationFailure ? { validationFailure } : {}),
    },
  };
}

function mathValue(canonicalLatex: string, mathJson?: unknown): CanonicalMathValueV1 {
  return {
    canonicalLatex,
    ...(mathJson !== undefined ? { mathJson: mathJson as CanonicalMathValueV1['mathJson'] } : {}),
  };
}

function projectDetailPart(part: DisplayDetailLinePart): CanonicalResultDetailPartV1 {
  return part.kind === 'math'
    ? { kind: 'math', math: mathValue(part.latex) }
    : { kind: 'text', text: part.text };
}

function projectDetailSections(
  sections: DisplayDetailSection[] | undefined,
): { ok: true; sections?: CanonicalResultDetailSectionV1[] } | {
  ok: false;
  failure: CanonicalResultProjectionFailure;
} {
  if (!sections?.length) return { ok: true };
  const projected: CanonicalResultDetailSectionV1[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const lines: CanonicalResultDetailPartV1[][] = [];
    for (const [lineIndex, line] of section.lines.entries()) {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) {
        lines.push(parts.map(projectDetailPart));
        continue;
      }
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (lineKind === 'math') {
        lines.push([{ kind: 'math', math: mathValue(line) }]);
      } else if (lineKind === 'text') {
        lines.push([{ kind: 'text', text: line }]);
      } else {
        return {
          ok: false,
          failure: {
            reason: 'undeclared-detail',
            message: `Detail section ${sectionIndex} line ${lineIndex} has no typed intent.`,
          },
        };
      }
    }
    projected.push({ title: section.title, lines });
  }
  return { ok: true, sections: projected };
}

function projectPeriodicFamily(
  family: PeriodicFamilyInfo | undefined,
): CanonicalResultPeriodicFamilyV1 | undefined {
  if (!family) return undefined;
  return {
    carrier: mathValue(family.carrierLatex),
    parameter: mathValue(family.parameterLatex),
    ...(family.parameterConstraintLatex?.length
      ? { parameterConstraints: family.parameterConstraintLatex.map((value) => mathValue(value)) }
      : {}),
    branches: family.branchesLatex.map((value) => mathValue(value)),
    ...(family.discoveredFamilies?.length
      ? { discoveredFamilies: family.discoveredFamilies.map((value) => mathValue(value)) }
      : {}),
    ...(family.representatives?.length
      ? {
          representatives: family.representatives.map((representative) => ({
            label: representative.label,
            ...(representative.exactLatex ? { exact: mathValue(representative.exactLatex) } : {}),
            ...(representative.approxText ? { approxText: representative.approxText } : {}),
          })),
        }
      : {}),
    ...(family.suggestedIntervals?.length
      ? {
          suggestedIntervals: family.suggestedIntervals.map((interval) => ({
            label: interval.label,
            start: mathValue(interval.start),
            end: mathValue(interval.end),
          })),
        }
      : {}),
    ...(family.piecewiseBranches?.length
      ? {
          piecewiseBranches: family.piecewiseBranches.map((branch) => ({
            condition: mathValue(branch.conditionLatex),
            result: mathValue(branch.resultLatex),
          })),
        }
      : {}),
    ...(family.principalRangeLatex ? { principalRange: mathValue(family.principalRangeLatex) } : {}),
    ...(family.reducedCarrierLatex ? { reducedCarrier: mathValue(family.reducedCarrierLatex) } : {}),
    ...(family.structuredStopReason ? { structuredStopReason: family.structuredStopReason } : {}),
  };
}

function projectMetadata(
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
): CanonicalResultSemanticMetadataV1 | undefined {
  const success = outcome.kind === 'success' ? outcome : undefined;
  const metadata: CanonicalResultSemanticMetadataV1 = {
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
    ...(outcome.resolvedInputLatex ? { resolvedInput: mathValue(outcome.resolvedInputLatex) } : {}),
    ...(success?.candidateValues?.length ? { candidateValues: [...success.candidateValues] } : {}),
    ...(outcome.rejectedCandidateCount !== undefined
      ? { rejectedCandidateCount: outcome.rejectedCandidateCount }
      : {}),
    ...(outcome.substitutionDiagnostics
      ? { substitutionDiagnostics: { ...outcome.substitutionDiagnostics } }
      : {}),
    ...(outcome.numericMethod ? { numericMethod: outcome.numericMethod } : {}),
    ...(outcome.sourceMode ? { sourceMode: outcome.sourceMode } : {}),
    ...(success?.variableSubstitutions?.length
      ? {
          variableSubstitutions: success.variableSubstitutions.map((substitution) => ({
            name: substitution.name,
            value: mathValue(substitution.valueLatex),
            numericValue: substitution.numericValue,
          })),
        }
      : {}),
  };
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function projectSolveSummary(
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
): CanonicalResultDetailPartV1[][] | CanonicalResultProjectionFailure | undefined {
  if (outcome.solveSummaryParts?.length) {
    return outcome.solveSummaryParts.map((line) => line.map(projectDetailPart));
  }
  if (outcome.solveSummaryText?.trim()) {
    return {
      reason: 'undeclared-summary',
      message: 'Solve summary text has no typed math/prose parts.',
    };
  }
  return undefined;
}

export function projectDisplayOutcomeToCanonicalResult(
  outcome: DisplayOutcome,
  options: { tableResponse?: TableResponse } = {},
): CanonicalResultProjectionResult {
  if (outcome.kind === 'prompt') {
    return projectionFailure('prompt-outcome', 'Prompt outcomes are control flow, not canonical results.');
  }
  if (outcome.canonicalMath && outcome.canonicalMath.canonicalLatex !== outcome.exactLatex) {
    return projectionFailure(
      'canonical-math-mismatch',
      'Display canonical math must match the compatibility exact LaTeX.',
    );
  }

  const details = projectDetailSections(outcome.detailSections);
  if (!details.ok) return { ok: false, failure: details.failure };
  const solveSummary = projectSolveSummary(outcome);
  if (solveSummary && !Array.isArray(solveSummary)) {
    return { ok: false, failure: solveSummary };
  }

  const success = outcome.kind === 'success' ? outcome : undefined;
  const metadata = projectMetadata(outcome);
  const tableResponse = options.tableResponse;
  const candidate: CanonicalResultDocumentV1 = {
    version: 1,
    outcomeKind: outcome.kind,
    title: outcome.title,
    ...(outcome.kind === 'error' ? { error: outcome.error } : {}),
    ...(outcome.exactLatex
      ? { primaryMath: mathValue(outcome.exactLatex, outcome.canonicalMath?.mathJson) }
      : {}),
    ...(success?.answerRows
      ? {
          answerRows: {
            ...(success.answerRows.label ? { label: success.answerRows.label } : {}),
            rows: success.answerRows.rows.map((row) => ({
              math: mathValue(row.latex),
              ...(row.label ? { label: row.label } : {}),
            })),
          },
        }
      : {}),
    ...(outcome.branchReadback
      ? {
          branchReadback: {
            target: mathValue(outcome.branchReadback.targetLatex),
            relation: outcome.branchReadback.relationLatex,
            branches: outcome.branchReadback.branchesLatex.map((branch) => mathValue(branch)),
            ...(outcome.branchReadback.countLabel
              ? { countLabel: outcome.branchReadback.countLabel }
              : {}),
            ...(outcome.branchReadback.label ? { label: outcome.branchReadback.label } : {}),
            ...(outcome.branchReadback.source ? { source: outcome.branchReadback.source } : {}),
          },
        }
      : {}),
    ...(success?.systemReadback
      ? {
          systemReadback: {
            variables: success.systemReadback.variablesLatex.map((value) => mathValue(value)),
            rows: success.systemReadback.rows.map((row) => ({
              values: row.valuesLatex.map((value) => mathValue(value)),
              ...(row.approxText ? { approxText: row.approxText } : {}),
            })),
            ...(success.systemReadback.label ? { label: success.systemReadback.label } : {}),
            ...(success.systemReadback.source ? { source: success.systemReadback.source } : {}),
          },
        }
      : {}),
    ...(outcome.periodicFamily ? { periodicFamily: projectPeriodicFamily(outcome.periodicFamily) } : {}),
    ...(outcome.exactSupplementLatex?.length
      ? { supplements: outcome.exactSupplementLatex.map((value) => mathValue(value)) }
      : {}),
    ...(outcome.approxText ? { approximations: { primary: outcome.approxText } } : {}),
    ...(details.sections ? { details: details.sections } : {}),
    ...(solveSummary || outcome.transformSummaryText || outcome.transformSummaryLatex
      ? {
          summaries: {
            ...(solveSummary ? { solve: solveSummary } : {}),
            ...(outcome.transformSummaryText || outcome.transformSummaryLatex
              ? {
                  transform: {
                    ...(outcome.transformSummaryText ? { text: outcome.transformSummaryText } : {}),
                    ...(outcome.transformSummaryLatex
                      ? { math: mathValue(outcome.transformSummaryLatex) }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    warnings: [...outcome.warnings],
    ...(metadata ? { metadata } : {}),
    ...(tableResponse
      ? {
          table: {
            headers: [...tableResponse.headers],
            rows: tableResponse.rows.map((row) => ({
              x: mathValue(row.x),
              primary: mathValue(row.primary),
              ...(row.secondary !== undefined ? { secondary: mathValue(row.secondary) } : {}),
            })),
          },
        }
      : {}),
  };

  const validation = validateCanonicalResultDocument(candidate);
  return validation.ok
    ? { ok: true, document: validation.validated.value }
    : projectionFailure(
        'invalid-document',
        validation.failure.message,
        validation.failure,
      );
}

function restoreDetailPart(part: CanonicalResultDetailPartV1): DisplayDetailLinePart {
  return part.kind === 'math'
    ? { kind: 'math', latex: part.math.canonicalLatex }
    : { kind: 'text', text: part.text };
}

function restoreDetailSections(
  sections: CanonicalResultDetailSectionV1[] | undefined,
): DisplayDetailSection[] | undefined {
  return sections?.map((section) => {
    const lineParts = section.lines.map((line) => line.map(restoreDetailPart));
    const lines = lineParts.map((line) =>
      line.map((part) => part.kind === 'math' ? part.latex : part.text).join(''));
    const simpleLineKinds = lineParts.map((line) =>
      line.length === 1 ? line[0]?.kind : undefined);
    if (
      simpleLineKinds.length > 0
      && simpleLineKinds.every((kind): kind is 'math' | 'text' => kind !== undefined)
    ) {
      const firstKind = simpleLineKinds[0];
      return simpleLineKinds.every((kind) => kind === firstKind)
        ? {
            title: section.title,
            lines,
            lineKind: firstKind,
          }
        : {
            title: section.title,
            lines,
            lineKinds: simpleLineKinds,
          };
    }
    return {
      title: section.title,
      lines,
      lineParts,
    };
  });
}

function restorePeriodicFamily(
  family: CanonicalResultPeriodicFamilyV1 | undefined,
): PeriodicFamilyInfo | undefined {
  if (!family) return undefined;
  return {
    carrierLatex: family.carrier.canonicalLatex,
    parameterLatex: family.parameter.canonicalLatex,
    ...(family.parameterConstraints
      ? { parameterConstraintLatex: family.parameterConstraints.map((value) => value.canonicalLatex) }
      : {}),
    branchesLatex: family.branches.map((value) => value.canonicalLatex),
    ...(family.discoveredFamilies
      ? { discoveredFamilies: family.discoveredFamilies.map((value) => value.canonicalLatex) }
      : {}),
    ...(family.representatives
      ? {
          representatives: family.representatives.map((representative) => ({
            label: representative.label,
            ...(representative.exact ? { exactLatex: representative.exact.canonicalLatex } : {}),
            ...(representative.approxText ? { approxText: representative.approxText } : {}),
          })),
        }
      : {}),
    ...(family.suggestedIntervals
      ? {
          suggestedIntervals: family.suggestedIntervals.map((interval) => ({
            label: interval.label,
            start: interval.start.canonicalLatex,
            end: interval.end.canonicalLatex,
          })),
        }
      : {}),
    ...(family.piecewiseBranches
      ? {
          piecewiseBranches: family.piecewiseBranches.map((branch) => ({
            conditionLatex: branch.condition.canonicalLatex,
            resultLatex: branch.result.canonicalLatex,
          })),
        }
      : {}),
    ...(family.principalRange ? { principalRangeLatex: family.principalRange.canonicalLatex } : {}),
    ...(family.reducedCarrier ? { reducedCarrierLatex: family.reducedCarrier.canonicalLatex } : {}),
    ...(family.structuredStopReason ? { structuredStopReason: family.structuredStopReason } : {}),
  };
}

export function projectCanonicalResultToDisplayOutcome(
  document: CanonicalResultDocumentV1,
  options: { includeCanonicalMath?: boolean } = {},
): Exclude<DisplayOutcome, { kind: 'prompt' }> {
  const metadata = document.metadata;
  const solveSummaryParts = document.summaries?.solve?.map((line) => line.map(restoreDetailPart));
  const common = {
    title: document.title,
    warnings: [...document.warnings],
    canonicalResult: document,
    ...(document.primaryMath && options.includeCanonicalMath !== false
      ? {
          exactLatex: document.primaryMath.canonicalLatex,
          canonicalMath: {
            version: 1 as const,
            canonicalLatex: document.primaryMath.canonicalLatex,
            ...(document.primaryMath.mathJson !== undefined
              ? { mathJson: document.primaryMath.mathJson }
              : {}),
          },
        }
      : {}),
    ...(document.branchReadback
      ? {
          branchReadback: {
            targetLatex: document.branchReadback.target.canonicalLatex,
            relationLatex: document.branchReadback.relation,
            branchesLatex: document.branchReadback.branches.map((branch) => branch.canonicalLatex),
            ...(document.branchReadback.countLabel
              ? { countLabel: document.branchReadback.countLabel }
              : {}),
            ...(document.branchReadback.label ? { label: document.branchReadback.label } : {}),
            ...(document.branchReadback.source ? { source: document.branchReadback.source } : {}),
          },
        }
      : {}),
    ...(document.periodicFamily ? { periodicFamily: restorePeriodicFamily(document.periodicFamily) } : {}),
    ...(document.supplements
      ? { exactSupplementLatex: document.supplements.map((value) => value.canonicalLatex) }
      : {}),
    ...(document.approximations?.primary ? { approxText: document.approximations.primary } : {}),
    ...(document.details ? { detailSections: restoreDetailSections(document.details) } : {}),
    ...(metadata?.answerMode ? { answerMode: metadata.answerMode } : {}),
    ...(metadata?.answerDomain ? { answerDomain: metadata.answerDomain } : {}),
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    ...(metadata?.resolvedInput ? { resolvedInputLatex: metadata.resolvedInput.canonicalLatex } : {}),
    ...(metadata?.plannerBadges ? { plannerBadges: [...metadata.plannerBadges] } : {}),
    ...(metadata?.solveBadges ? { solveBadges: [...metadata.solveBadges] } : {}),
    ...(solveSummaryParts
      ? {
          solveSummaryParts,
          solveSummaryText: solveSummaryParts
            .map((line) => line.map((part) => part.kind === 'math' ? part.latex : part.text).join(''))
            .join('; '),
        }
      : {}),
    ...(metadata?.transformBadges ? { transformBadges: [...metadata.transformBadges] } : {}),
    ...(document.summaries?.transform?.text
      ? { transformSummaryText: document.summaries.transform.text }
      : {}),
    ...(document.summaries?.transform?.math
      ? { transformSummaryLatex: document.summaries.transform.math.canonicalLatex }
      : {}),
    ...(metadata?.rejectedCandidateCount !== undefined
      ? { rejectedCandidateCount: metadata.rejectedCandidateCount }
      : {}),
    ...(metadata?.substitutionDiagnostics
      ? { substitutionDiagnostics: { ...metadata.substitutionDiagnostics } }
      : {}),
    ...(metadata?.numericMethod ? { numericMethod: metadata.numericMethod } : {}),
    ...(metadata?.sourceMode ? { sourceMode: metadata.sourceMode } : {}),
  };

  if (document.outcomeKind === 'error') {
    return { kind: 'error', error: document.error ?? '', ...common };
  }
  return {
    kind: 'success',
    ...common,
    ...(document.answerRows
      ? {
          answerRows: {
            ...(document.answerRows.label ? { label: document.answerRows.label } : {}),
            rows: document.answerRows.rows.map((row) => ({
              latex: row.math.canonicalLatex,
              ...(row.label ? { label: row.label } : {}),
            })),
          },
        }
      : {}),
    ...(document.systemReadback
      ? {
          systemReadback: {
            variablesLatex: document.systemReadback.variables.map((value) => value.canonicalLatex),
            rows: document.systemReadback.rows.map((row) => ({
              valuesLatex: row.values.map((value) => value.canonicalLatex),
              ...(row.approxText ? { approxText: row.approxText } : {}),
            })),
            ...(document.systemReadback.label ? { label: document.systemReadback.label } : {}),
            ...(document.systemReadback.source ? { source: document.systemReadback.source } : {}),
          },
        }
      : {}),
    ...(metadata?.resultOrigin ? { resultOrigin: metadata.resultOrigin } : {}),
    ...(metadata?.calculusStrategy ? { calculusStrategy: metadata.calculusStrategy } : {}),
    ...(metadata?.calculusDerivativeStrategies
      ? { calculusDerivativeStrategies: [...metadata.calculusDerivativeStrategies] }
      : {}),
    ...(metadata?.candidateValues ? { candidateValues: [...metadata.candidateValues] } : {}),
    ...(metadata?.variableSubstitutions
      ? {
          variableSubstitutions: metadata.variableSubstitutions.map((substitution) => ({
            name: substitution.name,
            valueLatex: substitution.value.canonicalLatex,
            numericValue: substitution.numericValue,
          })),
        }
      : {}),
  };
}

export function deriveDisplayOutcomeFromCanonicalResult<
  Outcome extends Exclude<DisplayOutcome, { kind: 'prompt' }>,
>(
  document: CanonicalResultDocumentV1,
  compatibilityPolicy: Partial<Outcome>,
): Outcome {
  const projected = projectCanonicalResultToDisplayOutcome(document);
  if (compatibilityPolicy.canonicalMath === undefined) {
    delete projected.canonicalMath;
  }
  const derived = {
    ...projected,
    ...(compatibilityPolicy.actions !== undefined
      ? { actions: compatibilityPolicy.actions }
      : {}),
    ...(compatibilityPolicy.runtimeAdvisories !== undefined
      ? { runtimeAdvisories: compatibilityPolicy.runtimeAdvisories }
      : {}),
  } as Outcome;
  const derivedRecord = derived as Record<string, unknown>;
  for (const key of Object.keys(compatibilityPolicy)) {
    if (compatibilityPolicy[key as keyof Outcome] === undefined && !(key in derivedRecord)) {
      derivedRecord[key] = undefined;
    }
  }
  return derived;
}

export function projectCanonicalResultToTableResponse(
  document: CanonicalResultDocumentV1,
): TableResponse | undefined {
  if (!document.table) return undefined;
  return {
    headers: [...document.table.headers],
    rows: document.table.rows.map((row) => ({
      x: row.x.canonicalLatex,
      primary: row.primary.canonicalLatex,
      ...(row.secondary ? { secondary: row.secondary.canonicalLatex } : {}),
    })),
    warnings: [...document.warnings],
    ...(document.outcomeKind === 'error' && document.error ? { error: document.error } : {}),
  };
}
