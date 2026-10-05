import { describe, expect, it } from 'vitest';
import { EQUATION_DRAFT_KEY, blankEquationDraft, loadEquationDrafts, readEquationDraft, saveEquationDrafts } from './new-equation-drafts';

describe('New Equation drafts', () => {
  it('round-trip rows, unknowns, domain, style and limits only', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    const draft = { rows: ['x^2=a', 'a>0'], targets: ['x'], domain: 'real' as const, style: 'both' as const, limits: { work: 5, allocation: 7 } };
    saveEquationDrafts(storage, [{ title: 'Tab', draft }]);
    expect(loadEquationDrafts(storage)).toEqual([{ title: 'Tab', draft }]);
    expect(JSON.parse(store.get(EQUATION_DRAFT_KEY) as string)[0]).not.toHaveProperty('response');
  });

  it('refuse malformed drafts and oversized storage', () => {
    expect(readEquationDraft({ rows: [], targets: null })).toEqual(blankEquationDraft());
    expect(readEquationDraft({ ...blankEquationDraft(), targets: ['1x'] })).toEqual(blankEquationDraft());
    expect(loadEquationDrafts({ getItem: () => 'not json' })).toEqual([]);
    expect(() => saveEquationDrafts({ setItem: () => {} }, Array.from({ length: 65 }, () => ({ title: 't', draft: blankEquationDraft() })))).toThrow(/size limit/);
  });
});
