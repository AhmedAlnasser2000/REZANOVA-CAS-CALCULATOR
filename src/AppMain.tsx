import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { MathNotationProvider } from './components/MathNotationContext';
import { CalculateWorkspace } from './app/workspaces/CalculateWorkspace';
import { DisplayPanel } from './app/shell/DisplayPanel';
import { KeypadPanel } from './app/shell/KeypadPanel';
import { LauncherWorkspace } from './app/shell/LauncherWorkspace';
import { MenuInspectorPanel } from './app/shell/MenuInspectorPanel';
import { ModeStrip } from './app/shell/ModeStrip';
import { SideSurfaceHost } from './app/shell/SideSurfaceHost';
import { SoftMenu } from './app/shell/SoftMenu';
import {
  useSideSurfaceRuntime,
  type SideSurfacePresentation,
} from './app/runtime/useSideSurfaceRuntime';
import { useCalculatorMemoryPersistence } from './app/runtime/useCalculatorMemoryPersistence';
import { useLauncherRuntime } from './app/runtime/useLauncherRuntime';
import { useShellFocusRuntime } from './app/runtime/useShellFocusRuntime';
import { useLinearAlgebraRuntime } from './app/runtime/useLinearAlgebraRuntime';
import { useTableRuntime } from './app/runtime/useTableRuntime';
import { useLabsRuntime } from './app/runtime/useLabsRuntime';
import { useTrigonometryRuntime } from './app/runtime/useTrigonometryRuntime';
import { useStatisticsRuntime } from './app/runtime/useStatisticsRuntime';
import { useGeometryRuntime } from './app/runtime/useGeometryRuntime';
import { useGuideRuntime } from './app/runtime/useGuideRuntime';
import { useCalculusRuntime } from './app/runtime/useCalculusRuntime';
import { useCalculateRuntime } from './app/runtime/useCalculateRuntime';
import { EditorAnalysisControlProvider } from './lib/editor/editor-analysis-control-provider';
import { EDITOR_ANALYSIS_MAX_LATEX_LENGTH } from './lib/editor/editor-analysis-runtime';
import { useEditorAnalysis } from './lib/editor/use-editor-analysis';
import { useAsyncEditorAnalysis } from './lib/editor/use-async-editor-analysis';
import {
  getAdvancedCalcMenuEntryByHotkey,
  getAdvancedCalcSoftActions,
} from './lib/advanced-calc/navigation';
import {
  normalizeRelationOperatorLatex,
  trimHarmlessTrailingMathSpacing,
} from './lib/input/input-canonicalization';
import {
  buildPendingHistoryTicket,
  discardPendingHistoryTicket as discardPendingHistoryTicketById,
  hasActivePendingHistoryTickets,
  hasStoppingPendingHistoryTickets,
  markPendingHistoryTicketStopping,
  sortHistoryEntriesByLaunchOrder,
} from './lib/ooe/launch-tickets';
import {
  getGeometryMenuEntryByHotkey,
  getGeometryParentScreen,
  getGeometrySoftActions,
} from './lib/geometry/navigation';
import { getAdvancedCalcProvenanceBadge } from './lib/advanced-calc/ui';
import {
  getCalculusDerivativeStrategyBadges,
  getCalculusStrategyBadge,
} from './lib/calculus/calculus-strategy';
import {
  canonicalizeCalculusMode,
  isCalculusMode,
  mapLegacyCalculateScreenToCalculusScreen,
} from './lib/calculus/calculus-identity';
import { setNumericOutputSettings } from './lib/display/numeric-output';
import {
  getCalculateSoftActions,
} from './lib/modes/calculate-navigation';
import {
  type AlgebraTransformAction,
  getAlgebraTransformLabel,
} from './lib/algebra/algebra-transform-ui';
import { copyableGuideExampleLatex } from './lib/guide/examples';
import {
  inferEquationReplayTarget,
} from './lib/equation/equation-history';
import {
  resolveEquationSolveTarget,
  type EquationSolveTargetResolution,
} from './lib/equation/equation-target-resolution';
import {
  getEquationMenuEntries,
  getEquationMenuEntryAtIndex,
  getEquationMenuEntryByHotkey,
  getEquationParentScreen,
  getEquationSoftActions,
  isEquationMenuScreen,
  isPolynomialEquationScreen,
  isSimultaneousEquationScreen,
  moveEquationMenuIndex,
} from './lib/equation/equation-navigation';
import {
  getEquationDisplayTitle,
  getEquationMenuFooterText,
  getEquationRouteMeta,
} from './lib/equation/equation-ux';
import {
  LAUNCHER_SOFT_ACTIONS,
  createLauncherStateForMode,
  openLauncherCategory,
} from './lib/navigation/launcher';
import {
  KEYPAD_ROWS,
  MODE_LABELS,
  SOFT_MENU_BY_MODE,
  resolveKeypadButtonForLayer,
  type KeypadButton,
  type KeypadLayer,
} from './lib/navigation/menu';
import {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  POLYNOMIAL_VIEW_META,
  equationInputLatexForScreen,
} from './lib/modes/equation-ui-model';
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
  createId,
  cycleAngleUnit,
  defaultEquationNumericSolvePanelState,
  emptySystem,
  menuIndexForEquationScreen,
  polynomialTemplateLatex,
} from './app/logic/appUtils';
import {
  appendHistoryEntry,
  bootApp,
  clearCalculatorMemorySnapshot,
  clearHistoryEntries,
  deleteHistoryEntry,
  isDesktopRuntime,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  persistMode,
  persistSettings,
  persistVariableMemory,
} from './lib/app-state/tauri';
import {
  buildStoredVariableValue,
  removeStoredVariableValue,
  upsertStoredVariableValue,
} from './lib/algebra/variable-memory-store';
import { namedVariableEditorLatex } from './lib/algebra/named-variable';
import {
  createEquationRuntimeController,
} from './app/logic/runtimeControllers';
import type { RunEquationModeRequest } from './lib/modes/equation';
import { executePrimaryActionWithDeps } from './app/logic/primaryActionRouter';
import { handleSoftActionWithDeps } from './app/logic/softActionRouter';
import { handleKeypadWithDeps } from './app/logic/keypadRouter';
import { handleWindowKeydownWithDeps } from './app/logic/windowKeyRouter';
import {
  DEFAULT_SETTINGS,
  type AdvancedCalcResultOrigin,
  type CalculatorMemorySnapshot,
  type AdvancedCalcScreen,
  type CalculateScreen,
  type EquationScreen,
  type DisplayOutcomeAction,
  type DisplayOutcome,
  type GuideExample,
  type HistoryEntry,
  type PendingHistoryTicket,
  type ModeId,
  type GeometryScreen,
  type PolynomialEquationView,
  type PeriodicFamilyInfo,
  type ResultOrigin,
  type Settings,
  type SettingsPatch,
  type SimultaneousEquationView,
  type StatisticsScreen,
  type StoredVariableValue,
  type TrigScreen,
  type VariableSubstitutionSnapshot,
} from './types/calculator';
import { formatMathTextForDisplay, latexToVisibleText } from './lib/display/math-notation';

