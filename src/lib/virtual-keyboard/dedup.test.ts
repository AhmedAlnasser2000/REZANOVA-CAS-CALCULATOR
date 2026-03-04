import { describe, expect, it } from 'vitest';
import type { KeyboardPageSpec } from '../../types/calculator';
import { KEYBOARD_PAGE_SPECS } from './catalog';
import { assertNoKeyboardDuplicates, findKeyboardDuplicateIssues } from './dedup';

describe('keyboard deduplication', () => {
  it('accepts the curated active keyboard catalog', () => {
    expect(() => assertNoKeyboardDuplicates(KEYBOARD_PAGE_SPECS)).not.toThrow();
  });

  it('reports duplicate groups across layouts', () => {
    const duplicatePages: KeyboardPageSpec[] = [
      {
        id: 'first',
        label: 'First',
        capability: 'keyboard-foundation',
        rows: [[
          {
            id: 'first-x',
            label: 'x',
            action: { kind: 'insert-latex', latex: 'x' },
            capability: 'keyboard-foundation',
            supportLevel: 'insert',
            pageId: 'first',
            duplicateGroup: 'letter-x',
          },
        ]],
      },
      {
        id: 'second',
        label: 'Second',
        capability: 'keyboard-foundation',
        rows: [[
          {
            id: 'second-x',
            label: 'x',
            action: { kind: 'insert-latex', latex: 'x' },
            capability: 'keyboard-foundation',
            supportLevel: 'insert',
            pageId: 'second',
            duplicateGroup: 'letter-x',
          },
        ]],
      },
    ];

    const issues = findKeyboardDuplicateIssues(duplicatePages);
    expect(issues).toHaveLength(1);
    expect(issues[0].scope).toBe('layouts');
    expect(issues[0].duplicateGroup).toBe('letter-x');
  });
});
