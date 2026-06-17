import type { ModeId } from '../../types/calculator';
import type {
  WorkspaceInstanceId,
  WorkspaceInstanceRuntimeContext,
} from '../../types/calculator/workspace-instance-types';
import {
  COMPARTMENT_MANIFEST,
  type CompartmentId,
} from '../../lib/compartments/manifest';
import { MODE_LABELS } from '../../lib/navigation/menu';

export type { WorkspaceInstanceId, WorkspaceInstanceRuntimeContext };
export type WorkspaceKind = ModeId;

export type WorkspaceInstanceStateSlot = Readonly<Record<string, unknown>> | null;

export type WorkspaceInstance = {
  id: WorkspaceInstanceId;
  workspaceKind: WorkspaceKind;
  title: string;
  compartmentId: CompartmentId;
  compartmentLabel: string;
  surfaceLabel: string;
  createdAt: number;
  updatedAt: number;
  lastActivatedAt: number;
  order: number;
  surfaceState: WorkspaceInstanceStateSlot;
  displayState: WorkspaceInstanceStateSlot;
  runtimeState: WorkspaceInstanceStateSlot;
};

export type WorkspaceInstancesState = {
  activeInstanceId: WorkspaceInstanceId;
  instances: WorkspaceInstance[];
  nextOrder: number;
};

export type WorkspaceInstanceFactoryOptions = {
  idFactory?: (workspaceKind: WorkspaceKind, order: number) => WorkspaceInstanceId;
  now?: () => number;
};

export type WorkspaceInstanceStateSlotUpdater =
  (currentState: WorkspaceInstanceStateSlot) => WorkspaceInstanceStateSlot;

export type DuplicateWorkspaceInstanceOptions = WorkspaceInstanceFactoryOptions & {
  surfaceState?: WorkspaceInstanceStateSlot;
  displayState?: WorkspaceInstanceStateSlot;
};

export const DEFAULT_WORKSPACE_KIND: WorkspaceKind = 'calculate';

function defaultWorkspaceInstanceId(workspaceKind: WorkspaceKind, order: number) {
  return `workspace.${workspaceKind}.${order}`;
}

function defaultNow() {
  return Date.now();
}

function resolveFactoryOptions(options: WorkspaceInstanceFactoryOptions = {}) {
  return {
    idFactory: options.idFactory ?? defaultWorkspaceInstanceId,
    now: options.now ?? defaultNow,
  };
}

export function defaultWorkspaceInstanceTitle(workspaceKind: WorkspaceKind) {
  return MODE_LABELS[workspaceKind];
}

export function resolveWorkspaceInstanceCompartment(workspaceKind: WorkspaceKind) {
  const compartmentId: CompartmentId =
    workspaceKind === 'matrix' || workspaceKind === 'vector'
      ? 'linear-algebra'
      : workspaceKind === 'guide'
        ? 'guide'
        : workspaceKind === 'labs'
          ? 'labs'
          : workspaceKind;
  const manifestEntry = COMPARTMENT_MANIFEST.find((entry) => entry.id === compartmentId);
  const compartmentLabel = manifestEntry?.label ?? MODE_LABELS[workspaceKind];
  const surfaceLabel =
    workspaceKind === 'matrix' || workspaceKind === 'vector'
      ? `${MODE_LABELS[workspaceKind]} workspace`
      : `${compartmentLabel} workspace`;

  return {
    compartmentId,
    compartmentLabel,
    surfaceLabel,
  };
}

export function workspaceInstanceRuntimeContext(
  instance: WorkspaceInstance,
): WorkspaceInstanceRuntimeContext {
  return {
    workspaceInstanceId: instance.id,
    workspaceInstanceLabel: instance.title,
    workspaceKind: instance.workspaceKind,
    compartmentId: instance.compartmentId,
    compartmentLabel: instance.compartmentLabel,
  };
}

export function createWorkspaceInstance(
  workspaceKind: WorkspaceKind,
  order: number,
  options: WorkspaceInstanceFactoryOptions & {
    title?: string;
  } = {},
): WorkspaceInstance {
  const { idFactory, now } = resolveFactoryOptions(options);
  const timestamp = now();
  const compartment = resolveWorkspaceInstanceCompartment(workspaceKind);
  const title = options.title?.trim() || defaultWorkspaceInstanceTitle(workspaceKind);

  return {
    id: idFactory(workspaceKind, order),
    workspaceKind,
    title,
    ...compartment,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActivatedAt: timestamp,
    order,
    surfaceState: null,
    displayState: null,
    runtimeState: null,
  };
}

export function createInitialWorkspaceInstancesState(
  options: WorkspaceInstanceFactoryOptions = {},
): WorkspaceInstancesState {
  const instance = createWorkspaceInstance(DEFAULT_WORKSPACE_KIND, 1, options);
  return {
    activeInstanceId: instance.id,
    instances: [instance],
    nextOrder: 2,
  };
}

export function getActiveWorkspaceInstance(state: WorkspaceInstancesState) {
  return state.instances.find((instance) => instance.id === state.activeInstanceId) ?? null;
}

function compareActivation(a: WorkspaceInstance, b: WorkspaceInstance) {
  if (a.lastActivatedAt !== b.lastActivatedAt) {
    return a.lastActivatedAt - b.lastActivatedAt;
  }
  return a.order - b.order;
}

function latestInstance(instances: readonly WorkspaceInstance[]) {
  return [...instances].sort(compareActivation).at(-1) ?? null;
}

function latestInstanceByKind(
  instances: readonly WorkspaceInstance[],
  workspaceKind: WorkspaceKind,
) {
  return latestInstance(instances.filter((instance) => instance.workspaceKind === workspaceKind));
}

