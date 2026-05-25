import type {
  AdvancedCalcScreen,
  CalculateScreen,
  EquationMenuEntry,
  EquationScreen,
  GeometryScreen,
  GuideExample,
  GuideRoute,
  LauncherAppEntry,
  LauncherCategory,
  LauncherLeafId,
  LauncherState,
  ModeId,
  StatisticsScreen,
  TrigScreen,
} from '../../types/calculator';
import {
  getAdvancedCalcMenuEntryByHotkey,
  getAdvancedCalcParentScreen,
} from '../../lib/advanced-calc/navigation';
import {
  getCalculateMenuEntryByHotkey,
  getCalculateParentScreen,
} from '../../lib/modes/calculate-navigation';
import {
  getEquationMenuEntryByHotkey,
  getEquationParentScreen,
  isEquationMenuScreen,
  isPolynomialEquationScreen,
  isSimultaneousEquationScreen,
} from '../../lib/equation/equation-navigation';
import {
  getGeometryMenuEntryByHotkey,
  getGeometryParentScreen,
} from '../../lib/geometry/navigation';
import type { GuideListEntry } from '../../lib/guide/navigation';
import { getGuideParentRoute } from '../../lib/guide/navigation';
import {
  getLauncherAppByHotkey,
  getLauncherCategoryByHotkey,
} from '../../lib/navigation/launcher';
import type { SoftAction } from '../../lib/navigation/menu';
import {
  getStatisticsMenuEntryByHotkey,
  getStatisticsParentScreen,
} from '../../lib/statistics/navigation';
import {
  getTrigMenuEntryByHotkey,
  getTrigParentScreen,
} from '../../lib/trigonometry/navigation';
import { isAnyFormTarget, isPlainFormTarget } from './appUtils';

type WindowKeyRouterDeps = {
  event: KeyboardEvent;
  activeSoftMenu: SoftAction[];
  isLauncherOpen: boolean;
  launcherState: LauncherState;
  launcherCategories: LauncherCategory[];
  activeLauncherLeafId: LauncherLeafId;
  activeLauncherCategory: LauncherCategory | undefined;
  currentMode: ModeId;
  showModeTabs: boolean;
  settingsOpen: boolean;
  historyOpen: boolean;
  variablesOpen?: boolean;
  guideRoute: GuideRoute;
  guideListEntries: GuideListEntry[];
  selectedGuideExample: GuideExample | undefined;
  equationScreen: EquationScreen;
  equationMenuEntries: EquationMenuEntry[];
  calculateScreen: CalculateScreen;
  isCalculateMenuOpen: boolean;
  isCalculateToolOpen: boolean;
  advancedCalcScreen: AdvancedCalcScreen;
  isAdvancedCalcMenuOpen: boolean;
  statisticsScreen: StatisticsScreen;
  isStatisticsMenuOpen: boolean;
  isStatisticsDraftFocused: (target?: EventTarget | null) => boolean;
  trigScreen: TrigScreen;
  isTrigMenuOpen: boolean;
  isTrigDraftFocused: (target?: EventTarget | null) => boolean;
  geometryScreen: GeometryScreen;
  isGeometryMenuOpen: boolean;
  isGeometryDraftFocused: (target?: EventTarget | null) => boolean;
  openGuideHome: () => void;
  toggleSettingsPanel: () => void;
  handleSoftAction: (actionId: string) => void;
  goBackInLauncher: () => void;
  openSelectedLauncherEntry: () => void;
  openLauncherCategoryById: (categoryId: LauncherCategory['id'], preferredLeafId?: LauncherLeafId) => void;
  launchLauncherApp: (entry: LauncherAppEntry) => void;
  closeLauncher: () => void;
  moveCurrentLauncherSelection: (delta: number) => void;
  closeSettingsPanel: () => void;
  closeHistoryPanel: () => void;
  closeVariablesPanel?: () => void;
  openGuideRoute: (route: GuideRoute) => void;
  openSelectedGuideEntry: () => void;
  openLauncher: () => void;
  openEquationScreen: (screen: EquationScreen) => void;
  openCalculateScreen: (screen: CalculateScreen) => void;
  openStatisticsScreen: (screen: StatisticsScreen) => void;
  openTrigScreen: (screen: TrigScreen) => void;
  openGeometryScreen: (screen: GeometryScreen) => void;
  openAdvancedCalcScreen: (screen: AdvancedCalcScreen) => void;
  setMode: (mode: ModeId) => void;
  moveCurrentAdvancedCalcMenuSelection: (delta: number) => void;
  openSelectedAdvancedCalcMenuEntry: () => void;
  moveCurrentTrigMenuSelection: (delta: number) => void;
  openSelectedTrigMenuEntry: () => void;
  moveCurrentStatisticsMenuSelection: (delta: number) => void;
  openSelectedStatisticsMenuEntry: () => void;
  moveCurrentGeometryMenuSelection: (delta: number) => void;
  openSelectedGeometryMenuEntry: () => void;
  moveCurrentGuideSelection: (delta: number) => void;
  launchGuideExample: (example: GuideExample | undefined) => void;
  moveCurrentCalculateMenuSelection: (delta: number) => void;
  openSelectedCalculateMenuEntry: () => void;
  moveCurrentEquationMenuSelection: (delta: number) => void;
  openSelectedEquationMenuEntry: () => void;
  executePrimaryAction: () => void;
  insertLatex: (latex: string) => void;
};

