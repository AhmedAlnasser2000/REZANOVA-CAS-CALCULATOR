export type ModeId =
  | 'calculate'
  | 'equation'
  | 'matrix'
  | 'vector'
  | 'table'
  | 'guide'
  | 'advancedCalculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry';

export type LauncherCategoryId =
  | 'core'
  | 'linear'
  | 'calculus'
  | 'shapeMath'
  | 'data';

export type LauncherLeafId =
  | 'calculate'
  | 'equation'
  | 'matrix'
  | 'vector'
  | 'table'
  | 'calculus'
  | 'advancedCalculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry';

export type AngleUnit = 'deg' | 'rad' | 'grad';
export type OutputStyle = 'exact' | 'decimal' | 'both';
export type MathNotationDisplay = 'rendered' | 'plainText' | 'latex';
export type NumericNotationMode = 'decimal' | 'scientific' | 'auto';
export type ScientificNotationStyle = 'times10' | 'e';
export type PolynomialEquationView = 'quadratic' | 'cubic' | 'quartic';
export type SimultaneousEquationView = 'linear2' | 'linear3';

export type CalculateScreen =
  | 'standard'
  | 'calculusHome'
  | 'derivative'
  | 'derivativePoint'
  | 'integral'
  | 'limit';

export type AdvancedCalcScreen =
  | 'home'
  | 'integralsHome'
  | 'indefiniteIntegral'
  | 'definiteIntegral'
  | 'improperIntegral'
  | 'limitsHome'
  | 'finiteLimit'
  | 'infiniteLimit'
  | 'seriesHome'
  | 'maclaurin'
  | 'taylor'
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
