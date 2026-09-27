import type { GraphWebglProbeResultV1 } from './gpu/probe';

export type { GraphWebglProbeResultV1 } from './gpu/probe';

export async function probeGraphWebglCapabilities(): Promise<GraphWebglProbeResultV1> {
  const probe = await import('./gpu/probe');
  return probe.runWebglProbe();
}
