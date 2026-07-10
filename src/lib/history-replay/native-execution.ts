import { buildGeometryModeRunPayload } from '../geometry/runtime-run';
import { runCalculateMode, type RunCalculateModeRequest } from '../modes/calculate';
import { runCalculusMode, type RunCalculusModeRequest } from '../modes/calculus';
import { runEquationMode, type RunEquationModeRequest } from '../modes/equation';
import { runMatrixMode, type RunMatrixModeRequest } from '../modes/matrix';
import { runTableMode, type RunTableModeRequest } from '../modes/table';
import { runVectorMode, type RunVectorModeRequest } from '../modes/vector';
import { buildStatisticsModeRunPayload } from '../statistics/runtime-run';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import type { HistoryReplayExecution, HistoryReplayWorkspace } from './fixture-contract';

export async function executeHistoryReplayRequest(
  workspace: HistoryReplayWorkspace,
  request: Record<string, unknown>,
): Promise<HistoryReplayExecution> {
  switch (workspace) {
    case 'calculate':
      return { outcome: runCalculateMode(request as RunCalculateModeRequest) };
    case 'equation':
      return { outcome: runEquationMode(request as RunEquationModeRequest) };
    case 'calculus':
      return { outcome: await runCalculusMode(request as RunCalculusModeRequest) };
    case 'matrix':
      return { outcome: runMatrixMode(request as RunMatrixModeRequest) };
    case 'vector':
      return { outcome: runVectorMode(request as RunVectorModeRequest) };
    case 'table': {
      const result = runTableMode(request as RunTableModeRequest);
      return { outcome: result.outcome, tableResponse: result.response };
    }
    case 'trigonometry':
      return { outcome: buildTrigonometryModeRunPayload(request as never).outcome };
    case 'statistics':
      return { outcome: buildStatisticsModeRunPayload(request as never).outcome };
    case 'geometry':
      return { outcome: buildGeometryModeRunPayload(request as never).outcome };
  }
}
