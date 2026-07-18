import type {
  AngleUnit,
  LauncherLeafId,
  OutputStyle,
} from '../../src/types/calculator';

export type ComputationalWorkspaceId = Exclude<LauncherLeafId, 'labs'>;

export type CanarySettings = {
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
};

export type CanaryExpectation =
  | {
      surface: 'answer';
      rawLatexIncludes: readonly string[];
      visibleTextIncludes?: readonly string[];
    }
  | {
      surface: 'table';
      rows: readonly {
        index: number;
        textIncludes: readonly string[];
      }[];
    };

export type CanaryDriver =
  | { kind: 'calculate'; inputLatex: string }
  | { kind: 'equation'; inputLatex: string }
  | { kind: 'calculus'; tool: 'Derivative' | 'Integral'; inputLatex: string }
  | { kind: 'trigonometry'; path: readonly string[]; inputLatex: string }
  | { kind: 'geometry'; path: readonly string[]; inputLatex: string }
  | { kind: 'statistics'; path: readonly string[]; inputLatex: string }
  | { kind: 'matrix' | 'vector'; inputLatex: string }
  | {
      kind: 'table';
      inputLatex: string;
      range: { start: number; end: number; step: number };
    };

export type CanaryCase = {
  id: string;
  settings: CanarySettings;
  driver: CanaryDriver;
  expectation: CanaryExpectation;
};

export type WorkspaceCanary = {
  workspace: ComputationalWorkspaceId;
  label: string;
  cases: readonly CanaryCase[];
};

const EXACT_DEG: CanarySettings = { angleUnit: 'deg', outputStyle: 'exact' };
const EXACT_RAD: CanarySettings = { angleUnit: 'rad', outputStyle: 'exact' };
const BOTH_DEG: CanarySettings = { angleUnit: 'deg', outputStyle: 'both' };