const AdvancedCalculusWorkspace = lazy(() =>
  import('./app/workspaces/AdvancedCalculusWorkspace').then((module) => ({
    default: module.AdvancedCalculusWorkspace,
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

const CALCULATOR_MEMORY_VERSION = 1 as const;

export default function App() {
  const showModeTabs = import.meta.env.DEV && import.meta.env.VITE_SHOW_MODE_TABS === '1';
  const labsEnabled = import.meta.env.DEV && import.meta.env.VITE_SHOW_LABS === '1';
  const ooeDiagnosticsEnabled =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_OOE_DIAGNOSTICS === '1';
  const labsRuntime = useLabsRuntime({ labsEnabled });
  const [currentMode, setCurrentMode] = useState<ModeId>('calculate');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingHistoryTickets, setPendingHistoryTickets] = useState<PendingHistoryTicket[]>([]);
  const [variableMemory, setVariableMemory] = useState<StoredVariableValue[]>([]);
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
  const [runtimeLabel, setRuntimeLabel] = useState('Browser preview');
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<DisplayOutcome | null>(null);
  const [equationLatex, setEquationLatexState] = useState('');
  const latestEquationLatexRef = useRef('');
  function setEquationLatex(nextLatex: string) {
    latestEquationLatexRef.current = nextLatex;
    setEquationLatexState(nextLatex);
  }
  const [equationSolveTarget, setEquationSolveTarget] = useState<string | null>(null);
  const [equationScreen, setEquationScreen] = useState<EquationScreen>('home');
  const [equationAlgebraTrayOpen, setEquationAlgebraTrayOpen] = useState(false);
  const [equationNumericSolvePanel, setEquationNumericSolvePanel] = useState<{
    enabled: boolean;
    start: string;
    end: string;
    subdivisions: number;
  }>(defaultEquationNumericSolvePanelState);
  const [equationMenuSelection, setEquationMenuSelection] = useState({
    home: 0,
    polynomialMenu: 0,
    simultaneousMenu: 0,
  });
  const [quadraticCoefficients, setQuadraticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic,
  ]);
  const [cubicCoefficients, setCubicCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic,
  ]);
  const [quarticCoefficients, setQuarticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic,
  ]);
  const [polynomialSystem2Latex, setPolynomialSystem2Latex] = useState<readonly [string, string]>(['', '']);
  const [ansLatex, setAnsLatex] = useState('0');
  const currentModeRef = useRef<ModeId>('calculate');
  const calculateScreenRef = useRef<CalculateScreen>('standard');
  const historyLaunchOrderRef = useRef(0);
  const activeEquationRuntimeRef = useRef<{
    equationLatex: string;
    equationInputLatex: string;
    equationScreen: EquationScreen;
    equationSolveTarget: string | null;
    quadraticCoefficients: number[];
    cubicCoefficients: number[];
    quarticCoefficients: number[];
    polynomialSystem2Latex: readonly [string, string];
    system2: number[][];
    system3: number[][];
    equationNumericSolvePanel: {
      enabled: boolean;
      start: string;
      end: string;
      subdivisions: number;
    };
    settings: Settings;
    ansLatex: string;
    variableMemory: StoredVariableValue[];
    replayVariableSubstitutions: {
      mode: ModeId;
      inputLatex: string;
      substitutions: VariableSubstitutionSnapshot[];
    } | null;
  } | null>(null);
  currentModeRef.current = currentMode;
  const [system2, setSystem2] = useState([
    [1, 1, 3],
    [2, -1, 0],
  ]);
  const [system3, setSystem3] = useState([
    [1, 1, 1, 6],
    [2, -1, 1, 3],
    [1, 2, -1, 3],
  ]);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previousNonGuideMode, setPreviousNonGuideMode] = useState<Exclude<ModeId, 'guide'>>('calculate');
  const [editorAnalysisStopped, setEditorAnalysisStopped] = useState(false);
  const [editorAnalysisGeneration, setEditorAnalysisGeneration] = useState(0);
  const [editorRuntimeStatusOverride, setEditorRuntimeStatusOverride] = useState<string | null>(null);
  const restartEditorAnalysisRef = useRef<(() => void) | null>(null);
  const requestEditorRestart = useCallback(() => {
    restartEditorAnalysisRef.current?.();
  }, []);
  const editorAnalysisControl = useMemo(
    () => ({
      stopped: editorAnalysisStopped,
      generation: editorAnalysisGeneration,
      restartEditor: requestEditorRestart,
    }),
    [editorAnalysisGeneration, editorAnalysisStopped, requestEditorRestart],
  );

  useEffect(() => {
    if (!editorRuntimeStatusOverride) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEditorRuntimeStatusOverride(null);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [editorRuntimeStatusOverride]);

  const mainFieldRef = useRef<MathfieldElement | null>(null);
  const activeFieldRef = useRef<MathfieldElement | null>(null);
  const settingsReadyRef = useRef(false);
  const matrixNotationFieldRef = useRef<MathfieldElement | null>(null);
  const vectorNotationFieldRef = useRef<MathfieldElement | null>(null);
  const equationMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const guideMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const guideSearchInputRef = useRef<HTMLInputElement | null>(null);
  const appStageRef = useRef<HTMLDivElement | null>(null);
  const calculatorShellRef = useRef<HTMLDivElement | null>(null);
  const polynomialInputRefs = useRef<Record<PolynomialEquationView, HTMLInputElement | null>>({
    quadratic: null,
    cubic: null,
    quartic: null,
  });
  const systemInputRefs = useRef<Record<SimultaneousEquationView, HTMLElement | null>>({
    linear2: null,
    linear3: null,
    polynomialSystem2: null,
  });
  const openTrigScreenRef = useRef<(screen: TrigScreen) => void>(() => {});
  const openGeometryScreenRef = useRef<(screen: GeometryScreen) => void>(() => {});
  const openAdvancedCalcScreenRef = useRef<(screen: AdvancedCalcScreen) => void>(() => {});

  const {
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
    onLaunchApp: (entry) => {
      if (entry.launch.mode === 'calculate') {
        openCalculateScreen(entry.launch.calculateScreen ?? 'standard');
        setMode('calculate');
        return;
      }

      if (entry.launch.mode === 'equation') {
        setEquationSolveTarget(null);
        setEquationScreen(entry.launch.equationScreen ?? 'home');
        setDisplayOutcome(null);
        setMode('equation');
        return;
      }

      if (entry.launch.mode === 'matrix' || entry.launch.mode === 'vector' || entry.launch.mode === 'table') {
        setDisplayOutcome(null);
        setMode(entry.launch.mode);
        return;
      }

      if (entry.launch.mode === 'calculus' || entry.launch.mode === 'advancedCalculus') {
        openAdvancedCalcScreenRef.current(entry.launch.advancedCalcScreen ?? 'home');
        setMode('calculus');
        return;
      }

      if (entry.launch.mode === 'trigonometry') {
        openTrigScreenRef.current(entry.launch.trigScreen ?? 'home');
        setMode('trigonometry');
        return;
      }

      if (entry.launch.mode === 'statistics') {
        openStatisticsScreen(entry.launch.statisticsScreen ?? 'home');
        setMode('statistics');
        return;
      }

      if (entry.launch.mode === 'labs') {
        setDisplayOutcome(null);
        setMode('labs');
        return;
      }

      openGeometryScreenRef.current(entry.launch.geometryScreen ?? 'home');
      setMode('geometry');
    },
  });

  const calculusRuntime = useCalculusRuntime({
    ansLatex,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
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
    advancedCalcMenuEntries,
    advancedCalcMenuFooterText,
    advancedCalcMenuSelection,
    advancedCalcRouteMeta,
    advancedCalcScreen,
    advancedCalcWorkbenchExpression,
    advancedDefiniteFieldRef,
    advancedDefiniteIntegral,
    advancedDefiniteLowerRef,
    advancedFiniteLimit,
    advancedFiniteLimitFieldRef,
    advancedFiniteLimitTargetRef,
    advancedIndefiniteFieldRef,
    advancedIndefiniteIntegral,
    advancedInfiniteLimit,
    advancedInfiniteLimitFieldRef,
    advancedImproperFieldRef,
    advancedImproperIntegral,
    advancedImproperLowerRef,
    advancedMenuPanelRef,
    applyAdvancedCalcSeed,
    currentAdvancedCalcHistoryContext,
    currentAdvancedCalcMenuIndex,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    firstOrderOdeLhsFieldRef,
    firstOrderOdeRhsFieldRef,
    firstOrderOdeState,
    goBackInAdvancedCalc,
    isAdvancedCalcMenuOpen,
    maclaurinFieldRef,
    maclaurinState,
    moveCurrentAdvancedCalcMenuSelection,
    numericIvpFieldRef,
    numericIvpState,
    numericIvpX0Ref,
    openAdvancedCalcParentOrHome,
    openAdvancedCalcScreen,
    openSelectedAdvancedCalcMenuEntry,
    partialDerivativeFieldRef,
    partialDerivativeState,
    resetCalculusRuntime,
    resetCurrentCalculusScreen,
    restoreCalculusHistoryEntry,
    runAdvancedCalcAction,
    secondOrderA2Ref,
    secondOrderOdeForcingFieldRef,
    secondOrderOdeState,
    selectedAdvancedCalcMenuEntry,
    setAdvancedDefiniteIntegral,
    setAdvancedFiniteLimit,
    setAdvancedImproperIntegral,
    setAdvancedIndefiniteIntegral,
    setAdvancedInfiniteLimit,
    setCurrentAdvancedCalcMenuIndex,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setFirstOrderOdeState,
    setMaclaurinState,
    setNumericIvpState,
    setPartialDerivativeState,
    setSecondOrderOdeState,
    setTaylorState,
    taylorCenterRef,
    taylorFieldRef,
    taylorState,
  } = calculusRuntime;
  openAdvancedCalcScreenRef.current = openAdvancedCalcScreen;

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
    isLauncherOpen,
    openAdvancedCalcScreen,
    openLegacyCalculateCalculusInCalculus,
    reserveHistoryTicket: reservePendingHistoryTicket,
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

  const trigonometryRuntime = useTrigonometryRuntime({
    activeFieldRef,
    angleUnit: settings.angleUnit,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
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

  const statisticsRuntime = useStatisticsRuntime({
    activeFieldRef,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
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

  const geometryRuntime = useGeometryRuntime({
    activeFieldRef,
    commitOutcome,
    currentMode,
    currentModeRef,
    discardHistoryTicket: discardPendingHistoryTicket,
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

  function launchInspectorApp(entry: Parameters<typeof launchLauncherApp>[0]) {
    closeLeftInspector();
    launchLauncherApp(entry);
  }

  useEffect(() => {
    if (isLauncherOpen || currentMode !== 'equation') {
      return;
    }

    void import('./lib/modes/equation').catch(() => {
      // Active-route preloading is opportunistic; runtime action handlers still own errors.
    });
  }, [currentMode, equationScreen, isLauncherOpen]);

  const linearAlgebraRuntime = useLinearAlgebraRuntime({
    angleUnit: settings.angleUnit,
    commitOutcome,
    discardHistoryTicket: discardPendingHistoryTicket,
    getCurrentMode: () => currentModeRef.current,
    onMatrixNotationLoaded: () => {
      setClipboardNotice('Matrix notation loaded');
      setTimeout(() => {
        matrixNotationFieldRef.current?.focus();
      }, 0);
    },
    onVectorNotationLoaded: () => {
      setClipboardNotice('Vector notation loaded');
      setTimeout(() => {
        vectorNotationFieldRef.current?.focus();
      }, 0);
    },
    reserveHistoryTicket: reservePendingHistoryTicket,
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
  });

  const tableRuntime = useTableRuntime({
    commitOutcome,
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    reserveHistoryTicket: reservePendingHistoryTicket,
    discardHistoryTicket: discardPendingHistoryTicket,
  });

  function buildCalculatorMemorySnapshot(): CalculatorMemorySnapshot {
    return {
      version: CALCULATOR_MEMORY_VERSION,
      savedAt: new Date().toISOString(),
      currentMode: 'calculate',
      previousNonGuideMode: 'calculate',
      settings,
      history,
      variableMemory,
      ansLatex,
      displayOutcome: null,
      session: {},
    };
  }

  function syncHistoryLaunchOrder(entries: readonly HistoryEntry[]) {
    const maxOrder = entries.reduce(
      (currentMax, entry, index) => Math.max(currentMax, entry.historyLaunchOrder ?? index),
      historyLaunchOrderRef.current,
    );
    historyLaunchOrderRef.current = Math.max(maxOrder, Date.now());
  }

  function nextHistoryLaunchOrder() {
    historyLaunchOrderRef.current = Math.max(historyLaunchOrderRef.current + 1, Date.now());
    return historyLaunchOrderRef.current;
  }

  function restoreCalculatorMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    setSettings(snapshot.settings);
    syncHistoryLaunchOrder(snapshot.history);
    setHistory(snapshot.history);
    setVariableMemory(snapshot.variableMemory);
    setAnsLatex(snapshot.ansLatex);
    setDisplayOutcome(null);
    resetCalculateRuntime();
    setEquationLatex('');
    setEquationSolveTarget(null);
    setEquationScreen('home');
    setEquationAlgebraTrayOpen(false);
    setPolynomialSystem2Latex(['', '']);
  }

  const {
    markDirty: markCalculatorMemoryDirty,
    restoreFromSnapshot: restoreCalculatorMemoryFromSnapshot,
    cancelScheduledSave: cancelScheduledCalculatorMemorySave,
    noteMemoryCleared: noteCalculatorMemoryCleared,
  } = useCalculatorMemoryPersistence({
    hydrated,
    settings,
    buildSnapshot: buildCalculatorMemorySnapshot,
    restoreSnapshot: restoreCalculatorMemorySnapshot,
  });

  const symbolicDisplayPrefs = {
    symbolicDisplayMode: settings.symbolicDisplayMode,
    flattenNestedRootsWhenSafe: settings.flattenNestedRootsWhenSafe,
  } as const;
  const currentEquationMenuScreen = isEquationMenuScreen(equationScreen) ? equationScreen : null;
  const guideEnabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;
  const guideRuntime = useGuideRuntime({
    closeHistoryPanel,
    closeLauncher,
    currentMode,
    enabledCapabilities: guideEnabledCapabilities,
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
  const equationMenuEntries = currentMode === 'equation' && currentEquationMenuScreen
    ? getEquationMenuEntries(currentEquationMenuScreen)
    : [];
  const currentEquationMenuIndex = currentEquationMenuScreen
    ? equationMenuSelection[currentEquationMenuScreen]
    : 0;
  const selectedEquationMenuEntry = getEquationMenuEntryAtIndex(
    equationMenuEntries,
    currentEquationMenuIndex,
  );
  const isEquationMenuOpen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen !== null;
  const isEquationWorkScreen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen === null;
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
  const equationRouteMeta = currentMode === 'equation' ? getEquationRouteMeta(equationScreen) : null;
  const equationInputLatex = equationInputLatexForScreen(
    equationScreen,
    equationLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
  );
  const latestEquationInputLatex = equationInputLatexForScreen(
    equationScreen,
    latestEquationLatexRef.current,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
  );
  const analyzeEquationSolveTarget = useCallback(
    (currentEquationLatex: string) =>
      currentEquationLatex
        ? resolveEquationSolveTarget(currentEquationLatex, equationSolveTarget)
        : null,
    [equationSolveTarget],
  );
  const equationSolveTargetAnalysis = useEditorAnalysis<EquationSolveTargetResolution | null>({
    source: currentMode === 'equation' && equationScreen === 'symbolic' ? equationLatex : '',
    initialValue: null,
    analysisKey: equationSolveTarget ?? '',
    analyze: analyzeEquationSolveTarget,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'equationTargetDiscovery',
      contextKey: equationSolveTarget ?? '',
    },
  });
  const analyzedEquationSolveTargetResolution =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationSolveTargetAnalysis.value
      : null;
  const equationSolveTargetResolution =
    analyzedEquationSolveTargetResolution && equationSolveTarget
    && analyzedEquationSolveTargetResolution.candidates.some(
      (candidate) => candidate.name === equationSolveTarget,
    )
      ? {
          ...analyzedEquationSolveTargetResolution,
          selectedTarget: equationSolveTarget,
        }
      : analyzedEquationSolveTargetResolution;
  const displayInputLatex =
    isLauncherOpen
      ? ''
      : currentMode === 'calculate'
        ? calculateScreen === 'standard'
          ? calculateLatex
          : calculateWorkbenchExpression.latex
      : isCalculusMode(currentMode)
        ? advancedCalcWorkbenchExpression
      : currentMode === 'trigonometry'
        ? trigDraftLatex
      : currentMode === 'statistics'
        ? statisticsDraftLatex
      : currentMode === 'geometry'
        ? geometryDraftLatex
      : currentMode === 'equation' && !isEquationMenuScreen(equationScreen)
        ? equationInputLatex
        : '';
  const previewAnalysis = useEditorAnalysis<string>({
    source: displayInputLatex,
    initialValue: '',
    analysisKey: `${currentMode}:${calculateScreen}:${equationScreen}:${advancedCalcScreen}:${trigScreen}:${statisticsScreen}:${geometryScreen}`,
    analyze: trimHarmlessTrailingMathSpacing,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'previewRender',
      contextKey: `${currentMode}:${displayHeaderLabel}`,
    },
  });
  const deferredDisplayLatex = previewAnalysis.value;
  const displayMathLatex =
    displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.exactLatex
      : undefined;
  const equationResultTitle =
    currentMode === 'equation' ? getEquationDisplayTitle(equationScreen, displayOutcome) : null;
  const equationMenuFooterText =
    currentMode === 'equation' && isEquationMenuOpen
      ? getEquationMenuFooterText(equationScreen)
      : '';
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
    : isCalculusMode(currentMode)
      ? getAdvancedCalcSoftActions(advancedCalcScreen)
    : currentMode === 'calculate'
      ? getCalculateSoftActions(calculateScreen)
    : currentMode === 'equation'
      ? getEquationSoftActions(equationScreen)
      : SOFT_MENU_BY_MODE[currentMode];
  const analyzeExpressionTransforms = useCallback(async (source: string) => {
    const { getEligibleExpressionTransforms } = await import('./lib/algebra/algebra-transform');
    return getEligibleExpressionTransforms(source);
  }, []);
  const analyzeEquationTransforms = useCallback(async (source: string) => {
    const { getEligibleEquationTransforms } = await import('./lib/algebra/algebra-transform');
    return getEligibleEquationTransforms(source);
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
  const equationAlgebraTransformAnalysis = useAsyncEditorAnalysis<AlgebraTransformAction[]>({
    source: currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationLatex
      : '',
    initialValue: [],
    analyze: analyzeEquationTransforms,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'equationTransformEligibility',
      contextKey: equationScreen,
    },
  });
  const calculateAlgebraTransforms =
    currentMode === 'calculate' && calculateScreen === 'standard'
      ? calculateAlgebraTransformAnalysis.value
      : [];
  const equationAlgebraTransforms =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationAlgebraTransformAnalysis.value
      : [];

  useEffect(() => {
    let cancelled = false;
    setRuntimeLabel(isDesktopRuntime() ? 'Desktop runtime' : 'Browser preview');

    void (async () => {
      try {
        const [bootstrap, loadedHistory, savedMemory] = await Promise.all([
          bootApp().catch(() => null),
          loadHistoryEntries().catch(() => [] as HistoryEntry[]),
          loadCalculatorMemorySnapshot().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }

        if ((savedMemory?.settings.calculatorMemoryEnabled ?? bootstrap?.settings.calculatorMemoryEnabled) && savedMemory) {
          restoreCalculatorMemoryFromSnapshot(savedMemory);
        } else if (bootstrap) {
          const bootstrapMode = canonicalizeCalculusMode(bootstrap.currentMode);
          const restoredPreviousMode =
            bootstrapMode === 'guide' ? 'calculate' : bootstrapMode;
          setCurrentMode(bootstrapMode === 'labs' && !labsEnabled ? 'calculate' : bootstrapMode);
          setPreviousNonGuideMode(restoredPreviousMode);
          setSettings(bootstrap.settings);
          syncHistoryLaunchOrder(loadedHistory);
          setHistory(loadedHistory);
          setVariableMemory(bootstrap.variableMemory);
        } else {
          syncHistoryLaunchOrder(loadedHistory);
          setHistory(loadedHistory);
        }
      } catch {
        // Fall back to the existing default shell state instead of leaving the header
        // stuck on "Loading..." if a non-critical bootstrap read fails.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [labsEnabled, restoreCalculatorMemoryFromSnapshot]);

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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!settingsReadyRef.current) {
      settingsReadyRef.current = true;
      return;
    }

    void persistSettings(settings);
  }, [hydrated, settings]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    markCalculatorMemoryDirty();
  }, [
    markCalculatorMemoryDirty,
    hydrated,
    currentMode,
    previousNonGuideMode,
    settings,
    history,
    variableMemory,
    ansLatex,
    displayOutcome,
    calculateLatex,
    calculateScreen,
    calculateAlgebraTrayOpen,
    derivativeWorkbench,
    derivativePointWorkbench,
    integralWorkbench,
    limitWorkbench,
    equationLatex,
    equationSolveTarget,
    equationScreen,
    equationAlgebraTrayOpen,
    equationNumericSolvePanel,
    equationMenuSelection,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
    system2,
    system3,
    tableRuntime.tablePrimaryLatex,
    tableRuntime.tableSecondaryLatex,
    tableRuntime.tableSecondaryEnabled,
    tableRuntime.tableStart,
    tableRuntime.tableEnd,
    tableRuntime.tableStep,
    linearAlgebraRuntime.matrixA,
    linearAlgebraRuntime.matrixB,
    linearAlgebraRuntime.matrixNotationLatex,
    linearAlgebraRuntime.vectorA,
    linearAlgebraRuntime.vectorB,
    linearAlgebraRuntime.vectorNotationLatex,
    advancedCalcScreen,
    advancedCalcMenuSelection,
    advancedIndefiniteIntegral,
    advancedDefiniteIntegral,
    advancedImproperIntegral,
    advancedFiniteLimit,
    advancedInfiniteLimit,
    maclaurinState,
    taylorState,
    partialDerivativeState,
    firstOrderOdeState,
    secondOrderOdeState,
    numericIvpState,
    trigScreen,
    trigMenuSelection,
    trigFunctionState,
    trigIdentityState,
    trigEquationState,
    rightTriangleState,
    sineRuleState,
    cosineRuleState,
    angleConvertState,
    specialAnglesExpression,
    trigDraftState,
    geometryScreen,
    geometryMenuSelection,
    triangleAreaState,
    triangleHeronState,
    rectangleState,
    squareState,
    circleState,
    arcSectorState,
    cubeState,
    cuboidState,
    cylinderState,
    coneState,
    sphereState,
    distanceState,
    midpointState,
    slopeState,
    lineEquationState,
    geometryDraftState,
    statisticsScreen,
    statisticsMenuSelection,
    statisticsWorkingSource,
    statisticsSourceSyncState,
    statsDataset,
    frequencyTable,
    binomialState,
    normalState,
    poissonState,
    meanInferenceState,
    regressionState,
    correlationState,
    statisticsDraftState,
    guideRoute,
    guideSelection,
  ]);

  useEffect(() => {
    if (!clipboardNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setClipboardNotice(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [clipboardNotice]);

  function patchSettings(patch: SettingsPatch) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      ...patch,
    }));
  }

  function replaceVariableMemory(nextEntries: StoredVariableValue[]) {
    setVariableMemory(nextEntries);
    void persistVariableMemory(nextEntries);
  }

  function setStoredVariable(name: string, valueLatex: string) {
    const entry = buildStoredVariableValue(name, valueLatex);
    if (!entry.ok) {
      return entry.error;
    }

    replaceVariableMemory(upsertStoredVariableValue(variableMemory, entry.value));
    return null;
  }

  function clearStoredVariable(name: string) {
    replaceVariableMemory(removeStoredVariableValue(variableMemory, name));
  }

  function clearAllStoredVariables() {
    replaceVariableMemory([]);
  }

  function resetHistory() {
    setHistory([]);
    setPendingHistoryTickets([]);
    historyLaunchOrderRef.current = Date.now();
    void clearHistoryEntries();
    setClipboardNotice('History reset');
  }

  function deleteHistoryEntryById(id: string) {
    setHistory((currentHistory) => currentHistory.filter((entry) => entry.id !== id));
    void deleteHistoryEntry(id);
    setClipboardNotice('History entry deleted');
  }

  function reservePendingHistoryTicket(input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
  }) {
    if (!settings.historyEnabled) {
      return null;
    }

    const ticket: PendingHistoryTicket = buildPendingHistoryTicket({
      id: createId(),
      mode: input.mode,
      inputLatex: input.inputLatex,
      capabilityId: input.capabilityId,
      inputRevisionId: input.inputRevisionId,
      historyLaunchOrder: nextHistoryLaunchOrder(),
    });
    setPendingHistoryTickets((currentTickets) => [...currentTickets, ticket]);
    return {
      id: ticket.id,
      historyLaunchOrder: ticket.historyLaunchOrder,
    };
  }

  function discardPendingHistoryTicket(ticketId?: string | null) {
    if (!ticketId) {
      return;
    }

    setPendingHistoryTickets((currentTickets) =>
      discardPendingHistoryTicketById(currentTickets, ticketId));
  }

  function markPendingHistoryTicketAsStopping(ticketId?: string | null) {
    if (!ticketId) {
      return;
    }

    setPendingHistoryTickets((currentTickets) =>
      markPendingHistoryTicketStopping(currentTickets, ticketId));
  }

  function appendFinalizedHistoryEntry(entry: HistoryEntry, ticketId?: string | null) {
    discardPendingHistoryTicket(ticketId);
    setHistory((currentHistory) => {
      const ordered = sortHistoryEntriesByLaunchOrder([...currentHistory, entry]);
      return ordered.slice(-80);
    });
    void appendHistoryEntry(entry);
  }

  function stopPendingHistoryTicket(ticket: PendingHistoryTicket) {
    void import('./lib/ooe/active-job-registry')
      .then(({
        listActiveOoeJobs,
        requestLatestOoeCapabilityCancellation,
        requestOoeJobCancellation,
      }) => {
        const exactJob = ticket.inputRevisionId
          ? listActiveOoeJobs().find((job) =>
              job.capabilityId === ticket.capabilityId
              && job.inputRevisionId === ticket.inputRevisionId)
          : null;
        const cancelled = exactJob
          ? requestOoeJobCancellation(exactJob.registryId, {
              requestedBy: 'user',
              reason: 'Pending History ticket Stop requested.',
            })
          : ticket.capabilityId
            ? requestLatestOoeCapabilityCancellation(ticket.capabilityId, {
                requestedBy: 'user',
                reason: 'Pending History ticket Stop requested.',
              })
            : null;

        if (cancelled) {
          markPendingHistoryTicketAsStopping(ticket.id);
          setEditorRuntimeStatusOverride('Stop requested');
        }
      })
      .catch(() => {
        setClipboardNotice('Could not request Stop for this pending job');
      });
  }

  function resetCalculatorMemory() {
    cancelScheduledCalculatorMemorySave();

    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    setDisplayOutcome(null);
    setAnsLatex('0');
    resetCalculateRuntime();

    setEquationLatex('');
    setEquationSolveTarget(null);
    setEquationScreen('home');
    setEquationAlgebraTrayOpen(false);
    setEquationNumericSolvePanel(defaultEquationNumericSolvePanelState());
    setEquationMenuSelection({
      home: 0,
      polynomialMenu: 0,
      simultaneousMenu: 0,
    });
    setQuadraticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
    setCubicCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
    setQuarticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
    setSystem2(emptySystem(2));
    setSystem3(emptySystem(3));
    setPolynomialSystem2Latex(['', '']);

    tableRuntime.setTablePrimaryLatex('');
    tableRuntime.setTableSecondaryLatex('');
    tableRuntime.setTableSecondaryEnabled(false);
    tableRuntime.setTableStart(-2);
    tableRuntime.setTableEnd(2);
    tableRuntime.setTableStep(1);

    linearAlgebraRuntime.setMatrixA([
      [1, 2],
      [3, 4],
    ]);
    linearAlgebraRuntime.setMatrixB([
      [5, 6],
      [7, 8],
    ]);
    linearAlgebraRuntime.setMatrixNotationLatex('');
    linearAlgebraRuntime.setVectorA([1, 2, 3]);
    linearAlgebraRuntime.setVectorB([4, 5, 6]);
    linearAlgebraRuntime.setVectorNotationLatex('');

    resetCalculusRuntime();

    resetTrigonometryRuntime();

    resetStatisticsRuntime();

    resetGeometryRuntime();

    resetGuideRuntime();

    replaceVariableMemory([]);
    void clearCalculatorMemorySnapshot();
    noteCalculatorMemoryCleared();
    setClipboardNotice('Calculator memory reset');
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
    advancedCalcRouteMeta,
    advancedCalcScreen,
    advancedDefiniteFieldRef,
    advancedFiniteLimitFieldRef,
    advancedIndefiniteFieldRef,
    advancedInfiniteLimitFieldRef,
    advancedImproperFieldRef,
    advancedMenuPanelRef,
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

  function openEquationScreen(screen: EquationScreen) {
    const menuSelection = menuIndexForEquationScreen(screen);
    if (menuSelection) {
      setCurrentEquationMenuIndex(menuSelection.menu, menuSelection.index);
    }
    setEquationScreen(screen);
    if (screen !== 'symbolic') {
      setEquationNumericSolvePanel(defaultEquationNumericSolvePanelState());
      setEquationSolveTarget(null);
    }
    setDisplayOutcome(null);
  }

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

    openAdvancedCalcScreen(calculusScreen);
    applyAdvancedCalcSeed(calculusScreen, seed as GuideExample['launch']['advancedCalcSeed']);
    return true;
  }

  function launchGuideExample(example: GuideExample | undefined) {
    if (!example) {
      return;
    }

    closeLauncher();
    closeHistoryPanel();

    if (example.launch.kind === 'open-tool') {
      if (example.launch.targetMode === 'calculate') {
        const screen = example.launch.calculateScreen ?? 'standard';
        if (openLegacyCalculateCalculusInCalculus(screen, example.launch.calculateSeed)) {
          setDisplayOutcome(null);
          setMode('calculus');
          setClipboardNotice(example.launch.label ?? 'Opened in Calculus');
          return;
        }
        openCalculateScreen(screen);
        applyCalculateSeed(screen, example.launch.calculateSeed);
      }
      if (isCalculusMode(example.launch.targetMode)) {
        const screen = example.launch.advancedCalcScreen ?? 'home';
        openAdvancedCalcScreen(screen);
        applyAdvancedCalcSeed(screen, example.launch.advancedCalcSeed);
      }
      if (example.launch.targetMode === 'equation') {
        setEquationSolveTarget(null);
        setEquationScreen(example.launch.equationScreen ?? 'home');
      }
      if (example.launch.targetMode === 'trigonometry') {
        const screen = example.launch.trigScreen ?? 'home';
        openTrigScreen(screen);
        applyTrigSeed(screen, example.launch.trigSeed);
      }
      if (example.launch.targetMode === 'statistics') {
        const screen = example.launch.statisticsScreen ?? 'home';
        openStatisticsScreen(screen);
      }
      if (example.launch.targetMode === 'geometry') {
        const screen = example.launch.geometryScreen ?? 'home';
        loadGeometryExample(screen, '', example.launch.geometrySeed);
      }
      setDisplayOutcome(null);
      setMode(example.launch.targetMode);
      setClipboardNotice(example.launch.label ?? 'Opened in tool');
      return;
    }

    const latex = example.launch.latex.trim();
    if (!latex) {
      return;
    }

    if (example.launch.targetMode === 'calculate') {
      const screen = example.launch.calculateScreen ?? 'standard';
      if (openLegacyCalculateCalculusInCalculus(screen, example.launch.calculateSeed)) {
        setDisplayOutcome(null);
        setMode('calculus');
        setClipboardNotice(example.launch.label ?? 'Example loaded in Calculus');
        return;
      }
      setCalculateLatex(latex);
      openCalculateScreen(screen);
      applyCalculateSeed(screen, example.launch.calculateSeed);
      setDisplayOutcome(null);
      setMode('calculate');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'equation') {
      setEquationLatex(latex);
      setEquationSolveTarget(example.launch.equationSolveTarget ?? null);
      setEquationScreen(example.launch.equationScreen ?? 'symbolic');
      setDisplayOutcome(null);
      setMode('equation');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (isCalculusMode(example.launch.targetMode)) {
      const screen = example.launch.advancedCalcScreen ?? 'home';
      openAdvancedCalcScreen(screen);
      applyAdvancedCalcSeed(screen, example.launch.advancedCalcSeed);
      setDisplayOutcome(null);
      setMode('calculus');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'trigonometry') {
      const screen = example.launch.trigScreen ?? 'functions';
      loadTrigExample(screen, latex, example.launch.trigSeed);
      setDisplayOutcome(null);
      setMode('trigonometry');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'statistics') {
      const screen = example.launch.statisticsScreen ?? 'home';
      loadStatisticsExample(screen, latex);
      setDisplayOutcome(null);
      setMode('statistics');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'geometry') {
      const screen = example.launch.geometryScreen ?? 'home';
      loadGeometryExample(screen, latex, example.launch.geometrySeed);
      setDisplayOutcome(null);
      setMode('geometry');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    tableRuntime.setTablePrimaryLatex(latex);
    setDisplayOutcome(null);
    setMode('table');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
  }

  function openAdvancedGuideForScreen(screen: AdvancedCalcScreen = advancedCalcScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'calculus' });
      setMode('guide');
      return;
    }

    if (screen === 'derivativesHome' || screen === 'derivative' || screen === 'derivativePoint') {
      openGuideArticle('calculus-derivatives');
      return;
    }

    if (screen === 'integralsHome' || screen === 'indefiniteIntegral' || screen === 'definiteIntegral' || screen === 'improperIntegral') {
      openGuideArticle('advanced-integrals');
      return;
    }

    if (screen === 'limitsHome' || screen === 'finiteLimit' || screen === 'infiniteLimit') {
      openGuideArticle('advanced-limits');
      return;
    }

    if (screen === 'seriesHome' || screen === 'maclaurin' || screen === 'taylor') {
      openGuideArticle('advanced-series');
      return;
    }

    if (screen === 'partialsHome' || screen === 'partialDerivative') {
      openGuideArticle('advanced-partials');
      return;
    }

    openGuideArticle('advanced-odes');
  }

  function openTrigGuideForScreen(screen: TrigScreen = trigScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'trigonometry' });
      setMode('guide');
      return;
    }

    if (screen === 'functions') {
      openGuideArticle('trig-functions');
      return;
    }

    if (screen === 'identitiesHome' || screen === 'identitySimplify' || screen === 'identityConvert') {
      openGuideArticle('trig-identities');
      return;
    }

    if (screen === 'equationsHome' || screen === 'equationSolve') {
      openGuideArticle('trig-equations');
      return;
    }

    if (screen === 'trianglesHome' || screen === 'rightTriangle' || screen === 'sineRule' || screen === 'cosineRule') {
      openGuideArticle('trig-triangles');
      return;
    }

    openGuideArticle('trig-special-angles');
  }

  function openGeometryGuideForScreen(screen: GeometryScreen = geometryScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'geometry' });
      setMode('guide');
      return;
    }

    if (screen === 'shapes2dHome' || screen === 'square' || screen === 'rectangle') {
      openGuideArticle('geometry-shapes-2d');
      return;
    }

    if (screen === 'shapes3dHome' || screen === 'cube' || screen === 'cuboid' || screen === 'cylinder' || screen === 'cone' || screen === 'sphere') {
      openGuideArticle('geometry-solids-3d');
      return;
    }

    if (screen === 'triangleHome' || screen === 'triangleArea' || screen === 'triangleHeron') {
      openGuideArticle('geometry-triangles');
      return;
    }

    if (screen === 'circleHome' || screen === 'circle' || screen === 'arcSector') {
      openGuideArticle('geometry-circles');
      return;
    }

    openGuideArticle('geometry-coordinate');
  }

  function openStatisticsGuideForScreen(screen: StatisticsScreen = statisticsScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'modeGuide', modeId: 'statistics' });
      setMode('guide');
      return;
    }

    if (screen === 'dataEntry' || screen === 'descriptive' || screen === 'frequency') {
      openGuideArticle('statistics-descriptive');
      return;
    }

    if (screen === 'probabilityHome' || screen === 'binomial' || screen === 'normal' || screen === 'poisson') {
      openGuideArticle('statistics-probability');
      return;
    }

    if (screen === 'inferenceHome' || screen === 'meanInference') {
      openGuideArticle('statistics-inference');
      return;
    }

    openGuideArticle('statistics-regression');
  }

  function setCurrentEquationMenuIndex(screen: 'home' | 'polynomialMenu' | 'simultaneousMenu', index: number) {
    setEquationMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentEquationMenuSelection(delta: number) {
    if (!currentEquationMenuScreen) {
      return;
    }

    setCurrentEquationMenuIndex(
      currentEquationMenuScreen,
      moveEquationMenuIndex(
        currentEquationMenuIndex,
        delta,
        equationMenuEntries.length,
      ),
    );
  }

  function openSelectedEquationMenuEntry() {
    if (!selectedEquationMenuEntry) {
      return;
    }

    openEquationScreen(selectedEquationMenuEntry.target);
  }

  function goBackInEquation() {
    const parentScreen = getEquationParentScreen(equationScreen);
    if (parentScreen) {
      openEquationScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function switchToEquationWithLatex(latex: string, options?: { openNumericSolve?: boolean }) {
    setEquationScreen('symbolic');
    setEquationLatex(latex);
    setEquationSolveTarget(null);
    setEquationNumericSolvePanel((currentPanel) => ({
      ...currentPanel,
      enabled: options?.openNumericSolve ?? false,
    }));
    setDisplayOutcome(null);
    setMode('equation');
  }

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
      return isAdvancedCalcMenuOpen ? '' : advancedCalcWorkbenchExpression;
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

    if (currentMode === 'table') {
      return tableRuntime.tablePrimaryLatex;
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

      if (settings.outputStyle !== 'decimal' && displayOutcome.exactLatex) {
        visibleLines.push(
          latexToVisibleText(
            displayOutcome.exactLatex,
            settings.mathNotationDisplay,
            symbolicDisplayPrefs,
          ),
        );
      }

      if (settings.outputStyle !== 'exact' && displayOutcome.approxText) {
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

    setCalculateLatex(trimmed);
    openCalculateScreen('standard');
    setDisplayOutcome(null);
    setMode('calculate');
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

  function editActiveExpression() {
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
      loadGeometryDraft(action.latex, 'guided', true);
      setMode('geometry');
      return;
    }

    if (action.mode === 'statistics') {
      loadStatisticsDraftForLatex(action.latex);
      setMode('statistics');
      return;
    }

    loadTrigDraft(action.latex, 'guided', true);
    setMode('trigonometry');
  }

  async function pasteIntoEditor() {
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice('Paste unavailable');
        return;
      }

      const text = await navigator.clipboard.readText();
      if (
        !isLauncherOpen &&
        (currentMode === 'calculate' ||
          isCalculusMode(currentMode) ||
          currentMode === 'trigonometry' ||
          (currentMode === 'geometry' && geometryEditorIsEditable) ||
          currentMode === 'statistics' ||
          (currentMode === 'equation' && equationScreen === 'symbolic')) &&
        activeFieldRef.current
      ) {
        activeFieldRef.current.focus?.();
        activeFieldRef.current.insert(text);
        setClipboardNotice('Pasted into editor');
        return;
      }

      if (currentMode === 'geometry' && geometryEditorIsEditable) {
        focusGeometryEditor();
        geometryDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Geometry editor');
        return;
      }

      if (currentMode === 'statistics' && statisticsEditorIsEditable) {
        focusStatisticsEditor();
        statisticsDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Statistics editor');
        return;
      }

      if (currentMode === 'trigonometry' && trigEditorIsEditable) {
        focusTrigEditor();
        trigDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Trigonometry editor');
        return;
      }

      loadLatexIntoEditor(text);
    } catch {
      setClipboardNotice('Clipboard blocked');
    }
  }

  function setPolynomialCoefficient(
    view: PolynomialEquationView,
    index: number,
    value: number,
  ) {
    const nextValue = Number.isFinite(value) ? value : 0;
    const setter =
      view === 'quadratic'
        ? setQuadraticCoefficients
        : view === 'cubic'
          ? setCubicCoefficients
          : setQuarticCoefficients;

    setter((currentCoefficients) =>
      currentCoefficients.map((coefficient, coefficientIndex) =>
        coefficientIndex === index ? nextValue : coefficient,
      ),
    );
  }

  function commitOutcome(
    outcome: DisplayOutcome,
    inputLatex: string,
    mode: ModeId,
    context: Partial<Pick<
      HistoryEntry,
      | 'calculateScreen'
      | 'calculateSeed'
      | 'calculusScreen'
      | 'calculusSeed'
      | 'advancedCalcScreen'
      | 'advancedCalcSeed'
      | 'geometryScreen'
      | 'geometrySeed'
      | 'trigScreen'
      | 'trigSeed'
      | 'statisticsScreen'
      | 'statisticsSeed'
      | 'matrixSeed'
      | 'vectorSeed'
      | 'equationSolveTarget'
      | 'equationAnswerMode'
      | 'equationDomainIntent'
      | 'complexExactForm'
      | 'answerDomain'
      | 'solutionKind'
      | 'numericInterval'
      | 'variableSubstitutions'
    >> & {
      historyTicketId?: string | null;
      historyLaunchOrder?: number;
      suppressDisplayCommit?: boolean;
    } = {},
  ) {
    if (
      !context.suppressDisplayCommit &&
      outcome.kind === 'prompt' &&
      outcome.targetMode === 'equation' &&
      settings.autoSwitchToEquation
    ) {
      discardPendingHistoryTicket(context.historyTicketId);
      switchToEquationWithLatex(outcome.carryLatex);
      return;
    }

    if (!context.suppressDisplayCommit) {
      setDisplayOutcome(outcome);
    }

    if (outcome.kind !== 'success' || (!outcome.exactLatex && !outcome.approxText)) {
      discardPendingHistoryTicket(context.historyTicketId);
      return;
    }

    if (outcome.exactLatex && !context.suppressDisplayCommit) {
      setAnsLatex(outcome.exactLatex);
    }
    if (!settings.historyEnabled) {
      discardPendingHistoryTicket(context.historyTicketId);
      return;
    }

    const canonicalMode = canonicalizeCalculusMode(mode);
    const variableSubstitutions =
      context.variableSubstitutions
      ?? (outcome.kind === 'success' ? outcome.variableSubstitutions : undefined);

    const entry: HistoryEntry = {
      id: createId(),
      mode: canonicalMode,
      inputLatex,
      resolvedInputLatex: outcome.resolvedInputLatex,
      resultLatex: outcome.exactLatex,
      exactSupplementLatex: outcome.exactSupplementLatex,
      approxText: outcome.approxText,
      ...(canonicalMode === 'calculate'
        ? { ...currentCalculateHistoryContext(), ...context }
        : {}),
      ...(canonicalMode === 'calculus'
        ? { ...currentAdvancedCalcHistoryContext(), ...context }
        : {}),
      ...(canonicalMode === 'geometry'
        ? {
            geometryScreen: context.geometryScreen ?? context.geometrySeed?.screen ?? geometryScreen,
            ...(context.geometrySeed ? { geometrySeed: context.geometrySeed } : {}),
          }
        : {}),
      ...(canonicalMode === 'trigonometry'
        ? {
            trigScreen: context.trigScreen ?? context.trigSeed?.screen ?? trigScreen,
            ...(context.trigSeed ? { trigSeed: context.trigSeed } : {}),
          }
        : {}),
      ...(canonicalMode === 'statistics'
        ? {
            statisticsScreen: context.statisticsScreen ?? context.statisticsSeed?.screen ?? statisticsScreen,
            ...(context.statisticsSeed ? { statisticsSeed: context.statisticsSeed } : {}),
          }
        : {}),
      ...(canonicalMode === 'matrix' && context.matrixSeed
        ? { matrixSeed: context.matrixSeed }
        : {}),
      ...(canonicalMode === 'vector' && context.vectorSeed
        ? { vectorSeed: context.vectorSeed }
        : {}),
      ...(canonicalMode === 'equation' && context.equationSolveTarget
        ? { equationSolveTarget: context.equationSolveTarget }
        : {}),
      ...(canonicalMode === 'equation' && context.equationAnswerMode
        ? { equationAnswerMode: context.equationAnswerMode }
        : {}),
      ...(canonicalMode === 'equation' && context.equationDomainIntent
        ? { equationDomainIntent: context.equationDomainIntent }
        : {}),
      ...(canonicalMode === 'equation' && context.complexExactForm
        ? { complexExactForm: context.complexExactForm }
        : {}),
      ...(canonicalMode === 'equation' && (context.answerDomain ?? outcome.answerDomain)
        ? { answerDomain: context.answerDomain ?? outcome.answerDomain }
        : {}),
      ...(canonicalMode === 'equation' && (context.solutionKind ?? outcome.solutionKind)
        ? { solutionKind: context.solutionKind ?? outcome.solutionKind }
        : {}),
      ...(context.numericInterval
        ? { numericInterval: context.numericInterval }
        : {}),
      ...(variableSubstitutions && variableSubstitutions.length > 0
        ? { variableSubstitutions }
        : {}),
      ...(context.historyLaunchOrder !== undefined
        ? { historyLaunchOrder: context.historyLaunchOrder }
        : {}),
      timestamp: new Date().toISOString(),
    };

    appendFinalizedHistoryEntry(entry, context.historyTicketId);
  }

  function setMode(mode: ModeId) {
    const canonicalMode = canonicalizeCalculusMode(mode);
    if (canonicalMode === 'labs' && !labsEnabled) {
      return;
    }
    if (canonicalMode !== 'guide') {
      setPreviousNonGuideMode(canonicalMode);
    } else {
      closeHistoryPanel();
    }
    setCurrentMode(canonicalMode);
    setDisplayOutcome((currentOutcome) => (currentOutcome?.kind === 'prompt' ? null : currentOutcome));
    void persistMode(canonicalMode);
  }

  function isLatexInsertTarget(field: unknown): field is {
    focus?: () => void;
    insert: (latex: string) => void;
  } {
    return Boolean(field && typeof (field as { insert?: unknown }).insert === 'function');
  }

  function isLatexValueTarget(field: unknown): field is {
    focus?: () => void;
    getValue?: (format?: string) => string;
    setValue: (latex: string) => void;
    dispatchEvent?: (event: Event) => boolean;
  } {
    return Boolean(field && typeof (field as { setValue?: unknown }).setValue === 'function');
  }

  function insertLatex(latex: string) {
    const activeField: unknown = activeFieldRef.current;
    const mainField: unknown = mainFieldRef.current;
    const field = isLatexInsertTarget(activeField) || isLatexValueTarget(activeField)
      ? activeField
      : isLatexInsertTarget(mainField) || isLatexValueTarget(mainField)
        ? mainField
        : null;
    if (!field) {
      return;
    }

    field.focus?.();
    if (isLatexInsertTarget(field)) {
      field.insert(latex);
      return;
    }

    const currentLatex = field.getValue?.('latex') ?? '';
    field.setValue(`${currentLatex}${latex}`);
    field.dispatchEvent?.(new Event('input', { bubbles: true }));
  }

  function readLiveEquationSnapshot() {
    let liveEquationLatex = latestEquationLatexRef.current;

    if (currentModeRef.current === 'equation' && equationScreen === 'symbolic') {
      const liveField = mainFieldRef.current
        ?? (document.querySelector('[data-testid="main-editor"]') as MathfieldElement | null);
      const fieldLatex = liveField?.getValue?.('latex');
      if (typeof fieldLatex === 'string') {
        liveEquationLatex = trimHarmlessTrailingMathSpacing(
          normalizeRelationOperatorLatex(fieldLatex),
        );
        latestEquationLatexRef.current = liveEquationLatex;
      }
    }

    return {
      equationLatex: liveEquationLatex,
      equationInputLatex: equationInputLatexForScreen(
        equationScreen,
        liveEquationLatex,
        quadraticCoefficients,
        cubicCoefficients,
        quarticCoefficients,
        polynomialSystem2Latex,
      ),
    };
  }

  activeEquationRuntimeRef.current = {
    equationLatex: latestEquationLatexRef.current,
    equationInputLatex: latestEquationInputLatex,
    equationScreen,
    equationSolveTarget,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
    system2,
    system3,
    equationNumericSolvePanel,
    settings,
    ansLatex,
    variableMemory,
    replayVariableSubstitutions,
  };

  const getActiveEquationRequest = (
    kind: 'symbolic' | 'numeric-interval',
  ): RunEquationModeRequest | null => {
    const active = activeEquationRuntimeRef.current;
    if (!active || active.equationScreen !== 'symbolic') {
      return null;
    }

    if (kind === 'numeric-interval' && !active.equationNumericSolvePanel.enabled) {
      return null;
    }

    const liveSnapshot = readLiveEquationSnapshot();
    const executionLatex = trimHarmlessTrailingMathSpacing(liveSnapshot.equationLatex);
    const committedInput = trimHarmlessTrailingMathSpacing(liveSnapshot.equationInputLatex);
    const numericInterval = kind === 'numeric-interval'
      ? {
          start: active.equationNumericSolvePanel.start,
          end: active.equationNumericSolvePanel.end,
          subdivisions: active.equationNumericSolvePanel.subdivisions,
        }
      : undefined;

    return {
      equationScreen: active.equationScreen,
      equationLatex: executionLatex,
      equationSolveTarget: active.equationSolveTarget,
      equationAnswerMode: kind === 'numeric-interval'
        ? 'approximate'
        : active.settings.equationAnswerMode ?? 'exact',
      equationDomainIntent: kind === 'numeric-interval'
        ? 'real'
        : active.settings.equationDomainIntent ?? 'real',
      complexExactForm: active.settings.complexExactForm ?? 'rectangular',
      quadraticCoefficients: active.quadraticCoefficients,
      cubicCoefficients: active.cubicCoefficients,
      quarticCoefficients: active.quarticCoefficients,
      polynomialSystem2Latex: active.polynomialSystem2Latex,
      system2: active.system2,
      system3: active.system3,
      angleUnit: active.settings.angleUnit,
      outputStyle: active.settings.outputStyle,
      ansLatex: active.ansLatex,
      numericInterval,
      storedVariables: active.variableMemory,
      variableSubstitutionSnapshot:
        kind === 'numeric-interval'
        && active.replayVariableSubstitutions?.mode === 'equation'
        && active.replayVariableSubstitutions.inputLatex === committedInput
          ? active.replayVariableSubstitutions.substitutions
          : undefined,
    };
  };

  const equationRuntimeController = createEquationRuntimeController({
    equationScreen,
    equationLatex: latestEquationLatexRef.current,
    equationSolveTarget,
    equationInputLatex: latestEquationInputLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
    system2,
    system3,
    equationNumericSolvePanel,
    currentMode,
    displayOutcome,
    ansLatex,
    settings,
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
    setRuntimeStatusOverride: setEditorRuntimeStatusOverride,
    reserveHistoryTicket: reservePendingHistoryTicket,
    discardHistoryTicket: discardPendingHistoryTicket,
    shouldCommitVisibleEquationOutcome: () => currentModeRef.current === 'equation',
    startTransition,
    commitOutcome,
    switchToEquationWithLatex,
    isSimultaneousEquationScreen,
    getActiveEquationRequest,
    getLiveEquationSnapshot: readLiveEquationSnapshot,
  });

  const {
    openPromptTarget,
    runEquationAction,
    runEquationAlgebraTransformAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  } = equationRuntimeController;

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
      if (isEquationMenuScreen(equationScreen)) {
        goBackInEquation();
      } else if (equationScreen === 'symbolic') {
        setEquationLatex('');
      } else if (equationScreen === 'quadratic') {
        setQuadraticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
      } else if (equationScreen === 'cubic') {
        setCubicCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
      } else if (equationScreen === 'quartic') {
        setQuarticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
      } else if (equationScreen === 'linear2') {
        setSystem2(emptySystem(2));
      } else if (equationScreen === 'linear3') {
        setSystem3(emptySystem(3));
      } else {
        setPolynomialSystem2Latex(['', '']);
      }
    } else if (currentMode === 'table') {
      tableRuntime.clearTable();
    }

    setDisplayOutcome(null);
  }

  function executePrimaryAction() {
    executePrimaryActionWithDeps({
      isLauncherOpen,
      currentMode,
      guideRouteScreen: guideRoute.screen,
      isAdvancedCalcMenuOpen,
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
      openSelectedAdvancedCalcMenuEntry,
      runAdvancedCalcAction,
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
      runTableAction: tableRuntime.runTableAction,
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

  function stopEditorAnalysis() {
    setEditorAnalysisStopped(true);
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
    } else if (currentMode === 'equation' && equationScreen === 'symbolic') {
      setEquationLatex('');
      setEquationSolveTarget(null);
    } else if (currentMode === 'equation' && equationScreen === 'polynomialSystem2') {
      setPolynomialSystem2Latex(['', '']);
    } else if (currentMode === 'trigonometry') {
      updateTrigDraft('', 'manual', true);
    } else if (currentMode === 'statistics') {
      updateStatisticsDraft('', 'manual', true);
    } else if (currentMode === 'geometry') {
      updateGeometryDraft('', 'manual', true);
    } else if (currentMode === 'table') {
      tableRuntime.clearTable();
    } else if (currentMode === 'matrix') {
      linearAlgebraRuntime.setMatrixNotationLatex('');
    } else if (currentMode === 'vector') {
      linearAlgebraRuntime.setVectorNotationLatex('');
    }

    setDisplayOutcome(null);
  }

  function restartEditorAnalysis() {
    requestCurrentOoeEditorCancellation('editor restart');
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
      openSelectedAdvancedCalcMenuEntry,
      openAdvancedGuideForScreen,
      goBackInAdvancedCalc,
      runAdvancedCalcAction,
      loadAdvancedCalcToEditor: () => loadLatexIntoEditor(advancedCalcWorkbenchExpression),
      openAdvancedCalcParentOrHome,
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
      toggleEquationAlgebraTray: () => setEquationAlgebraTrayOpen((open) => !open),
      openEquationPolynomialMenu: () => openEquationScreen('polynomialMenu'),
      openEquationSimultaneousMenu: () => openEquationScreen('simultaneousMenu'),
      runEquationAction,
      runMatrixAction: linearAlgebraRuntime.runMatrixAction,
      runVectorAction: linearAlgebraRuntime.runVectorAction,
      toggleTableSecondary: tableRuntime.toggleTableSecondary,
      runTableAction: tableRuntime.runTableAction,
    });
  }

  function handleKeypad(button: KeypadButton) {
    const routedButton = resolveKeypadButtonForLayer(button, effectiveKeypadLayer);
    handleKeypadWithDeps({
      button: routedButton,
      isLauncherOpen,
      currentMode,
      isCalculateMenuOpen,
      isAdvancedCalcMenuOpen,
      isGeometryMenuOpen,
      isStatisticsMenuOpen,
      isTrigMenuOpen,
      isEquationMenuOpen: isEquationMenuScreen(equationScreen),
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
      openAdvancedCalcMenuDigitEntry: (digit) => {
        const entry = getAdvancedCalcMenuEntryByHotkey(advancedCalcScreen, digit);
        if (entry) {
          openAdvancedCalcScreen(entry.target);
        }
      },
      goBackInAdvancedCalc,
      moveCurrentAdvancedCalcMenuSelection,
      openSelectedAdvancedCalcMenuEntry,
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
      openEquationMenuDigitEntry: (digit) => {
        const entry = getEquationMenuEntryByHotkey(equationMenuEntries, digit);
        if (entry) {
          openEquationScreen(entry.target);
        }
      },
      clearCurrentMode,
      moveCurrentEquationMenuSelection,
      openSelectedEquationMenuEntry,
      insertLatex,
      deleteBackward: () => activeFieldRef.current?.executeCommand('deleteBackward'),
      moveToPreviousChar: () => activeFieldRef.current?.executeCommand('moveToPreviousChar'),
      moveToNextChar: () => activeFieldRef.current?.executeCommand('moveToNextChar'),
      cycleAngleUnit: () => patchSettings({ angleUnit: cycleAngleUnit(settings.angleUnit) }),
      openLauncher: openMenuInspector,
    });
    if (!keypadLayerLocked && !keypadMomentaryLayer && keypadLayer !== 'base') {
      setKeypadLayer('base');
    }
  }

  function setSystemCell(size: 2 | 3, row: number, column: number, value: number) {
    const setter = size === 2 ? setSystem2 : setSystem3;
    setter((currentSystem) =>
      currentSystem.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setPolynomialSystemEquation(index: 0 | 1, latex: string) {
    setPolynomialSystem2Latex((currentSystem) =>
      currentSystem.map((entry, entryIndex) => entryIndex === index ? latex : entry) as [string, string]);
  }

  function replayHistoryEntry(entry: HistoryEntry) {
    setLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      surface: 'app',
    }));
    setMode(entry.mode);
    if (entry.mode !== 'calculate') {
      clearCalculateReplayVariableSubstitutions();
    }
    setReplayVariableSubstitutions(
      entry.mode !== 'calculate' && entry.variableSubstitutions && entry.variableSubstitutions.length > 0
        ? { mode: entry.mode, inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
        : null,
    );
    if (entry.mode === 'calculate') {
      const legacyCalculusScreen = mapLegacyCalculateScreenToCalculusScreen(
        entry.calculateScreen,
        entry.calculateSeed,
      );
      if (legacyCalculusScreen) {
        setMode('calculus');
        openAdvancedCalcScreen(legacyCalculusScreen);
        applyAdvancedCalcSeed(
          legacyCalculusScreen,
          entry.calculateSeed as GuideExample['launch']['advancedCalcSeed'],
        );
        clearCalculateReplayVariableSubstitutions();
        setReplayVariableSubstitutions(
          entry.variableSubstitutions && entry.variableSubstitutions.length > 0
            ? { mode: 'calculus', inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
            : null,
        );
      } else {
        restoreCalculateHistoryEntry(entry);
      }
    }

    if (entry.mode === 'table') {
      tableRuntime.clearTable();
      tableRuntime.setTablePrimaryLatex(entry.inputLatex);
    }

    if (entry.mode === 'matrix' && entry.matrixSeed) {
      linearAlgebraRuntime.setMatrixA(entry.matrixSeed.matrixA.map((row) => [...row]));
      if (entry.matrixSeed.matrixB) {
        linearAlgebraRuntime.setMatrixB(entry.matrixSeed.matrixB.map((row) => [...row]));
      }
    }

    if (entry.mode === 'vector' && entry.vectorSeed) {
      linearAlgebraRuntime.setVectorA([...entry.vectorSeed.vectorA]);
      if (entry.vectorSeed.vectorB) {
        linearAlgebraRuntime.setVectorB([...entry.vectorSeed.vectorB]);
      }
      if (entry.vectorSeed.angleUnit !== settings.angleUnit) {
        patchSettings({ angleUnit: entry.vectorSeed.angleUnit });
      }
    }

    if (entry.mode === 'equation') {
      const replayTarget = inferEquationReplayTarget(entry);
      patchSettings({
        equationAnswerMode: entry.equationAnswerMode ?? (entry.numericInterval ? 'approximate' : 'exact'),
        equationDomainIntent: entry.equationDomainIntent ?? 'real',
        complexExactForm: entry.complexExactForm ?? settings.complexExactForm,
      });
      setEquationLatex(replayTarget.equationLatex);
      setEquationSolveTarget(replayTarget.screen === 'symbolic' ? replayTarget.equationSolveTarget ?? null : null);
      openEquationScreen(replayTarget.screen);
      if (entry.numericInterval && replayTarget.screen === 'symbolic') {
        setEquationNumericSolvePanel({
          enabled: true,
          start: entry.numericInterval.start,
          end: entry.numericInterval.end,
          subdivisions: entry.numericInterval.subdivisions,
        });
      }

      if (
        replayTarget.screen === 'quadratic' ||
        replayTarget.screen === 'cubic' ||
        replayTarget.screen === 'quartic'
      ) {
        if (replayTarget.screen === 'quadratic') {
          setQuadraticCoefficients([...replayTarget.coefficients]);
        } else if (replayTarget.screen === 'cubic') {
          setCubicCoefficients([...replayTarget.coefficients]);
        } else {
          setQuarticCoefficients([...replayTarget.coefficients]);
        }
      }
    }

    if (isCalculusMode(entry.mode)) {
      restoreCalculusHistoryEntry(entry);
    }

    if (entry.mode === 'trigonometry') {
      restoreTrigHistoryEntry(entry);
    }

    if (entry.mode === 'statistics') {
      restoreStatisticsHistoryEntry(entry);
    }

    if (entry.mode === 'geometry') {
      restoreGeometryHistoryEntry(entry);
    }

    setDisplayOutcome({
      kind: 'success',
      title: 'History',
      exactLatex: entry.resultLatex,
      exactSupplementLatex: entry.exactSupplementLatex,
      approxText: entry.approxText,
      answerDomain: entry.answerDomain,
      solutionKind: entry.solutionKind,
      warnings: [],
    });
    closeHistoryPanel();
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
      openLauncher: openMenuInspector,
      openEquationScreen,
      openCalculateScreen,
      openCalculateMenuDigitEntry,
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

  const activePolynomialView = isPolynomialEquationScreen(equationScreen) ? equationScreen : null;
  const activePolynomialMeta = activePolynomialView ? POLYNOMIAL_VIEW_META[activePolynomialView] : null;
  const activePolynomialCoefficients =
    activePolynomialView === 'quadratic'
      ? quadraticCoefficients
      : activePolynomialView === 'cubic'
        ? cubicCoefficients
        : activePolynomialView === 'quartic'
          ? quarticCoefficients
          : null;
  const equationAnswerModeLabel =
    equationScreen === 'symbolic' && displayOutcome && displayOutcome.kind !== 'prompt'
      ? (
          displayOutcome.answerMode === 'approximate'
            ? 'Answer mode: Approximate'
            : displayOutcome.answerMode === 'isolate'
              ? 'Answer mode: Isolate'
              : 'Answer mode: Exact'
        )
      : null;
  const equationDomainIntentLabel =
    equationScreen === 'symbolic'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && settings.equationDomainIntent === 'complex'
    && displayOutcome.answerDomain !== 'complex'
      ? 'Domain intent: Complex'
      : null;
  const equationAnswerDomainLabel =
    currentMode === 'equation'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && displayOutcome.answerDomain === 'complex'
      ? 'Domain: Complex'
      : null;
  const equationSolutionKindLabel =
    currentMode === 'equation'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && displayOutcome.solutionKind === 'inequality-solution-set'
      ? 'Solution: Inequality set'
      : null;
  const equationResultBadges =
    currentMode === 'equation' && equationRouteMeta && !isEquationMenuOpen
      ? [
          ...(equationRouteMeta.badge ? [equationRouteMeta.badge] : []),
          ...(equationAnswerModeLabel ? [equationAnswerModeLabel] : []),
          ...(equationDomainIntentLabel ? [equationDomainIntentLabel] : []),
          ...(equationAnswerDomainLabel ? [equationAnswerDomainLabel] : []),
          ...(equationSolutionKindLabel ? [equationSolutionKindLabel] : []),
          ...(displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'numeric-fallback'
            ? ['Numeric roots']
            : []),
          ]
      : [];
  const advancedCalcProvenanceBadge =
    isCalculusMode(currentMode) && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
      ? getAdvancedCalcProvenanceBadge(displayOutcome.resultOrigin as AdvancedCalcResultOrigin | undefined)
      : undefined;
  const advancedCalcResultBadges =
    isCalculusMode(currentMode) && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
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
    ...advancedCalcResultBadges.map((badge) => ({
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
    ...(advancedCalcProvenanceBadge
      ? [{
          label: advancedCalcProvenanceBadge.label,
          className: `advanced-calc-provenance-badge is-${advancedCalcProvenanceBadge.variant}`,
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
  const shouldShowEquationAlgebraTray =
    currentMode === 'equation'
    && equationScreen === 'symbolic'
    && equationAlgebraTrayOpen;
  const activeAlgebraTransforms = shouldShowCalculateAlgebraTray
    ? calculateAlgebraTransforms
    : shouldShowEquationAlgebraTray
      ? equationAlgebraTransforms
      : [];
  const activeEditorAnalysisStatuses = [
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationSolveTargetAnalysis.status
      : null,
    currentMode === 'calculate' && calculateScreen === 'standard'
      ? calculateAlgebraTransformAnalysis.status
      : null,
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationAlgebraTransformAnalysis.status
      : null,
    displayInputLatex ? previewAnalysis.status : null,
  ];
  const userVisibleOoeTicketCapabilityIds = [
    'equation.solve',
    'table.build',
    'calculus.evaluate',
    'statistics.evaluate',
    'trigonometry.evaluate',
    'geometry.evaluate',
    'linearAlgebra.matrix',
    'linearAlgebra.vector',
    'expression.evaluate',
    'expression.simplify',
    'expression.factor',
    'expression.expand',
    'calculate.algebraTransform',
    'calculate.workbench',
  ] as const;
  const activeOoeRuntimeStatusLabel = hasStoppingPendingHistoryTickets(
    pendingHistoryTickets,
    userVisibleOoeTicketCapabilityIds,
  )
    ? 'Stopping'
    : hasActivePendingHistoryTickets(pendingHistoryTickets, userVisibleOoeTicketCapabilityIds)
      ? 'Computing'
      : null;
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
          : 'Ready');
  const showEditorRuntimeControls = !isLauncherOpen && currentMode !== 'guide';
  const calculateGuideArticleId = calculateRouteMeta?.guideArticleId;
  const calculateAdvancedGuideArticleId =
    calculateScreen === 'integral'
      ? 'advanced-integrals'
      : calculateScreen === 'limit'
        ? 'advanced-limits'
        : null;
  const advancedCalcCoreGuideArticleId =
    advancedCalcScreen === 'indefiniteIntegral'
      || advancedCalcScreen === 'definiteIntegral'
      || advancedCalcScreen === 'improperIntegral'
      || advancedCalcScreen === 'finiteLimit'
      || advancedCalcScreen === 'infiniteLimit'
      ? 'calculus-integrals-limits'
      : null;
  const calculateKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('calculate'));
  const advancedCalcKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('calculus'));
  const trigonometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('trigonometry'));
  const statisticsKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('statistics'));
  const geometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('geometry'));
  const equationKeyboardLayouts = buildVirtualKeyboardLayouts(
    createKeyboardContext('equation', equationScreen),
  );
  const matrixKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('matrix'));
  const tableKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('table'));
  const vectorKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('vector'));

  const copyCalculateWorkbenchExpression = () =>
    void copyText(calculateWorkbenchExpression.latex, 'Expression copied');
  const copyAdvancedCalcWorkbenchExpression = () =>
    void copyText(advancedCalcWorkbenchExpression, 'Expression copied');
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
          history={history}
          pendingHistory={pendingHistoryTickets}
          modeLabels={MODE_LABELS}
          onClear={resetHistory}
          onClose={closeHistoryPanel}
          onDelete={deleteHistoryEntryById}
          onReplay={replayHistoryEntry}
          onStopPending={stopPendingHistoryTicket}
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
      <EditorAnalysisControlProvider value={editorAnalysisControl}>
      <div className="app-shell">
      <div
        className="app-stage"
        data-testid="app-stage"
        data-side-surface={
          sideSurface === 'none' ? undefined : sideSurface
        }
        data-side-surface-presentation={
          sideSurface === 'none' ? 'none' : sideSurfacePresentation
        }
        ref={appStageRef}
      >
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
          historyOpen={historyOpen}
          isLauncherOpen={isLauncherOpen}
          labsEnabled={labsEnabled}
          ooeDiagnosticsEnabled={ooeDiagnosticsEnabled}
          ooeDiagnosticsOpen={ooeDiagnosticsOpen}
          openAdvancedCalcScreen={openAdvancedCalcScreen}
          openGeometryScreen={openGeometryScreen}
          openGuideHome={openGuideHome}
          openStatisticsScreen={openStatisticsScreen}
          openTrigScreen={openTrigScreen}
          patchSettings={patchSettings}
          runtimeLabel={runtimeLabel}
          setGuideRoute={openGuideRoute}
          setMode={setMode}
          settings={settings}
          settingsOpen={settingsOpen}
          showModeTabs={showModeTabs}
          toggleHistoryPanel={toggleHistoryPanel}
          toggleOoeDiagnosticsPanel={toggleOoeDiagnosticsPanel}
          toggleSettingsPanel={toggleSettingsPanel}
          toggleVariablesPanel={toggleVariablesPanel}
          variablesOpen={variablesOpen}
        />
        <DisplayPanel
          activeAlgebraTransforms={activeAlgebraTransforms}
          activeExpressionLatex={activeExpressionLatex}
          activeFieldRef={activeFieldRef}
          activeLauncherCategory={activeLauncherCategory}
          activeResultCopyText={activeResultCopyText}
          activeResultEditorLatex={activeResultEditorLatex}
          advancedCalcMenuFooterText={advancedCalcMenuFooterText}
          advancedCalcRouteMeta={advancedCalcRouteMeta}
          advancedCalcScreen={advancedCalcScreen}
          calculateKeyboardLayouts={calculateKeyboardLayouts}
          calculateLatex={calculateLatex}
          calculateRouteMeta={calculateRouteMeta}
          calculateScreen={calculateScreen}
          clipboardNotice={clipboardNotice}
          copyText={copyText}
          copyableGuideExampleLatex={copyableGuideExampleLatex}
          currentMode={currentMode}
          deferredDisplayLatex={deferredDisplayLatex}
          displayHeaderLabel={displayHeaderLabel}
          displayMathLatex={displayMathLatex}
          displayOutcome={displayOutcome}
          displayResultBadges={displayResultBadges}
          editorAnalysisStatusLabel={editorAnalysisStatusLabel}
          editorAnalysisStopped={editorAnalysisStopped}
          editActiveExpression={editActiveExpression}
          equationKeyboardLayouts={equationKeyboardLayouts}
          equationLatex={equationLatex}
          equationMenuFooterText={equationMenuFooterText}
          equationResultTitle={equationResultTitle}
          equationRouteMeta={equationRouteMeta}
          equationScreen={equationScreen}
          equationSolveTarget={equationSolveTargetResolution?.selectedTarget ?? equationSolveTarget}
          geometryDraftFieldRef={geometryDraftFieldRef}
          geometryDraftLatex={geometryDraftLatex}
          geometryKeyboardLayouts={geometryKeyboardLayouts}
          geometryMenuFooterText={geometryMenuFooterText}
          geometryRouteMeta={geometryRouteMeta}
          geometryScreen={geometryScreen}
          getAlgebraTransformLabel={getAlgebraTransformLabel}
          getPeriodicStopReasonText={getPeriodicStopReasonText}
          guideArticle={guideArticle}
          guideModeRef={guideModeRef}
          guideRoute={guideRoute}
          guideRouteMeta={guideRouteMeta}
          guideSearchInputRef={guideSearchInputRef}
          guideSearchQuery={guideSearchQuery}
          hydrated={hydrated}
          isAdvancedCalcMenuOpen={isAdvancedCalcMenuOpen}
          isEquationMenuOpen={isEquationMenuOpen}
          isEquationWorkScreen={isEquationWorkScreen}
          isGeometryMenuOpen={isGeometryMenuOpen}
          isLauncherOpen={isLauncherOpen}
          isPending={isPending}
          isStatisticsMenuOpen={isStatisticsMenuOpen}
          isTrigMenuOpen={isTrigMenuOpen}
          labsRuntime={labsRuntime}
          launchGuideExample={launchGuideExample}
          launcherState={launcherState}
          loadLatexIntoEditor={loadLatexIntoEditor}
          mainFieldRef={mainFieldRef}
          onRestartEditorAnalysis={restartEditorAnalysis}
          onRunEditor={runEditorPrimaryAction}
          onStopEditorAnalysis={stopEditorAnalysis}
          openPromptTarget={openPromptTarget}
          pasteIntoEditor={pasteIntoEditor}
          runCalculateAction={runCalculateAction}
          runCalculateAlgebraTransformAction={runCalculateAlgebraTransformAction}
          runEquationAlgebraTransformAction={runEquationAlgebraTransformAction}
          selectedAdvancedCalcMenuEntry={selectedAdvancedCalcMenuEntry}
          selectedEquationMenuEntry={selectedEquationMenuEntry}
          selectedGeometryMenuEntry={selectedGeometryMenuEntry}
          selectedGuideExample={selectedGuideExample}
          selectedGuideListEntry={selectedGuideListEntry}
          selectedLauncherApp={selectedLauncherApp}
          selectedLauncherCategory={selectedLauncherCategory}
          selectedStatisticsMenuEntry={selectedStatisticsMenuEntry}
          selectedTrigMenuEntry={selectedTrigMenuEntry}
          setCalculateLatex={setCalculateLatex}
          setEquationLatex={setEquationLatex}
          setGuideQuery={setGuideQuery}
          settings={settings}
          showEditorRuntimeControls={showEditorRuntimeControls}
          shouldShowCalculateAlgebraTray={shouldShowCalculateAlgebraTray}
          shouldShowEquationAlgebraTray={shouldShowEquationAlgebraTray}
          statisticsDraftFieldRef={statisticsDraftFieldRef}
          statisticsDraftLatex={statisticsDraftLatex}
          statisticsKeyboardLayouts={statisticsKeyboardLayouts}
          statisticsMenuFooterText={statisticsMenuFooterText}
          statisticsRouteMeta={statisticsRouteMeta}
          statisticsScreen={statisticsScreen}
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
          variableMemory={variableMemory}
        />
        <SoftMenu actions={activeSoftMenu} onAction={handleSoftAction} />

        <main className="workspace">
          <div className="mode-workspace">
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
                advancedGuideArticleId={calculateAdvancedGuideArticleId ?? null}
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
              <AdvancedCalculusWorkspace
                screen={advancedCalcScreen}
                isMenuOpen={isAdvancedCalcMenuOpen}
                routeMeta={advancedCalcRouteMeta}
                coreGuideArticleId={advancedCalcCoreGuideArticleId}
                menuPanelRef={advancedMenuPanelRef}
                menuEntries={advancedCalcMenuEntries}
                menuSelection={currentAdvancedCalcMenuIndex}
                menuFooterText={advancedCalcMenuFooterText}
                onOpenScreen={openAdvancedCalcScreen}
                onSetMenuSelection={setCurrentAdvancedCalcMenuIndex}
                onOpenGuideArticle={openGuideArticle}
                onOpenGuideMode={() => openGuideMode('calculus')}
                onLoadWorkbenchToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                onCopyWorkbenchExpression={copyAdvancedCalcWorkbenchExpression}
                onRegisterActiveField={(field) => {
                  activeFieldRef.current = field;
                }}
                keyboardLayouts={advancedCalcKeyboardLayouts}
                workbenchLatex={advancedCalcWorkbenchExpression}
                derivativeFieldRef={derivativeFieldRef}
                derivativePointFieldRef={derivativePointFieldRef}
                derivativePointValueRef={derivativePointValueRef}
                advancedIndefiniteFieldRef={advancedIndefiniteFieldRef}
                advancedDefiniteFieldRef={advancedDefiniteFieldRef}
                advancedImproperFieldRef={advancedImproperFieldRef}
                advancedFiniteLimitFieldRef={advancedFiniteLimitFieldRef}
                advancedInfiniteLimitFieldRef={advancedInfiniteLimitFieldRef}
                maclaurinFieldRef={maclaurinFieldRef}
                taylorFieldRef={taylorFieldRef}
                partialDerivativeFieldRef={partialDerivativeFieldRef}
                firstOrderOdeLhsFieldRef={firstOrderOdeLhsFieldRef}
                firstOrderOdeRhsFieldRef={firstOrderOdeRhsFieldRef}
                secondOrderOdeForcingFieldRef={secondOrderOdeForcingFieldRef}
                numericIvpFieldRef={numericIvpFieldRef}
                advancedDefiniteLowerRef={advancedDefiniteLowerRef}
                advancedImproperLowerRef={advancedImproperLowerRef}
                advancedFiniteLimitTargetRef={advancedFiniteLimitTargetRef}
                taylorCenterRef={taylorCenterRef}
                secondOrderA2Ref={secondOrderA2Ref}
                numericIvpX0Ref={numericIvpX0Ref}
                derivativeWorkbench={derivativeWorkbench}
                setDerivativeWorkbench={setDerivativeWorkbench}
                derivativePointWorkbench={derivativePointWorkbench}
                setDerivativePointWorkbench={setDerivativePointWorkbench}
                advancedIndefiniteIntegral={advancedIndefiniteIntegral}
                setAdvancedIndefiniteIntegral={setAdvancedIndefiniteIntegral}
                advancedDefiniteIntegral={advancedDefiniteIntegral}
                setAdvancedDefiniteIntegral={setAdvancedDefiniteIntegral}
                advancedImproperIntegral={advancedImproperIntegral}
                setAdvancedImproperIntegral={setAdvancedImproperIntegral}
                advancedFiniteLimit={advancedFiniteLimit}
                setAdvancedFiniteLimit={setAdvancedFiniteLimit}
                advancedInfiniteLimit={advancedInfiniteLimit}
                setAdvancedInfiniteLimit={setAdvancedInfiniteLimit}
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
                routeMeta={equationRouteMeta}
                screen={equationScreen}
                isMenuOpen={isEquationMenuOpen}
                currentMenuScreen={currentEquationMenuScreen}
                menuPanelRef={equationMenuPanelRef}
                menuEntries={equationMenuEntries}
                currentMenuIndex={currentEquationMenuIndex}
                menuFooterText={equationMenuFooterText}
                onOpenScreen={openEquationScreen}
                onHoverMenuIndex={setCurrentEquationMenuIndex}
                system2={system2}
                system3={system3}
                systemInputRefs={systemInputRefs}
                onSetSystemCell={setSystemCell}
                polynomialSystem2Latex={polynomialSystem2Latex}
                onSetPolynomialSystemEquation={setPolynomialSystemEquation}
                onFocusPolynomialSystemField={(field) => {
                  activeFieldRef.current = field;
                }}
                activePolynomialView={activePolynomialView}
                activePolynomialMeta={activePolynomialMeta}
                activePolynomialCoefficients={activePolynomialCoefficients}
                polynomialInputRefs={polynomialInputRefs}
                onSetPolynomialCoefficient={setPolynomialCoefficient}
                polynomialTemplateLatex={polynomialTemplateLatex}
                buildPolynomialEquationLatex={buildPolynomialEquationLatex}
                solveTargetCandidates={equationSolveTargetResolution?.candidates ?? []}
                selectedSolveTarget={equationSolveTargetResolution?.selectedTarget ?? null}
                answerMode={settings.equationAnswerMode}
                shouldShowSolveTargetSelector={
                  Boolean(equationSolveTargetResolution?.shouldShowSelector)
                }
                solveTargetMessage={equationSolveTargetResolution?.message}
                onSelectSolveTarget={setEquationSolveTarget}
                onSetAnswerMode={(mode) => patchSettings({ equationAnswerMode: mode })}
                shouldAllowNumericSolve={shouldAllowEquationNumericSolve()}
                shouldShowNumericSolvePanel={shouldShowEquationNumericSolvePanel()}
                equationNumericSolvePanel={equationNumericSolvePanel}
                onSetNumericSolvePanelEnabled={(enabled) =>
                  setEquationNumericSolvePanel((currentPanel) => ({ ...currentPanel, enabled }))}
                onUpdateNumericStart={(nextValue) =>
                  setEquationNumericSolvePanel((currentPanel) => ({ ...currentPanel, start: String(nextValue) }))}
                onUpdateNumericEnd={(nextValue) =>
                  setEquationNumericSolvePanel((currentPanel) => ({ ...currentPanel, end: String(nextValue) }))}
                onUpdateNumericSubdivisions={(nextValue) =>
                  setEquationNumericSolvePanel((currentPanel) => ({
                    ...currentPanel,
                    subdivisions: nextValue || 0,
                  }))}
                onRunEquationNumericSolve={runEquationNumericSolveAction}
                onOpenGuideArticle={openGuideArticle}
                onOpenGuideMode={() => openGuideMode('equation')}
                storedVariables={variableMemory}
              />
            ) : null}

            {currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table' ? (
              <LinearAlgebraTableWorkspaceHost
                activeFieldRef={activeFieldRef}
                currentMode={currentMode}
                isLauncherOpen={isLauncherOpen}
                linearAlgebraRuntime={linearAlgebraRuntime}
                matrixKeyboardLayouts={matrixKeyboardLayouts}
                matrixNotationFieldRef={matrixNotationFieldRef}
                onCopyText={copyText}
                onOpenGuideArticle={openGuideArticle}
                onOpenGuideMode={openGuideMode}
                tableKeyboardLayouts={tableKeyboardLayouts}
                tableRuntime={tableRuntime}
                variableMemory={variableMemory}
                vectorKeyboardLayouts={vectorKeyboardLayouts}
                vectorNotationFieldRef={vectorNotationFieldRef}
              />
            ) : null}
            </Suspense>
          </div>

        </main>
        <KeypadPanel
          rows={KEYPAD_ROWS}
          activeLayer={effectiveKeypadLayer}
          layerLocked={keypadLayerLocked}
          onKeypad={handleKeypad}
          onSelectLayer={selectKeypadLayer}
          onToggleLayerLock={toggleKeypadLayerLock}
        />
      </div>

        <Suspense fallback={<LazySideSurfaceFallback />}>
          <SideSurfaceHost
            sideSurface={leftInspectorSurface}
            side={leftInspectorSide}
            hostStyle={leftInspectorHostStyle}
            outboardOpen={leftInspectorOutboardOpen}
            overlayOpen={leftInspectorOverlayOpen}
            onClose={closeLeftInspector}
            renderSurface={renderActiveLeftInspector}
          />
          <SideSurfaceHost
            sideSurface={sideSurface}
            side={sideSurfaceSide}
            hostStyle={sideSurfaceHostStyle}
            outboardOpen={sideSurfaceOutboardOpen}
            overlayOpen={sideSurfaceOverlayOpen}
            onClose={closeSideSurface}
            renderSurface={renderActiveSideSurface}
          />
        </Suspense>
      </div>
      </div>
      </EditorAnalysisControlProvider>
    </MathNotationProvider>
  );
}
