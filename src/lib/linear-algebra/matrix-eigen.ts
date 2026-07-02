import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import {
  addExactScalars,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  subtractExactScalars,
} from '../algebra/polynomial-core';
import { solveEquationExactQuadraticBoundary } from '../equation/exact-polynomial-boundary';
import { rrefExactMatrix, scalar, type ExactMatrix, type ExactVector } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorToColumnLatex,
} from './exact-matrix-format';

export type MatrixEigenInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

export type MatrixEigenAnalysisRoot = {
  eigenvalue: ExactScalar;
  eigenvalueLatex: string;
  rootLatex: string;
  multiplicity: 1 | 2;
  shifted: ExactMatrix;
  basis: ExactVector[];
  spaceLatex: string;
};

export type MatrixEigenAnalysis = {
  label: string;
  exactMatrix: ExactMatrix;
  trace: ExactScalar;
  determinant: ExactScalar;
  equationLatex: string;
  roots: MatrixEigenAnalysisRoot[];
};

export type MatrixEigenAnalysisResult =
  | { kind: 'success'; analysis: MatrixEigenAnalysis }
  | { kind: 'stop'; response: MatrixResponse };

const ZERO = scalar(0);
const ONE = scalar(1);
const EIGENVALUE_METHOD_TITLE = 'How Eigenvalues Were Found';

function matrixEigenStop(
  message: string,
  options: {
    detailSections?: DisplayDetailSection[];
    handoffEquationLatex?: string;
  } = {},
): MatrixResponse {
  return {
    warnings: [],
    error: message,
    ...(options.detailSections ? { detailSections: options.detailSections } : {}),
    ...(options.handoffEquationLatex ? { handoffEquationLatex: options.handoffEquationLatex } : {}),
  };
}

function exactInputMatrix(input: MatrixEigenInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

function basisLatex(basis: ExactVector[]) {
  if (basis.length === 0) {
    return '\\{0\\}';
  }

  return `\\operatorname{span}\\left\\{${basis.map(exactVectorToColumnLatex).join(',')}\\right\\}`;
}

function nullSpaceBasis(rref: ExactMatrix, pivotColumns: number[], unknowns: number) {
  const pivotSet = new Set(pivotColumns);
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !pivotSet.has(column));

  return freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: unknowns }, () => ZERO);
    vector[freeColumn] = ONE;
    pivotColumns.forEach((pivotColumn, pivotRow) => {
      vector[pivotColumn] = negateExactScalar(rref[pivotRow][freeColumn]);
    });
    return vector;
  });
}

function characteristicData(matrix: ExactMatrix) {
  const [[a, b], [c, d]] = matrix;
  const trace = addExactScalars(a, d);
  const determinant = subtractExactScalars(multiplyExactScalars(a, d), multiplyExactScalars(b, c));
  const linear = negateExactScalar(trace);
  return {
    trace,
    determinant,
    coefficients: {
      quadratic: ONE,
      linear,
      constant: determinant,
    },
  };
}

function shiftedMatrix(matrix: ExactMatrix, eigenvalue: ExactScalar): ExactMatrix {
  const [[a, b], [c, d]] = matrix;
  return [
    [subtractExactScalars(a, eigenvalue), b],
    [c, subtractExactScalars(d, eigenvalue)],
  ];
}

function characteristicDetails(input: {
  label: string;
  trace: ExactScalar;
  determinant: ExactScalar;
  equationLatex: string;
  boundaryLine?: string;
}): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [
    {
      title: 'Characteristic Polynomial',
      lines: [
        `\\operatorname{tr}(${input.label})=${exactScalarToLatex(input.trace)}`,
        `\\det(${input.label})=${exactScalarToLatex(input.determinant)}`,
        input.equationLatex,
      ],
      lineKind: 'math',
    },
  ];

  if (input.boundaryLine) {
    sections.push({
      title: EIGENVALUE_METHOD_TITLE,
      lines: [
        `Matrix formed ${input.equationLatex} from the characteristic polynomial.`,
        input.boundaryLine,
        'Open the characteristic polynomial in Equation for roots outside Matrix V1 rational eigenvalue readback.',
      ],
      lineKind: 'text',
    });
  }

  return sections;
}

function eigenspaceDetails(lines: string[]): DisplayDetailSection {
  return {
    title: 'Eigenspaces',
    lines,
    lineKind: 'math',
  };
}

