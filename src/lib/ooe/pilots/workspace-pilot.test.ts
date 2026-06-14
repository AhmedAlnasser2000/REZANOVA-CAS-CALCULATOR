import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
} from '../diagnostics-buffer';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../job-launch/active-job-registry';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from '../ooe-bridge';
import {
  runWorkspaceWithOoeProvenance,
  type WorkspaceOoeCapabilityId,
  type WorkspaceOoeMode,
} from './workspace-pilot';

vi.mock('../ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

const cases: Array<{
  capabilityId: WorkspaceOoeCapabilityId;
  mode: WorkspaceOoeMode;
  hostId: string;
}> = [
  { capabilityId: 'calculate.workbench', mode: 'calculate', hostId: 'calculate-worker-runtime' },
  { capabilityId: 'calculate.algebraTransform', mode: 'calculate', hostId: 'calculate-worker-runtime' },
  {
    capabilityId: 'calculus.evaluate',
    mode: 'calculus',
    hostId: 'calculus-worker-runtime',
  },
  {
    capabilityId: 'trigonometry.evaluate',
    mode: 'trigonometry',
    hostId: 'trigonometry-worker-runtime',
  },
  { capabilityId: 'statistics.evaluate', mode: 'statistics', hostId: 'statistics-worker-runtime' },
  { capabilityId: 'geometry.evaluate', mode: 'geometry', hostId: 'geometry-worker-runtime' },
  { capabilityId: 'linearAlgebra.matrix', mode: 'matrix', hostId: 'linear-algebra-worker-runtime' },
  { capabilityId: 'linearAlgebra.vector', mode: 'vector', hostId: 'linear-algebra-worker-runtime' },
];

function planFor(capabilityId: WorkspaceOoeCapabilityId, hostId: string): OoePlan {
  return {
    id: `plan.${capabilityId}`,
    schemaVersion: 1,
    nodes: [
      {
        id: `node.${capabilityId}`,
        capabilityId,
        hostId,
        phaseId: capabilityId,
        taskClass: 'explicit',
        priorityClass: 'userVisible',
        cancellationPolicy: 'staleDrop',
        commitPolicy: 'commitLatestOnly',
        threadSafety: 'mainThreadOnly',
        resultStability: 'draft',
        solverMode: 'classic',
        chunkingPolicy: 'none',
        checkpointPolicy: 'none',
        streamingPolicy: 'finalOnly',
        materializationPolicy: 'full',
        computeTopology: 'local',
        resourcePolicy: 'normal',
        dependsOn: [],
        isTerminalResult: true,
      },
    ],
  };
}

describe('OOE workspace provenance pilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOoeJobRegistry();
    clearOoeDiagnostics();
    vi.mocked(getBuiltinOoePlan).mockImplementation(async (planId) => {
      const entry = cases.find(({ capabilityId }) => planId === `plan.${capabilityId}`);
      return {
        kind: 'ready',
        data: entry ? planFor(entry.capabilityId, entry.hostId) : null,
      };
    });
    vi.mocked(validateOoePlan).mockResolvedValue({
      kind: 'ready',
      data: { ok: true, errors: [] },
    });
  });

  it('records coarse provenance for every RS22 executable workspace capability', async () => {
    for (const entry of cases) {
      const routeLabel = `${entry.capabilityId}.test`;
      const result = await runWorkspaceWithOoeProvenance({
        capabilityId: entry.capabilityId,
        mode: entry.mode,
        routeLabel,
        routeSnapshot: { routeLabel },
        screen: entry.mode,
        action: 'evaluate',
        inputSummary: { routeLabel },
        run: () => ({
          kind: 'success' as const,
          title: routeLabel,
          exactLatex: '1',
          warnings: [],
        }),
      });

      expect(result.payload.title).toBe(routeLabel);
      expect(listRecentOoeJobs()[0]).toMatchObject({
        routeLabel,
        status: 'completed',
      });
      expect(getLatestOoeDiagnostics()).toMatchObject({
        routeLabel,
        terminalStatus: 'completed',
        provenance: {
          mode: entry.mode,
          route: routeLabel,
          outputSummary: {
            kind: 'success',
            title: routeLabel,
          },
        },
      });
    }
  });

  it('records failed provenance and rethrows runtime errors', async () => {
    await expect(runWorkspaceWithOoeProvenance({
      capabilityId: 'geometry.evaluate',
      mode: 'geometry',
      routeLabel: 'geometry.failed',
      routeSnapshot: { inputLatex: 'bad' },
      run: () => {
        throw new Error('geometry exploded');
      },
    })).rejects.toThrow('geometry exploded');

    expect(getLatestOoeDiagnostics()).toMatchObject({
      routeLabel: 'geometry.failed',
      terminalStatus: 'failed',
      errorMessage: 'geometry exploded',
      provenance: {
        mode: 'geometry',
        route: 'geometry.failed',
      },
    });
  });
});
