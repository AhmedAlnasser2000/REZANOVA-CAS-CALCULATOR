import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  compileGraphExpression,
  defaultGraphItemPresentation,
  loadGraphGpuModule,
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphDocumentV4,
  type GraphGpuModule,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
} from '../../lib/graphing';
import { graphParameterEnvironment } from './graph-controller-support';

type Layer = NonNullable<ReturnType<GraphGpuModule['createGraphGpuFieldLayer']>>;
type RealFieldProgram = Extract<ReturnType<GraphGpuModule['buildGraphGpuRealFieldProgram']>, { kind: 'real' }>;
type LocusFieldProgram = Extract<ReturnType<GraphGpuModule['buildGraphGpuComplexLocusProgram']>, { kind: 'complex' }>;
/** Real implicit fields and complex loci share the same two passes; only the clause function differs. */
type FieldProgram = RealFieldProgram | LocusFieldProgram;
type Candidate = {
  itemId: string; program: FieldProgram | null; reason: string | null;
  /** z = f(x, y) drawn as a height map with the domain it is sampled on. */
  surface?: { bounds: { xMin: number; xMax: number; yMin: number; yMax: number } | null };
};
type SurfaceRange = { minimum: number; maximum: number };

export type GraphRealFieldRendererStatus = {
  /** Implicit/inequality items and real surfaces in the document. */
  candidates: number;
  /** Items currently drawn by the GPU. */
  gpuItems: number;
  /** Per-item reasons for items left on the CPU renderer. */
  reasons: string[];
};

function clausesOf(relation: Extract<GraphDocumentV4['items'][number], { kind: 'relation' }>['relation']) {
  if (relation.kind === 'implicit-equality') return [{ left: relation.left, operator: '=' as const, right: relation.right }];
  if (relation.kind === 'inequality') return [{ left: relation.left, operator: relation.operator, right: relation.right }];
  if (relation.kind === 'chained-inequality') {
    return relation.operators.map((operator, index) => ({
      left: relation.operands[index]!, operator, right: relation.operands[index + 1]!,
    }));
  }
  if (relation.kind === 'complex-locus') return relation.clauses.map((clause) => ({ left: clause.left, operator: clause.operator, right: clause.right }));
  return null;
}

/** `real` draws implicit fields, surfaces and loci (the Real pane shows loci at x = Re z, y = Im z); `complex-plane` draws loci only. */
export type GraphRealFieldGpuScope = 'real' | 'complex-plane';

function gpuCandidate(relation: Extract<GraphDocumentV4['items'][number], { kind: 'relation' }>['relation'], scope: GraphRealFieldGpuScope) {
  if (scope === 'complex-plane') return relation.kind === 'complex-locus';
  return clausesOf(relation) !== null || relation.kind === 'real-surface';
}

function cssColorToRgb(color: string): [number, number, number] {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return [0.35, 0.65, 1];
  context.fillStyle = '#000'; context.fillStyle = color;
  const normalized = context.fillStyle;
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/iu.exec(normalized);
  if (hex) return [parseInt(hex[1]!, 16) / 255, parseInt(hex[2]!, 16) / 255, parseInt(hex[3]!, 16) / 255];
  const rgb = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/u.exec(normalized);
  return rgb ? [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255] : [0.35, 0.65, 1];
}

/**
 * GPU visual evaluation for real implicit and inequality relations in the 2D
 * pane. The GPU draws only; the CPU implicit sampler still produces the scene
 * that trace, Analyze, export, and "uncertain region" evidence read. Items the
 * GPU cannot draw faithfully stay on the SVG renderer with a stated reason.
 */
