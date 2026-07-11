import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '../src/types/calculator';
import {
  historyReplayCardinalities,
  historyReplayIdentity,
  normalizedHistoryReplayLatex,
  type HistoryReplayFixture,
  type HistoryReplayFixtureFile,
  type HistoryReplayWorkspace,
} from '../src/lib/history-replay/fixture-contract';
import { executeHistoryReplayRequest } from '../src/lib/history-replay/native-execution';
import { buildHistoryReplaySnapshot } from '../src/lib/history-replay/replay-snapshot';

type FixtureSeed = {
  id: string;
  workspace: HistoryReplayWorkspace;
  family: string;
  request: Record<string, unknown>;
  settings?: Partial<Settings>;
  ansLatex?: string;
};

const equationBase = {
  equationScreen: 'symbolic',
  equationSolveTarget: null,
  equationAnswerMode: 'exact',
  equationDomainIntent: 'real',
  complexExactForm: 'rectangular',
  quadraticCoefficients: [1, -5, 6],
  cubicCoefficients: [1, -6, 11, -6],
  quarticCoefficients: [1, 0, -5, 0, 4],
  polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
  system2: [[1, 1, 3], [2, -1, 0]],
  system3: [[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 3]],
  angleUnit: 'deg',
  outputStyle: 'both',
  ansLatex: '0',
};

