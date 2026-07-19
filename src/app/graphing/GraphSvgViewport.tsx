import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  GraphScenePathRuntime,
  GraphViewportV1,
  SampledSceneRuntime,
} from '../../lib/graphing';

type GraphSvgViewportProps = {
  pending: boolean;
  scene: SampledSceneRuntime | null;
  viewport: GraphViewportV1;
  onSizeChange: (size: { width: number; height: number }) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
};

type ViewportSize = { width: number; height: number };

const WHEEL_SETTLE_MS = 180;

const GRAPH_COLORS: Record<string, string> = {
  'graph-blue': '#5598ff',
  'graph-green': '#59dd88',
  'graph-violet': '#ae68f5',
  'graph-orange': '#ff9b4c',
  'graph-cyan': '#52d4d8',
};

function screenPoint(
  x: number,
  y: number,
  viewport: GraphViewportV1,
  size: ViewportSize,
) {
  return {
    x: (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
    y: (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * size.height,
  };
}

function pathData(
  path: GraphScenePathRuntime,
  viewport: GraphViewportV1,
  size: ViewportSize,
) {
  const segmentStarts = new Set(path.segmentOffsets);
  let output = '';
  for (let vertex = 0; vertex * 2 + 1 < path.coordinates.length; vertex += 1) {
    const point = screenPoint(
      path.coordinates[vertex * 2],
      path.coordinates[vertex * 2 + 1],
      viewport,
      size,
    );
    output += `${segmentStarts.has(vertex) ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return output;
}

function comfortableStep(span: number) {
  const raw = span / 10;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function tickValues(minimum: number, maximum: number, step: number) {
  const first = Math.ceil(minimum / step) * step;
  const values: number[] = [];
  for (let value = first; value <= maximum + step * 1e-6 && values.length < 40; value += step) {
    values.push(Math.abs(value) < step * 1e-9 ? 0 : value);
  }
  return values;
}

function formatTick(value: number, step: number) {
  if (value === 0) return '0';
  const decimals = Math.max(0, Math.min(4, -Math.floor(Math.log10(step))));
  return value.toFixed(decimals).replace(/\.0+$/u, '');
}

export function GraphSvgViewport({
  onSizeChange,
  onViewportChange,
  pending,
  scene,
  viewport,
}: GraphSvgViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef(viewport);
  const sizeRef = useRef<ViewportSize>({ width: 960, height: 600 });
  const pointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    viewport: GraphViewportV1;
  } | null>(null);
  const wheelRef = useRef<{
    scale: number;
    x: number;
    y: number;
    viewport: GraphViewportV1;
  } | null>(null);
  const frameRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState<ViewportSize>({ width: 960, height: 600 });

  useLayoutEffect(() => {
    viewportRef.current = viewport;
    const layer = gestureLayerRef.current;
    if (layer && !pointerRef.current && !wheelRef.current) layer.style.transform = '';
  }, [viewport]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const commitSize = (width: number, height: number) => {
      const next = {
        width: Math.max(1, Math.round(width || 960)),
        height: Math.max(1, Math.round(height || 600)),
      };
      sizeRef.current = next;
      setSize(next);
      onSizeChange(next);
    };
    commitSize(host.clientWidth, host.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) commitSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [onSizeChange]);

  const requestTransformFrame = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const layer = gestureLayerRef.current;
      if (!layer) return;
      const pointer = pointerRef.current;
      if (pointer) {
        layer.style.transform = `translate3d(${pointer.dx}px, ${pointer.dy}px, 0)`;
        return;
      }
      const wheel = wheelRef.current;
      if (wheel) {
        layer.style.transformOrigin = `${wheel.x}px ${wheel.y}px`;
        layer.style.transform = `scale(${wheel.scale})`;
      }
    });
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const preventNativeSelection = (event: Event) => event.preventDefault();
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      host.dataset.interacting = 'true';
      const bounds = host.getBoundingClientRect();
      const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
      const current = wheelRef.current ?? {
        scale: 1,
        x,
        y,
        viewport: viewportRef.current,
      };
      current.scale = Math.max(0.35, Math.min(3.5, current.scale * Math.exp(-event.deltaY * 0.0015)));
      wheelRef.current = current;
      requestTransformFrame();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        const wheel = wheelRef.current;
        wheelRef.current = null;
        if (!wheel) return;
        const base = wheel.viewport;
        const width = Math.max(1, sizeRef.current.width);
        const height = Math.max(1, sizeRef.current.height);
        const xRatio = wheel.x / width;
        const yRatio = wheel.y / height;
        const xCenter = base.xMin + xRatio * (base.xMax - base.xMin);
        const yCenter = base.yMax - yRatio * (base.yMax - base.yMin);
        const xSpan = (base.xMax - base.xMin) / wheel.scale;
        const ySpan = (base.yMax - base.yMin) / wheel.scale;
        onViewportChange({
          coordinateSystem: 'cartesian',
          xMin: xCenter - xRatio * xSpan,
          xMax: xCenter + (1 - xRatio) * xSpan,
          yMin: yCenter - (1 - yRatio) * ySpan,
          yMax: yCenter + yRatio * ySpan,
        });
        delete host.dataset.interacting;
      }, WHEEL_SETTLE_MS);
    };
    host.addEventListener('wheel', handleWheel, { passive: false });
    host.addEventListener('dragstart', preventNativeSelection);
    host.addEventListener('selectstart', preventNativeSelection);
    return () => {
      host.removeEventListener('wheel', handleWheel);
      host.removeEventListener('dragstart', preventNativeSelection);
      host.removeEventListener('selectstart', preventNativeSelection);
    };
  }, [onViewportChange]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.dataset.interacting = 'true';
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      viewport: viewportRef.current,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    pointer.dx = event.clientX - pointer.startX;
    pointer.dy = event.clientY - pointer.startY;
    requestTransformFrame();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    delete event.currentTarget.dataset.interacting;
    const xShift = -pointer.dx / Math.max(1, size.width) * (pointer.viewport.xMax - pointer.viewport.xMin);
    const yShift = pointer.dy / Math.max(1, size.height) * (pointer.viewport.yMax - pointer.viewport.yMin);
    onViewportChange({
      coordinateSystem: 'cartesian',
      xMin: pointer.viewport.xMin + xShift,
      xMax: pointer.viewport.xMax + xShift,
      yMin: pointer.viewport.yMin + yShift,
      yMax: pointer.viewport.yMax + yShift,
    });
  };

  const xStep = comfortableStep(viewport.xMax - viewport.xMin);
  const yStep = comfortableStep(viewport.yMax - viewport.yMin);
  const xTicks = useMemo(
    () => tickValues(viewport.xMin, viewport.xMax, xStep),
    [viewport.xMax, viewport.xMin, xStep],
  );
  const yTicks = useMemo(
    () => tickValues(viewport.yMin, viewport.yMax, yStep),
    [viewport.yMax, viewport.yMin, yStep],
  );
  const projectedPaths = useMemo(() => scene?.paths.map((path) => ({
    id: path.pathId,
    color: GRAPH_COLORS[path.style.colorToken] ?? '#5598ff',
    data: pathData(path, viewport, size),
  })) ?? [], [scene, size, viewport]);
  const xAxis = screenPoint(0, 0, viewport, size).y;
  const yAxis = screenPoint(0, 0, viewport, size).x;

  return (
    <div
      className="graph-svg-viewport"
      data-scene-pending={pending ? 'true' : 'false'}
      data-testid="graph-viewport"
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      ref={hostRef}
    >
      <div className="graph-svg-gesture-layer" ref={gestureLayerRef}>
        <svg
          aria-label="Interactive Cartesian graph"
          className="graph-svg-canvas"
          role="img"
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          <g className="graph-svg-grid" aria-hidden="true">
            {xTicks.map((value) => {
              const x = screenPoint(value, 0, viewport, size).x;
              return <line key={`x-${value}`} x1={x} x2={x} y1={0} y2={size.height} />;
            })}
            {yTicks.map((value) => {
              const y = screenPoint(0, value, viewport, size).y;
              return <line key={`y-${value}`} x1={0} x2={size.width} y1={y} y2={y} />;
            })}
          </g>
          <g className="graph-svg-axes" aria-hidden="true">
            {xAxis >= 0 && xAxis <= size.height ? <line x1={0} x2={size.width} y1={xAxis} y2={xAxis} /> : null}
            {yAxis >= 0 && yAxis <= size.width ? <line x1={yAxis} x2={yAxis} y1={0} y2={size.height} /> : null}
          </g>
          <g className="graph-svg-ticks" aria-hidden="true">
            {xTicks.filter((value) => value !== 0).map((value) => {
              const point = screenPoint(value, 0, viewport, size);
              const x = Math.max(18, Math.min(size.width - 18, point.x));
              const y = Math.max(18, Math.min(size.height - 8, xAxis + 20));
              return <text key={`xt-${value}`} x={x} y={y}>{formatTick(value, xStep)}</text>;
            })}
            {yTicks.filter((value) => value !== 0).map((value) => {
              const point = screenPoint(0, value, viewport, size);
              const x = Math.max(18, Math.min(size.width - 18, yAxis - 10));
              const y = Math.max(14, Math.min(size.height - 8, point.y + 4));
              return <text key={`yt-${value}`} x={x} y={y}>{formatTick(value, yStep)}</text>;
            })}
          </g>
          <g className="graph-svg-paths" data-testid="graph-scene-paths">
            {projectedPaths.map((path) => (
              <path
                d={path.data}
                data-path-id={path.id}
                fill="none"
                key={path.id}
                stroke={path.color}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
      </div>
      {scene === null ? (
        <div className="graph-viewport-empty" aria-hidden="true">
          <span>Enter an x-based expression to begin</span>
          <small>Try x² − 4 or sin(x)</small>
        </div>
      ) : null}
    </div>
  );
}
