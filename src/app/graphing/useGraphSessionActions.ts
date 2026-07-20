import { useCallback, type MutableRefObject } from 'react';
import type { GraphDocumentV4 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

interface UseGraphSessionActionsInput {
  commitSession: (next: GraphWorkspaceSessionStateV7, immediate?: boolean) => void;
  pushHistory: (document: GraphDocumentV4, typingItemId: string | null) => void;
  sessionRef: MutableRefObject<GraphWorkspaceSessionStateV7>;
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

  return {
    addAssumption,
    removeAssumption,
    toggleRail,
    updateAnalyze,
    updateAppearance,
    updateComplexView,
    updateGrid,
    updatePaneView,
    updateViewPolicy,
  };
}
