import type {
  CalculusScreen,
  AngleUnit,
  AnswerDomain,
  CalculateScreen,
  ComplexExactForm,
  EquationAnswerMode,
  EquationDomainIntent,
  EquationScreen,
  GeometryScreen,
  LauncherCategoryId,
  LauncherLeafId,
  LimitDirection,
  IntegralKind,
  LimitTargetKind,
  MathNotationDisplay,
  ModeId,
  LegacyEquationAnswerMode,
  NumericNotationMode,
  OutputStyle,
  ScientificNotationStyle,
  SolutionKind,
  StatisticsScreen,
  TrigScreen,
} from './mode-types';
import type { ExactScalarWire } from './exact-scalar-types';
import type {
  CoreDraftSource,
  CoreDraftStyle,
  DerivativeVariable,
  MathDocument,
} from './execution-types';
import type { NumericSolveInterval } from './solver-types';
import type { EquationReplaySeed } from './equation-replay-types';
import type {
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
  DisplaySystemSolutionReadback,
  VariableSubstitutionSnapshot,
} from './display-types';
import {
  DEFAULT_LANGUAGE_CODE,
  type LanguageCode,
} from '../../lib/language';

export * from './mode-types';
export * from './execution-types';
export * from './runtime-profile-types';
export * from './runtime-policy-types';
export * from './exact-supplement-types';
export * from './abs-types';
export * from './display-types';
export * from './solver-types';
export type {
  EquationReplaySeed,
  EquationReplayTarget,
} from './equation-replay-types';
export type EquationMenuEntryId =
  | 'symbolic'
  | 'polynomial'
  | 'simultaneous'
  | 'quadratic'
  | 'cubic'
  | 'quartic'
  | 'linear2'
  | 'linear3'
  | 'polynomialSystem2';
export type CapabilityId =
  | 'keyboard-foundation'
  | 'algebra-core'
  | 'discrete-core'
  | 'calculus-core'
  | 'linear-algebra-core'
  | 'trigonometry-core'
  | 'statistics-core'
  | 'geometry-core';
export type SupportLevel = 'hidden' | 'insert' | 'numeric' | 'symbolic';

export type KeyboardContext = {
  mode: ModeId;
  equationScreen?: EquationScreen;
  enabledCapabilities: CapabilityId[];
};

export type KeyboardAction =
  | { kind: 'insert-latex'; latex: string }
  | { kind: 'insert-template'; latex: string }
  | { kind: 'execute-command'; command: string }
  | { kind: 'open-page'; pageId: string };

export type KeyboardKeySpec = {
  id: string;
  label: string;
  action: KeyboardAction;
  capability: CapabilityId;
  supportLevel: SupportLevel;
  pageId: string;
  modeVisibility?: ModeId[];
  equationVisibility?: EquationScreen[];
  variants?: KeyboardKeySpec[];
  duplicateGroup?: string;
  lessonRef?: string;
};

export type KeyboardPageSpec = {
  id: string;
  label: string;
  capability: CapabilityId;
  rows: KeyboardKeySpec[][];
  modeVisibility?: ModeId[];
  equationVisibility?: EquationScreen[];
};

export type LessonSpec = {
  id: string;
  milestone: string;
  title: string;
  concepts: string[];
  examples: {
    title: string;
    steps: string[];
    expected: string;
  }[];
  pitfalls: string[];
};

export type GuideDomainId =
  | 'basics'
  | 'algebra'
  | 'discrete'
  | 'calculus'
  | 'linearAlgebra'
  | 'trigonometry'
  | 'statistics'
  | 'geometry';

export type GuideScreen =
  | 'home'
  | 'domain'
  | 'article'
  | 'symbolLookup'
  | 'modeGuide'
  | 'search';

export type GuideModeId = Exclude<ModeId, 'guide' | 'labs'>;

export type GuideRoute =
  | { screen: 'home' }
  | { screen: 'domain'; domainId: GuideDomainId }
  | { screen: 'article'; articleId: string }
  | { screen: 'symbolLookup'; query: string }
  | { screen: 'modeGuide'; modeId?: GuideModeId }
  | { screen: 'search'; query: string };

export type GuideSoftAction =
  | 'open'
  | 'search'
  | 'symbols'
  | 'modes'
  | 'copy'
  | 'load'
  | 'back'
  | 'exit';

export type GuideRouteMeta = {
  title: string;
  breadcrumb: string[];
  description: string;
  focusTarget: 'menu' | 'search' | 'article';
  softActions: GuideSoftAction[];
};

export type GuideArticleId = string;
export type GuideSymbolId = string;

