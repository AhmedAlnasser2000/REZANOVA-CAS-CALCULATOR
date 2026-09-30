import { useEffect, useMemo, useRef } from 'react';
import {
  buildGraphSampleInputRevisionId,
  releaseGraphSampleResultBuffers,
  runGraphSampleWithOoe,
  type GraphDocumentV4,
  type GraphSampleRequestV6,
  type GraphScenePathRuntimeV2,
  type GraphViewportV1,
} from '../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { classifiedGraphItems, graphParameterEnvironment } from './graph-controller-support';

const GESTURE_ROUTES = new Set(['explicit-y', 'explicit-x', 'polar-radius', 'parametric-curve']);

export type GraphGestureScene = { paths: GraphScenePathRuntimeV2[]; sourceViewport: GraphViewportV1 };

export type GraphGestureLane = {
  /** Sample formula curves for this live viewport (latest only). */
  request(viewport: GraphViewportV1): void;
  /** Gesture ended: drop in-flight results but keep the last overlay until the committed scene lands. */
  freeze(): void;
  clear(): void;
  getScene(): GraphGestureScene | null;
  /**
   * Scenes go straight to subscribers (the renderer), not React state, so a
   * gesture result never re-renders the workspace or its expression editors.
   */
  subscribe(listener: (scene: GraphGestureScene | null) => void): () => void;
};

function createGraphGestureLane({ readDocument, readSize, readWorkspace, isOpen }: {
  readDocument: () => GraphDocumentV4;
  readSize: () => { width: number; height: number };
  readWorkspace: () => WorkspaceInstanceRuntimeContext;
  isOpen: () => boolean;
}): GraphGestureLane {
  let scene: GraphGestureScene | null = null;
  let sequence = 0;
  let inFlight = false;
  let queued: GraphViewportV1 | null = null;
  let activeRevision: string | null = null;
  const listeners = new Set<(scene: GraphGestureScene | null) => void>();
  const publish = (next: GraphGestureScene | null) => {
    if (next === scene) return;
    scene = next;
    listeners.forEach((listener) => listener(next));
  };

  const run = async (viewport: GraphViewportV1) => {
    const snapshot = readDocument();
    // Piecewise curves refresh during gestures too; their branches are y = f(x), x = f(y) or polar curves.
    const items = classifiedGraphItems(snapshot).filter((item) => item.visible
      && ((item.kind === 'relation' && GESTURE_ROUTES.has(item.relation.kind)) || item.kind === 'piecewise'));
    if (items.length === 0) return;
    sequence += 1;
    const current = sequence;
    const size = readSize();
    const workspaceContext = readWorkspace();
    const request: GraphSampleRequestV6 = {
      version: 6,
      requestId: `${workspaceContext.workspaceInstanceId}.gesture.${current}`,
      workspaceInstanceId: workspaceContext.workspaceInstanceId,
      documentId: snapshot.documentId,
      revisions: { scene: current, mathematics: snapshot.mathematicsRevision, viewport: current, parameter: 0 },
      items,
      parameterEnvironment: graphParameterEnvironment(snapshot),
      viewport,
      cssSize: { width: Math.max(1, Math.round(size.width)), height: Math.max(1, Math.round(size.height)) },
      overlays: { unitCircle: false },
      quality: 'preview',
      priority: { dependentItemIds: [] },
      movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
    };
    activeRevision = buildGraphSampleInputRevisionId(request);
    try {
      const envelope = await runGraphSampleWithOoe(request, {
        activeInputRevisionId: () => activeRevision,
        isWorkspaceInstanceOpen: isOpen,
        workspaceInstance: workspaceContext,
      });
      const accepted = isOpen() && current === sequence
        && envelope.ooe.commitAssessment.legality === 'commitAllowed' && envelope.payload.status !== 'cancelled'
        && readDocument().mathematicsRevision === snapshot.mathematicsRevision;
      if (!accepted) {
        if (envelope.ooe.releasedBufferBytes === 0) releaseGraphSampleResultBuffers(envelope.payload);
        return;
      }
      publish({ paths: envelope.payload.scene.planarScene.paths, sourceViewport: viewport });
    } catch {
      // A failed gesture preview leaves the stretched committed curves in place.
    }
  };

  const invalidate = () => {
    sequence += 1;
    queued = null;
    activeRevision = null;
  };

  return {
    request(viewport) {
      queued = viewport;
      if (inFlight) return;
      inFlight = true;
      void (async () => {
        // Latest-only: one job in flight, and only the newest viewport queued.
        while (queued && isOpen()) {
          const next = queued;
          queued = null;
          await run(next);
        }
        inFlight = false;
      })();
    },
    freeze: invalidate,
    clear() { invalidate(); publish(null); },
    getScene: () => scene,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/**
 * Latest-only gesture lane for explicit, polar, and parametric curves. While
 * the viewport is moving it samples those items at preview quality through
 * the ordinary Graph OOE path (workers still do all sampling), keeps its own
 * sequence and input revision, and never writes committed results, caches,
 * or pending state. Committed settle sampling replaces its output.
 */
export function useGraphGestureSampling({ cssSize, document, workspaceContext }: {
  cssSize: { width: number; height: number };
  document: GraphDocumentV4;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}): GraphGestureLane {
  const documentRef = useRef(document);
  const sizeRef = useRef(cssSize);
  const workspaceRef = useRef(workspaceContext);
  const openRef = useRef(false);
  useEffect(() => { documentRef.current = document; sizeRef.current = cssSize; workspaceRef.current = workspaceContext; });
  // The shell rebuilds the context object on each render; the lane lives per instance.
  const instanceId = workspaceContext.workspaceInstanceId;
  const lane = useMemo(() => createGraphGestureLane({
    readDocument: () => documentRef.current,
    readSize: () => sizeRef.current,
    readWorkspace: () => workspaceRef.current,
    isOpen: () => openRef.current,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one lane per workspace instance
  }), [instanceId]);
  useEffect(() => {
    openRef.current = true;
    return () => { openRef.current = false; lane.clear(); };
  }, [lane]);
  return lane;
}
