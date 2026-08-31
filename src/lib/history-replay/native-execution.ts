import { buildCanonicalGeometryModeRunPayload } from '../geometry/runtime-run';
import { runCalculateCanonicalRuntimeRequest, type RunCalculateModeRequest } from '../modes/calculate';
import { runCalculusCanonicalRuntimeRequest, type RunCalculusModeRequest } from '../modes/calculus';
import { runEquationModeForIsolatedWorker, type RunEquationModeRequest } from '../modes/equation';
import { runMatrixMode, type RunMatrixModeRequest } from '../modes/matrix';
import { runTableMode, type RunTableModeRequest } from '../modes/table';
import { runVectorMode, type RunVectorModeRequest } from '../modes/vector';
import {
  buildCanonicalStatisticsModeRunPayload,
} from '../statistics/runtime-run';
import {
  buildCanonicalTrigonometryModeRunPayload,
} from '../trigonometry/runtime-run';
import { buildCanonicalTableModeResult } from '../modes/table-core';
import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../result-contract';
import type { HistoryReplayExecution, HistoryReplayWorkspace } from './fixture-contract';

export async function executeHistoryReplayRequest(
  workspace: HistoryReplayWorkspace,
  request: Record<string, unknown>,
): Promise<HistoryReplayExecution> {
  switch (workspace) {
    case 'calculate':
      return {
        outcome: runCalculateCanonicalRuntimeRequest({
          kind: 'standard',
          request: request as RunCalculateModeRequest,
        }),
      };
    case 'equation':
      return {
        outcome: (await runEquationModeForIsolatedWorker(
          request as RunEquationModeRequest,
        )).outcome,
      };
    case 'calculus':
      return { outcome: await runCalculusCanonicalRuntimeRequest(request as RunCalculusModeRequest) };
    case 'matrix':
      return { outcome: finalizeCanonicalRuntimeOutcomeFromProducer(runMatrixMode(request as RunMatrixModeRequest), 'Matrix replay') };
    case 'vector':
      return { outcome: finalizeCanonicalRuntimeOutcomeFromProducer(runVectorMode(request as RunVectorModeRequest), 'Vector replay') };
    case 'table': {
      const result = buildCanonicalTableModeResult(runTableMode(request as RunTableModeRequest));
      return { outcome: result.outcome, tableResponse: result.response };
    }
    case 'trigonometry':
      return { outcome: buildCanonicalTrigonometryModeRunPayload(request as never).outcome };
    case 'statistics':
      return { outcome: buildCanonicalStatisticsModeRunPayload(request as never).outcome };
    case 'geometry':
      return { outcome: buildCanonicalGeometryModeRunPayload(request as never).outcome };
  }
}
