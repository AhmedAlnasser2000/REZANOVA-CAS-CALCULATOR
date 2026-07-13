import type {
  CanonicalResultDetailPartV1,
  CanonicalResultDocumentV1,
  CanonicalResultPeriodicFamilyV1,
  DisplayAnswerRowsReadback,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  DisplaySystemSolutionReadback,
  ModeId,
  PeriodicFamilyInfo,
  ResultOrigin,
  SolutionKind,
} from '../../../types/calculator';
import { resolveCanonicalResultForConsumer } from '../../result-contract';
import { trustSummaryForCanonicalResult } from './display-trust-summary';

export type DisplayResultReadModel = {
  authority: 'native';
  outcomeKind: 'success' | 'error';
  title: string;
  errorText?: string;
  primaryLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  branchReadback?: DisplayBranchReadback;
  systemReadback?: DisplaySystemSolutionReadback;
  periodicFamily?: PeriodicFamilyInfo;
  supplementLatex?: string[];
  approximateText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  solutionKind?: SolutionKind;
  resultOrigin?: ResultOrigin;
  sourceMode?: ModeId;
  trustSummary?: string;
};

function displayDetailPart(part: CanonicalResultDetailPartV1): DisplayDetailLinePart {
  return part.kind === 'math'
    ? { kind: 'math', latex: part.math.canonicalLatex }
    : { kind: 'text', text: part.text };
}

export function displaySolveSummaryPartsFromOutcome(
  outcome: DisplayOutcome | null | undefined,
): DisplayDetailLinePart[][] | undefined {
  if (!outcome || outcome.kind === 'prompt') return undefined;
  const projected = resolveCanonicalResultForConsumer(outcome);
  if (!projected.ok) {
    throw new Error(
      `Display solve-summary projection failed: ${projected.failure.reason}: ${projected.failure.message}`,
    );
  }
  return projected.document.summaries?.solve?.map((line) => line.map(displayDetailPart));
}

function displayDetailSections(
  document: CanonicalResultDocumentV1,
): DisplayDetailSection[] | undefined {
  return document.details?.map((section) => {
    const lineParts = section.lines.map((line) => line.map(displayDetailPart));
    const lines = lineParts.map((line) =>
      line.map((part) => part.kind === 'math' ? part.latex : part.text).join(''));
    const simpleKinds = lineParts.map((line) =>
      line.length === 1 ? line[0]?.kind : undefined);
    if (
      simpleKinds.length > 0
      && simpleKinds.every((kind): kind is 'math' | 'text' => kind !== undefined)
    ) {
      const firstKind = simpleKinds[0];
      return simpleKinds.every((kind) => kind === firstKind)
        ? { title: section.title, lines, lineKind: firstKind }
        : { title: section.title, lines, lineKinds: simpleKinds };
    }
    return { title: section.title, lines, lineParts };
  });
}

function displayPeriodicFamily(
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
            ...(representative.exact
              ? { exactLatex: representative.exact.canonicalLatex }
              : {}),
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
    ...(family.principalRange
      ? { principalRangeLatex: family.principalRange.canonicalLatex }
      : {}),
    ...(family.reducedCarrier
      ? { reducedCarrierLatex: family.reducedCarrier.canonicalLatex }
      : {}),
    ...(family.structuredStopReason
      ? { structuredStopReason: family.structuredStopReason }
      : {}),
  };
}

function displayAnswerRows(document: CanonicalResultDocumentV1) {
  return document.answerRows
    ? {
        ...(document.answerRows.label ? { label: document.answerRows.label } : {}),
        rows: document.answerRows.rows.map((row) => ({
          latex: row.math.canonicalLatex,
          ...(row.label ? { label: row.label } : {}),
        })),
      }
    : undefined;
}

function displayBranchReadback(document: CanonicalResultDocumentV1) {
  const readback = document.branchReadback;
  return readback
    ? {
        targetLatex: readback.target.canonicalLatex,
        relationLatex: readback.relation,
        branchesLatex: readback.branches.map((branch) => branch.canonicalLatex),
        ...(readback.countLabel ? { countLabel: readback.countLabel } : {}),
        ...(readback.label ? { label: readback.label } : {}),
        ...(readback.source ? { source: readback.source } : {}),
      }
    : undefined;
}

function displaySystemReadback(document: CanonicalResultDocumentV1) {
  const readback = document.systemReadback;
  return readback
    ? {
        variablesLatex: readback.variables.map((value) => value.canonicalLatex),
        rows: readback.rows.map((row) => ({
          valuesLatex: row.values.map((value) => value.canonicalLatex),
          ...(row.approxText ? { approxText: row.approxText } : {}),
        })),
        ...(readback.label ? { label: readback.label } : {}),
        ...(readback.source ? { source: readback.source } : {}),
      }
    : undefined;
}

function canonicalDocumentForDisplay(outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>) {
  const projected = resolveCanonicalResultForConsumer(outcome);
  if (!projected.ok) {
    throw new Error(
      `Display read model projection failed: ${projected.failure.reason}: ${projected.failure.message}`,
    );
  }
  return { authority: 'native' as const, document: projected.document };
}

export function displayResultReadModelFromOutcome(
  outcome: DisplayOutcome | null | undefined,
): DisplayResultReadModel | null {
  if (!outcome || outcome.kind === 'prompt') return null;
  const { authority, document } = canonicalDocumentForDisplay(outcome);
  const metadata = document.metadata;
  const trustSummary = trustSummaryForCanonicalResult(document, outcome);
  return {
    authority,
    outcomeKind: document.outcomeKind,
    title: document.title,
    ...(document.error ? { errorText: document.error } : {}),
    ...(document.primaryMath ? { primaryLatex: document.primaryMath.canonicalLatex } : {}),
    ...(document.answerRows ? { answerRows: displayAnswerRows(document) } : {}),
    ...(document.branchReadback ? { branchReadback: displayBranchReadback(document) } : {}),
    ...(document.systemReadback ? { systemReadback: displaySystemReadback(document) } : {}),
    ...(document.periodicFamily
      ? { periodicFamily: displayPeriodicFamily(document.periodicFamily) }
      : {}),
    ...(document.supplements
      ? { supplementLatex: document.supplements.map((value) => value.canonicalLatex) }
      : {}),
    ...(document.approximations?.primary
      ? { approximateText: document.approximations.primary }
      : {}),
    ...(document.details ? { detailSections: displayDetailSections(document) } : {}),
    warnings: [...document.warnings],
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    ...(metadata?.resultOrigin ? { resultOrigin: metadata.resultOrigin } : {}),
    ...(metadata?.sourceMode ? { sourceMode: metadata.sourceMode } : {}),
    ...(trustSummary ? { trustSummary } : {}),
  };
}
