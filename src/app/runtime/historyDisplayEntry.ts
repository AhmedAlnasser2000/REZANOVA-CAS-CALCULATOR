import { createId } from '../logic/appUtils';
import type {
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
  primaryLatex?: string;
  approxText?: string;
  tableResponse?: TableResponse;
};

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
      return {
        source: 'structured',
        outcome,
        primaryLatex: outcome.exactLatex,
        approxText: outcome.approxText,
        tableResponse: projectCanonicalResultToTableResponse(validation.validated.value),
      };
    }
  }

  const outcome = legacyHistoryOutcome(entry);
  return {
    source: 'legacy',
    outcome,
    primaryLatex: outcome.exactLatex,
    approxText: outcome.approxText,
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
  const variableSubstitutions =
    context.variableSubstitutions
    ?? (outcome.kind === 'success' ? outcome.variableSubstitutions : undefined);
  const resultDocument = resolveCanonicalResultForStorage(outcome, {
    tableResponse: context.tableResponse,
  });

  return {
    id: createId(),
    mode: mode,
    inputLatex,
    resolvedInputLatex: outcome.resolvedInputLatex,
    resultLatex: outcome.exactLatex,
    exactSupplementLatex: outcome.exactSupplementLatex,
    approxText: outcome.approxText,
    ...(outcome.detailSections && outcome.detailSections.length > 0
      ? { detailSections: outcome.detailSections }
      : {}),
    ...(outcome.systemReadback
      ? { systemReadback: outcome.systemReadback }
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
    ...(mode === 'equation' && (context.answerDomain ?? outcome.answerDomain)
      ? { answerDomain: context.answerDomain ?? outcome.answerDomain }
      : {}),
    ...(mode === 'equation' && (context.solutionKind ?? outcome.solutionKind)
      ? { solutionKind: context.solutionKind ?? outcome.solutionKind }
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
