import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  GraphComplexDisplayModeV1,
  GraphComplexDomainTileRuntimeV1,
  GraphPaneViewStateV1,
  GraphViewportV1,
} from '../../lib/graphing';
import { WHEEL_SETTLE_MS } from './graph-gesture-timing';

type Size = { width: number; height: number };
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
function paint(canvas: HTMLCanvasElement, tile: GraphComplexDomainTileRuntimeV1, images: TileImage[], live: GraphViewportV1) {
  const context = canvas.getContext('2d'); if (!context) return;
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#081114'; context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  const spanX = live.xMax - live.xMin; const spanY = live.yMax - live.yMin;
  const quadrant = images.length === 1 ? { width, height } : { width: width / 2, height: height / 2 };
  images.forEach((image, index) => {
    const originX = images.length === 1 ? 0 : index % 2 * quadrant.width;
    const originY = images.length === 1 ? 0 : Math.floor(index / 2) * quadrant.height;
    context.save();
    context.beginPath(); context.rect(originX, originY, quadrant.width, quadrant.height); context.clip();
    context.drawImage(image.canvas,
      originX + (tile.bounds.reMin - live.xMin) / spanX * quadrant.width,
      originY + (live.yMax - tile.bounds.imMax) / spanY * quadrant.height,
      (tile.bounds.reMax - tile.bounds.reMin) / spanX * quadrant.width,
      (tile.bounds.imMax - tile.bounds.imMin) / spanY * quadrant.height);
    context.restore();
    if (image.label) {
      const labelY = originY + (index < 2 ? 62 : 8);
      context.fillStyle = 'rgba(4, 13, 16, .8)'; context.fillRect(originX + 8, labelY, 52, 20);
      context.fillStyle = '#e7f5ef'; context.font = `${12 * pixelRatio}px sans-serif`;
      context.fillText(image.label, originX + 13, labelY + 14);
    }
  });
  context.setLineDash([7 * pixelRatio, 5 * pixelRatio]); context.strokeStyle = 'rgba(255,255,255,.86)';
  context.lineWidth = pixelRatio;
  for (const cut of tile.branchCuts) {
    context.beginPath();
    context.moveTo((cut.from.re - live.xMin) / spanX * width, (live.yMax - cut.from.im) / spanY * height);
    context.lineTo((cut.to.re - live.xMin) / spanX * width, (live.yMax - cut.to.im) / spanY * height);
    context.stroke();
  }
  context.setLineDash([]);
}

