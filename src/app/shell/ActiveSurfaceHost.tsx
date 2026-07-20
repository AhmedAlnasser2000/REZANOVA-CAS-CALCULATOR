import {
  lazy,
  Suspense,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import {
  workspaceInstanceRuntimeContext,
  type WorkspaceInstance,
} from '../runtime/workspace-instances';
import { formulaViewerArtifactFromSurfaceState } from '../runtime/formula-viewer-contract';
import { resolveWorkspaceSurfaceDescriptor } from '../runtime/workspace-surfaces';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
  Settings,
  SettingsPatch,
} from '../../types/calculator';
import {
  GRAPHING_PAGE_WORKSPACE_KIND,
  GUIDE_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  NOTEBOOK_PAGE_WORKSPACE_KIND,
  SETTINGS_PAGE_WORKSPACE_KIND,
} from '../runtime/app-page-workspaces';
import type { GuideWorkspaceProps } from '../workspaces/GuideWorkspace';
import type {
  NotebookSurfaceState,
  NotebookWorkspaceTarget,
} from '../../lib/notebook';
import type { GraphWorkspaceSessionStateV4 } from '../graphing/graph-workspace-session';

const GraphWorkspacePageHost = lazy(() => import('../graphing/GraphWorkspacePageHost'));
const FormulaViewerPage = lazy(() => import('./FormulaViewerPage').then((module) => ({
  default: module.FormulaViewerPage,
})));
const GuidePage = lazy(() => import('./GuidePage').then((module) => ({
  default: module.GuidePage,
})));
const HistoryPage = lazy(() => import('./HistoryPage').then((module) => ({
  default: module.HistoryPage,
})));
const NotebookPage = lazy(() => import('./NotebookPage').then((module) => ({
  default: module.NotebookPage,
})));
const SettingsPage = lazy(() => import('./SettingsPage').then((module) => ({
  default: module.SettingsPage,
})));

function PageSurfaceSuspense({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Suspense fallback={<div className="app-page-loading" role="status">Loading {label}…</div>}>
      {children}
    </Suspense>
  );
}

type ActiveSurfaceHostProps = {
  activeInstance: WorkspaceInstance | null | undefined;
  guide: GuideWorkspaceProps;
  history: HistoryEntry[];
  modeLabels: Record<ModeId, string>;
  onCopyResult: (latex: string, surface: 'history' | 'formula-viewer') => void;
  onDeleteHistoryEntry: (id: string) => void;
  onDeleteSelectedHistoryEntries: (ids: string[]) => void;
  onFocusTab: (instanceId: string) => void;
  onOpenNotebookMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onPatchSettings: (patch: SettingsPatch) => void;
  onReplayHistoryEntry: (entry: HistoryEntry) => void;
  onReplayHistoryEntryInNewTab: (entry: HistoryEntry) => void;
  onResetCalculatorMemory: () => void;
  onResetHistory: () => void;
  onStopPendingHistoryTicket?: (ticket: PendingHistoryTicket) => void;
  onUpdateGraphSurfaceState: (instanceId: string, state: GraphWorkspaceSessionStateV4) => void;
  onUpdateNotebookSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  pendingHistory: PendingHistoryTicket[];
  renderCalculatorSurface: () => ReactNode;
  settings: Settings;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
  workspaceInstances: readonly WorkspaceInstance[];
};