export function analyzeMatrixEigen2x2(input: MatrixEigenInput): MatrixEigenAnalysisResult {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return {
      kind: 'stop',
      response: matrixEigenStop('Eigen needs exact 2 by 2 Matrix entries in this move.'),
    };
  }

  if (
    exactMatrix.length !== 2
    || exactMatrix.some((row) => row.length !== 2)
  ) {
    return {
      kind: 'stop',
      response: matrixEigenStop('Eigen V1 supports 2 by 2 matrices only.'),
    };
  }

  const characteristic = characteristicData(exactMatrix);
  const solved = solveEquationExactQuadraticBoundary({
    variable: '\\lambda',
    coefficients: characteristic.coefficients,
    source: 'matrix-eigen-2x2',
  });

  if (solved.kind === 'unsupported') {
    return {
      kind: 'stop',
      response: matrixEigenStop(
        solved.reason === 'complex-roots'
          ? 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.'
          : 'Irrational eigenvalue vector readback is deferred for Matrix V1.',
        {
          detailSections: characteristicDetails({
            label: input.label,
            trace: characteristic.trace,
            determinant: characteristic.determinant,
            equationLatex: solved.equationLatex,
            boundaryLine: solved.message,
          }),
          handoffEquationLatex: solved.equationLatex,
        },
      ),
    };
  }

  const roots = [...solved.roots].sort((left, right) =>
    exactScalarToNumber(right.value) - exactScalarToNumber(left.value));
  const analyzedRoots: MatrixEigenAnalysisRoot[] = [];

  for (const root of roots) {
    const eigenvalue = normalizeExactScalar(root.value);
    const shifted = shiftedMatrix(exactMatrix, eigenvalue);
    const reduced = rrefExactMatrix(shifted);
    if (reduced.kind === 'stop') {
      return {
        kind: 'stop',
        response: matrixEigenStop('Eigen could not compute the eigenspace for this Matrix.'),
      };
    }

    const pivotColumns = reduced.pivotColumns.filter((column) => column < 2);
    const basis = nullSpaceBasis(reduced.matrix, pivotColumns, 2);
    const eigenvalueLatex = exactScalarToLatex(eigenvalue);
    const spaceLatex = basisLatex(basis);
    analyzedRoots.push({
      eigenvalue,
      eigenvalueLatex,
      rootLatex: root.latex,
      multiplicity: root.multiplicity,
      shifted,
      basis,
      spaceLatex,
    });
  }

  return {
    kind: 'success',
    analysis: {
      label: input.label,
      exactMatrix,
      trace: characteristic.trace,
      determinant: characteristic.determinant,
      equationLatex: solved.equationLatex,
      roots: analyzedRoots,
    },
  };
}

export function runMatrixEigen(input: MatrixEigenInput): MatrixResponse {
  const analyzed = analyzeMatrixEigen2x2(input);
  if (analyzed.kind === 'stop') {
    return analyzed.response;
  }

  const { analysis } = analyzed;
  const eigenspaceLines: string[] = [];
  const resultEntries: string[] = [];

  for (const root of analysis.roots) {
    const multiplicityText = root.multiplicity === 2 ? ',\\ m=2' : '';
    resultEntries.push(`\\lambda=${root.eigenvalueLatex}${multiplicityText}:E_{${root.eigenvalueLatex}}=${root.spaceLatex}`);
    eigenspaceLines.push(
      `E_{${root.eigenvalueLatex}}=\\operatorname{Null}(${analysis.label}-${root.eigenvalueLatex}I)=${root.spaceLatex}`,
      `${analysis.label}-${root.eigenvalueLatex}I=${exactMatrixToLatex(root.shifted)}`,
    );
  }

  return {
    resultLatex: `\\operatorname{eigen}(${analysis.label})=\\left\\{${resultEntries.join(',')}\\right\\}`,
    approxText: `eigenvalues ${analysis.roots.map((root) => root.rootLatex).join(', ')}`,
    detailSections: [
      ...characteristicDetails({
        label: analysis.label,
        trace: analysis.trace,
        determinant: analysis.determinant,
        equationLatex: analysis.equationLatex,
      }),
      {
        title: EIGENVALUE_METHOD_TITLE,
        lines: [
          'Matrix formed the characteristic polynomial, then Equation found the exact eigenvalues.',
          'Matrix used those rational eigenvalues to compute the eigenspaces locally.',
        ],
        lineKind: 'text',
      },
      eigenspaceDetails(eigenspaceLines),
    ],
    warnings: [],
  };
}