export type GuideExampleLaunch =
  | {
      kind: 'load-expression';
      targetMode: 'calculate' | 'equation' | 'table' | 'calculus' | 'trigonometry' | 'statistics' | 'geometry';
      calculateScreen?: CalculateScreen;
      calculateSeed?: Partial<
        DerivativeWorkbenchState
        & DerivativePointWorkbenchState
        & IntegralWorkbenchState
        & LimitWorkbenchState
      >;
      calculusScreen?: CalculusScreen;
      calculusSeed?: Partial<
        DerivativeWorkbenchState
        & DerivativePointWorkbenchState
        & ImplicitDerivativeState
        & CalculusIndefiniteIntegralState
        & CalculusDefiniteIntegralState
        & CalculusImproperIntegralState & CalculusLimitState
        & CalculusFiniteLimitState
        & CalculusInfiniteLimitState
        & SeriesState
        & LaplaceTransformState
        & PartialDerivativeWorkbenchState
        & FirstOrderOdeState
        & SecondOrderOdeState
        & NumericIvpState
      >;
      trigScreen?: TrigScreen;
      trigSeed?: Partial<
        TrigFunctionState
        & TrigIdentityState
        & TrigEquationState
        & RightTriangleState
        & SineRuleState
        & CosineRuleState
        & TrigPeriodPhaseState
        & AngleConvertState
      >;
      statisticsScreen?: StatisticsScreen;
      geometryScreen?: GeometryScreen;
      geometrySeed?: Partial<
        TriangleAreaState
        & TriangleHeronState
        & RectangleState
        & SquareState
        & CircleState
        & ArcSectorState
        & CubeState
        & CuboidState
        & CylinderState
        & ConeState
        & SphereState
        & DistanceState
        & MidpointState
        & SlopeState
        & LineEquationState
      >;
      equationScreen?: EquationScreen;
      equationSolveTarget?: string;
      latex: string;
      label?: string;
      note?: string;
    }
  | {
      kind: 'open-tool';
      targetMode: GuideModeId;
      calculateScreen?: CalculateScreen;
      calculateSeed?: Partial<
        DerivativeWorkbenchState
        & DerivativePointWorkbenchState
        & IntegralWorkbenchState
        & LimitWorkbenchState
      >;
      calculusScreen?: CalculusScreen;
      calculusSeed?: Partial<
        DerivativeWorkbenchState
        & DerivativePointWorkbenchState
        & ImplicitDerivativeState
        & CalculusIndefiniteIntegralState
        & CalculusDefiniteIntegralState
        & CalculusImproperIntegralState & CalculusLimitState
        & CalculusFiniteLimitState
        & CalculusInfiniteLimitState
        & SeriesState
        & LaplaceTransformState
        & PartialDerivativeWorkbenchState
        & FirstOrderOdeState
        & SecondOrderOdeState
        & NumericIvpState
      >;
      trigScreen?: TrigScreen;
      trigSeed?: Partial<
        TrigFunctionState
        & TrigIdentityState
        & TrigEquationState
        & RightTriangleState
        & SineRuleState
        & CosineRuleState
        & TrigPeriodPhaseState
        & AngleConvertState
      >;
      statisticsScreen?: StatisticsScreen;
      geometryScreen?: GeometryScreen;
      geometrySeed?: Partial<
        TriangleAreaState
        & TriangleHeronState
        & RectangleState
        & SquareState
        & CircleState
        & ArcSectorState
        & CubeState
        & CuboidState
        & CylinderState
        & ConeState
        & SphereState
        & DistanceState
        & MidpointState
        & SlopeState
        & LineEquationState
      >;
      equationScreen?: EquationScreen;
      label?: string;
      note?: string;
    };

export type GuideExample = {
  id: string;
  title: string;
  explanation: string;
  steps: string[];
  expected: string;
  launch: GuideExampleLaunch;
  copyLatex?: string;
};

export type GuideArticle = {
  id: GuideArticleId;
  domainId: GuideDomainId;
  title: string;
  summary: string;
  whatItIs: string[];
  whatItMeans?: string[];
  howToUse: string[];
  concepts: string[];
  whereToFindIt: string[];
  bestModes: GuideModeId[];
  symbols: GuideSymbolId[];
  examples: GuideExample[];
  pitfalls: string[];
  exactVsNumeric?: string[];
  relatedArticleIds?: GuideArticleId[];
};

export type GuideSymbolRef = {
  id: GuideSymbolId;
  label: string;
  latex: string;
  domainId: GuideDomainId;
  keyboardPageId?: string;
  supportLevel: 'insert' | 'numeric' | 'symbolic';
  meaning: string;
  bestModes: GuideModeId[];
  articleIds: GuideArticleId[];
  active: boolean;
};

export type GuideModeRef = {
  modeId: GuideModeId;
  title: string;
  summary: string;
  bestFor: string[];
  avoidFor: string[];
  articleIds: GuideArticleId[];
};

export type GuideDomain = {
  id: GuideDomainId;
  title: string;
  summary: string;
  articleIds: GuideArticleId[];
};

export type GuideHomeEntryId =
  | GuideDomainId
  | 'symbolLookup'
  | 'modeGuide';

export type GuideHomeEntry = {
  id: GuideHomeEntryId;
  hotkey: string;
  title: string;
  description: string;
};

export type GuideSearchResult =
  | {
      kind: 'domain';
      id: GuideDomainId;
      title: string;
      description: string;
      route: GuideRoute;
    }
  | {
      kind: 'article';
      id: GuideArticleId;
      title: string;
      description: string;
      route: GuideRoute;
    }
  | {
      kind: 'symbol';
      id: GuideSymbolId;
      title: string;
      description: string;
      route: GuideRoute;
      symbolId: GuideSymbolId;
    }
  | {
      kind: 'mode';
      id: GuideModeId;
      title: string;
      description: string;
      route: GuideRoute;
    };

export type MenuNode = {
  id: string;
  label: string;
  hotkey?: string;
  children?: MenuNode[];
};