export function GraphComplexViewport({ displayMode, onDisplayModeChange, onPaneViewChange,
  onViewportChange, paneView, tile, viewport, colorVisionMode }: {
  colorVisionMode: 'standard' | 'color-vision-friendly';
  displayMode: GraphComplexDisplayModeV1;
  onDisplayModeChange: (mode: GraphComplexDisplayModeV1) => void;
  onPaneViewChange: (values: Partial<GraphPaneViewStateV1>) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
  paneView: GraphPaneViewStateV1;
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
  const images = useMemo(() => (tile ? buildTileImages(tile, displayMode, colorVisionMode) : []),
    [colorVisionMode, displayMode, tile]);
  const paintRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    paintRef.current = () => {
      if (canvasRef.current && tile) paint(canvasRef.current, tile, images, liveRef.current);
    };
  });
  const requestPaint = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => { frameRef.current = null; paintRef.current(); });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry?.contentRect.width ?? 1, height: entry?.contentRect.height ?? 1 }));
    observer.observe(canvas); return () => observer.disconnect();
  }, [paneView.dimension]);
  useEffect(() => {
    if (!interactingRef.current) liveRef.current = viewport;
    paintRef.current();
  }, [images, size, tile, viewport]);
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
  }, []);

  const moveLive = (next: GraphViewportV1) => {
    interactingRef.current = true; liveRef.current = next; requestPaint();
  };
  const commitLive = () => {
    interactingRef.current = false; onViewportChange(liveRef.current);
  };
  const status = useMemo(() => {
    if (!tile) return 'Enter f(z), w, or a bare z-expression.';
    const cuts = `${tile.branchCuts.length} branch cut${tile.branchCuts.length === 1 ? '' : 's'} in view`;
    return tile.analyticity === 'unknown'
      ? `branch geometry not determined; ${cuts}` : `${tile.analyticity}; ${cuts}`;
  }, [tile]);
  const pointer = (event: ReactPointerEvent<HTMLCanvasElement>): Trace | null => {
    if (!tile) return null;
    const bounds = event.currentTarget.getBoundingClientRect();
    const components = images.length > 1;
    const localWidth = components ? bounds.width / 2 : bounds.width;
    const localHeight = components ? bounds.height / 2 : bounds.height;
    const localX = (event.clientX - bounds.left) % localWidth;
    const localY = (event.clientY - bounds.top) % localHeight;
    const live = liveRef.current;
    const zRe = live.xMin + localX / localWidth * (live.xMax - live.xMin);
    const zIm = live.yMax - localY / localHeight * (live.yMax - live.yMin);
    const column = Math.floor((zRe - tile.bounds.reMin) / (tile.bounds.reMax - tile.bounds.reMin) * tile.width);
    const row = Math.floor((tile.bounds.imMax - zIm) / (tile.bounds.imMax - tile.bounds.imMin) * tile.height);
    if (column < 0 || column >= tile.width || row < 0 || row >= tile.height) return null;
    const offset = (row * tile.width + column) * 4;
    return { zRe, zIm, wRe: tile.values[offset]!, wIm: tile.values[offset + 1]!, magnitude: tile.values[offset + 2]!, phase: tile.values[offset + 3]! };
  };
  return <section className="graph-complex-viewport" data-testid="graph-complex-viewport">
    <div className="graph-complex-toolbar">
      <div aria-label="Complex graph dimension" role="group"><button aria-pressed={paneView.dimension === '2d'}
        onClick={() => onPaneViewChange({ dimension: '2d' })} type="button">2D</button>
        <button aria-pressed={paneView.dimension === '3d'} onClick={() => onPaneViewChange({ dimension: '3d' })} type="button">3D</button></div>
      <div aria-label="Complex map display" role="group"><button aria-pressed={displayMode === 'domain-coloring'}
        onClick={() => onDisplayModeChange('domain-coloring')} type="button">Domain color</button>
        <button aria-pressed={displayMode === 'components'} onClick={() => onDisplayModeChange('components')} type="button">2×2 components</button></div>
      <span>{status}; {colorVisionMode === 'color-vision-friendly' ? 'accessible blue-orange phase' : 'standard cyclic phase'}.</span>
    </div>
    {paneView.dimension === '2d' ? <canvas aria-label="Complex mapping visualization" ref={canvasRef}
      data-tile-bounds={tile ? `${tile.bounds.reMin},${tile.bounds.reMax},${tile.bounds.imMin},${tile.bounds.imMax}` : undefined}
      onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, viewport: liveRef.current }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) { setTrace(pointer(event)); return; }
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
        if (interactingRef.current) commitLive(); else setTrace(pointer(event));
      }}
      onWheel={(event) => {
        event.preventDefault(); setTrace(null);
        const live = liveRef.current; const factor = Math.exp(Math.max(-1, Math.min(1, event.deltaY / 500)));
        const cx = (live.xMin + live.xMax) / 2; const cy = (live.yMin + live.yMax) / 2;
        const hx = (live.xMax - live.xMin) / 2 * factor; const hy = (live.yMax - live.yMin) / 2 * factor;
        moveLive({ ...live, xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy });
        if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; commitLive(); }, WHEEL_SETTLE_MS);
      }} />
      : <div className="graph-complex-3d-placeholder">The 3D Riemann surface view arrives in a later Graphing milestone.</div>}
    {trace && Number.isFinite(trace.wRe) ? <output className="graph-complex-trace">z = {trace.zRe.toPrecision(4)} {trace.zIm < 0 ? '−' : '+'} {Math.abs(trace.zIm).toPrecision(4)}i<br />
      w = {trace.wRe.toPrecision(4)} {trace.wIm < 0 ? '−' : '+'} {Math.abs(trace.wIm).toPrecision(4)}i · |w| {trace.magnitude.toPrecision(4)} · arg {trace.phase.toPrecision(4)}</output> : null}
  </section>;
}