export const WORKSPACE_CANARIES = [
  {
    workspace: 'calculate',
    label: 'Calculate',
    cases: [
      {
        id: 'calculate-arcsin-one-deg',
        settings: EXACT_DEG,
        driver: { kind: 'calculate', inputLatex: '\\arcsin\\left(1\\right)' },
        expectation: { surface: 'answer', rawLatexIncludes: ['90'] },
      },
      {
        id: 'calculate-arcsin-one-rad',
        settings: EXACT_RAD,
        driver: { kind: 'calculate', inputLatex: '\\arcsin\\left(1\\right)' },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\frac{\\pi}{2}'] },
      },
      {
        id: 'calculate-arithmetic-precedence',
        settings: EXACT_DEG,
        driver: { kind: 'calculate', inputLatex: '2+3\\cdot4' },
        expectation: { surface: 'answer', rawLatexIncludes: ['14'] },
      },
    ],
  },
  {
    workspace: 'equation',
    label: 'Equation',
    cases: [
      {
        id: 'equation-quadratic-two-roots',
        settings: EXACT_DEG,
        driver: { kind: 'equation', inputLatex: 'x^2-5x+6=0' },
        expectation: { surface: 'answer', rawLatexIncludes: ['x', '2', '3'] },
      },
      {
        id: 'equation-linear-root',
        settings: EXACT_DEG,
        driver: { kind: 'equation', inputLatex: '3x+5=20' },
        expectation: { surface: 'answer', rawLatexIncludes: ['x=5'] },
      },
    ],
  },
  {
    workspace: 'calculus',
    label: 'Calculus',
    cases: [
      {
        id: 'calculus-derivative-polynomial',
        settings: EXACT_DEG,
        driver: { kind: 'calculus', tool: 'Derivative', inputLatex: 'x^2' },
        expectation: { surface: 'answer', rawLatexIncludes: ['2x'] },
      },
      {
        id: 'calculus-integral-linear',
        settings: EXACT_DEG,
        driver: { kind: 'calculus', tool: 'Integral', inputLatex: 'x' },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\frac{1}{2}x^2', 'C'] },
      },
    ],
  },
  {
    workspace: 'trigonometry',
    label: 'Trigonometry',
    cases: [
      {
        id: 'trigonometry-pythagorean-identity',
        settings: EXACT_DEG,
        driver: {
          kind: 'trigonometry',
          path: ['Identities', 'Simplify'],
          inputLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['1'] },
      },
      {
        id: 'trigonometry-deg-to-rad',
        settings: EXACT_DEG,
        driver: {
          kind: 'trigonometry',
          path: ['Angle Convert'],
          inputLatex: 'angleConvert(value=30, from=deg, to=rad)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\frac{\\pi}{6}'] },
      },
    ],
  },
  {
    workspace: 'geometry',
    label: 'Geometry',
    cases: [
      {
        id: 'geometry-circle-radius-two',
        settings: EXACT_DEG,
        driver: {
          kind: 'geometry',
          path: ['Circles', 'Circle'],
          inputLatex: 'circle(radius=2)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['A=4\\pi'] },
      },
      {
        id: 'geometry-distance-three-four-five',
        settings: EXACT_DEG,
        driver: {
          kind: 'geometry',
          path: ['Coordinate Geometry', 'Distance'],
          inputLatex: 'distance(p1=(0,0), p2=(3,4))',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['d=5'] },
      },
    ],
  },
  {
    workspace: 'statistics',
    label: 'Statistics',
    cases: [
      {
        id: 'statistics-descriptive-mean-three',
        settings: BOTH_DEG,
        driver: {
          kind: 'statistics',
          path: ['Descriptive'],
          inputLatex: 'descriptive(values={1,2,3,4,5})',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\bar{x}=3'] },
      },
      {
        id: 'statistics-frequency-six-values',
        settings: BOTH_DEG,
        driver: {
          kind: 'statistics',
          path: ['Frequency'],
          inputLatex: 'frequency(freq={1:2,2:3,4:1})',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['n=6', '(1,2)', '(2,3)', '(4,1)'] },
      },
    ],
  },
  {
    workspace: 'matrix',
    label: 'Matrix',
    cases: [
      {
        id: 'matrix-determinant-two-by-two',
        settings: EXACT_DEG,
        driver: {
          kind: 'matrix',
          inputLatex: '\\det\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['-2'] },
      },
      {
        id: 'matrix-eigen-three-one',
        settings: EXACT_DEG,
        driver: {
          kind: 'matrix',
          inputLatex: '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\lambda=3', '\\lambda=1'] },
      },
    ],
  },
  {
    workspace: 'vector',
    label: 'Vector',
    cases: [
      {
        id: 'vector-unit-three-four',
        settings: EXACT_DEG,
        driver: {
          kind: 'vector',
          inputLatex: '\\operatorname{unit}\\left(\\begin{bmatrix}3\\\\4\\end{bmatrix}\\right)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\frac{3}{5}', '\\frac{4}{5}'] },
      },
      {
        id: 'vector-standard-basis-cross',
        settings: EXACT_DEG,
        driver: {
          kind: 'vector',
          inputLatex: '\\operatorname{cross}\\left(\\begin{bmatrix}1\\\\0\\\\0\\end{bmatrix},\\begin{bmatrix}0\\\\1\\\\0\\end{bmatrix}\\right)',
        },
        expectation: { surface: 'answer', rawLatexIncludes: ['\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}'] },
      },
    ],
  },
  {
    workspace: 'table',
    label: 'Table',
    cases: [
      {
        id: 'table-square-minus-one-to-one',
        settings: EXACT_DEG,
        driver: { kind: 'table', inputLatex: 'x^2', range: { start: -1, end: 1, step: 1 } },
        expectation: {
          surface: 'table',
          rows: [
            { index: 0, textIncludes: ['-1', '1'] },
            { index: 1, textIncludes: ['0', '0'] },
            { index: 2, textIncludes: ['1', '1'] },
          ],
        },
      },
      {
        id: 'table-linear-zero-to-two',
        settings: EXACT_DEG,
        driver: { kind: 'table', inputLatex: 'x+1', range: { start: 0, end: 2, step: 1 } },
        expectation: {
          surface: 'table',
          rows: [
            { index: 0, textIncludes: ['0', '1'] },
            { index: 1, textIncludes: ['1', '2'] },
            { index: 2, textIncludes: ['2', '3'] },
          ],
        },
      },
    ],
  },
] as const satisfies readonly WorkspaceCanary[];
