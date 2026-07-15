export type ModeId =
  | 'calculate'
  | 'equation'
  | 'matrix'
  | 'vector'
  | 'table'
  | 'guide'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'labs';

export type LauncherCategoryId =
  | 'core'
  | 'linear'
  | 'calculus'
  | 'shapeMath'
  | 'data'
  | 'labs';

export type LauncherLeafId =
  | 'calculate'
  | 'equation'
  | 'matrix'
  | 'vector'
  | 'table'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'labs';

export type AngleUnit = 'deg' | 'rad' | 'grad';
export type OutputStyle = 'exact' | 'decimal' | 'both';
export type EquationAnswerMode = 'exact' | 'isolate';
export type LegacyEquationAnswerMode = EquationAnswerMode | 'approximate';
export type EquationDomainIntent = 'real' | 'complex';
export type ComplexExactForm = 'rectangular' | 'polar' | 'cis';
export type AnswerDomain = 'real' | 'complex' | 'conditional-real' | 'unknown-domain';
export type SolutionKind =
  | 'exact-symbolic'
  | 'approximate-numeric'
  | 'isolate-formula'
  | 'inequality-solution-set'
  | 'condition-fact-only-stop';
export type MathNotationDisplay = 'rendered' | 'plainText' | 'latex';
export type NumericNotationMode = 'decimal' | 'scientific' | 'auto';
export type ScientificNotationStyle = 'times10' | 'e';
export type PolynomialEquationView = 'quadratic' | 'cubic' | 'quartic';
export type SimultaneousEquationView = 'linear2' | 'linear3' | 'polynomialSystem2';

export type CalculateScreen =
  | 'standard'
  | 'calculusHome'
  | 'derivativesHome'
  | 'derivative'
  | 'derivativePoint'
  | 'integral'
  | 'limit';

export type CalculusScreen =
  | 'home'
  | 'derivativesHome'
  | 'derivative'
  | 'derivativePoint'
  | 'implicitDerivative'
  | 'integralsHome'
  | 'indefiniteIntegral'
  | 'definiteIntegral'
  | 'improperIntegral'
  | 'limitsHome'
  | 'limit'
  | 'finiteLimit'
  | 'infiniteLimit'
  | 'seriesHome'
  | 'maclaurin'
  | 'taylor'
  | 'laplace'
  | 'partialsHome'
  | 'partialDerivative'
  | 'odeHome'
  | 'odeFirstOrder'
  | 'odeSecondOrder'
  | 'odeNumericIvp';

export type TrigScreen =
  | 'home'
  | 'functions'
  | 'identitiesHome'
  | 'identitySimplify'
  | 'identityConvert'
  | 'equationsHome'
  | 'equationSolve'
  | 'trianglesHome'
  | 'rightTriangle'
  | 'sineRule'
  | 'cosineRule'
  | 'angleConvert'
  | 'periodPhase'
  | 'specialAngles';

export type GeometryScreen =
  | 'home'
  | 'shapes2dHome'
  | 'shapes3dHome'
  | 'triangleHome'
  | 'circleHome'
  | 'coordinateHome'
  | 'triangleArea'
  | 'triangleHeron'
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'arcSector'
  | 'cube'
  | 'cuboid'
  | 'cylinder'
  | 'cone'
  | 'sphere'
  | 'distance'
  | 'midpoint'
  | 'slope'
  | 'lineEquation';

export type StatisticsScreen =
  | 'home'
  | 'dataEntry'
  | 'descriptive'
  | 'frequency'
  | 'probabilityHome'
  | 'inferenceHome'
  | 'binomial'
  | 'normal'
  | 'poisson'
  | 'meanInference'
  | 'regression'
  | 'correlation';

export type StatisticsSection =
  | 'dataSummary'
  | 'probability'
  | 'inference'
  | 'relationships';
export type StatisticsInputMode = 'guided' | 'expression';
export type StatisticsResultViewMode = 'contained' | 'full';
export type StatisticsQuartileMethod = 'halves' | 'linear';
export type StatisticsDataContext = 'compare' | 'sample' | 'population';
export type StatisticsProbabilityEvent =
  | 'exactly'
  | 'density'
  | 'lessThan'
  | 'atMost'
  | 'moreThan'
  | 'atLeast'
  | 'between';
export type StatisticsProbabilityEventState = {
  event: StatisticsProbabilityEvent;
  x: string;
  lower: string;
  upper: string;
  lowerBound: 'inclusive' | 'exclusive';
  upperBound: 'inclusive' | 'exclusive';
};
export type MeanTestAlternative = 'twoSided' | 'less' | 'greater';

export type EquationScreen =
  | 'home'
  | 'symbolic'
  | 'polynomialMenu'
  | PolynomialEquationView
  | 'simultaneousMenu'
  | SimultaneousEquationView;

export type IntegralKind = 'indefinite' | 'definite';
export type LimitDirection = 'two-sided' | 'left' | 'right';
export type LimitTargetKind = 'finite' | 'posInfinity' | 'negInfinity';
