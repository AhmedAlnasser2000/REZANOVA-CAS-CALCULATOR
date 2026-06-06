import { describe, expect, it } from 'vitest';
import {
  buildOoeRuntimeShellEvidence,
  runtimeShellEvidenceLines,
} from './runtime-shell-contract';

describe('OOE runtime shell contract', () => {
  it('normalizes worker host evidence', () => {
    expect(buildOoeRuntimeShellEvidence({
      shellId: 'equation-worker-shell',
      capabilityId: 'equation.solve',
      primaryHostId: 'equation-worker-runtime',
      fallbackHostId: 'equation-runtime',
      hostExecution: {
        kind: 'worker',
        hostId: 'equation-worker-runtime',
        isolated: true,
        terminalStatus: 'completed',
      },
    })).toMatchObject({
      contractVersion: 1,
      shellId: 'equation-worker-shell',
      lifecycle: 'completed',
      selectedHostId: 'equation-worker-runtime',
      isolated: true,
    });
  });

  it('normalizes fallback and launch-ticket evidence separately', () => {
    const evidence = buildOoeRuntimeShellEvidence({
      shellId: 'table-worker-shell',
      capabilityId: 'table.build',
      primaryHostId: 'table-worker-runtime',
      fallbackHostId: 'table-runtime',
      hostExecution: {
        kind: 'fallback',
        hostId: 'table-runtime',
        isolated: false,
        fallbackFromHostId: 'table-worker-runtime',
        reason: 'worker-unavailable',
      },
      launchTicket: {
        id: 'ticket-1',
        historyLaunchOrder: 42,
      },
    });

    expect(evidence).toMatchObject({
      lifecycle: 'fallback',
      selectedHostId: 'table-runtime',
      fallbackFromHostId: 'table-worker-runtime',
      fallbackReason: 'worker-unavailable',
      launchTicket: {
        id: 'ticket-1',
        historyLaunchOrder: 42,
      },
    });
    expect(runtimeShellEvidenceLines(evidence)).toContain(
      'Fallback: table-worker-runtime -> table-runtime (worker-unavailable)',
    );
    expect(runtimeShellEvidenceLines(evidence)).toContain('Launch ticket: ticket-1 order 42');
  });

  it('normalizes hard-stop cancellation evidence', () => {
    expect(buildOoeRuntimeShellEvidence({
      shellId: 'equation-worker-shell',
      capabilityId: 'equation.solve',
      primaryHostId: 'equation-worker-runtime',
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: 'equation-worker-runtime',
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
      },
    })).toMatchObject({
      lifecycle: 'cancelled',
      termination: 'hardStop',
    });
  });
});