function touchActiveInstance(
  instance: WorkspaceInstance,
  timestamp: number,
): WorkspaceInstance {
  return {
    ...instance,
    updatedAt: timestamp,
    lastActivatedAt: timestamp,
  };
}

export function focusWorkspaceInstance(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  options: Pick<WorkspaceInstanceFactoryOptions, 'now'> = {},
): WorkspaceInstancesState {
  if (state.activeInstanceId === instanceId) {
    return state;
  }

  const target = state.instances.find((instance) => instance.id === instanceId);
  if (!target) {
    return state;
  }

  const timestamp = (options.now ?? defaultNow)();
  return {
    ...state,
    activeInstanceId: instanceId,
    instances: state.instances.map((instance) =>
      instance.id === instanceId ? touchActiveInstance(instance, timestamp) : instance),
  };
}

export function createBlankWorkspaceInstance(
  state: WorkspaceInstancesState,
  workspaceKind: WorkspaceKind = DEFAULT_WORKSPACE_KIND,
  options: WorkspaceInstanceFactoryOptions = {},
): WorkspaceInstancesState {
  const instance = createWorkspaceInstance(workspaceKind, state.nextOrder, options);
  return {
    activeInstanceId: instance.id,
    instances: [...state.instances, instance],
    nextOrder: state.nextOrder + 1,
  };
}

export function focusLatestWorkspaceKindOrCreate(
  state: WorkspaceInstancesState,
  workspaceKind: WorkspaceKind,
  options: WorkspaceInstanceFactoryOptions = {},
): WorkspaceInstancesState {
  const existing = latestInstanceByKind(state.instances, workspaceKind);
  if (!existing) {
    return createBlankWorkspaceInstance(state, workspaceKind, options);
  }

  return focusWorkspaceInstance(state, existing.id, options);
}

export function renameWorkspaceInstance(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  title: string,
  options: Pick<WorkspaceInstanceFactoryOptions, 'now'> = {},
): WorkspaceInstancesState {
  const timestamp = (options.now ?? defaultNow)();
  return {
    ...state,
    instances: state.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            title: title.trim() || defaultWorkspaceInstanceTitle(instance.workspaceKind),
            updatedAt: timestamp,
          }
        : instance),
  };
}

export function duplicateWorkspaceInstance(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  options: DuplicateWorkspaceInstanceOptions = {},
): WorkspaceInstancesState {
  const source = state.instances.find((instance) => instance.id === instanceId);
  if (!source) {
    return state;
  }

  const duplicate = {
    ...createWorkspaceInstance(source.workspaceKind, state.nextOrder, {
      ...options,
      title: `${source.title} copy`,
    }),
    surfaceState: Object.prototype.hasOwnProperty.call(options, 'surfaceState')
      ? options.surfaceState ?? null
      : source.surfaceState,
    displayState: Object.prototype.hasOwnProperty.call(options, 'displayState')
      ? options.displayState ?? null
      : source.displayState,
    runtimeState: source.runtimeState,
  };

  return {
    activeInstanceId: duplicate.id,
    instances: [...state.instances, duplicate],
    nextOrder: state.nextOrder + 1,
  };
}

export function clearWorkspaceInstanceState(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  options: Pick<WorkspaceInstanceFactoryOptions, 'now'> = {},
): WorkspaceInstancesState {
  const timestamp = (options.now ?? defaultNow)();
  return {
    ...state,
    instances: state.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            surfaceState: null,
            displayState: null,
            runtimeState: null,
            updatedAt: timestamp,
          }
        : instance),
  };
}

export function updateWorkspaceInstanceSurfaceState(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  surfaceState: WorkspaceInstanceStateSlot,
  options: Pick<WorkspaceInstanceFactoryOptions, 'now'> = {},
): WorkspaceInstancesState {
  const target = state.instances.find((instance) => instance.id === instanceId);
  if (!target) {
    return state;
  }

  const timestamp = (options.now ?? defaultNow)();
  return {
    ...state,
    instances: state.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            surfaceState,
            updatedAt: timestamp,
          }
        : instance),
  };
}

export function updateWorkspaceInstanceDisplayState(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  nextDisplayState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  options: Pick<WorkspaceInstanceFactoryOptions, 'now'> = {},
): WorkspaceInstancesState {
  const target = state.instances.find((instance) => instance.id === instanceId);
  if (!target) {
    return state;
  }

  const displayState = typeof nextDisplayState === 'function'
    ? nextDisplayState(target.displayState)
    : nextDisplayState;
  if (Object.is(displayState, target.displayState)) {
    return state;
  }

  const timestamp = (options.now ?? defaultNow)();
  return {
    ...state,
    instances: state.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            displayState,
            updatedAt: timestamp,
          }
        : instance),
  };
}

export function closeWorkspaceInstance(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
  options: WorkspaceInstanceFactoryOptions = {},
): WorkspaceInstancesState {
  const remaining = state.instances.filter((instance) => instance.id !== instanceId);
  if (remaining.length === state.instances.length) {
    return state;
  }

  if (remaining.length === 0) {
    return createInitialWorkspaceInstancesState(options);
  }

  if (state.activeInstanceId !== instanceId) {
    return {
      ...state,
      instances: remaining,
    };
  }

  const nextActive = latestInstance(remaining) ?? remaining[0];
  return {
    ...state,
    activeInstanceId: nextActive.id,
    instances: remaining,
  };
}

export function closeOtherWorkspaceInstances(
  state: WorkspaceInstancesState,
  instanceId: WorkspaceInstanceId,
): WorkspaceInstancesState {
  const target = state.instances.find((instance) => instance.id === instanceId);
  if (!target) {
    return state;
  }

  return {
    ...state,
    activeInstanceId: target.id,
    instances: [target],
  };
}
