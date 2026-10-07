import { useCallback, type RefObject } from 'react';
import type { GraphDocumentV4, GraphItemPresentationV2 } from '../../lib/graphing';
import {
  replaceGraphDocumentPresentation,
  replaceGraphPiecewiseBranchPresentation,
  setGraphComplexValues,
} from './graph-document';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

interface UseGraphSessionActionsInput {
  commitSession: (next: GraphWorkspaceSessionStateV7, immediate?: boolean) => void;
  pushHistory: (document: GraphDocumentV4, typingItemId: string | null) => void;
  sessionRef: RefObject<GraphWorkspaceSessionStateV7>;
  workspaceInstanceId: string;
}

export function useGraphSessionActions({
  commitSession,
  pushHistory,
  sessionRef,
  workspaceInstanceId,
}: UseGraphSessionActionsInput) {
  const toggleRail = useCallback(() => {
    const current = sessionRef.current;
    commitSession({ ...current, surface: {
      ...current.surface,
      expressionRailCollapsed: !current.surface.expressionRailCollapsed,
    } }, true);
  }, [commitSession, sessionRef]);

  /** Rail width or Both split after a drag; not an undoable edit, like collapsing the rail. */
  const updateLayout = useCallback((values: NonNullable<GraphWorkspaceSessionStateV7['surface']['layout']>) => {
    const current = sessionRef.current;
    commitSession({ ...current, surface: { ...current.surface, layout: { ...current.surface.layout, ...values } } }, true);
  }, [commitSession, sessionRef]);

  const updateGrid = useCallback((values: Partial<GraphWorkspaceSessionStateV7['surface']['grid']>) => {
    const current = sessionRef.current;
    const grid = { ...current.surface.grid, ...values };
    commitSession({ ...current, surface: {
      ...current.surface,
      grid,
      viewport: {
        ...current.surface.viewport,
        coordinateSystem: grid.kind === 'polar' ? 'polar' : 'cartesian',
      },
      viewportRevision: current.surface.viewportRevision + 1,
    } }, true);
  }, [commitSession, sessionRef]);

  const updateAppearance = useCallback((
    values: Partial<GraphWorkspaceSessionStateV7['surface']['appearance']>,
  ) => {
    const current = sessionRef.current;
    const appearance = { ...current.surface.appearance, ...values };
    if (appearance.theme === current.surface.appearance.theme
      && appearance.colorVisionMode === current.surface.appearance.colorVisionMode) return;
    pushHistory(current.document, null);
    commitSession({ ...current, surface: { ...current.surface, appearance } }, true);
  }, [commitSession, pushHistory, sessionRef]);

  const updatePaneView = useCallback((
    pane: 'real' | 'complex',
    values: Partial<GraphWorkspaceSessionStateV7['surface']['panes']['real']>,
  ) => {
    const current = sessionRef.current;
    const paneView = { ...current.surface.panes[pane], ...values };
    commitSession({ ...current, surface: { ...current.surface,
      panes: { ...current.surface.panes, [pane]: paneView } } }, true);
  }, [commitSession, sessionRef]);

  const updateViewPolicy = useCallback((mode: 'real' | 'complex' | 'both') => {
    const current = sessionRef.current;
    const viewPolicy = mode === 'real' ? { mode: 'real' as const }
      : mode === 'complex' ? { mode: 'complex' as const, interpretation: 'complex-mapping' as const }
        : { mode: 'both' as const, interpretation: 'complex-mapping' as const, layout: 'synchronized-split' as const };
    commitSession({ ...current, surface: { ...current.surface, viewPolicy } }, true);
  }, [commitSession, sessionRef]);

  const updateComplexView = useCallback((values: Partial<GraphWorkspaceSessionStateV7['surface']['complex']>) => {
    const current = sessionRef.current;
    commitSession({ ...current, surface: { ...current.surface,
      complex: { ...current.surface.complex, ...values } } }, true);
  }, [commitSession, sessionRef]);

  const updateAnalyze = useCallback((
    values: Partial<GraphWorkspaceSessionStateV7['surface']['analyze']> & { open?: boolean },
  ) => {
    const current = sessionRef.current;
    const { open, ...analyzeValues } = values;
    commitSession({ ...current, surface: { ...current.surface,
      ...(open === undefined ? {} : { analyzeOpen: open }),
      analyze: { ...current.surface.analyze, ...analyzeValues } } }, true);
  }, [commitSession, sessionRef]);

  const addAssumption = useCallback((sourceLatex: string) => {
    const normalized = sourceLatex.trim();
    if (!normalized || normalized.length > 8_192) return false;
    const current = sessionRef.current;
    pushHistory(current.document, null);
    commitSession({ ...current, document: {
      ...current.document,
      contentRevision: current.document.contentRevision + 1,
      mathematicsRevision: current.document.mathematicsRevision + 1,
      assumptions: [...current.document.assumptions, {
        version: 1,
        assumptionId: `${workspaceInstanceId}.assumption.${Date.now()}`,
        sourceLatex: normalized,
        sourceRevision: 1,
        factKind: 'complex-domain-note',
      }],
    } }, true);
    return true;
  }, [commitSession, pushHistory, sessionRef, workspaceInstanceId]);

  const removeAssumption = useCallback((assumptionId: string) => {
    const current = sessionRef.current;
    if (!current.document.assumptions.some((entry) => entry.assumptionId === assumptionId)) return;
    pushHistory(current.document, null);
    commitSession({ ...current, document: {
      ...current.document,
      contentRevision: current.document.contentRevision + 1,
      mathematicsRevision: current.document.mathematicsRevision + 1,
      assumptions: current.document.assumptions.filter((entry) => entry.assumptionId !== assumptionId),
    } }, true);
  }, [commitSession, pushHistory, sessionRef]);

  /** Opt-in Re/Im values for a real curve y = f(x); a mathematics change, so it resamples. */
  const setComplexValues = useCallback((itemId: string, enabled: boolean) => {
    const current = sessionRef.current;
    const document = setGraphComplexValues({ document: current.document, itemId, enabled });
    if (!document) return;
    pushHistory(current.document, null);
    commitSession({ ...current, document }, true);
  }, [commitSession, pushHistory, sessionRef]);

  /** An item's style; undoable, never resamples. */
  const updatePresentation = useCallback((itemId: string, presentation: GraphItemPresentationV2) => {
    const current = sessionRef.current;
    const document = replaceGraphDocumentPresentation({ document: current.document, itemId, presentation });
    if (!document) return false;
    pushHistory(current.document, null);
    commitSession({ ...current, document }, true);
    return true;
  }, [commitSession, pushHistory, sessionRef]);

  /** One piecewise branch's style (`null` back to its default); undoable, never resamples. */
  const updateBranchPresentation = useCallback((itemId: string, branchKey: string, presentation: GraphItemPresentationV2 | null) => {
    const current = sessionRef.current;
    const document = replaceGraphPiecewiseBranchPresentation({ document: current.document, itemId, branchKey, presentation });
    if (!document) return false;
    pushHistory(current.document, null);
    commitSession({ ...current, document }, true);
    return true;
  }, [commitSession, pushHistory, sessionRef]);

  return {
    addAssumption,
    updateBranchPresentation,
    updatePresentation,
    setComplexValues,
    removeAssumption,
    toggleRail,
    updateAnalyze,
    updateLayout,
    updateAppearance,
    updateComplexView,
    updateGrid,
    updatePaneView,
    updateViewPolicy,
  };
}
