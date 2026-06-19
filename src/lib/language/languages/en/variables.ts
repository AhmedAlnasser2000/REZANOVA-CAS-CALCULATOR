import type { LanguageCatalog } from '../../types';

export const englishVariables = {
  title: 'Variables',
  description: 'Stored numeric values for Calculate evaluation.',
  fields: {
    name: 'Name',
    value: 'Value',
  },
  actions: {
    set: 'Set',
    insert: 'Insert',
    edit: 'Edit',
    clear: 'Clear',
    clearAll: 'Clear All',
    close: 'Close',
  },
  empty: 'No stored variables yet.',
  messages: {
    stored: (name) => `${name} stored.`,
    inserted: (latex) => `${latex} inserted.`,
  },
} satisfies LanguageCatalog['variables'];
