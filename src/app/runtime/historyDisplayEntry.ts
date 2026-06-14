import {
  canonicalizeCalculusMode,
} from '../../lib/calculus/calculus-identity';
import { createId } from '../logic/appUtils';
import type {
  DisplayOutcome,
  GeometryScreen,
  HistoryEntry,
  ModeId,
  StatisticsScreen,
  TrigScreen,
} from '../../types/calculator';

type SuccessfulDisplayOutcome = Extract<DisplayOutcome, { kind: 'success' }>;

export type CommitHistoryDisplayContext = Partial<Pick<
  HistoryEntry,
  | 'calculateScreen'
  | 'calculateSeed'
  | 'calculusScreen'
  | 'calculusSeed'
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
  | 'equationSolveTarget'
  | 'equationAnswerMode'
  | 'equationDomainIntent'
  | 'complexExactForm'
  | 'answerDomain'
  | 'solutionKind'
  | 'numericInterval'
  | 'variableSubstitutions'
>> & {
  historyTicketId?: string | null;
  historyLaunchOrder?: number;
  suppressDisplayCommit?: boolean;
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
  const canonicalMode = canonicalizeCalculusMode(mode);
  const variableSubstitutions =
    context.variableSubstitutions
    ?? (outcome.kind === 'success' ? outcome.variableSubstitutions : undefined);

  return {
    id: createId(),
    mode: canonicalMode,
    inputLatex,
    resolvedInputLatex: outcome.resolvedInputLatex,
    resultLatex: outcome.exactLatex,
    exactSupplementLatex: outcome.exactSupplementLatex,
    approxText: outcome.approxText,
    ...(canonicalMode === 'calculate'
      ? { ...currentCalculateHistoryContext(), ...context }
      : {}),
    ...(canonicalMode === 'calculus'
      ? { ...currentCalculusHistoryContext(), ...context }
      : {}),
    ...(canonicalMode === 'geometry'
      ? {
          geometryScreen: context.geometryScreen ?? context.geometrySeed?.screen ?? geometryScreen,
          ...(context.geometrySeed ? { geometrySeed: context.geometrySeed } : {}),
        }
      : {}),
    ...(canonicalMode === 'trigonometry'
      ? {
          trigScreen: context.trigScreen ?? context.trigSeed?.screen ?? trigScreen,
          ...(context.trigSeed ? { trigSeed: context.trigSeed } : {}),
        }
      : {}),
    ...(canonicalMode === 'statistics'
      ? {
          statisticsScreen: context.statisticsScreen ?? context.statisticsSeed?.screen ?? statisticsScreen,
          ...(context.statisticsSeed ? { statisticsSeed: context.statisticsSeed } : {}),
        }
      : {}),
    ...(canonicalMode === 'matrix' && context.matrixSeed
      ? { matrixSeed: context.matrixSeed }
      : {}),
    ...(canonicalMode === 'vector' && context.vectorSeed
      ? { vectorSeed: context.vectorSeed }
      : {}),
    ...(canonicalMode === 'equation' && context.equationSolveTarget
      ? { equationSolveTarget: context.equationSolveTarget }
      : {}),
    ...(canonicalMode === 'equation' && context.equationAnswerMode
      ? { equationAnswerMode: context.equationAnswerMode }
      : {}),
    ...(canonicalMode === 'equation' && context.equationDomainIntent
      ? { equationDomainIntent: context.equationDomainIntent }
      : {}),
    ...(canonicalMode === 'equation' && context.complexExactForm
      ? { complexExactForm: context.complexExactForm }
      : {}),
    ...(canonicalMode === 'equation' && (context.answerDomain ?? outcome.answerDomain)
      ? { answerDomain: context.answerDomain ?? outcome.answerDomain }
      : {}),
    ...(canonicalMode === 'equation' && (context.solutionKind ?? outcome.solutionKind)
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
    timestamp: new Date().toISOString(),
  };
}
