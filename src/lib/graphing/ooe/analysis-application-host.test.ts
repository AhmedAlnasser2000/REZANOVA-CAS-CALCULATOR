import { describe, expect, it } from 'vitest';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import type { GraphAnalysisRequestV1 } from '../contracts';
import { GraphAnalysisApplicationHost } from './analysis-application-host';

const request: GraphAnalysisRequestV1 = {
  version: 1, requestId: 'request.1', workspaceInstanceId: 'workspace.1', documentId: 'document.1',
  revisions: { mathematics: 1, viewport: 1, parameter: 1 },
  items: [{ version: 1, kind: 'relation', itemId: 'line', source: { sourceKind: 'mathlive-latex', sourceLatex: 'x', sourceRevision: 1 }, relation: { kind: 'explicit-y', origin: 'bare-expression', rhs: { mathJson: 'x', freeSymbols: ['x'] } }, visible: true }],
  parameterEnvironment: {}, features: ['root'], maximumTimeMs: 100,
};
const context = (cancelled = false) => ({
  shouldCancel: () => cancelled,
  checkpoint: () => undefined,
  yieldIfBudgetExceeded: async () => undefined,
}) as unknown as OoeRuntimeControlContext;

describe('Graph analysis application host', () => {
  it('uses an independent cooperative fallback when Worker is unavailable', async () => {
    const host = new GraphAnalysisApplicationHost();
    const result = await host.run(request, context());
    expect(result.hostExecution).toMatchObject({ kind: 'fallback', hostId: 'graph-analysis-runtime', isolated: false });
    expect(result.result.evidence[0]).toMatchObject({ feature: 'root', level: 'exact-proved' });
    host.dispose();
  });

  it('honors cancellation before host startup', async () => {
    const host = new GraphAnalysisApplicationHost();
    const result = await host.run(request, context(true));
    expect(result.result.status).toBe('cancelled');
    expect(result.hostExecution).toMatchObject({ kind: 'worker-cancelled', termination: 'hardStop' });
  });
});
