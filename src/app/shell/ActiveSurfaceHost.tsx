import type { ReactNode } from 'react';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import { formulaViewerArtifactFromSurfaceState } from '../runtime/formula-viewer-artifacts';
import { resolveWorkspaceSurfaceDescriptor } from '../runtime/workspace-surfaces';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
  Settings,
  SettingsPatch,
} from '../../types/calculator';
import {
  HISTORY_PAGE_WORKSPACE_KIND,
  SETTINGS_PAGE_WORKSPACE_KIND,
} from '../runtime/app-page-workspaces';
import { FormulaViewerPage } from './FormulaViewerPage';
import { HistoryPage } from './HistoryPage';
import { SettingsPage } from './SettingsPage';

type ActiveSurfaceHostProps = {
  activeInstance: WorkspaceInstance | null | undefined;
  history: HistoryEntry[];
  modeLabels: Record<ModeId, string>;
  onCopyResult: (latex: string) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onDeleteSelectedHistoryEntries: (ids: string[]) => void;
  onFocusTab: (instanceId: string) => void;
  onPatchSettings: (patch: SettingsPatch) => void;
  onReplayHistoryEntry: (entry: HistoryEntry) => void;
  onReplayHistoryEntryInNewTab: (entry: HistoryEntry) => void;
  onResetCalculatorMemory: () => void;
  onResetHistory: () => void;
  onStopPendingHistoryTicket?: (ticket: PendingHistoryTicket) => void;
  pendingHistory: PendingHistoryTicket[];
  renderCalculatorSurface: () => ReactNode;
  settings: Settings;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
  workspaceInstances: readonly WorkspaceInstance[];
};

export function ActiveSurfaceHost({
  activeInstance,
  history,
  modeLabels,
  onCopyResult,
  onDeleteHistoryEntry,
  onDeleteSelectedHistoryEntries,
  onFocusTab,
  onPatchSettings,
  onReplayHistoryEntry,
  onReplayHistoryEntryInNewTab,
  onResetCalculatorMemory,
  onResetHistory,
  onStopPendingHistoryTicket,
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
        className="active-surface active-surface--page active-surface--settings"
        data-surface-kind="settings"
        data-testid="active-surface-page"
      >
        <SettingsPage
          settings={settings}
          onPatch={onPatchSettings}
          onClearHistory={onResetHistory}
          onResetCalculatorMemory={onResetCalculatorMemory}
        />
      </section>
    );
  }

  if (surfaceDescriptor.pageKind === HISTORY_PAGE_WORKSPACE_KIND) {
    return (
      <section
        className="active-surface active-surface--page active-surface--history"
        data-surface-kind="history"
        data-testid="active-surface-page"
      >
        <HistoryPage
          history={history}
          historyNotationMode={settings.historyPageNotationMode}
          pendingHistory={pendingHistory}
          modeLabels={modeLabels}
          onCopyResult={onCopyResult}
          onDelete={onDeleteHistoryEntry}
          onDeleteSelected={onDeleteSelectedHistoryEntries}
          onReplay={onReplayHistoryEntry}
          onReplayInNewTab={onReplayHistoryEntryInNewTab}
          onStopPending={onStopPendingHistoryTicket}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
        />
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
      className="active-surface active-surface--page active-surface--formula-viewer"
      data-surface-kind="formula-viewer"
      data-testid="active-surface-page"
    >
      <FormulaViewerPage
        artifact={formulaViewerArtifact}
        onBackToSource={sourceId ? () => onFocusTab(sourceId) : undefined}
        onCopyResult={onCopyResult}
        sourceAvailable={sourceAvailable}
        symbolicDisplayPrefs={symbolicDisplayPrefs}
      />
    </section>
  );
}
