import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  buildGraphGridScene,
  createGraphThreeRenderer,
  type GraphGridPolicyV1,
  type GraphPaneViewStateV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
  type InteractiveGraph3dRenderer,
  type GraphSpatialSceneRuntimeV2,
} from '../../lib/graphing';
import {
  moveGraphCamera,
  orbitGraphCamera,
  panGraphCamera,
  snapGraphCamera,
  zoomGraphCamera,
} from './graph-camera';

type Props = {
  fallback: boolean;
  grid: GraphGridPolicyV1;
  onFallbackChange: (reason: 'context-lost' | 'unavailable' | null) => void;
  onSelectItem: (itemId: string | null) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onViewChange: (values: Partial<GraphPaneViewStateV1>) => void;
  presentation: GraphRendererPresentationFrame;
  scene: GraphSpatialSceneRuntimeV2 | null;
  sceneViewport: GraphViewportV1 | null;
  selectedItemId: string | null;
  view: GraphPaneViewStateV1;
  viewport: GraphViewportV1;
};

type DragState = {
  pointerId: number;
  mode: 'orbit' | 'pan' | 'zoom' | 'fly' | 'pick';
  x: number;
  y: number;
  moved: boolean;
};

export function GraphThreeViewport({
  fallback, grid, onFallbackChange, onSelectItem, onSizeChange, onViewChange,
  presentation, scene, sceneViewport, selectedItemId, view, viewport,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<InteractiveGraph3dRenderer | null>(null);
  const selectedPivotRef = useRef<{ itemId: string; world: { x: number; y: number; z: number } } | null>(null);
  const cameraRef = useRef(view.camera3d);
  const dragRef = useRef<DragState | null>(null);
  const [ready, setReady] = useState(false);
  const [trace, setTrace] = useState<{ itemId: string; x: number; y: number; z: number } | null>(null);
  const [size, setSize] = useState({ width: 960, height: 600 });
  const [camera, setCamera] = useState(view.camera3d);

  const publishCamera = useCallback((next: typeof camera) => {
    cameraRef.current = next;
    setCamera(next);
    rendererRef.current?.setCamera({
      version: 1,
      camera: next,
      selectedItemId,
      verticalExaggeration: view.verticalExaggeration,
      wireframe: view.wireframe,
    });
  }, [selectedItemId, view.verticalExaggeration, view.wireframe]);

  useEffect(() => {
    if (dragRef.current) return;
    cameraRef.current = view.camera3d;
    setCamera(view.camera3d);
  }, [view.camera3d]);

  useEffect(() => {
    if (selectedPivotRef.current?.itemId !== selectedItemId) selectedPivotRef.current = null;
  }, [selectedItemId]);

  useLayoutEffect(() => {
    let cancelled = false;
    const host = rendererHostRef.current;
    if (!host) return undefined;
    void createGraphThreeRenderer({
      onContextLost: () => onFallbackChange('context-lost'),
      onContextRestored: () => onFallbackChange(null),
    }).then((renderer) => {
      if (cancelled) { renderer.dispose(); return; }
      try {
        renderer.mount(host);
        rendererRef.current = renderer;
        setReady(true);
        onFallbackChange(null);
      } catch {
        renderer.dispose();
        onFallbackChange('unavailable');
      }
    }).catch(() => onFallbackChange('unavailable'));
    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [onFallbackChange]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const commit = (width: number, height: number) => {
      const next = { width: Math.max(1, Math.round(width || 960)), height: Math.max(1, Math.round(height || 600)) };
      setSize(next); onSizeChange(next);
    };
    commit(host.clientWidth, host.clientHeight);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) commit(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [onSizeChange]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    renderer.resize(size.width, size.height, window.devicePixelRatio || 1);
    renderer.setView({
      version: 1,
      viewport,
      grid: buildGraphGridScene({ viewport, cssSize: size, policy: grid }),
      policy: { quality: 'settled', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: renderer.capabilities.maximumVertices, maximumLabels: 250, pixelRatioCap: 2 },
    });
  }, [grid, ready, size, viewport]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    renderer.setPresentation(presentation);
  }, [presentation, ready]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    renderer.setScene(scene && sceneViewport ? {
      version: 3, scene, sourceViewport: sceneViewport,
      policy: { quality: 'settled', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        maximumVertices: renderer.capabilities.maximumVertices, maximumLabels: 250, pixelRatioCap: 2 },
    } : null);
  }, [ready, scene, sceneViewport]);

  useEffect(() => {
    const mesh = scene?.surfaceMeshes[0];
    const current = cameraRef.current;
    const isDefault = current.orientation === 'isometric'
      && current.target.x === 0 && current.target.y === 0 && current.target.z === 0
      && current.position.x === 8 && current.position.y === -10 && current.position.z === 8;
    if (!ready || !mesh || !isDefault) return;
    let xMin = Infinity; let xMax = -Infinity; let yMin = Infinity; let yMax = -Infinity; let zMin = Infinity; let zMax = -Infinity;
    for (let vertex = 0; vertex < mesh.positions.length / 3; vertex += 1) {
      const x = mesh.positions[vertex * 3]!; const y = mesh.positions[vertex * 3 + 1]!; const z = mesh.positions[vertex * 3 + 2]!;
      xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
    }
    if (![xMin, xMax, yMin, yMax, zMin, zMax].every(Number.isFinite)) return;
    const target = { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2, z: (zMin + zMax) / 2 };
    const radius = Math.max(xMax - xMin, yMax - yMin, (zMax - zMin) * view.verticalExaggeration, 1) / 2;
    const length = Math.hypot(8, -10, 8);
    const distance = radius * 2.8;
    const next = { ...current, target, position: {
      x: target.x + 8 / length * distance, y: target.y - 10 / length * distance, z: target.z + 8 / length * distance,
    } };
    publishCamera(next); onViewChange({ camera3d: next });
  }, [onViewChange, publishCamera, ready, scene, view.verticalExaggeration]);

  useLayoutEffect(() => {
    if (!ready) return;
    rendererRef.current?.setCamera({ version: 1, camera, selectedItemId,
      verticalExaggeration: view.verticalExaggeration, wireframe: view.wireframe });
  }, [camera, ready, selectedItemId, view.verticalExaggeration, view.wireframe]);

  const commitCamera = () => onViewChange({ camera3d: cameraRef.current });
  const focus = () => {
    const target = selectedPivotRef.current?.itemId === selectedItemId
      ? selectedPivotRef.current.world
      : selectedItemId
      ? rendererRef.current?.getItemCenter(selectedItemId) ?? { x: 0, y: 0, z: 0 }
      : { x: 0, y: 0, z: 0 };
    const current = cameraRef.current;
    const offset = { x: current.position.x - current.target.x,
      y: current.position.y - current.target.y, z: current.position.z - current.target.z };
    const next = { ...current, orientation: 'free' as const, target,
      position: { x: target.x + offset.x, y: target.y + offset.y, z: target.z + offset.z } };
    publishCamera(next); rendererRef.current?.showPivot(target); onViewChange({ camera3d: next });
  };
  const reset = () => {
    const next = { ...view.camera3d, projection: cameraRef.current.projection,
      orientation: 'isometric' as const, position: { x: 8, y: -10, z: 8 },
      target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 }, orthographicScale: 12 };
    publishCamera(next); rendererRef.current?.showPivot(next.target); onViewChange({ camera3d: next });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.graph-three-controls')) return;
    const mode = event.button === 1 ? 'pan'
      : event.button === 0 && event.altKey ? 'orbit'
        : event.button === 2 && event.altKey ? 'zoom'
          : event.button === 2 && view.flythroughEnabled ? 'fly'
            : event.button === 0 ? 'pick' : null;
    if (!mode) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, mode, x: event.clientX, y: event.clientY, moved: false };
    if (mode === 'orbit') {
      const pivot = selectedPivotRef.current?.itemId === selectedItemId
        ? selectedPivotRef.current.world
        : selectedItemId
          ? rendererRef.current?.getItemCenter(selectedItemId) ?? { x: 0, y: 0, z: 0 }
          : { x: 0, y: 0, z: 0 };
      publishCamera({ ...cameraRef.current, target: pivot });
      rendererRef.current?.showPivot(pivot);
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    drag.x = event.clientX; drag.y = event.clientY;
    drag.moved ||= Math.hypot(dx, dy) > 1;
    if (drag.mode === 'orbit') publishCamera(orbitGraphCamera(cameraRef.current, dx, dy));
    else if (drag.mode === 'pan') publishCamera(panGraphCamera(cameraRef.current, dx, dy, size.height));
    else if (drag.mode === 'zoom') {
      const anchor = rendererRef.current?.screenToPlane(event.clientX, event.clientY) ?? cameraRef.current.target;
      publishCamera(zoomGraphCamera(cameraRef.current, dy * 7, anchor));
    }
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.mode === 'pick' && !drag.moved) {
      const hit = rendererRef.current?.hitTest(event.clientX, event.clientY) ?? null;
      selectedPivotRef.current = hit
        ? { itemId: hit.itemId, world: { x: hit.world.x, y: hit.world.y, z: hit.world.z ?? 0 } }
        : null;
      setTrace(hit ? { itemId: hit.itemId, x: hit.world.x, y: hit.world.y, z: hit.world.z ?? 0 } : null);
      onSelectItem(hit?.itemId ?? null);
    } else if (drag.mode !== 'pick') commitCamera();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.mode !== 'pick') commitCamera();
  };
  const handleWheel = useCallback((event: WheelEvent) => {
    if ((event.target as HTMLElement).closest('.graph-three-controls')) return;
    event.preventDefault();
    const anchor = rendererRef.current?.screenToPlane(event.clientX, event.clientY) ?? cameraRef.current.target;
    const next = zoomGraphCamera(cameraRef.current, event.deltaY, anchor);
    publishCamera(next); onViewChange({ camera3d: next });
  }, [onViewChange, publishCamera]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.addEventListener('wheel', handleWheel, { passive: false });
    return () => host.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); focus(); return; }
    if (event.key === 'Home') { event.preventDefault(); reset(); return; }
    if (dragRef.current?.mode !== 'fly') return;
    const next = moveGraphCamera(cameraRef.current, event.key.toLowerCase(), event.shiftKey);
    if (next !== cameraRef.current) { event.preventDefault(); publishCamera(next); onViewChange({ camera3d: next }); }
  };

  const snap = (orientation: 'top' | 'front' | 'right' | 'isometric') => {
    const next = snapGraphCamera(cameraRef.current, orientation);
    publishCamera(next); rendererRef.current?.showPivot(next.target); onViewChange({ camera3d: next });
  };

  return <div aria-label="3D graph viewport" aria-hidden={fallback} className={`graph-three-viewport${fallback ? ' is-fallback' : ''}`}
    data-camera-orientation={camera.orientation} data-camera-position={`${camera.position.x},${camera.position.y},${camera.position.z}`}
    data-camera-projection={camera.projection} data-camera-target={`${camera.target.x},${camera.target.y},${camera.target.z}`}
    data-surface-mesh-count={scene?.surfaceMeshes.length ?? 0}
    data-ready={ready ? 'true' : 'false'} data-testid="graph-three-viewport" onContextMenu={(event) => event.preventDefault()}
    onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
    onPointerCancel={onPointerCancel} onPointerUp={onPointerUp} ref={hostRef} tabIndex={fallback ? -1 : 0}>
    <div className="graph-three-renderer-host" ref={rendererHostRef} />
    <div aria-label="3D view controls" className="graph-three-controls" role="toolbar">
      {(['top', 'front', 'right', 'isometric'] as const).map((orientation) => <button
        aria-pressed={camera.orientation === orientation} key={orientation} onClick={() => snap(orientation)} type="button">
        {orientation === 'isometric' ? 'Iso' : orientation[0]!.toUpperCase() + orientation.slice(1)}
      </button>)}
      <select aria-label="3D projection" onChange={(event) => {
        const next = { ...cameraRef.current,
          projection: event.currentTarget.value as 'perspective' | 'orthographic' };
        publishCamera(next); onViewChange({ camera3d: next });
      }} value={camera.projection}>
        <option value="perspective">Perspective</option><option value="orthographic">Orthographic</option>
      </select>
      <label>Height <select aria-label="Vertical exaggeration" onChange={(event) => onViewChange({
        verticalExaggeration: Number(event.currentTarget.value),
      })} value={view.verticalExaggeration}>
        <option value="1">1x</option><option value="2">2x</option><option value="5">5x</option>
      </select></label>
      <button aria-pressed={view.wireframe} onClick={() => onViewChange({ wireframe: !view.wireframe })}
        type="button">Wireframe</button>
      <button aria-pressed={view.flythroughEnabled} onClick={() => onViewChange({
        flythroughEnabled: !view.flythroughEnabled,
      })} type="button">Fly</button>
    </div>
    <span className="graph-three-help">MMB pan · Alt+LMB orbit · wheel or Alt+RMB zoom · F focus · Home reset</span>
    {trace ? <output aria-label="Surface trace" className="graph-three-trace">
      ({Number(trace.x.toPrecision(6))}, {Number(trace.y.toPrecision(6))}, {Number(trace.z.toPrecision(6))})
    </output> : null}
  </div>;
}
