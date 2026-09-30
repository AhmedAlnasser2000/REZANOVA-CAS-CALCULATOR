import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  loadGraphComplexRootsSolver,
  loadGraphComplexTraceEvaluator,
  type GraphExpressionIR,
  type GraphComplexDisplayModeV1,
  type GraphComplexDomainTileRuntimeV1,
  type GraphComplexTraceValue,
  type GraphDocumentV4,
  type GraphPaneViewStateV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
} from '../../lib/graphing';
import { graphParameterEnvironment } from './graph-controller-support';
import { WHEEL_SETTLE_MS } from './graph-gesture-timing';
import { useGraphComplexGpu } from './useGraphComplexGpu';
import { useGraphComplexLocusGpu } from './useGraphComplexLocusGpu';
import { ptxBadge, ptxComplexReadout, ptxComplexTracePoint, ptxNearBranchCut, type PtxComplexTrace } from './ptx/ptx-complex-trace';
import { ptxComplexText } from '../../lib/graphing';
import { usePtxComplexTrace, type PtxPaneFrame, type PtxTracedPoint } from './ptx/usePtxComplexTrace';
import type { PtxDot } from './ptx/usePtxPointsOfInterest';
import {
  complexPlaneRootAt, complexPlaneRootText, paintArgandPlane, paintComplexPlaneItems, paintPtxDots, paintPtxMarker,
  type GraphComplexPlaneItem, type GraphComplexPlanePath, type GraphComplexPlaneRegion, type GraphComplexPlaneRoot,
} from './graph-complex-plane';

/** A locus or root item for the complex plane: its sampled geometry, or the equation to solve. */
export type GraphComplexPlaneInput = {
  itemId: string;
  color: string;
  paths: GraphComplexPlanePath[];
  regions: GraphComplexPlaneRegion[];
  roots: { left: GraphExpressionIR; right: GraphExpressionIR } | null;
};

function canvasFrame(canvas: HTMLCanvasElement) {
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { pixelRatio, width, height };
}

type Size = { width: number; height: number };
const NO_DOTS: readonly PtxDot[] = [];
type TileImage = { canvas: HTMLCanvasElement; label: string | null };
type Trace = { zRe: number; zIm: number; wRe: number; wIm: number; magnitude: number; phase: number };

const COMPONENT_LABELS = ['Re f', 'Im f', '|f|', 'arg f'];

function scalarColor(value: number, scale: number, phase = false) {
  if (!Number.isFinite(value)) return [8, 17, 20, 255] as const;
  if (phase) {
    const normalized = (value / (Math.PI * 2) + 1) % 1;
    const angle = normalized * Math.PI * 2;
    return [Math.round((Math.cos(angle) + 1) * 127.5),
      Math.round((Math.cos(angle - 2.094) + 1) * 127.5),
      Math.round((Math.cos(angle + 2.094) + 1) * 127.5), 255] as const;
  }
  const normalized = Math.max(-1, Math.min(1, value / Math.max(1e-6, scale)));
  return normalized >= 0
    ? [Math.round(40 + normalized * 215), Math.round(70 + normalized * 120), Math.round(110 - normalized * 70), 255] as const
    : [Math.round(40 - normalized * 50), Math.round(70 - normalized * 100), Math.round(110 - normalized * 145), 255] as const;
}

function accessiblePhaseColor(phase: number, magnitude: number) {
  const normalized = (phase / (Math.PI * 2) + 1) % 1;
  const triangular = 1 - Math.abs(normalized * 2 - 1);
  const ring = 0.78 + 0.18 * Math.cos(Math.log2(1 + magnitude) * Math.PI * 2);
  return [Math.round((28 + 218 * normalized) * ring), Math.round((74 + 126 * triangular) * ring),
    Math.round((208 - 152 * normalized) * ring), 255] as const;
}

