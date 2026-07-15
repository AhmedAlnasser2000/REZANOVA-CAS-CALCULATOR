import type {
  AngleUnit,
  CalculateAction,
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  EquationScreen,
  OutputStyle,
  ResultOrigin,
} from '../../types/calculator';
import type { RunCalculusModeRequest } from '../modes/calculus';
import type { RunGeometryRuntimeRequest } from '../geometry/runtime-input';
import type { RunMatrixModeRequest } from '../modes/matrix';
import type { RunStatisticsRuntimeRequest } from '../statistics/runtime-input';
import type { RunTableModeRequest } from '../modes/table';
import type { RunTrigonometryRuntimeRequest } from '../trigonometry/runtime-input';
import type { RunVectorModeRequest } from '../modes/vector';

type GoldenBase = {
  id: string;
  lane: string;
  expected: GoldenExpectation;
  knownLimitationNote?: string;
};

export type GoldenCalculateCase = GoldenBase & {
  mode: 'calculate';
  action: CalculateAction;
  latex: string;
  angleUnit?: AngleUnit;
  outputStyle?: OutputStyle;
};

export type GoldenEquationCase = GoldenBase & {
  mode: 'equation';
  equationScreen?: EquationScreen;
  equationLatex: string;
};

export type GoldenCalculusCase = GoldenBase & {
  mode: 'calculus';
  request: RunCalculusModeRequest;
};

export type GoldenTrigonometryCase = GoldenBase & {
  mode: 'trigonometry';
  request: RunTrigonometryRuntimeRequest;
};

export type GoldenGeometryCase = GoldenBase & {
  mode: 'geometry';
  request: RunGeometryRuntimeRequest;
};

export type GoldenStatisticsCase = GoldenBase & {
  mode: 'statistics';
  request: RunStatisticsRuntimeRequest;
};

export type GoldenMatrixCase = GoldenBase & {
  mode: 'matrix';
  request: RunMatrixModeRequest;
};

export type GoldenVectorCase = GoldenBase & {
  mode: 'vector';
  request: RunVectorModeRequest;
};

export type GoldenTableCase = GoldenBase & {
  mode: 'table';
  request: RunTableModeRequest;
};

export type GoldenCase =
  | GoldenCalculateCase
  | GoldenEquationCase
  | GoldenCalculusCase
  | GoldenTrigonometryCase
  | GoldenGeometryCase
  | GoldenStatisticsCase
  | GoldenMatrixCase
  | GoldenVectorCase
  | GoldenTableCase;

export type GoldenExpectation = {
  kind: 'success' | 'error' | 'prompt';
  title?: string;
  exactEquals?: string;
  exactIncludes?: string[];
  answerRowsInclude?: string[];
  branchIncludes?: string[];
  periodicBranchesInclude?: string[];
  approxIncludes?: string[];
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  derivativeStrategiesInclude?: CalculusDerivativeStrategy[];
  detailTitlesInclude?: string[];
  errorIncludes?: string;
  warningIncludes?: string[];
  supplementIncludes?: string[];
  solveBadgesInclude?: string[];
  plannerBadgesInclude?: string[];
  actionLatexIncludes?: string[];
  detailLinesInclude?: string[];
  tableRows?: Array<{
    index: number;
    x: string;
    primary: string;
    secondary?: string;
  }>;
  rejectedCandidateCount?: number;
  runtimeStopReasonKind?: string;
};

const CALCULUS_REQUEST: RunCalculusModeRequest = {
  screen: 'finiteLimit',
  indefiniteIntegral: { bodyLatex: '' },
  definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
  improperIntegral: {
    bodyLatex: '',
    lowerKind: 'finite',
    lower: '0',
    upperKind: 'posInfinity',
    upper: '',
  },
  finiteLimit: { bodyLatex: '', target: '0', direction: 'two-sided' },
  infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' },
  limit: { requestLatex: '' },
  maclaurin: { bodyLatex: '', kind: 'maclaurin', center: '0', order: 3 },
  taylor: { bodyLatex: '', kind: 'taylor', center: '0', order: 3 },
  laplace: { bodyLatex: '' },
  partialDerivative: { bodyLatex: '', variable: 'x' },
  firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' },
  secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
  numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' },
  angleUnit: 'rad',
  outputStyle: 'both',
  ansLatex: '0',
};

