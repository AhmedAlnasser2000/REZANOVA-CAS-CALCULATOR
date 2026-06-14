import {
  getBuiltinOoeHost,
  getBuiltinOoePlan,
  OOE_DESKTOP_UNAVAILABLE_REASON,
  type OoeBuiltinHostDescriptor,
  type OoeNode,
} from '../bridge-schema/ooe-bridge';
import type { OoePilotDefinition } from './runtime-envelope';

export type OoeHostAdapterStatus =
  | {
      kind: 'ready';
      hostId: string;
      descriptor: OoeBuiltinHostDescriptor;
    }
  | {
      kind: 'unavailable';
      hostId: string;
      reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON;
    }
  | {
      kind: 'missing-host';
      hostId: string;
    }
  | {
      kind: 'incompatible-host';
      hostId: string;
      descriptor: OoeBuiltinHostDescriptor;
      unsupportedTaskClasses: string[];
    }
  | {
      kind: 'bridge-error';
      hostId: string;
      message: string;
    };

export type OoeHostAdapterDiagnostics = {
  status: OoeHostAdapterStatus['kind'];
  hostId: string;
  hostKind?: string;
  threadSafety?: string;
  supportedTaskClasses?: string[];
  budgetPolicy?: string;
  cancellationPolicy?: string;
  defaultResultStability?: string;
  description?: string;
  unsupportedTaskClasses?: string[];
  message?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function nodesForHost(definition: OoePilotDefinition, nodes: OoeNode[]) {
  return nodes.filter((node) =>
    node.hostId === definition.hostId
    && node.capabilityId === definition.capabilityId);
}

function unsupportedTaskClasses(
  definition: OoePilotDefinition,
  descriptor: OoeBuiltinHostDescriptor,
  nodes: OoeNode[],
) {
  const supported = new Set(descriptor.supportedTaskClasses);
  return Array.from(new Set(
    nodesForHost(definition, nodes)
      .map((node) => node.taskClass)
      .filter((taskClass) => !supported.has(taskClass)),
  )).sort();
}

export async function resolveOoeHostAdapter(
  definition: OoePilotDefinition,
): Promise<OoeHostAdapterStatus> {
  try {
    const hostResult = await getBuiltinOoeHost(definition.hostId);

    if (hostResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        hostId: definition.hostId,
        reason: hostResult.reason,
      };
    }

    if (!hostResult.data) {
      return {
        kind: 'missing-host',
        hostId: definition.hostId,
      };
    }

    const planResult = await getBuiltinOoePlan(definition.planId);
    if (planResult.kind === 'ready' && planResult.data) {
      const unsupported = unsupportedTaskClasses(
        definition,
        hostResult.data,
        planResult.data.nodes,
      );
      if (unsupported.length > 0) {
        return {
          kind: 'incompatible-host',
          hostId: definition.hostId,
          descriptor: hostResult.data,
          unsupportedTaskClasses: unsupported,
        };
      }
    }

    return {
      kind: 'ready',
      hostId: definition.hostId,
      descriptor: hostResult.data,
    };
  } catch (error) {
    return {
      kind: 'bridge-error',
      hostId: definition.hostId,
      message: errorMessage(error),
    };
  }
}

export function summarizeOoeHostAdapterStatus(
  status: OoeHostAdapterStatus,
): OoeHostAdapterDiagnostics {
  if ('descriptor' in status) {
    return {
      status: status.kind,
      hostId: status.hostId,
      hostKind: status.descriptor.hostKind,
      threadSafety: status.descriptor.threadSafety,
      supportedTaskClasses: [...status.descriptor.supportedTaskClasses],
      budgetPolicy: status.descriptor.budgetPolicy,
      cancellationPolicy: status.descriptor.cancellationPolicy,
      defaultResultStability: status.descriptor.defaultResultStability,
      description: status.descriptor.description,
      unsupportedTaskClasses: status.kind === 'incompatible-host'
        ? [...status.unsupportedTaskClasses]
        : undefined,
    };
  }

  return {
    status: status.kind,
    hostId: status.hostId,
    message: status.kind === 'unavailable'
      ? status.reason
      : status.kind === 'bridge-error'
        ? status.message
        : undefined,
  };
}
