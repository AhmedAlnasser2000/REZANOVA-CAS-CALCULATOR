import type {
  AngleConvertState,
  ArcSectorState,
  BinomialState,
  CalculateScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  CalculusInfiniteLimitState,
  CalculusLimitState,
  CalculusScreen,
  CircleState,
  ConeState,
  CoreDraftState,
  CorrelationState,
  CosineRuleState,
  CubeState,
  CuboidState,
  CylinderState,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  DistanceState,
  FirstOrderOdeState,
  FrequencyTable,
  GeometryScreen,
  IntegralWorkbenchState,
  ImplicitDerivativeState,
  LaplaceTransformState,
  LimitWorkbenchState,
  LineEquationState,
  MeanInferenceState,
  MidpointState,
  NormalState,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  PoissonState,
  RectangleState,
  RegressionState,
  RightTriangleState,
  SecondOrderOdeState,
  SeriesState,
  SineRuleState,
  SlopeState,
  SphereState,
  SquareState,
  StatisticsScreen,
  StatisticsSourceSyncState,
  StatisticsWorkingSource,
  StatsDataset,
  TableResponse,
  TrigEquationState,
  TrigFunctionState,
  TrigIdentityState,
  TrigPeriodPhaseState,
  TrigScreen,
  TriangleAreaState,
  TriangleHeronState,
  VariableSubstitutionSnapshot,
  EquationScreen,
} from '../../types/calculator';
import type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/named-values';
import type {
  defaultEquationComplexRegionPanelState,
  defaultEquationNumericSolvePanelState,
} from '../logic/appUtils';

type CalculateReplayVariableSubstitutions = {
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type CalculateSurfaceState = {
  calculateLatex: string;
  calculateScreen: CalculateScreen;
  calculateAlgebraTrayOpen: boolean;
  calculateMenuSelection: number;
  calculateReplayVariableSubstitutions: CalculateReplayVariableSubstitutions;
  derivativeWorkbench: DerivativeWorkbenchState;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  integralWorkbench: IntegralWorkbenchState;
  limitWorkbench: LimitWorkbenchState;
};

export type EquationSurfaceState = {
  equationLatex: string;
  equationSolveTarget: string | null;
  equationScreen: EquationScreen;
  equationAlgebraTrayOpen: boolean;
  equationNumericSolvePanel: ReturnType<typeof defaultEquationNumericSolvePanelState>;
  equationComplexRegionPanel: ReturnType<typeof defaultEquationComplexRegionPanelState>;
  equationMenuSelection: {
    home: number;
    polynomialMenu: number;
    simultaneousMenu: number;
  };
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
};

export type CalculusMenuSelectionState = {
  home: number;
  derivativesHome: number;
  integralsHome: number;
  limitsHome: number;
  seriesHome: number;
  partialsHome: number;
  odeHome: number;
};

export type CalculusSurfaceState = {
  calculusScreen: CalculusScreen;
  calculusMenuSelection: CalculusMenuSelectionState;
  derivativeWorkbench: DerivativeWorkbenchState;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  implicitDerivativeState: ImplicitDerivativeState;
  calculusIndefiniteIntegral: CalculusIndefiniteIntegralState;
  calculusDefiniteIntegral: CalculusDefiniteIntegralState;
  calculusImproperIntegral: CalculusImproperIntegralState;
  calculusFiniteLimit: CalculusFiniteLimitState;
  calculusInfiniteLimit: CalculusInfiniteLimitState;
  calculusLimit: CalculusLimitState;
  maclaurinState: SeriesState;
  taylorState: SeriesState;
  laplaceState: LaplaceTransformState;
  partialDerivativeState: PartialDerivativeWorkbenchState;
  firstOrderOdeState: FirstOrderOdeState;
  secondOrderOdeState: SecondOrderOdeState;
  numericIvpState: NumericIvpState;
};

export type TrigonometrySurfaceState = {
  trigScreen: TrigScreen;
  trigMenuSelection: {
    home: number;
    identitiesHome: number;
    equationsHome: number;
    trianglesHome: number;
  };
  trigFunctionState: TrigFunctionState;
  trigIdentityState: TrigIdentityState;
  trigEquationState: TrigEquationState;
  rightTriangleState: RightTriangleState;
  sineRuleState: SineRuleState;
  cosineRuleState: CosineRuleState;
  angleConvertState: AngleConvertState;
  periodPhaseState: TrigPeriodPhaseState;
  specialAnglesExpression: string;
  trigDraftState: CoreDraftState;
};

export type StatisticsSurfaceState = {
  statisticsScreen: StatisticsScreen;
  statisticsMenuSelection: {
    home: number;
    probabilityHome: number;
    inferenceHome: number;
  };
  statisticsWorkingSource: StatisticsWorkingSource;
  statisticsSourceSyncState: StatisticsSourceSyncState;
  statsDataset: StatsDataset;
  frequencyTable: FrequencyTable;
  binomialState: BinomialState;
  normalState: NormalState;
  poissonState: PoissonState;
  meanInferenceState: MeanInferenceState;
  regressionState: RegressionState;
  correlationState: CorrelationState;
  statisticsDraftState: CoreDraftState;
};

export type GeometrySurfaceState = {
  geometryScreen: GeometryScreen;
  geometryMenuSelection: {
    home: number;
    shapes2dHome: number;
    shapes3dHome: number;
    triangleHome: number;
    circleHome: number;
    coordinateHome: number;
  };
  triangleAreaState: TriangleAreaState;
  triangleHeronState: TriangleHeronState;
  rectangleState: RectangleState;
  squareState: SquareState;
  circleState: CircleState;
  arcSectorState: ArcSectorState;
  cubeState: CubeState;
  cuboidState: CuboidState;
  cylinderState: CylinderState;
  coneState: ConeState;
  sphereState: SphereState;
  distanceState: DistanceState;
  midpointState: MidpointState;
  slopeState: SlopeState;
  lineEquationState: LineEquationState;
  geometryDraftState: CoreDraftState;
};

export type TableSurfaceState = {
  tablePrimaryLatex: string;
  tableSecondaryLatex: string;
  tableSecondaryEnabled: boolean;
  tableStart: number;
  tableEnd: number;
  tableStep: number;
  tableResponse: TableResponse | null;
};

export type MatrixSurfaceState = {
  matrixA: number[][];
  matrixB: number[][];
  matrixValues?: LinearAlgebraMatrixNamedValue[];
  activeMatrixLeftId?: string;
  activeMatrixRightId?: string;
  matrixEditorLatex: string;
};

export type VectorSurfaceState = {
  vectorA: number[];
  vectorB: number[];
  vectorValues?: LinearAlgebraVectorNamedValue[];
  activeVectorLeftId?: string;
  activeVectorRightId?: string;
  vectorEditorLatex: string;
};