export function handleWindowKeydownWithDeps(deps: WindowKeyRouterDeps) {
  const {
    event,
    activeSoftMenu,
    isLauncherOpen,
    launcherState,
    launcherCategories,
    activeLauncherLeafId,
    activeLauncherCategory,
    currentMode,
    showModeTabs,
    settingsOpen,
    historyOpen,
    variablesOpen,
    guideRoute,
    guideListEntries,
    selectedGuideExample,
    equationScreen,
    equationMenuEntries,
    calculateScreen,
    isCalculateMenuOpen,
    isCalculateToolOpen,
    advancedCalcScreen,
    isAdvancedCalcMenuOpen,
    statisticsScreen,
    isStatisticsMenuOpen,
    isStatisticsDraftFocused,
    trigScreen,
    isTrigMenuOpen,
    isTrigDraftFocused,
    geometryScreen,
    isGeometryMenuOpen,
    isGeometryDraftFocused,
    openGuideHome,
    toggleSettingsPanel,
    handleSoftAction,
    goBackInLauncher,
    openSelectedLauncherEntry,
    openLauncherCategoryById,
    launchLauncherApp,
    closeLauncher,
    moveCurrentLauncherSelection,
    closeSettingsPanel,
    closeHistoryPanel,
    closeVariablesPanel,
    openGuideRoute,
    openSelectedGuideEntry,
    openLauncher,
    openEquationScreen,
    openCalculateScreen,
    openStatisticsScreen,
    openTrigScreen,
    openGeometryScreen,
    openAdvancedCalcScreen,
    setMode,
    moveCurrentAdvancedCalcMenuSelection,
    openSelectedAdvancedCalcMenuEntry,
    moveCurrentTrigMenuSelection,
    openSelectedTrigMenuEntry,
    moveCurrentStatisticsMenuSelection,
    openSelectedStatisticsMenuEntry,
    moveCurrentGeometryMenuSelection,
    openSelectedGeometryMenuEntry,
    moveCurrentGuideSelection,
    launchGuideExample,
    moveCurrentCalculateMenuSelection,
    openSelectedCalculateMenuEntry,
    moveCurrentEquationMenuSelection,
    openSelectedEquationMenuEntry,
    executePrimaryAction,
    insertLatex,
  } = deps;
  const plainFormTarget = isPlainFormTarget(event.target);

  if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'g') {
    openGuideHome();
    event.preventDefault();
    return;
  }

  if (event.ctrlKey && !event.shiftKey && event.key === ',') {
    toggleSettingsPanel();
    event.preventDefault();
    return;
  }

  if (isLauncherOpen) {
    if (!plainFormTarget && event.key.startsWith('F')) {
      const action = activeSoftMenu.find((item) => item.hotkey === event.key);
      if (action) {
        handleSoftAction(action.id);
        event.preventDefault();
        return;
      }
    }

    if (!plainFormTarget && event.key === 'Escape') {
      goBackInLauncher();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'Enter') {
      openSelectedLauncherEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && /^\d$/.test(event.key)) {
      if (launcherState.level === 'root') {
        const category = getLauncherCategoryByHotkey(launcherCategories, event.key);
        if (category) {
          openLauncherCategoryById(category.id, activeLauncherLeafId);
          event.preventDefault();
        }
      } else if (activeLauncherCategory) {
        const entry = getLauncherAppByHotkey(activeLauncherCategory, event.key);
        if (entry) {
          launchLauncherApp(entry);
          event.preventDefault();
        }
      }
      return;
    }

    if (!plainFormTarget && event.key === 'F5') {
      goBackInLauncher();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'F6') {
      closeLauncher();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) {
      moveCurrentLauncherSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && (event.key === 'ArrowDown' || event.key === 'ArrowRight')) {
      moveCurrentLauncherSelection(1);
      event.preventDefault();
      return;
    }

    return;
  }

  if (event.key === 'Escape') {
    if (settingsOpen) {
      closeSettingsPanel();
      return;
    }

    if (historyOpen) {
      closeHistoryPanel();
      return;
    }

    if (variablesOpen) {
      closeVariablesPanel?.();
      return;
    }

    if (currentMode === 'guide') {
      const parentRoute = getGuideParentRoute(guideRoute);
      if (parentRoute) {
        openGuideRoute(parentRoute);
      } else {
        openLauncher();
      }
    } else if (currentMode === 'equation' && isEquationMenuScreen(equationScreen)) {
      const parentScreen = getEquationParentScreen(equationScreen);
      if (parentScreen) {
        openEquationScreen(parentScreen);
      } else {
        openLauncher();
      }
    } else if (
      currentMode === 'equation'
      && !isAnyFormTarget(event.target)
      && equationScreen === 'symbolic'
    ) {
      openEquationScreen('home');
    } else if (currentMode === 'equation' && isPolynomialEquationScreen(equationScreen)) {
      openEquationScreen('polynomialMenu');
    } else if (currentMode === 'equation' && isSimultaneousEquationScreen(equationScreen)) {
      openEquationScreen('simultaneousMenu');
    } else if (currentMode === 'calculate' && calculateScreen !== 'standard') {
      const parentScreen = getCalculateParentScreen(calculateScreen);
      if (parentScreen) {
        openCalculateScreen(parentScreen);
      }
    } else if (currentMode === 'statistics') {
      const parentScreen = getStatisticsParentScreen(statisticsScreen);
      if (parentScreen) {
        openStatisticsScreen(parentScreen);
      } else {
        openLauncher();
      }
    } else if (currentMode === 'trigonometry') {
      const parentScreen = getTrigParentScreen(trigScreen);
      if (parentScreen) {
        openTrigScreen(parentScreen);
      } else {
        openLauncher();
      }
    } else if (currentMode === 'geometry') {
      const parentScreen = getGeometryParentScreen(geometryScreen);
      if (parentScreen) {
        openGeometryScreen(parentScreen);
      } else {
        openLauncher();
      }
    } else if (currentMode === 'advancedCalculus') {
      const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
      if (parentScreen) {
        openAdvancedCalcScreen(parentScreen);
      } else {
        openLauncher();
      }
    }
    return;
  }

  if (!plainFormTarget && showModeTabs && event.ctrlKey) {
    if (event.shiftKey && event.key === '1') {
      openStatisticsScreen('home');
      setMode('statistics');
      event.preventDefault();
      return;
    }

    if (event.shiftKey && event.key === '2') {
      openGeometryScreen('home');
      setMode('geometry');
      event.preventDefault();
      return;
    }

    const modeShortcutMap: Partial<Record<string, ModeId>> = {
      1: 'calculate',
      2: 'equation',
      3: 'matrix',
      4: 'vector',
      5: 'table',
      6: 'guide',
      8: 'advancedCalculus',
      9: 'trigonometry',
    };
    const targetMode = modeShortcutMap[event.key];
    if (targetMode) {
      if (targetMode === 'guide') {
        openGuideRoute({ screen: 'home' });
      }
      if (targetMode === 'advancedCalculus') {
        openAdvancedCalcScreen('home');
      }
      if (targetMode === 'trigonometry') {
        openTrigScreen('home');
      }
      if (targetMode === 'statistics') {
        openStatisticsScreen('home');
      }
      if (targetMode === 'geometry') {
        openGeometryScreen('home');
      }
      setMode(targetMode);
      event.preventDefault();
      return;
    }
  }

  if (currentMode === 'advancedCalculus' && isAdvancedCalcMenuOpen) {
    if (!plainFormTarget && event.key === 'Enter') {
      openSelectedAdvancedCalcMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowUp') {
      moveCurrentAdvancedCalcMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowDown') {
      moveCurrentAdvancedCalcMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && /^\d$/.test(event.key)) {
      const entry = getAdvancedCalcMenuEntryByHotkey(advancedCalcScreen, event.key);
      if (entry) {
        openAdvancedCalcScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (currentMode === 'trigonometry' && isTrigMenuOpen) {
    if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'Enter') {
      openSelectedTrigMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'ArrowUp') {
      moveCurrentTrigMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'ArrowDown') {
      moveCurrentTrigMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isTrigDraftFocused(event.target) && /^[1-6]$/.test(event.key)) {
      const entry = getTrigMenuEntryByHotkey(trigScreen, event.key);
      if (entry) {
        openTrigScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (currentMode === 'statistics' && isStatisticsMenuOpen) {
    if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'Enter') {
      openSelectedStatisticsMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'ArrowUp') {
      moveCurrentStatisticsMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'ArrowDown') {
      moveCurrentStatisticsMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && /^\d$/.test(event.key)) {
      const entry = getStatisticsMenuEntryByHotkey(statisticsScreen, event.key);
      if (entry) {
        openStatisticsScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (currentMode === 'geometry' && isGeometryMenuOpen && !isGeometryDraftFocused(event.target)) {
    if (!plainFormTarget && event.key === 'Enter') {
      openSelectedGeometryMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowUp') {
      moveCurrentGeometryMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowDown') {
      moveCurrentGeometryMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && /^\d$/.test(event.key)) {
      const entry = getGeometryMenuEntryByHotkey(geometryScreen, event.key);
      if (entry) {
        openGeometryScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (
    currentMode === 'geometry'
    && !isGeometryMenuOpen
    && event.key === 'Enter'
  ) {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (
    currentMode === 'trigonometry'
    && !isTrigMenuOpen
    && event.key === 'Enter'
  ) {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (
    currentMode === 'statistics'
    && !isStatisticsMenuOpen
    && event.key === 'Enter'
  ) {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (
    currentMode === 'advancedCalculus'
    && !isAdvancedCalcMenuOpen
    && event.key === 'Enter'
  ) {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (currentMode === 'guide') {
    if (!plainFormTarget && guideRoute.screen !== 'article' && event.key === 'Enter') {
      openSelectedGuideEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && guideRoute.screen === 'article' && event.key === 'Enter') {
      launchGuideExample(selectedGuideExample);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowUp') {
      moveCurrentGuideSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowDown') {
      moveCurrentGuideSelection(1);
      event.preventDefault();
      return;
    }

    if (
      !plainFormTarget
      && (guideRoute.screen === 'home' || guideRoute.screen === 'domain' || guideRoute.screen === 'modeGuide')
      && /^\d$/.test(event.key)
    ) {
      const matchedEntry = guideListEntries.find((entry) => entry.hotkey === event.key);
      if (matchedEntry) {
        openGuideRoute(matchedEntry.route);
        event.preventDefault();
      }
      return;
    }
  }
  if (!plainFormTarget && event.key.startsWith('F')) {
    const action = activeSoftMenu.find((item) => item.hotkey === event.key);
    if (action) {
      handleSoftAction(action.id);
      event.preventDefault();
      return;
    }
  }

  if (currentMode === 'calculate' && isCalculateMenuOpen) {
    if (!plainFormTarget && event.key === 'Enter') {
      openSelectedCalculateMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowUp') {
      moveCurrentCalculateMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowDown') {
      moveCurrentCalculateMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && /^[1-4]$/.test(event.key)) {
      const entry = getCalculateMenuEntryByHotkey(event.key);
      if (entry) {
        openCalculateScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (
    currentMode === 'calculate'
    && isCalculateToolOpen
    && event.key === 'Enter'
  ) {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (currentMode === 'equation' && isEquationMenuScreen(equationScreen)) {
    if (!plainFormTarget && event.key === 'Enter') {
      openSelectedEquationMenuEntry();
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowUp') {
      moveCurrentEquationMenuSelection(-1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && event.key === 'ArrowDown') {
      moveCurrentEquationMenuSelection(1);
      event.preventDefault();
      return;
    }

    if (!plainFormTarget && /^[1-3]$/.test(event.key)) {
      const entry = getEquationMenuEntryByHotkey(equationMenuEntries, event.key);
      if (entry) {
        openEquationScreen(entry.target);
        event.preventDefault();
      }
      return;
    }
  }

  if (!plainFormTarget && event.key === 'Enter') {
    executePrimaryAction();
    event.preventDefault();
    return;
  }

  if (isAnyFormTarget(event.target)) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    insertLatex(event.key);
    event.preventDefault();
    return;
  }

  const map: Record<string, string> = {
    '+': '+',
    '-': '-',
    '*': '\\times',
    '/': '\\div',
    '^': '^{#0}',
    '=': '=',
    '(': '(',
    ')': ')',
    '.': '.',
    ',': ',',
    x: 'x',
  };
  if (map[event.key]) {
    insertLatex(map[event.key]);
    event.preventDefault();
  }
}
