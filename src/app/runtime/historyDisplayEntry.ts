import { createId } from '../logic/appUtils';
import type {
  CanonicalResultDocumentV1,
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
  validateCanonicalResultDocument,
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
  outcome: SuccessfulCanonicalOutcome;
  document: CanonicalResultDocumentV1;
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

function canonicalDetailSearchText(document: CanonicalResultDocumentV1) {
  return document.details?.flatMap((section) => [
    section.title,
    ...section.lines.map((line) => line.map((part) =>
      part.kind === 'math' ? part.math.canonicalLatex : part.text).join('')),
  ]) ?? [];
}

function canonicalTableResponse(document: CanonicalResultDocumentV1): TableResponse | undefined {
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

export function readHistoryResult(entry: HistoryEntry): HistoryResultReadModel {
  const validation = validateCanonicalResultDocument(entry.resultDocument);
  if (validation.ok && validation.validated.value.outcomeKind === 'success') {
    const document = validation.validated.value;
    const outcome: SuccessfulCanonicalOutcome = {
      kind: 'success',
      canonicalResult: document,
    };
    return {
      source: 'structured',
      outcome,
      document,
      title: document.title,
      primaryLatex: document.primaryMath?.canonicalLatex,
      resolvedInputLatex: document.metadata?.resolvedInput?.canonicalLatex,
      approxText: document.approximations?.primary,
      answerDomain: document.metadata?.answerDomain,
      solutionKind: document.metadata?.solutionKind,
      supplementLatex: document.supplements?.map((value) => value.canonicalLatex) ?? [],
      detailSearchText: canonicalDetailSearchText(document),
      warnings: [...document.warnings],
      tableResponse: canonicalTableResponse(document),
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
  if (!resultDocument.ok || resultDocument.document.outcomeKind !== 'success') {
    throw new Error('History success entries require native canonical result authority.');
  }

  return {
    id: createId(),
    mode: mode,
    inputLatex,
    resultDocument: resultDocument.document,
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
