import type {
  CanonicalRuntimeOutcome,
  DisplayAnswerRowsReadback,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplaySystemSolutionReadback,
  ModeId,
  PeriodicFamilyInfo,
  ResultOrigin,
  SolutionKind,
} from '../../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentation,
  type CanonicalResultPresentationDetailPart,
} from '../../result-contract/consumer';
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

function displayDetailPart(
  part: CanonicalResultPresentationDetailPart,
): DisplayDetailLinePart {
  return part.kind === 'math'
    ? { kind: 'math', latex: part.latex }
    : { kind: 'text', text: part.text };
}

export function displaySolveSummaryPartsFromOutcome(
  outcome: CanonicalRuntimeOutcome | null | undefined,
): DisplayDetailLinePart[][] | undefined {
  if (!outcome || outcome.kind === 'prompt') return undefined;
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(
      'Display solve-summary projection failed: '
        + resolution.failure.reason
        + ': '
        + resolution.failure.message,
    );
  }
  return resolution.presentation.summaries?.solve
    ?.map((line) => line.map(displayDetailPart));
}

function displayDetailSections(
  presentation: CanonicalResultPresentation,
): DisplayDetailSection[] | undefined {
  return presentation.details?.map((section) => {
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

export function displayResultReadModelFromOutcome(
  outcome: CanonicalRuntimeOutcome | null | undefined,
): DisplayResultReadModel | null {
  if (!outcome || outcome.kind === 'prompt') return null;
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(
      'Display read model projection failed: '
        + resolution.failure.reason
        + ': '
        + resolution.failure.message,
    );
  }
  const { presentation, semantics } = resolution;
  const metadata = semantics.metadata;
  const trustSummary = trustSummaryForCanonicalResult(resolution);
  return {
    authority: 'native',
    outcomeKind: presentation.outcomeKind,
    title: presentation.title,
    ...(presentation.error ? { errorText: presentation.error } : {}),
    ...(presentation.primaryLatex ? { primaryLatex: presentation.primaryLatex } : {}),
    ...(presentation.answerRows ? { answerRows: presentation.answerRows } : {}),
    ...(presentation.branchReadback ? { branchReadback: presentation.branchReadback } : {}),
    ...(presentation.systemReadback ? { systemReadback: presentation.systemReadback } : {}),
    ...(presentation.periodicFamily
      ? { periodicFamily: presentation.periodicFamily }
      : {}),
    ...(presentation.supplements
      ? { supplementLatex: [...presentation.supplements] }
      : {}),
    ...(presentation.approximations?.primary
      ? { approximateText: presentation.approximations.primary }
      : {}),
    ...(presentation.details ? { detailSections: displayDetailSections(presentation) } : {}),
    warnings: [...presentation.warnings],
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    ...(metadata?.resultOrigin ? { resultOrigin: metadata.resultOrigin } : {}),
    ...(metadata?.sourceMode ? { sourceMode: metadata.sourceMode } : {}),
    ...(trustSummary ? { trustSummary } : {}),
  };
}
