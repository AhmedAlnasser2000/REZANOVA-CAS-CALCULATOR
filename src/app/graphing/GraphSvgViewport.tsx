import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  buildGraphGridScene,
  GraphSvgReferenceRenderer,
  type GraphGridPolicyV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
  type SampledSceneRuntimeV2,
} from '../../lib/graphing';
import {
  buildGraphTraceIndex,
  firstGraphTraceTarget,
  hitTestGraphTraceIndex,
  stepGraphTraceTarget,
  traceGraphPathAtPointer,
  type GraphTraceIndex,
  type GraphTraceTarget,
} from './graph-hit-testing';

export type GraphTraceRouteKind = 'explicit-y' | 'explicit-x' | 'point-set'
  | { kind: 'polar-radius'; parameterSymbol: 'theta' }
  | { kind: 'parametric-curve'; parameterSymbol: string };

type Props = {
  grid?: GraphGridPolicyV1;
  pending: boolean;
  presentation?: GraphRendererPresentationFrame;
  scene: SampledSceneRuntimeV2 | null;
  sceneViewport?: GraphViewportV1 | null;
  viewport: GraphViewportV1;
  itemRoutes: Readonly<Record<string, GraphTraceRouteKind>>;
  onSizeChange: (size: { width: number; height: number }) => void;
  onTraceItemChange?: (itemId: string | null) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
};
type Size = { width: number; height: number };
type TraceLock = {
  itemId: string;
  kind: GraphTraceTarget['kind'];
  pathId?: string;
  pointBatchId?: string;
};
const WHEEL_SETTLE_MS = 180;
const CLICK_DISTANCE = 24;
const RETAIN_DISTANCE = 30;

function formatTraceNumber(value: number) {
  return String(Math.abs(value) < 1e-10 ? 0 : Number(value.toPrecision(6)));
}

function zoomViewport(base: GraphViewportV1, scale: number, x: number, y: number, size: Size) {
  const xRatio = x / Math.max(1, size.width); const yRatio = y / Math.max(1, size.height);
  const centerX = base.xMin + xRatio * (base.xMax - base.xMin);
  const centerY = base.yMax - yRatio * (base.yMax - base.yMin);
  const xSpan = (base.xMax - base.xMin) / scale; const ySpan = (base.yMax - base.yMin) / scale;
  return { coordinateSystem: base.coordinateSystem,
    xMin: centerX - xRatio * xSpan, xMax: centerX + (1 - xRatio) * xSpan,
    yMin: centerY - (1 - yRatio) * ySpan, yMax: centerY + yRatio * ySpan };
}

function panViewport(base: GraphViewportV1, dx: number, dy: number, size: Size) {
  const xShift = -dx / Math.max(1, size.width) * (base.xMax - base.xMin);
  const yShift = dy / Math.max(1, size.height) * (base.yMax - base.yMin);
  return { coordinateSystem: base.coordinateSystem,
    xMin: base.xMin + xShift, xMax: base.xMax + xShift,
    yMin: base.yMin + yShift, yMax: base.yMax + yShift };
}

