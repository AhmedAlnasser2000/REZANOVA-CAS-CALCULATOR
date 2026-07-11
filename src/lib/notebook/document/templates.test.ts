import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_STARTER_TEMPLATES,
  createNotebookStarterContent,
} from './templates';

const fixedNow = () => new Date('2026-07-11T12:00:00.000Z');

describe('Notebook starter templates', () => {
  it('offers the four approved low-friction starting points', () => {
    expect(NOTEBOOK_STARTER_TEMPLATES.map((template) => template.id)).toEqual([
      'lecture-notes',
      'worked-example',
      'theorem-sheet',
      'exercise-set',
    ]);
  });

  it.each(NOTEBOOK_STARTER_TEMPLATES)('creates serializable $label content', ({ id }) => {
    const content = createNotebookStarterContent(id, {
      idPrefix: `template.${id}`,
      now: fixedNow,
    });

    expect(content.length).toBeGreaterThan(0);
    expect(new Set(content.map((node) => node.id)).size).toBe(content.length);
    expect(() => JSON.stringify(content)).not.toThrow();
  });
});