/** Rasterizes a tile once per tile/mode/palette; gestures only re-place it. */
function buildTileImages(tile: GraphComplexDomainTileRuntimeV1, mode: GraphComplexDisplayModeV1,
  colorVisionMode: 'standard' | 'color-vision-friendly'): TileImage[] {
  const image = (pixels: Uint8ClampedArray<ArrayBuffer>, label: string | null): TileImage => {
    const canvas = document.createElement('canvas'); canvas.width = tile.width; canvas.height = tile.height;
    canvas.getContext('2d')?.putImageData(new ImageData(pixels, tile.width, tile.height), 0, 0);
    return { canvas, label };
  };
  if (mode === 'domain-coloring') {
    const pixels = colorVisionMode === 'standard' ? new Uint8ClampedArray(tile.rgba) : new Uint8ClampedArray(tile.rgba.length);
    if (colorVisionMode === 'color-vision-friendly') for (let pixel = 0; pixel < tile.width * tile.height; pixel += 1) {
      const magnitude = tile.values[pixel * 4 + 2]!; const phase = tile.values[pixel * 4 + 3]!;
      pixels.set(Number.isFinite(magnitude) && Number.isFinite(phase)
        ? accessiblePhaseColor(phase, magnitude) : [8, 17, 20, 255], pixel * 4);
    }
    return [image(pixels, null)];
  }
  return COMPONENT_LABELS.map((label, component) => {
    const pixels = new Uint8ClampedArray(tile.rgba.length);
    let scale = 1;
    if (component < 3) for (let offset = component; offset < tile.values.length; offset += 4) {
      if (Number.isFinite(tile.values[offset])) scale = Math.max(scale, Math.abs(tile.values[offset]!));
    }
    for (let pixel = 0; pixel < tile.width * tile.height; pixel += 1) {
      pixels.set(scalarColor(tile.values[pixel * 4 + component]!, scale, component === 3), pixel * 4);
    }
    return image(pixels, label);
  });
}

/** Places the last complete tile at its true position inside the live viewport. */
function paint(canvas: HTMLCanvasElement, tile: GraphComplexDomainTileRuntimeV1, images: TileImage[], live: GraphViewportV1,
  overlayOnly: boolean) {
  const context = canvas.getContext('2d'); if (!context) return;
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!overlayOnly) { context.fillStyle = '#081114'; context.fillRect(0, 0, width, height); }
  context.imageSmoothingEnabled = false;
  const spanX = live.xMax - live.xMin; const spanY = live.yMax - live.yMin;
  const quadrant = images.length === 1 ? { width, height } : { width: width / 2, height: height / 2 };
  images.forEach((image, index) => {
    const originX = images.length === 1 ? 0 : index % 2 * quadrant.width;
    const originY = images.length === 1 ? 0 : Math.floor(index / 2) * quadrant.height;
    if (!overlayOnly) {
    context.save();
    context.beginPath(); context.rect(originX, originY, quadrant.width, quadrant.height); context.clip();
    context.drawImage(image.canvas,
      originX + (tile.bounds.reMin - live.xMin) / spanX * quadrant.width,
      originY + (live.yMax - tile.bounds.imMax) / spanY * quadrant.height,
      (tile.bounds.reMax - tile.bounds.reMin) / spanX * quadrant.width,
      (tile.bounds.imMax - tile.bounds.imMin) / spanY * quadrant.height);
    context.restore();
    }
    if (image.label) {
      const labelY = originY + (index < 2 ? 62 : 8);
      context.fillStyle = 'rgba(4, 13, 16, .8)'; context.fillRect(originX + 8, labelY, 52, 20);
      context.fillStyle = '#e7f5ef'; context.font = `${12 * pixelRatio}px sans-serif`;
      context.fillText(image.label, originX + 13, labelY + 14);
    }
  });
  context.setLineDash([7 * pixelRatio, 5 * pixelRatio]); context.strokeStyle = 'rgba(255,255,255,.86)';
  context.lineWidth = pixelRatio;
  // Cuts are drawn inside every map (each component quadrant shows the whole view).
  for (let index = 0; index < images.length; index += 1) {
    const originX = images.length === 1 ? 0 : index % 2 * quadrant.width;
    const originY = images.length === 1 ? 0 : Math.floor(index / 2) * quadrant.height;
    context.save();
    context.beginPath(); context.rect(originX, originY, quadrant.width, quadrant.height); context.clip();
    for (const cut of tile.branchCuts) {
      context.beginPath();
      context.moveTo(originX + (cut.from.re - live.xMin) / spanX * quadrant.width, originY + (live.yMax - cut.from.im) / spanY * quadrant.height);
      context.lineTo(originX + (cut.to.re - live.xMin) / spanX * quadrant.width, originY + (live.yMax - cut.to.im) / spanY * quadrant.height);
      context.stroke();
    }
    context.restore();
  }
  context.setLineDash([]);
}

