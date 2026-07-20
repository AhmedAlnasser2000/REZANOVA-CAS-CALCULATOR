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
  type GraphDocumentV2,
  type GraphItemPresentationV2,
  type GraphItemSpecV1,
  type GraphSampleRequestV4,
  type GraphSampleResultV4,
  type GraphViewportV1,
} from '../../lib/graphing';
import type {
  GraphPiecewiseAuthoringDraftV1,
  GraphWorkspaceSessionStateV3,
} from './graph-workspace-session';
import {
  buildGraphPiecewiseItemFromAuthoringDraft,
  buildVisibleGraphItem,
  createGraphNoteItem,
  createGraphParameterItem,
  graphConditionLatex,
  graphItemSource,
  graphItemSourceLatex,
  graphPiecewiseBranchValueLatex,
  removeGraphDocumentItem,
  replaceGraphDocumentPresentation,
  reorderGraphDocumentItem,
  replaceGraphDocumentItem,
  replaceGraphDocumentNote,
  toggleGraphDocumentItem,
  updateGraphParameterItem,
} from './graph-document';
import {
  classifiedGraphItems,
  graphItemFreeSymbols,
  graphParameterEnvironment,
  graphParameterEnvironmentChanged,
  isFiniteGraphViewport,
  restoredGraphDocument,
  unresolvedGraphSymbols,
} from './graph-controller-support';

const PREVIEW_DELAY_MS = 80;
const SETTLED_DELAY_MS = 150;
const POLISH_DELAY_MS = 350;
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
  undo: GraphHistorySnapshot[];
  redo: GraphHistorySnapshot[];
  typingItemId: string | null;
};

type GraphHistorySnapshot = { document: GraphDocumentV2;
  appearance: GraphWorkspaceSessionStateV3['surface']['appearance'] };

type UseGraphWorkspaceControllerInput = {
  initialSession: GraphWorkspaceSessionStateV3;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  cssSize: { width: number; height: number };
  onPersistSession: (session: GraphWorkspaceSessionStateV3) => void;
};

