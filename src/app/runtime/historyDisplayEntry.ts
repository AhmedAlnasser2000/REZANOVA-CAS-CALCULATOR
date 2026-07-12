import { createId } from '../logic/appUtils';
import type {
  CanonicalResultDocumentV1,
  DisplayOutcome,
  GeometryScreen,
  HistoryEntry,
  ModeId,
  StatisticsScreen,
  TableResponse,
  TrigScreen,
} from '../../types/calculator';
import {
  projectCanonicalResultToDisplayOutcome,
  projectCanonicalResultToTableResponse,
  resolveCanonicalResultForStorage,
  validateCanonicalResultDocument,
} from '../../lib/result-contract';

type SuccessfulDisplayOutcome = Extract<DisplayOutcome, { kind: 'success' }>;

export type CommitHistoryDisplayContext = Partial<Pick<
  HistoryEntry,
  | 'calculateScreen'
  | 'calculateSeed'
  | 'calculusScreen'
  | 'calculusSeed'
  | 'geometryScreen'
  | 'geometrySeed'
  | 'trigScreen'
  | 'trigSeed'
  | 'statisticsScreen'
  | 'statisticsSeed'
  | 'matrixSeed'
  | 'vectorSeed'
  | 'equationScreen'
  | 'equationSeed'
  | 'equationSolveTarget'
  | 'equationAnswerMode'
  | 'equationDomainIntent'
  | 'complexExactForm'
  | 'answerDomain'
  | 'solutionKind'
  | 'numericInterval'
  | 'runtimeElapsedMs'
  | 'variableSubstitutions'
>> & {
  historyTicketId?: string | null;
  historyLaunchOrder?: number;
  suppressDisplayCommit?: boolean;
  tableResponse?: TableResponse;
};

export type BuildHistoryDisplayEntryOptions = {
  outcome: SuccessfulDisplayOutcome;
  inputLatex: string;
  mode: ModeId;
  context: CommitHistoryDisplayContext;
  currentCalculateHistoryContext: () => Partial<HistoryEntry>;
  currentCalculusHistoryContext: () => Partial<HistoryEntry>;
  geometryScreen: GeometryScreen;
  trigScreen: TrigScreen;
  statisticsScreen: StatisticsScreen;
};

export type HistoryResultReadModel = {
  source: 'structured' | 'legacy';
  outcome: SuccessfulDisplayOutcome;
  document?: CanonicalResultDocumentV1;
  title: string;
  primaryLatex?: string;
  approxText?: string;
  answerDomain?: SuccessfulDisplayOutcome['answerDomain'];
  solutionKind?: SuccessfulDisplayOutcome['solutionKind'];
  supplementLatex: string[];
  detailSearchText: string[];
  warnings: string[];
  tableResponse?: TableResponse;
};

function canonicalDetailSearchText(document: CanonicalResultDocumentV1) {
  return document.details?.flatMap((section) => [
    section.title,
    ...section.lines.map((line) => line.map((part) =>
      part.kind === 'math' ? part.math.canonicalLatex : part.text).join('')),
  ]) ?? [];
}

function legacyHistoryOutcome(entry: HistoryEntry): SuccessfulDisplayOutcome {
  return {
    kind: 'success',
    title: 'History',
    exactLatex: entry.resultLatex,
    exactSupplementLatex: entry.exactSupplementLatex,
    approxText: entry.approxText,
    detailSections: entry.detailSections,
    systemReadback: entry.systemReadback,
    answerDomain: entry.answerDomain,
    solutionKind: entry.solutionKind,
    warnings: [],
  };
}

export function readHistoryResult(entry: HistoryEntry): HistoryResultReadModel {
  const validation = validateCanonicalResultDocument(entry.resultDocument);
  if (validation.ok && validation.validated.value.outcomeKind === 'success') {
    const outcome = projectCanonicalResultToDisplayOutcome(validation.validated.value);
    if (outcome.kind === 'success') {
      const document = validation.validated.value;
      return {
        source: 'structured',
        outcome,
        document,
        title: document.title,
        primaryLatex: document.primaryMath?.canonicalLatex,
        approxText: document.approximations?.primary,
        answerDomain: document.metadata?.answerDomain,
        solutionKind: document.metadata?.solutionKind,
        supplementLatex: document.supplements?.map((value) => value.canonicalLatex) ?? [],
        detailSearchText: canonicalDetailSearchText(document),
        warnings: [...document.warnings],
        tableResponse: projectCanonicalResultToTableResponse(document),
      };
    }
  }

  const outcome = legacyHistoryOutcome(entry);
  return {
    source: 'legacy',
    outcome,
    title: 'History',
    primaryLatex: entry.resultLatex,
    approxText: entry.approxText,
    answerDomain: entry.answerDomain,
    solutionKind: entry.solutionKind,
    supplementLatex: entry.exactSupplementLatex ?? [],
    detailSearchText: entry.detailSections?.flatMap((section) => [
      section.title,
      ...section.lines,
    ]) ?? [],
    warnings: [],
  };
}

