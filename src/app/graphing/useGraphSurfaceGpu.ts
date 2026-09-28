import { useEffect, useMemo, useState } from 'react';
import {
  compileGraphExpression,
  loadGraphGpuModule,
  type GraphDocumentV4,
  type GraphGpuModule,
  type GraphRendererFieldFrameV1,
  type GraphViewportV1,
} from '../../lib/graphing';
import { graphParameterEnvironment } from './graph-controller-support';

type Translation =
  | { program: Extract<ReturnType<GraphGpuModule['translateGraphRealPlan']>, { kind: 'real' }>; reason: null }
  | { program: null; reason: string };

/** Vertex budget shared by all GPU surfaces (384 x 384 for one surface). */
const MAXIMUM_SURFACE_RESOLUTION = 384;
const MINIMUM_SURFACE_RESOLUTION = 96;

export type GraphSurfaceGpuPlan = {
  /** Field frame for the Three renderer, or null when nothing is GPU-drawn. */
  frame: GraphRendererFieldFrameV1 | null;
  /** Surface items in the document. */
  candidates: number;
  /** Per-item reasons for surfaces left on the CPU mesh. */
  reasons: string[];
  preciseMode: boolean;
};

/**
 * GPU visual evaluation for `z = f(x, y)` surfaces in the 3D pane. Programs
 * are translated on the main thread from the structured relation; parameters
 * travel as values, so slider moves update uniforms without a worker round
 * trip. The CPU mesh still arrives for picking, trace, Analyze, and export.
 */
export function useGraphSurfaceGpu({ document, enabled, viewport }: {
  document: GraphDocumentV4 | null;
  enabled: boolean;
  viewport: GraphViewportV1;
}): GraphSurfaceGpuPlan {
  const [gpu, setGpu] = useState<GraphGpuModule | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Slider moves replace parameter items but keep relation objects, so a
  // per-relation cache keeps them from recompiling anything.
  const [translations] = useState(() => new WeakMap<object, Translation>());
  const surfaces = useMemo(() => (document?.items ?? []).flatMap((item) => (
    item.kind === 'relation' && item.visible && item.relation.kind === 'real-surface'
      ? [{ itemId: item.itemId, revision: item.source.sourceRevision, relation: item.relation }] : [])), [document]);

  useEffect(() => {
    if (!enabled || surfaces.length === 0 || gpu) return undefined;
    let live = true;
    loadGraphGpuModule().then((module) => { if (live) setGpu(module); })
      .catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [enabled, gpu, surfaces.length]);

  const programs = useMemo(() => {
    if (!gpu) return [];
    return surfaces.map((surface) => {
      const cached = translations.get(surface.relation);
      if (cached) return { ...surface, ...cached };
      const translation = translate(surface);
      translations.set(surface.relation, translation);
      return { ...surface, ...translation };
    });
    function translate(surface: (typeof surfaces)[number]): Translation {
      const compiled = compileGraphExpression({
        planId: `${surface.itemId}.gpu-surface`, sourceRevision: surface.revision, expression: surface.relation.z,
      });
      if (!compiled.ok) return { program: null, reason: 'the surface could not be compiled for the GPU' };
      const program = gpu!.translateGraphRealPlan(compiled.plan);
      if (!('kind' in program)) {
        return { program: null, reason: `${program.reason.replace('unsupported-operator:', '')} is not supported on the GPU` };
      }
      return { program, reason: null };
    }
  }, [gpu, surfaces, translations]);

  const parameters = useMemo(() => (document ? graphParameterEnvironment(document) : {}), [document]);

  return useMemo((): GraphSurfaceGpuPlan => {
    const candidates = surfaces.length;
    if (!enabled) return { frame: null, candidates, reasons: ['GPU rendering is off in Settings'], preciseMode: false };
    if (loadFailed) return { frame: null, candidates, reasons: ['the GPU renderer could not load'], preciseMode: false };
    if (!gpu) return { frame: null, candidates, reasons: [], preciseMode: false };
    const resolution = Math.max(MINIMUM_SURFACE_RESOLUTION,
      Math.min(MAXIMUM_SURFACE_RESOLUTION, Math.floor(MAXIMUM_SURFACE_RESOLUTION / Math.sqrt(Math.max(1, candidates)))));
    const reasons: string[] = [];
    let preciseMode = false;
    const items: GraphRendererFieldFrameV1['items'] = [];
    const used: Record<string, number> = {};
    for (const entry of programs) {
      if (!entry.program) { reasons.push(entry.reason); continue; }
      const unbound = entry.program.parameterNames.find((name) => !(name in parameters));
      if (unbound) { reasons.push(`parameter ${unbound} has no value`); continue; }
      const bounds = entry.relation.bounds ?? viewport;
      const domain = { xMin: bounds.xMin, xMax: bounds.xMax, yMin: bounds.yMin, yMax: bounds.yMax };
      if (!gpu.graphGpuViewportIsFloat32Safe(domain, { width: resolution, height: resolution })) {
        preciseMode = true;
        reasons.push('this domain needs precise CPU rendering');
        continue;
      }
      entry.program.parameterNames.forEach((name) => { used[name] = parameters[name]!; });
      items.push({ itemId: entry.itemId, route: 'real-surface', program: entry.program, surface: { domain, resolution } });
    }
    return { frame: items.length > 0 ? { version: 1, items, parameters: used } : null, candidates, reasons, preciseMode };
  }, [enabled, gpu, loadFailed, parameters, programs, surfaces.length, viewport]);
}
