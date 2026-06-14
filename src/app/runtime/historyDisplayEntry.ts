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
  const variableSubstitutions =
    context.variableSubstitutions
    ?? (outcome.kind === 'success' ? outcome.variableSubstitutions : undefined);

  return {
    id: createId(),
    mode: mode,
    inputLatex,
    resolvedInputLatex: outcome.resolvedInputLatex,
    resultLatex: outcome.exactLatex,
    exactSupplementLatex: outcome.exactSupplementLatex,
    approxText: outcome.approxText,
    ...(mode === 'calculate'
      ? { ...currentCalculateHistoryContext(), ...context }
      : {}),
    ...(mode === 'calculus'
      ? { ...currentCalculusHistoryContext(), ...context }
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
    timestamp: new Date().toISOString(),
  };
}
