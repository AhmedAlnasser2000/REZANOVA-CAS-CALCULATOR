import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  buildGraphGridScene,
  GraphSvgReferenceRenderer,
  loadGraphComplexTraceEvaluator,
  type GraphComplexTraceValue,
  type GraphDocumentV4,
  type GraphGridPolicyV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
  type GraphSpatialSceneRuntimeV2,
  type SampledSceneRuntimeV2,
} from '../../lib/graphing';
import {
  buildGraphTraceIndex,
  firstGraphTraceTarget,
  graphComplexValuePart,
  hitTestGraphTraceIndex,
  stepGraphTraceTarget,
  traceGraphPathAtPointer,
  type GraphTraceIndex,
  type GraphTraceTarget,
} from './graph-hit-testing';
import { graphParameterEnvironment } from './graph-controller-support';
import { WHEEL_SETTLE_MS } from './graph-gesture-timing';
import type { GraphGestureLane } from './useGraphGestureSampling';
import { useGraphRealFieldGpu } from './useGraphRealFieldGpu';
import type { PtxTracedPoint } from './ptx/usePtxComplexTrace';
import type { PtxDot } from './ptx/usePtxPointsOfInterest';

export type GraphTraceRouteKind = 'explicit-y' | 'explicit-x' | 'point-set'
  | 'real-surface'
  | { kind: 'polar-radius'; parameterSymbol: 'theta' }
  | { kind: 'parametric-curve'; parameterSymbol: string };

