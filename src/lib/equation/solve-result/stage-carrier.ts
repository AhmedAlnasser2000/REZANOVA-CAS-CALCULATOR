import type {
  CanonicalResultDetailPartV1,
  CanonicalResultDocumentV1,
  CanonicalResultPeriodicFamilyV1,
  CanonicalRuntimeResultOutcome,
  DisplayDetailLinePart,
  DisplayDetailSection,
  PeriodicFamilyInfo,
  ResultProducerDraft,
} from '../../../types/calculator';
import { attachEquationAnalysisEvidence } from '../analysis-evidence';
import { transferCandidateValidatedReadbackPermission } from '../candidate-validated-readback';
import { buildEquationSolveResultFromProducerDraft } from './producer-adapter';
import type { EquationSolveResultContractV1 } from './contract';
import { buildEquationSolveResultContract } from './factory';

export type EquationStageResultCarrierV1 = EquationSolveResultContractV1;
export type EquationStageResultReadModel = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

function detailPart(part: CanonicalResultDetailPartV1): DisplayDetailLinePart {
  return part.kind === 'math'
    ? { kind: 'math', latex: part.math.canonicalLatex }
    : { kind: 'text', text: part.text };
}

function detailSections(
  sections: CanonicalResultDocumentV1['details'],
): DisplayDetailSection[] | undefined {
  return sections?.map((section) => {
    const lineParts = section.lines.map((line) => line.map(detailPart));
    return {
      title: section.title,
      lines: lineParts.map((line) => line.map((part) =>
        part.kind === 'math' ? part.latex : part.text).join('')),
      lineParts,
    };
  });
}

function periodicFamily(
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
          representatives: family.representatives.map((entry) => ({
            label: entry.label,
            ...(entry.exact ? { exactLatex: entry.exact.canonicalLatex } : {}),
            ...(entry.approxText ? { approxText: entry.approxText } : {}),
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

export function readEquationProducerDraftFromCanonicalResult(
  document: CanonicalResultDocumentV1,
): EquationStageResultReadModel {
  const metadata = document.metadata;
  const common = {
    title: document.title,
    warnings: [...document.warnings],
    canonicalResult: document,
    ...(document.primaryMath
      ? {
          exactLatex: document.primaryMath.canonicalLatex,
          primaryMath: document.primaryMath,
        }
      : {}),
    ...(document.branchReadback
      ? {
          branchReadback: {
            targetLatex: document.branchReadback.target.canonicalLatex,
            relationLatex: document.branchReadback.relation,
            branchesLatex: document.branchReadback.branches.map((branch) => branch.canonicalLatex),
            ...(document.branchReadback.countLabel ? { countLabel: document.branchReadback.countLabel } : {}),
            ...(document.branchReadback.label ? { label: document.branchReadback.label } : {}),
            ...(document.branchReadback.source ? { source: document.branchReadback.source } : {}),
          },
        }
      : {}),
    ...(document.periodicFamily ? { periodicFamily: periodicFamily(document.periodicFamily) } : {}),
    ...(document.supplements
      ? { exactSupplementLatex: document.supplements.map((value) => value.canonicalLatex) }
      : {}),
    ...(document.approximations?.primary ? { approxText: document.approximations.primary } : {}),
    ...(document.details ? { detailSections: detailSections(document.details) } : {}),
    ...(metadata?.answerMode ? { answerMode: metadata.answerMode } : {}),
    ...(metadata?.answerDomain ? { answerDomain: metadata.answerDomain } : {}),
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    ...(metadata?.resolvedInput ? { resolvedInputLatex: metadata.resolvedInput.canonicalLatex } : {}),
    ...(metadata?.plannerBadges ? { plannerBadges: [...metadata.plannerBadges] } : {}),
    ...(metadata?.solveBadges ? { solveBadges: [...metadata.solveBadges] } : {}),
    ...(document.summaries?.solve
      ? { solveSummaryParts: document.summaries.solve.map((line) => line.map(detailPart)) }
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

export function buildEquationStageResultCarrier(
  outcome: ResultProducerDraft,
): EquationStageResultCarrierV1 {
  const projection = buildEquationSolveResultFromProducerDraft(outcome);
  if (!projection.ok) {
    throw new Error(
      `Equation stage carrier rejected ${projection.failure.reason}: ${projection.failure.message}`,
    );
  }
  return transferCandidateValidatedReadbackPermission(outcome, projection.result);
}

export function buildOptionalEquationStageResultCarrier(
  outcome: ResultProducerDraft | null | undefined,
): EquationStageResultCarrierV1 | null {
  return outcome ? buildEquationStageResultCarrier(outcome) : null;
}

export function buildEquationStageResultCarrierFromRuntime(
  outcome: CanonicalRuntimeResultOutcome,
): EquationStageResultCarrierV1 {
  return buildEquationSolveResultContract({
    document: outcome.canonicalResult,
    ...(outcome.kind === 'error'
      ? {
          controlledStop: {
            code: 'equation-runtime-error',
            message: outcome.canonicalResult.error ?? 'Equation stopped without an error message.',
            source: 'producer',
          } as const,
        }
      : {}),
  });
}

export function readEquationStageResultCarrier(
  carrier: EquationStageResultCarrierV1,
): EquationStageResultReadModel {
  return transferCandidateValidatedReadbackPermission(carrier, attachEquationAnalysisEvidence(
    readEquationProducerDraftFromCanonicalResult(carrier.document),
    carrier.diagnostics.analysisEvidence,
  ));
}