export function useGraphWorkspaceController({
  cssSize,
  initialSession,
  onPersistSession,
  workspaceContext,
}: UseGraphWorkspaceControllerInput) {
  const [session, setSession] = useState(initialSession);
  const [sampleResult, setSampleResult] = useState<GraphSampleResultV4 | null>(null);
  const [status, setStatus] = useState<GraphControllerStatus>({ kind: 'ready', label: 'Ready' });
  const [visibleDraftErrors, setVisibleDraftErrors] = useState<ReadonlySet<string>>(new Set());
  const [suppressedPiecewiseItems, setSuppressedPiecewiseItems] = useState<ReadonlySet<string>>(new Set());
  const [blankItemId, setBlankItemId] = useState(() => `${workspaceContext.workspaceInstanceId}.item.1`);
  const [historyAvailability, setHistoryAvailability] = useState({ canRedo: false, canUndo: false });
  const sessionRef = useRef(session);
  const resultRef = useRef(sampleResult);
  const retiredResultsRef = useRef<GraphSampleResultV4[]>([]);
  const activeSamplingItemIdRef = useRef<string | null>(null);
  const setActiveSamplingItem = useCallback((itemId: string | null) => {
    activeSamplingItemIdRef.current = itemId;
  }, []);
  const lastSampleViewRef = useRef({
    viewport: initialSession.surface.viewport,
    at: Date.now(),
  });
  const currentMovementRef = useRef({ panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 });
  const workspaceContextRef = useRef(workspaceContext);
  const mountedRef = useRef(true);
  const persistRef = useRef(onPersistSession);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequenceRef = useRef(0);
  const activeInputRevisionRef = useRef<string | null>(null);
  const samplingInFlightRef = useRef(false);
  const queuedSampleRef = useRef<{
    quality: 'preview' | 'settled' | 'polish';
    snapshot: GraphWorkspaceSessionStateV3;
  } | null>(null);
  const launchSampleRef = useRef<(
    quality: 'preview' | 'settled' | 'polish',
    snapshot: GraphWorkspaceSessionStateV3,
  ) => Promise<void>>(async () => undefined);
  const itemSequenceRef = useRef(2);
  const historyRef = useRef<GraphHistory>({ undo: [], redo: [], typingItemId: null });
  const scheduledRevisionsRef = useRef({
    mathematics: initialSession.document.mathematicsRevision,
    parameter: initialSession.surface.parameterRevision,
    viewport: initialSession.surface.viewportRevision,
  });
  const piecewiseGraceTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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

  const persistSoon = useCallback((next: GraphWorkspaceSessionStateV3, immediate = false) => {
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
    next: GraphWorkspaceSessionStateV3,
    immediate = false,
  ) => {
    sessionRef.current = next;
    setSession(next);
    persistSoon(next, immediate);
  }, [persistSoon]);

  const pushHistory = useCallback((document: GraphDocumentV2, typingItemId: string | null) => {
    const history = historyRef.current;
    if (typingItemId && history.typingItemId === typingItemId) return;
    history.undo = [...history.undo.slice(-(MAX_UNDO_STEPS - 1)), {
      document,
      appearance: sessionRef.current.surface.appearance,
    }];
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
    activeSamplingItemIdRef.current = itemId;
    const current = sessionRef.current;
    const previous = current.document.items.find((item) => item.itemId === itemId);
    if (previous?.kind === 'note') return;
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

  const addNote = useCallback(() => {
    const current = sessionRef.current;
    const itemId = nextItemId();
    pushHistory(current.document, null);
    commitSession({
      ...current,
      document: replaceGraphDocumentNote(current.document, createGraphNoteItem(itemId)),
    }, true);
    return itemId;
  }, [commitSession, nextItemId, pushHistory]);

  const updateNote = useCallback((itemId: string, text: string) => {
    const current = sessionRef.current;
    const note = current.document.items.find((item) => item.itemId === itemId);
    if (!note || note.kind !== 'note' || text.length > 16_384) return false;
    pushHistory(current.document, itemId);
    commitSession({
      ...current,
      document: replaceGraphDocumentNote(current.document, { ...note, text }),
    });
    return true;
  }, [commitSession, pushHistory]);

  const reorderItem = useCallback((itemId: string, destinationIndex: number) => {
    const current = sessionRef.current;
    const item = current.document.items.find((candidate) => candidate.itemId === itemId);
    if (!item || item.kind !== 'note') return;
    const nextDocument = reorderGraphDocumentItem(current.document, itemId, destinationIndex);
    if (nextDocument === current.document) return;
    pushHistory(current.document, null);
    commitSession({ ...current, document: nextDocument }, true);
  }, [commitSession, pushHistory]);

  const createPiecewiseDraft = useCallback(() => {
    const current = sessionRef.current;
    const itemId = blankItemId;
    const draft: GraphPiecewiseAuthoringDraftV1 = {
      version: 1,
      draftId: `${itemId}.piecewise-draft`,
      itemId,
      mode: 'create',
      target: 'y',
      branches: [0, 1].map((index) => ({
        branchId: `${itemId}.branch.${index + 1}`,
        valueLatex: '',
        conditionLatex: '',
      })),
    };
    commitSession({
      ...current,
      authoring: { piecewiseDrafts: [...(current.authoring?.piecewiseDrafts ?? []), draft] },
    }, true);
    setBlankItemId(nextItemId());
    return itemId;
  }, [blankItemId, commitSession, nextItemId]);

  const beginPiecewiseDraft = useCallback((itemId: string) => {
    const current = sessionRef.current;
    const existing = current.authoring?.piecewiseDrafts.find((draft) => draft.itemId === itemId);
    if (existing) return existing.itemId;
    const item = current.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'piecewise' }> => (
      candidate.itemId === itemId && candidate.kind === 'piecewise'
    ));
    if (!item) return null;
    const draft: GraphPiecewiseAuthoringDraftV1 = {
      version: 1,
      draftId: `${itemId}.piecewise-draft`,
      itemId,
      mode: 'replace',
      target: item.piecewise.branches[0]?.relation.kind === 'explicit-x' ? 'x' : 'y',
      branches: item.piecewise.branches.map((branch) => ({
        branchId: branch.branchId,
        valueLatex: graphPiecewiseBranchValueLatex(branch),
        conditionLatex: graphConditionLatex(branch.condition),
      })),
    };
    commitSession({
      ...current,
      authoring: { piecewiseDrafts: [...(current.authoring?.piecewiseDrafts ?? []), draft] },
    }, true);
    return itemId;
  }, [commitSession]);

  const updatePiecewiseDraft = useCallback((input: {
    itemId: string;
    branchId: string;
    field: 'valueLatex' | 'conditionLatex';
    value: string;
  }) => {
    const current = sessionRef.current;
    const drafts = current.authoring?.piecewiseDrafts ?? [];
    const draft = drafts.find((candidate) => candidate.itemId === input.itemId);
    if (!draft) return false;
    const nextDraft = {
      ...draft,
      branches: draft.branches.map((branch) => branch.branchId === input.branchId
        ? { ...branch, [input.field]: input.value }
        : branch),
    };
    const promoted = buildGraphPiecewiseItemFromAuthoringDraft({
      itemId: draft.itemId,
      sourceRevision: 1,
      index: current.document.items.length,
      target: draft.target,
      branches: nextDraft.branches,
    });
    if (promoted && nextDraft.mode === 'create') {
      pushHistory(current.document, null);
      activeInputRevisionRef.current = null;
      commitSession({
        ...current,
        document: replaceGraphDocumentItem(current.document, promoted),
        authoring: { piecewiseDrafts: drafts.filter((candidate) => candidate.itemId !== input.itemId) },
      }, true);
      return true;
    }
    const graceTimer = piecewiseGraceTimersRef.current.get(input.itemId);
    if (graceTimer) clearTimeout(graceTimer);
    piecewiseGraceTimersRef.current.delete(input.itemId);
    if (!promoted && nextDraft.mode === 'replace') {
      piecewiseGraceTimersRef.current.set(input.itemId, setTimeout(() => {
        setSuppressedPiecewiseItems((currentIds) => new Set(currentIds).add(input.itemId));
        piecewiseGraceTimersRef.current.delete(input.itemId);
      }, INVALID_GRACE_MS));
    }
    commitSession({
      ...current,
      authoring: { piecewiseDrafts: drafts.map((candidate) => candidate.itemId === input.itemId ? nextDraft : candidate) },
    });
    return false;
  }, [commitSession, pushHistory]);

  const commitPiecewiseDraft = useCallback((itemId: string) => {
    activeSamplingItemIdRef.current = itemId;
    const current = sessionRef.current;
    const drafts = current.authoring?.piecewiseDrafts ?? [];
    const draft = drafts.find((candidate) => candidate.itemId === itemId);
    if (!draft) return false;
    const previous = current.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'piecewise' }> => (
      candidate.itemId === itemId && candidate.kind === 'piecewise'
    ));
    const promoted = buildGraphPiecewiseItemFromAuthoringDraft({
      itemId,
      sourceRevision: (previous?.source.sourceRevision ?? 0) + 1,
      index: Math.max(0, current.document.items.findIndex((item) => item.itemId === itemId)),
      target: draft.target,
      branches: draft.branches,
      ...(previous ? { previous } : {}),
    });
    if (!promoted) return false;
    if (previous) pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    const graceTimer = piecewiseGraceTimersRef.current.get(itemId);
    if (graceTimer) clearTimeout(graceTimer);
    piecewiseGraceTimersRef.current.delete(itemId);
    setSuppressedPiecewiseItems((currentIds) => {
      if (!currentIds.has(itemId)) return currentIds;
      const next = new Set(currentIds); next.delete(itemId); return next;
    });
    commitSession({
      ...current,
      document: replaceGraphDocumentItem(current.document, promoted),
      authoring: { piecewiseDrafts: drafts.filter((candidate) => candidate.itemId !== itemId) },
    }, true);
    return true;
  }, [commitSession, pushHistory]);

  const removePiecewiseDraft = useCallback((itemId: string) => {
    const current = sessionRef.current;
    commitSession({ ...current, authoring: {
      piecewiseDrafts: (current.authoring?.piecewiseDrafts ?? []).filter((draft) => draft.itemId !== itemId),
    } }, true);
    const graceTimer = piecewiseGraceTimersRef.current.get(itemId);
    if (graceTimer) clearTimeout(graceTimer);
    piecewiseGraceTimersRef.current.delete(itemId);
    setSuppressedPiecewiseItems((currentIds) => {
      if (!currentIds.has(itemId)) return currentIds;
      const next = new Set(currentIds); next.delete(itemId); return next;
    });
  }, [commitSession]);

  const mutatePiecewiseDraft = useCallback((input: {
    itemId: string;
    action: 'add' | 'remove' | 'up' | 'down';
    branchId?: string;
  }) => {
    const current = sessionRef.current;
    const drafts = current.authoring?.piecewiseDrafts ?? [];
    const draft = drafts.find((candidate) => candidate.itemId === input.itemId);
    if (!draft) return;
    const branches = [...draft.branches];
    const index = input.branchId ? branches.findIndex((branch) => branch.branchId === input.branchId) : -1;
    if (input.action === 'add') branches.push({
      branchId: `${draft.itemId}.branch.${branches.length + 1}.${Date.now()}`,
      valueLatex: '', conditionLatex: '',
    });
    else if (input.action === 'remove' && index >= 0 && branches.length > 2) branches.splice(index, 1);
    else if (input.action === 'up' && index > 0) [branches[index - 1], branches[index]] = [branches[index], branches[index - 1]];
    else if (input.action === 'down' && index >= 0 && index < branches.length - 1) [branches[index], branches[index + 1]] = [branches[index + 1], branches[index]];
    else return;
    const graceTimer = piecewiseGraceTimersRef.current.get(input.itemId);
    if (graceTimer) clearTimeout(graceTimer);
    piecewiseGraceTimersRef.current.delete(input.itemId);
    const previous = current.document.items.find((candidate): candidate is Extract<GraphItemSpecV1, { kind: 'piecewise' }> => (
      candidate.itemId === input.itemId && candidate.kind === 'piecewise'
    ));
    const remainsValid = buildGraphPiecewiseItemFromAuthoringDraft({
      itemId: input.itemId,
      sourceRevision: (previous?.source.sourceRevision ?? 0) + 1,
      index: Math.max(0, current.document.items.findIndex((item) => item.itemId === input.itemId)),
      target: draft.target,
      branches,
      ...(previous ? { previous } : {}),
    }) !== null;
    if (draft.mode === 'replace' && !remainsValid) {
      piecewiseGraceTimersRef.current.set(input.itemId, setTimeout(() => {
        setSuppressedPiecewiseItems((currentIds) => new Set(currentIds).add(input.itemId));
        piecewiseGraceTimersRef.current.delete(input.itemId);
      }, INVALID_GRACE_MS));
    }
    commitSession({ ...current, authoring: { piecewiseDrafts: drafts.map((candidate) => (
      candidate.itemId === input.itemId ? { ...candidate, branches } : candidate
    )) } });
  }, [commitSession]);

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
        contentRevision: current.document.contentRevision + 1,
        mathematicsRevision: current.document.mathematicsRevision + 1,
        items: [...current.document.items, ...created],
      },
      surface: {
        ...current.surface,
        parameterRevision: current.surface.parameterRevision + 1,
      },
    }, true);
  }, [commitSession, nextItemId, pushHistory]);

  const updateParameter = useCallback((itemId: string, values: Parameters<typeof updateGraphParameterItem>[0]['values']) => {
    activeSamplingItemIdRef.current = itemId;
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

  const undo = useCallback(() => {
    const history = historyRef.current;
    const snapshot = history.undo.at(-1);
    if (!snapshot) return;
    const current = sessionRef.current;
    history.undo = history.undo.slice(0, -1);
    history.redo = [...history.redo, { document: current.document, appearance: current.surface.appearance }];
    history.typingItemId = null;
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: restoredGraphDocument(current.document, snapshot.document),
      surface: {
        ...current.surface,
        appearance: snapshot.appearance,
        parameterRevision: graphParameterEnvironmentChanged(current.document, snapshot.document)
          ? current.surface.parameterRevision + 1
          : current.surface.parameterRevision,
      },
    }, true);
    publishHistoryAvailability();
  }, [commitSession, publishHistoryAvailability]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const snapshot = history.redo.at(-1);
    if (!snapshot) return;
    const current = sessionRef.current;
    history.redo = history.redo.slice(0, -1);
    history.undo = [...history.undo, { document: current.document, appearance: current.surface.appearance }];
    history.typingItemId = null;
    activeInputRevisionRef.current = null;
    commitSession({
      ...current,
      document: restoredGraphDocument(current.document, snapshot.document),
      surface: {
        ...current.surface,
        appearance: snapshot.appearance,
        parameterRevision: graphParameterEnvironmentChanged(current.document, snapshot.document)
          ? current.surface.parameterRevision + 1
          : current.surface.parameterRevision,
      },
    }, true);
    publishHistoryAvailability();
  }, [commitSession, publishHistoryAvailability]);

  const setViewport = useCallback((viewport: GraphViewportV1) => {
    if (!isFiniteGraphViewport(viewport)) return;
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

  const updateGrid = useCallback((values: Partial<GraphWorkspaceSessionStateV3['surface']['grid']>) => {
    const current = sessionRef.current;
    const grid = { ...current.surface.grid, ...values };
    commitSession({
      ...current,
      surface: {
        ...current.surface,
        grid,
        viewport: {
          ...current.surface.viewport,
          coordinateSystem: grid.kind === 'polar' ? 'polar' : 'cartesian',
        },
        viewportRevision: current.surface.viewportRevision + 1,
      },
    }, true);
  }, [commitSession]);

  const updateAppearance = useCallback((
    values: Partial<GraphWorkspaceSessionStateV3['surface']['appearance']>,
  ) => {
    const current = sessionRef.current;
    const appearance = { ...current.surface.appearance, ...values };
    if (appearance.theme === current.surface.appearance.theme
      && appearance.colorVisionMode === current.surface.appearance.colorVisionMode) return;
    pushHistory(current.document, null);
    commitSession({ ...current, surface: { ...current.surface, appearance } }, true);
  }, [commitSession, pushHistory]);

  const updatePresentation = useCallback((itemId: string, presentation: GraphItemPresentationV2) => {
    const current = sessionRef.current;
    const document = replaceGraphDocumentPresentation({ document: current.document, itemId, presentation });
    if (!document) return false;
    pushHistory(current.document, null);
    commitSession({ ...current, document }, true);
    return true;
  }, [commitSession, pushHistory]);

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
    quality: 'preview' | 'settled' | 'polish',
    snapshot: GraphWorkspaceSessionStateV3,
  ) => {
    const width = Math.max(1, Math.round(cssSize.width));
    const height = Math.max(1, Math.round(cssSize.height));
    const items = classifiedGraphItems(snapshot.document);
    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;
    const activeItemId = activeSamplingItemIdRef.current ?? undefined;
    const activeItem = activeItemId
      ? snapshot.document.items.find((item) => item.itemId === activeItemId)
      : undefined;
    const activeParameterSymbol = activeItem?.kind === 'parameter'
      ? activeItem.parameter.symbol
      : undefined;
    const dependentItemIds = activeParameterSymbol
      ? items.filter((item) => graphItemFreeSymbols(item).has(activeParameterSymbol)).map((item) => item.itemId)
      : [];
    if (quality === 'preview') {
      const previous = lastSampleViewRef.current;
      const elapsedSeconds = Math.max(0.016, (Date.now() - previous.at) / 1_000);
      const previousViewport = previous.viewport;
      const viewport = snapshot.surface.viewport;
      const previousCenterX = (previousViewport.xMin + previousViewport.xMax) / 2;
      const previousCenterY = (previousViewport.yMin + previousViewport.yMax) / 2;
      const centerX = (viewport.xMin + viewport.xMax) / 2;
      const centerY = (viewport.yMin + viewport.yMax) / 2;
      currentMovementRef.current = {
        panVelocityX: (centerX - previousCenterX) / (viewport.xMax - viewport.xMin) * width / elapsedSeconds,
        panVelocityY: (centerY - previousCenterY) / (viewport.yMax - viewport.yMin) * height / elapsedSeconds,
        zoomRatio: (viewport.xMax - viewport.xMin) / (previousViewport.xMax - previousViewport.xMin),
      };
      lastSampleViewRef.current = { viewport, at: Date.now() };
    }
    const request: GraphSampleRequestV4 = {
      version: 4,
      requestId: `${workspaceContext.workspaceInstanceId}.sample.${sequence}`,
      workspaceInstanceId: workspaceContextRef.current.workspaceInstanceId,
      documentId: snapshot.document.documentId,
      revisions: {
        scene: sequence,
        mathematics: snapshot.document.mathematicsRevision,
        viewport: snapshot.surface.viewportRevision,
        parameter: snapshot.surface.parameterRevision,
      },
      items,
      parameterEnvironment: graphParameterEnvironment(snapshot.document),
      viewport: snapshot.surface.viewport,
      cssSize: { width, height },
      overlays: { unitCircle: snapshot.surface.grid.unitCircle },
      quality,
      priority: { ...(activeItemId ? { activeItemId } : {}), dependentItemIds },
      movement: currentMovementRef.current,
    };
    activeInputRevisionRef.current = buildGraphSampleInputRevisionId(request);
    const statusTimer = quality === 'preview'
      ? setTimeout(() => setStatus({ kind: 'sampling', label: 'Drawing preview…' }), 120)
      : undefined;
    try {
      const envelope = await runGraphSampleWithOoe(request, {
        activeInputRevisionId: () => activeInputRevisionRef.current,
        isWorkspaceInstanceOpen: () => mountedRef.current,
        workspaceInstance: workspaceContextRef.current,
      });
      const latest = sessionRef.current;
      const current = mountedRef.current
        && sequence === requestSequenceRef.current
        && latest.document.mathematicsRevision === request.revisions.mathematics
        && latest.surface.viewportRevision === request.revisions.viewport
        && latest.surface.parameterRevision === request.revisions.parameter
        && envelope.ooe.commitAssessment.legality === 'commitAllowed'
        && envelope.payload.status !== 'cancelled';
      if (!current) {
        if (envelope.ooe.releasedBufferBytes === 0) releaseGraphSampleResultBuffers(envelope.payload);
        return;
      }
      const previous = resultRef.current;
      if (previous) retiredResultsRef.current.push(previous);
      resultRef.current = envelope.payload;
      setSampleResult(envelope.payload);
      const topologyInconclusive = envelope.payload.stopReasons.some(
        (reason) => reason.code === 'region-topology-inconclusive',
      );
      const piecewiseConditionIssue = envelope.payload.stopReasons.some(
        (reason) => reason.detailCode?.startsWith('piecewise-'),
      );
      const reducedItems = envelope.payload.itemEvidence.filter((item) => (
        item.achievedQuality === 'reduced-detail' || item.achievedQuality === 'unresolved'
      ));
      setStatus((reducedItems.length > 0 || envelope.payload.stopReasons.length > 0) && quality !== 'preview'
        ? {
            kind: 'warning',
            label: topologyInconclusive
              ? 'Uncertain region cells were omitted safely.'
              : piecewiseConditionIssue
                ? 'Review the piecewise branch conditions.'
                : reducedItems.some((item) => item.achievedQuality === 'unresolved')
                  ? 'Some items could not be resolved in this view.'
                  : 'Some items are shown with reduced detail at this zoom.',
          }
        : { kind: 'ready', label: 'Ready' });
    } catch {
      if (mountedRef.current && sequence === requestSequenceRef.current) {
        setStatus({ kind: 'error', label: 'Graph sampling stopped safely.' });
      }
    } finally {
      if (statusTimer) clearTimeout(statusTimer);
    }
  }, [cssSize.height, cssSize.width, workspaceContext.workspaceInstanceId]);

  const launchSample = useCallback(async (
    quality: 'preview' | 'settled' | 'polish',
    snapshot: GraphWorkspaceSessionStateV3,
  ) => {
    if (samplingInFlightRef.current) {
      queuedSampleRef.current = { quality, snapshot };
      return;
    }
    samplingInFlightRef.current = true;
    try {
      await runSample(quality, snapshot);
    } finally {
      samplingInFlightRef.current = false;
      const queued = queuedSampleRef.current;
      queuedSampleRef.current = null;
      if (queued && mountedRef.current) {
        void launchSampleRef.current(queued.quality, queued.snapshot);
      }
    }
  }, [runSample]);
  launchSampleRef.current = launchSample;

  const flushSampling = useCallback(() => {
    const snapshot = sessionRef.current;
    const result = resultRef.current;
    const currentPolish = result?.quality === 'polish'
      && result.revisions.mathematics === snapshot.document.mathematicsRevision
      && result.revisions.parameter === snapshot.surface.parameterRevision
      && result.revisions.viewport === snapshot.surface.viewportRevision;
    if (currentPolish) { persistSoon(snapshot, true); return; }
    activeInputRevisionRef.current = null;
    void launchSample('preview', snapshot);
    void launchSample('settled', snapshot);
    persistSoon(sessionRef.current, true);
  }, [launchSample, persistSoon]);

  const samplingMathematicsRevision = session.document.mathematicsRevision;
  const samplingParameterRevision = session.surface.parameterRevision;
  const samplingViewportRevision = session.surface.viewportRevision;

  useEffect(() => {
    activeInputRevisionRef.current = null;
    const snapshot = sessionRef.current;
    const previousRevisions = scheduledRevisionsRef.current;
    const viewportOnly = previousRevisions.mathematics === samplingMathematicsRevision
      && previousRevisions.parameter === samplingParameterRevision
      && previousRevisions.viewport !== samplingViewportRevision;
    scheduledRevisionsRef.current = {
      mathematics: samplingMathematicsRevision,
      parameter: samplingParameterRevision,
      viewport: samplingViewportRevision,
    };
    const invalidIds = snapshot.document.items
      .filter((item) => item.kind === 'invalid-relation-draft')
      .map((item) => item.itemId);
    let previewTimer: ReturnType<typeof setTimeout> | null = null;
    let settledTimer: ReturnType<typeof setTimeout> | null = null;
    let polishTimer: ReturnType<typeof setTimeout> | null = null;
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
      polishTimer = setTimeout(
        () => void launchSample('polish', snapshot),
        (viewportOnly ? VIEWPORT_SETTLED_DELAY_MS : SETTLED_DELAY_MS) + POLISH_DELAY_MS,
      );
    }
    return () => {
      if (previewTimer) clearTimeout(previewTimer);
      if (settledTimer) clearTimeout(settledTimer);
      if (polishTimer) clearTimeout(polishTimer);
      if (invalidTimer) clearTimeout(invalidTimer);
    };
  }, [
    launchSample,
    samplingMathematicsRevision,
    samplingParameterRevision,
    samplingViewportRevision,
  ]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    resultRef.current = sampleResult;
    const retained: GraphSampleResultV4[] = [];
    retiredResultsRef.current.splice(0).forEach((result) => {
      if (result === sampleResult) retained.push(result);
      else releaseGraphSampleResultBuffers(result);
    });
    retiredResultsRef.current.push(...retained);
  }, [sampleResult]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeInputRevisionRef.current = null;
      queuedSampleRef.current = null;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      piecewiseGraceTimersRef.current.forEach((timer) => clearTimeout(timer));
      piecewiseGraceTimersRef.current.clear();
      persistRef.current(sessionRef.current);
      retiredResultsRef.current.splice(0).forEach(releaseGraphSampleResultBuffers);
      if (resultRef.current) releaseGraphSampleResultBuffers(resultRef.current);
    };
  }, []);

  const isScenePending = sampleResult !== null && (
    sampleResult.revisions.mathematics !== session.document.mathematicsRevision
    || sampleResult.revisions.viewport !== session.surface.viewportRevision
    || sampleResult.revisions.parameter !== session.surface.parameterRevision
  );

  return useMemo(() => ({
    addNote,
    addPointSet,
    createPiecewiseDraft,
    beginPiecewiseDraft,
    commitPiecewiseDraft,
    autoFit,
    blankItemId,
    blurItem,
    canRedo: historyAvailability.canRedo,
    canUndo: historyAvailability.canUndo,
    createParameters,
    editItem,
    endTypingTransaction,
    flushSampling,
    isScenePending,
    mutatePiecewiseDraft,
    redo,
    reorderItem,
    removeItem,
    removePiecewiseDraft,
    suppressedPiecewiseItems,
    sampleResult,
    session,
    setActiveSamplingItem,
    setViewport,
    status,
    toggleItem,
    toggleRail,
    undo,
    unresolvedSymbols: unresolvedGraphSymbols(session.document),
    updateGrid,
    updateAppearance,
    updateNote,
    updateParameter,
    updatePresentation,
    updatePiecewiseDraft,
    visibleDraftErrors,
  }), [
    addNote,
    addPointSet,
    createPiecewiseDraft,
    beginPiecewiseDraft,
    commitPiecewiseDraft,
    autoFit,
    blankItemId,
    blurItem,
    createParameters,
    editItem,
    endTypingTransaction,
    flushSampling,
    historyAvailability,
    isScenePending,
    mutatePiecewiseDraft,
    redo,
    reorderItem,
    removeItem,
    removePiecewiseDraft,
    suppressedPiecewiseItems,
    sampleResult,
    session,
    setActiveSamplingItem,
    setViewport,
    status,
    toggleItem,
    toggleRail,
    undo,
    updateGrid,
    updateAppearance,
    updateNote,
    updateParameter,
    updatePresentation,
    updatePiecewiseDraft,
    visibleDraftErrors,
  ]);
}
