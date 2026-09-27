import type { GraphWebglProbeResultV1 } from './gpu/probe';

export type { GraphWebglProbeResultV1 } from './gpu/probe';

/** The Graph GPU module is fetched only when a GPU route or diagnostic needs it. */
export type GraphGpuModule = typeof import('./gpu');

export function loadGraphGpuModule(): Promise<GraphGpuModule> {
  return import('./gpu');
}

export async function probeGraphWebglCapabilities(): Promise<GraphWebglProbeResultV1> {
  const gpu = await loadGraphGpuModule();
  return gpu.runWebglProbe();
}
