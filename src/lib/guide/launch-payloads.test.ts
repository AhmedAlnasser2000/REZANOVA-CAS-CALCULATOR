import { describe, expect, it } from 'vitest';
import type { GuideExample, GuideExampleLaunch } from '../../types/calculator';
import { GUIDE_ARTICLES } from './content/selectors';

const LOAD_EXPRESSION_TARGETS = new Set([
  'calculate',
  'calculus',
  'equation',
  'geometry',
  'statistics',
  'table',
  'trigonometry',
]);

const OPEN_TOOL_TARGETS = new Set([
  'calculate',
  'calculus',
  'equation',
  'geometry',
  'matrix',
  'statistics',
  'table',
  'trigonometry',
  'vector',
]);

const CALCULATE_SCREENS = new Set([
  'standard',
  'calculusHome',
  'derivativesHome',
  'derivative',
  'derivativePoint',
  'integral',
  'limit',
]);

const CALCULUS_SCREENS = new Set([
  'home',
  'derivativesHome',
  'derivative',
  'derivativePoint',
  'implicitDerivative',
  'integralsHome',
  'indefiniteIntegral',
  'definiteIntegral',
  'improperIntegral',
  'limitsHome',
  'limit',
  'finiteLimit',
  'infiniteLimit',
  'seriesHome',
  'maclaurin',
  'taylor',
  'laplace',
  'partialsHome',
  'partialDerivative',
  'odeHome',
  'odeFirstOrder',
  'odeSecondOrder',
  'odeNumericIvp',
]);

const EQUATION_SCREENS = new Set([
  'home',
  'symbolic',
  'polynomialMenu',
  'linear',
  'quadratic',
  'cubic',
  'quartic',
  'simultaneousMenu',
  'simultaneous2x2',
  'simultaneous3x3',
]);

const TRIG_SCREENS = new Set([
  'home',
  'functions',
  'identitiesHome',
  'identitySimplify',
  'identityConvert',
  'equationsHome',
  'equationSolve',
  'trianglesHome',
  'rightTriangle',
  'sineRule',
  'cosineRule',
  'angleConvert',
  'periodPhase',
  'specialAngles',
]);

const STATISTICS_SCREENS = new Set([
  'home',
  'dataEntry',
  'descriptive',
  'frequency',
  'probabilityHome',
  'inferenceHome',
  'binomial',
  'normal',
  'poisson',
  'meanInference',
  'regression',
  'correlation',
]);

const GEOMETRY_SCREENS = new Set([
  'home',
  'shapes2dHome',
  'shapes3dHome',
  'triangleHome',
  'circleHome',
  'coordinateHome',
  'triangleArea',
  'triangleHeron',
  'rectangle',
  'square',
  'circle',
  'arcSector',
  'cube',
  'cuboid',
  'cylinder',
  'cone',
  'sphere',
  'distance',
  'midpoint',
  'slope',
  'lineEquation',
]);

function allGuideExamples() {
  return GUIDE_ARTICLES.flatMap((article) =>
    article.examples.map((example) => ({
      article,
      example,
      label: `${article.id}/${example.id}`,
    })));
}

function expectOptionalScreen(
  value: string | undefined,
  knownScreens: ReadonlySet<string>,
  label: string,
) {
  if (value === undefined) {
    return;
  }

  expect(knownScreens.has(value), `${label} uses unknown screen ${value}`).toBe(true);
}

function expectNoForeignScreens(launch: GuideExampleLaunch, allowed: string[], label: string) {
  const screenFields = [
    'calculateScreen',
    'calculusScreen',
    'equationScreen',
    'geometryScreen',
    'statisticsScreen',
    'trigScreen',
  ] as const;

  for (const field of screenFields) {
    if (allowed.includes(field)) {
      continue;
    }
    expect(launch[field], `${label} should not carry foreign ${field}`).toBeUndefined();
  }
}

function expectLaunchShape(example: GuideExample, label: string) {
  const { launch } = example;

  if (launch.kind === 'load-expression') {
    expect(LOAD_EXPRESSION_TARGETS.has(launch.targetMode), `${label} uses unsupported load target`).toBe(true);
    expect(launch.latex.trim().length, `${label} should load non-empty LaTeX`).toBeGreaterThan(0);
  } else {
    expect(OPEN_TOOL_TARGETS.has(launch.targetMode), `${label} uses unsupported open target`).toBe(true);
  }

  if (launch.targetMode === 'calculate') {
    expectOptionalScreen(launch.calculateScreen, CALCULATE_SCREENS, label);
    expectNoForeignScreens(launch, ['calculateScreen'], label);
  }

  if (launch.targetMode === 'calculus') {
    expectOptionalScreen(launch.calculusScreen, CALCULUS_SCREENS, label);
    expectNoForeignScreens(launch, ['calculusScreen'], label);
  }

  if (launch.targetMode === 'equation') {
    expectOptionalScreen(launch.equationScreen, EQUATION_SCREENS, label);
    expectNoForeignScreens(launch, ['equationScreen'], label);
  }

  if (launch.targetMode === 'trigonometry') {
    expectOptionalScreen(launch.trigScreen, TRIG_SCREENS, label);
    expectNoForeignScreens(launch, ['trigScreen'], label);
  }

  if (launch.targetMode === 'statistics') {
    expectOptionalScreen(launch.statisticsScreen, STATISTICS_SCREENS, label);
    expectNoForeignScreens(launch, ['statisticsScreen'], label);
  }

  if (launch.targetMode === 'geometry') {
    expectOptionalScreen(launch.geometryScreen, GEOMETRY_SCREENS, label);
    expectNoForeignScreens(launch, ['geometryScreen'], label);
  }

  if (launch.targetMode === 'matrix' || launch.targetMode === 'vector') {
    expect(launch.kind, `${label} should only open ${launch.targetMode}; row expressions are not supported there`)
      .toBe('open-tool');
    expectNoForeignScreens(launch, [], label);
  }

  if (launch.targetMode === 'table') {
    expectNoForeignScreens(launch, [], label);
  }
}

describe('Guide launch payloads', () => {
  it('keeps every Guide example launch payload within current workspace contracts', () => {
    for (const { example, label } of allGuideExamples()) {
      expectLaunchShape(example, label);
    }
  });

  it('keeps representative launch coverage for every Guide-visible workspace family', () => {
    const targets = new Set(allGuideExamples().map(({ example }) => example.launch.targetMode));

    expect(targets).toEqual(new Set([
      'calculate',
      'calculus',
      'equation',
      'geometry',
      'matrix',
      'statistics',
      'trigonometry',
      'vector',
    ]));
  });

  it('keeps action-bearing examples discoverable by stable article/example ids', () => {
    const stableExamples = new Set(allGuideExamples().map(({ label }) => label));

    [
      'basics-keyboard/basics-fraction',
      'algebra-equations/algebra-equation-param-linear',
      'calculus-derivatives/calc-derivative-function-power',
      'trig-period-phase/trig-period-phase-sine',
      'statistics-inference/statistics-inference-mean',
      'geometry-coordinate/geometry-distance',
      'linear-algebra-matrix-vector/linear-open-matrix',
      'linear-algebra-matrix-vector/linear-open-vector',
    ].forEach((label) => {
      expect(stableExamples.has(label), `${label} should remain available for capability evidence`).toBe(true);
    });
  });
});
