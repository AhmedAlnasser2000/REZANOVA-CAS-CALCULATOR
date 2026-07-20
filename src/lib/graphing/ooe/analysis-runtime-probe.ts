import type { GraphAnalysisRequestV1 } from '../contracts';
import { validateGraphAnalysisResult } from '../analysis/validation';
import { runGraphAnalyzeWithOoe, type GraphAnalyzeOoeOptions } from './analysis-pilot';

export async function probeGraphAnalysisRuntime(request: GraphAnalysisRequestV1, options: GraphAnalyzeOoeOptions = {}) {
  const envelope = await runGraphAnalyzeWithOoe(request, options);
  const validation = validateGraphAnalysisResult(envelope.payload);
  return {
    ok: validation.ok && envelope.ooe.runtimeShell.capabilityId === 'graph.analyze' && envelope.ooe.runtimeShell.launchTicket === undefined,
    capabilityId: 'graph.analyze' as const,
    primaryHostId: 'graph-analysis-worker-runtime' as const,
    selectedHostId: envelope.ooe.runtimeShell.selectedHostId,
    fallbackHostId: 'graph-analysis-runtime' as const,
    workspaceInstanceId: request.workspaceInstanceId,
    requestId: request.requestId,
    commitDecision: envelope.ooe.commitAssessment.commitDecision,
    resultStatus: envelope.payload.status,
    evidenceCount: envelope.payload.evidence.length,
    launchTicketPresent: false as const,
  };
}