export type LauncherLaunchTarget =
  | { mode: 'calculate'; calculateScreen?: CalculateScreen }
  | { mode: 'equation'; equationScreen?: EquationScreen }
  | { mode: 'matrix' }
  | { mode: 'vector' }
  | { mode: 'table' }
  | { mode: 'calculus'; calculusScreen?: CalculusScreen }
  | { mode: 'trigonometry'; trigScreen?: TrigScreen }
  | { mode: 'statistics'; statisticsScreen?: StatisticsScreen }
  | { mode: 'geometry'; geometryScreen?: GeometryScreen }
  | { mode: 'labs' };

export type LauncherLaunchIntent = 'current-tab' | 'new-tab';

export type LauncherAppEntry = {
  id: LauncherLeafId;
  label: string;
  description: string;
  hotkey: string;
  launch: LauncherLaunchTarget;
};

export type LauncherCategory = {
  id: LauncherCategoryId;
  label: string;
  description: string;
  hotkey: string;
  entries: LauncherAppEntry[];
};

export type EquationMenuEntry = {
  id: EquationMenuEntryId;
  label: string;
  description: string;
  hotkey: string;
  target: EquationScreen;
};

export type EquationRouteMeta = {
  screen: EquationScreen;
  label: string;
  shortLabel: string;
  description: string;
  breadcrumb: string[];
  badge?: string;
  helpText: string;
  selectionHint?: string;
  focusTarget: 'menu' | 'symbolic' | 'polynomial' | 'simultaneous';
};

export type CalculateRouteMeta = {
  screen: CalculateScreen;
  label: string;
  breadcrumb: string[];
  description: string;
  helpText: string;
  guideArticleId?: GuideArticleId;
  previewTitle?: string;
  previewSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  focusTarget: 'editor' | 'menu' | 'body' | 'point' | 'bounds' | 'target';
};

export type DerivativeWorkbenchState = { bodyLatex: string; variable?: DerivativeVariable; operatorLatex?: string };

export type DerivativePointWorkbenchState = { bodyLatex: string; point: string; variable?: DerivativeVariable; operatorLatex?: string };

export type ImplicitDerivativeState = { relationLatex: string; independentVariable?: DerivativeVariable; dependentVariable?: DerivativeVariable };

export type IntegralWorkbenchState = {
  kind: IntegralKind;
  bodyLatex: string;
  lower: string;
  upper: string;
};