export function GraphComplexViewport({ displayMode, document, gpuRendering, onDisplayModeChange, onPaneViewChange,
  onSelectItem, onSizeChange, onTracedPointChange, onViewportChange, paneView, planeItems = [], presentation, ptxDots = NO_DOTS, tile, viewport,
  colorVisionMode }: {
  colorVisionMode: 'standard' | 'color-vision-friendly';
  displayMode: GraphComplexDisplayModeV1;
  document: GraphDocumentV4;
  gpuRendering: 'auto' | 'off';
  onDisplayModeChange: (mode: GraphComplexDisplayModeV1) => void;
  onPaneViewChange: (values: Partial<GraphPaneViewStateV1>) => void;
  onSelectItem?: (itemId: string) => void;
  /** The PTX-traced point (for the Real pane's mirror marker in Both). */
  onTracedPointChange?: (point: PtxTracedPoint) => void;
  /** Points of interest of the selected item. */
  ptxDots?: readonly PtxDot[];
  /** Called with the pane's size whenever it changes. */
  onSizeChange?: (size: Size) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
  paneView: GraphPaneViewStateV1;
  planeItems?: readonly GraphComplexPlaneInput[];
  presentation: GraphRendererPresentationFrame;
  tile: GraphComplexDomainTileRuntimeV1 | null;
  viewport: GraphViewportV1;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Gestures move this live viewport every frame; the committed viewport (and
  // therefore CPU sampling) changes only on pointer release or wheel settle.
  const liveRef = useRef<GraphViewportV1>(viewport);
  const interactingRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; viewport: GraphViewportV1 } | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const [size, setSize] = useState<Size>({ width: 1, height: 1 });
  const [trace, setTrace] = useState<Trace | null>(null);
  const [rootReadout, setRootReadout] = useState<string | null>(null);
  // Root points come from the solver the worker samples with, so labels and dots always agree.
  const [solvedRoots, setSolvedRoots] = useState<ReadonlyMap<string, GraphComplexPlaneRoot[]>>(new Map());
  const images = useMemo(() => (tile ? buildTileImages(tile, displayMode, colorVisionMode) : []),
    [colorVisionMode, displayMode, tile]);
  const item = tile ? document.items.find((entry) => entry.itemId === tile.itemId) : undefined;
  const mathJson = item?.kind === 'relation' && item.relation.kind === 'complex-mapping' ? item.relation.expression.mathJson : null;
  const parameters = useMemo(() => graphParameterEnvironment(document), [document]);
  const tileFacts = useMemo(() => {
    const scale: [number, number, number] = [1, 1, 1];
    let finite = false;
    if (tile) for (let offset = 0; offset < tile.values.length; offset += 4) {
      const re = tile.values[offset]!;
      if (!Number.isFinite(re)) continue;
      finite = true;
      scale[0] = Math.max(scale[0], Math.abs(re));
      scale[1] = Math.max(scale[1], Math.abs(tile.values[offset + 1]!));
      scale[2] = Math.max(scale[2], Math.abs(tile.values[offset + 2]!));
    }
    return { scale, finite };
  }, [tile]);
  const { canvasRef: gpuCanvasRef, draw: gpuDraw, status: gpuStatus } = useGraphComplexGpu({
    colorVisionMode, componentScale: tileFacts.scale, cpuSupported: tile ? tileFacts.finite : null, displayMode,
    enabled: gpuRendering === 'auto' && paneView.dimension === '2d', mathJson, parameters,
    programKey: tile?.itemId ?? 'complex',
  });
  const { paintInto: paintLocusGpu, slotRef: locusSlotRef, suppressed: locusSuppressed } = useGraphComplexLocusGpu({ document, enabled: gpuRendering === 'auto' && paneView.dimension === '2d', presentation });
  const [traceEvaluator, setTraceEvaluator] = useState<((z: { re: number; im: number }) => GraphComplexTraceValue | null) | null>(null);
  useEffect(() => {
    let live = true;
    // A readout from a previous expression or parameter set is no longer true.
    queueMicrotask(() => { if (live) setTrace(null); });
    if (mathJson === null) { queueMicrotask(() => { if (live) setTraceEvaluator(null); }); return () => { live = false; }; }
    loadGraphComplexTraceEvaluator().then((create) => {
      if (live) setTraceEvaluator(() => create(mathJson, parameters));
    }).catch(() => { if (live) setTraceEvaluator(null); });
    return () => { live = false; };
  }, [mathJson, parameters]);
  const rootEquations = useMemo(() => planeItems.flatMap((entry) => (entry.roots ? [{ itemId: entry.itemId, ...entry.roots }] : [])),
    [planeItems]);
  useEffect(() => {
    let live = true;
    if (rootEquations.length === 0) { queueMicrotask(() => { if (live) setSolvedRoots(new Map()); }); return () => { live = false; }; }
    loadGraphComplexRootsSolver().then((solve) => {
      if (!live) return;
      setSolvedRoots(new Map(rootEquations.map((equation) => [equation.itemId,
        solve({ left: equation.left, right: equation.right, parameters, viewport }).roots])));
    }).catch(() => { if (live) setSolvedRoots(new Map()); });
    return () => { live = false; };
  }, [parameters, rootEquations, viewport]);
  const plane: GraphComplexPlaneItem[] = useMemo(() => planeItems.map((entry) => ({
    itemId: entry.itemId, color: entry.color, paths: entry.paths, regions: entry.regions, roots: solvedRoots.get(entry.itemId) ?? [],
  })), [planeItems, solvedRoots]);
  // A locus the GPU draws is composited from its canvas; the CPU geometry is kept only for the others.
  const cpuPlane = useMemo(() => (locusSuppressed.size === 0 ? plane
    : plane.map((entry) => (locusSuppressed.has(entry.itemId) ? { ...entry, paths: [], regions: [] } : entry))),
  [locusSuppressed, plane]);
  const probeSource = tile && mathJson !== null ? JSON.stringify([tile.itemId, mathJson, parameters]) : null;
  const ptx = usePtxComplexTrace({ document, dots: ptxDots, onSelectItem, onTracedPointChange, parameters, plane, probeSource });
  const complexDots = useMemo(() => ptxDots.filter((dot) => dot.plane === 'complex'), [ptxDots]);
  const ptxReadout = ptx.trace ? ptxComplexReadout(ptx.trace) : null;
  const paintRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    paintRef.current = () => {
      const gpuDrawn = gpuDraw(liveRef.current, interactingRef.current);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const live = liveRef.current;
      canvas.dataset.viewport = `${live.xMin},${live.xMax},${live.yMin},${live.yMax}`;
      if (tile) paint(canvas, tile, images, liveRef.current, gpuDrawn);
      const { pixelRatio, width, height } = canvasFrame(canvas);
      const context = canvas.getContext('2d');
      if (!context) return;
      // Without a z-map the pane is a plain Argand plane; loci and roots draw on either.
      if (!tile) { context.clearRect(0, 0, width, height); if (plane.length) paintArgandPlane(context, liveRef.current, { originX: 0, originY: 0, width, height }, pixelRatio); }
      if (plane.length && (!tile || displayMode === 'domain-coloring')) {
        paintLocusGpu(context, liveRef.current, interactingRef.current, width, height);
        paintComplexPlaneItems(context, cpuPlane, liveRef.current, { originX: 0, originY: 0, width, height }, pixelRatio);
      }
      if (!tile || displayMode === 'domain-coloring') {
        const frame = { originX: 0, originY: 0, width, height };
        paintPtxDots(context, complexDots, liveRef.current, frame, pixelRatio);
        const traced = ptx.trace; const point = traced ? ptxComplexTracePoint(traced) : null;
        const color = traced && traced.kind !== 'probe' ? plane.find((entry) => entry.itemId === traced.itemId)?.color : undefined;
        if (point) paintPtxMarker(context, point, color ?? '#f2b84b', liveRef.current, frame, pixelRatio);
      }
    };
  });
  const requestPaint = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => { frameRef.current = null; paintRef.current(); });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry?.contentRect.width ?? 1, height: entry?.contentRect.height ?? 1 };
      setSize(next); onSizeChange?.(next);
    });
    observer.observe(canvas); return () => observer.disconnect();
  }, [onSizeChange, paneView.dimension]);
  useEffect(() => {
    if (!interactingRef.current) liveRef.current = viewport;
    paintRef.current();
  }, [complexDots, cpuPlane, images, paintLocusGpu, plane, ptx.trace, size, tile, viewport]);
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    // StrictMode remounts reuse refs; a stale frame id would block requestPaint.
    frameRef.current = null; wheelTimerRef.current = null;
  }, []);

  const moveLive = (next: GraphViewportV1) => {
    interactingRef.current = true; liveRef.current = next; requestPaint();
  };
  const commitLive = () => {
    interactingRef.current = false; onViewportChange(liveRef.current); requestPaint();
  };
  const wheelRef = useRef<(event: WheelEvent) => void>(() => {});
  useLayoutEffect(() => {
    wheelRef.current = (event: WheelEvent) => {
      event.preventDefault(); setTrace(null);
      const live = liveRef.current; const factor = Math.exp(Math.max(-1, Math.min(1, event.deltaY / 500)));
      const cx = (live.xMin + live.xMax) / 2; const cy = (live.yMin + live.yMax) / 2;
      const hx = (live.xMax - live.xMin) / 2 * factor; const hy = (live.yMax - live.yMin) / 2 * factor;
      moveLive({ ...live, xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy });
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; commitLive(); }, WHEEL_SETTLE_MS);
    };
  });
  useEffect(() => {
    // React registers wheel listeners as passive; zoom must own the wheel.
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const listener = (event: WheelEvent) => wheelRef.current(event);
    canvas.addEventListener('wheel', listener, { passive: false });
    return () => canvas.removeEventListener('wheel', listener);
  }, [paneView.dimension]);
  const status = useMemo(() => {
    if (!tile && plane.length) {
      const roots = plane.flatMap((entry) => entry.roots);
      const loci = plane.filter((entry) => entry.paths.length || entry.regions.length).length;
      const exact = roots.filter((root) => root.exact).length;
      const rootText = roots.length === 0 ? '' : `${roots.length} root point${roots.length === 1 ? '' : 's'}`
        + (exact === roots.length ? ' · all exact' : exact ? ` · ${exact} exact` : ' · numeric');
      return [loci ? `${loci} ${loci === 1 ? 'locus' : 'loci'}` : '', rootText].filter(Boolean).join('; ') || 'Complex plane';
    }
    if (!tile) return 'Enter f(z), w, or a bare z-expression.';
    const cuts = `${tile.branchCuts.length} branch cut${tile.branchCuts.length === 1 ? '' : 's'} in view`;
    return tile.analyticity === 'unknown'
      ? `branch geometry not determined; ${cuts}` : `${tile.analyticity}; ${cuts}`;
  }, [plane, tile]);
  /** A root under the pointer takes the readout; otherwise the z-map trace. */
  const hoverRoot = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const live = liveRef.current;
    const re = live.xMin + (event.clientX - bounds.left) / bounds.width * (live.xMax - live.xMin);
    const im = live.yMax - (event.clientY - bounds.top) / bounds.height * (live.yMax - live.yMin);
    const root = displayMode === 'components' && tile ? null : complexPlaneRootAt(plane, re, im, live, bounds.width, bounds.height);
    // A z-map's zeros and poles (dots and rings) read out like roots when the pointer is on them.
    const dot = root || (displayMode === 'components' && tile) ? null : complexDots.find((candidate) => Math.hypot(
      (candidate.x - re) / (live.xMax - live.xMin) * bounds.width, (candidate.y - im) / (live.yMax - live.yMin) * bounds.height) <= 8);
    const dotText = dot ? `${dot.feature === 'complex-pole' ? 'Pole' : dot.feature === 'complex-zero' ? 'Zero' : 'Intersection'} · z = ${ptxComplexText(dot.x, dot.y, dot.errorBound)}` : null;
    setRootReadout(root ? complexPlaneRootText(root) : dotText);
    return root !== null || dot !== undefined && dot !== null;
  };
  const pointer = (event: ReactPointerEvent<HTMLCanvasElement>): Trace | null => {
    if (hoverRoot(event) || !tile || !traceEvaluator) return null;
    const bounds = event.currentTarget.getBoundingClientRect();
    const components = displayMode === 'components';
    const localWidth = components ? bounds.width / 2 : bounds.width;
    const localHeight = components ? bounds.height / 2 : bounds.height;
    const localX = (event.clientX - bounds.left) % localWidth;
    const localY = (event.clientY - bounds.top) % localHeight;
    const live = liveRef.current;
    const zRe = live.xMin + localX / localWidth * (live.xMax - live.xMin);
    const zIm = live.yMax - localY / localHeight * (live.yMax - live.yMin);
    // Trace reads the CPU evaluator at the exact point, never GPU pixels.
    const value = traceEvaluator({ re: zRe, im: zIm });
    return value ? { zRe, zIm, wRe: value.re, wIm: value.im, magnitude: value.magnitude, phase: value.phase } : null;
  };
  /** The pane's frame and the plane point under the pointer, for PTX. */
  const eventFrame = (event: { clientX: number; clientY: number; currentTarget: Element }) => {
    const bounds = event.currentTarget.getBoundingClientRect(); const live = liveRef.current;
    const frame: PtxPaneFrame = { live, width: bounds.width, height: bounds.height };
    return { frame, at: { x: live.xMin + (event.clientX - bounds.left) / bounds.width * (live.xMax - live.xMin),
      y: live.yMax - (event.clientY - bounds.top) / bounds.height * (live.yMax - live.yMin) } };
  };
  /** A click on a z-map with nothing to trace pins the probe, flagging a nearby branch cut. */
  const pinProbe = (event: ReactPointerEvent<HTMLCanvasElement>) => (): Extract<PtxComplexTrace, { kind: 'probe' }> | null => {
    const probe = pointer(event);
    if (!probe) return null;
    // Pinning a probe selects its map, so the map's zeros and poles show as dots and rings.
    if (tile) onSelectItem?.(tile.itemId);
    const { frame: { live, width, height } } = eventFrame(event);
    const toScreen = (x: number, y: number) => ({ x: (x - live.xMin) / (live.xMax - live.xMin) * width, y: (live.yMax - y) / (live.yMax - live.yMin) * height });
    const nearCut = ptxNearBranchCut({ x: probe.zRe, y: probe.zIm }, tile?.branchCuts ?? [], toScreen);
    return { kind: 'probe', z: { re: probe.zRe, im: probe.zIm }, w: { re: probe.wRe, im: probe.wIm },
      magnitude: probe.magnitude, phase: probe.phase, warnings: nearCut ? ['near-branch-cut'] : [] };
  };
  return <section className="graph-complex-viewport" data-testid="graph-complex-viewport">
    <div className="graph-complex-toolbar">
      <div aria-label="Complex graph dimension" role="group"><button aria-pressed={paneView.dimension === '2d'}
        onClick={() => onPaneViewChange({ dimension: '2d' })} type="button">2D</button>
        <button aria-pressed={paneView.dimension === '3d'} onClick={() => onPaneViewChange({ dimension: '3d' })} type="button">3D</button></div>
      <div aria-label="Complex map display" role="group"><button aria-pressed={displayMode === 'domain-coloring'}
        onClick={() => onDisplayModeChange('domain-coloring')} type="button">Domain color</button>
        <button aria-pressed={displayMode === 'components'} onClick={() => onDisplayModeChange('components')} type="button">2×2 components</button></div>
      <span>{status}{tile ? `; ${colorVisionMode === 'color-vision-friendly' ? 'accessible blue-orange phase' : 'standard cyclic phase'}` : ''}.</span>
      {tile ? <span className={`graph-complex-renderer is-${gpuStatus.renderer}`} data-testid="graph-complex-renderer"
        title={gpuStatus.reason ?? 'Colours are drawn on the GPU; trace and Analyze use the precise CPU evaluation.'}>
        {gpuStatus.renderer === 'gpu' ? 'GPU' : gpuStatus.reason === 'deep zoom uses precise CPU rendering' ? 'Precise mode' : 'Standard rendering'}
      </span> : null}
    </div>
    {paneView.dimension === '2d' ? <canvas aria-hidden="true" className="graph-complex-gpu-canvas" ref={gpuCanvasRef} /> : null}
    {paneView.dimension === '2d' ? <div aria-hidden="true" className="graph-complex-locus-gpu-slot" ref={locusSlotRef} /> : null}
    {paneView.dimension === '2d' ? <canvas aria-label="Complex mapping visualization" className="graph-complex-overlay-canvas" ref={canvasRef}
      data-ptx-dots={complexDots.length} data-renderer={gpuStatus.renderer} tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { ptx.clear(); return; }
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
        if (!direction || !ptx.trace) return;
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        ptx.step(direction, { live: liveRef.current, width: bounds.width, height: bounds.height });
      }}
      data-tile-bounds={tile ? `${tile.bounds.reMin},${tile.bounds.reMax},${tile.bounds.imMin},${tile.bounds.imMax}` : undefined}
      onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, viewport: liveRef.current }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) {
          const { frame, at } = eventFrame(event);
          if (ptx.sweep(at, frame)) return;
          setTrace(pointer(event)); return;
        }
        const dx = (event.clientX - drag.x) / Math.max(1, event.currentTarget.clientWidth) * (drag.viewport.xMax - drag.viewport.xMin);
        const dy = (event.clientY - drag.y) / Math.max(1, event.currentTarget.clientHeight) * (drag.viewport.yMax - drag.viewport.yMin);
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4 && !interactingRef.current) return;
        setTrace(null);
        moveLive({ ...drag.viewport, xMin: drag.viewport.xMin - dx, xMax: drag.viewport.xMax - dx,
          yMin: drag.viewport.yMin + dy, yMax: drag.viewport.yMax + dy });
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current; dragRef.current = null;
        if (!drag) return;
        if (interactingRef.current) { commitLive(); return; }
        const { frame, at } = eventFrame(event);
        ptx.acquire(at, frame, tile && traceEvaluator && displayMode === 'domain-coloring' ? pinProbe(event) : null);
        setTrace(pointer(event));
      }}