export function buildHistoryDisplayEntry({
  outcome,
  inputLatex,
  mode,
  context,
  currentCalculateHistoryContext,
  currentCalculusHistoryContext,
  geometryScreen,
  trigScreen,
  statisticsScreen,
}: BuildHistoryDisplayEntryOptions): HistoryEntry {
  const resultDocument = resolveCanonicalResultForStorage(outcome, {
    tableResponse: context.tableResponse,
  });
  const compatibilityOutcome = outcome;
  const variableSubstitutions =
    context.variableSubstitutions
    ?? compatibilityOutcome.variableSubstitutions;

  return {
    id: createId(),
    mode: mode,
    inputLatex,
    resolvedInputLatex: compatibilityOutcome.resolvedInputLatex,
    resultLatex: compatibilityOutcome.exactLatex,
    exactSupplementLatex: compatibilityOutcome.exactSupplementLatex,
    approxText: compatibilityOutcome.approxText,
    ...(compatibilityOutcome.detailSections && compatibilityOutcome.detailSections.length > 0
      ? { detailSections: compatibilityOutcome.detailSections }
      : {}),
    ...(compatibilityOutcome.systemReadback
      ? { systemReadback: compatibilityOutcome.systemReadback }
      : {}),
    ...(resultDocument.ok
      ? { resultDocument: resultDocument.document }
      : { resultDocumentOmissionReason: resultDocument.omissionReason }),
    ...(mode === 'calculate'
      ? {
          ...currentCalculateHistoryContext(),
          ...(context.calculateScreen ? { calculateScreen: context.calculateScreen } : {}),
          ...(context.calculateSeed ? { calculateSeed: context.calculateSeed } : {}),
        }
      : {}),
    ...(mode === 'calculus'
      ? {
          ...currentCalculusHistoryContext(),
          ...(context.calculusScreen ? { calculusScreen: context.calculusScreen } : {}),
          ...(context.calculusSeed ? { calculusSeed: context.calculusSeed } : {}),
        }
      : {}),
    ...(mode === 'geometry'
      ? {
          geometryScreen: context.geometryScreen ?? context.geometrySeed?.screen ?? geometryScreen,
          ...(context.geometrySeed ? { geometrySeed: context.geometrySeed } : {}),
        }
      : {}),
    ...(mode === 'trigonometry'
      ? {
          trigScreen: context.trigScreen ?? context.trigSeed?.screen ?? trigScreen,
          ...(context.trigSeed ? { trigSeed: context.trigSeed } : {}),
        }
      : {}),
    ...(mode === 'statistics'
      ? {
          statisticsScreen: context.statisticsScreen ?? context.statisticsSeed?.screen ?? statisticsScreen,
          ...(context.statisticsSeed ? { statisticsSeed: context.statisticsSeed } : {}),
        }
      : {}),
    ...(mode === 'matrix' && context.matrixSeed
      ? { matrixSeed: context.matrixSeed }
      : {}),
    ...(mode === 'vector' && context.vectorSeed
      ? { vectorSeed: context.vectorSeed }
      : {}),
    ...(mode === 'equation' && (context.equationScreen ?? context.equationSeed?.screen)
      ? { equationScreen: context.equationScreen ?? context.equationSeed?.screen }
      : {}),
    ...(mode === 'equation' && context.equationSeed
      ? { equationSeed: context.equationSeed }
      : {}),
    ...(mode === 'equation' && context.equationSolveTarget
      ? { equationSolveTarget: context.equationSolveTarget }
      : {}),
    ...(mode === 'equation' && context.equationAnswerMode
      ? { equationAnswerMode: context.equationAnswerMode }
      : {}),
    ...(mode === 'equation' && context.equationDomainIntent
      ? { equationDomainIntent: context.equationDomainIntent }
      : {}),
    ...(mode === 'equation' && context.complexExactForm
      ? { complexExactForm: context.complexExactForm }
      : {}),
    ...(mode === 'equation' && (compatibilityOutcome.answerDomain ?? context.answerDomain)
      ? { answerDomain: compatibilityOutcome.answerDomain ?? context.answerDomain }
      : {}),
    ...(mode === 'equation' && (compatibilityOutcome.solutionKind ?? context.solutionKind)
      ? { solutionKind: compatibilityOutcome.solutionKind ?? context.solutionKind }
      : {}),
    ...(context.numericInterval
      ? { numericInterval: context.numericInterval }
      : {}),
    ...(variableSubstitutions && variableSubstitutions.length > 0
      ? { variableSubstitutions }
      : {}),
    ...(context.historyLaunchOrder !== undefined
      ? { historyLaunchOrder: context.historyLaunchOrder }
      : {}),
    ...(context.runtimeElapsedMs !== undefined
      ? { runtimeElapsedMs: context.runtimeElapsedMs }
      : {}),
    timestamp: new Date().toISOString(),
  };
}