export type LimitWorkbenchState = {
  bodyLatex: string;
  target: string;
  direction: LimitDirection;
  targetKind: LimitTargetKind;
};
export type AdvancedIntegralKind = 'indefinite' | 'definite' | 'improper';
export type SeriesKind = 'maclaurin' | 'taylor';
export type TrigFunctionState = {
  expressionLatex: string;
};
export type TrigIdentityState = {
  expressionLatex: string;
  targetForm: 'simplified' | 'productToSum' | 'sumToProduct' | 'doubleAngle' | 'halfAngle';
};
export type TrigEquationState = {
  equationLatex: string;
  variable: 'x';
  angleUnit: AngleUnit;
};
export type RightTriangleState = {
  knownSideA: string;
  knownSideB: string;
  knownSideC: string;
  knownAngleA: string;
  knownAngleB: string;
};
export type SineRuleState = {
  sideA: string;
  sideB: string;
  sideC: string;
  angleA: string;
  angleB: string;
  angleC: string;
};
export type CosineRuleState = {
  sideA: string;
  sideB: string;
  sideC: string;
  angleA: string;
  angleB: string;
  angleC: string;
};
export type AngleConvertState = {
  value: string;
  from: AngleUnit;
  to: AngleUnit;
};
export type TrigPeriodPhaseState = {
  expressionLatex: string;
  variable: 'x';
};
export type TriangleAreaState = {
  base: string;
  height: string;
};
export type TriangleHeronState = {
  a: string;
  b: string;
  c: string;
};
export type RectangleState = {
  width: string;
  height: string;
};
export type SquareState = {
  side: string;
};
export type CircleState = {
  radius: string;
};
export type ArcSectorState = {
  radius: string;
  angle: string;
  angleUnit: AngleUnit;
};
export type CoreDraftState = {
  rawLatex: string;
  style: CoreDraftStyle;
  source: CoreDraftSource;
  executable: boolean;
};
export type StatisticsWorkingSource = 'dataset' | 'frequencyTable';
export type StatsDataset = {
  values: string[];
};
export type FrequencyRow = {
  value: string;
  frequency: string;
};
export type FrequencyTable = {
  rows: FrequencyRow[];
};
export type BinomialState = {
  n: string;
  p: string;
  x: string;
  mode: 'pmf' | 'cdf';
};
export type NormalState = {
  mean: string;
  standardDeviation: string;
  x: string;
  mode: 'pdf' | 'cdf';
};
export type PoissonState = {
  lambda: string;
  x: string;
  mode: 'pmf' | 'cdf';
};
export type RegressionPoint = {
  x: string;
  y: string;
};
export type RegressionState = {
  points: RegressionPoint[];
};
export type CorrelationState = {
  points: RegressionPoint[];
};
export type MeanInferenceState = {
  mode: 'ci' | 'test';
  level: string;
  mu0: string;
};
export type StatisticsSourceSyncState = {
  datasetStale: boolean;
  frequencyTableStale: boolean;
};
export type CubeState = {
  side: string;
};
export type CuboidState = {
  length: string;
  width: string;
  height: string;
};
export type CylinderState = {
  radius: string;
  height: string;
};
export type ConeState = {
  radius: string;
  height: string;
  slantHeight: string;
};
export type SphereState = {
  radius: string;
};
export type Point2D = {
  x: string;
  y: string;
};
export type DistanceState = {
  p1: Point2D;
  p2: Point2D;
};
export type MidpointState = {
  p1: Point2D;
  p2: Point2D;
};
export type SlopeState = {
  p1: Point2D;
  p2: Point2D;
};
export type LineEquationState = {
  p1: Point2D;
  p2: Point2D;
  form: 'slope-intercept' | 'point-slope' | 'standard';
};
export type GeometryRequest =
  | { kind: 'square'; sideLatex: string }
  | { kind: 'rectangle'; widthLatex: string; heightLatex: string }
  | { kind: 'circle'; radiusLatex: string }
  | { kind: 'arcSector'; radiusLatex: string; angleLatex: string; angleUnit: AngleUnit }
  | { kind: 'cube'; sideLatex: string }
  | { kind: 'cuboid'; lengthLatex: string; widthLatex: string; heightLatex: string }
  | { kind: 'cylinder'; radiusLatex: string; heightLatex: string }
  | { kind: 'cone'; radiusLatex: string; heightLatex?: string; slantHeightLatex?: string }
  | { kind: 'sphere'; radiusLatex: string }
  | { kind: 'triangleArea'; baseLatex: string; heightLatex: string }
  | { kind: 'triangleHeron'; aLatex: string; bLatex: string; cLatex: string }
  | { kind: 'distance'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string } }
  | { kind: 'midpoint'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string } }
  | { kind: 'slope'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string } }
  | { kind: 'lineEquation'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string }; form: LineEquationState['form'] }
  | { kind: 'squareSolveMissing'; sideLatex: string; areaLatex?: string; perimeterLatex?: string; diagonalLatex?: string }
  | { kind: 'circleSolveMissing'; radiusLatex: string; diameterLatex?: string; circumferenceLatex?: string; areaLatex?: string }
  | { kind: 'cubeSolveMissing'; sideLatex: string; volumeLatex?: string; surfaceAreaLatex?: string; diagonalLatex?: string }
  | { kind: 'sphereSolveMissing'; radiusLatex: string; volumeLatex?: string; surfaceAreaLatex?: string }
  | { kind: 'triangleAreaSolveMissing'; baseLatex: string; heightLatex: string; areaLatex: string; unknown: 'base' | 'height' }
  | { kind: 'rectangleSolveMissing'; widthLatex: string; heightLatex: string; areaLatex?: string; perimeterLatex?: string; diagonalLatex?: string; unknown: 'width' | 'height' }
  | { kind: 'cylinderSolveMissing'; radiusLatex: string; heightLatex: string; volumeLatex: string; unknown: 'radius' | 'height' }
  | { kind: 'coneSolveMissing'; radiusLatex: string; heightLatex: string; slantHeightLatex: string; volumeLatex?: string; unknown: 'radius' | 'height' | 'slantHeight' }
  | { kind: 'cuboidSolveMissing'; lengthLatex: string; widthLatex: string; heightLatex: string; volumeLatex?: string; diagonalLatex?: string; unknown: 'length' | 'width' | 'height' }
  | { kind: 'arcSectorSolveMissing'; radiusLatex: string; angleLatex: string; angleUnit: AngleUnit; arcLatex?: string; sectorLatex?: string; unknown: 'radius' | 'angle' }
  | { kind: 'triangleHeronSolveMissing'; aLatex: string; bLatex: string; cLatex: string; areaLatex: string; unknown: 'a' | 'b' | 'c' }
  | { kind: 'distanceSolveMissing'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string }; distanceLatex: string }
  | { kind: 'midpointSolveMissing'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string }; mid: { xLatex: string; yLatex: string } }
  | { kind: 'slopeSolveMissing'; p1: { xLatex: string; yLatex: string }; p2: { xLatex: string; yLatex: string }; slopeLatex: string };
export type GeometryParseResult =
  | { ok: true; request: GeometryRequest; style: CoreDraftStyle }
  | { ok: false; error: string };
export type GeometryReplaySeed = {
  screen: GeometryScreen;
  request: GeometryRequest;
};
export type GeometrySerializerOptions = {
  style: 'structured';
};
export type TrigRequest =
  | { kind: 'function'; expressionLatex: string }
  | { kind: 'identitySimplify'; expressionLatex: string }
  | { kind: 'identityConvert'; expressionLatex: string; targetForm: TrigIdentityState['targetForm'] }
  | { kind: 'equationSolve'; equationLatex: string; variable: 'x' }
  | { kind: 'rightTriangle'; knownSideA?: string; knownSideB?: string; knownSideC?: string; knownAngleA?: string; knownAngleB?: string }
  | { kind: 'sineRule'; sideA?: string; sideB?: string; sideC?: string; angleA?: string; angleB?: string; angleC?: string }
  | { kind: 'cosineRule'; sideA?: string; sideB?: string; sideC?: string; angleA?: string; angleB?: string; angleC?: string }
  | { kind: 'angleConvert'; valueLatex: string; from: AngleUnit; to: AngleUnit }
  | { kind: 'periodPhase'; expressionLatex: string; variable: 'x'; angleUnit?: AngleUnit };
