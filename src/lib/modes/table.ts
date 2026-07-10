import { buildOoeInputRevisionId, type OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  runTableWithOoePilot,
  type TableHostExecution,
} from '../ooe/pilots/table-pilot';
import {
  buildTableOoeSnapshot,
  runTableModeCooperatively,
  type RunTableModeRequest,
} from './table-core';
import {
  runTableModeViaIsolatedWorker,
  type CreateTableWorker,
} from './worker-clients/table-worker-client';

export {
  buildTableOoeSnapshot,
  runTableMode,
  runTableModeCooperatively,
} from './table-core';
export type {
  RunTableModeRequest,
  TableModeResult,
} from './table-core';

export function buildTableOoeInputRevisionId(request: RunTableModeRequest) {
  return buildOoeInputRevisionId('table.build', buildTableOoeSnapshot(request));
}

export async function runTableModeWithOoePilot(
  request: RunTableModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateTableWorker;
  },
) {
  let hostExecution: TableHostExecution | undefined;
  return runTableWithOoePilot(async (context) => {
    const isolatedResult = await runTableModeViaIsolatedWorker(request, context, {
      createWorker: options?.createWorker,
      fallback: () => runTableModeCooperatively(request, {
        rowsPerBatch: 5,
        shouldCancel: context.shouldCancel,
        onCheckpoint: ({ completedRows, totalRows }) => {
          context.checkpoint(`Table fallback checkpoint: ${completedRows}/${totalRows} row(s) prepared.`);
        },
        yieldIfBudgetExceeded: context.yieldIfBudgetExceeded,
      }),
    });
    hostExecution = isolatedResult.hostExecution;
    return isolatedResult.payload;
  }, buildTableOoeSnapshot(request), options, () => hostExecution);
}
