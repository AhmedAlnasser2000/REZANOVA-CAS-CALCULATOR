import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../../../types/calculator';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from '../../ooe/diagnostics/diagnostics-buffer';
import {
  clearOoeJobRegistry,
  listRecentOoeJobs,
} from '../../ooe/job-launch/active-job-registry';
import { canonicalizeOoeJobSnapshot } from '../../ooe/job-launch/job-contract';
import {
  WORKSPACE_RUNTIME_PROBES,
  WORKER_REQUIRED_RUNTIME_PROBES,
  type RuntimeProbeWorkspaceId,
  type WorkspaceRuntimeProbe,
} from './registry';
import floor from './runtime-probe-floor.json';

type RuntimeProbeFloor = {
  version: number;
  workspaceCount: number;
};

const registry: readonly WorkspaceRuntimeProbe[] = WORKSPACE_RUNTIME_PROBES;
const runtimeProbeFloor: RuntimeProbeFloor = floor;

function probeOptions(probe: WorkspaceRuntimeProbe, stale: boolean) {
  const workspaceInstanceId = `runtime-probe-${probe.workspace}`;
  return {
    commitPolicy: 'commitLatestOnly' as const,
    ...(stale ? { activeInputRevisionId: `input.${probe.capabilityId}.stale` } : {}),
    launchTicket: {
      id: `history-${probe.workspace}`,
      historyLaunchOrder: 1,
      workspaceInstanceId,
      workspaceInstanceLabel: `${probe.workspace} probe`,
      workspaceInstanceRevision: 3,
    },
    workspaceInstance: {
      workspaceInstanceId,
      workspaceInstanceLabel: `${probe.workspace} probe`,
      workspaceInstanceRevision: 3,
      workspaceKind: probe.workspace,
    },
    isWorkspaceInstanceOpen: () => true,
  };
}

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('workspace runtime probe registry', () => {
  it('covers every computational launcher leaf and honors the committed floor', () => {
    const launcherWorkspaces = DEFAULT_LAUNCHER_CATEGORIES
      .flatMap((category) => category.entries)
      .map((entry) => entry.id)
      .filter((id): id is RuntimeProbeWorkspaceId => id !== 'labs')
      .sort();
    const registeredWorkspaces = [...registry, ...WORKER_REQUIRED_RUNTIME_PROBES].map((entry) => entry.workspace).sort();

    expect(registeredWorkspaces).toEqual(launcherWorkspaces);
    expect(new Set(registeredWorkspaces).size).toBe(registeredWorkspaces.length);
    expect(runtimeProbeFloor).toEqual({ version: 1, workspaceCount: 11 });
    expect(registeredWorkspaces.length).toBe(runtimeProbeFloor.workspaceCount);
  });

  it('keeps capability identities unique and request snapshots explicit', () => {
    const allProbes = [...registry, ...WORKER_REQUIRED_RUNTIME_PROBES];
    expect(new Set(allProbes.map((entry) => entry.capabilityId)).size).toBe(allProbes.length);
    for (const probe of WORKER_REQUIRED_RUNTIME_PROBES) {
      expect(Object.keys(probe.request).length).toBeGreaterThan(0);
      expect(canonicalizeOoeJobSnapshot(probe.requestSnapshot)).not.toBe('{}');
    }
    for (const probe of registry) {
      expect(Object.keys(probe.request).length).toBeGreaterThan(0);
      expect(canonicalizeOoeJobSnapshot(probe.requestSnapshot)).not.toBe('{}');
      expect(probe.primaryHostId).not.toBe(probe.fallbackHostId);
    }
  });

  for (const probe of WORKER_REQUIRED_RUNTIME_PROBES) {
    it(`${probe.workspace} preserves worker-only execution and drops stale errors`, async () => {
      const response = await probe.executeUnavailable(false);
      expect(response?.document.outcomeKind).toBe('error');
      expect(response?.document.error).toBe('Worker execution is unavailable.');
      expect(listRecentOoeJobs()[0]).toMatchObject({
        capabilityId: probe.capabilityId,
        hostId: probe.primaryHostId,
        workspaceInstanceId: probe.requestSnapshot.instanceId,
        status: 'completed',
      });
      const diagnostic = listOoeDiagnostics().find(record => record.job.hostId === probe.primaryHostId);
      expect(diagnostic?.commitAssessment?.commitDecision).toBe('committed');
      expect(await probe.executeUnavailable(true)).toBeNull();
      expect(listOoeDiagnostics().some(record => record.commitAssessment?.commitDecision === 'staleDropped')).toBe(true);
    });
  }

  for (const probe of registry) {
    it(`${probe.workspace} executes its native OOE shell with commit and history evidence`, async () => {
      const latest = await probe.execute(probeOptions(probe, false));
      const outcome = probe.outcome(latest.payload);
      const shell = latest.ooe.runtimeShell;

      expect(outcome.kind).toBe('success');
      expect(latest.ooe.capabilityId).toBe(probe.capabilityId);
      expect(latest.ooe.hostId).toBe(probe.primaryHostId);
      expect(latest.ooe.job).toMatchObject({
        capabilityId: probe.capabilityId,
        hostId: probe.primaryHostId,
        workspaceInstanceId: `runtime-probe-${probe.workspace}`,
        workspaceInstanceRevision: 3,
      });
      expect(latest.ooe.commitAssessment).toMatchObject({
        commitPolicy: 'commitLatestOnly',
        legality: 'commitAllowed',
        commitDecision: 'committed',
        resultStability: 'stable',
      });
      expect(shell).toMatchObject({
        contractVersion: 1,
        shellId: probe.shellId,
        capabilityId: probe.capabilityId,
        primaryHostId: probe.primaryHostId,
        selectedHostId: probe.fallbackHostId,
        fallbackHostId: probe.fallbackHostId,
        fallbackFromHostId: probe.primaryHostId,
        lifecycle: 'fallback',
        isolated: false,
        launchTicket: {
          id: `history-${probe.workspace}`,
          historyLaunchOrder: 1,
          workspaceInstanceId: `runtime-probe-${probe.workspace}`,
        },
      });

      expect(listRecentOoeJobs()[0]).toMatchObject({
        capabilityId: probe.capabilityId,
        hostId: probe.primaryHostId,
        status: 'completed',
      });
      expect(listOoeDiagnostics().some((record) =>
        record.job.jobId === latest.ooe.job.jobId
        && record.commitAssessment?.commitDecision === 'committed')).toBe(true);

      clearOoeJobRegistry();
      clearOoeDiagnostics();
      const stale = await probe.execute(probeOptions(probe, true));
      expect(stale.ooe.commitAssessment).toMatchObject({
        legality: 'staleDrop',
        commitDecision: 'staleDropped',
        resultStability: 'stale',
      });
      expect(probe.outcome(stale.payload).kind).toBe('success');
    });
  }
});