const calculusBase = {
  screen: 'finiteLimit',
  derivative: { bodyLatex: 'x^2', variable: 'x' },
  derivativePoint: { bodyLatex: 'x^2', point: '2', variable: 'x' },
  implicitDerivative: {
    relationLatex: 'x^2+y^2=1',
    independentVariable: 'x',
    dependentVariable: 'y',
  },
  indefiniteIntegral: { bodyLatex: 'x' },
  definiteIntegral: { bodyLatex: 'x', lower: '0', upper: '1' },
  improperIntegral: {
    bodyLatex: '\\frac{1}{1+x^2}',
    lowerKind: 'finite',
    lower: '0',
    upperKind: 'posInfinity',
    upper: '',
  },
  finiteLimit: { bodyLatex: '\\frac{\\sin(x)}{x}', target: '0', direction: 'two-sided' },
  infiniteLimit: { bodyLatex: '\\frac{1}{x}', targetKind: 'posInfinity' },
  limit: { requestLatex: '\\lim_{x\\to0}\\frac{\\sin(x)}{x}' },
  maclaurin: { bodyLatex: 'e^x', kind: 'maclaurin', center: '0', order: 4 },
  taylor: { bodyLatex: 'e^x', kind: 'taylor', center: '1', order: 3 },
  laplace: { bodyLatex: '1' },
  partialDerivative: { bodyLatex: 'x^2y+y^2', variable: 'x' },
  firstOrderOde: { lhsLatex: '\\frac{dy}{dx}', rhsLatex: 'xy', classification: 'separable' },
  secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
  numericIvp: { bodyLatex: 'y', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' },
  angleUnit: 'rad',
  outputStyle: 'both',
  equationDomainIntent: 'real',
  ansLatex: '0',
};

function calculateSeeds(): FixtureSeed[] {
  const rows: Array<[string, string, string, Partial<Record<string, unknown>>?]> = [
    ['arithmetic-add', 'arithmetic', '2+2'],
    ['arithmetic-fraction', 'arithmetic', '\\frac{1}{3}+\\frac{1}{6}'],
    ['exact-radical', 'exact-forms', '\\sqrt{12}'],
    ['exact-power', 'exact-forms', '2^10'],
    ['trig-sine-deg', 'trigonometry', '\\sin(30)'],
    ['trig-cosine-deg', 'trigonometry', '\\cos(60)'],
    ['trig-tangent-deg', 'trigonometry', '\\tan(45)'],
    ['inverse-sine-deg', 'inverse-trigonometry', '\\arcsin(1)'],
    ['inverse-sine-rad', 'inverse-trigonometry', '\\arcsin(1)', { angleUnit: 'rad', outputStyle: 'exact' }],
    ['inverse-cosine-rad', 'inverse-trigonometry', '\\arccos(0)', { angleUnit: 'rad', outputStyle: 'exact' }],
    ['inverse-tangent-grad', 'inverse-trigonometry', '\\arctan(1)', { angleUnit: 'grad', outputStyle: 'exact' }],
    ['simplify-like-terms', 'transforms', 'x+x', { action: 'simplify' }],
    ['simplify-identity', 'transforms', '(x+1)^2-(x^2+2x+1)', { action: 'simplify' }],
    ['factor-difference-squares', 'transforms', 'x^2-1', { action: 'factor' }],
    ['factor-perfect-square', 'transforms', 'x^2+2x+1', { action: 'factor' }],
    ['expand-square', 'transforms', '(x+1)^2', { action: 'expand' }],
    ['expand-product', 'transforms', '(x-2)(x+3)', { action: 'expand' }],
    ['ans-addition', 'ans', 'Ans+3', { ansLatex: '4' }],
    ['ans-product', 'ans', '2Ans', { ansLatex: '5' }],
    ['decimal-output', 'numeric-format', '\\frac{1}{7}', { outputStyle: 'decimal' }],
  ];
  return rows.map(([id, family, latex, overrides = {}]) => {
    const ansLatex = String(overrides.ansLatex ?? '0');
    const angleUnit = String(overrides.angleUnit ?? 'deg');
    const outputStyle = String(overrides.outputStyle ?? 'both');
    return {
      id: `calculate-${id}`,
      workspace: 'calculate',
      family,
      ansLatex,
      settings: { angleUnit: angleUnit as Settings['angleUnit'], outputStyle: outputStyle as Settings['outputStyle'] },
      request: {
        action: overrides.action ?? 'evaluate',
        latex,
        angleUnit,
        outputStyle,
        ansLatex,
      },
    };
  });
}

function equationSeeds(): FixtureSeed[] {
  const rows: Array<[string, string, string, Record<string, unknown>?]> = [
    ['linear-basic', 'linear', '2x+3=7'],
    ['linear-fraction', 'linear', '\\frac{x}{3}+2=5'],
    ['linear-parentheses', 'linear', '3(x-2)=9'],
    ['quadratic-factor', 'polynomial', 'x^2-5x+6=0'],
    ['quadratic-double-root', 'polynomial', 'x^2-2x+1=0'],
    ['quadratic-irrational', 'polynomial', 'x^2-2=0'],
    ['cubic-factor', 'polynomial', 'x^3-6x^2+11x-6=0'],
    ['quartic-biquadratic', 'polynomial', 'x^4-5x^2+4=0'],
    ['rational-simple', 'rational-radical', '\\frac{x+1}{x-1}=2'],
    ['rational-hole', 'rational-radical', '\\frac{x^2-1}{x-1}=2'],
    ['radical-square', 'rational-radical', '\\sqrt{x+1}=3'],
    ['radical-affine', 'rational-radical', '\\sqrt{2x+1}=5'],
    ['absolute-basic', 'absolute-value', '\\left|x-2\\right|=3'],
    ['trig-sine', 'trig-exp-log', '\\sin(x)=0'],
    ['trig-cosine', 'trig-exp-log', '\\cos(x)=1'],
    ['exponential-basic', 'trig-exp-log', '2^x=8'],
    ['exponential-substitution', 'trig-exp-log', 'e^{2x}-5e^x+6=0'],
    ['log-natural', 'trig-exp-log', '\\ln(x)=2'],
    ['log-combine', 'trig-exp-log', '\\ln(x)+\\ln(x+1)=2'],
    ['real-no-solution', 'domain-boundary', 'x^2+1=0'],
    ['complex-quadratic', 'domain-boundary', 'x^2+1=0', { equationDomainIntent: 'complex' }],
    ['denominator-exclusion', 'domain-boundary', '\\frac{1}{x}=0'],
    ['even-root-domain', 'domain-boundary', '\\sqrt{x}=-1'],
    ['isolate-mode', 'answer-mode', 'ax+b=0', { equationAnswerMode: 'isolate', equationSolveTarget: 'x' }],
    ['numeric-interval', 'numeric-boundary', '\\cos(x)=x', { numericInterval: { min: 0, max: 1 } }],
  ];
  return rows.map(([id, family, equationLatex, overrides = {}]) => ({
    id: `equation-${id}`,
    workspace: 'equation',
    family,
    settings: {
      equationAnswerMode: (overrides.equationAnswerMode ?? 'exact') as Settings['equationAnswerMode'],
      equationDomainIntent: (overrides.equationDomainIntent ?? 'real') as Settings['equationDomainIntent'],
    },
    request: { ...equationBase, equationLatex, ...overrides },
  }));
}

function calculusSeeds(): FixtureSeed[] {
  const rows: Array<[string, string, Record<string, unknown>]> = [
    ['derivative-polynomial', 'derivatives', { screen: 'derivative', derivative: { bodyLatex: 'x^3+2x', variable: 'x' } }],
    ['derivative-trig', 'derivatives', { screen: 'derivative', derivative: { bodyLatex: '\\sin(x)', variable: 'x' } }],
    ['derivative-exp', 'derivatives', { screen: 'derivative', derivative: { bodyLatex: 'e^x', variable: 'x' } }],
    ['derivative-at-point', 'derivatives', { screen: 'derivativePoint', derivativePoint: { bodyLatex: 'x^2', point: '3', variable: 'x' } }],
    ['implicit-circle', 'derivatives', { screen: 'implicitDerivative', implicitDerivative: { relationLatex: 'x^2+y^2=1', independentVariable: 'x', dependentVariable: 'y' } }],
    ['indefinite-power', 'integrals', { screen: 'indefiniteIntegral', indefiniteIntegral: { bodyLatex: 'x^2' } }],
    ['indefinite-trig', 'integrals', { screen: 'indefiniteIntegral', indefiniteIntegral: { bodyLatex: '\\sin(x)' } }],
    ['indefinite-log', 'integrals', { screen: 'indefiniteIntegral', indefiniteIntegral: { bodyLatex: '\\frac{1}{x}' } }],
    ['definite-polynomial', 'integrals', { screen: 'definiteIntegral', definiteIntegral: { bodyLatex: 'x^2', lower: '0', upper: '2' } }],
    ['definite-sine', 'integrals', { screen: 'definiteIntegral', definiteIntegral: { bodyLatex: '\\sin(x)', lower: '0', upper: '\\pi' } }],
    ['improper-arctan', 'integrals', { screen: 'improperIntegral' }],
    ['finite-sinc', 'limits', { screen: 'finiteLimit' }],
    ['finite-left-pole', 'limits', { screen: 'finiteLimit', finiteLimit: { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'left' } }],
    ['finite-right-pole', 'limits', { screen: 'finiteLimit', finiteLimit: { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'right' } }],
    ['infinite-reciprocal', 'limits', { screen: 'infiniteLimit' }],
    ['natural-limit', 'limits', { screen: 'limit' }],
    ['maclaurin-exp', 'series-transforms', { screen: 'maclaurin' }],
    ['maclaurin-sine', 'series-transforms', { screen: 'maclaurin', maclaurin: { bodyLatex: '\\sin(x)', kind: 'maclaurin', center: '0', order: 5 } }],
    ['taylor-exp', 'series-transforms', { screen: 'taylor' }],
    ['laplace-one', 'series-transforms', { screen: 'laplace' }],
    ['laplace-exp', 'series-transforms', { screen: 'laplace', laplace: { bodyLatex: 'e^{2t}' } }],
    ['partial-polynomial', 'partials', { screen: 'partialDerivative' }],
    ['ode-separable', 'ode-ivp', { screen: 'odeFirstOrder' }],
    ['ode-second-order', 'ode-ivp', { screen: 'odeSecondOrder' }],
    ['ode-numeric-ivp', 'ode-ivp', { screen: 'odeNumericIvp' }],
  ];
  return rows.map(([id, family, override]) => ({
    id: `calculus-${id}`,
    workspace: 'calculus',
    family,
    settings: { angleUnit: 'rad' },
    request: { ...calculusBase, ...override },
  }));
}

function smallWorkspaceSeeds(): FixtureSeed[] {
  return [
    ['matrix-add', 'matrix', 'matrix-arithmetic', { operation: 'add', matrixA: [[1, 2], [3, 4]], matrixB: [[4, 3], [2, 1]] }],
    ['matrix-determinant', 'matrix', 'determinant', { operation: 'detA', matrixA: [[1, 2], [3, 4]], matrixB: [[1, 0], [0, 1]] }],
    ['matrix-inverse', 'matrix', 'inverse', { operation: 'inverseA', matrixA: [[2, 1], [1, 1]], matrixB: [[1, 0], [0, 1]] }],
    ['matrix-rank', 'matrix', 'rank', { operation: 'rankA', matrixA: [[1, 2], [2, 4]], matrixB: [[1, 0], [0, 1]] }],
    ['matrix-linear-system', 'matrix', 'linear-system', { operation: 'linearSystem', matrixA: [[2, 1], [1, -1]], matrixB: [[1, 0], [0, 1]], systemRhs: [5, 1], systemForm: 'Ax=b' }],
    ['vector-dot', 'vector', 'dot-product', { operation: 'dot', vectorA: [1, 2, 3], vectorB: [4, 5, 6], angleUnit: 'rad' }],
    ['vector-cross', 'vector', 'cross-product', { operation: 'cross', vectorA: [1, 0, 0], vectorB: [0, 1, 0], angleUnit: 'rad' }],
    ['vector-norm', 'vector', 'norm', { operation: 'normA', vectorA: [3, 4], vectorB: [0, 1], angleUnit: 'rad' }],
    ['vector-angle', 'vector', 'angle', { operation: 'angle', vectorA: [1, 0], vectorB: [0, 1], angleUnit: 'deg' }],
    ['vector-gram-schmidt', 'vector', 'orthogonalization', { operation: 'gramSchmidtUV', vectorA: [1, 0], vectorB: [1, 1], angleUnit: 'rad' }],
    ['table-polynomial', 'table', 'single-function', { primaryLatex: 'x^2', secondaryLatex: '', secondaryEnabled: false, start: -2, end: 2, step: 1 }],
    ['table-two-functions', 'table', 'two-functions', { primaryLatex: 'x^2', secondaryLatex: 'x+1', secondaryEnabled: true, start: 0, end: 2, step: 1 }],
    ['table-partial-domain', 'table', 'domain-boundary', { primaryLatex: '\\sqrt{x}', secondaryLatex: '', secondaryEnabled: false, start: -1, end: 1, step: 1 }],
    ['table-reciprocal', 'table', 'rational-function', { primaryLatex: '\\frac{1}{x}', secondaryLatex: '', secondaryEnabled: false, start: -1, end: 1, step: 1 }],
    ['table-trigonometric', 'table', 'trigonometric-function', { primaryLatex: '\\sin(x)', secondaryLatex: '', secondaryEnabled: false, start: 0, end: 2, step: 1 }],
    ['trigonometry-function', 'trigonometry', 'function', { inputLatex: '\\sin(30)', screenHint: 'functions', angleUnit: 'deg' }],
    ['trigonometry-identity', 'trigonometry', 'identity', { inputLatex: '\\sin^2(x)+\\cos^2(x)', screenHint: 'identitySimplify', angleUnit: 'deg' }],
    ['trigonometry-equation', 'trigonometry', 'equation', { inputLatex: '\\sin(x)=\\frac{1}{2}', screenHint: 'equationSolve', angleUnit: 'deg' }],
    ['trigonometry-triangle', 'trigonometry', 'right-triangle', { inputLatex: 'rightTriangle(a=3, b=4)', screenHint: 'rightTriangle', angleUnit: 'deg' }],
    ['trigonometry-convert', 'trigonometry', 'angle-conversion', { inputLatex: 'angleConvert(value=30, from=deg, to=rad)', screenHint: 'angleConvert', angleUnit: 'deg' }],
    ['statistics-descriptive', 'statistics', 'descriptive', { inputLatex: 'descriptive(values={12,15,15,18,20})', screenHint: 'descriptive', workingSourceHint: 'dataset' }],
    ['statistics-frequency', 'statistics', 'frequency', { inputLatex: 'frequency(freq={1:2,2:3,4:1})', screenHint: 'frequency', workingSourceHint: 'frequencyTable' }],
    ['statistics-binomial', 'statistics', 'probability', { inputLatex: 'binomial(n=10,p=0.5,x=3,mode=pmf)', screenHint: 'binomial' }],
    ['statistics-regression', 'statistics', 'relationship', { inputLatex: 'regression(points={(1,2),(2,4),(3,6)})', screenHint: 'regression', workingSourceHint: 'dataset' }],
    ['statistics-mean-inference', 'statistics', 'inference', { inputLatex: 'meanInference(values={12,15,15,18,20}, mode=ci, level=0.95)', screenHint: 'meanInference', workingSourceHint: 'dataset' }],
    ['geometry-square', 'geometry', 'shape-2d', { inputLatex: 'square(side=5)', screenHint: 'square' }],
    ['geometry-distance', 'geometry', 'coordinate-distance', { inputLatex: 'distance(p1=(0,0), p2=(3,4))', screenHint: 'distance' }],
    ['geometry-circle', 'geometry', 'circle', { inputLatex: 'circle(radius=3)', screenHint: 'circle' }],
    ['geometry-triangle', 'geometry', 'triangle', { inputLatex: 'triangleHeron(a=5, b=6, c=7)', screenHint: 'triangleHeron' }],
    ['geometry-line', 'geometry', 'line-equation', { inputLatex: 'lineEquation(p1=(1,2), p2=(3,6), form=standard)', screenHint: 'lineEquation' }],
  ].map(([id, workspace, family, request]) => ({
    id: String(id),
    workspace: workspace as HistoryReplayWorkspace,
    family: String(family),
    request: request as Record<string, unknown>,
  }));
}

async function main() {
  const seeds = [
    ...calculateSeeds(),
    ...equationSeeds(),
    ...calculusSeeds(),
    ...smallWorkspaceSeeds(),
  ];
  if (seeds.length !== 100) {
    throw new Error(`Expected 100 History replay seeds, received ${seeds.length}.`);
  }

  const hardLatexFamilies = new Set(['calculus:limits']);
  const fixtures: HistoryReplayFixture[] = [];
  for (const seed of seeds) {
    const settings = { ...DEFAULT_SETTINGS, ...seed.settings };
    const execution = await executeHistoryReplayRequest(seed.workspace, seed.request);
    fixtures.push({
      id: seed.id,
      workspace: seed.workspace,
      family: seed.family,
      ...(hardLatexFamilies.has(`${seed.workspace}:${seed.family}`)
        ? { latexComparison: 'hard' as const }
        : {}),
      snapshot: buildHistoryReplaySnapshot(settings, seed.ansLatex ?? '0'),
      request: seed.request,
      expected: {
        identity: historyReplayIdentity(execution.outcome),
        cardinalities: historyReplayCardinalities(execution),
        normalizedLatex: normalizedHistoryReplayLatex(execution),
      },
    });
  }

  const outputDir = resolve('src/lib/history-replay/fixtures/v1');
  const hardLatexWorkspaces = new Set<HistoryReplayWorkspace>(['calculate', 'equation']);
  await mkdir(outputDir, { recursive: true });
  for (const workspace of new Set(fixtures.map((fixture) => fixture.workspace))) {
    const file: HistoryReplayFixtureFile = {
      version: 1,
      workspace,
      ...(hardLatexWorkspaces.has(workspace) ? { latexComparison: 'hard' as const } : {}),
      fixtures: fixtures.filter((fixture) => fixture.workspace === workspace),
    };
    await writeFile(
      resolve(outputDir, `${workspace}.json`),
      `${JSON.stringify(file, null, 2)}\n`,
      'utf8',
    );
  }
  process.stdout.write(`Wrote ${fixtures.length} History replay fixtures.\n`);
}

await main();
