import { validateGraphSampleResult, type GraphSampleRequestV2 } from '../contracts';
import { runGraphSampleWithOoe, type GraphSampleOoeOptions } from './pilot';

export type GraphSamplingRuntimeProbe = {
  ok: boolean;
  capabilityId: 'graph.sample';
  primaryHostId: 'graph-sampling-worker-runtime';
  selectedHostId: string;
  fallbackHostId: 'graph-sampling-runtime';
  workspaceInstanceId: string;
  requestId: string;
  snapshotHash: string;
  commitDecision: string;
  resultStatus: string;
  launchTicketPresent: false;
};

export async function probeGraphSamplingRuntime(
  request: GraphSampleRequestV2,
  options: GraphSampleOoeOptions = {},
): Promise<GraphSamplingRuntimeProbe> {
  const envelope = await runGraphSampleWithOoe(request, options);
  const validation = validateGraphSampleResult(envelope.payload);
  return {
    ok: validation.ok
      && envelope.ooe.runtimeShell.capabilityId === 'graph.sample'
      && envelope.ooe.runtimeShell.launchTicket === undefined,
    capabilityId: 'graph.sample',
    primaryHostId: 'graph-sampling-worker-runtime',
    selectedHostId: envelope.ooe.runtimeShell.selectedHostId,
    fallbackHostId: 'graph-sampling-runtime',
    workspaceInstanceId: request.workspaceInstanceId,
    requestId: request.requestId,
    snapshotHash: envelope.payload.snapshotHash,
    commitDecision: envelope.ooe.commitAssessment.commitDecision,
    resultStatus: envelope.payload.status,
    launchTicketPresent: false,
  };
}
