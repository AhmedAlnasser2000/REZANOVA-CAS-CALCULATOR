export type OoeRuntimeShellLifecycle =
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'fallback'
  | 'stale';

export type OoeRuntimeShellHostExecution = {
  kind?: string;
  hostId?: string;
  isolated?: boolean;
  terminalStatus?: string;
  fallbackFromHostId?: string;
  reason?: string;
  fallbackReason?: string;
  termination?: string;
};

export type OoeRuntimeShellLaunchTicketEvidence = {
  id: string;
  historyLaunchOrder: number;
};

export type OoeRuntimeShellEvidence = {
  contractVersion: 1;
  shellId: string;
  capabilityId: string;
  primaryHostId: string;
  selectedHostId: string;
  fallbackHostId?: string;
  lifecycle: OoeRuntimeShellLifecycle;
  isolated: boolean;
  hostStatus?: string;
  fallbackFromHostId?: string;
  fallbackReason?: string;
  termination?: string;
  launchTicket?: OoeRuntimeShellLaunchTicketEvidence;
};

type BuildRuntimeShellEvidenceInput = {
  shellId: string;
  capabilityId: string;
  primaryHostId: string;
  fallbackHostId?: string;
  lifecycle?: OoeRuntimeShellLifecycle;
  hostExecution?: OoeRuntimeShellHostExecution;
  launchTicket?: OoeRuntimeShellLaunchTicketEvidence;
};

function lifecycleFromHostExecution(
  hostExecution: OoeRuntimeShellHostExecution | undefined,
  fallbackLifecycle: OoeRuntimeShellLifecycle,
): OoeRuntimeShellLifecycle {
  if (!hostExecution) {
    return fallbackLifecycle;
  }

  if (hostExecution.kind === 'fallback') {
    return 'fallback';
  }

  switch (hostExecution.terminalStatus) {
    case 'cancelled':
      return 'cancelled';
    case 'failed':
      return 'failed';
    case 'fallback':
      return 'fallback';
    case 'completed':
      return 'completed';
    default:
      return fallbackLifecycle;
  }
}

export function buildOoeRuntimeShellEvidence({
  shellId,
  capabilityId,
  primaryHostId,
  fallbackHostId,
  lifecycle = 'completed',
  hostExecution,
  launchTicket,
}: BuildRuntimeShellEvidenceInput): OoeRuntimeShellEvidence {
  return {
    contractVersion: 1,
    shellId,
    capabilityId,
    primaryHostId,
    selectedHostId: hostExecution?.hostId ?? primaryHostId,
    fallbackHostId,
    lifecycle: lifecycleFromHostExecution(hostExecution, lifecycle),
    isolated: Boolean(hostExecution?.isolated),
    hostStatus: hostExecution?.kind,
    fallbackFromHostId: hostExecution?.fallbackFromHostId,
    fallbackReason: hostExecution?.reason ?? hostExecution?.fallbackReason,
    termination: hostExecution?.termination,
    launchTicket,
  };
}

export function runtimeShellEvidenceLines(evidence?: OoeRuntimeShellEvidence) {
  if (!evidence) {
    return [];
  }

  const lines = [
    `Runtime shell: ${evidence.shellId} (${evidence.lifecycle})`,
    `Host: ${evidence.selectedHostId}${evidence.isolated ? ' isolated' : ''}`,
  ];

  if (evidence.fallbackFromHostId) {
    lines.push(
      `Fallback: ${evidence.fallbackFromHostId} -> ${evidence.selectedHostId}`
        + (evidence.fallbackReason ? ` (${evidence.fallbackReason})` : ''),
    );
  }

  if (evidence.termination) {
    lines.push(`Termination: ${evidence.termination}`);
  }

  if (evidence.launchTicket) {
    lines.push(
      `Launch ticket: ${evidence.launchTicket.id} order ${evidence.launchTicket.historyLaunchOrder}`,
    );
  }

  return lines;
}
