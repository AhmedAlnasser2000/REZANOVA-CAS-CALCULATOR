import { describe, expect, it } from 'vitest';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import { buildOoeJobCommitContextForJob } from '../../lib/ooe/job-launch/job-contract';
import {
  createWorkspaceInstance,
  workspaceInstanceRuntimeContext,
  type WorkspaceInstance,
  type WorkspaceInstanceStateSlot,
} from './workspace-instances';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';

type TestRequest = {
  latex: string;
};

function createInstance(
  workspaceKind: WorkspaceInstance['workspaceKind'],
  order: number,
  surfaceState: WorkspaceInstanceStateSlot,
  navigationRevision = 0,
) {
  return {
    ...createWorkspaceInstance(workspaceKind, order, {
      idFactory: (kind, instanceOrder) => `${kind}.${instanceOrder}`,
      now: () => 1000 + order,
    }),
    navigationRevision,
    surfaceState,
  };
}

function jobFor(instance: WorkspaceInstance, inputRevisionId: string): OoeJobIdentity {
  return {
    jobId: `job.${instance.id}`,
    planId: 'plan.expression.evaluate',
    capabilityId: 'expression.evaluate',
    hostId: 'calculate-worker-runtime',
    nodeId: 'node.expression.evaluate',
    phaseId: 'expression.evaluate',
    inputRevisionId,
    ...workspaceInstanceRuntimeContext(instance),
  };
}

function buildRevision(request: TestRequest) {
  return `input:${request.latex}`;
}

function readRequestFromSurfaceState(surfaceState: WorkspaceInstanceStateSlot) {
  if (
    typeof surfaceState === 'object'
    && surfaceState !== null
    && typeof surfaceState.latex === 'string'
  ) {
    return { latex: surfaceState.latex };
  }
  return null;
}

describe('resolveWorkspaceOriginInputRevision', () => {
  it('uses the live request for legacy jobs without workspace-instance metadata', () => {
    const activeRevision = resolveWorkspaceOriginInputRevision(
      {
        jobId: 'job.legacy',
        planId: 'plan.expression.evaluate',
        capabilityId: 'expression.evaluate',
        hostId: 'calculate-worker-runtime',
        nodeId: 'node.expression.evaluate',
        phaseId: 'expression.evaluate',
        inputRevisionId: 'input:2+2',
      },
      {
        buildInputRevisionId: buildRevision,
        readLiveRequest: () => ({ latex: '2+2' }),
      },
    );

    expect(activeRevision).toBe('input:2+2');
  });

  it('uses the live request for the currently active workspace instance', () => {
    const origin = createInstance('calculate', 1, { latex: 'saved-origin' });

    const activeRevision = resolveWorkspaceOriginInputRevision(
      jobFor(origin, 'input:active-origin'),
      {
        buildInputRevisionId: buildRevision,
        getActiveWorkspaceInstanceRuntimeContext: () => workspaceInstanceRuntimeContext(origin),
        getWorkspaceInstances: () => [origin],
        readLiveRequest: () => ({ latex: 'active-origin' }),
        readRequestFromSurfaceState,
      },
    );

    expect(activeRevision).toBe('input:active-origin');
  });

  it('uses the saved origin surface state for inactive but still-open workspace instances', () => {
    const active = createInstance('equation', 2, { latex: 'active-visible' });
    const origin = createInstance('calculate', 1, { latex: 'origin-saved' });

    const activeRevision = resolveWorkspaceOriginInputRevision(
      jobFor(origin, 'input:origin-saved'),
      {
        buildInputRevisionId: buildRevision,
        getActiveWorkspaceInstanceRuntimeContext: () => workspaceInstanceRuntimeContext(active),
        getWorkspaceInstances: () => [origin, active],
        readLiveRequest: () => ({ latex: 'active-visible' }),
        readRequestFromSurfaceState,
      },
    );

    expect(activeRevision).toBe('input:origin-saved');
  });

  it('makes retargeted or edited origin tabs stale-drop by returning nonmatching revision evidence', () => {
    const active = createInstance('equation', 2, { latex: 'active-visible' });
    const editedOrigin = createInstance('calculate', 1, { latex: 'origin-edited' });
    const launchedJob = jobFor(editedOrigin, 'input:origin-launched');

    const editedContext = buildOoeJobCommitContextForJob(launchedJob, {
      commitPolicy: 'commitLatestOnly',
      activeInputRevisionId: (job) =>
        resolveWorkspaceOriginInputRevision(job, {
          buildInputRevisionId: buildRevision,
          getActiveWorkspaceInstanceRuntimeContext: () => workspaceInstanceRuntimeContext(active),
          getWorkspaceInstances: () => [editedOrigin, active],
          readLiveRequest: () => ({ latex: 'active-visible' }),
          readRequestFromSurfaceState,
        }),
    });

    expect(editedContext.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input:origin-edited',
      commitDecision: 'staleDropped',
      legality: 'staleDrop',
    });

    const retargetedOrigin = createInstance('calculus', 1, { latex: 'origin-launched' }, 1);
    const retargetedContext = buildOoeJobCommitContextForJob(launchedJob, {
      commitPolicy: 'commitLatestOnly',
      activeInputRevisionId: (job) =>
        resolveWorkspaceOriginInputRevision(job, {
          buildInputRevisionId: buildRevision,
          getActiveWorkspaceInstanceRuntimeContext: () => workspaceInstanceRuntimeContext(active),
          getWorkspaceInstances: () => [retargetedOrigin, active],
          readLiveRequest: () => ({ latex: 'active-visible' }),
          readRequestFromSurfaceState,
        }),
    });

    expect(retargetedContext.commitAssessment).toMatchObject({
      activeInputRevisionId: null,
      commitDecision: 'staleDropped',
      legality: 'staleDrop',
    });
  });
});