export type TrigParseResult =
  | { ok: true; request: TrigRequest; style: CoreDraftStyle }
  | { ok: false; error: string };
export type TrigParseOptions = {
  screenHint?: TrigScreen;
  identityTargetForm?: TrigIdentityState['targetForm'];
  angleUnit?: AngleUnit;
};
export type TrigSerializerOptions = {
  style: 'structured';
  identityTargetForm?: TrigIdentityState['targetForm'];
};
export type TrigReplaySeed = {
  screen: TrigScreen;
  request: TrigRequest;
};
export type TrigRewriteSolveKind =
  | 'product-double-angle'
  | 'cos-double-angle'
  | 'same-argument-quotient'
  | 'sin-square-split'
  | 'cos-square-split'
  | 'sum-product-single'
  | 'sum-product-split';
export type TrigRewriteSolveCandidate =
  | {
      kind: 'single-call';
      rewriteKind: 'product-double-angle' | 'cos-double-angle' | 'same-argument-quotient' | 'sum-product-single';
      solvedLatex: string;
      summaryText: string;
    }
  | {
      kind: 'split-square';
      rewriteKind: 'sin-square-split' | 'cos-square-split';
      branchLatex: [string, string];
      domainSummary: string;
      summaryText: string;
    }
  | {
      kind: 'split-sum-product';
      rewriteKind: 'sum-product-split';
      branchLatex: [string, string];
      normalizedLatex: string;
      summaryText: string;
    };
export type StatisticsRequest =
  | { kind: 'dataset'; values: string[] }
  | { kind: 'descriptive'; source: 'dataset'; values: string[] }
  | { kind: 'descriptive'; source: 'frequencyTable'; rows: FrequencyRow[] }
  | { kind: 'frequency'; source: 'dataset'; values: string[] }
  | { kind: 'frequency'; source: 'frequencyTable'; rows: FrequencyRow[] }
  | { kind: 'binomial'; n: string; p: string; x: string; mode: BinomialState['mode'] }
  | { kind: 'normal'; mean: string; standardDeviation: string; x: string; mode: NormalState['mode'] }
  | { kind: 'poisson'; lambda: string; x: string; mode: PoissonState['mode'] }
  | { kind: 'meanInference'; source: 'dataset'; values: string[]; mode: MeanInferenceState['mode']; level: string; mu0?: string }
  | { kind: 'meanInference'; source: 'frequencyTable'; rows: FrequencyRow[]; mode: MeanInferenceState['mode']; level: string; mu0?: string }
  | { kind: 'regression'; points: RegressionPoint[] }
  | { kind: 'correlation'; points: RegressionPoint[] };
export type StatisticsParseResult =
  | { ok: true; request: StatisticsRequest; style: CoreDraftStyle }
  | { ok: false; error: string };
export type StatisticsParseOptions = {
  screenHint?: StatisticsScreen;
  workingSourceHint?: StatisticsWorkingSource;
};
export type StatisticsSerializerOptions = {
  style: 'structured';
};
export type StatisticsReplaySeed = {
  screen: StatisticsScreen;
  request: StatisticsRequest;
  workingSource: StatisticsWorkingSource;
};
export type CalculusIndefiniteIntegralState = {
  bodyLatex: string; integrationVariable?: string;
};
export type CalculusDefiniteIntegralState = {
  bodyLatex: string; integrationVariable?: string;
  lower: string;
  upper: string;
};
export type CalculusImproperIntegralState = {
  bodyLatex: string; integrationVariable?: string;
  lowerKind: 'finite' | 'negInfinity';
  lower: string;
  upperKind: 'finite' | 'posInfinity';
  upper: string;
};
export type CalculusFiniteLimitState = {
  bodyLatex: string;
  target: string;
  direction: LimitDirection;
  variable?: string;
};
export type CalculusInfiniteLimitState = {
  bodyLatex: string;
  targetKind: 'posInfinity' | 'negInfinity';
  variable?: string;
};
export type CalculusLimitState = { requestLatex: string };
export type SeriesState = {
  bodyLatex: string;
  kind: SeriesKind;
  center: string;
  order: number;
};
export type LaplaceTransformState = { bodyLatex: string };
export type PartialDerivativeWorkbenchState = { bodyLatex: string; variable: DerivativeVariable; operatorLatex?: string };
export type OdeFamily = 'firstOrder' | 'secondOrder' | 'numericIvp';
export type FirstOrderOdeState = {
  lhsLatex: string;
  rhsLatex: string;
  classification: 'separable' | 'linear' | 'exact';
};
export type SecondOrderOdeState = {
  a2: string;
  a1: string;
  a0: string;
  forcingLatex: string;
};
export type NumericIvpState = {
  bodyLatex: string;
  x0: string;
  y0: string;
  xEnd: string;
  step: string;
  method: 'rk4' | 'rk45';
};
export type NumericOdeMethod = NumericIvpState['method'];
export type NumericOdePoint = {
  x: number;
  y: number;
};
export type NumericOdeRequest = {
  expression: string;
  x0: number;
  y0: number;
  xEnd: number;
  step: number;
  method: NumericOdeMethod;
};
export type NumericOdeResponse = {
  finalX: number;
  finalY: number;
  samples: NumericOdePoint[];
  warnings: string[];
  error?: string;
};