/>
      : <div className="graph-complex-3d-placeholder">The 3D Riemann surface view arrives in a later Graphing milestone.</div>}
    {ptxReadout ? <output className="graph-complex-trace graph-ptx-readout" data-ptx-level={ptxReadout.level}
      data-testid="graph-complex-ptx-readout" title={ptxReadout.detail}>
      {ptxReadout.lines.map((line, index) => <span key={line}>{index > 0 ? <br /> : null}{line}
        {index === 0 ? <b className={`graph-ptx-badge is-${ptxBadge(ptxReadout.level)}`}>{ptxBadge(ptxReadout.level)}</b> : null}</span>)}
    </output> : null}
    {!ptxReadout && rootReadout ? <output className="graph-complex-trace" data-testid="graph-complex-root-readout">{rootReadout}</output> : null}
    {!ptxReadout && !rootReadout && trace && Number.isFinite(trace.wRe) ? <output className="graph-complex-trace">z = {trace.zRe.toPrecision(4)} {trace.zIm < 0 ? '−' : '+'} {Math.abs(trace.zIm).toPrecision(4)}i<br />
      w = {trace.wRe.toPrecision(4)} {trace.wIm < 0 ? '−' : '+'} {Math.abs(trace.wIm).toPrecision(4)}i · |w| {trace.magnitude.toPrecision(4)} · arg {trace.phase.toPrecision(4)}</output> : null}
  </section>;
}
