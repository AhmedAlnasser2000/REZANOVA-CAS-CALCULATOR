import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import {
  buildGraphSampleInputRevisionId,
  releaseGraphSampleResultBuffers,
  runGraphSampleWithOoe,
  type GraphDocumentV1,
  type GraphItemSpecV1,
  type GraphSampleRequestV1,
  type GraphSampleResultV1,
  type GraphViewportV1,
} from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV1 } from './graph-workspace-session';
import {
  buildVisibleGraphItem,
  createGraphParameterItem,
  graphItemSource,
  graphItemSourceLatex,
  mutateGraphPiecewiseBranches,
  removeGraphDocumentItem,
  replaceGraphDocumentItem,
  toggleGraphDocumentItem,
  updateGraphParameterItem,
  updateGraphPiecewiseBranch,
} from './graph-document';

const PREVIEW_DELAY_MS = 80;
const SETTLED_DELAY_MS = 150;
const VIEWPORT_SETTLED_DELAY_MS = 120;
const INVALID_GRACE_MS = 200;
const SESSION_PERSIST_DELAY_MS = 240;
const MAX_UNDO_STEPS = 80;

type GraphControllerStatus =
  | { kind: 'ready'; label: string }
  | { kind: 'editing'; label: string }
  | { kind: 'sampling'; label: string }
  | { kind: 'warning'; label: string }
  | { kind: 'error'; label: string };

type GraphHistory = {
  undo: GraphDocumentV1[];
  redo: GraphDocumentV1[];
  typingItemId: string | null;
};

type UseGraphWorkspaceControllerInput = {
  initialSession: GraphWorkspaceSessionStateV1;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  cssSize: { width: number; height: number };
  onPersistSession: (session: GraphWorkspaceSessionStateV1) => void;
};

function classifiedItems(document: GraphDocumentV1) {
  return document.items.filter((item): item is Extract<GraphItemSpecV1, {
    kind: 'relation' | 'piecewise' | 'point-set';
  }> => item.kind === 'relation' || item.kind === 'piecewise' || item.kind === 'point-set');
}

function graphParameterEnvironment(document: GraphDocumentV1) {
  return Object.fromEntries(document.items
    .filter((item): item is Extract<GraphItemSpecV1, { kind: 'parameter' }> => item.kind === 'parameter')
    .map((item) => [item.parameter.symbol, item.parameter.value]));
}

function graphParameterEnvironmentChanged(left: GraphDocumentV1, right: GraphDocumentV1) {
  const leftParameters = graphParameterEnvironment(left);
  const rightParameters = graphParameterEnvironment(right);
  const symbols = new Set([...Object.keys(leftParameters), ...Object.keys(rightParameters)]);
  return [...symbols].some((symbol) => leftParameters[symbol] !== rightParameters[symbol]);
}

function unresolvedGraphSymbols(document: GraphDocumentV1) {
  const declared = new Set(document.items
    .filter((item): item is Extract<GraphItemSpecV1, { kind: 'parameter' }> => item.kind === 'parameter')
    .map((item) => item.parameter.symbol));
  const reserved = new Set(['x', 'y', 'r', 'theta']);
  for (const item of document.items) {
    if (item.kind === 'relation' && item.relation.kind === 'parametric-curve') {
      reserved.add(item.relation.parameterSymbol);
    }
  }
  const symbols = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if ('freeSymbols' in value && Array.isArray(value.freeSymbols)) {
      value.freeSymbols.forEach((symbol) => {
        if (typeof symbol === 'string' && !reserved.has(symbol) && !declared.has(symbol)) {
          symbols.add(symbol);
        }
      });
    }
    Object.values(value).forEach(visit);
  };
  document.items.forEach((item) => {
    if (item.kind === 'relation' || item.kind === 'piecewise') visit(item);
  });
  return [...symbols].sort();
}

function restoredDocument(current: GraphDocumentV1, snapshot: GraphDocumentV1) {
  return {
    ...snapshot,
    documentRevision: current.documentRevision + 1,
  } satisfies GraphDocumentV1;
}