export type AppSurface = 'app' | 'launcher';

export type LauncherState = {
  surface: AppSurface;
  level: 'root' | 'category';
  rootSelectedIndex: number;
  categoryId: LauncherCategoryId | null;
  categorySelectedIndex: number;
};

export type StoredVariableValue = {
  name: string;
  valueLatex: string;
  numericValue: number;
  updatedAt?: string;
};

export type HistoryEntry = {
  id: string;
  mode: ModeId;
  inputLatex: string;
  resolvedInputLatex?: string;
  resultLatex?: string;
  exactSupplementLatex?: string[];
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  systemReadback?: DisplaySystemSolutionReadback;
  calculateScreen?: CalculateScreen;
  calculateSeed?: Partial<
    DerivativeWorkbenchState
    & DerivativePointWorkbenchState
    & IntegralWorkbenchState
    & LimitWorkbenchState
  >;
  calculusScreen?: CalculusScreen;
  calculusSeed?: Partial<
    DerivativeWorkbenchState
    & DerivativePointWorkbenchState
    & ImplicitDerivativeState
    & CalculusIndefiniteIntegralState
    & CalculusDefiniteIntegralState
    & CalculusImproperIntegralState & CalculusLimitState
    & CalculusFiniteLimitState
    & CalculusInfiniteLimitState
    & SeriesState
    & LaplaceTransformState
    & PartialDerivativeWorkbenchState
    & FirstOrderOdeState
    & SecondOrderOdeState
    & NumericIvpState
  >;
  geometryScreen?: GeometryScreen;
  geometrySeed?: GeometryReplaySeed;
  trigScreen?: TrigScreen;
  trigSeed?: TrigReplaySeed;
  statisticsScreen?: StatisticsScreen;
  statisticsSeed?: StatisticsReplaySeed;
  matrixSeed?: MatrixReplaySeed;
  vectorSeed?: VectorReplaySeed;
  equationScreen?: EquationScreen;
  equationSeed?: EquationReplaySeed;
  equationSolveTarget?: string;
  equationAnswerMode?: LegacyEquationAnswerMode;
  equationDomainIntent?: EquationDomainIntent;
  complexExactForm?: ComplexExactForm;
  answerDomain?: AnswerDomain;
  solutionKind?: SolutionKind;
  numericInterval?: NumericSolveInterval;
  variableSubstitutions?: VariableSubstitutionSnapshot[];
  historyLaunchOrder?: number;
  runtimeElapsedMs?: number;
  timestamp: string;
};

export type PendingHistoryTicket = {
  id: string;
  mode: ModeId;
  inputLatex: string;
  inputRevisionId?: string;
  capabilityId?: string;
  workspaceInstanceId?: string;
  workspaceInstanceLabel?: string;
  workspaceInstanceRevision?: number;
  historyLaunchOrder: number;
  startedAtMs: number;
  status?: 'running' | 'stopping';
  timestamp: string;
};

export type Settings = {
  languageCode: LanguageCode;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  equationAnswerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  complexExactForm: ComplexExactForm;
  mathNotationDisplay: MathNotationDisplay; historyInspectorNotationMode: MathNotationDisplay; historyPageNotationMode: MathNotationDisplay;
  historyEnabled: boolean;
  calculatorMemoryEnabled: boolean;
  calculatorMemoryAutosaveMode: 'settled' | 'interval';
  calculatorMemoryAutosaveIntervalSeconds: number;
  autoSwitchToEquation: boolean;
  uiScale: 100 | 115 | 130 | 145;
  mathScale: 100 | 115 | 130 | 145;
  resultScale: 100 | 115 | 130 | 145;
  highContrast: boolean;
  symbolicDisplayMode: 'roots' | 'powers' | 'auto';
  flattenNestedRootsWhenSafe: boolean;
  approxDigits: number;
  numericNotationMode: NumericNotationMode;
  scientificNotationStyle: ScientificNotationStyle;
  detailedFactsEnabled: boolean;
};

export type SettingsPatch = Partial<Settings>;

export type AppBootstrap = {
  currentMode: ModeId;
  settings: Settings;
  modeTree: MenuNode[];
  historyCount: number;
  variableMemory: StoredVariableValue[];
  version: string;
};

export type CalculatorMemorySnapshotV1 = {
  version: 1;
  savedAt: string;
  currentMode: ModeId;
  previousNonGuideMode?: Exclude<ModeId, 'guide'>;
  settings: Settings;
  history: HistoryEntry[];
  variableMemory: StoredVariableValue[];
  ansLatex: string;
  displayOutcome?: unknown;
  session: Record<string, unknown>;
};

export type CalculatorMemorySnapshot = CalculatorMemorySnapshotV1;

export type ModeState = {
  activeMode: ModeId;
  menu: MenuNode[];
};