type Props = {
  /** Document for GPU visual evaluation of implicit/inequality relations. */
  document?: GraphDocumentV4 | null;
  /** Latest-only preview lane that refreshes formula curves during gestures. */
  gestureLane?: GraphGestureLane | null;
  gpuRendering?: 'auto' | 'off';
  grid?: GraphGridPolicyV1;
  pending: boolean;
  presentation?: GraphRendererPresentationFrame;
  /** Points of interest of the selected item. */
  ptxDots?: readonly PtxDot[];
  /** A point traced in the Complex pane, marked here at (Re z, Im z). */
  ptxMirror?: PtxTracedPoint;
  scene: GraphSpatialSceneRuntimeV2 | SampledSceneRuntimeV2 | null;
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
const CLICK_DISTANCE = 24;
const RETAIN_DISTANCE = 30;
const GESTURE_LANE_INTERVAL_MS = 100;

function asSpatialScene(scene: GraphSpatialSceneRuntimeV2 | SampledSceneRuntimeV2 | null) {
  return scene && 'planarScene' in scene ? scene
    : scene ? { version: 2 as const, planarScene: scene, surfaceMeshes: [], complexTiles: [] } : null;
}

/** Positions the Complex pane's traced point in this pane (x = Re z, y = Im z), hidden when off-screen. */
function placeMirror(element: HTMLDivElement | null, point: PtxTracedPoint | undefined, live: GraphViewportV1, size: Size) {
  if (!element) return;
  const x = point ? (point.x - live.xMin) / (live.xMax - live.xMin) * size.width : NaN;
  const y = point ? (live.yMax - point.y) / (live.yMax - live.yMin) * size.height : NaN;
  element.hidden = !(x >= 0 && x <= size.width && y >= 0 && y <= size.height);
  if (!element.hidden) element.style.transform = `translate3d(${x - 6}px,${y - 6}px,0)`;
}

function formatTraceNumber(value: number) {
  return String(Math.abs(value) < 1e-10 ? 0 : Number(value.toPrecision(6)));
}

/** Two callout lines for a real curve's Re/Im path: which part it is, then the whole value. */
function complexPartCallout(part: 'real' | 'imaginary', x: number, value: GraphComplexTraceValue) {
  const at = formatTraceNumber(x);
  const imaginary = formatTraceNumber(Math.abs(value.im));
  return [
    `Complex part · ${part === 'imaginary' ? 'Im' : 'Re'} f(${at}) = ${formatTraceNumber(part === 'imaginary' ? value.im : value.re)}`,
    `f(${at}) = ${formatTraceNumber(value.re)} ${value.im < 0 && imaginary !== '0' ? '−' : '+'} ${imaginary}i`,
  ];
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

function surfaceTargetAtScreen(
  scene: GraphSpatialSceneRuntimeV2,
  viewport: GraphViewportV1,
  size: Size,
  screen: { x: number; y: number },
  itemId?: string,
): GraphTraceTarget | null {
  let best: GraphTraceTarget | null = null;
  for (const mesh of scene.surfaceMeshes) {
    if (itemId && mesh.itemId !== itemId) continue;
    for (let vertex = 0; vertex < mesh.positions.length / 3; vertex += 1) {
      const x = mesh.positions[vertex * 3]!; const y = mesh.positions[vertex * 3 + 1]!;
      const projected = { x: (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
        y: (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * size.height };
      const distancePixels = Math.hypot(projected.x - screen.x, projected.y - screen.y);
      if (distancePixels > CLICK_DISTANCE || (best && best.distancePixels <= distancePixels)) continue;
      best = { kind: 'surface', itemId: mesh.itemId, sceneRevision: scene.planarScene.sceneRevision,
        vertexIndex: vertex, world: { x, y, z: mesh.positions[vertex * 3 + 2]! }, screen: projected, distancePixels };
    }
  }
  return best;
}

export function GraphSvgViewport({
  grid = { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
  document = null, gestureLane = null, gpuRendering = 'auto', itemRoutes, onSizeChange, onTraceItemChange, onViewportChange, pending,
  presentation = { version: 1, contentRevision: 0, items: [] }, ptxMirror = null, scene, viewport, sceneViewport = viewport,
}: Props) {
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const mirrorPointRef = useRef(ptxMirror);
  const spatialScene = useMemo(() => asSpatialScene(scene), [scene]);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GraphSvgReferenceRenderer | null>(null);
  const traceMarkerRef = useRef<HTMLDivElement | null>(null);
  const traceLabelRef = useRef<HTMLDivElement | null>(null);
  const traceRef = useRef<GraphTraceTarget | null>(null);
  // Exact complex evaluators for curves showing their complex values (ℂ), by item.
  const complexTraceRef = useRef(new Map<string, (z: { re: number; im: number }) => GraphComplexTraceValue | null>());
  const traceLockRef = useRef<TraceLock | null>(null);
  const tracePointerRef = useRef<{ x: number; y: number } | null>(null);
  const traceIndexRef = useRef<GraphTraceIndex | null>(null);
  const traceFrameRef = useRef<number | null>(null);
  const viewFrameRef = useRef<number | null>(null);
  const sceneRef = useRef(spatialScene); const routesRef = useRef(itemRoutes);
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
  const getGpuSlot = useCallback(() => rendererRef.current?.getGpuSlot() ?? null, []);
  const surfaceRanges = useMemo(() => new Map((spatialScene?.surfaceMeshes ?? []).map((mesh) => {
    let minimum = Infinity; let maximum = -Infinity;
    for (let index = 2; index < mesh.positions.length; index += 3) {
      minimum = Math.min(minimum, mesh.positions[index]!); maximum = Math.max(maximum, mesh.positions[index]!);
    }
    return [mesh.itemId, { minimum, maximum }] as const;
  }).filter(([, range]) => Number.isFinite(range.minimum))), [spatialScene]);
  const { draw: gpuDraw, status: gpuStatus, suppressed: gpuSuppressed } = useGraphRealFieldGpu({
    document, enabled: gpuRendering === 'auto', getSlot: getGpuSlot, presentation, surfaceRanges,
  });
  const gpuDrawRef = useRef(gpuDraw);
  const gestureLaneRef = useRef(gestureLane);
  const gestureRequestAtRef = useRef(0);

  const renderView = useCallback((liveViewport: GraphViewportV1) => {
    liveViewportRef.current = liveViewport;
    placeMirror(mirrorRef.current, mirrorPointRef.current, liveViewport, sizeRef.current);
    if (hostRef.current) hostRef.current.dataset.viewport = `${liveViewport.xMin},${liveViewport.xMax},${liveViewport.yMin},${liveViewport.yMax}`;
    const gridScene = buildGraphGridScene({ viewport: liveViewport, cssSize: sizeRef.current,
      policy: gridRef.current, previousHysteresisKey: gridHysteresisRef.current });
    gridHysteresisRef.current = gridScene.hysteresisKey;
    rendererRef.current?.setView({ version: 1, viewport: liveViewport, grid: gridScene,
      policy: { quality: 'interactive-preview', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: 250_000, maximumLabels: 250, pixelRatioCap: 2 } });
    // GPU fields follow the live viewport every frame (visual evaluation only).
    const interacting = hostRef.current?.dataset.interacting === 'true';
    gpuDrawRef.current(liveViewport, interacting);
    const now = performance.now();
    if (interacting && gestureLaneRef.current && now - gestureRequestAtRef.current >= GESTURE_LANE_INTERVAL_MS) {
      gestureRequestAtRef.current = now;
      gestureLaneRef.current.request(liveViewport);
    }
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
    if (hostRef.current?.dataset.interacting !== 'true') gestureLaneRef.current?.clear();
    renderer.setScene(spatialScene && sceneViewport ? { version: 3, scene: spatialScene, sourceViewport: sceneViewport,
      policy: { quality: 'settled', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: renderer.capabilities.maximumVertices, maximumLabels: 250, pixelRatioCap: 2 } } : null);
  }, [scene, sceneViewport, spatialScene]);

  useLayoutEffect(() => {
    rendererRef.current?.setPresentation(presentation);
  }, [presentation]);

  useLayoutEffect(() => {
    rendererRef.current?.setSuppressedItems(gpuSuppressed);
  }, [gpuSuppressed]);

  useLayoutEffect(() => {
    gestureLaneRef.current = gestureLane;
    rendererRef.current?.setGestureScene(gestureLane?.getScene() ?? null);
    return gestureLane?.subscribe((next) => rendererRef.current?.setGestureScene(next));
  }, [gestureLane]);

  useLayoutEffect(() => {
    mirrorPointRef.current = ptxMirror;
    placeMirror(mirrorRef.current, ptxMirror, liveViewportRef.current, sizeRef.current);
  }, [ptxMirror]);

  useLayoutEffect(() => {
    gpuDrawRef.current = gpuDraw;
    requestView(liveViewportRef.current);
  }, [gpuDraw, requestView]);

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
    const labelWidth = graphComplexValuePart(target.pathId) ? 240 : 150;
    const lx = Math.max(8, Math.min(sizeRef.current.width - labelWidth, target.screen.x + 12));
    const ly = Math.max(8, Math.min(sizeRef.current.height - 38, target.screen.y - 36));
    label.hidden = false; label.style.transform = `translate3d(${lx}px,${ly}px,0)`;
    label.dataset.traceItemId = target.itemId;
    const part = graphComplexValuePart(target.pathId);
    const complexValue = part ? complexTraceRef.current.get(target.itemId)?.({ re: target.world.x, im: 0 }) : null;
    if (part && complexValue) {
      // Label the Re/Im path as the complex part and show the whole value, evaluated exactly at x.
      const lines = complexPartCallout(part, target.world.x, complexValue);
      label.classList.add('is-complex-part');
      label.textContent = lines.join('\n');
      if (announce) label.setAttribute('aria-label', `Trace point, ${lines.join('; ')}`); else label.removeAttribute('aria-label');
      return;
    }
    label.classList.remove('is-complex-part');
    const text = `(${formatTraceNumber(target.world.x)}, ${formatTraceNumber(target.world.y)}${target.world.z === undefined ? '' : `, ${formatTraceNumber(target.world.z)}`})`;
    const route = routesRef.current[target.itemId];
    label.textContent = text + (target.parameterValue !== undefined && typeof route === 'object' ? ` · ${route.parameterSymbol}=${formatTraceNumber(target.parameterValue)}` : '');
    if (announce) label.setAttribute('aria-label', `Trace point ${text}`); else label.removeAttribute('aria-label');
  }, [hideTrace, onTraceItemChange]);

  useEffect(() => {
    const curves = (document?.items ?? []).flatMap((item) => (item.kind === 'relation' && item.relation.kind === 'explicit-y'
      && item.relation.complexValues ? [{ itemId: item.itemId, mathJson: item.relation.rhs.mathJson }] : []));
    const evaluators = complexTraceRef.current;
    if (curves.length === 0) { evaluators.clear(); return undefined; }
    let live = true;
    const parameters = document ? graphParameterEnvironment(document) : {};
    void loadGraphComplexTraceEvaluator().then((create) => {
      if (!live) return;
      evaluators.clear();
      for (const curve of curves) {
        try { evaluators.set(curve.itemId, create(curve.mathJson, parameters, { target: 'x' })); } catch {
          // Operators outside the complex evaluator: the callout falls back to (x, y).
        }
      }
    });
    return () => { live = false; };
  }, [document]);

  useEffect(() => {
    sceneRef.current = spatialScene; routesRef.current = itemRoutes; pendingRef.current = pending;
    if (spatialScene && !pending) {
      traceIndexRef.current = buildGraphTraceIndex(spatialScene.planarScene, viewport, sizeRef.current);
    } else { traceIndexRef.current = null; hideTrace(); }
  }, [hideTrace, itemRoutes, pending, size, spatialScene, viewport]);

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
        gestureLaneRef.current?.freeze();
        viewportRef.current = settled; onViewportChange(settled);
      }, WHEEL_SETTLE_MS);
    };
    host.addEventListener('wheel', wheel, { passive: false }); host.addEventListener('dragstart', prevent); host.addEventListener('selectstart', prevent);
    return () => { host.removeEventListener('wheel', wheel); host.removeEventListener('dragstart', prevent); host.removeEventListener('selectstart', prevent); };
  }, [clearTrace, clientToScreen, onViewportChange, requestView]);

  // Reset the refs as well: StrictMode remounts reuse them, and a cancelled
  // but still-set frame id would make every later requestView a no-op.
  useEffect(() => () => {
    if (viewFrameRef.current !== null) cancelAnimationFrame(viewFrameRef.current);
    if (traceFrameRef.current !== null) cancelAnimationFrame(traceFrameRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    viewFrameRef.current = null; traceFrameRef.current = null; wheelTimerRef.current = null;
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
    const currentScene = sceneRef.current?.planarScene;
    const index = traceIndexRef.current;
    if (!lock || !currentScene || !index || pendingRef.current || wheelRef.current) return;
    tracePointerRef.current = clientToScreen(event.clientX, event.clientY);
    if (traceFrameRef.current !== null) return;
    traceFrameRef.current = requestAnimationFrame(() => {
      traceFrameRef.current = null;
      const screen = tracePointerRef.current;
      if (!screen) return;
      const route = routesRef.current[lock.itemId];
      const target = route === 'real-surface' && sceneRef.current
        ? surfaceTargetAtScreen(sceneRef.current, viewportRef.current, sizeRef.current, screen, lock.itemId)
        : route === 'explicit-y' || route === 'explicit-x'
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
    if (Math.hypot(drag.clientDx, drag.clientDy) > 4) {
      gestureLaneRef.current?.freeze();
      const settled = liveViewportRef.current; viewportRef.current = settled; onViewportChange(settled); return;
    }
    const screen = clientToScreen(event.clientX, event.clientY);
    const currentScene = sceneRef.current?.planarScene; const index = traceIndexRef.current;
    const spatialScene = sceneRef.current;
    const current = currentScene && index && spatialScene && !pendingRef.current
      ? hitTestGraphTraceIndex({ index, scene: currentScene, screen,
          maximumDistancePixels: drag.pointerType === 'touch' ? 28 : CLICK_DISTANCE })
      : null;
    const target = current ?? (spatialScene && !pendingRef.current
      ? surfaceTargetAtScreen(spatialScene, viewportRef.current, sizeRef.current, screen) : null);
    if (target) {
      traceLockRef.current = {
        itemId: target.itemId,
        kind: target.kind,
        ...(target.pathId ? { pathId: target.pathId } : {}),
        ...(target.pointBatchId ? { pointBatchId: target.pointBatchId } : {}),
      };
      publishTrace(target, true);
    }
    else clearTrace();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentScene = sceneRef.current?.planarScene; if (!currentScene || pendingRef.current) return;
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

  const hasGeometry = spatialScene !== null && (spatialScene.surfaceMeshes.length > 0
    || spatialScene.planarScene.paths.some((path) => !path.itemId.startsWith('graph-overlay.'))
    || spatialScene.planarScene.regions.length > 0 || spatialScene.planarScene.pointBatches.length > 0)
    || gpuStatus.gpuItems > 0;
  const hasComplexValues = spatialScene?.planarScene.paths.some((path) => (
    path.strokeRole === 'complex-real' || path.strokeRole === 'complex-imaginary')) ?? false;
  const gpuChipText = gpuStatus.gpuItems === 0
    ? (gpuStatus.reasons.includes('deep zoom uses precise CPU rendering') ? 'Precise mode' : 'Standard rendering')
    : gpuStatus.gpuItems === gpuStatus.candidates ? 'GPU' : `GPU ${gpuStatus.gpuItems}/${gpuStatus.candidates}`;
  return <div className="graph-svg-viewport" data-scene-pending={pending ? 'true' : 'false'} data-testid="graph-viewport"
    aria-describedby="graph-trace-instructions" aria-label={`Interactive ${grid.kind} graph. Press Enter to start keyboard tracing.`}
    role="region" onKeyDown={handleKeyDown} onPointerCancel={finishPointer} onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove} onPointerUp={finishPointer} ref={hostRef} tabIndex={0}>
    <div className="graph-svg-renderer-host" ref={rendererHostRef} />
    <div className="graph-trace-marker" hidden ref={traceMarkerRef} />
    <div className="graph-trace-marker graph-ptx-mirror" data-testid="graph-ptx-mirror" hidden ref={mirrorRef} />
    <div aria-live="polite" className="graph-trace-callout" hidden ref={traceLabelRef} role="status" />
    <span className="graph-trace-instructions" id="graph-trace-instructions">Click a curve or point to trace it. Move to sweep, use arrows to step, and Escape to clear.</span>
    {gpuStatus.candidates > 0 ? <span className={`graph-real-renderer is-${gpuStatus.gpuItems > 0 ? 'gpu' : 'cpu'}`}
      data-testid="graph-real-renderer"
      title={gpuStatus.reasons.length > 0 ? [...new Set(gpuStatus.reasons)].join('; ')
        : 'Implicit curves, regions and surface height maps are drawn on the GPU; trace and Analyze use the precise CPU evaluation.'}>
      {gpuChipText}</span> : null}
    {hasComplexValues ? <span className="graph-complex-legend" data-testid="graph-complex-legend"
      title="Where a curve's value is not real: principal-branch real and imaginary parts">
      <svg aria-hidden="true" height="6" width="22"><line x1="1" x2="21" y1="3" y2="3" /></svg> Re
      <svg aria-hidden="true" height="6" width="22"><line strokeDasharray="5 4" x1="1" x2="21" y1="3" y2="3" /></svg> Im
    </span> : null}
    {!hasGeometry ? <div className="graph-viewport-empty" aria-hidden="true"><span>Enter an x-based expression to begin</span><small>Try x² − 4 or sin(x)</small></div> : null}
  </div>;
}
