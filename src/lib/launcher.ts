import type {
  LauncherAppEntry,
  LauncherCategory,
  LauncherCategoryId,
  LauncherLeafId,
  LauncherState,
  ModeId,
} from '../types/calculator';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../types/calculator';
import type { SoftAction } from './menu';

export const LAUNCHER_SOFT_ACTIONS: SoftAction[] = [
  { id: 'open', label: 'Open', hotkey: 'F1' },
  { id: 'cancel', label: 'Cancel', hotkey: 'F6' },
];

function categoryForLeafId(id: LauncherLeafId): LauncherCategoryId {
  switch (id) {
    case 'calculate':
    case 'equation':
    case 'table':
      return 'core';
    case 'matrix':
    case 'vector':
      return 'linear';
    case 'calculus':
    case 'advancedCalculus':
      return 'calculus';
    case 'trigonometry':
    case 'geometry':
      return 'shapeMath';
    case 'statistics':
      return 'data';
    default:
      return 'core';
  }
}

export function categoryForMode(
  mode: ModeId,
  previousNonGuideMode: Exclude<ModeId, 'guide'>,
): LauncherCategoryId {
  if (mode === 'guide') {
    return categoryForMode(previousNonGuideMode, previousNonGuideMode);
  }

  switch (mode) {
    case 'calculate':
    case 'equation':
    case 'table':
      return 'core';
    case 'matrix':
    case 'vector':
      return 'linear';
    case 'advancedCalculus':
      return 'calculus';
    case 'trigonometry':
    case 'geometry':
      return 'shapeMath';
    case 'statistics':
      return 'data';
    default:
      return 'core';
  }
}

export function clampLauncherRootIndex(index: number, categoryCount: number) {
  if (categoryCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), categoryCount - 1);
}

export function clampLauncherCategoryIndex(index: number, entryCount: number) {
  if (entryCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), entryCount - 1);
}

export function moveLauncherRootIndex(
  currentIndex: number,
  delta: number,
  categoriesOrCount: LauncherCategory[] | number,
) {
  const categoryCount = Array.isArray(categoriesOrCount)
    ? categoriesOrCount.length
    : categoriesOrCount;
  return clampLauncherRootIndex(currentIndex + delta, categoryCount);
}

export function moveLauncherCategoryIndex(
  currentIndex: number,
  delta: number,
  categoryOrCount: LauncherCategory | number | undefined,
) {
  const entryCount = typeof categoryOrCount === 'number'
    ? categoryOrCount
    : categoryOrCount?.entries.length ?? 0;
  return clampLauncherCategoryIndex(currentIndex + delta, entryCount);
}

export function launcherRootIndexForCategory(
  id: LauncherCategoryId,
  categories: LauncherCategory[] = DEFAULT_LAUNCHER_CATEGORIES,
) {
  const index = categories.findIndex((category) => category.id === id);
  return index >= 0 ? index : 0;
}

export function launcherCategoryIndexForLeafId(
  id: LauncherLeafId,
  category: LauncherCategory,
) {
  const index = category.entries.findIndex((entry) => entry.id === id);
  return index >= 0 ? index : 0;
}

export function getLauncherCategoryAtIndex(
  categories: LauncherCategory[],
  index: number,
) {
  if (categories.length === 0) {
    return undefined;
  }

  return categories[clampLauncherRootIndex(index, categories.length)];
}

export function getLauncherCategoryByHotkey(
  categories: LauncherCategory[],
  hotkey: string,
) {
  return categories.find((category) => category.hotkey === hotkey);
}

export function getLauncherAppAtIndex(
  category: LauncherCategory | undefined,
  index: number,
) {
  if (!category || category.entries.length === 0) {
    return undefined;
  }

  return category.entries[clampLauncherCategoryIndex(index, category.entries.length)];
}

export function getLauncherAppByHotkey(
  category: LauncherCategory | undefined,
  hotkey: string,
) {
  return category?.entries.find((entry) => entry.hotkey === hotkey);
}

export function createLauncherStateForMode(
  mode: ModeId,
  previousNonGuideMode: Exclude<ModeId, 'guide'>,
  categories: LauncherCategory[] = DEFAULT_LAUNCHER_CATEGORIES,
  preferredLeafId?: LauncherLeafId,
): LauncherState {
  const categoryId = preferredLeafId
    ? categoryForLeafId(preferredLeafId)
    : categoryForMode(mode, previousNonGuideMode);
  const rootSelectedIndex = launcherRootIndexForCategory(categoryId, categories);
  const category = categories[rootSelectedIndex];
  const categorySelectedIndex = preferredLeafId && category
    ? launcherCategoryIndexForLeafId(preferredLeafId, category)
    : 0;

  return {
    surface: 'launcher',
    level: 'root',
    rootSelectedIndex,
    categoryId: null,
    categorySelectedIndex,
  };
}

export function createLauncherStateForLeafId(
  id: LauncherLeafId,
  categories: LauncherCategory[] = DEFAULT_LAUNCHER_CATEGORIES,
): LauncherState {
  return createLauncherStateForMode('calculate', 'calculate', categories, id);
}

export function openLauncherCategory(
  categoryId: LauncherCategoryId,
  categories: LauncherCategory[] = DEFAULT_LAUNCHER_CATEGORIES,
  preferredLeafId?: LauncherLeafId,
): LauncherState {
  const rootSelectedIndex = launcherRootIndexForCategory(categoryId, categories);
  const category = categories[rootSelectedIndex];

  return {
    surface: 'launcher',
    level: 'category',
    rootSelectedIndex,
    categoryId,
    categorySelectedIndex: preferredLeafId && category
      ? launcherCategoryIndexForLeafId(preferredLeafId, category)
      : 0,
  };
}

export type { LauncherAppEntry };