export const goldenCases: GoldenCase[] = [
  {
    id: 'calculate-arithmetic-basic',
    lane: 'calculate',
    mode: 'calculate',
    action: 'evaluate',
    latex: '2+2',
    expected: {
      kind: 'success',
      title: 'Numeric',
      exactEquals: '4',
    },
  },
  {
    id: 'calculate-simplify-zero-polynomial-difference',
    lane: 'calculate',
    mode: 'calculate',
    action: 'simplify',
    latex: '(x+1)^2-(x^2+2x+1)',
    expected: {
      kind: 'success',
      title: 'Simplify',
      exactEquals: '0',
    },
  },
  {
    id: 'calculate-factor-perfect-square',
    lane: 'calculate',
    mode: 'calculate',
    action: 'factor',
    latex: 'x^2+2x+1',
    expected: {
      kind: 'success',
      title: 'Factor',
      exactIncludes: ['x+1'],
    },
  },
  {
    id: 'calculate-expand-affine-square',
    lane: 'calculate',
    mode: 'calculate',
    action: 'expand',
    latex: '\\left(x+1\\right)^2',
    expected: {
      kind: 'success',
      title: 'Expand',
      exactIncludes: ['x^2', '2x', '1'],
    },
  },
  {
    id: 'calculus-derivative-function-power',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\sin^2\\left(\\cos^3\\left(x\\right)\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\sin(x)', '\\cos(x)^2'],
      derivativeStrategiesInclude: ['function-power', 'chain-rule'],
    },
  },
  {
    id: 'calculus-derivative-general-power',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\left(\\cos^{2x}\\left(x\\right)\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\ln', '\\cos'],
      derivativeStrategiesInclude: ['function-power', 'general-power'],
    },
  },
  {
    id: 'calculus-derivative-known-inverse-trig',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\arcsin\\left(x\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\sqrt'],
      derivativeStrategiesInclude: ['inverse-trig'],
    },
  },
  {
    id: 'calculus-integral-inverse-trig',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{1}{1+x^2}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\arctan'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'inverse-trig',
    },
  },
  {
    id: 'calculus-integral-partial-fractions',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{1}{x^2-1}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\ln', 'x-1', 'x+1'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'partial-fractions',
    },
  },
  {
    id: 'calculus-integral-repeated-linear-partial-fractions',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{1}{(x-1)^2}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['x-1'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'partial-fractions',
    },
  },
  {
    id: 'calculus-integral-quadratic-partial-fractions',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{x+1}{x^2+1}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\ln', '\\arctan'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'partial-fractions',
    },
  },
  {
    id: 'calculus-integral-u-substitution-log',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int 2x\\ln\\left(x^2+1\\right)\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\ln'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'u-substitution',
    },
  },
  {
    id: 'calculus-definite-integral-exact',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_0^1 2x\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Integral Method', 'Interval Safety'],
    },
  },
  {
    id: 'calculus-definite-integral-numeric-fallback',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_0^1 \\sin\\left(x^2\\right)\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      resultOrigin: 'numeric-fallback',
      warningIncludes: ['Symbolic integral unavailable'],
      detailTitlesInclude: ['Integral Method', 'Interval Safety'],
    },
  },
  {
    id: 'calculus-definite-integral-unsafe-stop',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_{-1}^{1}\\frac{1}{x}\\,dx',
    expected: {
      kind: 'error',
      title: 'Integral',
      errorIncludes: 'outside the real domain',
      detailTitlesInclude: ['Interval Safety'],
    },
  },
  {
    id: 'limit-known-form-sin-over-x',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0} \\frac{\\sin\\left(x\\right)}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-directional-positive-pole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^+}\\frac{1}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '\\infty',
      resultOrigin: 'rule-based-symbolic',
    },
  },
  {
    id: 'limit-directional-negative-pole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^-}\\frac{1}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '-\\infty',
      resultOrigin: 'rule-based-symbolic',
    },
  },
  {
    id: 'limit-removable-rational-hole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 1}\\frac{x^2-1}{x-1}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '2',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-local-equivalent-product',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0}\\frac{\\ln\\left(1+x\\right)\\sin\\left(x\\right)}{x^2}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-one-sided-real-domain-stop',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^-}\\sqrt{x}',
    expected: {
      kind: 'error',
      title: 'Limit',
      errorIncludes: 'outside the real domain',
    },
  },
  {
    id: 'equation-linear-symbolic',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '5x+6=3',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['x=', '\\frac'],
      approxIncludes: ['x \\approx'],
      resultOrigin: 'symbolic',
    },
  },
  {
    id: 'equation-guided-quadratic-symbolic',
    lane: 'equation',
    mode: 'equation',
    equationScreen: 'quadratic',
    equationLatex: '',
    expected: {
      kind: 'success',
      title: 'Quadratic',
      exactIncludes: ['x\\in', '2', '3'],
      resultOrigin: 'symbolic',
    },
  },
  {
    id: 'equation-rational-exclusion',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\frac{1}{3}+\\frac{1}{6x}=1',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['\\frac{1}{4}'],
      supplementIncludes: ['x\\ne0'],
    },
  },
  {
    id: 'equation-radical-candidate-rejection',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\sqrt{x+1}=x-1',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactEquals: 'x=3',
      rejectedCandidateCount: 1,
    },
  },
  {
    id: 'equation-absolute-value-bounded',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\left|x^2+x-2\\right|=3',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['\\sqrt{21}'],
    },
  },
  {
    id: 'equation-range-impossibility-stop',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\sin\\left(x\\right)=2',
    expected: {
      kind: 'error',
      title: 'Solve',
      runtimeStopReasonKind: 'range-guard',
    },
  },
  {
    id: 'calculate-arcsin-one-deg',
    lane: 'calculate-inverse-trig',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\arcsin\\left(1\\right)',
    angleUnit: 'deg',
    outputStyle: 'exact',
    expected: {
      kind: 'success',
      exactEquals: '90',
      resultOrigin: 'exact-special-angle',
    },
  },
  {
    id: 'calculate-arcsin-one-rad',
    lane: 'calculate-inverse-trig',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\arcsin\\left(1\\right)',
    angleUnit: 'rad',
    outputStyle: 'exact',
    expected: {
      kind: 'success',
      exactEquals: '\\frac{\\pi}{2}',
      resultOrigin: 'exact-special-angle',
    },
  },
  {
    id: 'calculus-left-pole-limit',
    lane: 'calculus-limits',
    mode: 'calculus',
    request: {
      ...CALCULUS_REQUEST,
      screen: 'finiteLimit',
      finiteLimit: { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'left' },
    },
    expected: {
      kind: 'success',
      title: 'Finite Limit',
      exactEquals: '-\\infty',
      resultOrigin: 'rule-based-symbolic',
    },
  },
  {
    id: 'calculus-improper-arctan-integral',
    lane: 'calculus-integrals',
    mode: 'calculus',
    request: {
      ...CALCULUS_REQUEST,
      screen: 'improperIntegral',
      improperIntegral: {
        bodyLatex: '\\frac{1}{1+x^2}',
        lowerKind: 'finite',
        lower: '0',
        upperKind: 'posInfinity',
        upper: '',
      },
    },
    expected: {
      kind: 'success',
      title: 'Improper Integral',
      exactEquals: '1.570796',
      approxIncludes: ['1.570'],
      resultOrigin: 'numeric-fallback',
    },
  },
  {
    id: 'trigonometry-period-phase-rad',
    lane: 'trigonometry-period-phase',
    mode: 'trigonometry',
    request: {
      inputLatex: '2\\sin\\left(3x-\\pi\\right)+1',
      screenHint: 'periodPhase',
      angleUnit: 'rad',
    },
    expected: {
      kind: 'success',
      exactIncludes: ['P=\\frac{2\\pi}{3}', 'h=\\frac{\\pi}{3}'],
      detailTitlesInclude: ['Wave Facts', 'First Cycle Landmarks'],
    },
  },
  {
    id: 'trigonometry-periodic-sine-equation',
    lane: 'trigonometry-equations',
    mode: 'trigonometry',
    request: {
      inputLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    },
    expected: {
      kind: 'success',
      exactIncludes: ['\\arcsin(\\frac{1}{2})', '360n'],
    },
  },
  {
    id: 'geometry-distance-solve-missing-branches',
    lane: 'geometry-coordinate',
    mode: 'geometry',
    request: {
      inputLatex: 'distance(p1=(0,0), p2=(3,?), distance=5)',
      screenHint: 'distance',
    },
    expected: {
      kind: 'success',
      branchIncludes: ['4', '-4'],
      warningIncludes: ['Two real coordinate branches'],
    },
  },
  {
    id: 'geometry-line-equation-transfer',
    lane: 'geometry-coordinate',
    mode: 'geometry',
    request: {
      inputLatex: 'lineEquation(p1=(1,2), p2=(3,6), form=standard)',
      screenHint: 'lineEquation',
    },
    expected: {
      kind: 'success',
      actionLatexIncludes: ['x', 'y'],
    },
  },
  {
    id: 'statistics-two-point-regression-warning',
    lane: 'statistics-relationships',
    mode: 'statistics',
    request: {
      inputLatex: 'regression(points={(1,2),(2,5)})',
      screenHint: 'regression',
      workingSourceHint: 'dataset',
    },
    expected: {
      kind: 'success',
      exactIncludes: ['y_{\\mathrm{fit}}'],
      warningIncludes: ['small sample', 'at least 3 points'],
      detailTitlesInclude: ['Quality Summary'],
    },
  },
  {
    id: 'statistics-mean-confidence-interval',
    lane: 'statistics-inference',
    mode: 'statistics',
    request: {
      inputLatex: 'meanInference(values={12,15,15,18,20}, mode=ci, level=0.95)',
      screenHint: 'meanInference',
      workingSourceHint: 'dataset',
    },
    expected: {
      kind: 'success',
      approxIncludes: ['CI'],
    },
  },
  {
    id: 'matrix-profile-singular-square',
    lane: 'matrix-profile',
    mode: 'matrix',
    request: {
      operation: 'profileA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1, 0], [0, 1]],
    },
    expected: {
      kind: 'success',
      answerRowsInclude: ['\\operatorname{rank}(A)=1', '\\operatorname{nullity}(A)=1'],
      detailTitlesInclude: ['Kernel', 'Image', 'Invertibility', 'RREF Evidence'],
      detailLinesInclude: ['Determinant: 0', 'Invertible: no.'],
    },
  },
  {
    id: 'matrix-profile-tall-rectangular',
    lane: 'matrix-profile',
    mode: 'matrix',
    request: {
      operation: 'profileA',
      matrixA: [[1, 0], [0, 1], [0, 0]],
      matrixB: [[1, 0], [0, 1]],
      matrixOperandLatexA: 'T',
    },
    expected: {
      kind: 'success',
      answerRowsInclude: ['T:\\mathbb{R}^{2}\\to\\mathbb{R}^{3}', '\\operatorname{rank}(T)=2'],
      detailLinesInclude: [
        'One-to-one: yes.',
        'Onto: no.',
        'Invertibility is not applicable to rectangular matrices.',
      ],
    },
  },
  {
    id: 'matrix-definiteness-positive',
    lane: 'matrix-definiteness',
    mode: 'matrix',
    request: {
      operation: 'definiteA',
      matrixA: [[2, -1], [-1, 2]],
      matrixB: [[1, 0], [0, 1]],
    },
    expected: {
      kind: 'success',
      exactEquals: '\\operatorname{definite}(A)=\\text{Positive definite}',
      detailTitlesInclude: ['Exact Principal-Minor Evidence', 'Classification Criterion'],
      detailLinesInclude: ['All 3 nonempty principal minors were evaluated exactly.'],
    },
  },
  {
    id: 'matrix-pseudoinverse-rank-one',
    lane: 'matrix-numeric-decomposition',
    mode: 'matrix',
    request: {
      operation: 'pinvA',
      matrixA: [[3, 0], [4, 0]],
      matrixB: [[1, 0], [0, 1]],
      approxDigits: 6,
    },
    expected: {
      kind: 'success',
      exactEquals: '\\operatorname{pinv}\\left(A\\right)\\approx \\begin{bmatrix}0.12 & 0.16\\\\0 & 0\\end{bmatrix}',
      detailTitlesInclude: ['SVD Diagnostics', 'Pseudoinverse Check'],
      detailLinesInclude: ['Moore-Penrose reconstruction relation: A\\cdot\\operatorname{pinv}\\left(A\\right)\\cdot A\\approx A'],
      warningIncludes: ['SVD, pseudoinverse, condition number, and numerical rank are approximate; inspect the displayed threshold.'],
    },
  },
  {
    id: 'vector-dependent-independence-relation',
    lane: 'vector-foundations',
    mode: 'vector',
    request: {
      operation: 'independent',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorOperands: [[1, 0], [0, 1], [1, 1]],
      exactVectorOperands: [
        [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
      ],
      vectorOperandLatexList: ['p', 'q', 'r'],
      angleUnit: 'rad',
    },
    expected: {
      kind: 'success',
      exactIncludes: ['\\text{No}'],
      detailTitlesInclude: ['Span Facts', 'Dependence Relation', 'RREF Evidence'],
      detailLinesInclude: ['p+q-r=0', 'r=p+q'],
    },
  },
  {
    id: 'vector-exact-gram-schmidt',
    lane: 'vector-orthogonalization',
    mode: 'vector',
    request: {
      operation: 'gramSchmidtUV',
      vectorA: [1, 0],
      vectorB: [1, 1],
      angleUnit: 'rad',
    },
    expected: {
      kind: 'success',
      exactIncludes: ['\\operatorname{orthogonal\\ basis}'],
      detailTitlesInclude: ['Orthonormal Basis', 'Gram-Schmidt Proof'],
    },
  },
  {
    id: 'vector-geometric-measures',
    lane: 'vector-geometry',
    mode: 'vector',
    request: {
      operation: 'parallelogramArea',
      vectorA: [1, 0, 0],
      vectorB: [0, 2, 0],
      vectorOperandLatexA: 'p',
      vectorOperandLatexB: 'q',
      angleUnit: 'rad',
    },
    expected: {
      kind: 'success',
      exactEquals: '2',
      detailTitlesInclude: ['Measure Evidence', '3D Geometry'],
      detailLinesInclude: ['The cross product gives the right-hand-rule oriented normal.'],
    },
  },
  {
    id: 'table-partial-real-domain',
    lane: 'table-domain',
    mode: 'table',
    request: {
      primaryLatex: '\\sqrt{x}',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    },
    expected: {
      kind: 'success',
      warningIncludes: ['outside the real domain'],
      detailTitlesInclude: ['Domain Facts', 'Interval Safety'],
      tableRows: [
        { index: 0, x: '-1', primary: 'undefined' },
        { index: 1, x: '0', primary: '0' },
        { index: 2, x: '1', primary: '1' },
      ],
    },
  },
  {
    id: 'table-two-function-grid',
    lane: 'table-functions',
    mode: 'table',
    request: {
      primaryLatex: 'x^2',
      secondaryLatex: 'x+1',
      secondaryEnabled: true,
      start: 0,
      end: 2,
      step: 1,
    },
    expected: {
      kind: 'success',
      exactIncludes: ['f(x)=x^2', 'g(x)=x+1'],
      tableRows: [
        { index: 0, x: '0', primary: '0', secondary: '1' },
        { index: 1, x: '1', primary: '1', secondary: '2' },
        { index: 2, x: '2', primary: '4', secondary: '3' },
      ],
    },
  },
];
