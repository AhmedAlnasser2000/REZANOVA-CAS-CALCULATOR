import type { LanguageCatalog } from '../../types';

export const englishHistory = {
  title: 'History',
  empty: 'No stored history yet.',
  replay: 'Replay',
  actions: {
    clear: 'Clear',
    close: 'Close',
    stop: 'Stop',
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
  },
  staleAnswer: 'Replay this entry to refresh its saved answer.',
} satisfies LanguageCatalog['history'];
