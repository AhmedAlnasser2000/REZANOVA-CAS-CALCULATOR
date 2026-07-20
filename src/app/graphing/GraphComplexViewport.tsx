import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type {
  GraphComplexDisplayModeV1,
  GraphComplexDomainTileRuntimeV1,
  GraphPaneViewStateV1,
  GraphViewportV1,
} from '../../lib/graphing';

type Size = { width: number; height: number };

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

function drawTile(canvas: HTMLCanvasElement, tile: GraphComplexDomainTileRuntimeV1,
  mode: GraphComplexDisplayModeV1, colorVisionMode: 'standard' | 'color-vision-friendly') {
  const context = canvas.getContext('2d'); if (!context) return;
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  context.imageSmoothingEnabled = false;
  const source = document.createElement('canvas'); source.width = tile.width; source.height = tile.height;
  const sourceContext = source.getContext('2d'); if (!sourceContext) return;
  if (mode === 'domain-coloring') {
    const domainPixels = colorVisionMode === 'standard'
      ? new Uint8ClampedArray(tile.rgba)
      : new Uint8ClampedArray(tile.rgba.length);
    if (colorVisionMode === 'color-vision-friendly') for (let pixel = 0; pixel < tile.width * tile.height; pixel += 1) {
      const magnitude = tile.values[pixel * 4 + 2]!; const phase = tile.values[pixel * 4 + 3]!;
      domainPixels.set(Number.isFinite(magnitude) && Number.isFinite(phase)
        ? accessiblePhaseColor(phase, magnitude) : [8, 17, 20, 255], pixel * 4);
    }
    sourceContext.putImageData(new ImageData(domainPixels, tile.width, tile.height), 0, 0);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  } else {
    const labels = ['Re f', 'Im f', '|f|', 'arg f'];
    for (let component = 0; component < 4; component += 1) {
      const pixels = new Uint8ClampedArray(tile.rgba.length);
      let scale = 1;
      if (component < 3) {
        for (let offset = component; offset < tile.values.length; offset += 4) {
          if (Number.isFinite(tile.values[offset])) scale = Math.max(scale, Math.abs(tile.values[offset]!));
        }
      }
      for (let pixel = 0; pixel < tile.width * tile.height; pixel += 1) {
        pixels.set(scalarColor(tile.values[pixel * 4 + component]!, scale, component === 3), pixel * 4);
      }
      sourceContext.putImageData(new ImageData(pixels, tile.width, tile.height), 0, 0);
      const x = component % 2 * canvas.width / 2; const y = Math.floor(component / 2) * canvas.height / 2;
      context.drawImage(source, x, y, canvas.width / 2, canvas.height / 2);
      const labelY = y + (component < 2 ? 62 : 8);
      context.fillStyle = 'rgba(4, 13, 16, .8)'; context.fillRect(x + 8, labelY, 52, 20);
      context.fillStyle = '#e7f5ef'; context.font = `${12 * pixelRatio}px sans-serif`;
      context.fillText(labels[component]!, x + 13, labelY + 14);
    }
  }
  context.setLineDash([7 * pixelRatio, 5 * pixelRatio]); context.strokeStyle = 'rgba(255,255,255,.86)';
  context.lineWidth = pixelRatio;
  for (const cut of tile.branchCuts) {
    const x1 = (cut.from.re - tile.bounds.reMin) / (tile.bounds.reMax - tile.bounds.reMin) * canvas.width;
    const y1 = (tile.bounds.imMax - cut.from.im) / (tile.bounds.imMax - tile.bounds.imMin) * canvas.height;
    const x2 = (cut.to.re - tile.bounds.reMin) / (tile.bounds.reMax - tile.bounds.reMin) * canvas.width;
    const y2 = (tile.bounds.imMax - cut.to.im) / (tile.bounds.imMax - tile.bounds.imMin) * canvas.height;
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  }
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
  const dragRef = useRef<{ x: number; y: number; viewport: GraphViewportV1 } | null>(null);
  const [size, setSize] = useState<Size>({ width: 1, height: 1 });
  const [trace, setTrace] = useState<{ zRe: number; zIm: number; wRe: number; wIm: number; magnitude: number; phase: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry?.contentRect.width ?? 1, height: entry?.contentRect.height ?? 1 }));
    observer.observe(canvas); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (canvasRef.current && tile) drawTile(canvasRef.current, tile, displayMode, colorVisionMode); }, [colorVisionMode, displayMode, size, tile]);
  const status = useMemo(() => tile ? `${tile.analyticity}; ${tile.branchCuts.length} principal cut${tile.branchCuts.length === 1 ? '' : 's'}` : 'Enter f(z), w, or a bare z-expression.', [tile]);
  const pointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!tile) return null; const bounds = event.currentTarget.getBoundingClientRect();
    const column = Math.max(0, Math.min(tile.width - 1, Math.floor((event.clientX - bounds.left) / bounds.width * tile.width)));
    const row = Math.max(0, Math.min(tile.height - 1, Math.floor((event.clientY - bounds.top) / bounds.height * tile.height)));
    const offset = (row * tile.width + column) * 4;
    return { zRe: tile.bounds.reMin + (column + 0.5) / tile.width * (tile.bounds.reMax - tile.bounds.reMin),
      zIm: tile.bounds.imMax - (row + 0.5) / tile.height * (tile.bounds.imMax - tile.bounds.imMin),
      wRe: tile.values[offset]!, wIm: tile.values[offset + 1]!, magnitude: tile.values[offset + 2]!, phase: tile.values[offset + 3]! };
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
      onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, viewport }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (!dragRef.current) { setTrace(pointer(event)); return; }
        const dx = (event.clientX - dragRef.current.x) / Math.max(1, event.currentTarget.clientWidth) * (viewport.xMax - viewport.xMin);
        const dy = (event.clientY - dragRef.current.y) / Math.max(1, event.currentTarget.clientHeight) * (viewport.yMax - viewport.yMin);
        onViewportChange({ ...dragRef.current.viewport, xMin: dragRef.current.viewport.xMin - dx,
          xMax: dragRef.current.viewport.xMax - dx, yMin: dragRef.current.viewport.yMin + dy, yMax: dragRef.current.viewport.yMax + dy }); }}
      onPointerUp={(event) => { if (dragRef.current && Math.hypot(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y) < 4) setTrace(pointer(event)); dragRef.current = null; }}
      onWheel={(event) => { event.preventDefault(); const factor = Math.exp(Math.max(-1, Math.min(1, event.deltaY / 500)));
        const cx = (viewport.xMin + viewport.xMax) / 2; const cy = (viewport.yMin + viewport.yMax) / 2;
        const hx = (viewport.xMax - viewport.xMin) / 2 * factor; const hy = (viewport.yMax - viewport.yMin) / 2 * factor;
        onViewportChange({ ...viewport, xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy }); }} />
      : <div className="graph-complex-3d-placeholder">Riemann surface view is prepared for Move 28.</div>}
    {trace && Number.isFinite(trace.wRe) ? <output className="graph-complex-trace">z = {trace.zRe.toPrecision(4)} {trace.zIm < 0 ? '−' : '+'} {Math.abs(trace.zIm).toPrecision(4)}i<br />
      w = {trace.wRe.toPrecision(4)} {trace.wIm < 0 ? '−' : '+'} {Math.abs(trace.wIm).toPrecision(4)}i · |w| {trace.magnitude.toPrecision(4)} · arg {trace.phase.toPrecision(4)}</output> : null}
  </section>;
}
