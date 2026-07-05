import {
  lazy, Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { flushSync } from 'react-dom';
import type { MathfieldElement } from 'mathlive';
import { MathNotationProvider } from './components/MathNotationContext';
import { LanguageProvider } from './lib/language/language-context';
import { CalculateWorkspace } from './app/workspaces/CalculateWorkspace';
import { ActiveSurfaceHost } from './app/shell/ActiveSurfaceHost';
import { CompartmentErrorBoundary } from './app/shell/CompartmentErrorBoundary';
import { DisplayPanel } from './app/shell/DisplayPanel';
import { formulaViewerSourceContextForWorkspaceInstance } from './app/runtime/formula-viewer-source-context';
import { KeypadPanel } from './app/shell/KeypadPanel';
import { LauncherWorkspace } from './app/shell/LauncherWorkspace';
import { MenuInspectorPanel } from './app/shell/MenuInspectorPanel';
import { ModeStrip } from './app/shell/ModeStrip';
import { SideSurfaceHost } from './app/shell/SideSurfaceHost';
import { SoftMenu } from './app/shell/SoftMenu';
import { WorkspaceTabs } from './app/shell/WorkspaceTabs';
import {
  GUIDE_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  SETTINGS_PAGE_WORKSPACE_KIND,
} from './app/runtime/app-page-workspaces';
import { useQuickInspectorPolicy } from './app/runtime/useQuickInspectorPolicy';
import { resolveWorkspaceCompartment } from './app/shell/workspaceCompartment';
import {
  useSideSurfaceRuntime,
  type SideSurfacePresentation,
} from './app/runtime/useSideSurfaceRuntime';
import {
  useAppPersistenceDirtySignal,
  useAppPersistenceRuntime,
} from './app/runtime/useAppPersistenceRuntime';
import { useHistoryDisplayRuntime } from './app/runtime/useHistoryDisplayRuntime';
import { useLauncherRuntime } from './app/runtime/useLauncherRuntime';
import { useShellFocusRuntime } from './app/runtime/useShellFocusRuntime';
import { useActiveWorkspaceRuntimeStatus } from './app/runtime/useActiveWorkspaceRuntimeStatus';
import { useWorkspaceInstancesRuntime, useWorkspaceRuntimeContextGetters } from './app/runtime/useWorkspaceInstancesRuntime';
import { useWorkspaceTabsShellRuntime } from './app/runtime/useWorkspaceTabsShellRuntime';
import {
  USER_VISIBLE_OOE_TICKET_CAPABILITY_IDS,
  useDisplayRuntimeStatus,
} from './app/runtime/useDisplayRuntimeStatus';
import { useLinearAlgebraTableShellRuntime } from './app/runtime/useLinearAlgebraTableShellRuntime';
import { useLabsRuntime } from './app/runtime/useLabsRuntime';
import { useTrigonometryRuntime } from './app/runtime/useTrigonometryRuntime';
import { useStatisticsRuntime } from './app/runtime/useStatisticsRuntime';
import { useGeometryRuntime } from './app/runtime/useGeometryRuntime';
import { useGuideRuntime } from './app/runtime/useGuideRuntime';
import { useCalculusRuntime } from './app/runtime/useCalculusRuntime';
import { useCalculateRuntime } from './app/runtime/useCalculateRuntime';
import { useEquationRuntime } from './app/runtime/useEquationRuntime';
import {
  blurLatexEditorTarget,
  executeLatexEditorCommand,
  insertLatexIntoEditor,
} from './app/runtime/editorTargets';
import { EditorAnalysisControlProvider } from './lib/editor/editor-analysis-control-provider';
import { EDITOR_ANALYSIS_MAX_LATEX_LENGTH } from './lib/editor/editor-analysis-runtime';
import { useEditorAnalysis } from './lib/editor/use-editor-analysis';
import { useAsyncEditorAnalysis } from './lib/editor/use-async-editor-analysis';
import {
  getCalculusMenuEntryByHotkey,
  getCalculusSoftActions,
} from './lib/calculus/workspace/navigation';
import {
  canonicalizeMathInput,
  trimHarmlessTrailingMathSpacing,
} from './lib/input/input-canonicalization';
import {
  getGeometryMenuEntryByHotkey,
  getGeometryParentScreen,
  getGeometrySoftActions,
} from './lib/geometry/navigation';
import { getCalculusProvenanceBadge } from './lib/calculus/workspace/ui';
import { buildStarterLimitPiecewiseRequest } from './lib/calculus/limit-piecewise-row-editor';
import {
  getCalculusDerivativeStrategyBadges,
  getCalculusStrategyBadge,
} from './lib/calculus/calculus-strategy';
import {
  isCalculusMode,
  mapLegacyCalculateScreenToCalculusScreen,
} from './lib/calculus/calculus-identity';
import { setNumericOutputSettings } from './lib/display/numeric-output';
import {
  getCalculateSoftActions,
} from './lib/modes/calculate-navigation';
import type { AlgebraTransformAction } from './lib/algebra/algebra-transform-ui';
import { getEquationAlgebraActionLabel } from './lib/modes/equation';
import { copyableGuideExampleLatex } from './lib/guide/examples';
import {
  LAUNCHER_SOFT_ACTIONS,
  createLauncherStateForMode,
  openLauncherCategory,
} from './lib/navigation/launcher';
import {
  KEYPAD_ROWS,
  MODE_LABELS,
  SOFT_MENU_BY_MODE,
  getWorkspaceKeypadRows,
  resolveKeypadButtonForLayer,
  type KeypadButton,
  type KeypadLayer,
} from './lib/navigation/menu';
import {
  getStatisticsMenuEntryByHotkey,
  getStatisticsParentScreen,
  getStatisticsSoftActions,
} from './lib/statistics/navigation';
import {
  getTrigMenuEntryByHotkey,
  getTrigParentScreen,
  getTrigSoftActions,
} from './lib/trigonometry/navigation';
import {
  ACTIVE_MILESTONE_TITLE,
  createKeyboardContext,
} from './lib/virtual-keyboard/capabilities';
import { buildVirtualKeyboardLayouts } from './lib/virtual-keyboard/layouts';
import {
  cycleAngleUnit,
} from './app/logic/appUtils';
import { namedVariableEditorLatex } from './lib/algebra/named-variable';
import { executePrimaryActionWithDeps } from './app/logic/primaryActionRouter';
import { handleSoftActionWithDeps } from './app/logic/softActionRouter';
import { handleKeypadWithDeps } from './app/logic/keypadRouter';
import { handleWindowKeydownWithDeps } from './app/logic/windowKeyRouter';
import { launchWorkspaceEntryFromLauncher } from './app/logic/launcherWorkspaceActions';
import { launchGuideExampleDestination } from './app/logic/guideExampleLaunchActions';
import { createModeGuideOpeners } from './app/logic/modeGuideRouting';
import {
  DEFAULT_SETTINGS,
  type CalculusResultOrigin,
  type CalculusScreen,
  type CalculateScreen,
  type EquationScreen,
  type DisplayOutcomeAction,
  type GuideExample,
  type LauncherAppEntry,
  type LauncherLaunchIntent,
  type ModeId,
  type GeometryScreen,
  type PeriodicFamilyInfo,
  type ResultOrigin,
  type Settings,
  type SettingsPatch,
  type StoredVariableValue,
  type TrigScreen,
  type VariableSubstitutionSnapshot,
} from './types/calculator';
import { formatMathTextForDisplay, getDisplayLatex, latexToVisibleText } from './lib/display/math-notation';

const CalculusWorkspace = lazy(() =>
  import('./app/workspaces/CalculusWorkspace').then((module) => ({
    default: module.CalculusWorkspace,
  })),
);
const EquationWorkspace = lazy(() =>
  import('./app/workspaces/EquationWorkspace').then((module) => ({
    default: module.EquationWorkspace,
  })),
);
const GeometryWorkspace = lazy(() =>
  import('./app/workspaces/GeometryWorkspace').then((module) => ({
    default: module.GeometryWorkspace,
  })),
);
const GuideWorkspace = lazy(() =>
  import('./app/workspaces/GuideWorkspace').then((module) => ({
    default: module.GuideWorkspace,
  })),
);
const LinearAlgebraTableWorkspaceHost = lazy(() =>
  import('./app/workspaces/LinearAlgebraTableWorkspaceHost').then((module) => ({
    default: module.LinearAlgebraTableWorkspaceHost,
  })),
);
const StatisticsWorkspace = lazy(() =>
  import('./app/workspaces/StatisticsWorkspace').then((module) => ({
    default: module.StatisticsWorkspace,
  })),
);
const TrigonometryWorkspace = lazy(() =>
  import('./app/workspaces/TrigonometryWorkspace').then((module) => ({
    default: module.TrigonometryWorkspace,
  })),
);
const LabsPanel = lazy(() =>
  import('./components/LabsPanel').then((module) => ({
    default: module.LabsPanel,
  })),
);
const HistoryPanel = lazy(() =>
  import('./components/HistoryPanel').then((module) => ({
    default: module.HistoryPanel,
  })),
);
const OoeDiagnosticsPanel = lazy(() =>
  import('./components/OoeDiagnosticsPanel').then((module) => ({
    default: module.OoeDiagnosticsPanel,
  })),
);

const SettingsPanel = lazy(() =>
  import('./components/SettingsPanel').then((module) => ({
    default: module.SettingsPanel,
  })),
);
const VariablesPanel = lazy(() =>
  import('./components/VariablesPanel').then((module) => ({
    default: module.VariablesPanel,
  })),
);

function LazyWorkspaceFallback() {
  return (
    <section className="workspace-panel">
      <div className="editor-card">
        <p>Loading workspace...</p>
      </div>
    </section>
  );
}

function LazySideSurfaceFallback() {
  return (
    <div className="side-panel">
      <p>Loading panel...</p>
    </div>
  );
}

function getPeriodicStopReasonText(reason: PeriodicFamilyInfo['structuredStopReason'] | undefined) {
  if (!reason) {
    return '';
  }

  if (reason === 'second-periodic-parameter') {
    return 'Exact closure stops here because the next bounded reduction would introduce a second independent periodic parameter.';
  }
  if (reason === 'multi-parameter-periodic-family') {
    return 'Exact closure stops here because the remaining nested periodic family would require multiple independent periodic parameters.';
  }
  if (reason === 'periodic-depth-cap') {
    return 'Exact closure stops here because this bounded milestone stops after three periodic reduction steps.';
  }
  if (reason === 'unmerged-periodic-branches') {
    return 'Exact closure stops here because the remaining bounded periodic branches could not be merged into one exact family.';
  }
  if (reason === 'outside-principal-range') {
    return 'Exact closure stops here because the remaining branches fall outside the usable principal range.';
  }
  return 'Exact closure stops here because finishing the remaining sawtooth branches would require broader principal-range pruning than this milestone allows.';
}

function getCalculusProvenanceLabel(origin?: ResultOrigin) {
  switch (origin) {
    case 'rule-based-symbolic':
      return 'Rule-based symbolic';
    case 'heuristic-symbolic':
      return 'Heuristic symbolic';
    case 'numeric-fallback':
      return 'Numeric fallback';
    case 'symbolic':
    case 'symbolic-engine':
    case 'compute-engine':
      return 'Symbolic';
    default:
      return undefined;
  }
}

export default function App() {
  const showModeTabs = import.meta.env.DEV && import.meta.env.VITE_SHOW_MODE_TABS === '1';
  const labsEnabled = import.meta.env.DEV && import.meta.env.VITE_SHOW_LABS === '1';
  const ooeDiagnosticsEnabled =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_OOE_DIAGNOSTICS === '1';
  const labsRuntime = useLabsRuntime({ labsEnabled });
  const [currentMode, setCurrentMode] = useState<ModeId>('calculate');
  const workspaceInstancesRuntime = useWorkspaceInstancesRuntime();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [keypadLayer, setKeypadLayer] = useState<KeypadLayer>('base');
  const [keypadMomentaryLayer, setKeypadMomentaryLayer] = useState<KeypadLayer | null>(null);
  const [keypadLayerLocked, setKeypadLayerLocked] = useState(false);
  const effectiveKeypadLayer = keypadMomentaryLayer ?? keypadLayer;
  const [replayVariableSubstitutions, setReplayVariableSubstitutions] =
    useState<{
      mode: ModeId;
      inputLatex: string;
      substitutions: VariableSubstitutionSnapshot[];
    } | null>(null);
  const currentModeRef = useRef<ModeId>('calculate');
  const calculateScreenRef = useRef<CalculateScreen>('standard');
  currentModeRef.current = currentMode;
  const {
    getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstancesForRuntime,
    isWorkspaceInstanceOpenForRuntime,
  } = useWorkspaceRuntimeContextGetters(workspaceInstancesRuntime);
  const [, startTransition] = useTransition();
  const [previousNonGuideMode, setPreviousNonGuideMode] = useState<Exclude<ModeId, 'guide'>>('calculate');
  const restartEditorAnalysisRef = useRef<(() => void) | null>(null);
  const requestEditorRestart = useCallback(() => {
    restartEditorAnalysisRef.current?.();
  }, []);
  const {
    activeRuntimeState: activeWorkspaceRuntimeState,
    clipboardNotice,
    editorAnalysisControl,
    editorAnalysisStopped,
    editorRuntimeStatusOverride,
    lastRuntimeElapsedMs,
    restoreRuntimeState: restoreWorkspaceRuntimeState,
    setClipboardNotice,
    setEditorAnalysisGeneration,
    setEditorAnalysisStopped,
    setEditorRuntimeStatusOverride,
    setLastRuntimeElapsedMs,
  } = useActiveWorkspaceRuntimeStatus({
    activeInstance: workspaceInstancesRuntime.activeInstance,
    restartEditorAnalysis: requestEditorRestart,
    updateInstanceRuntimeState: workspaceInstancesRuntime.updateInstanceRuntimeState,
  });

  const mainFieldRef = useRef<MathfieldElement | null>(null);
  const activeFieldRef = useRef<MathfieldElement | null>(null);
  const guideMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const guideSearchInputRef = useRef<HTMLInputElement | null>(null);
  const appStageRef = useRef<HTMLDivElement | null>(null);
  const calculatorShellRef = useRef<HTMLDivElement | null>(null);
  const openEquationScreenRef = useRef<(screen: EquationScreen) => void>(() => {});
  const openTrigScreenRef = useRef<(screen: TrigScreen) => void>(() => {});
  const openGeometryScreenRef = useRef<(screen: GeometryScreen) => void>(() => {});
  const openCalculusScreenRef = useRef<(screen: CalculusScreen) => void>(() => {});
  const createWorkspaceKindTabRef = useRef<((mode: ModeId) => void) | null>(null);
  const openGuidePageTabRef = useRef<(() => void) | null>(null);
  const openGuidePageTab = useCallback(() => {
    openGuidePageTabRef.current?.();
  }, []);
  const resetCalculateRuntimeRef = useRef<() => void>(() => {});
  const resetCalculusRuntimeRef = useRef<() => void>(() => {});
  const resetEquationRuntimeRef = useRef<() => void>(() => {});
  const resetGeometryRuntimeRef = useRef<() => void>(() => {});
  const resetGuideRuntimeRef = useRef<() => void>(() => {});
  const resetLinearAlgebraTableRuntimeRef = useRef<() => void>(() => {});
  const resetStatisticsRuntimeRef = useRef<() => void>(() => {});
  const resetTrigonometryRuntimeRef = useRef<() => void>(() => {});

  const {
    appFrameStyle,
    calculatorShellStyle,
    closeHistoryPanel,
    closeLeftInspector,
    closeOoeDiagnosticsPanel,
    closeSettingsPanel,
    closeSideSurface,
    closeVariablesPanel,
    historyOpen,
    leftInspectorHostStyle,
    leftInspectorOutboardOpen,
    leftInspectorOverlayOpen,
    leftInspectorSide,
    leftInspectorSurface,
    ooeDiagnosticsOpen,
    openLeftMenuInspector,
    settingsOpen,
    sideSurface,
    sideSurfaceHostStyle,
    sideSurfaceOutboardOpen,
    sideSurfaceOverlayOpen,
    sideSurfacePresentation,
    sideSurfaceSide,
    toggleHistoryPanel: toggleHistoryPanelBase,
    toggleOoeDiagnosticsPanel,
    toggleSettingsPanel,
    toggleVariablesPanel: toggleVariablesPanelBase,
    variablesOpen,
  } = useSideSurfaceRuntime({
    appStageRef,
    calculatorShellRef,
    uiScale: settings.uiScale,
    mathScale: settings.mathScale,
    resultScale: settings.resultScale,
  });
  const quickInspectorPolicy = useQuickInspectorPolicy({
    activeWorkspaceKind: workspaceInstancesRuntime.activeInstance?.workspaceKind ?? null,
    closeLeftInspector,
    closeSideSurface,
    historyOpen,
    leftInspectorOutboardOpen,
    leftInspectorOverlayOpen,
    leftInspectorSurface,
    ooeDiagnosticsOpen,
    settingsOpen,
    sideSurface,
    sideSurfaceOutboardOpen,
    sideSurfaceOverlayOpen,
    variablesOpen,
  });

  const {
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
  } = useLauncherRuntime({
    calculateScreen: calculateScreenRef.current,
    currentMode,
    labsEnabled,
    onCloseHistoryPanel: closeHistoryPanel,
    previousNonGuideMode,
    onLaunchApp: (entry, intent) => launchWorkspaceEntryFromLauncher(entry, intent, {
      clearDisplayOutcome: () => setDisplayOutcome(null),
      clearEquationSolveTarget: () => setEquationSolveTarget(null),
      commitVisibleModeSelection,
      createWorkspaceKindTab: createWorkspaceKindTabRef.current,
      openCalculateScreen,
      openCalculusScreen: openCalculusScreenRef.current,
      openEquationScreen: openEquationScreenRef.current,
      openGeometryScreen: openGeometryScreenRef.current,
      openStatisticsScreen,
      openTrigScreen: openTrigScreenRef.current,
      routeWorkspaceDestination: routeLauncherWorkspaceDestination,
      setMode,
    }),
  });

  const {
    ansLatex,
    buildHistoryDisplayMemoryFragment,
    captureDisplayState,
    commitOutcome,
    deleteHistoryEntryById,
    discardPendingHistoryTicket,
    discardPendingHistoryTicketsForWorkspaceInstance,
    displayOutcome,
    getPendingRuntimeStatus,
    history,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    pendingHistoryTickets,
    replayHistoryEntry,
    replayHistoryEntryInNewTab,
    reservePendingHistoryTicket,
    resetHistory,
    resetHistoryDisplayMemory,
    restoreDisplayState,
    restoreHistoryDisplayMemorySnapshot,
    restoreLoadedHistory,
    setDisplayOutcome,
    stopPendingHistoryTicket,
    stopPendingRuntimeTicket,
  } = useHistoryDisplayRuntime({
    autoSwitchToEquation: settings.autoSwitchToEquation,
    closeHistoryPanel,
    currentCalculusHistoryContext: () => currentCalculusHistoryContext(),
    currentCalculateHistoryContext: () => currentCalculateHistoryContext(),
    getGeometryScreen: () => geometryScreen,
    getReplayVariableSubstitutions: () => replayVariableSubstitutions,
    getStatisticsScreen: () => statisticsScreen,
    getTrigScreen: () => trigScreen,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    historyEnabled: settings.historyEnabled,
    isWorkspaceInstanceOpen: isWorkspaceInstanceOpenForRuntime,
    openCalculusScreen: (screen) => openCalculusScreen(screen),
    restoreCalculateHistoryEntry: (entry) => restoreCalculateHistoryEntry(entry),
    restoreCalculusHistoryEntry: (entry) => restoreCalculusHistoryEntry(entry),
    restoreEquationHistoryEntry: (entry) => restoreEquationHistoryEntry(entry),
    restoreGeometryHistoryEntry: (entry) => restoreGeometryHistoryEntry(entry),
    restoreLinearAlgebraTableHistoryEntry: (entry) => restoreLinearAlgebraTableHistoryEntry(entry),
    restoreStatisticsHistoryEntry: (entry) => restoreStatisticsHistoryEntry(entry),
    restoreTrigHistoryEntry: (entry) => restoreTrigHistoryEntry(entry),
    routeToModeDestination,
    routeToModeDestinationInNewTab,
    setClipboardNotice,
    setLauncherSurfaceApp: () => {
      setLauncherState((currentLauncherState) => ({
        ...currentLauncherState,
        surface: 'app',
      }));
    },
    setMode,
    setReplayVariableSubstitutions,
    setRuntimeElapsedMs: setLastRuntimeElapsedMs,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    switchToEquationWithLatex: (latex) => switchToEquationWithLatex(latex),
    updateWorkspaceInstanceDisplayState: workspaceInstancesRuntime.updateInstanceDisplayState,
    updateWorkspaceInstanceRuntimeState: workspaceInstancesRuntime.updateInstanceRuntimeState,
    applyCalculusSeed: (screen, seed) => applyCalculusSeed(screen, seed),
    clearCalculateReplayVariableSubstitutions: () => clearCalculateReplayVariableSubstitutions(),
  });

  const {
    clearAllStoredVariables,
    clearStoredVariable,
    hydrated,
    markCalculatorMemoryDirty,
    persistModeSelection,
    resetCalculatorMemory,
    runtimeLabel,
    setStoredVariable,
    variableMemory,
  } = useAppPersistenceRuntime({
    buildHistoryDisplayMemoryFragment,
    labsEnabled,
    resetCalculateRuntime: () => resetCalculateRuntimeRef.current(),
    resetCalculusRuntime: () => resetCalculusRuntimeRef.current(),
    resetEquationRuntime: () => resetEquationRuntimeRef.current(),
    resetGeometryRuntime: () => resetGeometryRuntimeRef.current(),
    resetGuideRuntime: () => resetGuideRuntimeRef.current(),
    resetHistoryDisplayMemory,
    resetLinearAlgebraTableRuntime: () => resetLinearAlgebraTableRuntimeRef.current(),
    resetStatisticsRuntime: () => resetStatisticsRuntimeRef.current(),
    resetTrigonometryRuntime: () => resetTrigonometryRuntimeRef.current(),
    restoreHistoryDisplayMemorySnapshot,
    restoreLoadedHistory,
    setClipboardNotice,
    setCurrentMode,
    setPreviousNonGuideMode,
    setSettings,
    settings,
  });

  const calculusRuntime = useCalculusRuntime({
    ansLatex,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    openLauncher,
    replayVariableSubstitutions,
    reserveHistoryTicket: reservePendingHistoryTicket,
    settings,
    setDisplayOutcome,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
    storedVariables: variableMemory,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
  });
  const {
    calculusMenuEntries,
    calculusMenuFooterText,
    calculusMenuSelection,
    calculusRouteMeta,
    calculusMainEditorActive,
    calculusMainEditorLatex,
    calculusMainEditorVariable,
    calculusScreen,
    calculusWorkbenchExpression,
    calculusDefiniteIntegral,
    calculusDefiniteLowerRef,
    calculusFiniteLimit,
    calculusFiniteLimitFieldRef,
    calculusFiniteLimitTargetRef,
    calculusIndefiniteIntegral,
    calculusInfiniteLimit,
    calculusInfiniteLimitFieldRef,
    calculusLimit,
    calculusImproperIntegral,
    calculusImproperLowerRef,
    calculusMenuPanelRef,
    applyCalculusSeed,
    captureCalculusSurfaceState,
    currentCalculusHistoryContext,
    currentCalculusMenuIndex,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    firstOrderOdeLhsFieldRef,
    firstOrderOdeRhsFieldRef,
    firstOrderOdeState,
    goBackInCalculus, implicitDerivativeState,
    isCalculusMenuOpen,
    maclaurinFieldRef,
    maclaurinState,
    moveCurrentCalculusMenuSelection,
    numericIvpFieldRef,
    numericIvpState,
    numericIvpX0Ref,
    openCalculusParentOrHome,
    openCalculusScreen,
    openSelectedCalculusMenuEntry,
    partialDerivativeFieldRef,
    partialDerivativeState,
    resetCalculusRuntime,
    resetCurrentCalculusScreen,
    restoreCalculusSurfaceState,
    restoreCalculusHistoryEntry,
    runCalculusAction,
    secondOrderA2Ref,
    secondOrderOdeForcingFieldRef,
    secondOrderOdeState,
    selectedCalculusMenuEntry,
    setCalculusDefiniteIntegral,
    setCalculusFiniteLimit,
    setCalculusImproperIntegral,
    setCalculusMainEditorLatex,
    setCalculusIndefiniteIntegral,
    setCalculusInfiniteLimit,
    setCurrentCalculusMenuIndex,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setFirstOrderOdeState, setImplicitDerivativeState,
    setMaclaurinState,
    setNumericIvpState,
    setPartialDerivativeState,
    setSecondOrderOdeState,
    setTaylorState,
    taylorCenterRef,
    taylorFieldRef,
    taylorState,
  } = calculusRuntime;
  openCalculusScreenRef.current = openCalculusScreen;
  resetCalculusRuntimeRef.current = resetCalculusRuntime;

  const calculateRuntime = useCalculateRuntime({
    ansLatex,
    calculateScreenRef,
    commitOutcome,
    currentMode,
    currentModeRef,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    openCalculusScreen,
    openLegacyCalculateCalculusInCalculus,
    reserveHistoryTicket: reservePendingHistoryTicket,
    routeToModeDestination,
    settings,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setDisplayOutcome,
    setMode,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
    storedVariables: variableMemory,
  });
  const {
    applyCalculateSeed,
    calculateAlgebraTrayOpen,
    calculateLatex,
    calculateMenuEntries,
    calculateMenuFooterText,
    calculateMenuPanelRef,
    calculateMenuSelection,
    calculateRouteMeta,
    calculateScreen,
    calculateWorkbenchExpression,
    captureCalculateSurfaceState,
    clearCalculateReplayVariableSubstitutions,
    currentCalculateHistoryContext,
    cycleLimitDirection: cycleCalculateLimitDirection,
    integralFieldRef,
    integralLowerRef,
    integralWorkbench,
    isCalculateMenuOpen,
    isCalculateToolOpen,
    limitFieldRef,
    limitTargetRef,
    limitWorkbench,
    moveCurrentCalculateMenuSelection,
    openCalculateMenuDigitEntry,
    openCalculateMenuEntry,
    openCalculateScreen,
    openSelectedCalculateMenuEntry,
    resetCalculateRuntime,
    resetCurrentCalculateScreen,
    restoreCalculateSurfaceState,
    restoreCalculateHistoryEntry,
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
    setCalculateLatex,
    setCalculateMenuSelection,
    setIntegralWorkbench,
    setLimitWorkbench,
    toggleCalculateAlgebraTray,
    toggleIntegralKind,
  } = calculateRuntime;
  resetCalculateRuntimeRef.current = resetCalculateRuntime;

  const trigonometryRuntime = useTrigonometryRuntime({
    activeFieldRef,
    angleUnit: settings.angleUnit,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    openLauncher,
    reserveHistoryTicket: reservePendingHistoryTicket,
    setDisplayOutcome,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
  });
  openTrigScreenRef.current = trigonometryRuntime.openTrigScreen;
  const {
    angleConvertState,
    angleConvertValueRef,
    applyTrigSeed,
    cosineRuleSideARef,
    cosineRuleState,
    currentTrigMenuIndex,
    goBackInTrigonometry,
    isTrigDraftFocused,
    isTrigMenuOpen,
    loadTrigDraft,
    loadTrigExample,
    moveCurrentTrigMenuSelection,
    openSelectedTrigMenuEntry,
    openTrigScreen,
    periodPhaseState,
    resetCurrentTrigScreen,
    resetTrigonometryRuntime,
    restoreTrigHistoryEntry,
    rightTriangleSideARef,
    rightTriangleState,
    runTrigAction,
    selectedTrigMenuEntry,
    setAngleConvertState,
    setCosineRuleState,
    setCurrentTrigMenuIndex,
    setPeriodPhaseState,
    setRightTriangleState,
    setSineRuleState,
    setSpecialAnglesExpression,
    setTrigEquationState,
    setTrigFunctionState,
    setTrigIdentityState,
    sineRuleSideARef,
    sineRuleState,
    specialAnglesExpression,
    trigDraftFieldRef,
    trigDraftLatex,
    trigDraftState,
    trigEditorIsEditable,
    trigEquationState,
    trigFunctionState,
    trigIdentityState,
    trigMenuEntries,
    trigMenuFooterText,
    trigMenuPanelRef,
    trigMenuSelection,
    trigRouteMeta,
    trigScreen,
    trigTargetFormLabels,
    trigWorkbenchExpression,
    updateTrigDraft,
  } = trigonometryRuntime;
  resetTrigonometryRuntimeRef.current = resetTrigonometryRuntime;

  const statisticsRuntime = useStatisticsRuntime({
    activeFieldRef,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    openLauncher,
    reserveHistoryTicket: reservePendingHistoryTicket,
    setClipboardNotice,
    setDisplayOutcome,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
  });
  const {
    addRegressionPoint,
    addStatisticsFrequencyRow,
    binomialState,
    buildStatisticsDraftForScreen,
    correlationState,
    currentStatisticsMenuIndex,
    expandStatisticsTableToDataset,
    focusStatisticsEditor,
    frequencyTable,
    goBackInStatistics,
    importDatasetIntoFrequencyTable,
    isStatisticsDraftFocused,
    isStatisticsMenuOpen,
    loadStatisticsDraft,
    loadStatisticsDraftForLatex,
    loadStatisticsExample,
    meanInferenceState,
    moveCurrentStatisticsMenuSelection,
    normalState,
    openSelectedStatisticsMenuEntry,
    openStatisticsScreen,
    poissonState,
    regressionState,
    removeRegressionPoint,
    removeStatisticsFrequencyRow,
    resetCurrentStatisticsScreen,
    resetStatisticsRuntime,
    restoreStatisticsHistoryEntry,
    runStatisticsAction,
    selectedStatisticsMenuEntry,
    setBinomialState,
    setCurrentStatisticsMenuIndex,
    setMeanInferenceState,
    setNormalState,
    setPoissonState,
    statisticsBinomialNRef,
    statisticsCorrelationText,
    statisticsCorrelationXRef,
    statisticsDatasetRef,
    statisticsDatasetText,
    statisticsDraftFieldRef,
    statisticsDraftLatex,
    statisticsDraftState,
    statisticsEditorIsEditable,
    statisticsFilledFrequencyRowCount,
    statisticsFrequencyValueRef,
    statisticsMeanInferenceLevelRef,
    statisticsMenuEntries,
    statisticsMenuFooterText,
    statisticsMenuPanelRef,
    statisticsMenuSelection,
    statisticsNormalMeanRef,
    statisticsPoissonLambdaRef,
    statisticsRegressionText,
    statisticsRegressionXRef,
    statisticsRouteMeta,
    statisticsScreen,
    statisticsSourceSyncState,
    statisticsSourceSyncSummary,
    statisticsWorkbenchExpression,
    statisticsWorkingSource,
    statsDataset,
    switchStatisticsSource,
    updateRegressionPointDraft,
    updateStatisticsDataset,
    updateStatisticsDraft,
    updateStatisticsFrequencyRow,
  } = statisticsRuntime;
  resetStatisticsRuntimeRef.current = resetStatisticsRuntime;

  const geometryRuntime = useGeometryRuntime({
    activeFieldRef,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    openLauncher,
    reserveHistoryTicket: reservePendingHistoryTicket,
    setClipboardNotice,
    setDisplayOutcome,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
  });
  const {
    arcSectorRadiusRef,
    arcSectorState,
    buildGeometryDraftForScreen,
    circleRadiusRef,
    circleState,
    coneRadiusRef,
    coneState,
    cubeSideRef,
    cubeState,
    cuboidLengthRef,
    cuboidState,
    currentGeometryMenuIndex,
    cylinderRadiusRef,
    cylinderState,
    distanceP1XRef,
    distanceState,
    focusGeometryEditor,
    geometryDraftFieldRef,
    geometryDraftLatex,
    geometryDraftState,
    geometryEditorIsEditable,
    geometryMenuEntries,
    geometryMenuFooterText,
    geometryMenuPanelRef,
    geometryMenuSelection,
    geometryRouteMeta,
    geometryScreen,
    geometrySolveMissingTemplates,
    geometryWorkbenchExpression,
    goBackInGeometry,
    isGeometryDraftFocused,
    isGeometryMenuOpen,
    lineEquationP1XRef,
    lineEquationState,
    lineFormLabels,
    loadGeometryDraft,
    loadGeometryExample,
    loadGeometrySolveMissingTemplate,
    midpointP1XRef,
    midpointState,
    moveCurrentGeometryMenuSelection,
    openGeometryScreen,
    openSelectedGeometryMenuEntry,
    rectangleState,
    rectangleWidthRef,
    resetCurrentGeometryScreen,
    resetGeometryRuntime,
    restoreGeometryHistoryEntry,
    runGeometryAction,
    selectedGeometryMenuEntry,
    setArcSectorState,
    setCircleState,
    setConeState,
    setCubeState,
    setCuboidState,
    setCylinderState,
    setCurrentGeometryMenuIndex,
    setDistanceState,
    setLineEquationState,
    setMidpointState,
    setRectangleState,
    setSlopeState,
    setSphereState,
    setSquareState,
    setTriangleAreaState,
    setTriangleHeronState,
    slopeP1XRef,
    slopeState,
    sphereRadiusRef,
    sphereState,
    squareSideRef,
    squareState,
    triangleAreaBaseRef,
    triangleAreaState,
    triangleHeronARef,
    triangleHeronState,
    updateGeometryDraft,
  } = geometryRuntime;
  openGeometryScreenRef.current = openGeometryScreen;
  resetGeometryRuntimeRef.current = resetGeometryRuntime;

  function prepareLauncherInspectorState() {
    setLauncherState({
      ...createLauncherStateForMode(
        currentMode,
        previousNonGuideMode,
        launcherCategories,
        activeLauncherLeafId,
      ),
      surface: 'app',
    });
  }

  function openMenuInspector() {
    closeLauncher();
    prepareLauncherInspectorState();
    openLeftMenuInspector();
  }

  function openInspectorCategoryById(
    categoryId: Parameters<typeof openLauncherCategoryById>[0],
    preferredLeafId?: Parameters<typeof openLauncherCategoryById>[1],
  ) {
    setLauncherState({
      ...openLauncherCategory(categoryId, launcherCategories, preferredLeafId),
      surface: 'app',
    });
  }

  function launchInspectorApp(
    entry: Parameters<typeof launchLauncherApp>[0],
    intent: Parameters<typeof launchLauncherApp>[1],
  ) {
    closeLeftInspector();
    launchLauncherApp(entry, intent);
  }

  const linearAlgebraTableShellRuntime = useLinearAlgebraTableShellRuntime({
    activeFieldRef,
    angleUnit: settings.angleUnit,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    mainFieldRef,
    patchSettings,
    replayVariableSubstitutions,
    reserveHistoryTicket: reservePendingHistoryTicket,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    storedVariables: variableMemory,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
  });
  const {
    buildWorkspaceHostProps: buildLinearAlgebraTableWorkspaceHostProps,
    clearActiveLinearAlgebraTableDraft,
    isLinearAlgebraTableMode, linearAlgebraRuntime, loadTablePrimaryLatex, matrixKeyboardLayouts,
    persistenceState: linearAlgebraTablePersistenceState,
    resetLinearAlgebraTableRuntime,
    restoreLinearAlgebraTableHistoryEntry,
    runMatrixAction, runMatrixEditorAction,
    runTableAction,
    runVectorAction, runVectorEditorAction,
    toggleTableSecondary, vectorKeyboardLayouts,
  } = linearAlgebraTableShellRuntime;
  resetLinearAlgebraTableRuntimeRef.current = resetLinearAlgebraTableRuntime;

  const symbolicDisplayPrefs = {
    symbolicDisplayMode: settings.symbolicDisplayMode,
    flattenNestedRootsWhenSafe: settings.flattenNestedRootsWhenSafe,
  } as const;
  const guideEnabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;
  const guideRuntime = useGuideRuntime({
    closeHistoryPanel,
    closeLauncher,
    currentMode,
    enabledCapabilities: guideEnabledCapabilities,
    openGuidePage: openGuidePageTab,
    openLauncher,
    setMode,
  });
  const {
    activeGuideHomeEntries,
    currentGuideSelectionIndex,
    goBackInGuide,
    guideArticle,
    guideListEntries,
    guideModeRef,
    guideRoute,
    guideRouteMeta,
    guideSearchQuery,
    guideSelection,
    guideSoftMenu,
    moveCurrentGuideSelection,
    openGuideArticle,
    openGuideHome,
    openGuideMode,
    openGuideRoute,
    openSelectedGuideEntry,
    resetGuideRuntime,
    selectedGuideExample,
    selectedGuideListEntry,
    setCurrentGuideSelectionIndex,
    setGuideQuery,
  } = guideRuntime;
  resetGuideRuntimeRef.current = resetGuideRuntime;
  const equationRuntime = useEquationRuntime({
    activeFieldRef,
    ansLatex,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
    displayOutcome,
    editorAnalysisControl,
    getActiveWorkspaceInstanceRuntimeContext: getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstances: getWorkspaceInstancesForRuntime,
    isLauncherOpen,
    mainFieldRef,
    openGuideArticle,
    openGuideMode,
    openLauncher,
    patchSettings,
    replayVariableSubstitutions,
    reserveHistoryTicket: reservePendingHistoryTicket,
    routeToModeDestination,
    settings,
    setDisplayOutcome,
    setMode,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    startTransition,
    storedVariables: variableMemory,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
  });
  const {
    clearActiveEquationDraft,
    cubicCoefficients,
    captureEquationSurfaceState,
    equationAlgebraTransforms,
    equationAlgebraTrayOpen,
    equationEditorAnalysisStatuses,
    equationInputLatex,
    equationLatex,
    equationMenuEntries,
    equationMenuFooterText,
    equationMenuPanelRef,
    equationMenuSelection,
    equationNumericSolvePanel,
    equationResultBadges,
    equationResultTitle,
    equationRouteMeta,
    equationScreen,
    equationSoftActions,
    equationSolveTarget,
    equationSolveTargetResolution,
    equationWorkspaceProps,
    goBackInEquation,
    isEquationMenuOpen,
    isEquationWorkScreen,
    moveCurrentEquationMenuSelection,
    openPromptTarget,
    openEquationMenuDigitEntry,
    openEquationScreen,
    openSelectedEquationMenuEntry,
    polynomialInputRefs,
    polynomialSystem2Latex,
    quadraticCoefficients,
    quarticCoefficients,
    resetCurrentEquationScreen,
    resetEquationRuntime,
    restoreEquationSurfaceState,
    restoreEquationHistoryEntry,
    runEquationAction,
    runEquationAlgebraTransformAction,
    selectedEquationMenuEntry,
    setEquationLatex,
    setEquationSolveTarget,
    shouldShowEquationAlgebraTray,
    switchToEquationWithLatex,
    system2,
    systemInputRefs,
    system3,
    toggleEquationAlgebraTray,
  } = equationRuntime;
  openEquationScreenRef.current = openEquationScreen;
  resetEquationRuntimeRef.current = resetEquationRuntime;

  const { createWorkspaceKindTab, retargetActiveWorkspaceKind, workspaceTabsRuntime } = useWorkspaceTabsShellRuntime({
    commitVisibleModeSelection,
    currentMode,
    discardPendingHistoryTicketsForWorkspaceInstance,
    labsEnabled,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    pendingHistoryTickets,
    setEditorRuntimeStatusOverride,
    workspaceInstances: workspaceInstancesRuntime,
    display: { ansLatex, captureDisplayState, displayOutcome, replayVariableSubstitutions, restoreDisplayState },
    runtime: {
      activeRuntimeState: activeWorkspaceRuntimeState,
      restoreRuntimeState: restoreWorkspaceRuntimeState,
    },
    calculate: { captureSurfaceState: captureCalculateSurfaceState, restoreSurfaceState: restoreCalculateSurfaceState }, equation: { captureSurfaceState: captureEquationSurfaceState, restoreSurfaceState: restoreEquationSurfaceState }, calculus: { captureSurfaceState: captureCalculusSurfaceState, restoreSurfaceState: restoreCalculusSurfaceState },
    trigonometry: { captureSurfaceState: trigonometryRuntime.captureTrigonometrySurfaceState, restoreSurfaceState: trigonometryRuntime.restoreTrigonometrySurfaceState }, statistics: { captureSurfaceState: statisticsRuntime.captureStatisticsSurfaceState, restoreSurfaceState: statisticsRuntime.restoreStatisticsSurfaceState }, geometry: { captureSurfaceState: geometryRuntime.captureGeometrySurfaceState, restoreSurfaceState: geometryRuntime.restoreGeometrySurfaceState },
    table: { captureSurfaceState: linearAlgebraTableShellRuntime.captureTableSurfaceState, restoreSurfaceState: linearAlgebraTableShellRuntime.restoreTableSurfaceState }, matrix: { captureSurfaceState: linearAlgebraTableShellRuntime.captureMatrixSurfaceState, restoreSurfaceState: linearAlgebraTableShellRuntime.restoreMatrixSurfaceState }, vector: { captureSurfaceState: linearAlgebraTableShellRuntime.captureVectorSurfaceState, restoreSurfaceState: linearAlgebraTableShellRuntime.restoreVectorSurfaceState },
  });
  createWorkspaceKindTabRef.current = createWorkspaceKindTab;
  openGuidePageTabRef.current = () =>
    workspaceTabsRuntime.onOpenAppPageTab(GUIDE_PAGE_WORKSPACE_KIND);
  useEffect(() => {
    if (isLauncherOpen || currentMode !== 'equation') {
      return;
    }

    void import('./lib/modes/equation').catch(() => {
      // Active-route preloading is opportunistic; runtime action handlers still own errors.
    });
  }, [currentMode, equationScreen, isLauncherOpen]);
  const displayHeaderLabel =
    isLauncherOpen
      ? 'Menu'
      : currentMode === 'calculate' && calculateScreen !== 'standard'
        ? 'Calculus'
        : currentMode === 'statistics'
          ? 'Statistics'
        : isCalculusMode(currentMode)
          ? 'Calculus'
        : MODE_LABELS[currentMode];
  const displayInputLatex =
    isLauncherOpen
      ? ''
      : currentMode === 'calculate'
        ? calculateScreen === 'standard'
          ? calculateLatex
          : calculateWorkbenchExpression.latex
      : isCalculusMode(currentMode)
        ? (calculusMainEditorActive ? calculusMainEditorLatex : calculusWorkbenchExpression)
      : currentMode === 'trigonometry'
        ? trigDraftLatex
      : currentMode === 'statistics'
        ? statisticsDraftLatex
      : currentMode === 'geometry'
        ? geometryDraftLatex
      : currentMode === 'matrix' ? linearAlgebraRuntime.matrixEditorLatex
      : currentMode === 'vector' ? linearAlgebraRuntime.vectorEditorLatex
      : currentMode === 'equation' && isEquationWorkScreen
        ? equationInputLatex
        : '';
  const previewAnalysis = useEditorAnalysis<string>({
    source: displayInputLatex,
    initialValue: '',
    analysisKey: `${currentMode}:${calculateScreen}:${equationScreen}:${calculusScreen}:${trigScreen}:${statisticsScreen}:${geometryScreen}`,
    analyze: trimHarmlessTrailingMathSpacing,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'previewRender',
      contextKey: `${currentMode}:${displayHeaderLabel}`,
    },
  });
  const deferredDisplayLatex =
    currentMode === 'matrix' || currentMode === 'vector'
      ? displayInputLatex
      : previewAnalysis.value;
  const displayMathLatex =
    displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.exactLatex
      : undefined;
  const activeSoftMenu = isLauncherOpen
    ? LAUNCHER_SOFT_ACTIONS
    : currentMode === 'guide'
      ? guideSoftMenu
    : currentMode === 'geometry'
      ? getGeometrySoftActions(geometryScreen)
    : currentMode === 'statistics'
      ? getStatisticsSoftActions(statisticsScreen)
    : currentMode === 'trigonometry'
      ? getTrigSoftActions(trigScreen)
    : isCalculusMode(currentMode) ? getCalculusSoftActions(calculusScreen)
    : currentMode === 'calculate' ? getCalculateSoftActions(calculateScreen)
    : currentMode === 'equation' ? equationSoftActions
    : currentMode === 'matrix' ? linearAlgebraRuntime.matrixSoftActions
    : currentMode === 'vector' ? linearAlgebraRuntime.vectorSoftActions
      : SOFT_MENU_BY_MODE[currentMode];
  const keypadRows = useMemo(
    () => getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: currentMode,
      calculusScreen,
    }),
    [currentMode, calculusScreen],
  );
  const analyzeExpressionTransforms = useCallback(async (source: string) => {
    const { getEligibleExpressionTransforms } = await import('./lib/algebra/algebra-transform');
    return getEligibleExpressionTransforms(source);
  }, []);
  const calculateAlgebraTransformAnalysis = useAsyncEditorAnalysis<AlgebraTransformAction[]>({
    source: currentMode === 'calculate' && calculateScreen === 'standard'
      ? calculateLatex
      : '',
    initialValue: [],
    analyze: analyzeExpressionTransforms,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'calculateTransformEligibility',
      contextKey: calculateScreen,
    },
  });
  const calculateAlgebraTransforms =
    currentMode === 'calculate' && calculateScreen === 'standard'
      ? calculateAlgebraTransformAnalysis.value
      : [];

  useEffect(() => {
    setNumericOutputSettings({
      approxDigits: settings.approxDigits,
      numericNotationMode: settings.numericNotationMode,
      scientificNotationStyle: settings.scientificNotationStyle,
    });
  }, [
    settings.approxDigits,
    settings.numericNotationMode,
    settings.scientificNotationStyle,
  ]);

  const calculatorMemoryDirtyInputs = useMemo(() => ({
    angleConvertState,
    ansLatex,
    arcSectorState,
    binomialState,
    calculateAlgebraTrayOpen,
    calculateLatex,
    calculateScreen,
    calculusDefiniteIntegral,
    calculusFiniteLimit,
    calculusImproperIntegral,
    calculusIndefiniteIntegral,
    calculusInfiniteLimit,
    calculusLimit,
    calculusMenuSelection,
    calculusScreen,
    circleState,
    coneState,
    correlationState,
    cosineRuleState,
    cubeState,
    cubicCoefficients,
    cuboidState,
    currentMode,
    cylinderState,
    derivativePointWorkbench,
    derivativeWorkbench,
    displayOutcome,
    distanceState,
    equationAlgebraTrayOpen,
    equationLatex,
    equationMenuSelection,
    equationNumericSolvePanel,
    equationScreen,
    equationSolveTarget,
    firstOrderOdeState,
    frequencyTable,
    geometryDraftState,
    geometryMenuSelection,
    geometryScreen,
    guideRoute,
    guideSelection,
    history, implicitDerivativeState,
    integralWorkbench,
    limitWorkbench,
    lineEquationState,
    linearAlgebraTablePersistenceState,
    maclaurinState,
    meanInferenceState,
    midpointState,
    normalState,
    numericIvpState,
    partialDerivativeState,
    poissonState,
    polynomialSystem2Latex,
    previousNonGuideMode,
    quadraticCoefficients,
    quarticCoefficients,
    rectangleState,
    regressionState,
    rightTriangleState,
    secondOrderOdeState,
    settings,
    sineRuleState,
    slopeState,
    specialAnglesExpression,
    sphereState,
    squareState,
    statisticsDraftState,
    statisticsMenuSelection,
    statisticsScreen,
    statisticsSourceSyncState,
    statisticsWorkingSource,
    statsDataset,
    system2,
    system3,
    taylorState,
    triangleAreaState,
    triangleHeronState,
    trigDraftState,
    trigEquationState,
    trigFunctionState,
    trigIdentityState,
    trigMenuSelection,
    trigScreen,
    variableMemory,
  }), [
    angleConvertState,
    ansLatex,
    arcSectorState,
    binomialState,
    calculateAlgebraTrayOpen,
    calculateLatex,
    calculateScreen,
    calculusDefiniteIntegral,
    calculusFiniteLimit,
    calculusImproperIntegral,
    calculusIndefiniteIntegral,
    calculusInfiniteLimit,
    calculusLimit,
    calculusMenuSelection,
    calculusScreen,
    circleState,
    coneState,
    correlationState,
    cosineRuleState,
    cubeState,
    cubicCoefficients,
    cuboidState,
    currentMode,
    cylinderState,
    derivativePointWorkbench,
    derivativeWorkbench,
    displayOutcome,
    distanceState,
    equationAlgebraTrayOpen,
    equationLatex,
    equationMenuSelection,
    equationNumericSolvePanel,
    equationScreen,
    equationSolveTarget,
    firstOrderOdeState,
    frequencyTable,
    geometryDraftState,
    geometryMenuSelection,
    geometryScreen,
    guideRoute,
    guideSelection,
    history, implicitDerivativeState,
    integralWorkbench,
    limitWorkbench,
    lineEquationState,
    linearAlgebraTablePersistenceState,
    maclaurinState,
    meanInferenceState,
    midpointState,
    normalState,
    numericIvpState,
    partialDerivativeState,
    poissonState,
    polynomialSystem2Latex,
    previousNonGuideMode,
    quadraticCoefficients,
    quarticCoefficients,
    rectangleState,
    regressionState,
    rightTriangleState,
    secondOrderOdeState,
    settings,
    sineRuleState,
    slopeState,
    specialAnglesExpression,
    sphereState,
    squareState,
    statisticsDraftState,
    statisticsMenuSelection,
    statisticsScreen,
    statisticsSourceSyncState,
    statisticsWorkingSource,
    statsDataset,
    system2,
    system3,
    taylorState,
    triangleAreaState,
    triangleHeronState,
    trigDraftState,
    trigEquationState,
    trigFunctionState,
    trigIdentityState,
    trigMenuSelection,
    trigScreen,
    variableMemory,
  ]);
  useAppPersistenceDirtySignal({
    dirtySignal: calculatorMemoryDirtyInputs,
    hydrated,
    markDirty: markCalculatorMemoryDirty,
  });

  function patchSettings(patch: SettingsPatch) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      ...patch,
    }));
  }

  function insertStoredVariable(entry: StoredVariableValue) {
    insertLatex(namedVariableEditorLatex(entry.name));
  }

  function focusTrigEditor() {
    trigDraftFieldRef.current?.focus?.();
    activeFieldRef.current = trigDraftFieldRef.current;
  }

  function toggleHistoryPanel() {
    if (isLauncherOpen || currentMode === 'guide') {
      return;
    }

    toggleHistoryPanelBase();
  }

  function toggleVariablesPanel() {
    if (isLauncherOpen || currentMode === 'guide') {
      return;
    }

    toggleVariablesPanelBase();
  }

  useShellFocusRuntime({
    activeFieldRef,
    calculusRouteMeta,
    calculusScreen,
    calculusFiniteLimitFieldRef,
    calculusInfiniteLimitFieldRef,
    calculusMenuPanelRef,
    angleConvertValueRef,
    arcSectorRadiusRef,
    calculateMenuPanelRef,
    calculateRouteMeta,
    calculateScreen,
    circleRadiusRef,
    coneRadiusRef,
    cosineRuleSideARef,
    cubeSideRef,
    cuboidLengthRef,
    currentMode,
    cylinderRadiusRef,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    distanceP1XRef,
    equationMenuPanelRef,
    equationRouteMeta,
    equationScreen,
    firstOrderOdeLhsFieldRef,
    geometryDraftFieldRef,
    geometryMenuPanelRef,
    geometryRouteMeta,
    geometryScreen,
    guideMenuPanelRef,
    guideRouteMeta,
    guideSearchInputRef,
    historyOpen,
    integralFieldRef,
    integralLowerRef,
    isLauncherOpen,
    limitFieldRef,
    limitTargetRef,
    lineEquationP1XRef,
    maclaurinFieldRef,
    mainFieldRef,
    midpointP1XRef,
    numericIvpFieldRef,
    partialDerivativeFieldRef,
    polynomialInputRefs,
    rectangleWidthRef,
    rightTriangleSideARef,
    secondOrderA2Ref,
    sideSurfaceOverlayOpen,
    sineRuleSideARef,
    slopeP1XRef,
    sphereRadiusRef,
    squareSideRef,
    statisticsBinomialNRef,
    statisticsCorrelationXRef,
    statisticsDatasetRef,
    statisticsDraftFieldRef,
    statisticsFrequencyValueRef,
    statisticsMeanInferenceLevelRef,
    statisticsMenuPanelRef,
    statisticsNormalMeanRef,
    statisticsPoissonLambdaRef,
    statisticsRegressionXRef,
    statisticsRouteMeta,
    statisticsScreen,
    statisticsWorkingSource,
    systemInputRefs,
    taylorFieldRef,
    triangleAreaBaseRef,
    triangleHeronARef,
    trigDraftFieldRef,
    trigMenuPanelRef,
    trigRouteMeta,
    trigScreen,
  });

  function exitGuide() {
    setMode(previousNonGuideMode);
  }

  function openLegacyCalculateCalculusInCalculus(
    screen: CalculateScreen | null | undefined,
    seed: GuideExample['launch']['calculateSeed'],
  ) {
    const calculusScreen = mapLegacyCalculateScreenToCalculusScreen(screen, seed);
    if (!calculusScreen) {
      return false;
    }

    return routeToModeDestination('calculus', () => {
      openCalculusScreen(calculusScreen);
      applyCalculusSeed(calculusScreen, seed as GuideExample['launch']['calculusSeed']);
    });
  }

  function launchGuideExample(example: GuideExample | undefined) {
    launchGuideExampleDestination(example, {
      applyCalculateSeed,
      applyCalculusSeed,
      applyTrigSeed,
      clearDisplayOutcome: () => setDisplayOutcome(null),
      closeHistoryPanel,
      closeLauncher,
      loadGeometryExample,
      loadStatisticsExample,
      loadTablePrimaryLatex,
      loadTrigExample,
      openCalculateScreen,
      openCalculusScreen,
      openEquationScreen,
      openLegacyCalculateCalculusInCalculus,
      openStatisticsScreen,
      openTrigScreen,
      routeToModeDestination,
      setCalculateLatex,
      setClipboardNotice,
      setEquationLatex,
      setEquationSolveTarget,
    });
  }

  const {
    openCalculusGuideForScreen,
    openGeometryGuideForScreen,
    openStatisticsGuideForScreen,
    openTrigGuideForScreen,
  } = createModeGuideOpeners({
    calculusScreen,
    geometryScreen,
    openGuideArticle,
    openGuidePage: openGuidePageTab,
    openGuideRoute,
    setMode: (mode) => setMode(mode),
    statisticsScreen,
    trigScreen,
  });

  function activeExpressionLatex() {
    if (isLauncherOpen || isEquationMenuOpen || isTrigMenuOpen || isStatisticsMenuOpen) {
      return '';
    }

    if (currentMode === 'calculate') {
      return calculateScreen === 'standard'
        ? calculateLatex
        : calculateWorkbenchExpression.latex;
    }

    if (currentMode === 'equation') {
      return equationInputLatex;
    }

    if (isCalculusMode(currentMode)) {
      return isCalculusMenuOpen ? '' : calculusWorkbenchExpression;
    }

    if (currentMode === 'trigonometry') {
      return trigDraftLatex;
    }

    if (currentMode === 'statistics') {
      return statisticsDraftLatex;
    }

    if (currentMode === 'geometry') {
      return geometryDraftLatex;
    }

    if (currentMode === 'table' || currentMode === 'matrix' || currentMode === 'vector') {
      return linearAlgebraTableShellRuntime.activeExpressionLatex;
    }

    return '';
  }

  function activeResultEditorLatex() {
    if (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') {
      return displayOutcome.exactLatex ?? '';
    }

    return '';
  }

  function activeResultCopyText() {
    if (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') {
      const visibleLines: string[] = [];
      const hasPrimaryApproxResult = displayOutcome.kind === 'success' && !displayOutcome.exactLatex
        && Boolean(displayOutcome.approxText) && (displayOutcome.solutionKind === 'approximate-numeric'
          || displayOutcome.resultOrigin === 'numeric-fallback');

      if (settings.outputStyle !== 'decimal' && displayOutcome.exactLatex) {
        visibleLines.push(settings.mathNotationDisplay === 'plainText'
          ? latexToVisibleText(displayOutcome.exactLatex, settings.mathNotationDisplay, symbolicDisplayPrefs)
          : getDisplayLatex(displayOutcome.exactLatex, symbolicDisplayPrefs));
      }

      if ((settings.outputStyle !== 'exact' || hasPrimaryApproxResult) && displayOutcome.approxText) {
        visibleLines.push(
          formatMathTextForDisplay(displayOutcome.approxText, settings.mathNotationDisplay),
        );
      }

      return visibleLines.join('\n').trim();
    }

    return '';
  }

  function fallbackCopyText(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  async function copyText(text: string, successNotice: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to copy');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
      } else {
        fallbackCopyText(trimmed);
      }
      setClipboardNotice(successNotice);
    } catch {
      setClipboardNotice('Clipboard blocked');
    }
  }

  function sendLatexToCalculate(latex: string) {
    const trimmed = latex.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to load');
      return;
    }

    closeLauncher();

    routeToModeDestination('calculate', () => {
      setCalculateLatex(trimmed);
      openCalculateScreen('standard');
      setDisplayOutcome(null);
    });
    setClipboardNotice('Loaded into Calculate');
  }

  function sendLatexToEquation(latex: string, options?: { openNumericSolve?: boolean }) {
    const trimmed = latex.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to load');
      return;
    }

    closeLauncher();
    switchToEquationWithLatex(trimmed, options);
    setClipboardNotice('Loaded into Equation');
  }

  function loadLatexIntoEditor(latex: string) {
    if (currentMode === 'equation') {
      sendLatexToEquation(latex);
      return;
    }

    sendLatexToCalculate(latex);
  }

  function focusCalculusMainEditor() { mainFieldRef.current?.focus?.(); activeFieldRef.current = mainFieldRef.current; setClipboardNotice('Calculus editor focused'); }

  function editActiveExpression() {
    if (calculusMainEditorActive) return focusCalculusMainEditor();

    if (currentMode === 'trigonometry') {
      focusTrigEditor();
      setClipboardNotice('Trigonometry editor focused');
      return;
    }

    if (currentMode === 'statistics') {
      focusStatisticsEditor();
      setClipboardNotice('Statistics editor focused');
      return;
    }

    if (currentMode === 'geometry') {
      focusGeometryEditor();
      setClipboardNotice('Geometry editor focused');
      return;
    }

    loadLatexIntoEditor(activeExpressionLatex());
  }

  function triggerDisplayOutcomeAction(action: DisplayOutcomeAction) {
    if (action.kind === 'send') {
      if (action.target === 'equation') {
        sendLatexToEquation(action.latex, {
          openNumericSolve: currentMode === 'trigonometry',
        });
      } else {
        sendLatexToCalculate(action.latex);
      }
      return;
    }

    if (action.mode === 'geometry') {
      routeToModeDestination('geometry', () =>
        loadGeometryDraft(action.latex, 'guided', true));
      return;
    }

    if (action.mode === 'statistics') {
      routeToModeDestination('statistics', () =>
        loadStatisticsDraftForLatex(action.latex));
      return;
    }

    routeToModeDestination('trigonometry', () =>
      loadTrigDraft(action.latex, 'guided', true));
  }

  async function pasteIntoEditor() {
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice('Paste unavailable');
        return;
      }

      const text = await navigator.clipboard.readText();
      const isLinearAlgebraPaste = currentMode === 'matrix' || currentMode === 'vector';
      const linearAlgebraPasteLatex = currentMode === 'matrix'
        ? linearAlgebraRuntime.canonicalizeMatrixEditorPaste(text)
        : currentMode === 'vector'
          ? linearAlgebraRuntime.canonicalizeVectorEditorPaste(text)
          : null;
      const canonicalized = isLinearAlgebraPaste
        ? null
        : canonicalizeMathInput(text, {
            mode: currentMode,
            screenHint: currentMode === 'equation'
              ? 'symbolic'
              : isCalculusMode(currentMode)
                ? calculusScreen
                : currentMode === 'calculate'
                  ? calculateScreen
                  : 'standard',
            liveAssist: true,
          });
      const mathText = isLinearAlgebraPaste
        ? linearAlgebraPasteLatex ?? text
        : canonicalized?.ok ? canonicalized.canonicalLatex : text;
      if (
        !isLauncherOpen &&
        (currentMode === 'calculate' ||
          isCalculusMode(currentMode) ||
          currentMode === 'matrix' ||
          currentMode === 'vector' ||
          currentMode === 'trigonometry' ||
          (currentMode === 'geometry' && geometryEditorIsEditable) ||
          currentMode === 'statistics' ||
          (currentMode === 'equation' && equationScreen === 'symbolic')) &&
        activeFieldRef.current
      ) {
        activeFieldRef.current.focus?.();
        activeFieldRef.current.insert(mathText);
        setClipboardNotice('Pasted into editor');
        return;
      }

      if (currentMode === 'geometry' && geometryEditorIsEditable) {
        focusGeometryEditor();
        geometryDraftFieldRef.current?.insert(mathText);
        setClipboardNotice('Pasted into Geometry editor');
        return;
      }

      if (currentMode === 'statistics' && statisticsEditorIsEditable) {
        focusStatisticsEditor();
        statisticsDraftFieldRef.current?.insert(mathText);
        setClipboardNotice('Pasted into Statistics editor');
        return;
      }

      if (currentMode === 'trigonometry' && trigEditorIsEditable) {
        focusTrigEditor();
        trigDraftFieldRef.current?.insert(mathText);
        setClipboardNotice('Pasted into Trigonometry editor');
        return;
      }

      loadLatexIntoEditor(mathText);
    } catch {
      setClipboardNotice('Clipboard blocked');
    }
  }

  function commitVisibleModeSelection(mode: ModeId) {
    if (mode === 'labs' && !labsEnabled) {
      return;
    }
    if (mode !== 'guide') {
      setPreviousNonGuideMode(mode);
    } else {
      closeHistoryPanel();
    }
    setCurrentMode(mode);
    setDisplayOutcome((currentOutcome) => (currentOutcome?.kind === 'prompt' ? null : currentOutcome));
    void persistModeSelection(mode);
  }

  function setMode(mode: ModeId) {
    if (mode === 'labs' && !labsEnabled) {
      return;
    }
    retargetActiveWorkspaceKind(mode);
    commitVisibleModeSelection(mode);
  }

  function routeToModeDestination(mode: ModeId, applyDestination: () => void) {
    if (mode === 'labs' && !labsEnabled) {
      return false;
    }

    flushSync(() => {
      setMode(mode);
    });
    applyDestination();
    return true;
  }

  function routeToModeDestinationInNewTab(mode: ModeId, applyDestination: () => void) {
    if (mode === 'guide' || mode === 'labs') {
      return false;
    }

    const createWorkspaceKindTab = createWorkspaceKindTabRef.current;
    if (!createWorkspaceKindTab) {
      return false;
    }

    flushSync(() => {
      createWorkspaceKindTab(mode);
      commitVisibleModeSelection(mode);
    });
    applyDestination();
    return true;
  }

  function routeLauncherWorkspaceDestination(
    entry: LauncherAppEntry,
    intent: LauncherLaunchIntent,
    applyDestination: () => void,
  ) {
    if (intent !== 'new-tab') {
      return routeToModeDestination(entry.launch.mode, applyDestination);
    }

    const createWorkspaceKindTab = createWorkspaceKindTabRef.current;
    if (!createWorkspaceKindTab) {
      return false;
    }

    flushSync(() => {
      createWorkspaceKindTab(entry.launch.mode);
      commitVisibleModeSelection(entry.launch.mode);
    });
    applyDestination();
    return true;
  }

  function insertLatex(latex: string) {
    insertLatexIntoEditor(activeFieldRef, mainFieldRef, latex);
  }

  function clearCurrentMode() {
    if (isLauncherOpen) {
      closeLauncher();
      return;
    }

    if (currentMode === 'guide') {
      goBackInGuide();
    } else if (currentMode === 'statistics') {
      resetCurrentStatisticsScreen();
    } else if (currentMode === 'geometry') {
      resetCurrentGeometryScreen();
    } else if (currentMode === 'trigonometry') {
      resetCurrentTrigScreen();
    } else if (isCalculusMode(currentMode)) {
      resetCurrentCalculusScreen();
    } else if (currentMode === 'calculate') {
      resetCurrentCalculateScreen();
    } else if (currentMode === 'equation') {
      resetCurrentEquationScreen();
    } else if (currentMode === 'table' || currentMode === 'matrix' || currentMode === 'vector') {
      clearActiveLinearAlgebraTableDraft();
    }

    setDisplayOutcome(null);
  }

  function executePrimaryAction() {
    executePrimaryActionWithDeps({
      isLauncherOpen,
      currentMode,
      guideRouteScreen: guideRoute.screen,
      isCalculusMenuOpen,
      isGeometryMenuOpen,
      isStatisticsMenuOpen,
      isTrigMenuOpen,
      isCalculateMenuOpen,
      isCalculateToolOpen,
      equationScreen,
      isGeometryDraftFocused,
      isStatisticsDraftFocused,
      isTrigDraftFocused,
      openSelectedLauncherEntry,
      launchGuideExample: () => launchGuideExample(selectedGuideExample),
      openSelectedGuideEntry,
      openSelectedCalculusMenuEntry,
      runCalculusAction,
      openSelectedGeometryMenuEntry,
      runGeometryAction,
      openSelectedStatisticsMenuEntry,
      runStatisticsAction,
      openSelectedTrigMenuEntry,
      runTrigAction,
      openSelectedCalculateMenuEntry,
      runCalculateWorkbenchAction,
      runCalculateActionEvaluate: () => runCalculateAction('evaluate'),
      openSelectedEquationMenuEntry,
      runEquationAction,
      runMatrixEditorAction, runVectorEditorAction,
      runTableAction,
    });
  }

  function requestCurrentOoeEditorCancellation(
    reason: string,
    onRequested?: () => void,
  ) {
    const surface = { currentMode, calculateScreen, equationScreen };
    void import('./app/logic/editorRuntimeControl')
      .then(({ requestCurrentEditorOoeCancellation }) => {
        const requested = requestCurrentEditorOoeCancellation(
          surface,
          { requestedBy: 'user', reason },
        );
        if (requested) {
          onRequested?.();
        }
      })
      .catch(() => {
        // Editor controls must remain safe even if the diagnostic lane is unavailable.
      });
  }

  function requestActivePendingRuntimeStop() {
    return stopPendingRuntimeTicket(
      USER_VISIBLE_OOE_TICKET_CAPABILITY_IDS,
      {
        workspaceInstanceId: workspaceInstancesRuntime.activeInstanceId,
        workspaceInstanceRevision:
          workspaceInstancesRuntime.activeInstance?.navigationRevision,
      },
    );
  }

  function stopEditorAnalysis() {
    setEditorAnalysisStopped(true);
    if (requestActivePendingRuntimeStop()) {
      setEditorRuntimeStatusOverride(null);
      return;
    }

    setEditorRuntimeStatusOverride('Editor analysis stopped');
    requestCurrentOoeEditorCancellation('editor stop', () => {
      setEditorRuntimeStatusOverride('Stop requested');
    });
  }

  function resumeEditorAnalysis() {
    setEditorRuntimeStatusOverride(null);
    setEditorAnalysisStopped(false);
    setEditorAnalysisGeneration((currentGeneration) => currentGeneration + 1);
  }

  function clearActiveEditorDraft() {
    if (isLauncherOpen || currentMode === 'guide' || currentMode === 'labs') {
      return;
    }

    if (currentMode === 'calculate') {
      setCalculateLatex('');
    } else if (currentMode === 'equation') {
      clearActiveEquationDraft();
    } else if (currentMode === 'trigonometry') {
      updateTrigDraft('', 'manual', true);
    } else if (currentMode === 'statistics') {
      updateStatisticsDraft('', 'manual', true);
    } else if (currentMode === 'geometry') {
      updateGeometryDraft('', 'manual', true);
    } else if (currentMode === 'table' || currentMode === 'matrix' || currentMode === 'vector') {
      clearActiveLinearAlgebraTableDraft();
    }

    setDisplayOutcome(null);
  }

  function restartEditorAnalysis() {
    if (!requestActivePendingRuntimeStop()) {
      requestCurrentOoeEditorCancellation('editor restart');
    }
    clearActiveEditorDraft();
    resumeEditorAnalysis();
    setEditorRuntimeStatusOverride('Editor restarted');
  }

  restartEditorAnalysisRef.current = restartEditorAnalysis;

  function runEditorPrimaryAction() {
    resumeEditorAnalysis();
    executePrimaryAction();
  }

  function selectKeypadLayer(layer: KeypadLayer) {
    setKeypadMomentaryLayer(null);
    setKeypadLayer((currentLayer) =>
      currentLayer === layer && layer !== 'base' ? 'base' : layer,
    );
  }

  function toggleKeypadLayerLock() {
    setKeypadLayerLocked((currentLocked) => !currentLocked);
  }

  function physicalModifierLayer(key: string): KeypadLayer | null {
    if (key === 'Shift') {
      return 'shift';
    }
    if (key === 'Alt' || key === 'AltGraph') {
      return 'alpha';
    }
    if (key === 'Control') {
      return 'ctrl';
    }
    return null;
  }

  function handleSoftAction(actionId: string) {
    handleSoftActionWithDeps({
      actionId,
      isLauncherOpen,
      currentMode,
      toggleHistoryOpen: toggleHistoryPanel,
      clearCurrentMode,
      openSelectedLauncherEntry,
      closeLauncher,
      openSelectedGuideEntry,
      openGuideSearch: () => openGuideRoute({
        screen: 'search',
        query: guideRoute.screen === 'search' ? guideRoute.query : '',
      }),
      openGuideSymbols: () => openGuideRoute({ screen: 'symbolLookup', query: '' }),
      openGuideModes: () => openGuideRoute({ screen: 'modeGuide' }),
      copyGuideExample: () => {
        void copyText(copyableGuideExampleLatex(selectedGuideExample), 'Example copied');
      },
      loadGuideExample: () => launchGuideExample(selectedGuideExample),
      goBackInGuide,
      exitGuide,
      openSelectedCalculusMenuEntry,
      openCalculusGuideForScreen,
      goBackInCalculus,
      runCalculusAction,
      loadCalculusToEditor: () => calculusMainEditorActive ? focusCalculusMainEditor() : loadLatexIntoEditor(calculusWorkbenchExpression),
      openCalculusParentOrHome,
      isGeometryMenuOpen,
      isGeometryDraftFocused,
      openSelectedGeometryMenuEntry,
      runGeometryAction,
      openGeometryGuideForScreen,
      goBackInGeometry,
      openGeometryParentOrHome: () => openGeometryScreen(getGeometryParentScreen(geometryScreen) ?? 'home'),
      isStatisticsMenuOpen,
      isStatisticsDraftFocused,
      openSelectedStatisticsMenuEntry,
      runStatisticsAction,
      openStatisticsGuideForScreen,
      goBackInStatistics,
      openStatisticsParentOrHome: () => openStatisticsScreen(getStatisticsParentScreen(statisticsScreen) ?? 'home'),
      isTrigMenuOpen,
      isTrigDraftFocused,
      openSelectedTrigMenuEntry,
      runTrigAction,
      openTrigGuideForScreen,
      goBackInTrigonometry,
      sendTrigToCalc: () => sendLatexToCalculate(trigDraftLatex),
      sendTrigToEquation: () => sendLatexToEquation(trigDraftLatex),
      openTrigParentOrHome: () => openTrigScreen(getTrigParentScreen(trigScreen) ?? 'home'),
      calculateScreen,
      runCalculateAction,
      toggleCalculateAlgebraTray,
      openSelectedCalculateMenuEntry,
      openCalculateStandard: () => openCalculateScreen('standard'),
      runCalculateWorkbenchAction,
      loadCalculateWorkbenchToEditor: () => loadLatexIntoEditor(calculateWorkbenchExpression.latex),
      openCalculateCalculusMenu: () => openCalculateScreen('calculusHome'),
      toggleIntegralKind,
      cycleLimitDirection: cycleCalculateLimitDirection,
      openSelectedEquationMenuEntry,
      goBackInEquation,
      openEquationHome: () => openEquationScreen('home'),
      equationScreen,
      toggleEquationAlgebraTray,
      openEquationPolynomialMenu: () => openEquationScreen('polynomialMenu'),
      openEquationSimultaneousMenu: () => openEquationScreen('simultaneousMenu'),
      runEquationAction,
      runMatrixAction,
      runVectorAction,
      toggleTableSecondary,
      runTableAction,
    });
  }

  function handleKeypad(button: KeypadButton) {
    const routedButton = resolveKeypadButtonForLayer(button, effectiveKeypadLayer);
    handleKeypadWithDeps({
      button: routedButton,
      isLauncherOpen,
      currentMode,
      isCalculateMenuOpen,
      isCalculusMenuOpen,
      isGeometryMenuOpen,
      isStatisticsMenuOpen,
      isTrigMenuOpen,
      isEquationMenuOpen,
      isGeometryDraftFocused,
      isStatisticsDraftFocused,
      handleLauncherDigit: openLauncherDigit,
      goBackInLauncher,
      moveCurrentLauncherSelection,
      openSelectedLauncherEntry,
      openGuideDigitEntry: (digit) => {
        if (
          guideRoute.screen === 'home'
          || guideRoute.screen === 'domain'
          || guideRoute.screen === 'modeGuide'
        ) {
          const matchedEntry = guideListEntries.find((entry) => entry.hotkey === digit);
          if (matchedEntry) {
            openGuideRoute(matchedEntry.route);
          }
        }
      },
      openGuideSearch: () => openGuideRoute({
        screen: 'search',
        query: guideRoute.screen === 'search' ? guideRoute.query : '',
      }),
      goBackInGuide,
      moveCurrentGuideSelection,
      executePrimaryAction,
      openCalculateMenuDigitEntry,
      toggleHistoryOpen: toggleHistoryPanel,
      openCalculateStandard: () => openCalculateScreen('standard'),
      moveCurrentCalculateMenuSelection,
      openSelectedCalculateMenuEntry,
      openCalculusMenuDigitEntry: (digit) => {
        const entry = getCalculusMenuEntryByHotkey(calculusScreen, digit);
        if (entry) {
          openCalculusScreen(entry.target);
        }
      },
      goBackInCalculus,
      moveCurrentCalculusMenuSelection,
      openSelectedCalculusMenuEntry,
      openGeometryMenuDigitEntry: (digit) => {
        const entry = getGeometryMenuEntryByHotkey(geometryScreen, digit);
        if (entry) {
          openGeometryScreen(entry.target);
        }
      },
      goBackInGeometry,
      moveCurrentGeometryMenuSelection,
      openSelectedGeometryMenuEntry,
      openStatisticsMenuDigitEntry: (digit) => {
        const entry = getStatisticsMenuEntryByHotkey(statisticsScreen, digit);
        if (entry) {
          openStatisticsScreen(entry.target);
        }
      },
      goBackInStatistics,
      moveCurrentStatisticsMenuSelection,
      openSelectedStatisticsMenuEntry,
      openTrigMenuDigitEntry: (digit) => {
        const entry = getTrigMenuEntryByHotkey(trigScreen, digit);
        if (entry) {
          openTrigScreen(entry.target);
        }
      },
      goBackInTrigonometry,
      moveCurrentTrigMenuSelection,
      openSelectedTrigMenuEntry,
      openEquationMenuDigitEntry,
      clearCurrentMode,
      moveCurrentEquationMenuSelection,
      openSelectedEquationMenuEntry,
      insertLatex,
      insertLimitPiecewiseTemplate: () => setCalculusMainEditorLatex(buildStarterLimitPiecewiseRequest()),
      deleteBackward: () => executeLatexEditorCommand(activeFieldRef, mainFieldRef, 'deleteBackward'),
      moveToPreviousChar: () => executeLatexEditorCommand(activeFieldRef, mainFieldRef, 'moveToPreviousChar'),
      moveToNextChar: () => executeLatexEditorCommand(activeFieldRef, mainFieldRef, 'moveToNextChar'),
      cycleAngleUnit: () => patchSettings({ angleUnit: cycleAngleUnit(settings.angleUnit) }),
      openLauncher: openMenuInspector,
    });
    if (!keypadLayerLocked && !keypadMomentaryLayer && keypadLayer !== 'base') {
      setKeypadLayer('base');
    }
  }

  const handleWindowKeydown = useEffectEvent((event: KeyboardEvent) => {
    const modifierLayer = physicalModifierLayer(event.key);
    if (modifierLayer) {
      if (modifierLayer === 'alpha') {
        event.preventDefault();
      }
      setKeypadMomentaryLayer(modifierLayer);
      return;
    }

    if (event.key === 'Escape' && (effectiveKeypadLayer !== 'base' || keypadLayerLocked)) {
      event.preventDefault();
      setKeypadMomentaryLayer(null);
      setKeypadLayer('base');
      setKeypadLayerLocked(false);
      return;
    }

    handleWindowKeydownWithDeps({
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
      calculusScreen,
      isCalculusMenuOpen,
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
      openLauncher: openMenuInspector,
      openEquationScreen,
      openCalculateScreen,
      openCalculateMenuDigitEntry,
      openStatisticsScreen,
      openTrigScreen,
      openGeometryScreen,
      openCalculusScreen,
      setMode,
      moveCurrentCalculusMenuSelection,
      openSelectedCalculusMenuEntry,
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
      blurActiveEditor: () => blurLatexEditorTarget(activeFieldRef),
    });
  });

  const handleWindowKeyup = useEffectEvent((event: KeyboardEvent) => {
    if (physicalModifierLayer(event.key)) {
      setKeypadMomentaryLayer(null);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeydown);
    window.addEventListener('keyup', handleWindowKeyup);
    return () => {
      window.removeEventListener('keydown', handleWindowKeydown);
      window.removeEventListener('keyup', handleWindowKeyup);
    };
  }, []);

  const calculusProvenanceBadge =
    isCalculusMode(currentMode) && !isCalculusMenuOpen && displayOutcome?.kind === 'success'
      ? getCalculusProvenanceBadge(displayOutcome.resultOrigin as CalculusResultOrigin | undefined)
      : undefined;
  const calculusResultBadges =
    isCalculusMode(currentMode) && !isCalculusMenuOpen && displayOutcome?.kind === 'success'
      ? ['Calculus']
      : [];
  const calculusStrategyBadge =
    displayOutcome?.kind === 'success'
      ? getCalculusStrategyBadge(displayOutcome.calculusStrategy)
      : undefined;
  const calculusDerivativeStrategyBadges =
    displayOutcome?.kind === 'success'
      ? getCalculusDerivativeStrategyBadges(displayOutcome.calculusDerivativeStrategies)
      : [];
  const calculateResolvedInputLatex =
    displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.resolvedInputLatex
      : undefined;
  const calculateOutcomeLatex =
    currentMode === 'calculate'
      ? calculateResolvedInputLatex ?? activeExpressionLatex()
      : '';
  const isCalculateCalculusOutcome =
    currentMode === 'calculate'
    && displayOutcome?.kind === 'success'
    && (
      calculateScreen !== 'standard'
      || displayOutcome.calculusStrategy !== undefined
      || displayOutcome.calculusDerivativeStrategies !== undefined
      || calculateOutcomeLatex.includes('\\int')
      || calculateOutcomeLatex.includes('\\lim')
      || calculateOutcomeLatex.includes('\\frac{d}')
      || calculateOutcomeLatex.includes('\\frac{\\mathrm{d}}')
    );
  const calculateCalculusProvenanceBadge =
    isCalculateCalculusOutcome && displayOutcome?.kind === 'success'
      ? getCalculusProvenanceLabel(displayOutcome.resultOrigin)
      : undefined;
  const calculateResultBadges =
    isCalculateCalculusOutcome
      ? [
          'Calculus',
          ...(calculateCalculusProvenanceBadge ? [calculateCalculusProvenanceBadge] : []),
        ]
      : [];
  const trigonometryResultBadges =
    currentMode === 'trigonometry' && !isTrigMenuOpen
      ? [
          'Trigonometry',
          ...(
            displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'exact-special-angle'
              ? ['Exact special angle']
              : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'triangle-solver'
                ? ['Triangle solver']
                : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'numeric'
                  ? ['Numeric']
                  : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'symbolic'
                    ? ['Symbolic']
                    : []
          ),
        ]
      : [];
  const geometryResultBadges =
    currentMode === 'geometry' && !isGeometryMenuOpen
      ? [
          'Geometry',
          ...(
            displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'geometry-coordinate'
              ? ['Coordinate']
              : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'geometry-formula'
                ? ['Formula']
                : []
          ),
        ]
      : [];
  const displayResultBadges = [
    ...calculateResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Calculus' ? 'equation-badge' : 'equation-origin-badge',
    })),
    ...calculusResultBadges.map((badge) => ({
      label: badge,
      className: 'equation-badge',
    })),
    ...trigonometryResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Exact special angle' || badge === 'Triangle solver' || badge === 'Numeric'
        ? 'equation-origin-badge'
        : 'equation-badge',
    })),
    ...geometryResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Coordinate' || badge === 'Formula'
        ? 'equation-origin-badge'
        : 'equation-badge',
    })),
    ...equationResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Numeric roots' ? 'equation-origin-badge' : 'equation-badge',
    })),
    ...(calculusProvenanceBadge
      ? [{
          label: calculusProvenanceBadge.label,
          className: `calculus-provenance-badge is-${calculusProvenanceBadge.variant}`,
        }]
      : []),
    ...(calculusStrategyBadge
      ? [{
          label: calculusStrategyBadge.label,
          className: 'equation-badge',
        }]
      : []),
    ...calculusDerivativeStrategyBadges.map((badge) => ({
      label: badge.label,
      className: 'equation-badge',
    })),
    ...(((displayOutcome && 'transformBadges' in displayOutcome ? displayOutcome.transformBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: 'equation-badge',
    }))),
    ...(((displayOutcome && 'solveBadges' in displayOutcome ? displayOutcome.solveBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: 'equation-origin-badge',
    }))),
    ...(((displayOutcome && 'plannerBadges' in displayOutcome ? displayOutcome.plannerBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: badge === 'Hard Stop' ? 'equation-origin-badge' : 'equation-badge',
    }))),
  ];
  const shouldShowCalculateAlgebraTray =
    currentMode === 'calculate'
    && calculateScreen === 'standard'
    && calculateAlgebraTrayOpen;
  const activeAlgebraTransforms = shouldShowCalculateAlgebraTray
    ? calculateAlgebraTransforms
    : shouldShowEquationAlgebraTray
      ? equationAlgebraTransforms
      : [];
  const activeEditorAnalysisStatuses = [
    ...equationEditorAnalysisStatuses,
    currentMode === 'calculate' && calculateScreen === 'standard'
      ? calculateAlgebraTransformAnalysis.status
      : null,
    displayInputLatex ? previewAnalysis.status : null,
  ];
  const activeOoeRuntimeStatus = getPendingRuntimeStatus(
    USER_VISIBLE_OOE_TICKET_CAPABILITY_IDS,
    {
      workspaceInstanceId: workspaceInstancesRuntime.activeInstanceId,
      workspaceInstanceRevision:
        workspaceInstancesRuntime.activeInstance?.navigationRevision,
    },
  );
  const {
    activeRuntimeStatusLabel: activeOoeRuntimeStatusLabel,
    editorRuntimeStopDisabled,
    readyRuntimeStatusLabel,
  } = useDisplayRuntimeStatus({
    activeRuntimeStatus: activeOoeRuntimeStatus,
    editorAnalysisStopped,
    lastRuntimeElapsedMs,
  });
  const editorAnalysisStatusLabel = editorRuntimeStatusOverride
    ?? activeOoeRuntimeStatusLabel
    ?? (editorAnalysisStopped
      ? 'Editor analysis stopped'
      : displayInputLatex.length > EDITOR_ANALYSIS_MAX_LATEX_LENGTH
        ? 'Large input paused'
        : activeEditorAnalysisStatuses.includes('error')
          ? 'Editor analysis error'
        : activeEditorAnalysisStatuses.includes('guarded')
          ? 'Large input paused'
        : activeEditorAnalysisStatuses.includes('analyzing')
          ? 'Analyzing editor'
          : readyRuntimeStatusLabel);
  const showEditorRuntimeControls = !isLauncherOpen && currentMode !== 'guide';
  const calculateGuideArticleId = calculateRouteMeta?.guideArticleId;
  const calculateCalculusGuideArticleId =
    calculateScreen === 'integral'
      ? 'calculus-integrals'
      : calculateScreen === 'limit'
        ? 'calculus-limits'
        : null;
  const calculusCoreGuideArticleId =
    calculusScreen === 'indefiniteIntegral'
      || calculusScreen === 'definiteIntegral'
      || calculusScreen === 'improperIntegral'
      || calculusScreen === 'finiteLimit'
      || calculusScreen === 'infiniteLimit'
      ? 'calculus-integrals-limits'
      : null;
  const calculateKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('calculate'));
  const calculusKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('calculus'));
  const trigonometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('trigonometry'));
  const statisticsKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('statistics'));
  const geometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('geometry'));
  const equationKeyboardLayouts = buildVirtualKeyboardLayouts(
    createKeyboardContext('equation', equationScreen),
  );
  const activeWorkspaceCompartment = resolveWorkspaceCompartment(currentMode, isLauncherOpen);
  const activeWorkspaceBoundaryKey = isLauncherOpen
    ? 'launcher'
    : `${activeWorkspaceCompartment.compartmentId}:${currentMode}`;

  const copyCalculateWorkbenchExpression = () =>
    void copyText(calculateWorkbenchExpression.latex, 'Expression copied');
  const copyCalculusWorkbenchExpression = () =>
    void copyText(calculusWorkbenchExpression, 'Expression copied');
  const copyStatisticsWorkbenchExpression = () =>
    void copyText(statisticsDraftLatex || statisticsWorkbenchExpression, 'Statistics request copied');
  const copyGeometryWorkbenchExpression = () =>
    void copyText(geometryWorkbenchExpression, 'Geometry request copied');

  function renderActiveSideSurface(presentation: SideSurfacePresentation) {
    if (sideSurface === 'settings') {
      return (
        <SettingsPanel
          presentation={presentation}
          settings={settings}
          onClose={closeSettingsPanel}
          onOpenFullPage={() => workspaceTabsRuntime.onOpenAppPageTab(SETTINGS_PAGE_WORKSPACE_KIND)}
          onPatch={patchSettings}
          onClearHistory={resetHistory}
          onResetCalculatorMemory={resetCalculatorMemory}
        />
      );
    }

    if (sideSurface === 'history') {
      return (
        <HistoryPanel
          presentation={presentation}
          history={history} pendingHistory={pendingHistoryTickets}
          modeLabels={MODE_LABELS}
          notationMode={settings.historyInspectorNotationMode}
          onClear={resetHistory}
          onClose={closeHistoryPanel}
          onDelete={deleteHistoryEntryById}
          onOpenFullPage={() => workspaceTabsRuntime.onOpenAppPageTab(HISTORY_PAGE_WORKSPACE_KIND)}
          onReplay={replayHistoryEntry}
          onStopPending={stopPendingHistoryTicket}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
        />
      );
    }

    if (sideSurface === 'variables') {
      return (
        <VariablesPanel
          presentation={presentation}
          variables={variableMemory}
          onClose={closeVariablesPanel}
          onSet={setStoredVariable}
          onInsert={insertStoredVariable}
          onClear={clearStoredVariable}
          onClearAll={clearAllStoredVariables}
        />
      );
    }

    if (sideSurface === 'ooeDiagnostics' && ooeDiagnosticsEnabled) {
      return (
        <OoeDiagnosticsPanel
          presentation={presentation}
          onClose={closeOoeDiagnosticsPanel}
        />
      );
    }

    return null;
  }

  function renderActiveLeftInspector(presentation: SideSurfacePresentation) {
    if (leftInspectorSurface === 'menu') {
      return (
        <MenuInspectorPanel
          presentation={presentation}
          launcherState={launcherState}
          launcherCategories={launcherCategories}
          activeLauncherCategory={activeLauncherCategory}
          activeLauncherLeafId={activeLauncherLeafId}
          onClose={closeLeftInspector}
          onOpenCategory={openInspectorCategoryById}
          onLaunchApp={launchInspectorApp}
          onSetLauncherState={setLauncherState}
        />
      );
    }

    return null;
  }

  return (
    <MathNotationProvider
      notationMode={settings.mathNotationDisplay}
      displayPrefs={symbolicDisplayPrefs}
    >
      <LanguageProvider languageCode={settings.languageCode}>
      <EditorAnalysisControlProvider value={editorAnalysisControl}>
      <div className="app-shell" lang={settings.languageCode}>
      <div
        className="app-stage"
        data-testid="app-stage"
        data-side-surface={quickInspectorPolicy.effectiveSideSurface === 'none' ? undefined : quickInspectorPolicy.effectiveSideSurface}
        data-side-surface-presentation={
          quickInspectorPolicy.effectiveSideSurface === 'none' ? 'none' : sideSurfacePresentation
        }
        ref={appStageRef}
      >
      <div
        className="app-frame"
        data-testid="app-frame"
        style={appFrameStyle}
      >
        <WorkspaceTabs {...workspaceTabsRuntime} />
        <ActiveSurfaceHost
          activeInstance={workspaceInstancesRuntime.activeInstance}
          guide={{
            article: guideArticle ?? null,
            currentSelectionIndex: currentGuideSelectionIndex,
            homeEntryCount: activeGuideHomeEntries.length,
            listEntries: guideListEntries,
            menuPanelRef: guideMenuPanelRef,
            modeRef: guideModeRef ?? null,
            onCopyGuideExample: (example) =>
              void copyText(copyableGuideExampleLatex(example), 'Example copied'),
            onLaunchGuideExample: launchGuideExample,
            onOpenGuideRoute: openGuideRoute,
            onSetCurrentSelectionIndex: setCurrentGuideSelectionIndex,
            onSetGuideQuery: setGuideQuery,
            route: guideRoute,
            routeMeta: guideRouteMeta,
            searchInputRef: guideSearchInputRef,
            searchQuery: guideSearchQuery,
            selectedGuideListEntry,
          }}
          history={history} modeLabels={MODE_LABELS}
          onCopyResult={(latex) => void copyText(latex, 'Result copied')}
          onDeleteHistoryEntry={deleteHistoryEntryById} onDeleteSelectedHistoryEntries={(ids) => ids.forEach(deleteHistoryEntryById)}
          onFocusTab={workspaceTabsRuntime.onFocusTab}
          onPatchSettings={patchSettings} onReplayHistoryEntry={replayHistoryEntry}
          onReplayHistoryEntryInNewTab={replayHistoryEntryInNewTab} onResetCalculatorMemory={resetCalculatorMemory}
          onResetHistory={resetHistory} onStopPendingHistoryTicket={stopPendingHistoryTicket}
          pendingHistory={pendingHistoryTickets} settings={settings}
          renderCalculatorSurface={() => (
      <div
        className={`calculator-shell${settings.highContrast ? ' is-high-contrast' : ''}`}
        data-testid="calculator-shell"
        ref={calculatorShellRef}
        style={calculatorShellStyle}
      >
        <ModeStrip
          MODE_LABELS={MODE_LABELS}
          currentMode={currentMode}
          cycleAngleUnit={cycleAngleUnit}
          historyOpen={quickInspectorPolicy.effectiveHistoryOpen}
          isLauncherOpen={isLauncherOpen}
          labsEnabled={labsEnabled}
          ooeDiagnosticsEnabled={ooeDiagnosticsEnabled}
          ooeDiagnosticsOpen={quickInspectorPolicy.effectiveOoeDiagnosticsOpen}
          openCalculusScreen={openCalculusScreen}
          openGeometryScreen={openGeometryScreen}
          openGuideHome={openGuideHome}
          openStatisticsScreen={openStatisticsScreen}
          openTrigScreen={openTrigScreen}
          patchSettings={patchSettings}
          runtimeLabel={runtimeLabel}
          setMode={setMode}
          settings={settings}
          settingsOpen={quickInspectorPolicy.effectiveSettingsOpen}
          showModeTabs={showModeTabs}
          toggleHistoryPanel={toggleHistoryPanel}
          toggleOoeDiagnosticsPanel={toggleOoeDiagnosticsPanel}
          toggleSettingsPanel={toggleSettingsPanel}
          toggleVariablesPanel={toggleVariablesPanel}
          variablesOpen={quickInspectorPolicy.effectiveVariablesOpen}
        />
        <DisplayPanel
          activeAlgebraTransforms={activeAlgebraTransforms}
          activeExpressionLatex={activeExpressionLatex}
          activeFieldRef={activeFieldRef}
          activeLauncherCategory={activeLauncherCategory}
          activeResultCopyText={activeResultCopyText}
          activeResultEditorLatex={activeResultEditorLatex}
          calculusMainEditorActive={calculusMainEditorActive}
          calculusMainEditorLatex={calculusMainEditorLatex}
          calculusMainEditorVariable={calculusMainEditorVariable}
          calculusKeyboardLayouts={calculusKeyboardLayouts}
          calculusMenuFooterText={calculusMenuFooterText}
          calculusRouteMeta={calculusRouteMeta}
          calculusScreen={calculusScreen}
          calculateKeyboardLayouts={calculateKeyboardLayouts}
          calculateLatex={calculateLatex}
          calculateRouteMeta={calculateRouteMeta}
          calculateScreen={calculateScreen}
          clipboardNotice={clipboardNotice}
          copyText={copyText}
          copyableGuideExampleLatex={copyableGuideExampleLatex}
          currentMode={currentMode}
          deferredDisplayLatex={deferredDisplayLatex}
          derivativePointValueRef={derivativePointValueRef}
          derivativePointWorkbench={derivativePointWorkbench} derivativeWorkbench={derivativeWorkbench} implicitDerivativeState={implicitDerivativeState}
          displayHeaderLabel={displayHeaderLabel}
          displayMathLatex={displayMathLatex}
          displayOutcome={displayOutcome}
          displayResultBadges={displayResultBadges}
          editorAnalysisStatusLabel={editorAnalysisStatusLabel}
          editorAnalysisStopped={editorAnalysisStopped}
          editorRuntimeStopDisabled={editorRuntimeStopDisabled}
          editActiveExpression={editActiveExpression}
          equationKeyboardLayouts={equationKeyboardLayouts}
          equationLatex={equationLatex}
          equationMenuFooterText={equationMenuFooterText}
          equationResultTitle={equationResultTitle}
          equationRouteMeta={equationRouteMeta}
          equationScreen={equationScreen}
          equationSolveTarget={equationSolveTargetResolution?.selectedTarget ?? equationSolveTarget} formulaViewerSourceContext={formulaViewerSourceContextForWorkspaceInstance(workspaceInstancesRuntime.activeInstance)}
          geometryDraftFieldRef={geometryDraftFieldRef}
          geometryDraftLatex={geometryDraftLatex}
          geometryKeyboardLayouts={geometryKeyboardLayouts}
          geometryMenuFooterText={geometryMenuFooterText}
          geometryRouteMeta={geometryRouteMeta}
          geometryScreen={geometryScreen}
          getAlgebraTransformLabel={getEquationAlgebraActionLabel}
          getPeriodicStopReasonText={getPeriodicStopReasonText}
          guideArticle={guideArticle}
          guideModeRef={guideModeRef}
          guideRoute={guideRoute}
          guideRouteMeta={guideRouteMeta}
          guideSearchInputRef={guideSearchInputRef}
          guideSearchQuery={guideSearchQuery}
          hydrated={hydrated}
          isCalculusMenuOpen={isCalculusMenuOpen}
          isEquationMenuOpen={isEquationMenuOpen}
          isEquationWorkScreen={isEquationWorkScreen}
          isGeometryMenuOpen={isGeometryMenuOpen}
          isLauncherOpen={isLauncherOpen}
          isStatisticsMenuOpen={isStatisticsMenuOpen}
          isTrigMenuOpen={isTrigMenuOpen}
          labsRuntime={labsRuntime}
          launchGuideExample={launchGuideExample}
          launcherState={launcherState}
          loadLatexIntoEditor={loadLatexIntoEditor}
          mainFieldRef={mainFieldRef} matrixEditorLatex={linearAlgebraRuntime.matrixEditorLatex} matrixKeyboardLayouts={matrixKeyboardLayouts} onOpenFormulaViewer={workspaceTabsRuntime.onOpenFormulaViewerTab}
          canonicalizeMatrixEditorPaste={linearAlgebraRuntime.canonicalizeMatrixEditorPaste}
          canonicalizeVectorEditorPaste={linearAlgebraRuntime.canonicalizeVectorEditorPaste}
          onRestartEditorAnalysis={restartEditorAnalysis}
          onRunEditor={runEditorPrimaryAction}
          onStopEditorAnalysis={stopEditorAnalysis}
          openPromptTarget={openPromptTarget}
          pasteIntoEditor={pasteIntoEditor}
          runCalculateAction={runCalculateAction}
          runCalculateAlgebraTransformAction={runCalculateAlgebraTransformAction}
          runEquationAlgebraTransformAction={runEquationAlgebraTransformAction}
          selectedCalculusMenuEntry={selectedCalculusMenuEntry}
          selectedEquationMenuEntry={selectedEquationMenuEntry}
          selectedGeometryMenuEntry={selectedGeometryMenuEntry}
          selectedGuideExample={selectedGuideExample}
          selectedGuideListEntry={selectedGuideListEntry}
          selectedLauncherApp={selectedLauncherApp}
          selectedLauncherCategory={selectedLauncherCategory}
          selectedStatisticsMenuEntry={selectedStatisticsMenuEntry}
          selectedTrigMenuEntry={selectedTrigMenuEntry}
          setCalculateLatex={setCalculateLatex}
          setCalculusMainEditorLatex={setCalculusMainEditorLatex}
          setDerivativePointWorkbench={setDerivativePointWorkbench} setDerivativeWorkbench={setDerivativeWorkbench} setImplicitDerivativeState={setImplicitDerivativeState}
          setEquationLatex={setEquationLatex} setGuideQuery={setGuideQuery} setMatrixEditorLatex={linearAlgebraRuntime.setMatrixEditorLatex}
          settings={settings}
          showEditorRuntimeControls={showEditorRuntimeControls}
          shouldShowCalculateAlgebraTray={shouldShowCalculateAlgebraTray}
          shouldShowEquationAlgebraTray={shouldShowEquationAlgebraTray}
          statisticsDraftFieldRef={statisticsDraftFieldRef}
          statisticsDraftLatex={statisticsDraftLatex}
          statisticsKeyboardLayouts={statisticsKeyboardLayouts}
          statisticsMenuFooterText={statisticsMenuFooterText}
          partialDerivativeState={partialDerivativeState}
          statisticsRouteMeta={statisticsRouteMeta}
          statisticsScreen={statisticsScreen} setPartialDerivativeState={setPartialDerivativeState}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
          trigDraftFieldRef={trigDraftFieldRef}
          trigDraftLatex={trigDraftLatex}
          trigMenuFooterText={trigMenuFooterText}
          trigRouteMeta={trigRouteMeta}
          trigScreen={trigScreen}
          triggerDisplayOutcomeAction={triggerDisplayOutcomeAction}
          trigonometryKeyboardLayouts={trigonometryKeyboardLayouts}
          updateGeometryDraft={updateGeometryDraft}
          updateStatisticsDraft={updateStatisticsDraft}
          updateTrigDraft={updateTrigDraft}
          variableMemory={variableMemory} vectorEditorLatex={linearAlgebraRuntime.vectorEditorLatex} vectorKeyboardLayouts={vectorKeyboardLayouts} setVectorEditorLatex={linearAlgebraRuntime.setVectorEditorLatex}
        />
        <SoftMenu actions={activeSoftMenu} onAction={handleSoftAction} />
        <main className="workspace">
          <div className="mode-workspace">
            <CompartmentErrorBoundary
              key={activeWorkspaceBoundaryKey}
              compartmentId={activeWorkspaceCompartment.compartmentId}
              compartmentLabel={activeWorkspaceCompartment.compartmentLabel}
              surfaceLabel={activeWorkspaceCompartment.surfaceLabel}
            >
              <Suspense fallback={<LazyWorkspaceFallback />}>
              {isLauncherOpen ? (
                <LauncherWorkspace
                  launcherState={launcherState}
                  launcherCategories={launcherCategories}
                  activeLauncherCategory={activeLauncherCategory}
                  activeLauncherLeafId={activeLauncherLeafId}
                  onOpenCategory={openLauncherCategoryById}
                  onLaunchApp={launchLauncherApp}
                  onSetLauncherState={setLauncherState}
                />
              ) : null}

            {!isLauncherOpen && currentMode === 'calculate' ? (
              <CalculateWorkspace
                screen={calculateScreen}
                isMenuOpen={isCalculateMenuOpen}
                routeMeta={calculateRouteMeta}
                guideArticleId={calculateGuideArticleId ?? null}
                calculusGuideArticleId={calculateCalculusGuideArticleId ?? null}
                menuPanelRef={calculateMenuPanelRef}
                menuEntries={calculateMenuEntries}
                menuSelection={calculateMenuSelection}
                menuFooterText={calculateMenuFooterText}
                onOpenMenuEntry={openCalculateMenuEntry}
                onSetMenuSelection={setCalculateMenuSelection}
                onOpenGuideArticle={openGuideArticle}
                onOpenGuideMode={() => openGuideMode('calculate')}
                onLoadWorkbenchToEditor={() => loadLatexIntoEditor(calculateWorkbenchExpression.latex)}
                onCopyWorkbenchExpression={copyCalculateWorkbenchExpression}
                onRegisterActiveField={(field) => {
                  activeFieldRef.current = field;
                }}
                keyboardLayouts={calculateKeyboardLayouts}
                workbenchLatex={calculateWorkbenchExpression.latex}
                derivativeFieldRef={derivativeFieldRef}
                derivativeWorkbench={derivativeWorkbench}
                setDerivativeWorkbench={setDerivativeWorkbench}
                derivativePointFieldRef={derivativePointFieldRef}
                derivativePointValueRef={derivativePointValueRef}
                derivativePointWorkbench={derivativePointWorkbench}
                setDerivativePointWorkbench={setDerivativePointWorkbench}
                integralFieldRef={integralFieldRef}
                integralLowerRef={integralLowerRef}
                integralWorkbench={integralWorkbench}
                setIntegralWorkbench={setIntegralWorkbench}
                limitFieldRef={limitFieldRef}
                limitTargetRef={limitTargetRef}
                limitWorkbench={limitWorkbench}
                setLimitWorkbench={setLimitWorkbench}
                activeMilestoneTitle={ACTIVE_MILESTONE_TITLE}
                variableMemory={variableMemory}
              />
            ) : null}

            {!isLauncherOpen && isCalculusMode(currentMode) ? (
              <CalculusWorkspace
                screen={calculusScreen}
                isMenuOpen={isCalculusMenuOpen}
                routeMeta={calculusRouteMeta}
                coreGuideArticleId={calculusCoreGuideArticleId}
                menuPanelRef={calculusMenuPanelRef}
                menuEntries={calculusMenuEntries}
                menuSelection={currentCalculusMenuIndex}
                menuFooterText={calculusMenuFooterText}
                onOpenScreen={openCalculusScreen}
                onSetMenuSelection={setCurrentCalculusMenuIndex}
                onOpenGuideArticle={openGuideArticle}
                onOpenGuideMode={() => openGuideMode('calculus')}
                onLoadWorkbenchToEditor={() => loadLatexIntoEditor(calculusWorkbenchExpression)}
                onCopyWorkbenchExpression={copyCalculusWorkbenchExpression}
                onRegisterActiveField={(field) => {
                  activeFieldRef.current = field;
                }}
                keyboardLayouts={calculusKeyboardLayouts}
                workbenchLatex={calculusWorkbenchExpression}
                derivativePointValueRef={derivativePointValueRef}
                derivativeWorkbench={derivativeWorkbench}
                setDerivativeWorkbench={setDerivativeWorkbench}
                calculusFiniteLimitFieldRef={calculusFiniteLimitFieldRef}
                calculusInfiniteLimitFieldRef={calculusInfiniteLimitFieldRef}
                maclaurinFieldRef={maclaurinFieldRef}
                taylorFieldRef={taylorFieldRef}
                partialDerivativeFieldRef={partialDerivativeFieldRef}
                firstOrderOdeLhsFieldRef={firstOrderOdeLhsFieldRef}
                firstOrderOdeRhsFieldRef={firstOrderOdeRhsFieldRef}
                secondOrderOdeForcingFieldRef={secondOrderOdeForcingFieldRef}
                numericIvpFieldRef={numericIvpFieldRef}
                calculusDefiniteLowerRef={calculusDefiniteLowerRef}
                calculusImproperLowerRef={calculusImproperLowerRef}
                calculusFiniteLimitTargetRef={calculusFiniteLimitTargetRef}
                taylorCenterRef={taylorCenterRef}
                secondOrderA2Ref={secondOrderA2Ref}
                numericIvpX0Ref={numericIvpX0Ref}
                derivativePointWorkbench={derivativePointWorkbench}
                setDerivativePointWorkbench={setDerivativePointWorkbench}
                calculusIndefiniteIntegral={calculusIndefiniteIntegral} setCalculusIndefiniteIntegral={setCalculusIndefiniteIntegral}
                calculusDefiniteIntegral={calculusDefiniteIntegral} setCalculusDefiniteIntegral={setCalculusDefiniteIntegral}
                calculusImproperIntegral={calculusImproperIntegral} setCalculusImproperIntegral={setCalculusImproperIntegral}
                calculusFiniteLimit={calculusFiniteLimit}
                setCalculusFiniteLimit={setCalculusFiniteLimit}
                calculusInfiniteLimit={calculusInfiniteLimit}
                setCalculusInfiniteLimit={setCalculusInfiniteLimit}
                maclaurinState={maclaurinState}
                setMaclaurinState={setMaclaurinState}
                taylorState={taylorState}
                setTaylorState={setTaylorState}
                partialDerivativeState={partialDerivativeState}
                setPartialDerivativeState={setPartialDerivativeState}
                firstOrderOdeState={firstOrderOdeState}
                setFirstOrderOdeState={setFirstOrderOdeState}
                secondOrderOdeState={secondOrderOdeState}
                setSecondOrderOdeState={setSecondOrderOdeState}
                numericIvpState={numericIvpState}
                setNumericIvpState={setNumericIvpState}
                variableMemory={variableMemory}
              />
            ) : null}

            {!isLauncherOpen && currentMode === 'trigonometry' ? (
              <TrigonometryWorkspace
                routeMeta={trigRouteMeta}
                screen={trigScreen}
                isMenuOpen={isTrigMenuOpen}
                menuPanelRef={trigMenuPanelRef}
                menuEntries={trigMenuEntries}
                currentMenuIndex={currentTrigMenuIndex}
                menuFooterText={trigMenuFooterText}
                settingsAngleUnit={settings.angleUnit}
                onOpenScreen={openTrigScreen}
                onHoverMenuIndex={setCurrentTrigMenuIndex}
                onOpenToolGuide={() => openTrigGuideForScreen(trigScreen)}
                onOpenModeGuide={() => openGuideMode('trigonometry')}
                workbenchExpression={trigWorkbenchExpression}
                onCopyExpression={() => void copyText(trigWorkbenchExpression, 'Trigonometry request copied')}
                trigFunctionState={trigFunctionState}
                setTrigFunctionState={setTrigFunctionState}
                trigIdentityState={trigIdentityState}
                setTrigIdentityState={setTrigIdentityState}
                trigEquationState={trigEquationState}
                setTrigEquationState={setTrigEquationState}
                rightTriangleState={rightTriangleState}
                setRightTriangleState={setRightTriangleState}
                sineRuleState={sineRuleState}
                setSineRuleState={setSineRuleState}
                cosineRuleState={cosineRuleState}
                setCosineRuleState={setCosineRuleState}
                angleConvertState={angleConvertState}
                setAngleConvertState={setAngleConvertState}
                periodPhaseState={periodPhaseState}
                setPeriodPhaseState={setPeriodPhaseState}
                trigTargetFormLabels={trigTargetFormLabels}
                onLoadDraft={loadTrigDraft}
                onLoadSpecialAngleExample={(expressionLatex) => {
                  setSpecialAnglesExpression(expressionLatex);
                  loadTrigDraft(expressionLatex, 'guided', true);
                  setClipboardNotice('Special-angle example loaded');
                }}
                rightTriangleSideARef={rightTriangleSideARef}
                sineRuleSideARef={sineRuleSideARef}
                cosineRuleSideARef={cosineRuleSideARef}
                angleConvertValueRef={angleConvertValueRef}
              />
            ) : null}

            {!isLauncherOpen && currentMode === 'statistics' ? (
              <StatisticsWorkspace
                routeMeta={statisticsRouteMeta}
                screen={statisticsScreen}
                isMenuOpen={isStatisticsMenuOpen}
                menuPanelRef={statisticsMenuPanelRef}
                menuEntries={statisticsMenuEntries}
                currentMenuIndex={currentStatisticsMenuIndex}
                menuFooterText={statisticsMenuFooterText}
                onOpenScreen={openStatisticsScreen}
                onHoverMenuIndex={setCurrentStatisticsMenuIndex}
                onOpenToolGuide={() => openStatisticsGuideForScreen()}
                onOpenModeGuide={() => openGuideMode('statistics')}
                dataset={statsDataset}
                datasetText={statisticsDatasetText}
                datasetRef={statisticsDatasetRef}
                onUpdateDataset={updateStatisticsDataset}
                filledFrequencyRowCount={statisticsFilledFrequencyRowCount}
                sourceSyncSummary={statisticsSourceSyncSummary}
                workingSource={statisticsWorkingSource}
                onSwitchSource={switchStatisticsSource}
                onImportDatasetIntoFrequencyTable={importDatasetIntoFrequencyTable}
                onExpandTableToDataset={expandStatisticsTableToDataset}
                onUseInStatistics={() => loadStatisticsDraft(buildStatisticsDraftForScreen(statisticsScreen), 'guided', true)}
                workbenchExpression={statisticsWorkbenchExpression}
                onCopyWorkbenchExpression={copyStatisticsWorkbenchExpression}
                frequencyTable={frequencyTable}
                frequencyValueRef={statisticsFrequencyValueRef}
                onUpdateFrequencyRow={updateStatisticsFrequencyRow}
                onRemoveFrequencyRow={removeStatisticsFrequencyRow}
                onAddFrequencyRow={addStatisticsFrequencyRow}
                binomialState={binomialState}
                setBinomialState={setBinomialState}
                normalState={normalState}
                setNormalState={setNormalState}
                poissonState={poissonState}
                setPoissonState={setPoissonState}
                meanInferenceState={meanInferenceState}
                setMeanInferenceState={setMeanInferenceState}
                statisticsBinomialNRef={statisticsBinomialNRef}
                statisticsNormalMeanRef={statisticsNormalMeanRef}
                statisticsPoissonLambdaRef={statisticsPoissonLambdaRef}
                statisticsMeanInferenceLevelRef={statisticsMeanInferenceLevelRef}
                regressionState={regressionState}
                correlationState={correlationState}
                statisticsRegressionXRef={statisticsRegressionXRef}
                statisticsCorrelationXRef={statisticsCorrelationXRef}
                onUpdateRegressionPointDraft={updateRegressionPointDraft}
                onRemoveRegressionPoint={removeRegressionPoint}
                onAddRegressionPoint={addRegressionPoint}
                statisticsRegressionText={statisticsRegressionText}
                statisticsCorrelationText={statisticsCorrelationText}
              />
            ) : null}

            {!isLauncherOpen && currentMode === 'geometry' ? (
              <GeometryWorkspace
                routeMeta={geometryRouteMeta}
                screen={geometryScreen}
                isMenuOpen={isGeometryMenuOpen}
                menuPanelRef={geometryMenuPanelRef}
                menuEntries={geometryMenuEntries}
                currentMenuIndex={currentGeometryMenuIndex}
                menuFooterText={geometryMenuFooterText}
                onOpenScreen={openGeometryScreen}
                onHoverMenuIndex={setCurrentGeometryMenuIndex}
                onOpenToolGuide={() => openGeometryGuideForScreen(geometryScreen)}
                onOpenModeGuide={() => openGuideMode('geometry')}
                solveMissingTemplates={geometrySolveMissingTemplates(geometryScreen)}
                onLoadSolveMissingTemplate={loadGeometrySolveMissingTemplate}
                workbenchExpression={geometryWorkbenchExpression}
                onUseInGeometry={() => loadGeometryDraft(buildGeometryDraftForScreen(geometryScreen), 'guided', true)}
                onCopyExpression={copyGeometryWorkbenchExpression}
                squareState={squareState}
                setSquareState={setSquareState}
                squareSideRef={squareSideRef}
                rectangleState={rectangleState}
                setRectangleState={setRectangleState}
                rectangleWidthRef={rectangleWidthRef}
                triangleAreaState={triangleAreaState}
                setTriangleAreaState={setTriangleAreaState}
                triangleAreaBaseRef={triangleAreaBaseRef}
                triangleHeronState={triangleHeronState}
                setTriangleHeronState={setTriangleHeronState}
                triangleHeronARef={triangleHeronARef}
                circleState={circleState}
                setCircleState={setCircleState}
                circleRadiusRef={circleRadiusRef}
                arcSectorState={arcSectorState}
                setArcSectorState={setArcSectorState}
                arcSectorRadiusRef={arcSectorRadiusRef}
                cubeState={cubeState}
                setCubeState={setCubeState}
                cubeSideRef={cubeSideRef}
                cuboidState={cuboidState}
                setCuboidState={setCuboidState}
                cuboidLengthRef={cuboidLengthRef}
                cylinderState={cylinderState}
                setCylinderState={setCylinderState}
                cylinderRadiusRef={cylinderRadiusRef}
                coneState={coneState}
                setConeState={setConeState}
                coneRadiusRef={coneRadiusRef}
                sphereState={sphereState}
                setSphereState={setSphereState}
                sphereRadiusRef={sphereRadiusRef}
                distanceState={distanceState}
                setDistanceState={setDistanceState}
                distanceP1XRef={distanceP1XRef}
                midpointState={midpointState}
                setMidpointState={setMidpointState}
                midpointP1XRef={midpointP1XRef}
                slopeState={slopeState}
                setSlopeState={setSlopeState}
                slopeP1XRef={slopeP1XRef}
                lineEquationState={lineEquationState}
                setLineEquationState={setLineEquationState}
                lineEquationP1XRef={lineEquationP1XRef}
                lineFormLabels={lineFormLabels}
              />
            ) : null}

            {!isLauncherOpen && currentMode === 'labs' && labsEnabled ? (
              <LabsPanel runtime={labsRuntime} />
            ) : null}

            {!isLauncherOpen && currentMode === 'guide' ? (
              <GuideWorkspace
                route={guideRoute}
                routeMeta={guideRouteMeta}
                listEntries={guideListEntries}
                currentSelectionIndex={currentGuideSelectionIndex}
                homeEntryCount={activeGuideHomeEntries.length}
                searchInputRef={guideSearchInputRef}
                menuPanelRef={guideMenuPanelRef}
                searchQuery={guideSearchQuery}
                article={guideArticle ?? null}
                modeRef={guideModeRef ?? null}
                onOpenGuideRoute={openGuideRoute}
                onSetCurrentSelectionIndex={setCurrentGuideSelectionIndex}
                onSetGuideQuery={setGuideQuery}
                onLaunchGuideExample={launchGuideExample}
                onCopyGuideExample={(example) => void copyText(copyableGuideExampleLatex(example), 'Example copied')}
              />
            ) : null}

            {!isLauncherOpen && currentMode === 'equation' ? (
              <EquationWorkspace
                {...equationWorkspaceProps}
              />
            ) : null}

            {isLinearAlgebraTableMode ? (
              <LinearAlgebraTableWorkspaceHost
                {...buildLinearAlgebraTableWorkspaceHostProps({
                  onOpenGuideArticle: openGuideArticle,
                  onOpenGuideMode: openGuideMode,
                })}
              />
            ) : null}
              </Suspense>
            </CompartmentErrorBoundary>
          </div>
        </main>
        <KeypadPanel
          rows={keypadRows}
          activeLayer={effectiveKeypadLayer}
          layerLocked={keypadLayerLocked}
          onKeypad={handleKeypad}
          onSelectLayer={selectKeypadLayer}
          onToggleLayerLock={toggleKeypadLayerLock}
        />
      </div>
          )}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
          workspaceInstances={workspaceInstancesRuntime.workspaceInstances}
        />
      </div>

        <Suspense fallback={<LazySideSurfaceFallback />}>
          <SideSurfaceHost
            sideSurface={quickInspectorPolicy.effectiveLeftInspectorSurface}
            side={leftInspectorSide}
            hostStyle={leftInspectorHostStyle}
            outboardOpen={quickInspectorPolicy.effectiveLeftInspectorOutboardOpen}
            overlayOpen={quickInspectorPolicy.effectiveLeftInspectorOverlayOpen}
            onClose={closeLeftInspector}
            renderSurface={renderActiveLeftInspector}
          />
          <SideSurfaceHost
            sideSurface={quickInspectorPolicy.effectiveSideSurface}
            side={sideSurfaceSide}
            hostStyle={sideSurfaceHostStyle}
            outboardOpen={quickInspectorPolicy.effectiveSideSurfaceOutboardOpen}
            overlayOpen={quickInspectorPolicy.effectiveSideSurfaceOverlayOpen}
            onClose={closeSideSurface}
            renderSurface={renderActiveSideSurface}
          />
        </Suspense>
      </div>
      </div>
      </EditorAnalysisControlProvider>
      </LanguageProvider>
    </MathNotationProvider>
  );
}