export function GraphSvgViewport({
  grid = { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
  itemRoutes, onSizeChange, onTraceItemChange, onViewportChange, pending,
  presentation = { version: 1, contentRevision: 0, items: [] }, scene, viewport, sceneViewport = viewport,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GraphSvgReferenceRenderer | null>(null);
  const traceMarkerRef = useRef<HTMLDivElement | null>(null);
  const traceLabelRef = useRef<HTMLDivElement | null>(null);
  const traceRef = useRef<GraphTraceTarget | null>(null);
  const traceLockRef = useRef<TraceLock | null>(null);
  const tracePointerRef = useRef<{ x: number; y: number } | null>(null);
  const traceIndexRef = useRef<GraphTraceIndex | null>(null);
  const traceFrameRef = useRef<number | null>(null);
  const viewFrameRef = useRef<number | null>(null);
  const sceneRef = useRef(scene); const routesRef = useRef(itemRoutes);
  const pendingRef = useRef(pending); const viewportRef = useRef(viewport);
  const liveViewportRef = useRef(viewport); const gridRef = useRef(grid);
  const sizeRef = useRef<Size>({ width: 960, height: 600 });
  const gridHysteresisRef = useRef<string | undefined>(undefined);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startScreenX: number;
    startScreenY: number;
    clientDx: number;
    clientDy: number;
    screenDx: number;
    screenDy: number;
    viewport: GraphViewportV1;
    pointerType: string;
  } | null>(null);
  const wheelRef = useRef<{ scale: number; x: number; y: number; viewport: GraphViewportV1 } | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState<Size>({ width: 960, height: 600 });

  const renderView = useCallback((liveViewport: GraphViewportV1) => {
    liveViewportRef.current = liveViewport;
    const gridScene = buildGraphGridScene({ viewport: liveViewport, cssSize: sizeRef.current,
      policy: gridRef.current, previousHysteresisKey: gridHysteresisRef.current });
    gridHysteresisRef.current = gridScene.hysteresisKey;
    rendererRef.current?.setView({ version: 1, viewport: liveViewport, grid: gridScene,
      policy: { quality: 'interactive-preview', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: 250_000, maximumLabels: 250, pixelRatioCap: 2 } });
  }, []);

  const requestView = useCallback((next: GraphViewportV1) => {
    liveViewportRef.current = next;
    if (viewFrameRef.current !== null) return;
    viewFrameRef.current = requestAnimationFrame(() => { viewFrameRef.current = null; renderView(liveViewportRef.current); });
  }, [renderView]);

  const clientToScreen = useCallback((clientX: number, clientY: number) => {
    const projected = rendererRef.current?.clientToScreen(clientX, clientY);
    if (projected) return projected;
    const bounds = hostRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return { x: clientX, y: clientY };
    return {
      x: (clientX - bounds.left) * sizeRef.current.width / bounds.width,
      y: (clientY - bounds.top) * sizeRef.current.height / bounds.height,
    };
  }, []);

  useLayoutEffect(() => {
    if (!rendererHostRef.current) return;
    const renderer = new GraphSvgReferenceRenderer(); renderer.mount(rendererHostRef.current); rendererRef.current = renderer;
    renderView(viewportRef.current);
    return () => { renderer.dispose(); rendererRef.current = null; };
  }, [renderView]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current; if (!renderer) return;
    renderer.resize(size.width, size.height, window.devicePixelRatio || 1); renderView(liveViewportRef.current);
  }, [renderView, size]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current; if (!renderer) return;
    renderer.setScene(scene && sceneViewport ? { version: 1, scene, sourceViewport: sceneViewport,
      policy: { quality: 'settled', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: renderer.capabilities.maximumVertices, maximumLabels: 250, pixelRatioCap: 2 } } : null);
  }, [scene, sceneViewport]);

  useLayoutEffect(() => {
    rendererRef.current?.setPresentation(presentation);
  }, [presentation]);

  const hideTrace = useCallback(() => {
    if (traceMarkerRef.current) {
      traceMarkerRef.current.hidden = true;
      delete traceMarkerRef.current.dataset.traceItemId;
    }
    if (traceLabelRef.current) {
      traceLabelRef.current.hidden = true;
      delete traceLabelRef.current.dataset.traceItemId;
    }
  }, []);
  const clearTrace = useCallback(() => {
    traceRef.current = null;
    traceLockRef.current = null;
    tracePointerRef.current = null;
    hideTrace();
    onTraceItemChange?.(null);
  }, [hideTrace, onTraceItemChange]);
  const publishTrace = useCallback((target: GraphTraceTarget | null, announce = false) => {
    if (!target) { traceRef.current = null; hideTrace(); return; }
    traceRef.current = target;
    if (announce) onTraceItemChange?.(target.itemId);
    const marker = traceMarkerRef.current; const label = traceLabelRef.current; if (!marker || !label) return;
    marker.hidden = false; marker.style.transform = `translate3d(${target.screen.x - 6}px,${target.screen.y - 6}px,0)`;
    marker.dataset.traceItemId = target.itemId;
    const lx = Math.max(8, Math.min(sizeRef.current.width - 150, target.screen.x + 12));
    const ly = Math.max(8, Math.min(sizeRef.current.height - 38, target.screen.y - 36));
    label.hidden = false; label.style.transform = `translate3d(${lx}px,${ly}px,0)`;
    label.dataset.traceItemId = target.itemId;
    const text = `(${formatTraceNumber(target.world.x)}, ${formatTraceNumber(target.world.y)})`;
    const route = routesRef.current[target.itemId];
    label.textContent = text + (target.parameterValue !== undefined && typeof route === 'object' ? ` · ${route.parameterSymbol}=${formatTraceNumber(target.parameterValue)}` : '');
    if (announce) label.setAttribute('aria-label', `Trace point ${text}`); else label.removeAttribute('aria-label');
  }, [hideTrace, onTraceItemChange]);

  useEffect(() => {
    sceneRef.current = scene; routesRef.current = itemRoutes; pendingRef.current = pending;
    if (scene && !pending) {
      traceIndexRef.current = buildGraphTraceIndex(scene, viewport, sizeRef.current);
    } else { traceIndexRef.current = null; hideTrace(); }
  }, [hideTrace, itemRoutes, pending, scene, size, viewport]);

  useLayoutEffect(() => {
    viewportRef.current = viewport; gridRef.current = grid;
    if (!dragRef.current && !wheelRef.current) { liveViewportRef.current = viewport; renderView(viewport); }
  }, [grid, renderView, viewport]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const commitSize = (width: number, height: number) => {
      const next = { width: Math.max(1, Math.round(width || 960)), height: Math.max(1, Math.round(height || 600)) };
      sizeRef.current = next; setSize(next); onSizeChange(next);
    };
    commitSize(host.clientWidth, host.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => { if (entry) commitSize(entry.contentRect.width, entry.contentRect.height); });
    observer.observe(host); return () => observer.disconnect();
  }, [onSizeChange]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const prevent = (event: Event) => event.preventDefault();
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); clearTrace(); host.dataset.interacting = 'true';
      const pointer = clientToScreen(event.clientX, event.clientY);
      const x = Math.max(0, Math.min(sizeRef.current.width, pointer.x));
      const y = Math.max(0, Math.min(sizeRef.current.height, pointer.y));
      const state = wheelRef.current ?? { scale: 1, x, y, viewport: viewportRef.current };
      state.scale = Math.max(0.25, Math.min(4, state.scale * Math.exp(-event.deltaY * 0.0015))); wheelRef.current = state;
      requestView(zoomViewport(state.viewport, state.scale, state.x, state.y, sizeRef.current));
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        const settled = liveViewportRef.current; wheelRef.current = null; delete host.dataset.interacting;
        viewportRef.current = settled; onViewportChange(settled);
      }, WHEEL_SETTLE_MS);
    };
    host.addEventListener('wheel', wheel, { passive: false }); host.addEventListener('dragstart', prevent); host.addEventListener('selectstart', prevent);
    return () => { host.removeEventListener('wheel', wheel); host.removeEventListener('dragstart', prevent); host.removeEventListener('selectstart', prevent); };
  }, [clearTrace, clientToScreen, onViewportChange, requestView]);

  useEffect(() => () => {
    if (viewFrameRef.current !== null) cancelAnimationFrame(viewFrameRef.current);
    if (traceFrameRef.current !== null) cancelAnimationFrame(traceFrameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    clearTrace();
    const screen = clientToScreen(event.clientX, event.clientY);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScreenX: screen.x,
      startScreenY: screen.y,
      clientDx: 0,
      clientDy: 0,
      screenDx: 0,
      screenDy: 0,
      viewport: viewportRef.current,
      pointerType: event.pointerType,
    };
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const screen = clientToScreen(event.clientX, event.clientY);
      drag.clientDx = event.clientX - drag.startClientX;
      drag.clientDy = event.clientY - drag.startClientY;
      drag.screenDx = screen.x - drag.startScreenX;
      drag.screenDy = screen.y - drag.startScreenY;
      if (Math.hypot(drag.clientDx, drag.clientDy) > 4) {
        hideTrace(); event.currentTarget.dataset.interacting = 'true';
        requestView(panViewport(drag.viewport, drag.screenDx, drag.screenDy, sizeRef.current));
      }
      return;
    }
    const lock = traceLockRef.current;
    const currentScene = sceneRef.current;
    const index = traceIndexRef.current;
    if (!lock || !currentScene || !index || pendingRef.current || wheelRef.current) return;
    tracePointerRef.current = clientToScreen(event.clientX, event.clientY);
    if (traceFrameRef.current !== null) return;
    traceFrameRef.current = requestAnimationFrame(() => {
      traceFrameRef.current = null;
      const screen = tracePointerRef.current;
      if (!screen) return;
      const route = routesRef.current[lock.itemId];
      const target = route === 'explicit-y' || route === 'explicit-x'
        ? traceGraphPathAtPointer({ scene: currentScene, viewport: viewportRef.current, size: sizeRef.current,
            itemId: lock.itemId, pathId: lock.pathId, relationKind: route, screen })
        : hitTestGraphTraceIndex({ index, scene: currentScene, screen,
            maximumDistancePixels: RETAIN_DISTANCE, itemId: lock.itemId,
            pathId: lock.pathId, pointBatchId: lock.pointBatchId });
      publishTrace(target);
    });
  };
  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null; delete event.currentTarget.dataset.interacting;
    if (Math.hypot(drag.clientDx, drag.clientDy) > 4) { const settled = liveViewportRef.current; viewportRef.current = settled; onViewportChange(settled); return; }
    const screen = clientToScreen(event.clientX, event.clientY);
    const currentScene = sceneRef.current; const index = traceIndexRef.current;
    const current = currentScene && index && !pendingRef.current
      ? hitTestGraphTraceIndex({ index, scene: currentScene, screen,
          maximumDistancePixels: drag.pointerType === 'touch' ? 28 : CLICK_DISTANCE })
      : null;
    if (current) {
      traceLockRef.current = {
        itemId: current.itemId,
        kind: current.kind,
        ...(current.pathId ? { pathId: current.pathId } : {}),
        ...(current.pointBatchId ? { pointBatchId: current.pointBatchId } : {}),
      };
      publishTrace(current, true);
    }
    else clearTrace();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentScene = sceneRef.current; if (!currentScene || pendingRef.current) return;
    if (event.key === 'Escape') { clearTrace(); return; }
    if (event.key === 'Enter' && !traceRef.current) {
      event.preventDefault();
      const first = firstGraphTraceTarget(currentScene, viewportRef.current, sizeRef.current);
      if (first) {
        traceLockRef.current = {
          itemId: first.itemId,
          kind: first.kind,
          ...(first.pathId ? { pathId: first.pathId } : {}),
          ...(first.pointBatchId ? { pointBatchId: first.pointBatchId } : {}),
        };
      }
      publishTrace(first, true); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !traceRef.current) return;
    event.preventDefault();
    publishTrace(stepGraphTraceTarget({ scene: currentScene, viewport: viewportRef.current,
      size: sizeRef.current, current: traceRef.current, delta: event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1 }), true);
  };

  const hasGeometry = scene !== null && (scene.paths.some((path) => !path.itemId.startsWith('graph-overlay.')) || scene.regions.length > 0 || scene.pointBatches.length > 0);
  return <div className="graph-svg-viewport" data-scene-pending={pending ? 'true' : 'false'} data-testid="graph-viewport"
    aria-describedby="graph-trace-instructions" aria-label={`Interactive ${grid.kind} graph. Press Enter to start keyboard tracing.`}
    role="region" onKeyDown={handleKeyDown} onPointerCancel={finishPointer} onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove} onPointerUp={finishPointer} ref={hostRef} tabIndex={0}>
    <div className="graph-svg-renderer-host" ref={rendererHostRef} />
    <div className="graph-trace-marker" hidden ref={traceMarkerRef} />
    <div aria-live="polite" className="graph-trace-callout" hidden ref={traceLabelRef} role="status" />
    <span className="graph-trace-instructions" id="graph-trace-instructions">Click a curve or point to trace it. Move to sweep, use arrows to step, and Escape to clear.</span>
    {!hasGeometry ? <div className="graph-viewport-empty" aria-hidden="true"><span>Enter an x-based expression to begin</span><small>Try x² − 4 or sin(x)</small></div> : null}
  </div>;
}
