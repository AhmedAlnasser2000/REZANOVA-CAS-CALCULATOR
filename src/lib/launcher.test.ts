import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../types/calculator';
import {
  createLauncherStateForMode,
  getLauncherAppAtIndex,
  getLauncherAppByHotkey,
  getLauncherCategoryAtIndex,
  getLauncherCategoryByHotkey,
  moveLauncherCategoryIndex,
  moveLauncherRootIndex,
  openLauncherCategory,
} from './launcher';

describe('launcher helpers', () => {
  it('opens MENU on the current category for each mode', () => {
    expect(
      createLauncherStateForMode('matrix', 'calculate', DEFAULT_LAUNCHER_CATEGORIES),
    ).toMatchObject({
      surface: 'launcher',
      level: 'root',
      rootSelectedIndex: 1,
    });

    expect(
      createLauncherStateForMode('advancedCalculus', 'calculate', DEFAULT_LAUNCHER_CATEGORIES),
    ).toMatchObject({
      rootSelectedIndex: 2,
    });

    expect(
      createLauncherStateForMode('statistics', 'calculate', DEFAULT_LAUNCHER_CATEGORIES),
    ).toMatchObject({
      rootSelectedIndex: 4,
    });
  });

  it('uses the previous non-guide mode when opening MENU from Guide', () => {
    expect(
      createLauncherStateForMode('guide', 'geometry', DEFAULT_LAUNCHER_CATEGORIES),
    ).toMatchObject({
      rootSelectedIndex: 3,
    });
  });

  it('selects categories and apps by hotkey', () => {
    const dataCategory = getLauncherCategoryByHotkey(DEFAULT_LAUNCHER_CATEGORIES, '5');
    expect(dataCategory?.id).toBe('data');
    expect(getLauncherCategoryAtIndex(DEFAULT_LAUNCHER_CATEGORIES, 3)?.id).toBe('shapeMath');

    expect(getLauncherAppAtIndex(dataCategory, 0)?.id).toBe('statistics');
    expect(getLauncherAppByHotkey(dataCategory, '1')?.id).toBe('statistics');
  });

  it('moves within root and category bounds', () => {
    expect(moveLauncherRootIndex(0, -1, DEFAULT_LAUNCHER_CATEGORIES)).toBe(0);
    expect(moveLauncherRootIndex(1, 2, DEFAULT_LAUNCHER_CATEGORIES)).toBe(3);
    expect(moveLauncherRootIndex(4, 1, DEFAULT_LAUNCHER_CATEGORIES)).toBe(4);

    const shapeMath = DEFAULT_LAUNCHER_CATEGORIES[3];
    expect(moveLauncherCategoryIndex(0, -1, shapeMath)).toBe(0);
    expect(moveLauncherCategoryIndex(0, 1, shapeMath)).toBe(1);
    expect(moveLauncherCategoryIndex(1, 1, shapeMath)).toBe(1);
  });

  it('opens a category submenu with its first app selected', () => {
    expect(openLauncherCategory('shapeMath', DEFAULT_LAUNCHER_CATEGORIES)).toMatchObject({
      surface: 'launcher',
      level: 'category',
      rootSelectedIndex: 3,
      categoryId: 'shapeMath',
      categorySelectedIndex: 0,
    });
  });
});
