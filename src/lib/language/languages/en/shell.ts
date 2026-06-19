import type { LanguageCatalog } from '../../types';

export const englishShell = {
  modeStrip: {
    guide: 'Guide',
    settings: 'Settings',
    variables: 'Vars',
    autoEquationOn: 'Auto Eq On',
    autoEquationOff: 'Auto Eq Off',
    complexOn: 'Complex On',
    complexOff: 'Complex Off',
    showHistory: 'Show Hist',
    hideHistory: 'Hide Hist',
    desktopRuntime: 'Desktop runtime',
    ooeDiagnostics: 'OOE diagnostics',
  },
  launcher: {
    openHere: 'Open Here',
    openInNewTab: 'Open in New Tab',
    openEntryInNewTab: (label) => `Open ${label} in new tab`,
  },
  workspaceTabs: {
    workspaceTabs: 'Workspace tabs',
    openWorkspaces: 'Open workspaces',
    newCalculateTab: 'New Calculate tab',
    openActions: 'Open actions',
    rename: 'Rename',
    duplicate: 'Duplicate',
    closeOthers: 'Close Others',
    clearTabState: 'Clear Tab State',
    stopJobsInThisTab: 'Stop Jobs in This Tab',
    cancelJobsAndClose: 'Cancel Jobs and Close',
    keepOpen: 'Keep Open',
    closeTab: (title) => `Close ${title}`,
    openActionsFor: (title) => `Open actions for ${title}`,
    otherTabsActiveJobs: (count) =>
      count === 1 ? '1 other tab has active jobs' : `${count} other tabs have active jobs`,
  },
  runtimeControls: {
    run: 'Run',
    stop: 'Stop',
    restartEditor: 'Restart Editor',
    runTitle: 'Run the active workspace request',
    stopTitle: 'Stop the active workspace runtime job',
    restartEditorTitle: 'Restart editor analysis',
  },
} satisfies LanguageCatalog['shell'];