export type MatrixOperation =
  | 'add' | 'subtract' | 'multiply' | 'transposeA' | 'transposeB' | 'detA' | 'detB' | 'inverseA' | 'inverseB' | 'rankA' | 'rankB' | 'rrefA' | 'rrefB' | 'nullSpaceA' | 'nullSpaceB' | 'columnSpaceA' | 'columnSpaceB' | 'basisA' | 'basisB' | 'coordinatesA' | 'coordinatesB' | 'changeBasis' | 'luA' | 'luB' | 'pluA' | 'pluB' | 'luSolveA' | 'luSolveB' | 'pluSolveA' | 'pluSolveB' | 'multiRhsSolve' | 'qrA' | 'qrB' | 'columnProjectionA' | 'columnProjectionB' | 'leastSquaresA' | 'leastSquaresB' | 'invertibilityA' | 'invertibilityB' | 'eigenA' | 'eigenB' | 'diagonalizeA' | 'diagonalizeB' | 'spectralPowerA' | 'spectralPowerB' | 'linearSystem';

export type MatrixSystemForm = 'Ax=b' | 'Ax+b=0';
export type MatrixRequest = {
  operation: MatrixOperation;
  matrixA: number[][];
  matrixB?: number[][];
  systemRhs?: number[];
  coordinateVector?: number[]; matrixPowerExponent?: number;
  systemForm?: MatrixSystemForm;
  exactMatrixA?: ExactScalarWire[][]; exactMatrixB?: ExactScalarWire[][]; exactSystemRhs?: ExactScalarWire[]; exactCoordinateVector?: ExactScalarWire[];
  editorExpressionLatex?: string; matrixOperandLatexA?: string; matrixOperandLatexB?: string; systemRhsLatex?: string; coordinateVectorLatex?: string; matrixPowerExponentLatex?: string;
  matrixValues?: { id: string; name: string; value: number[][] }[]; activeMatrixLeftId?: string; activeMatrixRightId?: string;
};

export type MatrixReplaySeed = MatrixRequest;

export type MatrixResponse = {
  resultLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  handoffEquationLatex?: string;
  warnings: string[];
  error?: string;
};

export type VectorOperation =
  | 'dot' | 'cross' | 'normA' | 'normB' | 'angle' | 'add' | 'subtract'
  | 'projectionUofV' | 'projectionVofU' | 'orthogonalToU' | 'orthogonalToV' | 'unitA' | 'unitB' | 'orthogonalCheck' | 'gramSchmidtUV'
  | 'linearCombination' | 'span' | 'independent';

export type VectorRequest = {
  operation: VectorOperation;
  vectorA: number[];
  vectorB?: number[];
  angleUnit: AngleUnit;
  exactVectorA?: ExactScalarWire[]; exactVectorB?: ExactScalarWire[]; editorExpressionLatex?: string; vectorOperandLatexA?: string; vectorOperandLatexB?: string;
  vectorOperands?: number[][]; exactVectorOperands?: ExactScalarWire[][]; vectorOperandLatexList?: string[];
  vectorValues?: { id: string; name: string; value: number[] }[]; activeVectorLeftId?: string; activeVectorRightId?: string;
};

export type VectorReplaySeed = VectorRequest;

export type VectorResponse = {
  resultLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  error?: string;
};

export type TableRow = {
  x: string;
  primary: string;
  secondary?: string;
};

export type TableRequest = {
  primaryExpression: MathDocument;
  secondaryExpression?: MathDocument | null;
  variable: string;
  start: number;
  end: number;
  step: number;
};

export type TableResponse = {
  headers: string[];
  rows: TableRow[];
  warnings: string[];
  error?: string;
};

export const DEFAULT_SETTINGS: Settings = {
  languageCode: DEFAULT_LANGUAGE_CODE,
  angleUnit: 'deg',
  outputStyle: 'both',
  equationAnswerMode: 'exact',
  equationDomainIntent: 'real',
  complexExactForm: 'rectangular',
  mathNotationDisplay: 'rendered', historyInspectorNotationMode: 'rendered', historyPageNotationMode: 'latex',
  historyEnabled: true,
  calculatorMemoryEnabled: true,
  calculatorMemoryAutosaveMode: 'settled',
  calculatorMemoryAutosaveIntervalSeconds: 20,
  autoSwitchToEquation: false,
  uiScale: 100,
  mathScale: 100,
  resultScale: 100,
  highContrast: false,
  symbolicDisplayMode: 'auto',
  flattenNestedRootsWhenSafe: true,
  approxDigits: 6,
  numericNotationMode: 'decimal',
  scientificNotationStyle: 'times10',
  detailedFactsEnabled: false,
};

