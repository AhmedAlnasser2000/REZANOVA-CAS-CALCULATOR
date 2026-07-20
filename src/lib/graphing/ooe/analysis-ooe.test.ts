import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBuiltinOoeHost, getBuiltinOoePlan, validateOoePlan, type OoePlan } from '../../ooe/bridge-schema/ooe-bridge';
import { clearOoeDiagnostics, getLatestOoeDiagnostics } from '../../ooe/diagnostics/diagnostics-buffer';
import { clearOoeJobRegistry } from '../../ooe/job-launch/active-job-registry';
import type { GraphAnalysisRequestV1 } from '../contracts';
import { GraphAnalysisApplicationHost } from './analysis-application-host';
import { prepareGraphAnalyzeOoePilot, runGraphAnalyzeWithOoe } from './analysis-pilot';
import { probeGraphAnalysisRuntime } from './analysis-runtime-probe';

vi.mock('../../ooe/bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ooe/bridge-schema/ooe-bridge')>();
  return { ...actual, getBuiltinOoeHost: vi.fn(), getBuiltinOoePlan: vi.fn(), validateOoePlan: vi.fn() };
});

const request = (): GraphAnalysisRequestV1 => ({
  version: 1, requestId: 'analysis.1', workspaceInstanceId: 'graph-tab.1', documentId: 'graph-document.1',
  revisions: { mathematics: 4, viewport: 2, parameter: 1 },
  items: [{ version: 1, kind: 'relation', itemId: 'curve.1', source: { sourceKind: 'mathlive-latex', sourceLatex: 'x', sourceRevision: 1 }, relation: { kind: 'explicit-y', origin: 'bare-expression', rhs: { mathJson: 'x', freeSymbols: ['x'] } }, visible: true }],
  parameterEnvironment: {}, features: ['root', 'y-intercept'], maximumTimeMs: 250,
});
const plan = (): OoePlan => ({
  id: 'plan.graph.analyze', schemaVersion: 1,
  nodes: [{ id: 'node.graph.analyze', capabilityId: 'graph.analyze', hostId: 'graph-analysis-worker-runtime', phaseId: 'graph.analyze', taskClass: 'explicit', priorityClass: 'userVisible', cancellationPolicy: 'hardStop', commitPolicy: 'commitLatestOnly', threadSafety: 'workerSafe', resultStability: 'draft', solverMode: 'classic', chunkingPolicy: 'none', checkpointPolicy: 'none', streamingPolicy: 'finalOnly', materializationPolicy: 'full', computeTopology: 'local', resourcePolicy: 'normal', dependsOn: [], isTerminalResult: true }],
});

describe('Graph analysis OOE runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks(); clearOoeJobRegistry(); clearOoeDiagnostics();
    vi.mocked(getBuiltinOoeHost).mockResolvedValue({ kind: 'ready', data: { hostId: 'graph-analysis-worker-runtime', hostKind: 'webWorker', threadSafety: 'workerSafe', supportedTaskClasses: ['explicit'], budgetPolicy: 'isolated', cancellationPolicy: 'hardStop', defaultResultStability: 'draft', description: 'Graph analysis test host.' } });
    vi.mocked(getBuiltinOoePlan).mockResolvedValue({ kind: 'ready', data: plan() });
    vi.mocked(validateOoePlan).mockResolvedValue({ kind: 'ready', data: { ok: true, errors: [] } });
  });

  it('registers and runs independently through the cooperative fallback', async () => {
    await expect(prepareGraphAnalyzeOoePilot()).resolves.toEqual({ kind: 'ready', planId: 'plan.graph.analyze' });
    const host = new GraphAnalysisApplicationHost();
    const envelope = await runGraphAnalyzeWithOoe(request(), { host });
    expect(envelope.payload.evidence).toHaveLength(2);
    expect(envelope.ooe).toMatchObject({
      capabilityId: 'graph.analyze',
      graphHostExecution: { hostId: 'graph-analysis-runtime', kind: 'fallback' },
      commitAssessment: { commitDecision: 'committed' },
    });
    expect(getLatestOoeDiagnostics()?.provenance).toMatchObject({ mode: 'graphing', route: 'graph.analyze' });
    host.dispose();
  });

  it('drops stale analysis revisions and exposes a launch-ticket-free runtime probe', async () => {
    const host = new GraphAnalysisApplicationHost();
    const stale = await runGraphAnalyzeWithOoe(request(), { host, activeInputRevisionId: 'input.graph.analyze.newer' });
    expect(stale.ooe.commitAssessment).toMatchObject({ legality: 'staleDrop', commitDecision: 'staleDropped', resultStability: 'stale' });
    const probe = await probeGraphAnalysisRuntime(request(), { host });
    expect(probe).toMatchObject({ ok: true, capabilityId: 'graph.analyze', selectedHostId: 'graph-analysis-runtime', launchTicketPresent: false });
    host.dispose();
  });
});
