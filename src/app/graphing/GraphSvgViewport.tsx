import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  GraphSvgReferenceRenderer,
  type GraphViewportV1,
  type SampledSceneRuntime,
} from '../../lib/graphing';
import {
  firstGraphTraceTarget,
  hitTestGraphScene,
  stepGraphTraceTarget,
  traceGraphPathAtPointer,
  type GraphTraceTarget,
} from './graph-hit-testing';

export type GraphTraceRouteKind = 'explicit-y' | 'explicit-x' | 'point-set';

type GraphSvgViewportProps = {
  pending: boolean;
  scene: SampledSceneRuntime | null;
  viewport: GraphViewportV1;
  itemRoutes: Readonly<Record<string, GraphTraceRouteKind>>;
  onSizeChange: (size: { width: number; height: number }) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
};

type ViewportSize = { width: number; height: number };

const WHEEL_SETTLE_MS = 80;

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

function formatTraceNumber(value: number) {
  const rounded = Math.abs(value) < 1e-10 ? 0 : Number(value.toPrecision(6));
  return String(rounded);
}

export function GraphSvgViewport({
  itemRoutes,
  onSizeChange,
  onViewportChange,
  pending,
  scene,
  viewport,
}: GraphSvgViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement | null>(null);
  const geometryHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GraphSvgReferenceRenderer | null>(null);
  const traceMarkerRef = useRef<HTMLDivElement | null>(null);
  const traceLabelRef = useRef<HTMLDivElement | null>(null);
  const traceRef = useRef<GraphTraceTarget | null>(null);
  const tracePointerRef = useRef<{ x: number; y: number } | null>(null);
  const traceFrameRef = useRef<number | null>(null);
  const sceneRef = useRef(scene);
  const itemRoutesRef = useRef(itemRoutes);
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
    const target = geometryHostRef.current;
    if (!target) return;
    const renderer = new GraphSvgReferenceRenderer();
    renderer.mount(target);
    rendererRef.current = renderer;
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.resize(size.width, size.height, window.devicePixelRatio || 1);
    if (scene) {
      renderer.render({
        version: 1,
        scene,
        viewport,
        policy: {
          quality: pending ? 'interactive-preview' : 'settled',
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          maximumVertices: renderer.capabilities.maximumVertices,
          maximumLabels: 250,
          pixelRatioCap: 2,
        },
      });
    } else {
      renderer.clear();
    }
  }, [pending, scene, size, viewport]);

  useLayoutEffect(() => {
    viewportRef.current = viewport;
    sceneRef.current = scene;
    itemRoutesRef.current = itemRoutes;
    const layer = gestureLayerRef.current;
    if (layer && !pointerRef.current && !wheelRef.current) layer.style.transform = '';
  }, [itemRoutes, scene, viewport]);

  const clearTrace = useCallback(() => {
    traceRef.current = null;
    const marker = traceMarkerRef.current;
    const label = traceLabelRef.current;
    if (marker) marker.hidden = true;
    if (label) {
      label.hidden = true;
      label.textContent = '';
    }
  }, []);

  const publishTrace = useCallback((target: GraphTraceTarget | null, announce = false) => {
    if (!target) {
      clearTrace();
      return;
    }
    traceRef.current = target;
    const marker = traceMarkerRef.current;
    const label = traceLabelRef.current;
    if (!marker || !label) return;
    marker.hidden = false;
    marker.style.transform = `translate3d(${target.screen.x - 6}px, ${target.screen.y - 6}px, 0)`;
    const labelX = Math.max(8, Math.min(sizeRef.current.width - 150, target.screen.x + 12));
    const labelY = Math.max(8, Math.min(sizeRef.current.height - 38, target.screen.y - 36));
    label.hidden = false;
    label.style.transform = `translate3d(${labelX}px, ${labelY}px, 0)`;
    const text = `(${formatTraceNumber(target.world.x)}, ${formatTraceNumber(target.world.y)})`;
    label.textContent = text;
    if (announce) label.setAttribute('aria-label', `Trace point ${text}`);
  }, [clearTrace]);

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
      clearTrace();
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
  }, [clearTrace, onViewportChange]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (traceFrameRef.current !== null) cancelAnimationFrame(traceFrameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
  }, []);

  useEffect(() => {
    if (pending || !scene) clearTrace();
  }, [clearTrace, pending, scene, viewport]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    clearTrace();
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
    if (pointer && pointer.pointerId === event.pointerId) {
      pointer.dx = event.clientX - pointer.startX;
      pointer.dy = event.clientY - pointer.startY;
      requestTransformFrame();
      return;
    }
    const currentTrace = traceRef.current;
    const currentScene = sceneRef.current;
    const host = hostRef.current;
    if (!currentTrace || !currentScene || pending || !host) return;
    const bounds = host.getBoundingClientRect();
    tracePointerRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    if (traceFrameRef.current !== null) return;
    traceFrameRef.current = requestAnimationFrame(() => {
      traceFrameRef.current = null;
      const screen = tracePointerRef.current;
      const active = traceRef.current;
      const activeScene = sceneRef.current;
      if (!screen || !active || !activeScene) return;
      const route = itemRoutesRef.current[active.itemId];
      const target = route === 'explicit-y' || route === 'explicit-x'
        ? traceGraphPathAtPointer({
            scene: activeScene,
            viewport: viewportRef.current,
            size: sizeRef.current,
            itemId: active.itemId,
            relationKind: route,
            screen,
          })
        : hitTestGraphScene({
            scene: activeScene,
            viewport: viewportRef.current,
            size: sizeRef.current,
            screen,
            itemId: active.itemId,
            maximumDistancePixels: 24,
          });
      if (target) publishTrace(target);
    });
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    delete event.currentTarget.dataset.interacting;
    if (Math.hypot(pointer.dx, pointer.dy) <= 4) {
      const currentScene = sceneRef.current;
      if (!pending && currentScene) {
        const bounds = event.currentTarget.getBoundingClientRect();
        publishTrace(hitTestGraphScene({
          scene: currentScene,
          viewport: viewportRef.current,
          size: sizeRef.current,
          screen: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        }), true);
      }
      return;
    }
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

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentScene = sceneRef.current;
    if (!currentScene || pending) return;
    if (event.key === 'Escape') {
      clearTrace();
      return;
    }
    if (event.key === 'Enter' && !traceRef.current) {
      event.preventDefault();
      publishTrace(firstGraphTraceTarget(currentScene, viewportRef.current, sizeRef.current), true);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      || !traceRef.current) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1;
    publishTrace(stepGraphTraceTarget({
      scene: currentScene,
      viewport: viewportRef.current,
      size: sizeRef.current,
      current: traceRef.current,
      delta,
    }), true);
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
  const xAxis = screenPoint(0, 0, viewport, size).y;
  const yAxis = screenPoint(0, 0, viewport, size).x;

  return (
    <div
      className="graph-svg-viewport"
      data-scene-pending={pending ? 'true' : 'false'}
      data-testid="graph-viewport"
      aria-describedby="graph-trace-instructions"
      aria-label="Interactive Cartesian graph. Press Enter to start keyboard tracing."
      role="region"
      onKeyDown={handleKeyDown}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      ref={hostRef}
      tabIndex={0}
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
        </svg>
        <div className="graph-svg-geometry-host" ref={geometryHostRef} />
      </div>
      <div className="graph-trace-marker" hidden ref={traceMarkerRef} />
      <div aria-live="polite" className="graph-trace-callout" hidden ref={traceLabelRef} role="status" />
      <span className="graph-trace-instructions" id="graph-trace-instructions">
        Click a curve or point to trace it. Use arrow keys to move along the selected item and Escape to stop.
      </span>
      {scene === null ? (
        <div className="graph-viewport-empty" aria-hidden="true">
          <span>Enter an x-based expression to begin</span>
          <small>Try x² − 4 or sin(x)</small>
        </div>
      ) : null}
    </div>
  );
}