function finiteViewport(viewport: GraphViewportV1) {
  return Number.isFinite(viewport.xMin)
    && Number.isFinite(viewport.xMax)
    && Number.isFinite(viewport.yMin)
    && Number.isFinite(viewport.yMax)
    && viewport.xMax > viewport.xMin
    && viewport.yMax > viewport.yMin;
}

export function useGraphWorkspaceController({
  cssSize,
  initialSession,
  onPersistSession,
  workspaceContext,
}: UseGraphWorkspaceControllerInput) {
  const [session, setSession] = useState(initialSession);
  const [sampleResult, setSampleResult] = useState<GraphSampleResultV1 | null>(null);
  const [status, setStatus] = useState<GraphControllerStatus>({ kind: 'ready', label: 'Ready' });
  const [visibleDraftErrors, setVisibleDraftErrors] = useState<ReadonlySet<string>>(new Set());
  const [blankItemId, setBlankItemId] = useState(() => `${workspaceContext.workspaceInstanceId}.item.1`);
  const [historyAvailability, setHistoryAvailability] = useState({
    canRedo: false,
    canUndo: false,
  });
  const sessionRef = useRef(session);
  const resultRef = useRef(sampleResult);
  const workspaceContextRef = useRef(workspaceContext);
  const mountedRef = useRef(true);
  const persistRef = useRef(onPersistSession);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequenceRef = useRef(0);
  const activeInputRevisionRef = useRef<string | null>(null);
  const previewInFlightRef = useRef(false);
  const queuedPreviewRef = useRef<GraphWorkspaceSessionStateV1 | null>(null);
  const launchSampleRef = useRef<(
    quality: 'preview' | 'settled',
    snapshot: GraphWorkspaceSessionStateV1,
  ) => Promise<void>>(async () => undefined);
  const itemSequenceRef = useRef(2);
  const historyRef = useRef<GraphHistory>({ undo: [], redo: [], typingItemId: null });
  const scheduledRevisionsRef = useRef({
    document: initialSession.document.documentRevision,
    parameter: initialSession.surface.parameterRevision,
    viewport: initialSession.surface.viewportRevision,
  });

  const publishHistoryAvailability = useCallback(() => {
    setHistoryAvailability({
      canRedo: historyRef.current.redo.length > 0,
      canUndo: historyRef.current.undo.length > 0,
    });
  }, []);

  useEffect(() => {
    persistRef.current = onPersistSession;
  }, [onPersistSession]);

  useEffect(() => {
    workspaceContextRef.current = workspaceContext;
  }, [workspaceContext]);

  const persistSoon = useCallback((next: GraphWorkspaceSessionStateV1, immediate = false) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    if (immediate) {
      persistTimerRef.current = null;
      persistRef.current(next);
      return;
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      persistRef.current(sessionRef.current);
    }, SESSION_PERSIST_DELAY_MS);
  }, []);

  const commitSession = useCallback((
    next: GraphWorkspaceSessionStateV1,
    immediate = false,
  ) => {
    sessionRef.current = next;
    setSession(next);
    persistSoon(next, immediate);
  }, [persistSoon]);

  const pushHistory = useCallback((document: GraphDocumentV1, typingItemId: string | null) => {
    const history = historyRef.current;
    if (typingItemId && history.typingItemId === typingItemId) return;
    history.undo = [...history.undo.slice(-(MAX_UNDO_STEPS - 1)), document];
    history.redo = [];
    history.typingItemId = typingItemId;
    publishHistoryAvailability();
  }, [publishHistoryAvailability]);

  const endTypingTransaction = useCallback(() => {
    if (!historyRef.current.typingItemId) return;
    historyRef.current.typingItemId = null;
    publishHistoryAvailability();
  }, [publishHistoryAvailability]);

  const nextItemId = useCallback(() => {
    const id = `${workspaceContext.workspaceInstanceId}.item.${itemSequenceRef.current}`;
    itemSequenceRef.current += 1;
    return id;
  }, [workspaceContext.workspaceInstanceId]);

  const editItem = useCallback((itemId: string, sourceLatex: string) => {
    const current = sessionRef.current;
    const previous = current.document.items.find((item) => item.itemId === itemId);
    pushHistory(current.document, itemId);
    const item = buildVisibleGraphItem({
      itemId,
      sourceLatex,
      sourceRevision: (previous ? graphItemSource(previous)?.sourceRevision ?? 0 : 0) + 1,
      index: previous
        ? current.document.items.findIndex((candidate) => candidate.itemId === itemId)
        : current.document.items.length,
      previous,
    });
    const document = replaceGraphDocumentItem(current.document, item);
    const next = {
      ...current,
      document,
      surface: previous?.kind === 'parameter' || item.kind === 'parameter'
        ? { ...current.surface, parameterRevision: current.surface.parameterRevision + 1 }
        : current.surface,
    };
    if (!previous && itemId === blankItemId && sourceLatex.trim()) {
      setBlankItemId(nextItemId());
    }
    activeInputRevisionRef.current = null;
    setVisibleDraftErrors((visible) => {
      if (!visible.has(itemId)) return visible;
      const nextVisible = new Set(visible);
      nextVisible.delete(itemId);
      return nextVisible;
    });
    setStatus({ kind: 'editing', label: 'Updating graph…' });
    commitSession(next);
  }, [blankItemId, commitSession, nextItemId, pushHistory]);

  const removeItem = useCallback((itemId: string) => {
    const current = sessionRef.current;
    const item = current.document.items.find((candidate) => candidate.itemId === itemId);
    if (!item) return;
    pushHistory(current.document, null);
    const next = {
      ...current,
      document: removeGraphDocumentItem(current.document, itemId),
      surface: item.kind === 'parameter'
        ? { ...current.surface, parameterRevision: current.surface.parameterRevision + 1 }
        : current.surface,
    };
    activeInputRevisionRef.current = null;
    commitSession(next, true);
  }, [commitSession, pushHistory]);

  const blurItem = useCallback((itemId: string) => {
    endTypingTransaction();
    const current = sessionRef.current;
    const item = current.document.items.find((candidate) => candidate.itemId === itemId);
    if (item && !graphItemSourceLatex(item).trim()) {
      commitSession({
        ...current,
        document: removeGraphDocumentItem(current.document, itemId),
      }, true);
      return;
    }
    persistSoon(current, true);
  }, [commitSession, endTypingTransaction, persistSoon]);

  const addPointSet = useCallback(() => {
    const itemId = blankItemId;
    editItem(itemId, '\\{(0,0)\\}');
    endTypingTransaction();
    return itemId;
  }, [blankItemId, editItem, endTypingTransaction]);

  const toggleItem = useCallback((itemId: string) => {
    const current = sessionRef.current;
    pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: toggleGraphDocumentItem(current.document, itemId),
    }, true);
  }, [commitSession, pushHistory]);

  const createParameters = useCallback((symbols: readonly string[]) => {
    const current = sessionRef.current;
    const existing = new Set(current.document.items
      .filter((item): item is Extract<GraphItemSpecV1, { kind: 'parameter' }> => item.kind === 'parameter')
      .map((item) => item.parameter.symbol));
    const created = symbols.filter((symbol) => !existing.has(symbol)).map((symbol) => (
      createGraphParameterItem({ itemId: nextItemId(), symbol })
    ));
    if (created.length === 0) return;
    pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: {
        ...current.document,
        documentRevision: current.document.documentRevision + 1,
        items: [...current.document.items, ...created],
      },
      surface: {
        ...current.surface,
        parameterRevision: current.surface.parameterRevision + 1,
      },
    }, true);
  }, [commitSession, nextItemId, pushHistory]);

  const updateParameter = useCallback((itemId: string, values: Parameters<typeof updateGraphParameterItem>[0]['values']) => {
    const current = sessionRef.current;
    const document = updateGraphParameterItem({ document: current.document, itemId, values });
    if (!document) return false;
    pushHistory(current.document, itemId);
    activeInputRevisionRef.current = null;
    setStatus({ kind: 'editing', label: 'Updating graph…' });
    commitSession({
      ...current,
      document,
      surface: {
        ...current.surface,
        parameterRevision: current.surface.parameterRevision + 1,
      },
    });
    return true;
  }, [commitSession, pushHistory]);

  const editPiecewiseBranch = useCallback((input: {
    itemId: string;
    branchId: string;
    valueLatex: string;
    conditionLatex: string;
  }) => {
    const current = sessionRef.current;
    const document = updateGraphPiecewiseBranch({ document: current.document, ...input });
    if (!document) return false;
    pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    commitSession({ ...current, document }, true);
    return true;
  }, [commitSession, pushHistory]);

  const mutatePiecewiseBranch = useCallback((input: {
    itemId: string;
    action: 'add' | 'remove' | 'up' | 'down';
    branchId?: string;
  }) => {
    const current = sessionRef.current;
    const document = mutateGraphPiecewiseBranches({ document: current.document, ...input });
    if (!document) return;
    pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    commitSession({ ...current, document }, true);
  }, [commitSession, pushHistory]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const snapshot = history.undo.at(-1);
    if (!snapshot) return;
    const current = sessionRef.current;
    history.undo = history.undo.slice(0, -1);
    history.redo = [...history.redo, current.document];
    history.typingItemId = null;
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: restoredDocument(current.document, snapshot),
      surface: graphParameterEnvironmentChanged(current.document, snapshot)
        ? { ...current.surface, parameterRevision: current.surface.parameterRevision + 1 }
        : current.surface,
    }, true);
    publishHistoryAvailability();
  }, [commitSession, publishHistoryAvailability]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const snapshot = history.redo.at(-1);
    if (!snapshot) return;
    const current = sessionRef.current;
    history.redo = history.redo.slice(0, -1);
    history.undo = [...history.undo, current.document];
    history.typingItemId = null;
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: restoredDocument(current.document, snapshot),
      surface: graphParameterEnvironmentChanged(current.document, snapshot)
        ? { ...current.surface, parameterRevision: current.surface.parameterRevision + 1 }
        : current.surface,
    }, true);
    publishHistoryAvailability();
  }, [commitSession, publishHistoryAvailability]);

  const setViewport = useCallback((viewport: GraphViewportV1) => {
    if (!finiteViewport(viewport)) return;
    const current = sessionRef.current;
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      surface: {
        ...current.surface,
        viewport,
        viewportRevision: current.surface.viewportRevision + 1,
      },
    });
  }, [commitSession]);

  const toggleRail = useCallback(() => {
    const current = sessionRef.current;
    commitSession({
      ...current,
      surface: {
        ...current.surface,
        expressionRailCollapsed: !current.surface.expressionRailCollapsed,
      },
    }, true);
  }, [commitSession]);

  const autoFit = useCallback(() => {
    const scene = resultRef.current?.scene;
    if (!scene || scene.paths.length === 0) {
      setViewport({ coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
      return;
    }
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    for (const path of scene.paths) {
      for (let index = 0; index + 1 < path.coordinates.length; index += 2) {
        xMin = Math.min(xMin, path.coordinates[index]);
        xMax = Math.max(xMax, path.coordinates[index]);
        yMin = Math.min(yMin, path.coordinates[index + 1]);
        yMax = Math.max(yMax, path.coordinates[index + 1]);
      }
    }
    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return;
    const xPad = Math.max(1, (xMax - xMin) * 0.12);
    const yPad = Math.max(1, (yMax - yMin) * 0.12);
    setViewport({
      coordinateSystem: 'cartesian',
      xMin: xMin - xPad,
      xMax: xMax + xPad,
      yMin: yMin - yPad,
      yMax: yMax + yPad,
    });
  }, [setViewport]);

  const runSample = useCallback(async (
    quality: 'preview' | 'settled',
    snapshot: GraphWorkspaceSessionStateV1,
  ) => {
    const width = Math.max(1, Math.round(cssSize.width));
    const height = Math.max(1, Math.round(cssSize.height));
    const items = classifiedItems(snapshot.document);
    const visibleItems = items.filter((item) => item.visible);
    if (visibleItems.length === 0) {
      const previous = resultRef.current;
      if (previous) releaseGraphSampleResultBuffers(previous);
      resultRef.current = null;
      setSampleResult(null);
      setStatus({ kind: 'ready', label: 'Ready' });
      return;
    }

    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;
    const request: GraphSampleRequestV1 = {
      version: 1,
      requestId: `${workspaceContext.workspaceInstanceId}.sample.${sequence}`,
      workspaceInstanceId: workspaceContextRef.current.workspaceInstanceId,
      documentId: snapshot.document.documentId,
      revisions: {
        scene: sequence,
        document: snapshot.document.documentRevision,
        viewport: snapshot.surface.viewportRevision,
        parameter: snapshot.surface.parameterRevision,
      },
      items,
      parameterEnvironment: graphParameterEnvironment(snapshot.document),
      viewport: snapshot.surface.viewport,
      cssSize: { width, height },
      grid: snapshot.surface.grid,
      quality,
      budgets: quality === 'preview'
        ? { maximumRecursionDepth: 10, maximumSamples: 4_000, maximumTimeMs: 80, maximumVertices: 4_000 }
        : { maximumRecursionDepth: 14, maximumSamples: 20_000, maximumTimeMs: 500, maximumVertices: 20_000 },
    };
    activeInputRevisionRef.current = buildGraphSampleInputRevisionId(request);
    setStatus({
      kind: 'sampling',
      label: quality === 'preview' ? 'Drawing preview…' : 'Refining curves…',
    });
    try {
      const envelope = await runGraphSampleWithOoe(request, {
        activeInputRevisionId: () => activeInputRevisionRef.current,
        isWorkspaceInstanceOpen: () => mountedRef.current,
        workspaceInstance: workspaceContextRef.current,
      });
      const latest = sessionRef.current;
      const current = mountedRef.current
        && sequence === requestSequenceRef.current
        && latest.document.documentRevision === request.revisions.document
        && latest.surface.viewportRevision === request.revisions.viewport
        && latest.surface.parameterRevision === request.revisions.parameter
        && envelope.ooe.commitAssessment.legality === 'commitAllowed'
        && envelope.payload.status !== 'cancelled';
      if (!current) {
        if (envelope.ooe.releasedBufferBytes === 0) releaseGraphSampleResultBuffers(envelope.payload);
        return;
      }
      if (envelope.payload.status === 'budget-exhausted') {
        releaseGraphSampleResultBuffers(envelope.payload);
        if (quality === 'preview') {
          setStatus({ kind: 'sampling', label: 'Refining curves…' });
          return;
        }
        const previous = resultRef.current;
        const mathematicsChanged = !previous
          || previous.revisions.document !== request.revisions.document
          || previous.revisions.parameter !== request.revisions.parameter;
        if (mathematicsChanged && previous) {
          releaseGraphSampleResultBuffers(previous);
          resultRef.current = null;
          setSampleResult(null);
        }
        setStatus({ kind: 'warning', label: 'This view could not be completed safely.' });
        return;
      }
      const previous = resultRef.current;
      if (previous) releaseGraphSampleResultBuffers(previous);
      resultRef.current = envelope.payload;
      setSampleResult(envelope.payload);
      const topologyInconclusive = envelope.payload.stopReasons.some(
        (reason) => reason.code === 'region-topology-inconclusive',
      );
      const piecewiseConditionIssue = envelope.payload.stopReasons.some(
        (reason) => reason.detailCode?.startsWith('piecewise-'),
      );
      setStatus(envelope.payload.stopReasons.length > 0 && quality === 'settled'
        ? {
            kind: 'warning',
            label: topologyInconclusive
              ? 'Uncertain region cells were omitted safely.'
              : piecewiseConditionIssue
                ? 'Review the piecewise branch conditions.'
                : 'Some items reached a safe plotting limit.',
          }
        : { kind: 'ready', label: quality === 'preview' ? 'Preview ready' : 'Ready' });
    } catch {
      if (mountedRef.current && sequence === requestSequenceRef.current) {
        setStatus({ kind: 'error', label: 'Graph sampling stopped safely.' });
      }
    }
  }, [cssSize.height, cssSize.width, workspaceContext.workspaceInstanceId]);

  const launchSample = useCallback(async (
    quality: 'preview' | 'settled',
    snapshot: GraphWorkspaceSessionStateV1,
  ) => {
    if (quality === 'preview' && previewInFlightRef.current) {
      queuedPreviewRef.current = snapshot;
      return;
    }
    if (quality === 'settled') queuedPreviewRef.current = null;
    if (quality === 'preview') previewInFlightRef.current = true;
    try {
      await runSample(quality, snapshot);
    } finally {
      if (quality === 'preview') {
        previewInFlightRef.current = false;
        const queued = queuedPreviewRef.current;
        queuedPreviewRef.current = null;
        if (queued && mountedRef.current) {
          void launchSampleRef.current('preview', queued);
        }
      }
    }
  }, [runSample]);
  launchSampleRef.current = launchSample;

  const flushSampling = useCallback(() => {
    activeInputRevisionRef.current = null;
    void launchSample('settled', sessionRef.current);
    persistSoon(sessionRef.current, true);
  }, [launchSample, persistSoon]);

  const samplingDocumentRevision = session.document.documentRevision;
  const samplingParameterRevision = session.surface.parameterRevision;
  const samplingViewportRevision = session.surface.viewportRevision;

  useEffect(() => {
    activeInputRevisionRef.current = null;
    const snapshot = sessionRef.current;
    const previousRevisions = scheduledRevisionsRef.current;
    const viewportOnly = previousRevisions.document === samplingDocumentRevision
      && previousRevisions.parameter === samplingParameterRevision
      && previousRevisions.viewport !== samplingViewportRevision;
    scheduledRevisionsRef.current = {
      document: samplingDocumentRevision,
      parameter: samplingParameterRevision,
      viewport: samplingViewportRevision,
    };
    const invalidIds = snapshot.document.items
      .filter((item) => item.kind === 'invalid-relation-draft')
      .map((item) => item.itemId);
    let previewTimer: ReturnType<typeof setTimeout> | null = null;
    let settledTimer: ReturnType<typeof setTimeout> | null = null;
    const invalidTimer = invalidIds.length > 0
      ? setTimeout(() => {
          setVisibleDraftErrors(new Set(invalidIds));
          void launchSample('settled', snapshot);
        }, INVALID_GRACE_MS)
      : null;

    if (invalidIds.length === 0) {
      previewTimer = setTimeout(
        () => void launchSample('preview', snapshot),
        viewportOnly ? 0 : PREVIEW_DELAY_MS,
      );
      settledTimer = setTimeout(
        () => void launchSample('settled', snapshot),
        viewportOnly ? VIEWPORT_SETTLED_DELAY_MS : SETTLED_DELAY_MS,
      );
    }
    return () => {
      if (previewTimer) clearTimeout(previewTimer);
      if (settledTimer) clearTimeout(settledTimer);
      if (invalidTimer) clearTimeout(invalidTimer);
    };
  }, [
    launchSample,
    samplingDocumentRevision,
    samplingParameterRevision,
    samplingViewportRevision,
  ]);

  useEffect(() => {
    sessionRef.current = session;
    resultRef.current = sampleResult;
  }, [sampleResult, session]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeInputRevisionRef.current = null;
      queuedPreviewRef.current = null;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistRef.current(sessionRef.current);
      if (resultRef.current) releaseGraphSampleResultBuffers(resultRef.current);
    };
  }, []);

  const isScenePending = sampleResult !== null && (
    sampleResult.revisions.document !== session.document.documentRevision
    || sampleResult.revisions.viewport !== session.surface.viewportRevision
  );

  return useMemo(() => ({
    addPointSet,
    autoFit,
    blankItemId,
    blurItem,
    canRedo: historyAvailability.canRedo,
    canUndo: historyAvailability.canUndo,
    createParameters,
    editItem,
    editPiecewiseBranch,
    endTypingTransaction,
    flushSampling,
    isScenePending,
    mutatePiecewiseBranch,
    redo,
    removeItem,
    sampleResult,
    session,
    setViewport,
    status,
    toggleItem,
    toggleRail,
    undo,
    unresolvedSymbols: unresolvedGraphSymbols(session.document),
    updateParameter,
    visibleDraftErrors,
  }), [
    addPointSet,
    autoFit,
    blankItemId,
    blurItem,
    createParameters,
    editItem,
    editPiecewiseBranch,
    endTypingTransaction,
    flushSampling,
    historyAvailability,
    isScenePending,
    mutatePiecewiseBranch,
    redo,
    removeItem,
    sampleResult,
    session,
    setViewport,
    status,
    toggleItem,
    toggleRail,
    undo,
    updateParameter,
    visibleDraftErrors,
  ]);
}
