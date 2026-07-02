import type { LanguageCatalog } from '../../types';

export const englishHistory = {
  title: 'History',
  empty: 'No stored history yet.',
  replay: 'Replay',
  actions: {
    openFullPage: 'Open Full History',
    clear: 'Clear',
    close: 'Close',
    stop: 'Stop',
    replayCurrentTab: 'Replay in Current Tab',
    openInNewTab: 'Open in New Tab',
    copyResult: 'Copy Result',
    deleteEntry: 'Delete',
    deleteSelected: 'Delete Selected',
    selectEntry: 'Select entry',
  },
  filters: {
    search: 'Search history',
    allWorkspaces: 'All workspaces',
    allDates: 'All dates',
  },
  pending: {
    running: 'Running',
    stopping: 'Stopping',
    statusWithElapsed: (status, elapsed) => `${status} · ${elapsed}`,
    tabLabel: (label) => `Tab: ${label}`,
  },
  aria: {
    collapseEntry: 'Collapse history entry',
    expandEntry: 'Expand history entry',
    deleteEntry: 'Delete history entry',
  },
  labels: {
    answer: 'Answer',
    approx: 'Approx',
    domain: 'Domain',
    complex: 'Complex',
    solution: 'Solution',
    inequalitySet: 'Inequality set',
    validWhen: 'Valid when',
    details: 'Details',
    input: 'Input',
    result: 'Result',
    status: 'Status',
  },
  timeline: {
    pending: 'Pending',
    selected: 'Selected',
    entries: (count) => `${count} item${count === 1 ? '' : 's'}`,
  },
  staleAnswer: 'Replay this entry to refresh its saved answer.',
} satisfies LanguageCatalog['history'];
