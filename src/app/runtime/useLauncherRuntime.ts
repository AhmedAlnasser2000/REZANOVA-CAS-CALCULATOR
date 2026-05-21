import { useEffect, useMemo, useState } from 'react';
import {
  createLauncherCategories,
  createLauncherStateForMode,
  ensureLauncherLabsCategory,
  getLauncherAppAtIndex,
  getLauncherAppByHotkey,
  getLauncherCategoryAtIndex,
  getLauncherCategoryByHotkey,
  moveLauncherCategoryIndex,
  moveLauncherRootIndex,
  openLauncherCategory,
} from '../../lib/navigation/launcher';
import { loadLauncherCategories } from '../../lib/app-state/tauri';
import type {
  CalculateScreen,
  LauncherAppEntry,
  LauncherCategory,
  LauncherLeafId,
  LauncherState,
  ModeId,
} from '../../types/calculator';

type UseLauncherRuntimeOptions = {
  calculateScreen: CalculateScreen;
  currentMode: ModeId;
  labsEnabled: boolean;
  onCloseHistoryPanel: () => void;
  onLaunchApp: (entry: LauncherAppEntry) => void;
  previousNonGuideMode: Exclude<ModeId, 'guide'>;
};

export function useLauncherRuntime({
  calculateScreen,
  currentMode,
  labsEnabled,
  onCloseHistoryPanel,
  onLaunchApp,
  previousNonGuideMode,
}: UseLauncherRuntimeOptions) {
  const initialLauncherCategories = useMemo(
    () => createLauncherCategories({ labsEnabled }),
    [labsEnabled],
  );
  const [launcherCategories, setLauncherCategories] = useState<LauncherCategory[]>(initialLauncherCategories);
  const [launcherState, setLauncherState] = useState<LauncherState>({
    surface: 'app',
    level: 'root',
    rootSelectedIndex: 0,
    categoryId: null,
    categorySelectedIndex: 0,
  });

  const isLauncherOpen = launcherState.surface === 'launcher';
  const activeLauncherLeafId: LauncherLeafId =
    currentMode === 'calculate' && calculateScreen !== 'standard'
      ? 'calculus'
      : currentMode === 'guide'
        ? previousNonGuideMode === 'calculate' ? 'calculate' : previousNonGuideMode
        : currentMode;
  const selectedLauncherCategory = getLauncherCategoryAtIndex(
    launcherCategories,
    launcherState.rootSelectedIndex,
  );
  const activeLauncherCategory =
    launcherState.level === 'category'
      ? launcherCategories.find((category) => category.id === launcherState.categoryId)
      : selectedLauncherCategory;
  const selectedLauncherApp = activeLauncherCategory
    ? getLauncherAppAtIndex(activeLauncherCategory, launcherState.categorySelectedIndex)
    : undefined;

  useEffect(() => {
    let cancelled = false;

    void loadLauncherCategories()
      .then((loadedLauncherCategories) => {
        if (!cancelled) {
          setLauncherCategories(ensureLauncherLabsCategory(loadedLauncherCategories, { labsEnabled }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [labsEnabled]);

  function openLauncher() {
    onCloseHistoryPanel();
    setLauncherState(
      createLauncherStateForMode(
        currentMode,
        previousNonGuideMode,
        launcherCategories,
        activeLauncherLeafId,
      ),
    );
  }

  function closeLauncher() {
    setLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      surface: 'app',
    }));
  }

  function openLauncherCategoryById(categoryId: LauncherCategory['id'], preferredLeafId?: LauncherLeafId) {
    setLauncherState(openLauncherCategory(categoryId, launcherCategories, preferredLeafId));
  }

  function launchLauncherApp(entry: LauncherAppEntry) {
    closeLauncher();
    onLaunchApp(entry);
  }

  function openSelectedLauncherEntry() {
    if (launcherState.level === 'root') {
      if (!selectedLauncherCategory) {
        return;
      }

      openLauncherCategoryById(selectedLauncherCategory.id, activeLauncherLeafId);
      return;
    }

    if (!selectedLauncherApp) {
      return;
    }

    launchLauncherApp(selectedLauncherApp);
  }

  function goBackInLauncher() {
    if (launcherState.level === 'category') {
      setLauncherState((currentLauncherState) => ({
        ...currentLauncherState,
        level: 'root',
        categoryId: null,
        categorySelectedIndex: 0,
      }));
      return;
    }

    closeLauncher();
  }

  function moveCurrentLauncherSelection(delta: number) {
    setLauncherState((currentLauncherState) => currentLauncherState.level === 'root'
      ? {
        ...currentLauncherState,
        rootSelectedIndex: moveLauncherRootIndex(
          currentLauncherState.rootSelectedIndex,
          delta,
          launcherCategories,
        ),
      }
      : {
        ...currentLauncherState,
        categorySelectedIndex: moveLauncherCategoryIndex(
          currentLauncherState.categorySelectedIndex,
          delta,
          activeLauncherCategory,
        ),
      });
  }

  function openLauncherDigit(digit: string) {
    if (launcherState.level === 'root') {
      const category = getLauncherCategoryByHotkey(launcherCategories, digit);
      if (category) {
        openLauncherCategoryById(category.id, activeLauncherLeafId);
      }
      return;
    }

    if (activeLauncherCategory) {
      const entry = getLauncherAppByHotkey(activeLauncherCategory, digit);
      if (entry) {
        launchLauncherApp(entry);
      }
    }
  }

  return {
    activeLauncherCategory,
    activeLauncherLeafId,
    closeLauncher,
    goBackInLauncher,
    isLauncherOpen,
    launchLauncherApp,
    launcherCategories,
    launcherState,
    moveCurrentLauncherSelection,
    openLauncher,
    openLauncherCategoryById,
    openLauncherDigit,
    openSelectedLauncherEntry,
    selectedLauncherApp,
    selectedLauncherCategory,
    setLauncherState,
  };
}
