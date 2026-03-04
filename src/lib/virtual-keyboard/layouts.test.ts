import { describe, expect, it } from 'vitest';
import { createKeyboardContext } from './capabilities';
import { buildVirtualKeyboardLayouts, resolveKeyboardPages } from './layouts';

describe('resolveKeyboardPages', () => {
  it('shows the full active milestone set in Calculate', () => {
    expect(resolveKeyboardPages(createKeyboardContext('calculate')).map((page) => page.id)).toEqual([
      'core',
      'algebra',
      'relations',
      'letters',
      'greek',
      'discrete',
      'combinatorics',
      'calculus',
      'functions',
    ]);
  });

  it('shows the dedicated trig pages in Trigonometry mode', () => {
    expect(resolveKeyboardPages(createKeyboardContext('trigonometry')).map((page) => page.id)).toEqual([
      'core',
      'letters',
      'trig',
      'angles',
    ]);
  });

  it('shows the MatrixVec page in Matrix and Vector contexts', () => {
    expect(resolveKeyboardPages(createKeyboardContext('matrix')).map((page) => page.id)).toEqual([
      'core',
      'matrixVec',
    ]);
    expect(resolveKeyboardPages(createKeyboardContext('vector')).map((page) => page.id)).toEqual([
      'core',
      'matrixVec',
    ]);
  });

  it('shows the dedicated geometry pages in Geometry mode', () => {
    expect(resolveKeyboardPages(createKeyboardContext('geometry')).map((page) => page.id)).toEqual([
      'core',
      'geometry',
      'coordinate',
    ]);
  });

  it('limits Table mode to its curated subset', () => {
    expect(resolveKeyboardPages(createKeyboardContext('table')).map((page) => page.id)).toEqual([
      'core',
      'letters',
      'functions',
    ]);
  });
});

describe('buildVirtualKeyboardLayouts', () => {
  it('creates labeled MathLive layouts for the visible pages', () => {
    const layouts = buildVirtualKeyboardLayouts(createKeyboardContext('equation', 'symbolic'));

    expect(layouts.map((layout) => layout.id)).toEqual([
      'core',
      'algebra',
      'relations',
      'letters',
      'greek',
      'discrete',
      'combinatorics',
      'calculus',
      'functions',
    ]);
    expect(layouts[0].label).toBe('Core');
    expect('rows' in layouts[0]).toBe(true);
  });
});
