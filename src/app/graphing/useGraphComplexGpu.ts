import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadGraphGpuModule,
  type GraphComplexDisplayModeV1,
  type GraphGpuModule,
  type GraphViewportV1,
} from '../../lib/graphing';

type Layer = NonNullable<ReturnType<GraphGpuModule['createGraphGpuFieldLayer']>>;
type ComplexProgram = Extract<ReturnType<GraphGpuModule['translateGraphComplexMapping']>, { kind: 'complex' }>;

export type GraphComplexRendererStatus =
  | { renderer: 'gpu'; reason: null }
  | { renderer: 'cpu'; reason: string };

const OFF: GraphComplexRendererStatus = { renderer: 'cpu', reason: 'GPU rendering is off in Settings' };

/**
 * GPU visual evaluation for the complex 2D pane. The GPU draws the colour
 * field only; trace, Analyze, cuts, and evidence stay on the CPU authority.
 * Every refusal (setting off, unsupported operator, no WebGL2, lost context,
 * float32-unsafe zoom, expression the CPU evaluator cannot evaluate) returns
 * a visible reason and leaves drawing to the CPU tile.
 */
export function useGraphComplexGpu({ colorVisionMode, componentScale, cpuSupported, displayMode, enabled, mathJson, parameters, programKey }: {
  colorVisionMode: 'standard' | 'color-vision-friendly';
  componentScale: readonly [number, number, number];
  /** null until the first CPU tile arrives. */
  cpuSupported: boolean | null;
  displayMode: GraphComplexDisplayModeV1;
  enabled: boolean;
  mathJson: unknown;
  parameters: Readonly<Record<string, number>>;
  programKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gpu, setGpu] = useState<GraphGpuModule | null>(null);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [runtimeReason, setRuntimeReason] = useState<string | null>(null);
  const scaleRef = useRef({ scale: 1, lastDrawAt: 0 });

  useEffect(() => {
    if (!enabled || gpu) return undefined;
    let live = true;
    loadGraphGpuModule().then((module) => { if (live) setGpu(module); })
      .catch(() => { if (live) setRuntimeReason('the GPU renderer could not load'); });
    return () => { live = false; };
  }, [enabled, gpu]);

  const mathJsonKey = useMemo(() => JSON.stringify(mathJson ?? null), [mathJson]);
  const translation = useMemo(() => {
    if (!gpu || mathJson === null || mathJson === undefined) return null;
    return gpu.translateGraphComplexMapping(JSON.parse(mathJsonKey), { key: `${programKey}:${mathJsonKey}` });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mathJsonKey carries mathJson identity.
  }, [gpu, mathJsonKey, programKey]);
  const program: ComplexProgram | null = translation && 'kind' in translation ? translation : null;
  const unboundParameter = program?.parameterNames.find((name) => !(name in parameters)) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !gpu || !canvas) return undefined;
    const created = gpu.createGraphGpuFieldLayer(canvas, {
      onContextLost: () => setRuntimeReason('the graphics context was lost'),
      onContextRestored: () => setRuntimeReason(null),
    });
    if (!created) {
      queueMicrotask(() => setRuntimeReason('WebGL2 is unavailable'));
      return undefined;
    }
    queueMicrotask(() => { setLayer(created); setRuntimeReason(null); });
    return () => { created.dispose(); setLayer(null); };
  }, [enabled, gpu]);

  const baseStatus: GraphComplexRendererStatus = !enabled ? OFF
    : runtimeReason ? { renderer: 'cpu', reason: runtimeReason }
      : translation && !('kind' in translation) ? { renderer: 'cpu', reason: `${translation.reason.replace('unsupported-operator:', '')} is not supported on the GPU` }
        : unboundParameter ? { renderer: 'cpu', reason: `parameter ${unboundParameter} has no value` }
          : cpuSupported === false ? { renderer: 'cpu', reason: 'the expression is not supported by the complex evaluator' }
            : !layer || !program || cpuSupported === null ? { renderer: 'cpu', reason: 'starting the GPU renderer' }
              : { renderer: 'gpu', reason: null };
  const [preciseMode, setPreciseMode] = useState(false);
  const status: GraphComplexRendererStatus = baseStatus.renderer === 'gpu' && preciseMode
    ? { renderer: 'cpu', reason: 'deep zoom uses precise CPU rendering' } : baseStatus;

  const draw = useCallback((live: GraphViewportV1, interacting: boolean): boolean => {
    const canvas = canvasRef.current;
    if (baseStatus.renderer !== 'gpu' || !canvas || !layer || !program || !gpu) return false;
    const bounds = canvas.getBoundingClientRect();
    const cssSize = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
    const safe = gpu.graphGpuViewportIsFloat32Safe(live, cssSize);
    if (safe === preciseMode) setPreciseMode(!safe);
    if (!safe) return false;
    const now = performance.now();
    const state = scaleRef.current;
    state.scale = gpu.nextGraphGpuRenderScale({ scale: state.scale, interacting },
      interacting && state.lastDrawAt > 0 ? now - state.lastDrawAt : Number.NaN);
    state.lastDrawAt = interacting ? now : 0;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1) * state.scale;
    const width = Math.max(1, Math.round(cssSize.width * pixelRatio));
    const height = Math.max(1, Math.round(cssSize.height * pixelRatio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return layer.draw(program, gpu.GRAPH_GPU_COMPLEX_SHADING, {
      viewport: live,
      parameters: program.parameterNames.map((name) => parameters[name] ?? 0),
      integers: { uMode: displayMode === 'components' ? 1 : 0, uPalette: colorVisionMode === 'color-vision-friendly' ? 1 : 0 },
      extra: { uComponentScale: componentScale },
    }, { width, height });
  }, [baseStatus.renderer, colorVisionMode, componentScale, displayMode, gpu, layer, parameters, preciseMode, program]);

  return { canvasRef, draw, status };
}