export function ActiveSurfaceHost({
  activeInstance,
  guide,
  history,
  modeLabels,
  onCopyResult,
  onDeleteHistoryEntry,
  onDeleteSelectedHistoryEntries,
  onFocusTab,
  onOpenNotebookMathInTool,
  onPatchSettings,
  onReplayHistoryEntry,
  onReplayHistoryEntryInNewTab,
  onResetCalculatorMemory,
  onResetHistory,
  onStopPendingHistoryTicket,
  onUpdateGraphSurfaceState,
  onUpdateNotebookSurfaceState,
  pendingHistory,
  renderCalculatorSurface,
  settings,
  symbolicDisplayPrefs,
  workspaceInstances,
}: ActiveSurfaceHostProps) {
  const surfaceDescriptor = activeInstance
    ? resolveWorkspaceSurfaceDescriptor(activeInstance.workspaceKind)
    : null;
  const formulaViewerArtifact = formulaViewerArtifactFromSurfaceState(
    activeInstance?.surfaceState ?? null,
  );
  const pageSurfaceStyle = {
    '--page-ui-scale': `${settings.uiScale / 100}`,
    '--math-scale': `${settings.mathScale / 100}`,
    '--result-scale': `${settings.resultScale / 100}`,
  } as CSSProperties;
  const pageSurfaceClassName =
    `active-surface active-surface--page${settings.highContrast ? ' is-high-contrast' : ''}`;

  if (surfaceDescriptor?.surfaceKind !== 'page') {
    return (
      <section
        className="active-surface active-surface--calculator"
        data-testid="active-surface-calculator"
      >
        {renderCalculatorSurface()}
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === SETTINGS_PAGE_WORKSPACE_KIND) {
    return (
      <section
        className={`${pageSurfaceClassName} active-surface--settings`}
        data-surface-kind="settings"
        data-testid="active-surface-page"
        style={pageSurfaceStyle}
      >
        <PageSurfaceSuspense label="Settings">
          <SettingsPage
            settings={settings}
            onPatch={onPatchSettings}
            onClearHistory={onResetHistory}
            onResetCalculatorMemory={onResetCalculatorMemory}
          />
        </PageSurfaceSuspense>
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === HISTORY_PAGE_WORKSPACE_KIND) {
    return (
      <section
        className={`${pageSurfaceClassName} active-surface--history`}
        data-surface-kind="history"
        data-testid="active-surface-page"
        style={pageSurfaceStyle}
      >
        <PageSurfaceSuspense label="History">
          <HistoryPage
            history={history}
            historyNotationMode={settings.historyPageNotationMode}
            pendingHistory={pendingHistory}
            modeLabels={modeLabels}
            onCopyResult={(latex) => onCopyResult(latex, 'history')}
            onDelete={onDeleteHistoryEntry}
            onDeleteSelected={onDeleteSelectedHistoryEntries}
            onReplay={onReplayHistoryEntry}
            onReplayInNewTab={onReplayHistoryEntryInNewTab}
            onStopPending={onStopPendingHistoryTicket}
            symbolicDisplayPrefs={symbolicDisplayPrefs}
          />
        </PageSurfaceSuspense>
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === GUIDE_PAGE_WORKSPACE_KIND) {
    return (
      <section
        className={`${pageSurfaceClassName} active-surface--guide`}
        data-surface-kind="guide"
        data-testid="active-surface-page"
        style={pageSurfaceStyle}
      >
        <PageSurfaceSuspense label="Guide"><GuidePage guide={guide} /></PageSurfaceSuspense>
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === NOTEBOOK_PAGE_WORKSPACE_KIND && activeInstance) {
    return (
      <section
        className={`${pageSurfaceClassName} active-surface--notebook`}
        data-surface-kind="notebook"
        data-testid="active-surface-page"
        style={pageSurfaceStyle}
      >
        <PageSurfaceSuspense label="Notebook">
          <NotebookPage
            instanceId={activeInstance.id}
            onOpenMathInTool={onOpenNotebookMathInTool}
            onUpdateSurfaceState={onUpdateNotebookSurfaceState}
            preferences={settings.notebook}
            surfaceState={activeInstance.surfaceState}
          />
        </PageSurfaceSuspense>
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === GRAPHING_PAGE_WORKSPACE_KIND && activeInstance) {
    const workspaceContext = workspaceInstanceRuntimeContext(activeInstance);
    if (!workspaceContext) {
      return (
        <section
          className={`${pageSurfaceClassName} active-surface--graphing`}
          data-surface-kind="graphing"
          data-testid="active-surface-page"
          style={pageSurfaceStyle}
        >
          <div className="graph-page-load-failure" role="alert">
            Graphing could not validate this workspace session.
          </div>
        </section>
      );
    }
    return (
      <section
        className={`${pageSurfaceClassName} active-surface--graphing`}
        data-surface-kind="graphing"
        data-testid="active-surface-page"
        style={pageSurfaceStyle}
      >
        <Suspense fallback={<div className="graph-page-loading">Loading Graphing…</div>}>
          <GraphWorkspacePageHost
            key={activeInstance.id}
            onUpdateSession={(state) => onUpdateGraphSurfaceState(activeInstance.id, state)}
            session={activeInstance.surfaceState}
            workspaceContext={workspaceContext}
          />
        </Suspense>
      </section>
    );
  }

  if (!formulaViewerArtifact) {
    return null;
  }

  const sourceId = formulaViewerArtifact.sourceWorkspaceInstanceId;
  const sourceAvailable = Boolean(
    sourceId && workspaceInstances.some((instance) => instance.id === sourceId),
  );

  return (
    <section
      className={`${pageSurfaceClassName} active-surface--formula-viewer`}
      data-surface-kind="formula-viewer"
      data-testid="active-surface-page"
      style={pageSurfaceStyle}
    >
      <PageSurfaceSuspense label="Formula Viewer">
        <FormulaViewerPage
          artifact={formulaViewerArtifact}
          onBackToSource={sourceId ? () => onFocusTab(sourceId) : undefined}
          onCopyResult={(latex) => onCopyResult(latex, 'formula-viewer')}
          sourceAvailable={sourceAvailable}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
        />
      </PageSurfaceSuspense>
    </section>
  );
}
