import { describe, expect, it } from 'vitest';
import { KEYBOARD_PAGE_SPECS } from './catalog';

describe('KEYBOARD_PAGE_SPECS', () => {
  it('includes the curated active pages for the current milestone', () => {
    expect(KEYBOARD_PAGE_SPECS.map((page) => page.id)).toEqual([
      'core',
      'algebra',
      'relations',
      'letters',
      'greek',
      'discrete',
      'combinatorics',
      'calculus',
      'functions',
      'series',
      'trig',
      'angles',
      'geometry',
      'coordinate',
      'matrixVec',
    ]);
  });

  it('keeps Greek variants behind long-press instead of duplicate primary keys', () => {
    const greekPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'greek');
    expect(greekPage).toBeDefined();
    expect(greekPage?.rows.flat().some((key) => key.id === 'greek-sigma-final')).toBe(false);
    expect(
      greekPage?.rows
        .flat()
        .find((key) => key.id === 'greek-sigma')
        ?.variants?.map((variant) => variant.label),
    ).toEqual(['σ', 'ς']);
  });

  it('keeps the summation operator on Discrete and not on Greek', () => {
    const greekPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'greek');
    const discretePage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'discrete');

    expect(greekPage?.rows.flat().some((key) => key.id === 'disc-sum')).toBe(false);
    expect(discretePage?.rows.flat().some((key) => key.id === 'disc-sum')).toBe(true);
  });

  it('exposes calculus operators only on the dedicated calculus pages', () => {
    const calculusPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'calculus');
    const functionsPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'functions');
    const algebraPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'algebra');

    expect(calculusPage?.rows.flat().some((key) => key.label === 'd/dx')).toBe(true);
    expect(functionsPage?.rows.flat().some((key) => key.label === 'sin')).toBe(true);
    expect(algebraPage?.rows.flat().some((key) => key.label === '∫')).toBe(false);
  });

  it('keeps linear algebra operators on the dedicated MatrixVec page', () => {
    const matrixVecPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'matrixVec');
    const calculusPage = KEYBOARD_PAGE_SPECS.find((page) => page.id === 'calculus');

    expect(matrixVecPage?.rows.flat().some((key) => key.id === 'lin-matrix-template')).toBe(true);
    expect(calculusPage?.rows.flat().some((key) => key.id === 'lin-matrix-template')).toBe(false);
  });
});
