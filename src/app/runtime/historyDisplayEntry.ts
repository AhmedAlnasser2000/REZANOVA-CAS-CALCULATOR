import { createId } from '../logic/appUtils';
import type {
  CanonicalRuntimeOutcome,
  AnswerDomain,
  GeometryScreen,
  HistoryEntry,
  ModeId,
  StatisticsScreen,
  SolutionKind,
  TableResponse,
  TrigScreen,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentation,
} from '../../lib/result-contract';

type SuccessfulCanonicalOutcome = Extract<CanonicalRuntimeOutcome, { kind: 'success' }>;

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
  | 'numericInterval'
  | 'runtimeElapsedMs'
>> & {
  answerDomain?: AnswerDomain;
  historyTicketId?: string | null;
  historyLaunchOrder?: number;
  solutionKind?: SolutionKind;
  suppressDisplayCommit?: boolean;
  tableResponse?: TableResponse;
  variableSubstitutions?: VariableSubstitutionSnapshot[];
};

export type BuildHistoryDisplayEntryOptions = {
  outcome: SuccessfulCanonicalOutcome;
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
  source: 'structured';
  sourceVersion: 1 | 2;
  outcome: SuccessfulCanonicalOutcome;
  title: string;
  primaryLatex?: string;
  resolvedInputLatex?: string;
  approxText?: string;
  answerDomain?: AnswerDomain;
  solutionKind?: SolutionKind;
  supplementLatex: string[];
  detailSearchText: string[];
  warnings: string[];
  tableResponse?: TableResponse;
};

function canonicalDetailSearchText(
  details: CanonicalResultPresentation['details'],
) {
  return details?.flatMap((section) => [
    section.title,
    ...section.lines.map((line) => line.map((part) =>
      part.kind === 'math' ? part.latex : part.text).join('')),
  ]) ?? [];
}

function canonicalTableResponse(
  presentation: {
    outcomeKind: 'success' | 'error';
    error?: string;
    warnings: string[];
    table?: { headers: string[]; rows: Array<{ x: string; primary: string; secondary?: string }> };
  },
): TableResponse | undefined {
  if (!presentation.table) return undefined;
  return {
    headers: [...presentation.table.headers],
    rows: presentation.table.rows.map((row) => ({
      x: row.x,
      primary: row.primary,
      ...(row.secondary ? { secondary: row.secondary } : {}),
    })),
    warnings: [...presentation.warnings],
    ...(presentation.outcomeKind === 'error' && presentation.error
      ? { error: presentation.error }
      : {}),
  };
}

export function readHistoryResult(entry: HistoryEntry): HistoryResultReadModel {
  const outcome = {
    kind: 'success',
    canonicalResult: entry.resultDocument,
  } as SuccessfulCanonicalOutcome;
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (resolution.ok && resolution.presentation.outcomeKind === 'success') {
    const { presentation, semantics } = resolution;
    return {
      source: 'structured',
      sourceVersion: resolution.sourceVersion,
      outcome,
      title: presentation.title,
      primaryLatex: presentation.primaryLatex,
      resolvedInputLatex: presentation.requestLatex,
      approxText: presentation.approximations?.primary,
      answerDomain: semantics.metadata?.answerDomain,
      solutionKind: semantics.metadata?.solutionKind,
      supplementLatex: presentation.supplements ?? [],
      detailSearchText: canonicalDetailSearchText(presentation.details),
      warnings: [...presentation.warnings],
      tableResponse: canonicalTableResponse(presentation),
    };
  }
  throw new Error('History entry requires a valid canonical result document.');
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
  const resultDocument = resolveCanonicalResultForConsumer(outcome);
  if (!resultDocument.ok || resultDocument.presentation.outcomeKind !== 'success') {
    throw new Error('History success entries require native canonical result authority.');
  }

  return {
    id: createId(),
    mode: mode,
    inputLatex,
    resultDocument: resultDocument.rawDocument,
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
    ...(context.numericInterval
      ? { numericInterval: context.numericInterval }
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
