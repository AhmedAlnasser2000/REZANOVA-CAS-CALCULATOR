import type { LanguageCatalog } from '../../types';

export const englishCommon = {
  actions: {
    run: 'Run',
    stop: 'Stop',
    open: 'Open',
    close: 'Close',
    clear: 'Clear',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
    history: 'History',
    settings: 'Settings',
    guide: 'Guide',
    copy: 'Copy',
    paste: 'Paste',
    toEditor: 'To Editor',
    rename: 'Rename',
    duplicate: 'Duplicate',
  },
  status: {
    ready: 'Ready',
    loading: 'Loading...',
    computing: 'Computing',
    stopping: 'Stopping',
    renderingResult: 'Rendering result',
  },
} satisfies LanguageCatalog['common'];
