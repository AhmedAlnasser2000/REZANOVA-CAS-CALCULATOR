import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getBuiltinOoeHost,
  getBuiltinOoePlan,
  type OoeBuiltinHostDescriptor,
  type OoePlan,
} from '../bridge-schema/ooe-bridge';
import {
  resolveOoeHostAdapter,
  summarizeOoeHostAdapterStatus,
} from './host-adapter';
import type { OoePilotDefinition } from './runtime-envelope';

vi.mock('../bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bridge-schema/ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoeHost: vi.fn(),
    getBuiltinOoePlan: vi.fn(),
  };
});

const definition: OoePilotDefinition = {
  planId: 'plan.expression.evaluate',
  capabilityId: 'expression.evaluate',
  hostId: 'expression-runtime',
  nodeId: 'node.expression.evaluate',
  phaseId: 'expression.evaluate',
};

const host: OoeBuiltinHostDescriptor = {
  hostId: 'expression-runtime',
  hostKind: 'mainThreadTypeScript',
  threadSafety: 'mainThreadOnly',
  supportedTaskClasses: ['explicit'],
  budgetPolicy: 'unbudgeted',
  cancellationPolicy: 'staleDrop',
  defaultResultStability: 'draft',
  description: 'Current main-thread TypeScript host for Calculate expression work.',
};

function plan(taskClass: OoePlan['nodes'][number]['taskClass'] = 'explicit'): OoePlan {
  return {
    id: definition.planId,
    schemaVersion: 1,
    nodes: [
      {
        id: definition.nodeId,
        capabilityId: definition.capabilityId,
        hostId: definition.hostId,
        phaseId: definition.phaseId,
        taskClass,
        priorityClass: 'userBlocking',
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

describe('OOE host adapter resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ready when the host exists and supports the plan task class', async () => {
    vi.mocked(getBuiltinOoeHost).mockResolvedValue({
      kind: 'ready',
      data: host,
    });
    vi.mocked(getBuiltinOoePlan).mockResolvedValue({
      kind: 'ready',
      data: plan(),
    });

    const status = await resolveOoeHostAdapter(definition);

    expect(status).toEqual({
      kind: 'ready',
      hostId: 'expression-runtime',
      descriptor: host,
    });
    expect(summarizeOoeHostAdapterStatus(status)).toMatchObject({
      status: 'ready',
      hostId: 'expression-runtime',
      hostKind: 'mainThreadTypeScript',
      budgetPolicy: 'unbudgeted',
    });
  });

  it('reports unavailable and missing-host as fail-open metadata', async () => {
    vi.mocked(getBuiltinOoeHost).mockResolvedValueOnce({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    await expect(resolveOoeHostAdapter(definition)).resolves.toEqual({
      kind: 'unavailable',
      hostId: 'expression-runtime',
      reason: 'desktop-runtime-unavailable',
    });

    vi.mocked(getBuiltinOoeHost).mockResolvedValueOnce({
      kind: 'ready',
      data: null,
    });
    await expect(resolveOoeHostAdapter(definition)).resolves.toEqual({
      kind: 'missing-host',
      hostId: 'expression-runtime',
    });
  });

  it('reports incompatible-host when a plan node uses an unsupported task class', async () => {
    vi.mocked(getBuiltinOoeHost).mockResolvedValue({
      kind: 'ready',
      data: host,
    });
    vi.mocked(getBuiltinOoePlan).mockResolvedValue({
      kind: 'ready',
      data: plan('heavy'),
    });

    const status = await resolveOoeHostAdapter(definition);

    expect(status).toEqual({
      kind: 'incompatible-host',
      hostId: 'expression-runtime',
      descriptor: host,
      unsupportedTaskClasses: ['heavy'],
    });
    expect(summarizeOoeHostAdapterStatus(status)).toMatchObject({
      status: 'incompatible-host',
      unsupportedTaskClasses: ['heavy'],
    });
  });

  it('reports bridge-error without throwing', async () => {
    vi.mocked(getBuiltinOoeHost).mockRejectedValue(new Error('invoke failed'));

    await expect(resolveOoeHostAdapter(definition)).resolves.toEqual({
      kind: 'bridge-error',
      hostId: 'expression-runtime',
      message: 'invoke failed',
    });
  });
});