export function useGraphRealFieldGpu({ document, enabled, getSlot, presentation, scope = 'real', surfaceRanges }: {
  document: GraphDocumentV4 | null;
  enabled: boolean;
  getSlot: () => HTMLElement | null;
  presentation: GraphRendererPresentationFrame;
  scope?: GraphRealFieldGpuScope;
  /** z range of each surface's CPU mesh; a surface is drawn only once its mesh exists. */
  surfaceRanges: ReadonlyMap<string, SurfaceRange>;
}) {
  const [gpu, setGpu] = useState<GraphGpuModule | null>(null);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [runtimeReason, setRuntimeReason] = useState<string | null>(null);
  const [preciseMode, setPreciseMode] = useState(false);
  // Items whose GPU program failed to compile or draw on this device: they
  // return to the SVG renderer instead of disappearing.
  const [drawFailures, setDrawFailures] = useState<ReadonlyMap<string, string>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scaleRef = useRef({ scale: 1 });
  const hasCandidates = Boolean(document?.items.some((item) => item.kind === 'relation' && item.visible
    && gpuCandidate(item.relation, scope)));

  useEffect(() => {
    if (!enabled || !hasCandidates || gpu) return undefined;
    let live = true;
    loadGraphGpuModule().then((module) => { if (live) setGpu(module); })
      .catch(() => { if (live) setRuntimeReason('the GPU renderer could not load'); });
    return () => { live = false; };
  }, [enabled, gpu, hasCandidates]);

  useEffect(() => {
    const slot = getSlot();
    if (!enabled || !gpu || !slot) return undefined;
    const canvas = window.document.createElement('canvas');
    canvas.className = 'graph-real-gpu-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    slot.replaceChildren(canvas);
    canvasRef.current = canvas;
    const created = gpu.createGraphGpuFieldLayer(canvas, {
      onContextLost: () => setRuntimeReason('the graphics context was lost'),
      onContextRestored: () => setRuntimeReason(null),
    }, { preserveDrawingBuffer: true });
    queueMicrotask(() => {
      if (created) { setLayer(created); setRuntimeReason(null); } else setRuntimeReason('WebGL2 is unavailable');
    });
    return () => { created?.dispose(); canvas.remove(); canvasRef.current = null; setLayer(null); };
  }, [enabled, getSlot, gpu]);

  const parameters = useMemo(() => (document ? graphParameterEnvironment(document) : {}), [document]);
  const candidates = useMemo((): Candidate[] => {
    if (!document || !gpu) return [];
    return document.items.flatMap((item): Candidate[] => {
      if (item.kind !== 'relation' || !item.visible || !gpuCandidate(item.relation, scope)) return [];
      const revision = item.source.sourceRevision;
      if (item.relation.kind === 'complex-locus') {
        // Loci are real functions of z = x + iy, so their sides compile with the complex translator.
        const clauses = item.relation.clauses;
        const program = gpu.buildGraphGpuComplexLocusProgram(
          clauses.map((clause) => ({ left: clause.left.mathJson, right: clause.right.mathJson, operator: clause.operator })),
          { key: `${item.itemId}@${revision}:locus`, fillsRegion: clauses.some((clause) => clause.operator !== '=') },
        );
        if (!('kind' in program)) {
          return [{ itemId: item.itemId, program: null, reason: `${program.reason.replace('unsupported-operator:', '')} is not supported on the GPU` }];
        }
        const unbound = program.parameterNames.find((name) => !(name in parameters));
        return [{ itemId: item.itemId, program: unbound ? null : program, reason: unbound ? `parameter ${unbound} has no value` : null }];
      }
      if (item.relation.kind === 'real-surface') {
        const height = compileGraphExpression({ planId: `${item.itemId}.gpu.surface`, sourceRevision: revision, expression: item.relation.z });
        const zero = compileGraphExpression({ planId: `${item.itemId}.gpu.zero`, sourceRevision: revision, expression: { mathJson: 0, freeSymbols: [] } });
        const surface = { bounds: item.relation.bounds ?? null };
        if (!height.ok || !zero.ok) return [{ itemId: item.itemId, program: null, reason: 'the expression could not be compiled for the GPU', surface }];
        const program = gpu.buildGraphGpuRealFieldProgram([{ left: height.plan, right: zero.plan, operator: '=' }], {
          key: `${item.itemId}@${revision}:surface`, fillsRegion: false,
        });
        if (!('kind' in program)) {
          return [{ itemId: item.itemId, program: null, reason: `${program.reason.replace('unsupported-operator:', '')} is not supported on the GPU`, surface }];
        }
        const unbound = program.parameterNames.find((name) => !(name in parameters));
        return [{ itemId: item.itemId, program: unbound ? null : program, reason: unbound ? `parameter ${unbound} has no value` : null, surface }];
      }
      const clauses = clausesOf(item.relation);
      if (!clauses) return [];
      const plans = [];
      for (const [index, clause] of clauses.entries()) {
        const left = compileGraphExpression({ planId: `${item.itemId}.gpu.${index}.left`, sourceRevision: revision, expression: clause.left });
        const right = compileGraphExpression({ planId: `${item.itemId}.gpu.${index}.right`, sourceRevision: revision, expression: clause.right });
        if (!left.ok || !right.ok) return [{ itemId: item.itemId, program: null, reason: 'the expression could not be compiled for the GPU' }];
        plans.push({ left: left.plan, right: right.plan, operator: clause.operator });
      }
      const program = gpu.buildGraphGpuRealFieldProgram(plans, {
        key: `${item.itemId}@${revision}`, fillsRegion: item.relation.kind !== 'implicit-equality',
      });
      if (!('kind' in program)) {
        return [{ itemId: item.itemId, program: null, reason: `${program.reason.replace('unsupported-operator:', '')} is not supported on the GPU` }];
      }
      const unbound = program.parameterNames.find((name) => !(name in parameters));
      return [{ itemId: item.itemId, program: unbound ? null : program, reason: unbound ? `parameter ${unbound} has no value` : null }];
    });
  }, [document, gpu, parameters, scope]);

  const active = enabled && Boolean(layer) && !runtimeReason && !preciseMode;
  const suppressed = useMemo(() => new Set(active
    ? candidates.filter((candidate) => candidate.program && !drawFailures.has(candidate.program.key)
      && (!candidate.surface || surfaceRanges.has(candidate.itemId)))
      .map((candidate) => candidate.itemId) : []), [active, candidates, drawFailures, surfaceRanges]);

  const status: GraphRealFieldRendererStatus = useMemo(() => {
    const count = document?.items.filter((item) => item.kind === 'relation' && item.visible && gpuCandidate(item.relation, scope)).length ?? 0;
    const reasons = !enabled ? ['GPU rendering is off in Settings']
      : runtimeReason ? [runtimeReason]
        : preciseMode ? ['deep zoom uses precise CPU rendering']
          : !layer ? ['starting the GPU renderer']
            : [
              ...candidates.flatMap((candidate) => (candidate.reason ? [candidate.reason] : [])),
              ...[...drawFailures.values()].map((reason) => `GPU draw failed (${reason})`),
            ];
    return { candidates: count, gpuItems: suppressed.size, reasons };
  }, [candidates, document, drawFailures, enabled, layer, preciseMode, runtimeReason, scope, suppressed]);

  const styles = useMemo(() => {
    const byItem = new Map(presentation.items.map((entry) => [entry.itemId, entry.presentation]));
    const colorVisionMode = presentation.version === 2 ? presentation.colorVisionMode : 'standard';
    const luminous = presentation.version === 2 && presentation.theme === 'luminous';
    return new Map(candidates.map((candidate, index) => {
      const style = normalizeGraphItemPresentation(byItem.get(candidate.itemId) ?? defaultGraphItemPresentation(index));
      return [candidate.itemId, {
        color: cssColorToRgb(resolveGraphPresentationColor(style, colorVisionMode)),
        strokeOpacity: style.strokeOpacity,
        regionOpacity: style.regionOpacity,
        lineWidth: style.strokeWidth === 'thin' ? 1.5 : style.strokeWidth === 'strong' ? 3 : 2.25,
        strokeStyle: style.stroke === 'dashed' ? 1 : style.stroke === 'dotted' ? 2 : 0,
        halo: luminous && style.halo === 'soft' ? 1 : 0,
      }];
    }));
  }, [candidates, presentation]);

  const draw = useCallback((live: GraphViewportV1, interacting: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !layer || !gpu) return;
    // The SVG renderer may have remounted its layers; keep the canvas in its slot.
    const slot = getSlot();
    if (slot && canvas.parentElement !== slot) slot.replaceChildren(canvas);
    const bounds = canvas.getBoundingClientRect();
    const cssSize = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
    const safe = gpu.graphGpuViewportIsFloat32Safe(live, cssSize);
    if (safe === preciseMode) setPreciseMode(!safe);
    // Adapt on GPU time, or on the delay from a draw to the next frame; gaps
    // between draws would include idle input time.
    const state = scaleRef.current;
    state.scale = gpu.nextGraphGpuRenderScale({ scale: state.scale, interacting },
      gpu.graphGpuFrameCostMs(layer.gpuFrameMs, layer.presentLatencyMs, 12), 12);
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1) * state.scale;
    const size = { width: Math.max(1, Math.round(cssSize.width * pixelRatio)), height: Math.max(1, Math.round(cssSize.height * pixelRatio)) };
    if (canvas.width !== size.width) canvas.width = size.width;
    if (canvas.height !== size.height) canvas.height = size.height;
    layer.clear(size);
    if (!safe || !active) return;
    layer.beginFrame();
    const failures = new Map<string, string>();
    for (const candidate of candidates) {
      const program = candidate.program;
      const style = styles.get(candidate.itemId);
      if (!program || !style || drawFailures.has(program.key)) continue;
      const range = candidate.surface ? surfaceRanges.get(candidate.itemId) : undefined;
      if (candidate.surface && !range) continue;
      const uniforms = { viewport: live, parameters: program.parameterNames.map((name) => parameters[name] ?? 0) };
      const target = `field:${candidate.itemId}`;
      if (!layer.draw(program, gpu.graphGpuRealFieldValueShading(program.clauseCount), uniforms, size, { target })) {
        failures.set(program.key, layer.lastError ?? 'unknown');
        continue;
      }
      if (candidate.surface && range) {
        const bounds = candidate.surface.bounds;
        const heat = layer.draw(program, gpu.GRAPH_GPU_SURFACE_HEAT_SHADING, {
          ...uniforms,
          extra: {
            ...gpu.graphGpuSurfaceHeatUniforms(range),
            uBounds: bounds ? [bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax] : [-1e30, 1e30, -1e30, 1e30],
            uOpacity: 0.82, uPixelRatio: pixelRatio,
          },
        }, size, { inputs: { uField: target }, blend: true });
        if (!heat) failures.set(program.key, layer.lastError ?? 'unknown');
        continue;
      }
      const composited = layer.draw(program, gpu.GRAPH_GPU_REAL_FIELD_SHADING, {
        ...uniforms,
        integers: {
          uClauseCount: program.clauseCount, uFillRegion: program.fillsRegion ? 1 : 0,
          uStrokeStyle: style.strokeStyle, uHalo: style.halo,
        },
        extra: {
          uStrict: [0, 1, 2, 3].map((index) => (program.strict[index] ? 1 : 0)),
          uColor: style.color, uStrokeOpacity: style.strokeOpacity, uRegionOpacity: style.regionOpacity,
          uLineWidth: style.lineWidth * pixelRatio, uPixelRatio: pixelRatio,
        },
      }, size, { inputs: { uField: target }, blend: true });
      if (!composited) failures.set(program.key, layer.lastError ?? 'unknown');
    }
    layer.endFrame();
    if (failures.size > 0) setDrawFailures((current) => new Map([...current, ...failures]));
  }, [active, candidates, drawFailures, getSlot, gpu, layer, parameters, preciseMode, styles, surfaceRanges]);

  return { draw, status, suppressed };
}
