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
import { useLauncherRuntime } from './app/runtime/useLauncherRuntime';
import { useShellFocusRuntime } from './app/runtime/useShellFocusRuntime';
import { useLinearAlgebraRuntime } from './app/runtime/useLinearAlgebraRuntime';
import { useTableRuntime } from './app/runtime/useTableRuntime';
import { useLabsRuntime } from './app/runtime/useLabsRuntime';
import { EditorAnalysisControlProvider } from './lib/editor/editor-analysis-control-provider';
import { EDITOR_ANALYSIS_MAX_LATEX_LENGTH } from './lib/editor/editor-analysis-runtime';
import { useEditorAnalysis } from './lib/editor/use-editor-analysis';
import { useAsyncEditorAnalysis } from './lib/editor/use-async-editor-analysis';
import { createCoreDraftState, isCoreDraftEditable } from './lib/modes/core-mode';
import {
  getAdvancedCalcMenuEntries,
  getAdvancedCalcMenuEntryAtIndex,
  getAdvancedCalcMenuEntryByHotkey,
  getAdvancedCalcMenuFooterText,
  getAdvancedCalcParentScreen,
  getAdvancedCalcRouteMeta,
  getAdvancedCalcSoftActions,
  isAdvancedCalcMenuScreen,
  moveAdvancedCalcMenuIndex,
} from './lib/advanced-calc/navigation';
import { trimHarmlessTrailingMathSpacing } from './lib/input/input-canonicalization';
import {
  buildGeometryInputLatex,
  DEFAULT_ARC_SECTOR_STATE,
  DEFAULT_CIRCLE_STATE,
  DEFAULT_CONE_STATE,
  DEFAULT_CUBE_STATE,
  DEFAULT_CUBOID_STATE,
  DEFAULT_CYLINDER_STATE,
  DEFAULT_DISTANCE_STATE,
  DEFAULT_LINE_EQUATION_STATE,
  DEFAULT_MIDPOINT_STATE,
  DEFAULT_RECTANGLE_STATE,
  DEFAULT_SLOPE_STATE,
  DEFAULT_SPHERE_STATE,
  DEFAULT_SQUARE_STATE,
  DEFAULT_TRIANGLE_AREA_STATE,
  DEFAULT_TRIANGLE_HERON_STATE,
  GEOMETRY_LINE_FORM_LABELS,
} from './lib/geometry/examples';
import {
  getGeometryMenuEntries,
  getGeometryMenuEntryAtIndex,
  getGeometryMenuEntryByHotkey,
  getGeometryMenuFooterText,
  getGeometryParentScreen,
  getGeometryRouteMeta,
  getGeometrySoftActions,
  isGeometryCoreEditableScreen,
  isGeometryMenuScreen,
  moveGeometryMenuIndex,
} from './lib/geometry/navigation';
import {
  geometryDraftStyle,
  geometryRequestToScreen,
  parseGeometryDraft,
} from './lib/geometry/parser';
import { getAdvancedCalcProvenanceBadge } from './lib/advanced-calc/ui';
import {
  getCalculusDerivativeStrategyBadges,
  getCalculusStrategyBadge,
} from './lib/calculus/calculus-strategy';
import { setNumericOutputSettings } from './lib/display/numeric-output';
import {
  buildAdvancedFiniteLimitLatex,
  buildAdvancedInfiniteLimitLatex,
  buildAdvancedIntegralLatex,
  buildFirstOrderOdeLatex,
  buildNumericIvpLatex,
  buildPartialDerivativeLatex,
  buildSecondOrderOdeLatex,
  buildSeriesPreviewLatex,
  DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_FINITE_LIMIT_STATE,
  DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INFINITE_LIMIT_STATE,
  DEFAULT_FIRST_ORDER_ODE_STATE,
  DEFAULT_MACLAURIN_STATE,
  DEFAULT_NUMERIC_IVP_STATE,
  DEFAULT_PARTIAL_DERIVATIVE_STATE,
  DEFAULT_SECOND_ORDER_ODE_STATE,
  DEFAULT_TAYLOR_STATE,
} from './lib/advanced-calc/examples';
import {
  getCalculateMenuEntries,
  getCalculateMenuEntryAtIndex,
  getCalculateMenuEntryByHotkey,
  getCalculateMenuFooterText,
  getCalculateRouteMeta,
  getCalculateSoftActions,
  isCalculateMenuScreen,
  isCalculateToolScreen,
  moveCalculateMenuIndex,
} from './lib/modes/calculate-navigation';
import {
  type AlgebraTransformAction,
  getAlgebraTransformLabel,
} from './lib/algebra/algebra-transform-ui';
import {
  buildWorkbenchExpression,
  cycleIntegralKind,
  cycleLimitDirection,
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
  DEFAULT_INTEGRAL_WORKBENCH,
  DEFAULT_LIMIT_WORKBENCH,
} from './lib/calculus/calculus-workbench';
import { copyableGuideExampleLatex, getSelectedGuideExample } from './lib/guide/examples';
import {
  getActiveGuideHomeEntries,
  getGuideArticle,
  getGuideModeRef,
} from './lib/guide/content';
import {
  clampGuideIndex,
  getGuideListEntries,
  getGuideParentRoute,
  getGuideRouteMeta,
  moveGuideIndex,
} from './lib/guide/navigation';
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
  buildStatisticsInputLatex,
  defaultStatisticsDraftForScreen,
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_CORRELATION_STATE,
  DEFAULT_FREQUENCY_TABLE,
  DEFAULT_MEAN_INFERENCE_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_REGRESSION_STATE,
  DEFAULT_STATS_DATASET,
} from './lib/statistics/examples';
import {
  getStatisticsMenuEntries,
  getStatisticsMenuEntryAtIndex,
  getStatisticsMenuEntryByHotkey,
  getStatisticsMenuFooterText,
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  getStatisticsSoftActions,
  isStatisticsMenuScreen,
  moveStatisticsMenuIndex,
} from './lib/statistics/navigation';
import {
  parseStatisticsDraft,
  statisticsDraftStyle,
  statisticsRequestToScreen,
} from './lib/statistics/parser';
import {
  clearStatisticsSourceSyncState,
  collapseDatasetToFrequencyTable,
  DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  datasetTextFromValues,
  expandFrequencyTableToDataset,
  pointsTextFromState,
  statisticsSourceSyncFromDatasetEdit,
  statisticsSourceSyncFromFrequencyEdit,
  statisticsRequestToWorkingSource,
} from './lib/statistics/shared';
import {
  buildTrigInputLatex,
  defaultTrigDraftForScreen,
  DEFAULT_ANGLE_CONVERT_STATE,
  DEFAULT_COSINE_RULE_STATE,
  DEFAULT_RIGHT_TRIANGLE_STATE,
  DEFAULT_SINE_RULE_STATE,
  DEFAULT_TRIG_EQUATION_STATE,
  DEFAULT_TRIG_FUNCTION_STATE,
  DEFAULT_TRIG_IDENTITY_STATE,
  TRIG_TARGET_FORM_LABELS,
} from './lib/trigonometry/examples';
import {
  parseTrigDraft,
  trigDraftStyle,
  trigRequestToScreen,
} from './lib/trigonometry/parser';
import { buildTrigStructuredDraft, serializeTrigRequest } from './lib/trigonometry/serializer';
import {
  getTrigMenuEntries,
  getTrigMenuEntryAtIndex,
  getTrigMenuEntryByHotkey,
  getTrigMenuFooterText,
  getTrigParentScreen,
  getTrigRouteMeta,
  getTrigSoftActions,
  isTrigMenuScreen,
  moveTrigMenuIndex,
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
  guideSoftActionLabel,
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
  persistCalculatorMemorySnapshot,
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
  createCalculateRuntimeController,
  createEquationRuntimeController,
} from './app/logic/runtimeControllers';
import type { RunCalculateModeRequest } from './lib/modes/calculate';
import type { RunEquationModeRequest } from './lib/modes/equation';
import { executePrimaryActionWithDeps } from './app/logic/primaryActionRouter';
import { handleSoftActionWithDeps } from './app/logic/softActionRouter';
import { handleKeypadWithDeps } from './app/logic/keypadRouter';
import { handleWindowKeydownWithDeps } from './app/logic/windowKeyRouter';
import {
  DEFAULT_SETTINGS,
  type AdvancedCalcResultOrigin,
  type BinomialState,
  type CalculatorMemorySnapshot,
  type AdvancedCalcScreen,
  type AdvancedDefiniteIntegralState,
  type AdvancedFiniteLimitState,
  type AdvancedImproperIntegralState,
  type AdvancedIndefiniteIntegralState,
  type AdvancedInfiniteLimitState,
  type CorrelationState,
  type CalculateScreen,
  type CosineRuleState,
  type CoreDraftState,
  type EquationScreen,
  type DisplayOutcomeAction,
  type FrequencyTable,
  type FirstOrderOdeState,
  type DerivativePointWorkbenchState,
  type DerivativeWorkbenchState,
  type DistanceState,
  type ArcSectorState,
  type CircleState,
  type ConeState,
  type CubeState,
  type CuboidState,
  type CylinderState,
  type GuideRoute,
  type GuideModeId,
  type DisplayOutcome,
  type GuideExample,
  type HistoryEntry,
  type ModeId,
  type GeometryScreen,
  type IntegralWorkbenchState,
  type LineEquationState,
  type MeanInferenceState,
  type MidpointState,
  type LimitWorkbenchState,
  type NormalState,
  type PolynomialEquationView,
  type NumericIvpState,
  type PartialDerivativeWorkbenchState,
  type PoissonState,
  type PeriodicFamilyInfo,
  type RegressionState,
  type ResultOrigin,
  type RightTriangleState,
  type SineRuleState,
  type SeriesState,
  type Settings,
  type SettingsPatch,
  type SecondOrderOdeState,
  type RectangleState,
  type SlopeState,
  type SphereState,
  type SquareState,
  type SimultaneousEquationView,
  type StatisticsScreen,
  type StatisticsRequest,
  type StatisticsSourceSyncState,
  type StatisticsWorkingSource,
  type StoredVariableValue,
  type StatsDataset,
  type TriangleAreaState,
  type TriangleHeronState,
  type TrigEquationState,
  type TrigFunctionState,
  type TrigIdentityState,
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
const CALCULATOR_MEMORY_SETTLED_DELAY_MS = 1000;
const CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS = 20_000;
const CALCULATOR_MEMORY_MAX_JSON_LENGTH = 200_000;

export default function App() {
  const showModeTabs = import.meta.env.DEV && import.meta.env.VITE_SHOW_MODE_TABS === '1';
  const labsEnabled = import.meta.env.DEV && import.meta.env.VITE_SHOW_LABS === '1';
  const labsRuntime = useLabsRuntime({ labsEnabled });
  const [currentMode, setCurrentMode] = useState<ModeId>('calculate');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [variableMemory, setVariableMemory] = useState<StoredVariableValue[]>([]);
  const [keypadLayer, setKeypadLayer] = useState<KeypadLayer>('base');
  const [keypadMomentaryLayer, setKeypadMomentaryLayer] = useState<KeypadLayer | null>(null);
  const [keypadLayerLocked, setKeypadLayerLocked] = useState(false);
  const effectiveKeypadLayer = keypadMomentaryLayer ?? keypadLayer;
  const [calculateReplayVariableSubstitutions, setCalculateReplayVariableSubstitutions] =
    useState<{
      inputLatex: string;
      substitutions: VariableSubstitutionSnapshot[];
    } | null>(null);
  const [replayVariableSubstitutions, setReplayVariableSubstitutions] =
    useState<{
      mode: ModeId;
      inputLatex: string;
      substitutions: VariableSubstitutionSnapshot[];
    } | null>(null);
  const [runtimeLabel, setRuntimeLabel] = useState('Browser preview');
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<DisplayOutcome | null>(null);
  const [calculateLatex, setCalculateLatex] = useState('');
  const [calculateScreen, setCalculateScreen] = useState<CalculateScreen>('standard');
  const [calculateAlgebraTrayOpen, setCalculateAlgebraTrayOpen] = useState(false);
  const [calculateMenuSelection, setCalculateMenuSelection] = useState(0);
  const [derivativeWorkbench, setDerivativeWorkbench] = useState<DerivativeWorkbenchState>(
    DEFAULT_DERIVATIVE_WORKBENCH,
  );
  const [derivativePointWorkbench, setDerivativePointWorkbench] =
    useState<DerivativePointWorkbenchState>(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
  const [integralWorkbench, setIntegralWorkbench] = useState<IntegralWorkbenchState>(
    DEFAULT_INTEGRAL_WORKBENCH,
  );
  const [limitWorkbench, setLimitWorkbench] = useState<LimitWorkbenchState>(
    DEFAULT_LIMIT_WORKBENCH,
  );
  const [advancedCalcScreen, setAdvancedCalcScreen] = useState<AdvancedCalcScreen>('home');
  const [advancedCalcMenuSelection, setAdvancedCalcMenuSelection] = useState({
    home: 0,
    integralsHome: 0,
    limitsHome: 0,
    seriesHome: 0,
    partialsHome: 0,
    odeHome: 0,
  });
  const [advancedIndefiniteIntegral, setAdvancedIndefiniteIntegral] =
    useState<AdvancedIndefiniteIntegralState>(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
  const [advancedDefiniteIntegral, setAdvancedDefiniteIntegral] =
    useState<AdvancedDefiniteIntegralState>(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
  const [advancedImproperIntegral, setAdvancedImproperIntegral] =
    useState<AdvancedImproperIntegralState>(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
  const [advancedFiniteLimit, setAdvancedFiniteLimit] =
    useState<AdvancedFiniteLimitState>(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
  const [advancedInfiniteLimit, setAdvancedInfiniteLimit] =
    useState<AdvancedInfiniteLimitState>(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
  const [maclaurinState, setMaclaurinState] = useState<SeriesState>(DEFAULT_MACLAURIN_STATE);
  const [taylorState, setTaylorState] = useState<SeriesState>(DEFAULT_TAYLOR_STATE);
  const [partialDerivativeState, setPartialDerivativeState] =
    useState<PartialDerivativeWorkbenchState>(DEFAULT_PARTIAL_DERIVATIVE_STATE);
  const [firstOrderOdeState, setFirstOrderOdeState] =
    useState<FirstOrderOdeState>(DEFAULT_FIRST_ORDER_ODE_STATE);
  const [secondOrderOdeState, setSecondOrderOdeState] =
    useState<SecondOrderOdeState>(DEFAULT_SECOND_ORDER_ODE_STATE);
  const [numericIvpState, setNumericIvpState] = useState<NumericIvpState>(DEFAULT_NUMERIC_IVP_STATE);
  const [trigScreen, setTrigScreen] = useState<TrigScreen>('home');
  const [trigMenuSelection, setTrigMenuSelection] = useState({
    home: 0,
    identitiesHome: 0,
    equationsHome: 0,
    trianglesHome: 0,
  });
  const [trigFunctionState, setTrigFunctionState] =
    useState<TrigFunctionState>(DEFAULT_TRIG_FUNCTION_STATE);
  const [trigIdentityState, setTrigIdentityState] =
    useState<TrigIdentityState>(DEFAULT_TRIG_IDENTITY_STATE);
  const [trigEquationState, setTrigEquationState] =
    useState<TrigEquationState>(DEFAULT_TRIG_EQUATION_STATE);
  const [rightTriangleState, setRightTriangleState] =
    useState<RightTriangleState>(DEFAULT_RIGHT_TRIANGLE_STATE);
  const [sineRuleState, setSineRuleState] =
    useState<SineRuleState>(DEFAULT_SINE_RULE_STATE);
  const [cosineRuleState, setCosineRuleState] =
    useState<CosineRuleState>(DEFAULT_COSINE_RULE_STATE);
  const [angleConvertState, setAngleConvertState] =
    useState(DEFAULT_ANGLE_CONVERT_STATE);
  const [specialAnglesExpression, setSpecialAnglesExpression] = useState('\\cos\\left(\\frac{\\pi}{3}\\right)');
  const [trigDraftState, setTrigDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'shorthand', 'guided', true),
  );
  const [geometryScreen, setGeometryScreen] = useState<GeometryScreen>('home');
  const [geometryMenuSelection, setGeometryMenuSelection] = useState({
    home: 0,
    shapes2dHome: 0,
    shapes3dHome: 0,
    triangleHome: 0,
    circleHome: 0,
    coordinateHome: 0,
  });
  const [statisticsScreen, setStatisticsScreen] = useState<StatisticsScreen>('home');
  const [statisticsMenuSelection, setStatisticsMenuSelection] = useState({
    home: 0,
    probabilityHome: 0,
    inferenceHome: 0,
  });
  const [statisticsWorkingSource, setStatisticsWorkingSource] = useState<StatisticsWorkingSource>('dataset');
  const [statisticsSourceSyncState, setStatisticsSourceSyncState] = useState<StatisticsSourceSyncState>(
    DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  );
  const [statsDataset, setStatsDataset] = useState<StatsDataset>(DEFAULT_STATS_DATASET);
  const [frequencyTable, setFrequencyTable] = useState<FrequencyTable>(DEFAULT_FREQUENCY_TABLE);
  const [binomialState, setBinomialState] = useState<BinomialState>(DEFAULT_BINOMIAL_STATE);
  const [normalState, setNormalState] = useState<NormalState>(DEFAULT_NORMAL_STATE);
  const [poissonState, setPoissonState] = useState<PoissonState>(DEFAULT_POISSON_STATE);
  const [meanInferenceState, setMeanInferenceState] = useState<MeanInferenceState>(
    DEFAULT_MEAN_INFERENCE_STATE,
  );
  const [regressionState, setRegressionState] = useState<RegressionState>(DEFAULT_REGRESSION_STATE);
  const [correlationState, setCorrelationState] = useState<CorrelationState>(DEFAULT_CORRELATION_STATE);
  const [statisticsDraftState, setStatisticsDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const [triangleAreaState, setTriangleAreaState] =
    useState<TriangleAreaState>(DEFAULT_TRIANGLE_AREA_STATE);
  const [triangleHeronState, setTriangleHeronState] =
    useState<TriangleHeronState>(DEFAULT_TRIANGLE_HERON_STATE);
  const [rectangleState, setRectangleState] =
    useState<RectangleState>(DEFAULT_RECTANGLE_STATE);
  const [squareState, setSquareState] =
    useState<SquareState>(DEFAULT_SQUARE_STATE);
  const [circleState, setCircleState] =
    useState<CircleState>(DEFAULT_CIRCLE_STATE);
  const [arcSectorState, setArcSectorState] =
    useState<ArcSectorState>(DEFAULT_ARC_SECTOR_STATE);
  const [cubeState, setCubeState] =
    useState<CubeState>(DEFAULT_CUBE_STATE);
  const [cuboidState, setCuboidState] =
    useState<CuboidState>(DEFAULT_CUBOID_STATE);
  const [cylinderState, setCylinderState] =
    useState<CylinderState>(DEFAULT_CYLINDER_STATE);
  const [coneState, setConeState] =
    useState<ConeState>(DEFAULT_CONE_STATE);
  const [sphereState, setSphereState] =
    useState<SphereState>(DEFAULT_SPHERE_STATE);
  const [distanceState, setDistanceState] =
    useState<DistanceState>(DEFAULT_DISTANCE_STATE);
  const [midpointState, setMidpointState] =
    useState<MidpointState>(DEFAULT_MIDPOINT_STATE);
  const [slopeState, setSlopeState] =
    useState<SlopeState>(DEFAULT_SLOPE_STATE);
  const [lineEquationState, setLineEquationState] =
    useState<LineEquationState>(DEFAULT_LINE_EQUATION_STATE);
  const [geometryDraftState, setGeometryDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const [equationLatex, setEquationLatex] = useState('');
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
  const activeCalculateRuntimeRef = useRef<{
    calculateLatex: string;
    calculateScreen: CalculateScreen;
    settings: Settings;
    ansLatex: string;
    variableMemory: StoredVariableValue[];
    calculateReplayVariableSubstitutions: {
      inputLatex: string;
      substitutions: VariableSubstitutionSnapshot[];
    } | null;
  } | null>(null);
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
  const [guideRoute, setGuideRoute] = useState<GuideRoute>({ screen: 'home' });
  const [guideSelection, setGuideSelection] = useState({
    home: 0,
    domain: {
      basics: 0,
      algebra: 0,
      discrete: 0,
      calculus: 0,
      linearAlgebra: 0,
      advancedCalculus: 0,
      trigonometry: 0,
      statistics: 0,
      geometry: 0,
    },
    symbolLookup: 0,
    modeGuide: 0,
    search: 0,
    article: {} as Record<string, number>,
  });
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
  const calculatorMemoryReadyRef = useRef(false);
  const calculatorMemoryDirtyRef = useRef(false);
  const calculatorMemorySaveTimerRef = useRef<number | null>(null);
  const calculatorMemoryLastSavedAtRef = useRef(0);
  const calculateMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const derivativeFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointFieldRef = useRef<MathfieldElement | null>(null);
  const integralFieldRef = useRef<MathfieldElement | null>(null);
  const limitFieldRef = useRef<MathfieldElement | null>(null);
  const advancedMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const trigMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const geometryMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const statisticsMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const advancedIndefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedDefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedImproperFieldRef = useRef<MathfieldElement | null>(null);
  const advancedFiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const advancedInfiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const maclaurinFieldRef = useRef<MathfieldElement | null>(null);
  const taylorFieldRef = useRef<MathfieldElement | null>(null);
  const partialDerivativeFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeLhsFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeRhsFieldRef = useRef<MathfieldElement | null>(null);
  const secondOrderOdeForcingFieldRef = useRef<MathfieldElement | null>(null);
  const numericIvpFieldRef = useRef<MathfieldElement | null>(null);
  const trigDraftFieldRef = useRef<MathfieldElement | null>(null);
  const statisticsDraftFieldRef = useRef<MathfieldElement | null>(null);
  const geometryDraftFieldRef = useRef<MathfieldElement | null>(null);
  const matrixNotationFieldRef = useRef<MathfieldElement | null>(null);
  const vectorNotationFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointValueRef = useRef<HTMLInputElement | null>(null);
  const integralLowerRef = useRef<HTMLInputElement | null>(null);
  const limitTargetRef = useRef<HTMLInputElement | null>(null);
  const advancedDefiniteLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedImproperLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedFiniteLimitTargetRef = useRef<HTMLInputElement | null>(null);
  const taylorCenterRef = useRef<HTMLInputElement | null>(null);
  const secondOrderA2Ref = useRef<HTMLInputElement | null>(null);
  const numericIvpX0Ref = useRef<HTMLInputElement | null>(null);
  const rightTriangleSideARef = useRef<HTMLInputElement | null>(null);
  const sineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const cosineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const angleConvertValueRef = useRef<HTMLInputElement | null>(null);
  const squareSideRef = useRef<HTMLInputElement | null>(null);
  const rectangleWidthRef = useRef<HTMLInputElement | null>(null);
  const triangleAreaBaseRef = useRef<HTMLInputElement | null>(null);
  const triangleHeronARef = useRef<HTMLInputElement | null>(null);
  const circleRadiusRef = useRef<HTMLInputElement | null>(null);
  const arcSectorRadiusRef = useRef<HTMLInputElement | null>(null);
  const cubeSideRef = useRef<HTMLInputElement | null>(null);
  const cuboidLengthRef = useRef<HTMLInputElement | null>(null);
  const cylinderRadiusRef = useRef<HTMLInputElement | null>(null);
  const coneRadiusRef = useRef<HTMLInputElement | null>(null);
  const sphereRadiusRef = useRef<HTMLInputElement | null>(null);
  const distanceP1XRef = useRef<HTMLInputElement | null>(null);
  const midpointP1XRef = useRef<HTMLInputElement | null>(null);
  const slopeP1XRef = useRef<HTMLInputElement | null>(null);
  const lineEquationP1XRef = useRef<HTMLInputElement | null>(null);
  const statisticsBinomialNRef = useRef<HTMLInputElement | null>(null);
  const statisticsNormalMeanRef = useRef<HTMLInputElement | null>(null);
  const statisticsPoissonLambdaRef = useRef<HTMLInputElement | null>(null);
  const statisticsMeanInferenceLevelRef = useRef<HTMLInputElement | null>(null);
  const statisticsRegressionXRef = useRef<HTMLInputElement | null>(null);
  const statisticsCorrelationXRef = useRef<HTMLInputElement | null>(null);
  const statisticsFrequencyValueRef = useRef<HTMLInputElement | null>(null);
  const statisticsDatasetRef = useRef<HTMLTextAreaElement | null>(null);
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

  const {
    calculatorShellStyle,
    closeHistoryPanel,
    closeLeftInspector,
    closeSettingsPanel,
    closeSideSurface,
    closeVariablesPanel,
    historyOpen,
    leftInspectorHostStyle,
    leftInspectorOutboardOpen,
    leftInspectorOverlayOpen,
    leftInspectorSide,
    leftInspectorSurface,
    openLeftMenuInspector,
    settingsOpen,
    sideSurface,
    sideSurfaceHostStyle,
    sideSurfaceOutboardOpen,
    sideSurfaceOverlayOpen,
    sideSurfacePresentation,
    sideSurfaceSide,
    toggleHistoryPanel: toggleHistoryPanelBase,
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
    calculateScreen,
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

      if (entry.launch.mode === 'advancedCalculus') {
        openAdvancedCalcScreen(entry.launch.advancedCalcScreen ?? 'home');
        setMode('advancedCalculus');
        return;
      }

      if (entry.launch.mode === 'trigonometry') {
        openTrigScreen(entry.launch.trigScreen ?? 'home');
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

      openGeometryScreen(entry.launch.geometryScreen ?? 'home');
      setMode('geometry');
    },
  });

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
  });

  const tableRuntime = useTableRuntime({
    commitOutcome,
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions: () => setReplayVariableSubstitutions(null),
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

  function restoreCalculatorMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    setSettings(snapshot.settings);
    setHistory(snapshot.history);
    setVariableMemory(snapshot.variableMemory);
    setAnsLatex(snapshot.ansLatex);
    setDisplayOutcome(null);
    setCalculateLatex('');
    setCalculateScreen('standard');
    setCalculateAlgebraTrayOpen(false);
    setEquationLatex('');
    setEquationSolveTarget(null);
    setEquationScreen('home');
    setEquationAlgebraTrayOpen(false);
    setPolynomialSystem2Latex(['', '']);
  }

  const restoreCalculatorMemory = useEffectEvent((snapshot: CalculatorMemorySnapshot) => {
    restoreCalculatorMemorySnapshot(snapshot);
  });

  function boundedCalculatorMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
    try {
      if (JSON.stringify(snapshot).length <= CALCULATOR_MEMORY_MAX_JSON_LENGTH) {
        return snapshot;
      }
    } catch {
      return {
        ...snapshot,
        displayOutcome: null,
        session: {},
      };
    }

    const withoutResult = {
      ...snapshot,
      displayOutcome: null,
    };
    try {
      if (JSON.stringify(withoutResult).length <= CALCULATOR_MEMORY_MAX_JSON_LENGTH) {
        return withoutResult;
      }
    } catch {
      return {
        ...snapshot,
        displayOutcome: null,
        session: {},
      };
    }

    return {
      ...snapshot,
      displayOutcome: null,
      session: {},
    };
  }

  const flushCalculatorMemory = useEffectEvent((force = false) => {
    if (!hydrated || !settings.calculatorMemoryEnabled) {
      return;
    }

    if (!force && !calculatorMemoryDirtyRef.current) {
      return;
    }

    calculatorMemoryDirtyRef.current = false;
    calculatorMemoryLastSavedAtRef.current = Date.now();
    void persistCalculatorMemorySnapshot(
      boundedCalculatorMemorySnapshot(buildCalculatorMemorySnapshot()),
    );
  });

  const scheduleCalculatorMemorySave = useEffectEvent(() => {
    if (!hydrated || !settings.calculatorMemoryEnabled) {
      return;
    }

    if (settings.calculatorMemoryAutosaveMode !== 'settled') {
      return;
    }

    if (calculatorMemorySaveTimerRef.current !== null) {
      window.clearTimeout(calculatorMemorySaveTimerRef.current);
    }

    const elapsed = Date.now() - calculatorMemoryLastSavedAtRef.current;
    const delay = Math.max(
      CALCULATOR_MEMORY_SETTLED_DELAY_MS,
      CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS - elapsed,
    );
    calculatorMemorySaveTimerRef.current = window.setTimeout(() => {
      calculatorMemorySaveTimerRef.current = null;
      flushCalculatorMemory();
    }, delay);
  });

  const symbolicDisplayPrefs = {
    symbolicDisplayMode: settings.symbolicDisplayMode,
    flattenNestedRootsWhenSafe: settings.flattenNestedRootsWhenSafe,
  } as const;
  const calculateRouteMeta = currentMode === 'calculate'
    ? getCalculateRouteMeta(calculateScreen)
    : null;
  const advancedCalcRouteMeta = currentMode === 'advancedCalculus'
    ? getAdvancedCalcRouteMeta(advancedCalcScreen)
    : null;
  const trigRouteMeta = currentMode === 'trigonometry'
    ? getTrigRouteMeta(trigScreen)
    : null;
  const statisticsRouteMeta = currentMode === 'statistics'
    ? getStatisticsRouteMeta(statisticsScreen)
    : null;
  const geometryRouteMeta = currentMode === 'geometry'
    ? getGeometryRouteMeta(geometryScreen)
    : null;
  const isCalculateMenuOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateMenuScreen(calculateScreen);
  const isCalculateToolOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateToolScreen(calculateScreen);
  const isAdvancedCalcMenuOpen =
    !isLauncherOpen && currentMode === 'advancedCalculus' && isAdvancedCalcMenuScreen(advancedCalcScreen);
  const isTrigMenuOpen =
    !isLauncherOpen && currentMode === 'trigonometry' && isTrigMenuScreen(trigScreen);
  const isStatisticsMenuOpen =
    !isLauncherOpen && currentMode === 'statistics' && isStatisticsMenuScreen(statisticsScreen);
  const isGeometryMenuOpen =
    !isLauncherOpen && currentMode === 'geometry' && isGeometryMenuScreen(geometryScreen);
  const advancedCalcMenuEntries = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntries(advancedCalcScreen)
    : [];
  const trigMenuEntries = isTrigMenuOpen
    ? getTrigMenuEntries(trigScreen)
    : [];
  const statisticsMenuEntries = isStatisticsMenuOpen
    ? getStatisticsMenuEntries(statisticsScreen)
    : [];
  const geometryMenuEntries = isGeometryMenuOpen
    ? getGeometryMenuEntries(geometryScreen)
    : [];
  const currentAdvancedCalcMenuIndex = isAdvancedCalcMenuOpen
    ? advancedCalcMenuSelection[
      advancedCalcScreen as keyof typeof advancedCalcMenuSelection
    ]
    : 0;
  const currentTrigMenuIndex = isTrigMenuOpen
    ? trigMenuSelection[
      trigScreen as keyof typeof trigMenuSelection
    ]
    : 0;
  const currentStatisticsMenuIndex = isStatisticsMenuOpen
    ? statisticsMenuSelection[
      statisticsScreen as keyof typeof statisticsMenuSelection
    ]
    : 0;
  const currentGeometryMenuIndex = isGeometryMenuOpen
    ? geometryMenuSelection[
      geometryScreen as keyof typeof geometryMenuSelection
    ]
    : 0;
  const selectedAdvancedCalcMenuEntry = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntryAtIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex)
    : undefined;
  const selectedTrigMenuEntry = isTrigMenuOpen
    ? getTrigMenuEntryAtIndex(trigScreen, currentTrigMenuIndex)
    : undefined;
  const selectedStatisticsMenuEntry = isStatisticsMenuOpen
    ? getStatisticsMenuEntryAtIndex(statisticsScreen, currentStatisticsMenuIndex)
    : undefined;
  const selectedGeometryMenuEntry = isGeometryMenuOpen
    ? getGeometryMenuEntryAtIndex(geometryScreen, currentGeometryMenuIndex)
    : undefined;
  const calculateMenuEntries = isCalculateMenuOpen ? getCalculateMenuEntries() : [];
  const selectedCalculateMenuEntry = isCalculateMenuOpen
    ? getCalculateMenuEntryAtIndex(calculateMenuSelection)
    : undefined;
  const calculateMenuFooterText = currentMode === 'calculate'
    ? getCalculateMenuFooterText(calculateScreen)
    : '';
  const advancedCalcMenuFooterText = currentMode === 'advancedCalculus'
    ? getAdvancedCalcMenuFooterText(advancedCalcScreen)
    : '';
  const trigMenuFooterText = currentMode === 'trigonometry'
    ? getTrigMenuFooterText(trigScreen)
    : '';
  const statisticsMenuFooterText = currentMode === 'statistics'
    ? getStatisticsMenuFooterText(statisticsScreen)
    : '';
  const geometryMenuFooterText = currentMode === 'geometry'
    ? getGeometryMenuFooterText(geometryScreen)
    : '';
  const statisticsStateSnapshot = {
    dataset: statsDataset,
    frequencyTable,
    binomial: binomialState,
    normal: normalState,
    poisson: poissonState,
    meanInference: meanInferenceState,
    regression: regressionState,
    correlation: correlationState,
  };
  const statisticsWorkbenchExpression =
    currentMode === 'statistics'
      ? buildStatisticsInputLatex(
        statisticsScreen,
        statisticsStateSnapshot,
        statisticsWorkingSource,
      )
      : '';
  const statisticsDraftLatex =
    currentMode === 'statistics'
      ? statisticsDraftState.rawLatex
      : '';
  const statisticsEditorIsEditable =
    currentMode === 'statistics'
    && statisticsRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(statisticsDraftState);
  const geometryStateSnapshot = {
    triangleArea: triangleAreaState,
    triangleHeron: triangleHeronState,
    rectangle: rectangleState,
    square: squareState,
    circle: circleState,
    arcSector: arcSectorState,
    cube: cubeState,
    cuboid: cuboidState,
    cylinder: cylinderState,
    cone: coneState,
    sphere: sphereState,
    distance: distanceState,
    midpoint: midpointState,
    slope: slopeState,
    lineEquation: lineEquationState,
  };
  const geometryWorkbenchExpression =
    currentMode === 'geometry'
      ? buildGeometryInputLatex(geometryScreen, geometryStateSnapshot)
      : '';
  const geometryDraftLatex =
    currentMode === 'geometry'
      ? geometryDraftState.rawLatex
      : '';
  const geometryEditorIsEditable =
    currentMode === 'geometry'
    && geometryRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(geometryDraftState);
  const trigStateSnapshot = {
    trigFunction: trigFunctionState,
    trigIdentity: trigIdentityState,
    trigEquation: { ...trigEquationState, angleUnit: settings.angleUnit },
    rightTriangle: rightTriangleState,
    sineRule: sineRuleState,
    cosineRule: cosineRuleState,
    angleConvert: angleConvertState,
    specialAnglesExpression,
  };
  const trigWorkbenchExpression =
    currentMode === 'trigonometry'
      ? buildTrigInputLatex(trigScreen, trigStateSnapshot)
      : '';
  const trigDraftLatex =
    currentMode === 'trigonometry'
      ? trigDraftState.rawLatex
      : '';
  const trigEditorIsEditable =
    currentMode === 'trigonometry'
    && trigRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(trigDraftState);
  const advancedCalcWorkbenchExpression =
    currentMode === 'advancedCalculus'
      ? advancedCalcScreen === 'indefiniteIntegral'
        ? buildAdvancedIntegralLatex('indefinite', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
        : advancedCalcScreen === 'definiteIntegral'
          ? buildAdvancedIntegralLatex('definite', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
          : advancedCalcScreen === 'improperIntegral'
            ? buildAdvancedIntegralLatex('improper', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
            : advancedCalcScreen === 'finiteLimit'
              ? buildAdvancedFiniteLimitLatex(advancedFiniteLimit)
              : advancedCalcScreen === 'infiniteLimit'
                ? buildAdvancedInfiniteLimitLatex(advancedInfiniteLimit)
                : advancedCalcScreen === 'maclaurin'
                  ? buildSeriesPreviewLatex(maclaurinState)
                  : advancedCalcScreen === 'taylor'
                    ? buildSeriesPreviewLatex(taylorState)
                    : advancedCalcScreen === 'partialDerivative'
                      ? buildPartialDerivativeLatex(partialDerivativeState)
                    : advancedCalcScreen === 'odeFirstOrder'
                      ? buildFirstOrderOdeLatex(firstOrderOdeState)
                      : advancedCalcScreen === 'odeSecondOrder'
                        ? buildSecondOrderOdeLatex(secondOrderOdeState)
                        : advancedCalcScreen === 'odeNumericIvp'
                          ? buildNumericIvpLatex(numericIvpState)
                          : ''
      : '';
  const calculateWorkbenchExpression = currentMode === 'calculate'
    ? buildWorkbenchExpression(
      calculateScreen,
      derivativeWorkbench,
      derivativePointWorkbench,
      integralWorkbench,
      limitWorkbench,
    )
    : { latex: '' };
  const currentEquationMenuScreen = isEquationMenuScreen(equationScreen) ? equationScreen : null;
  const guideEnabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;
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
        : currentMode === 'advancedCalculus'
          ? 'Advanced Calc'
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
      : currentMode === 'advancedCalculus'
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
  const guideRouteMeta = currentMode === 'guide'
    ? getGuideRouteMeta(guideRoute, guideEnabledCapabilities)
    : null;
  const guideListEntries = currentMode === 'guide'
    ? getGuideListEntries(guideRoute, guideEnabledCapabilities)
    : [];
  const currentGuideSelectionIndex =
    currentMode !== 'guide'
      ? 0
      : guideRoute.screen === 'home'
        ? guideSelection.home
        : guideRoute.screen === 'domain'
          ? guideSelection.domain[guideRoute.domainId]
          : guideRoute.screen === 'symbolLookup'
            ? guideSelection.symbolLookup
            : guideRoute.screen === 'modeGuide' && !guideRoute.modeId
              ? guideSelection.modeGuide
              : guideRoute.screen === 'search'
                ? guideSelection.search
                : guideRoute.screen === 'article'
                  ? (guideSelection.article[guideRoute.articleId] ?? 0)
                  : 0;
  const selectedGuideListEntry =
    currentMode === 'guide' && guideListEntries.length > 0
      ? guideListEntries[clampGuideIndex(currentGuideSelectionIndex, guideListEntries.length)]
      : undefined;
  const guideArticle =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getGuideArticle(guideRoute.articleId)
      : null;
  const selectedGuideExample =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getSelectedGuideExample(guideArticle ?? undefined, currentGuideSelectionIndex)
      : undefined;
  const guideModeRef =
    currentMode === 'guide' && guideRoute.screen === 'modeGuide' && guideRoute.modeId
      ? getGuideModeRef(guideRoute.modeId)
      : undefined;
  const activeGuideHomeEntries = getActiveGuideHomeEntries(guideEnabledCapabilities);
  const guideSearchQuery =
    currentMode === 'guide' && (guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup')
      ? guideRoute.query
      : '';
  const guideSoftMenu = guideRouteMeta?.softActions.map((action) => {
    const meta = guideSoftActionLabel(action);
    return {
      id: action,
      label: meta.label,
      hotkey: meta.hotkey,
    };
  }) ?? [];
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
    : currentMode === 'advancedCalculus'
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
          restoreCalculatorMemory(savedMemory);
          calculatorMemoryLastSavedAtRef.current = Date.now();
        } else if (bootstrap) {
          setCurrentMode(bootstrap.currentMode === 'labs' && !labsEnabled ? 'calculate' : bootstrap.currentMode);
          setSettings(bootstrap.settings);
          setHistory(loadedHistory);
          setVariableMemory(bootstrap.variableMemory);
        } else {
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
  }, [labsEnabled]);

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

    if (!calculatorMemoryReadyRef.current) {
      calculatorMemoryReadyRef.current = true;
      return;
    }

    calculatorMemoryDirtyRef.current = true;
    scheduleCalculatorMemorySave();
  }, [
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
    if (
      !hydrated
      || !settings.calculatorMemoryEnabled
      || settings.calculatorMemoryAutosaveMode !== 'interval'
    ) {
      return;
    }

    const intervalMs = Math.max(
      settings.calculatorMemoryAutosaveIntervalSeconds * 1000,
      CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS,
    );
    const timer = window.setInterval(() => {
      flushCalculatorMemory();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    hydrated,
    settings.calculatorMemoryAutosaveIntervalSeconds,
    settings.calculatorMemoryAutosaveMode,
    settings.calculatorMemoryEnabled,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushCalculatorMemory(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (calculatorMemorySaveTimerRef.current !== null) {
        window.clearTimeout(calculatorMemorySaveTimerRef.current);
        calculatorMemorySaveTimerRef.current = null;
      }
      flushCalculatorMemory(true);
    };
  }, []);

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
    void clearHistoryEntries();
    setClipboardNotice('History reset');
  }

  function deleteHistoryEntryById(id: string) {
    setHistory((currentHistory) => currentHistory.filter((entry) => entry.id !== id));
    void deleteHistoryEntry(id);
    setClipboardNotice('History entry deleted');
  }

  function resetCalculatorMemory() {
    if (calculatorMemorySaveTimerRef.current !== null) {
      window.clearTimeout(calculatorMemorySaveTimerRef.current);
      calculatorMemorySaveTimerRef.current = null;
    }

    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    setDisplayOutcome(null);
    setAnsLatex('0');
    setCalculateLatex('');
    setCalculateScreen('standard');
    setCalculateAlgebraTrayOpen(false);
    setCalculateMenuSelection(0);
    setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    setIntegralWorkbench(DEFAULT_INTEGRAL_WORKBENCH);
    setLimitWorkbench(DEFAULT_LIMIT_WORKBENCH);

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

    setAdvancedCalcScreen('home');
    setAdvancedCalcMenuSelection({
      home: 0,
      integralsHome: 0,
      limitsHome: 0,
      seriesHome: 0,
      partialsHome: 0,
      odeHome: 0,
    });
    setAdvancedIndefiniteIntegral(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
    setAdvancedDefiniteIntegral(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
    setAdvancedImproperIntegral(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
    setAdvancedFiniteLimit(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
    setAdvancedInfiniteLimit(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
    setMaclaurinState(DEFAULT_MACLAURIN_STATE);
    setTaylorState(DEFAULT_TAYLOR_STATE);
    setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
    setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
    setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
    setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);

    setTrigScreen('home');
    setTrigMenuSelection({
      home: 0,
      identitiesHome: 0,
      equationsHome: 0,
      trianglesHome: 0,
    });
    setTrigFunctionState(DEFAULT_TRIG_FUNCTION_STATE);
    setTrigIdentityState(DEFAULT_TRIG_IDENTITY_STATE);
    setTrigEquationState(DEFAULT_TRIG_EQUATION_STATE);
    setRightTriangleState(DEFAULT_RIGHT_TRIANGLE_STATE);
    setSineRuleState(DEFAULT_SINE_RULE_STATE);
    setCosineRuleState(DEFAULT_COSINE_RULE_STATE);
    setAngleConvertState(DEFAULT_ANGLE_CONVERT_STATE);
    setSpecialAnglesExpression('\\cos\\left(\\frac{\\pi}{3}\\right)');
    setTrigDraftState(createCoreDraftState('', 'shorthand', 'guided', true));

    setStatisticsScreen('home');
    setStatisticsMenuSelection({
      home: 0,
      probabilityHome: 0,
      inferenceHome: 0,
    });
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(DEFAULT_STATISTICS_SOURCE_SYNC_STATE);
    setStatsDataset(DEFAULT_STATS_DATASET);
    setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
    setBinomialState(DEFAULT_BINOMIAL_STATE);
    setNormalState(DEFAULT_NORMAL_STATE);
    setPoissonState(DEFAULT_POISSON_STATE);
    setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
    setRegressionState(DEFAULT_REGRESSION_STATE);
    setCorrelationState(DEFAULT_CORRELATION_STATE);
    setStatisticsDraftState(createCoreDraftState('', 'structured', 'guided', true));

    setGeometryScreen('home');
    setGeometryMenuSelection({
      home: 0,
      shapes2dHome: 0,
      shapes3dHome: 0,
      triangleHome: 0,
      circleHome: 0,
      coordinateHome: 0,
    });
    setTriangleAreaState(DEFAULT_TRIANGLE_AREA_STATE);
    setTriangleHeronState(DEFAULT_TRIANGLE_HERON_STATE);
    setRectangleState(DEFAULT_RECTANGLE_STATE);
    setSquareState(DEFAULT_SQUARE_STATE);
    setCircleState(DEFAULT_CIRCLE_STATE);
    setArcSectorState(DEFAULT_ARC_SECTOR_STATE);
    setCubeState(DEFAULT_CUBE_STATE);
    setCuboidState(DEFAULT_CUBOID_STATE);
    setCylinderState(DEFAULT_CYLINDER_STATE);
    setConeState(DEFAULT_CONE_STATE);
    setSphereState(DEFAULT_SPHERE_STATE);
    setDistanceState(DEFAULT_DISTANCE_STATE);
    setMidpointState(DEFAULT_MIDPOINT_STATE);
    setSlopeState(DEFAULT_SLOPE_STATE);
    setLineEquationState(DEFAULT_LINE_EQUATION_STATE);
    setGeometryDraftState(createCoreDraftState('', 'structured', 'guided', true));

    setGuideRoute({ screen: 'home' });
    setGuideSelection({
      home: 0,
      domain: {
        basics: 0,
        algebra: 0,
        discrete: 0,
        calculus: 0,
        linearAlgebra: 0,
        advancedCalculus: 0,
        trigonometry: 0,
        statistics: 0,
        geometry: 0,
      },
      symbolLookup: 0,
      modeGuide: 0,
      search: 0,
      article: {},
    });

    replaceVariableMemory([]);
    void clearCalculatorMemorySnapshot();
    calculatorMemoryDirtyRef.current = true;
    calculatorMemoryLastSavedAtRef.current = 0;
    setClipboardNotice('Calculator memory reset');
  }

  function insertStoredVariable(entry: StoredVariableValue) {
    insertLatex(namedVariableEditorLatex(entry.name));
  }

  function focusTrigEditor() {
    trigDraftFieldRef.current?.focus?.();
    activeFieldRef.current = trigDraftFieldRef.current;
  }

  function focusStatisticsEditor() {
    statisticsDraftFieldRef.current?.focus?.();
    activeFieldRef.current = statisticsDraftFieldRef.current;
  }

  function focusGeometryEditor() {
    geometryDraftFieldRef.current?.focus?.();
    activeFieldRef.current = geometryDraftFieldRef.current;
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

  function openGuideRoute(route: GuideRoute) {
    setGuideRoute(route);
  }

  function setCurrentGuideSelectionIndex(index: number) {
    setGuideSelection((currentSelection) => {
      if (guideRoute.screen === 'home') {
        return { ...currentSelection, home: index };
      }

      if (guideRoute.screen === 'domain') {
        return {
          ...currentSelection,
          domain: {
            ...currentSelection.domain,
            [guideRoute.domainId]: index,
          },
        };
      }

      if (guideRoute.screen === 'symbolLookup') {
        return { ...currentSelection, symbolLookup: index };
      }

      if (guideRoute.screen === 'modeGuide' && !guideRoute.modeId) {
        return { ...currentSelection, modeGuide: index };
      }

      if (guideRoute.screen === 'search') {
        return { ...currentSelection, search: index };
      }

      if (guideRoute.screen === 'article') {
        return {
          ...currentSelection,
          article: {
            ...currentSelection.article,
            [guideRoute.articleId]: index,
          },
        };
      }

      return currentSelection;
    });
  }

  function moveCurrentGuideSelection(delta: number) {
    const count =
      guideRoute.screen === 'article'
        ? (guideArticle?.examples.length ?? 0)
        : guideListEntries.length;
    setCurrentGuideSelectionIndex(moveGuideIndex(currentGuideSelectionIndex, delta, count));
  }

  function openSelectedGuideEntry() {
    if (selectedGuideListEntry) {
      openGuideRoute(selectedGuideListEntry.route);
    }
  }

  function goBackInGuide() {
    const parentRoute = getGuideParentRoute(guideRoute);
    if (parentRoute) {
      openGuideRoute(parentRoute);
    } else {
      openLauncher();
    }
  }

  function exitGuide() {
    setMode(previousNonGuideMode);
  }

  function applyCalculateSeed(
    screen: CalculateScreen,
    seed: GuideExample['launch']['calculateSeed'],
  ) {
    if (!seed || screen === 'standard' || screen === 'calculusHome') {
      return;
    }

    if (screen === 'derivative') {
      setDerivativeWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'derivativePoint') {
      setDerivativePointWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        point: seed.point ?? currentState.point,
      }));
      return;
    }

    if (screen === 'integral') {
      setIntegralWorkbench((currentState) => ({
        ...currentState,
        kind: seed.kind ?? currentState.kind,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'limit') {
      setLimitWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        target: seed.target ?? currentState.target,
        direction: seed.direction ?? currentState.direction,
        targetKind: seed.targetKind ?? currentState.targetKind,
      }));
    }
  }

  function applyAdvancedCalcSeed(
    screen: AdvancedCalcScreen,
    seed: GuideExample['launch']['advancedCalcSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'indefiniteIntegral') {
      setAdvancedIndefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'definiteIntegral') {
      setAdvancedDefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'improperIntegral') {
      setAdvancedImproperIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lowerKind: seed.lowerKind ?? currentState.lowerKind,
        lower: seed.lower ?? currentState.lower,
        upperKind: seed.upperKind ?? currentState.upperKind,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'finiteLimit') {
      setAdvancedFiniteLimit((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        target: seed.target ?? currentState.target,
        direction: seed.direction ?? currentState.direction,
      }));
      return;
    }

    if (screen === 'infiniteLimit') {
      setAdvancedInfiniteLimit((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        targetKind: seed.targetKind ?? currentState.targetKind,
      }));
      return;
    }

    if (screen === 'maclaurin') {
      setMaclaurinState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        order: seed.order ?? currentState.order,
      }));
      return;
    }

    if (screen === 'taylor') {
      setTaylorState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        center: seed.center ?? currentState.center,
        order: seed.order ?? currentState.order,
      }));
      return;
    }

    if (screen === 'partialDerivative') {
      setPartialDerivativeState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        variable: seed.variable ?? currentState.variable,
      }));
      return;
    }

    if (screen === 'odeFirstOrder') {
      setFirstOrderOdeState((currentState) => ({
        ...currentState,
        lhsLatex: seed.lhsLatex ?? currentState.lhsLatex,
        rhsLatex: seed.rhsLatex ?? currentState.rhsLatex,
        classification: seed.classification ?? currentState.classification,
      }));
      return;
    }

    if (screen === 'odeSecondOrder') {
      setSecondOrderOdeState((currentState) => ({
        ...currentState,
        a2: seed.a2 ?? currentState.a2,
        a1: seed.a1 ?? currentState.a1,
        a0: seed.a0 ?? currentState.a0,
        forcingLatex: seed.forcingLatex ?? currentState.forcingLatex,
      }));
      return;
    }

    if (screen === 'odeNumericIvp') {
      setNumericIvpState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        x0: seed.x0 ?? currentState.x0,
        y0: seed.y0 ?? currentState.y0,
        xEnd: seed.xEnd ?? currentState.xEnd,
        step: seed.step ?? currentState.step,
        method: seed.method ?? currentState.method,
      }));
    }
  }

  function applyTrigSeed(
    screen: TrigScreen,
    seed: GuideExample['launch']['trigSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'functions') {
      const nextState = {
        ...trigFunctionState,
        expressionLatex: seed.expressionLatex ?? trigFunctionState.expressionLatex,
      };
      setTrigFunctionState(nextState);
      setTrigDraftState(trigDraftStateForScreen(screen, nextState.expressionLatex, 'guided'));
      return;
    }

    if (screen === 'identitySimplify' || screen === 'identityConvert') {
      const nextState = {
        ...trigIdentityState,
        expressionLatex: seed.expressionLatex ?? trigIdentityState.expressionLatex,
        targetForm: seed.targetForm ?? trigIdentityState.targetForm,
      };
      setTrigIdentityState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          screen === 'identityConvert'
            ? buildTrigStructuredDraft(screen, {
                ...trigStateSnapshot,
                trigIdentity: nextState,
              })
            : nextState.expressionLatex,
          'guided',
        ),
      );
      return;
    }

    if (screen === 'equationSolve') {
      const nextState = {
        ...trigEquationState,
        equationLatex: seed.equationLatex ?? trigEquationState.equationLatex,
        angleUnit: seed.angleUnit ?? trigEquationState.angleUnit,
      };
      setTrigEquationState(nextState);
      setTrigDraftState(trigDraftStateForScreen(screen, nextState.equationLatex, 'guided'));
      return;
    }

    if (screen === 'rightTriangle') {
      const nextState = {
        ...rightTriangleState,
        knownSideA: seed.knownSideA ?? rightTriangleState.knownSideA,
        knownSideB: seed.knownSideB ?? rightTriangleState.knownSideB,
        knownSideC: seed.knownSideC ?? rightTriangleState.knownSideC,
        knownAngleA: seed.knownAngleA ?? rightTriangleState.knownAngleA,
        knownAngleB: seed.knownAngleB ?? rightTriangleState.knownAngleB,
      };
      setRightTriangleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            rightTriangle: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'sineRule') {
      const nextState = {
        ...sineRuleState,
        sideA: seed.sideA ?? sineRuleState.sideA,
        sideB: seed.sideB ?? sineRuleState.sideB,
        sideC: seed.sideC ?? sineRuleState.sideC,
        angleA: seed.angleA ?? sineRuleState.angleA,
        angleB: seed.angleB ?? sineRuleState.angleB,
        angleC: seed.angleC ?? sineRuleState.angleC,
      };
      setSineRuleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            sineRule: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cosineRule') {
      const nextState = {
        ...cosineRuleState,
        sideA: seed.sideA ?? cosineRuleState.sideA,
        sideB: seed.sideB ?? cosineRuleState.sideB,
        sideC: seed.sideC ?? cosineRuleState.sideC,
        angleA: seed.angleA ?? cosineRuleState.angleA,
        angleB: seed.angleB ?? cosineRuleState.angleB,
        angleC: seed.angleC ?? cosineRuleState.angleC,
      };
      setCosineRuleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            cosineRule: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'angleConvert') {
      const nextState = {
        ...angleConvertState,
        value: seed.value ?? angleConvertState.value,
        from: seed.from ?? angleConvertState.from,
        to: seed.to ?? angleConvertState.to,
      };
      setAngleConvertState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            angleConvert: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'specialAngles' && seed.expressionLatex) {
      setSpecialAnglesExpression(seed.expressionLatex);
      setTrigDraftState(trigDraftStateForScreen(screen, seed.expressionLatex, 'guided'));
    }
  }

  function applyGeometrySeed(
    screen: GeometryScreen,
    seed: GuideExample['launch']['geometrySeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'triangleArea') {
      const nextState = {
        ...triangleAreaState,
        base: seed.base ?? triangleAreaState.base,
        height: seed.height ?? triangleAreaState.height,
      };
      setTriangleAreaState((currentState) => ({
        ...currentState,
        base: seed.base ?? currentState.base,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleArea: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'triangleHeron') {
      const nextState = {
        ...triangleHeronState,
        a: seed.a ?? triangleHeronState.a,
        b: seed.b ?? triangleHeronState.b,
        c: seed.c ?? triangleHeronState.c,
      };
      setTriangleHeronState((currentState) => ({
        ...currentState,
        a: seed.a ?? currentState.a,
        b: seed.b ?? currentState.b,
        c: seed.c ?? currentState.c,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleHeron: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'rectangle') {
      const nextState = {
        ...rectangleState,
        width: seed.width ?? rectangleState.width,
        height: seed.height ?? rectangleState.height,
      };
      setRectangleState((currentState) => ({
        ...currentState,
        width: seed.width ?? currentState.width,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, rectangle: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'square') {
      const nextState = {
        ...squareState,
        side: seed.side ?? squareState.side,
      };
      setSquareState((currentState) => ({
        ...currentState,
        side: seed.side ?? currentState.side,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, square: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'circle') {
      const nextState = {
        ...circleState,
        radius: seed.radius ?? circleState.radius,
      };
      setCircleState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, circle: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'arcSector') {
      const nextState = {
        ...arcSectorState,
        radius: seed.radius ?? arcSectorState.radius,
        angle: seed.angle ?? arcSectorState.angle,
        angleUnit: seed.angleUnit ?? arcSectorState.angleUnit,
      };
      setArcSectorState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        angle: seed.angle ?? currentState.angle,
        angleUnit: seed.angleUnit ?? currentState.angleUnit,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, arcSector: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cube') {
      const nextState = {
        ...cubeState,
        side: seed.side ?? cubeState.side,
      };
      setCubeState((currentState) => ({
        ...currentState,
        side: seed.side ?? currentState.side,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cube: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cuboid') {
      const nextState = {
        ...cuboidState,
        length: seed.length ?? cuboidState.length,
        width: seed.width ?? cuboidState.width,
        height: seed.height ?? cuboidState.height,
      };
      setCuboidState((currentState) => ({
        ...currentState,
        length: seed.length ?? currentState.length,
        width: seed.width ?? currentState.width,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cuboid: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cylinder') {
      const nextState = {
        ...cylinderState,
        radius: seed.radius ?? cylinderState.radius,
        height: seed.height ?? cylinderState.height,
      };
      setCylinderState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cylinder: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cone') {
      const nextState = {
        ...coneState,
        radius: seed.radius ?? coneState.radius,
        height: seed.height ?? coneState.height,
        slantHeight: seed.slantHeight ?? coneState.slantHeight,
      };
      setConeState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        height: seed.height ?? currentState.height,
        slantHeight: seed.slantHeight ?? currentState.slantHeight,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cone: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'sphere') {
      const nextState = {
        ...sphereState,
        radius: seed.radius ?? sphereState.radius,
      };
      setSphereState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, sphere: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'distance') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? distanceState.p1.x,
          y: seed.p1?.y ?? distanceState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? distanceState.p2.x,
          y: seed.p2?.y ?? distanceState.p2.y,
        },
      };
      setDistanceState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, distance: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'midpoint') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? midpointState.p1.x,
          y: seed.p1?.y ?? midpointState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? midpointState.p2.x,
          y: seed.p2?.y ?? midpointState.p2.y,
        },
      };
      setMidpointState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, midpoint: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'slope') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? slopeState.p1.x,
          y: seed.p1?.y ?? slopeState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? slopeState.p2.x,
          y: seed.p2?.y ?? slopeState.p2.y,
        },
      };
      setSlopeState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, slope: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'lineEquation') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? lineEquationState.p1.x,
          y: seed.p1?.y ?? lineEquationState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? lineEquationState.p2.x,
          y: seed.p2?.y ?? lineEquationState.p2.y,
        },
        form: seed.form ?? lineEquationState.form,
      };
      setLineEquationState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
        form: seed.form ?? currentState.form,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, lineEquation: nextState }),
          'guided',
        ),
      );
    }
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
        openCalculateScreen(screen);
        applyCalculateSeed(screen, example.launch.calculateSeed);
      }
      if (example.launch.targetMode === 'advancedCalculus') {
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
        openGeometryScreen(screen);
        applyGeometrySeed(screen, example.launch.geometrySeed);
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
      setCalculateLatex(latex);
      const screen = example.launch.calculateScreen ?? 'standard';
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

    if (example.launch.targetMode === 'advancedCalculus') {
      const screen = example.launch.advancedCalcScreen ?? 'home';
      openAdvancedCalcScreen(screen);
      applyAdvancedCalcSeed(screen, example.launch.advancedCalcSeed);
      setDisplayOutcome(null);
      setMode('advancedCalculus');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'trigonometry') {
      const screen = example.launch.trigScreen ?? 'functions';
      openTrigScreen(screen);
      applyTrigSeed(screen, example.launch.trigSeed);
      if (screen === 'functions') {
        setTrigFunctionState((currentState) => ({
          ...currentState,
          expressionLatex: latex,
        }));
      } else if (screen === 'equationSolve') {
        setTrigEquationState((currentState) => ({
          ...currentState,
          equationLatex: latex,
        }));
      } else if (screen === 'specialAngles') {
        setSpecialAnglesExpression(latex);
      } else if (screen === 'identitySimplify' || screen === 'identityConvert') {
        setTrigIdentityState((currentState) => ({
          ...currentState,
          expressionLatex: latex,
        }));
      }
      setDisplayOutcome(null);
      setMode('trigonometry');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

      if (example.launch.targetMode === 'statistics') {
        const screen = example.launch.statisticsScreen ?? 'home';
        openStatisticsScreen(screen);
        if (latex) {
          setStatisticsDraftState({
            rawLatex: latex,
            style: statisticsDraftStyle(latex),
            source: 'manual',
            executable: !isStatisticsMenuScreen(screen),
          });
        }
        setDisplayOutcome(null);
        setMode('statistics');
        setClipboardNotice(example.launch.label ?? 'Example loaded');
        return;
      }

    if (example.launch.targetMode === 'geometry') {
      const screen = example.launch.geometryScreen ?? 'home';
      openGeometryScreen(screen);
      applyGeometrySeed(screen, example.launch.geometrySeed);
      if (latex) {
        setGeometryDraftState({
          rawLatex: latex,
          style: geometryDraftStyle(latex),
          source: 'manual',
          executable: isGeometryCoreEditableScreen(screen),
        });
      }
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

  function setGuideQuery(query: string) {
    if (guideRoute.screen === 'search') {
      setGuideRoute({ screen: 'search', query });
      return;
    }

    if (guideRoute.screen === 'symbolLookup') {
      setGuideRoute({ screen: 'symbolLookup', query });
    }
  }

  function openGuideArticle(articleId: string) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'article', articleId });
    setMode('guide');
  }

  function openGuideHome() {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'home' });
    setMode('guide');
  }

  function openGuideMode(modeId: GuideModeId) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'modeGuide', modeId });
    setMode('guide');
  }

  function openAdvancedGuideForScreen(screen: AdvancedCalcScreen = advancedCalcScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'advancedCalculus' });
      setMode('guide');
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

  function openCalculateScreen(screen: CalculateScreen) {
    setCalculateScreen(screen);
    setDisplayOutcome(null);
  }

  function openAdvancedCalcScreen(screen: AdvancedCalcScreen) {
    setAdvancedCalcScreen(screen);
    setDisplayOutcome(null);
  }

  function openTrigScreen(screen: TrigScreen) {
    setTrigScreen(screen);
    if (!isTrigMenuScreen(screen)) {
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigDraftForScreen(screen),
          trigDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function trigDraftStateForScreen(
    _screen: TrigScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      trigDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function buildTrigDraftForScreen(screen: TrigScreen) {
    if (screen === 'functions') {
      return trigFunctionState.expressionLatex;
    }

    if (screen === 'identitySimplify' || screen === 'identityConvert') {
      return trigIdentityState.expressionLatex;
    }

    if (screen === 'equationSolve') {
      return trigEquationState.equationLatex;
    }

    if (screen === 'specialAngles') {
      return specialAnglesExpression;
    }

    return buildTrigStructuredDraft(screen, trigStateSnapshot);
  }

  function updateTrigDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setTrigDraftState({
      rawLatex,
      style: trigDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadTrigDraft(rawLatex: string, source: CoreDraftState['source'] = 'guided', executable = true) {
    updateTrigDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        trigDraftFieldRef.current?.focus?.();
        activeFieldRef.current = trigDraftFieldRef.current;
      }, 0);
    }
  }

  function trigDraftSourceForScreen(screen: TrigScreen): CoreDraftState['source'] {
    return isTrigMenuScreen(screen) ? 'manual' : 'guided';
  }

  function isTrigDraftFocused(target?: EventTarget | null) {
    if (!trigEditorIsEditable || !trigDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === trigDraftFieldRef.current;
    }

    return activeFieldRef.current === trigDraftFieldRef.current;
  }

  function geometryDraftStateForScreen(
    _screen: GeometryScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      geometryDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function defaultGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, {
      triangleArea: DEFAULT_TRIANGLE_AREA_STATE,
      triangleHeron: DEFAULT_TRIANGLE_HERON_STATE,
      rectangle: DEFAULT_RECTANGLE_STATE,
      square: DEFAULT_SQUARE_STATE,
      circle: DEFAULT_CIRCLE_STATE,
      arcSector: DEFAULT_ARC_SECTOR_STATE,
      cube: DEFAULT_CUBE_STATE,
      cuboid: DEFAULT_CUBOID_STATE,
      cylinder: DEFAULT_CYLINDER_STATE,
      cone: DEFAULT_CONE_STATE,
      sphere: DEFAULT_SPHERE_STATE,
      distance: DEFAULT_DISTANCE_STATE,
      midpoint: DEFAULT_MIDPOINT_STATE,
      slope: DEFAULT_SLOPE_STATE,
      lineEquation: DEFAULT_LINE_EQUATION_STATE,
    });
  }

  function buildGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, geometryStateSnapshot);
  }

  function updateGeometryDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setGeometryDraftState({
      rawLatex,
      style: geometryDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadGeometryDraft(rawLatex: string, source: CoreDraftState['source'] = 'guided', executable = true) {
    updateGeometryDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        geometryDraftFieldRef.current?.focus?.();
        activeFieldRef.current = geometryDraftFieldRef.current;
      }, 0);
    }
  }

  function geometryDraftSourceForScreen(screen: GeometryScreen): CoreDraftState['source'] {
    return isGeometryMenuScreen(screen) ? 'manual' : 'guided';
  }

  function geometrySolveMissingTemplates(screen: GeometryScreen) {
    switch (screen) {
      case 'square':
        return [
          { label: 's from area', latex: 'square(side=?, area=25)' },
          { label: 's from perimeter', latex: 'square(side=?, perimeter=20)' },
        ];
      case 'rectangle':
        return [
          { label: 'w from area', latex: 'rectangle(width=?, height=5, area=40)' },
          { label: 'h from diagonal', latex: 'rectangle(width=6, height=?, diagonal=10)' },
        ];
      case 'circle':
        return [
          { label: 'r from circumference', latex: 'circle(radius=?, circumference=10*pi)' },
          { label: 'r from area', latex: 'circle(radius=?, area=49*pi)' },
        ];
      case 'triangleArea':
        return [
          { label: 'base from area', latex: 'triangleArea(base=?, height=6, area=30)' },
          { label: 'height from area', latex: 'triangleArea(base=10, height=?, area=30)' },
        ];
      case 'cube':
        return [
          { label: 'side from volume', latex: 'cube(side=?, volume=64)' },
          { label: 'side from SA', latex: 'cube(side=?, surfaceArea=54)' },
        ];
      case 'sphere':
        return [
          { label: 'r from SA', latex: 'sphere(radius=?, surfaceArea=36*pi)' },
          { label: 'r from volume', latex: 'sphere(radius=?, volume=36*pi)' },
        ];
      case 'cylinder':
        return [
          { label: 'r from volume', latex: 'cylinder(radius=?, height=8, volume=72*pi)' },
          { label: 'h from volume', latex: 'cylinder(radius=3, height=?, volume=72*pi)' },
        ];
      case 'cone':
        return [
          { label: 'r from volume', latex: 'cone(radius=?, height=4, volume=12*pi)' },
          { label: 'h from slant', latex: 'cone(radius=3, height=?, slantHeight=5)' },
          { label: 'l from r,h', latex: 'cone(radius=3, height=4, slantHeight=?)' },
        ];
      case 'cuboid':
        return [
          { label: 'l from volume', latex: 'cuboid(length=?, width=3, height=4, volume=144)' },
          { label: 'h from diagonal', latex: 'cuboid(length=3, width=4, height=?, diagonal=13)' },
        ];
      case 'arcSector':
        return [
          { label: 'r from arc', latex: 'arcSector(radius=?, angle=60, unit=deg, arc=2*pi)' },
          { label: 'angle from sector', latex: 'arcSector(radius=6, angle=?, unit=deg, sector=6*pi)' },
        ];
      case 'triangleHeron':
        return [
          { label: 'a from area', latex: 'triangleHeron(a=?, b=13, c=14, area=84)' },
        ];
      case 'distance':
        return [
          { label: 'solve point', latex: 'distance(p1=(0,0), p2=(3,?), distance=5)' },
        ];
      case 'midpoint':
        return [
          { label: 'solve point', latex: 'midpoint(p1=(1,2), p2=(?,8), mid=(3,5))' },
        ];
      case 'slope':
        return [
          { label: 'solve point', latex: 'slope(p1=(1,2), p2=(?,8), slope=2)' },
        ];
      case 'lineEquation':
        return [
          { label: 'point from slope', latex: 'lineEquation(p1=(0,0), p2=(?,8), slope=2)' },
          { label: 'point from distance', latex: 'lineEquation(p1=(0,0), p2=(3,?), distance=5)' },
          { label: 'point from midpoint', latex: 'lineEquation(p1=(1,2), p2=(?,8), mid=(3,5))' },
        ];
      default:
        return [];
    }
  }

  function loadGeometrySolveMissingTemplate(rawLatex: string) {
    loadGeometryDraft(rawLatex, 'guided', true);
    setClipboardNotice('Geometry solve-missing template loaded');
  }

  function isGeometryDraftFocused(target?: EventTarget | null) {
    if (!geometryEditorIsEditable || !geometryDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === geometryDraftFieldRef.current;
    }

    return activeFieldRef.current === geometryDraftFieldRef.current;
  }

  function openGeometryScreen(screen: GeometryScreen) {
    setGeometryScreen(screen);
    if (!isGeometryMenuScreen(screen)) {
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryDraftForScreen(screen),
          geometryDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function statisticsDraftStateForScreen(
    _screen: StatisticsScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      statisticsDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function statisticsWorkingSourceForScreen(screen: StatisticsScreen): StatisticsWorkingSource {
    if (screen === 'home' || screen === 'probabilityHome' || screen === 'inferenceHome') {
      return statisticsWorkingSource;
    }

    if (screen === 'dataEntry') {
      return 'dataset';
    }

    if (screen === 'descriptive' || screen === 'frequency' || screen === 'meanInference') {
      return statisticsWorkingSource;
    }

    return 'dataset';
  }

  function defaultStatisticsLeafForMenu(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (screen === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    const homeTarget = getStatisticsMenuEntryAtIndex(
      'home',
      statisticsMenuSelection.home,
    )?.target ?? 'dataEntry';

    if (homeTarget === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (homeTarget === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    return homeTarget;
  }

  function statisticsLeafScreenForContext(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'home' || screen === 'probabilityHome') {
      return defaultStatisticsLeafForMenu(screen);
    }

    return screen;
  }

  function buildStatisticsDraftForScreen(
    screen: StatisticsScreen,
    workingSource = statisticsWorkingSourceForScreen(screen),
  ) {
    if (isStatisticsMenuScreen(screen)) {
      return '';
    }

    return buildStatisticsInputLatex(screen, statisticsStateSnapshot, workingSource);
  }

  function updateStatisticsDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setStatisticsDraftState({
      rawLatex,
      style: statisticsDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadStatisticsDraft(
    rawLatex: string,
    source: CoreDraftState['source'] = 'guided',
    focusEditor = true,
  ) {
    updateStatisticsDraft(rawLatex, source, true);
    if (focusEditor) {
      setTimeout(() => {
        focusStatisticsEditor();
      }, 0);
    }
  }

  function isStatisticsDraftFocused(target?: EventTarget | null) {
    if (!statisticsEditorIsEditable || !statisticsDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === statisticsDraftFieldRef.current;
    }

    return activeFieldRef.current === statisticsDraftFieldRef.current;
  }

  function openStatisticsScreen(screen: StatisticsScreen) {
    setStatisticsScreen(screen);
    const nextWorkingSource = statisticsWorkingSourceForScreen(screen);
    setStatisticsWorkingSource(nextWorkingSource);
    if (!isStatisticsMenuScreen(screen)) {
      setStatisticsDraftState(
        statisticsDraftStateForScreen(
          screen,
          buildStatisticsDraftForScreen(screen, nextWorkingSource)
            || defaultStatisticsDraftForScreen(screen, nextWorkingSource),
          'guided',
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function setCurrentAdvancedCalcMenuIndex(
    screen: 'home' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome',
    index: number,
  ) {
    setAdvancedCalcMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentAdvancedCalcMenuSelection(delta: number) {
    if (!isAdvancedCalcMenuOpen) {
      return;
    }

    setCurrentAdvancedCalcMenuIndex(
      advancedCalcScreen,
      moveAdvancedCalcMenuIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex, delta),
    );
  }

  function setCurrentTrigMenuIndex(
    screen: 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
    index: number,
  ) {
    setTrigMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentTrigMenuSelection(delta: number) {
    if (!isTrigMenuOpen) {
      return;
    }

    setCurrentTrigMenuIndex(
      trigScreen as 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
      moveTrigMenuIndex(trigScreen, currentTrigMenuIndex, delta),
    );
  }

  function defaultTrigLeafForMenu(screen: TrigScreen): TrigScreen {
    if (screen === 'identitiesHome') {
      return 'identitySimplify';
    }
    if (screen === 'equationsHome') {
      return 'equationSolve';
    }
    if (screen === 'trianglesHome') {
      return 'rightTriangle';
    }
    return 'functions';
  }

  function trigLeafScreenForContext(screen: TrigScreen): TrigScreen {
    if (!isTrigMenuScreen(screen)) {
      return screen;
    }

    if (screen === 'home') {
      const target = getTrigMenuEntryAtIndex('home', trigMenuSelection.home)?.target ?? 'functions';
      if (target === 'identitiesHome') {
        return getTrigMenuEntryAtIndex('identitiesHome', trigMenuSelection.identitiesHome)?.target ?? 'identitySimplify';
      }
      if (target === 'equationsHome') {
        return 'equationSolve';
      }
      if (target === 'trianglesHome') {
        return getTrigMenuEntryAtIndex('trianglesHome', trigMenuSelection.trianglesHome)?.target ?? 'rightTriangle';
      }
      return target;
    }

    return getTrigMenuEntryAtIndex(
      screen,
      trigMenuSelection[screen as keyof typeof trigMenuSelection],
    )?.target ?? defaultTrigLeafForMenu(screen);
  }

  function setCurrentGeometryMenuIndex(
    screen: 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome',
    index: number,
  ) {
    setGeometryMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentGeometryMenuSelection(delta: number) {
    if (!isGeometryMenuOpen) {
      return;
    }

    setCurrentGeometryMenuIndex(
      geometryScreen as 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome',
      moveGeometryMenuIndex(geometryScreen, currentGeometryMenuIndex, delta),
    );
  }

  function setCurrentStatisticsMenuIndex(
    screen: 'home' | 'probabilityHome' | 'inferenceHome',
    index: number,
  ) {
    setStatisticsMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentStatisticsMenuSelection(delta: number) {
    if (!isStatisticsMenuOpen) {
      return;
    }

    setCurrentStatisticsMenuIndex(
      statisticsScreen as 'home' | 'probabilityHome' | 'inferenceHome',
      moveStatisticsMenuIndex(statisticsScreen, currentStatisticsMenuIndex, delta),
    );
  }

  function openSelectedTrigMenuEntry() {
    if (!selectedTrigMenuEntry) {
      return;
    }

    openTrigScreen(selectedTrigMenuEntry.target);
  }

  function goBackInTrigonometry() {
    const parentScreen = getTrigParentScreen(trigScreen);
    if (parentScreen) {
      openTrigScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedGeometryMenuEntry() {
    if (!selectedGeometryMenuEntry) {
      return;
    }

    openGeometryScreen(selectedGeometryMenuEntry.target);
  }

  function goBackInGeometry() {
    const parentScreen = getGeometryParentScreen(geometryScreen);
    if (parentScreen) {
      openGeometryScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedStatisticsMenuEntry() {
    if (!selectedStatisticsMenuEntry) {
      return;
    }

    openStatisticsScreen(selectedStatisticsMenuEntry.target);
  }

  function goBackInStatistics() {
    const parentScreen = getStatisticsParentScreen(statisticsScreen);
    if (parentScreen) {
      openStatisticsScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedAdvancedCalcMenuEntry() {
    if (!selectedAdvancedCalcMenuEntry) {
      return;
    }

    openAdvancedCalcScreen(selectedAdvancedCalcMenuEntry.target);
  }

  function goBackInAdvancedCalc() {
    const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
    if (parentScreen) {
      openAdvancedCalcScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function moveCurrentCalculateMenuSelection(delta: number) {
    setCalculateMenuSelection((currentSelection) =>
      moveCalculateMenuIndex(currentSelection, delta),
    );
  }

  function openSelectedCalculateMenuEntry() {
    if (!selectedCalculateMenuEntry) {
      return;
    }

    openCalculateScreen(selectedCalculateMenuEntry.target);
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

    if (currentMode === 'advancedCalculus') {
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
      const parsed = parseStatisticsDraft(action.latex);
      openStatisticsScreen(parsed.ok ? statisticsRequestToScreen(parsed.request) : 'dataEntry');
      loadStatisticsDraft(action.latex, 'guided', true);
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
          currentMode === 'advancedCalculus' ||
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

  function currentCalculateHistoryContext() {
    if (calculateScreen === 'derivative') {
      return {
        calculateScreen,
        calculateSeed: { ...derivativeWorkbench },
      };
    }

    if (calculateScreen === 'derivativePoint') {
      return {
        calculateScreen,
        calculateSeed: { ...derivativePointWorkbench },
      };
    }

    if (calculateScreen === 'integral') {
      return {
        calculateScreen,
        calculateSeed: { ...integralWorkbench },
      };
    }

    if (calculateScreen === 'limit') {
      return {
        calculateScreen,
        calculateSeed: { ...limitWorkbench },
      };
    }

    return {};
  }

  function currentAdvancedCalcHistoryContext() {
    if (advancedCalcScreen === 'indefiniteIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedIndefiniteIntegral },
      };
    }

    if (advancedCalcScreen === 'definiteIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedDefiniteIntegral },
      };
    }

    if (advancedCalcScreen === 'improperIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedImproperIntegral },
      };
    }

    if (advancedCalcScreen === 'finiteLimit') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedFiniteLimit },
      };
    }

    if (advancedCalcScreen === 'infiniteLimit') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedInfiniteLimit },
      };
    }

    if (advancedCalcScreen === 'maclaurin') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...maclaurinState },
      };
    }

    if (advancedCalcScreen === 'taylor') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...taylorState },
      };
    }

    if (advancedCalcScreen === 'partialDerivative') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...partialDerivativeState },
      };
    }

    if (advancedCalcScreen === 'odeFirstOrder') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...firstOrderOdeState },
      };
    }

    if (advancedCalcScreen === 'odeSecondOrder') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...secondOrderOdeState },
      };
    }

    if (advancedCalcScreen === 'odeNumericIvp') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...numericIvpState },
      };
    }

    return {};
  }

  function commitOutcome(
    outcome: DisplayOutcome,
    inputLatex: string,
    mode: ModeId,
    context: Partial<Pick<
      HistoryEntry,
      | 'calculateScreen'
      | 'calculateSeed'
      | 'advancedCalcScreen'
      | 'advancedCalcSeed'
      | 'geometryScreen'
      | 'trigScreen'
      | 'statisticsScreen'
      | 'equationSolveTarget'
      | 'equationAnswerMode'
      | 'equationDomainIntent'
      | 'answerDomain'
      | 'solutionKind'
      | 'numericInterval'
      | 'variableSubstitutions'
    >> = {},
  ) {
    if (
      outcome.kind === 'prompt' &&
      outcome.targetMode === 'equation' &&
      settings.autoSwitchToEquation
    ) {
      switchToEquationWithLatex(outcome.carryLatex);
      return;
    }

    setDisplayOutcome(outcome);

    if (outcome.kind !== 'success' || (!outcome.exactLatex && !outcome.approxText)) {
      return;
    }

    if (outcome.exactLatex) {
      setAnsLatex(outcome.exactLatex);
    }
    if (!settings.historyEnabled) {
      return;
    }

    const variableSubstitutions =
      context.variableSubstitutions
      ?? (outcome.kind === 'success' ? outcome.variableSubstitutions : undefined);

    const entry: HistoryEntry = {
      id: createId(),
      mode,
      inputLatex,
      resolvedInputLatex: outcome.resolvedInputLatex,
      resultLatex: outcome.exactLatex,
      exactSupplementLatex: outcome.exactSupplementLatex,
      approxText: outcome.approxText,
      ...(mode === 'calculate'
        ? { ...currentCalculateHistoryContext(), ...context }
        : {}),
      ...(mode === 'advancedCalculus'
        ? { ...currentAdvancedCalcHistoryContext(), ...context }
        : {}),
      ...(mode === 'geometry'
        ? { geometryScreen: context.geometryScreen ?? geometryScreen }
        : {}),
      ...(mode === 'trigonometry'
        ? { trigScreen: context.trigScreen ?? trigScreen }
        : {}),
      ...(mode === 'statistics'
        ? { statisticsScreen: context.statisticsScreen ?? statisticsScreen }
        : {}),
      ...(mode === 'equation' && context.equationSolveTarget
        ? { equationSolveTarget: context.equationSolveTarget }
        : {}),
      ...(mode === 'equation' && context.equationAnswerMode
        ? { equationAnswerMode: context.equationAnswerMode }
        : {}),
      ...(mode === 'equation' && context.equationDomainIntent
        ? { equationDomainIntent: context.equationDomainIntent }
        : {}),
      ...(mode === 'equation' && (context.answerDomain ?? outcome.answerDomain)
        ? { answerDomain: context.answerDomain ?? outcome.answerDomain }
        : {}),
      ...(mode === 'equation' && (context.solutionKind ?? outcome.solutionKind)
        ? { solutionKind: context.solutionKind ?? outcome.solutionKind }
        : {}),
      ...(context.numericInterval
        ? { numericInterval: context.numericInterval }
        : {}),
      ...(variableSubstitutions && variableSubstitutions.length > 0
        ? { variableSubstitutions }
        : {}),
      timestamp: new Date().toISOString(),
    };

    setHistory((currentHistory) => [...currentHistory.slice(-79), entry]);
    void appendHistoryEntry(entry);
  }

  function setMode(mode: ModeId) {
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
    void persistMode(mode);
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

  function retitleOutcome(outcome: DisplayOutcome, title: string): DisplayOutcome {
    if (outcome.kind === 'prompt') {
      return { ...outcome, title };
    }

    if (outcome.kind === 'error') {
      return { ...outcome, title };
    }

    return { ...outcome, title };
  }

  activeCalculateRuntimeRef.current = {
    calculateLatex,
    calculateScreen,
    settings,
    ansLatex,
    variableMemory,
    calculateReplayVariableSubstitutions,
  };

  const getActiveStandardCalculateRequest = (action: RunCalculateModeRequest['action']): RunCalculateModeRequest | null => {
    const active = activeCalculateRuntimeRef.current;
    if (!active || active.calculateScreen !== 'standard') {
      return null;
    }

    const executionLatex = trimHarmlessTrailingMathSpacing(active.calculateLatex);
    return {
      action,
      latex: executionLatex,
      angleUnit: active.settings.angleUnit,
      outputStyle: active.settings.outputStyle,
      ansLatex: active.ansLatex,
      calculateScreen: active.calculateScreen,
      storedVariables: active.variableMemory,
      variableSubstitutionSnapshot:
        active.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
          ? active.calculateReplayVariableSubstitutions.substitutions
          : undefined,
    };
  };

  const calculateRuntimeController = createCalculateRuntimeController({
    calculateLatex,
    calculateScreen,
    calculateRouteMeta,
    calculateWorkbenchExpression,
    integralWorkbench,
    limitWorkbench,
    isCalculateToolOpen,
    settings,
    ansLatex,
    variableMemory,
    calculateReplayVariableSubstitutions,
    clearCalculateReplayVariableSubstitutions: () => setCalculateReplayVariableSubstitutions(null),
    startTransition,
    setDisplayOutcome,
    commitOutcome,
    retitleOutcome,
    getActiveStandardCalculateRequest,
  });

  const {
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
  } = calculateRuntimeController;

  function runTrigAction() {
    const screenHint = trigLeafScreenForContext(trigScreen);
    const editorFocused = isTrigDraftFocused();

    if (isTrigMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const inputLatex =
        !isTrigMenuOpen && trigRouteMeta?.focusTarget === 'guidedForm' && !editorFocused
          ? buildTrigDraftForScreen(trigScreen).trim()
          : trigDraftState.rawLatex.trim();

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: trigRouteMeta?.label ?? 'Trigonometry',
          error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!editorFocused || trigDraftState.rawLatex.trim() !== inputLatex) {
        setTrigDraftState(trigDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      const executionLatex =
        screenHint === 'identityConvert' && trigDraftStyle(inputLatex) !== 'structured'
          ? serializeTrigRequest({
              kind: 'identityConvert',
              expressionLatex: inputLatex,
              targetForm: trigIdentityState.targetForm,
            })
          : inputLatex;

      void import('./lib/trigonometry/core').then(({ runTrigonometryCoreDraft }) => {
        const { outcome, parsed } = runTrigonometryCoreDraft(executionLatex, {
          screenHint,
          angleUnit: settings.angleUnit,
          identityTargetForm: trigIdentityState.targetForm,
        });

        const replayScreen = parsed.ok
          ? trigRequestToScreen(parsed.request, screenHint)
          : screenHint;

        commitOutcome(outcome, executionLatex, 'trigonometry', { trigScreen: replayScreen });
      }).catch((error: unknown) => {
        setDisplayOutcome({
          kind: 'error',
          title: 'Trigonometry',
          error: error instanceof Error
            ? `Could not load the Trigonometry runtime: ${error.message}`
            : 'Could not load the Trigonometry runtime.',
          warnings: [],
        });
      });
    });
  }

  function runStatisticsAction() {
    const editorFocused = isStatisticsDraftFocused();
    if (isStatisticsMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const screenHint = statisticsLeafScreenForContext(statisticsScreen);
      const inputLatex =
        !editorFocused && statisticsRouteMeta?.focusTarget === 'guidedForm'
          ? buildStatisticsDraftForScreen(screenHint)
          : statisticsDraftState.rawLatex.trim();

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: statisticsRouteMeta?.label ?? 'Statistics',
          error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!editorFocused || statisticsDraftState.rawLatex.trim() !== inputLatex) {
        setStatisticsDraftState(statisticsDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      void import('./lib/statistics/core').then(({ runStatisticsCoreDraft }) => {
        const { outcome, parsed } = runStatisticsCoreDraft(inputLatex, {
          screenHint,
          workingSourceHint: statisticsWorkingSource,
        });
        if (parsed.ok) {
          const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
          if (nextSource) {
            setStatisticsWorkingSource(nextSource);
          }
        }
        const replayScreen = parsed.ok
          ? statisticsRequestToScreen(parsed.request, screenHint)
          : screenHint;

        commitOutcome(outcome, inputLatex, 'statistics', { statisticsScreen: replayScreen });
      }).catch((error: unknown) => {
        setDisplayOutcome({
          kind: 'error',
          title: 'Statistics',
          error: error instanceof Error
            ? `Could not load the Statistics runtime: ${error.message}`
            : 'Could not load the Statistics runtime.',
          warnings: [],
        });
      });
    });
  }

  function runGeometryAction() {
    if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
      return;
    }

    startTransition(() => {
      const inputLatex = isGeometryDraftFocused()
        ? geometryDraftState.rawLatex.trim()
        : buildGeometryDraftForScreen(geometryScreen);

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: geometryRouteMeta?.label ?? 'Geometry',
          error: 'Enter a Geometry request or use a guided tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!isGeometryDraftFocused()) {
        setGeometryDraftState(
          geometryDraftStateForScreen(geometryScreen, inputLatex, 'guided'),
        );
      }

      void import('./lib/geometry/core').then(({ runGeometryCoreDraft }) => {
        const { outcome } = runGeometryCoreDraft(inputLatex, geometryScreen);
        commitOutcome(outcome, inputLatex, 'geometry');
      }).catch((error: unknown) => {
        setDisplayOutcome({
          kind: 'error',
          title: 'Geometry',
          error: error instanceof Error
            ? `Could not load the Geometry runtime: ${error.message}`
            : 'Could not load the Geometry runtime.',
          warnings: [],
        });
      });
    });
  }

  activeEquationRuntimeRef.current = {
    equationLatex,
    equationInputLatex,
    equationScreen,
    equationSolveTarget: equationSolveTargetResolution?.selectedTarget ?? null,
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

    const executionLatex = trimHarmlessTrailingMathSpacing(active.equationLatex);
    const committedInput = trimHarmlessTrailingMathSpacing(active.equationInputLatex);
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
      equationAnswerMode: kind === 'numeric-interval' ? 'approximate' : active.settings.equationAnswerMode,
      equationDomainIntent: kind === 'numeric-interval' ? 'real' : active.settings.equationDomainIntent,
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
    equationLatex,
    equationSolveTarget: equationSolveTargetResolution?.selectedTarget ?? null,
    equationInputLatex,
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
    startTransition,
    commitOutcome,
    switchToEquationWithLatex,
    isSimultaneousEquationScreen,
    getActiveEquationRequest,
  });

  const {
    openPromptTarget,
    runEquationAction,
    runEquationAlgebraTransformAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  } = equationRuntimeController;

  function runAdvancedCalcAction() {
    const generated = trimHarmlessTrailingMathSpacing(advancedCalcWorkbenchExpression);
    if (!generated || !advancedCalcRouteMeta || isAdvancedCalcMenuOpen) {
      setDisplayOutcome({
        kind: 'error',
        title: advancedCalcRouteMeta?.label ?? 'Advanced Calc',
        error: advancedCalcRouteMeta
          ? `Fill the ${advancedCalcRouteMeta.label.toLowerCase()} inputs before evaluating.`
          : 'Choose an Advanced Calc tool before evaluating.',
        warnings: [],
      });
      return;
    }

    startTransition(() => {
      void import('./lib/advanced-calc/engine')
        .then(({ runAdvancedCalcMode }) => runAdvancedCalcMode({
          screen: advancedCalcScreen,
          indefiniteIntegral: advancedIndefiniteIntegral,
          definiteIntegral: advancedDefiniteIntegral,
          improperIntegral: advancedImproperIntegral,
          finiteLimit: advancedFiniteLimit,
          infiniteLimit: advancedInfiniteLimit,
          maclaurin: maclaurinState,
          taylor: taylorState,
          partialDerivative: partialDerivativeState,
          firstOrderOde: firstOrderOdeState,
          secondOrderOde: secondOrderOdeState,
          numericIvp: numericIvpState,
          storedVariables: variableMemory,
          variableSubstitutionSnapshot:
            replayVariableSubstitutions?.mode === 'advancedCalculus'
            && replayVariableSubstitutions.inputLatex === generated
              ? replayVariableSubstitutions.substitutions
              : undefined,
        }))
        .then((outcome) => {
          commitOutcome(outcome, generated, 'advancedCalculus');
          setReplayVariableSubstitutions(null);
        })
        .catch((error: unknown) => {
          setDisplayOutcome({
            kind: 'error',
            title: 'Advanced Calc',
            error: error instanceof Error
              ? `Could not load the Advanced Calc runtime: ${error.message}`
              : 'Could not load the Advanced Calc runtime.',
            warnings: [],
          });
        });
    });
  }

  function clearCurrentMode() {
    if (isLauncherOpen) {
      closeLauncher();
      return;
    }

    if (currentMode === 'guide') {
      goBackInGuide();
    } else if (currentMode === 'statistics') {
      if (isStatisticsMenuOpen) {
        goBackInStatistics();
      } else if (statisticsScreen === 'dataEntry') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'dataEntry',
            defaultStatisticsDraftForScreen('dataEntry', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'descriptive') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'descriptive',
            defaultStatisticsDraftForScreen('descriptive', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'frequency') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('frequencyTable');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'frequency',
            defaultStatisticsDraftForScreen('frequency', 'frequencyTable'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'binomial') {
        setBinomialState(DEFAULT_BINOMIAL_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'binomial',
            defaultStatisticsDraftForScreen('binomial'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'normal') {
        setNormalState(DEFAULT_NORMAL_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'normal',
            defaultStatisticsDraftForScreen('normal'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'poisson') {
        setPoissonState(DEFAULT_POISSON_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'poisson',
            defaultStatisticsDraftForScreen('poisson'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'meanInference') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'meanInference',
            defaultStatisticsDraftForScreen('meanInference', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'regression') {
        setRegressionState(DEFAULT_REGRESSION_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'regression',
            defaultStatisticsDraftForScreen('regression'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'correlation') {
        setCorrelationState(DEFAULT_CORRELATION_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'correlation',
            defaultStatisticsDraftForScreen('correlation'),
            'guided',
          ),
        );
      }
    } else if (currentMode === 'geometry') {
      if (isGeometryMenuOpen) {
        goBackInGeometry();
      } else if (geometryScreen === 'square') {
        setSquareState(DEFAULT_SQUARE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('square', defaultGeometryDraftForScreen('square'), 'guided'));
      } else if (geometryScreen === 'rectangle') {
        setRectangleState(DEFAULT_RECTANGLE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('rectangle', defaultGeometryDraftForScreen('rectangle'), 'guided'));
      } else if (geometryScreen === 'triangleArea') {
        setTriangleAreaState(DEFAULT_TRIANGLE_AREA_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('triangleArea', defaultGeometryDraftForScreen('triangleArea'), 'guided'));
      } else if (geometryScreen === 'triangleHeron') {
        setTriangleHeronState(DEFAULT_TRIANGLE_HERON_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('triangleHeron', defaultGeometryDraftForScreen('triangleHeron'), 'guided'));
      } else if (geometryScreen === 'circle') {
        setCircleState(DEFAULT_CIRCLE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('circle', defaultGeometryDraftForScreen('circle'), 'guided'));
      } else if (geometryScreen === 'arcSector') {
        setArcSectorState(DEFAULT_ARC_SECTOR_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('arcSector', defaultGeometryDraftForScreen('arcSector'), 'guided'));
      } else if (geometryScreen === 'cube') {
        setCubeState(DEFAULT_CUBE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cube', defaultGeometryDraftForScreen('cube'), 'guided'));
      } else if (geometryScreen === 'cuboid') {
        setCuboidState(DEFAULT_CUBOID_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cuboid', defaultGeometryDraftForScreen('cuboid'), 'guided'));
      } else if (geometryScreen === 'cylinder') {
        setCylinderState(DEFAULT_CYLINDER_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cylinder', defaultGeometryDraftForScreen('cylinder'), 'guided'));
      } else if (geometryScreen === 'cone') {
        setConeState(DEFAULT_CONE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cone', defaultGeometryDraftForScreen('cone'), 'guided'));
      } else if (geometryScreen === 'sphere') {
        setSphereState(DEFAULT_SPHERE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('sphere', defaultGeometryDraftForScreen('sphere'), 'guided'));
      } else if (geometryScreen === 'distance') {
        setDistanceState(DEFAULT_DISTANCE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('distance', defaultGeometryDraftForScreen('distance'), 'guided'));
      } else if (geometryScreen === 'midpoint') {
        setMidpointState(DEFAULT_MIDPOINT_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('midpoint', defaultGeometryDraftForScreen('midpoint'), 'guided'));
      } else if (geometryScreen === 'slope') {
        setSlopeState(DEFAULT_SLOPE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('slope', defaultGeometryDraftForScreen('slope'), 'guided'));
      } else if (geometryScreen === 'lineEquation') {
        setLineEquationState(DEFAULT_LINE_EQUATION_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('lineEquation', defaultGeometryDraftForScreen('lineEquation'), 'guided'));
      }
    } else if (currentMode === 'trigonometry') {
      if (isTrigMenuOpen) {
        goBackInTrigonometry();
      } else if (trigScreen === 'functions') {
        setTrigFunctionState(DEFAULT_TRIG_FUNCTION_STATE);
        setTrigDraftState(trigDraftStateForScreen('functions', defaultTrigDraftForScreen('functions'), 'guided'));
      } else if (trigScreen === 'identitySimplify' || trigScreen === 'identityConvert') {
        setTrigIdentityState(DEFAULT_TRIG_IDENTITY_STATE);
        setTrigDraftState(trigDraftStateForScreen(trigScreen, defaultTrigDraftForScreen(trigScreen), 'guided'));
      } else if (trigScreen === 'equationSolve') {
        setTrigEquationState((currentState) => ({
          ...DEFAULT_TRIG_EQUATION_STATE,
          angleUnit: currentState.angleUnit,
        }));
        setTrigDraftState(trigDraftStateForScreen('equationSolve', defaultTrigDraftForScreen('equationSolve'), 'guided'));
      } else if (trigScreen === 'rightTriangle') {
        setRightTriangleState(DEFAULT_RIGHT_TRIANGLE_STATE);
        setTrigDraftState(trigDraftStateForScreen('rightTriangle', defaultTrigDraftForScreen('rightTriangle'), 'guided'));
      } else if (trigScreen === 'sineRule') {
        setSineRuleState(DEFAULT_SINE_RULE_STATE);
        setTrigDraftState(trigDraftStateForScreen('sineRule', defaultTrigDraftForScreen('sineRule'), 'guided'));
      } else if (trigScreen === 'cosineRule') {
        setCosineRuleState(DEFAULT_COSINE_RULE_STATE);
        setTrigDraftState(trigDraftStateForScreen('cosineRule', defaultTrigDraftForScreen('cosineRule'), 'guided'));
      } else if (trigScreen === 'angleConvert') {
        setAngleConvertState(DEFAULT_ANGLE_CONVERT_STATE);
        setTrigDraftState(trigDraftStateForScreen('angleConvert', defaultTrigDraftForScreen('angleConvert'), 'guided'));
      } else if (trigScreen === 'specialAngles') {
        setSpecialAnglesExpression('\\cos\\left(\\frac{\\pi}{3}\\right)');
        setTrigDraftState(trigDraftStateForScreen('specialAngles', defaultTrigDraftForScreen('specialAngles'), 'guided'));
      }
    } else if (currentMode === 'advancedCalculus') {
      if (isAdvancedCalcMenuOpen) {
        goBackInAdvancedCalc();
      } else if (advancedCalcScreen === 'indefiniteIntegral') {
        setAdvancedIndefiniteIntegral(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'definiteIntegral') {
        setAdvancedDefiniteIntegral(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'improperIntegral') {
        setAdvancedImproperIntegral(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'finiteLimit') {
        setAdvancedFiniteLimit(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
      } else if (advancedCalcScreen === 'infiniteLimit') {
        setAdvancedInfiniteLimit(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
      } else if (advancedCalcScreen === 'maclaurin') {
        setMaclaurinState(DEFAULT_MACLAURIN_STATE);
      } else if (advancedCalcScreen === 'taylor') {
        setTaylorState(DEFAULT_TAYLOR_STATE);
      } else if (advancedCalcScreen === 'partialDerivative') {
        setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
      } else if (advancedCalcScreen === 'odeFirstOrder') {
        setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
      } else if (advancedCalcScreen === 'odeSecondOrder') {
        setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
      } else if (advancedCalcScreen === 'odeNumericIvp') {
        setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
      }
    } else if (currentMode === 'calculate') {
      if (calculateScreen === 'standard') {
        setCalculateLatex('');
      } else if (calculateScreen === 'calculusHome') {
        openCalculateScreen('standard');
      } else if (calculateScreen === 'derivative') {
        setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
      } else if (calculateScreen === 'derivativePoint') {
        setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
      } else if (calculateScreen === 'integral') {
        setIntegralWorkbench((currentState) => ({
          ...DEFAULT_INTEGRAL_WORKBENCH,
          kind: currentState.kind,
        }));
      } else if (calculateScreen === 'limit') {
        setLimitWorkbench((currentState) => ({
          ...DEFAULT_LIMIT_WORKBENCH,
          direction: currentState.direction,
          targetKind: currentState.targetKind,
        }));
      }
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
      openAdvancedCalcParentOrHome: () => openAdvancedCalcScreen(
        getAdvancedCalcParentScreen(advancedCalcScreen) ?? 'home',
      ),
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
      useTrigGuidedDraft: () => {
        loadTrigDraft(buildTrigDraftForScreen(trigScreen), 'guided', true);
        setClipboardNotice('Trigonometry request loaded');
      },
      openTrigParentOrHome: () => openTrigScreen(getTrigParentScreen(trigScreen) ?? 'home'),
      calculateScreen,
      runCalculateAction,
      toggleCalculateAlgebraTray: () => setCalculateAlgebraTrayOpen((open) => !open),
      openSelectedCalculateMenuEntry,
      openCalculateStandard: () => openCalculateScreen('standard'),
      runCalculateWorkbenchAction,
      loadCalculateWorkbenchToEditor: () => loadLatexIntoEditor(calculateWorkbenchExpression.latex),
      openCalculateCalculusMenu: () => openCalculateScreen('calculusHome'),
      toggleIntegralKind: () => {
        setIntegralWorkbench((currentState) => ({
          ...currentState,
          kind: cycleIntegralKind(currentState.kind),
        }));
        setDisplayOutcome(null);
      },
      cycleLimitDirection: () => {
        setLimitWorkbench((currentState) => ({
          ...currentState,
          direction: cycleLimitDirection(currentState.direction),
        }));
        setDisplayOutcome(null);
      },
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
      openCalculateMenuDigitEntry: (digit) => {
        const entry = getCalculateMenuEntryByHotkey(digit);
        if (entry) {
          openCalculateScreen(entry.target);
        }
      },
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

  function applyStatisticsRequest(request: StatisticsRequest) {
    if (request.kind === 'dataset') {
      setStatsDataset({ values: request.values });
      setStatisticsWorkingSource('dataset');
      setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      return;
    }

    if (request.kind === 'descriptive' || request.kind === 'frequency' || request.kind === 'meanInference') {
      const nextSource = request.source;
      setStatisticsWorkingSource(nextSource);
      if (nextSource === 'dataset') {
        setStatsDataset({ values: request.values });
        setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      } else {
        setFrequencyTable({ rows: request.rows });
        setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
      }

      if (request.kind === 'meanInference') {
        setMeanInferenceState({
          mode: request.mode,
          level: request.level,
          mu0: request.mu0 ?? '',
        });
      }
      return;
    }

    if (request.kind === 'binomial') {
      setBinomialState({
        n: request.n,
        p: request.p,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'normal') {
      setNormalState({
        mean: request.mean,
        standardDeviation: request.standardDeviation,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'poisson') {
      setPoissonState({
        lambda: request.lambda,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'regression') {
      setRegressionState({ points: request.points });
      return;
    }

    setCorrelationState({ points: request.points });
  }

  function replayHistoryEntry(entry: HistoryEntry) {
    setLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      surface: 'app',
    }));
    setMode(entry.mode);
    if (entry.mode !== 'calculate') {
      setCalculateReplayVariableSubstitutions(null);
    }
    setReplayVariableSubstitutions(
      entry.mode !== 'calculate' && entry.variableSubstitutions && entry.variableSubstitutions.length > 0
        ? { mode: entry.mode, inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
        : null,
    );
    if (entry.mode === 'calculate') {
      if (entry.calculateScreen && entry.calculateScreen !== 'standard' && entry.calculateScreen !== 'calculusHome') {
        openCalculateScreen(entry.calculateScreen);
        applyCalculateSeed(entry.calculateScreen, entry.calculateSeed);
        setCalculateReplayVariableSubstitutions(
          entry.variableSubstitutions && entry.variableSubstitutions.length > 0
            ? { inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
            : null,
        );
      } else {
        openCalculateScreen('standard');
        setCalculateLatex(entry.inputLatex);
        setCalculateReplayVariableSubstitutions(
          entry.variableSubstitutions && entry.variableSubstitutions.length > 0
            ? { inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
            : null,
        );
      }
    }

    if (entry.mode === 'table') {
      tableRuntime.clearTable();
      tableRuntime.setTablePrimaryLatex(entry.inputLatex);
    }

    if (entry.mode === 'equation') {
      const replayTarget = inferEquationReplayTarget(entry);
      patchSettings({
        equationAnswerMode: entry.equationAnswerMode ?? (entry.numericInterval ? 'approximate' : 'exact'),
        equationDomainIntent: entry.equationDomainIntent ?? 'real',
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

    if (entry.mode === 'advancedCalculus') {
      if (entry.advancedCalcScreen) {
        openAdvancedCalcScreen(entry.advancedCalcScreen);
        applyAdvancedCalcSeed(entry.advancedCalcScreen, entry.advancedCalcSeed);
      } else if (entry.inputLatex.startsWith('\\int_{-\\infty}') || entry.inputLatex.includes('\\infty')) {
        openAdvancedCalcScreen('improperIntegral');
      } else if (entry.inputLatex.startsWith('\\int_')) {
        openAdvancedCalcScreen('definiteIntegral');
      } else if (entry.inputLatex.startsWith('\\int')) {
        openAdvancedCalcScreen('indefiniteIntegral');
      } else if (entry.inputLatex.startsWith('\\lim_{x\\to \\infty}') || entry.inputLatex.startsWith('\\lim_{x\\to -\\infty}')) {
        openAdvancedCalcScreen('infiniteLimit');
      } else if (entry.inputLatex.startsWith('\\lim_')) {
        openAdvancedCalcScreen('finiteLimit');
      } else if (entry.inputLatex.startsWith('\\text{Maclaurin}')) {
        openAdvancedCalcScreen('maclaurin');
      } else if (entry.inputLatex.startsWith('\\text{Taylor}')) {
        openAdvancedCalcScreen('taylor');
      } else if (entry.inputLatex.includes("y''")) {
        openAdvancedCalcScreen('odeSecondOrder');
      } else if (entry.inputLatex.includes("y'=") && entry.inputLatex.includes('h=')) {
        openAdvancedCalcScreen('odeNumericIvp');
      } else if (entry.inputLatex.includes('\\frac{dy}{dx}') || entry.inputLatex.includes("y'=")) {
        openAdvancedCalcScreen('odeFirstOrder');
      } else {
        openAdvancedCalcScreen('home');
      }
    }

    if (entry.mode === 'trigonometry') {
      const parsed = parseTrigDraft(entry.inputLatex, {
        screenHint: entry.trigScreen,
        identityTargetForm: trigIdentityState.targetForm,
      });
      if (parsed.ok) {
        const request = parsed.request;
        const replayScreen = entry.trigScreen
          ? trigRequestToScreen(request, entry.trigScreen)
          : trigRequestToScreen(request);
        openTrigScreen(replayScreen);
        if (request.kind === 'function') {
          const expressionLatex = request.expressionLatex;
          if (replayScreen === 'specialAngles') {
            setSpecialAnglesExpression(expressionLatex);
          } else {
            setTrigFunctionState((currentState) => ({ ...currentState, expressionLatex }));
          }
        } else if (request.kind === 'identitySimplify') {
          const { expressionLatex } = request;
          setTrigIdentityState((currentState) => ({
            ...currentState,
            expressionLatex,
            targetForm: 'simplified',
          }));
        } else if (request.kind === 'identityConvert') {
          const { expressionLatex, targetForm } = request;
          setTrigIdentityState((currentState) => ({
            ...currentState,
            expressionLatex,
            targetForm,
          }));
        } else if (request.kind === 'equationSolve') {
          const { equationLatex } = request;
          setTrigEquationState((currentState) => ({
            ...currentState,
            equationLatex,
            angleUnit: settings.angleUnit,
          }));
        } else if (request.kind === 'rightTriangle') {
          setRightTriangleState({
            knownSideA: request.knownSideA ?? '',
            knownSideB: request.knownSideB ?? '',
            knownSideC: request.knownSideC ?? '',
            knownAngleA: request.knownAngleA ?? '',
            knownAngleB: request.knownAngleB ?? '',
          });
        } else if (request.kind === 'sineRule') {
          setSineRuleState({
            sideA: request.sideA ?? '',
            sideB: request.sideB ?? '',
            sideC: request.sideC ?? '',
            angleA: request.angleA ?? '',
            angleB: request.angleB ?? '',
            angleC: request.angleC ?? '',
          });
        } else if (request.kind === 'cosineRule') {
          setCosineRuleState({
            sideA: request.sideA ?? '',
            sideB: request.sideB ?? '',
            sideC: request.sideC ?? '',
            angleA: request.angleA ?? '',
            angleB: request.angleB ?? '',
            angleC: request.angleC ?? '',
          });
        } else if (request.kind === 'angleConvert') {
          setAngleConvertState({
            value: request.valueLatex,
            from: request.from,
            to: request.to,
          });
        }

        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.trigScreen) {
        openTrigScreen(entry.trigScreen);
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else {
        openTrigScreen('home');
      }
    }

    if (entry.mode === 'statistics') {
      const parsed = parseStatisticsDraft(entry.inputLatex, {
        screenHint: entry.statisticsScreen,
        workingSourceHint: statisticsWorkingSource,
      });
      if (parsed.ok) {
        const replayScreen = entry.statisticsScreen
          ? statisticsRequestToScreen(parsed.request, entry.statisticsScreen)
          : statisticsRequestToScreen(parsed.request);
        openStatisticsScreen(replayScreen);
        applyStatisticsRequest(parsed.request);
        const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
        if (nextSource) {
          setStatisticsWorkingSource(nextSource);
        }
        setStatisticsDraftState({
          rawLatex: entry.inputLatex,
          style: statisticsDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.statisticsScreen) {
        openStatisticsScreen(entry.statisticsScreen);
        setStatisticsDraftState({
          rawLatex: entry.inputLatex,
          style: statisticsDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else {
        openStatisticsScreen('home');
      }
    }

    if (entry.mode === 'geometry') {
      const parsed = parseGeometryDraft(entry.inputLatex, {
        screenHint: entry.geometryScreen,
      });
      if (parsed.ok) {
        const replayScreen = geometryRequestToScreen(parsed.request);
        openGeometryScreen(replayScreen);
        setGeometryDraftState({
          rawLatex: entry.inputLatex,
          style: geometryDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.geometryScreen) {
        openGeometryScreen(entry.geometryScreen);
      } else {
        openGeometryScreen('home');
      }
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
    currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
      ? getAdvancedCalcProvenanceBadge(displayOutcome.resultOrigin as AdvancedCalcResultOrigin | undefined)
      : undefined;
  const advancedCalcResultBadges =
    currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
      ? ['Advanced Calc']
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
  const editorAnalysisStatusLabel = editorRuntimeStatusOverride
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
  const advancedCalcKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('advancedCalculus'));
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

  const statisticsDatasetText = datasetTextFromValues(statsDataset.values);
  const statisticsRegressionText = pointsTextFromState(regressionState);
  const statisticsCorrelationText = pointsTextFromState(correlationState);
  const statisticsFilledFrequencyRowCount = frequencyTable.rows.filter(
    (row) => row.value.trim() && row.frequency.trim(),
  ).length;
  const statisticsSourceSyncSummary =
    statisticsSourceSyncState.datasetStale
      ? 'Dataset is stale relative to the manual frequency table.'
      : statisticsSourceSyncState.frequencyTableStale
        ? 'Frequency table is stale relative to the dataset.'
        : 'Dataset and frequency table are in sync.';

  function updateStatisticsDataset(text: string) {
    const values = text
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    setStatsDataset({ values });
    setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
  }

  function updateStatisticsFrequencyRow(
    index: number,
    key: 'value' | 'frequency',
    value: string,
  ) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function addStatisticsFrequencyRow() {
    setFrequencyTable((currentTable) => ({
      rows: [...currentTable.rows, { value: '', frequency: '' }],
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function removeStatisticsFrequencyRow(index: number) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.length <= 1
        ? [{ value: '', frequency: '' }]
        : currentTable.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function updateRegressionPointDraft(
    kind: 'regression' | 'correlation',
    index: number,
    key: 'x' | 'y',
    value: string,
  ) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              [key]: value,
            }
          : point,
      ),
    }));
  }

  function addRegressionPoint(kind: 'regression' | 'correlation') {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: [...currentState.points, { x: '', y: '' }],
    }));
  }

  function removeRegressionPoint(kind: 'regression' | 'correlation', index: number) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.length <= 1
        ? [{ x: '', y: '' }]
        : currentState.points.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  function switchStatisticsSource(source: StatisticsWorkingSource) {
    setStatisticsWorkingSource(source);
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      !isStatisticsMenuScreen(statisticsScreen)
      && (statisticsScreen === 'descriptive' || statisticsScreen === 'frequency' || statisticsScreen === 'meanInference')
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(statisticsScreen, statisticsStateSnapshot, source),
        'guided',
        true,
      );
    }
  }

  function importDatasetIntoFrequencyTable() {
    const nextTable = collapseDatasetToFrequencyTable(statsDataset);
    setFrequencyTable(nextTable);
    setStatisticsWorkingSource('frequencyTable');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'frequency'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            frequencyTable: nextTable,
          },
          'frequencyTable',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Frequency table built from dataset');
  }

  function expandStatisticsTableToDataset() {
    const nextDataset = expandFrequencyTableToDataset(frequencyTable);
    setStatsDataset(nextDataset);
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'dataEntry'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'frequency'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            dataset: nextDataset,
          },
          'dataset',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Dataset expanded from frequency table');
  }

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
          modeLabels={MODE_LABELS}
          onClear={resetHistory}
          onClose={closeHistoryPanel}
          onDelete={deleteHistoryEntryById}
          onReplay={replayHistoryEntry}
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
          openAdvancedCalcScreen={openAdvancedCalcScreen}
          openGeometryScreen={openGeometryScreen}
          openGuideHome={openGuideHome}
          openStatisticsScreen={openStatisticsScreen}
          openTrigScreen={openTrigScreen}
          patchSettings={patchSettings}
          runtimeLabel={runtimeLabel}
          setGuideRoute={setGuideRoute}
          setMode={setMode}
          settings={settings}
          settingsOpen={settingsOpen}
          showModeTabs={showModeTabs}
          toggleHistoryPanel={toggleHistoryPanel}
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
                onOpenScreen={openCalculateScreen}
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

            {!isLauncherOpen && currentMode === 'advancedCalculus' ? (
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
                onOpenGuideMode={() => openGuideMode('advancedCalculus')}
                onLoadWorkbenchToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                onCopyWorkbenchExpression={copyAdvancedCalcWorkbenchExpression}
                onRegisterActiveField={(field) => {
                  activeFieldRef.current = field;
                }}
                keyboardLayouts={advancedCalcKeyboardLayouts}
                workbenchLatex={advancedCalcWorkbenchExpression}
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
                onUseInTrigonometry={() => loadTrigDraft(buildTrigDraftForScreen(trigScreen), 'guided', true)}
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
                trigTargetFormLabels={Object.entries(TRIG_TARGET_FORM_LABELS) as Array<[TrigIdentityState['targetForm'], string]>}
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
                lineFormLabels={Object.entries(GEOMETRY_LINE_FORM_LABELS) as Array<[LineEquationState['form'], string]>}
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