export const DEFAULT_MODE_TREE: MenuNode[] = [
  {
    id: 'calculate',
    label: 'Calculate',
    hotkey: 'Ctrl+1',
    children: [
      { id: 'simplify', label: 'Simplify', hotkey: 'F1' },
      { id: 'factor', label: 'Factor', hotkey: 'F2' },
      { id: 'expand', label: 'Expand', hotkey: 'F3' },
      { id: 'algebra', label: 'Algebra', hotkey: 'F4' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ],
  },
  {
    id: 'equation',
    label: 'Equation',
    hotkey: 'Ctrl+2',
    children: [
      { id: 'solve', label: 'Solve', hotkey: 'F1' },
      { id: 'symbolic', label: 'Symbolic', hotkey: 'F2' },
      { id: 'linear2', label: '2x2', hotkey: 'F3' },
      { id: 'linear3', label: '3x3', hotkey: 'F4' },
      { id: 'clear', label: 'Clear', hotkey: 'F5' },
      { id: 'history', label: 'History', hotkey: 'F6' },
    ],
  },
  {
    id: 'matrix',
    label: 'Matrix',
    hotkey: 'Ctrl+3',
    children: [
      { id: 'add', label: 'A+B', hotkey: 'F1' },
      { id: 'subtract', label: 'A-B', hotkey: 'F2' },
      { id: 'multiply', label: 'A�B', hotkey: 'F3' },
      { id: 'detA', label: 'det(A)', hotkey: 'F4' },
      { id: 'inverseA', label: 'A?�', hotkey: 'F5' },
      { id: 'transposeA', label: 'A?', hotkey: 'F6' },
    ],
  },
  {
    id: 'vector',
    label: 'Vector',
    hotkey: 'Ctrl+4',
    children: [
      { id: 'dot', label: 'u.v', hotkey: 'F1' },
      { id: 'cross', label: 'u x v', hotkey: 'F2' },
      { id: 'normA', label: 'norm(u)', hotkey: 'F3' },
      { id: 'angle', label: 'angle(u,v)', hotkey: 'F4' },
      { id: 'add', label: 'u+v', hotkey: 'F5' },
      { id: 'subtract', label: 'u-v', hotkey: 'F6' },
    ],
  },
  {
    id: 'table',
    label: 'Table',
    hotkey: 'Ctrl+5',
    children: [
      { id: 'build', label: 'Build', hotkey: 'F1' },
      { id: 'toggleSecondary', label: 'g(x)', hotkey: 'F2' },
      { id: 'clear', label: 'Clear', hotkey: 'F3' },
      { id: 'history', label: 'History', hotkey: 'F4' },
    ],
  },
  {
    id: 'guide',
    label: 'Guide',
    hotkey: 'Ctrl+6',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'search', label: 'Search', hotkey: 'F2' },
      { id: 'symbols', label: 'Symbols', hotkey: 'F3' },
      { id: 'modes', label: 'Modes', hotkey: 'F4' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus',
    hotkey: 'Ctrl+8',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
  {
    id: 'trigonometry',
    label: 'Trigonometry',
    hotkey: 'Ctrl+9',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
  {
    id: 'statistics',
    label: 'Statistics',
    hotkey: 'Ctrl+Shift+1',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
  {
    id: 'geometry',
    label: 'Geometry',
    hotkey: 'Ctrl+Shift+2',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
  {
    id: 'labs',
    label: 'Labs',
    hotkey: 'Dev flag',
    children: [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ],
  },
];

export const DEFAULT_LAUNCHER_CATEGORIES: LauncherCategory[] = [
  {
    id: 'core',
    label: 'Core',
    description: 'Core calculator, equation, and table workflows',
    hotkey: '1',
    entries: [
      {
        id: 'calculate',
        label: 'Calculate',
        description: 'Exact and numeric textbook calculations',
        hotkey: '1',
        launch: { mode: 'calculate', calculateScreen: 'standard' },
      },
      {
        id: 'equation',
        label: 'Equation',
        description: 'Symbolic, polynomial, and simultaneous systems',
        hotkey: '2',
        launch: { mode: 'equation', equationScreen: 'home' },
      },
      {
        id: 'table',
        label: 'Table',
        description: 'Function tables over a range',
        hotkey: '3',
        launch: { mode: 'table' },
      },
    ],
  },
  {
    id: 'linear',
    label: 'Linear',
    description: 'Matrix and vector workflows',
    hotkey: '2',
    entries: [
      {
        id: 'matrix',
        label: 'Matrix',
        description: 'Matrix operations and transforms',
        hotkey: '1',
        launch: { mode: 'matrix' },
      },
      {
        id: 'vector',
        label: 'Vector',
        description: 'Vector operations and angles',
        hotkey: '2',
        launch: { mode: 'vector' },
      },
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus',
    description: 'Guided calculus workflows',
    hotkey: '3',
    entries: [
      {
        id: 'calculus',
        label: 'Calculus',
        description: 'Derivatives, integrals, limits, series, differential equations, and partials',
        hotkey: '1',
        launch: { mode: 'calculus', calculusScreen: 'home' },
      },
    ],
  },
  {
    id: 'shapeMath',
    label: 'Shape Math',
    description: 'Trig and geometry workflows',
    hotkey: '4',
    entries: [
      {
        id: 'trigonometry',
        label: 'Trigonometry',
        description: 'Identities, triangles, angle conversion, and unit-circle reference',
        hotkey: '1',
        launch: { mode: 'trigonometry', trigScreen: 'home' },
      },
      {
        id: 'geometry',
        label: 'Geometry',
        description: 'Formula-first shapes, circles, triangles, and coordinate tools',
        hotkey: '2',
        launch: { mode: 'geometry', geometryScreen: 'home' },
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    description: 'Dataset and probability workflows',
    hotkey: '5',
    entries: [
      {
        id: 'statistics',
        label: 'Statistics',
        description: 'Dataset entry, descriptive statistics, probability, inference, and regression basics',
        hotkey: '1',
        launch: { mode: 'statistics', statisticsScreen: 'home' },
      },
    ],
  },
];
