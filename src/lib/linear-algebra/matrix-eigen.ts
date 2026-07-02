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

export function runMatrixEigen(input: MatrixEigenInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return matrixEigenStop('Eigen needs exact 2 by 2 Matrix entries in this move.');
  }

  if (
    exactMatrix.length !== 2
    || exactMatrix.some((row) => row.length !== 2)
  ) {
    return matrixEigenStop('Eigen V1 supports 2 by 2 matrices only.');
  }

  const characteristic = characteristicData(exactMatrix);
  const solved = solveEquationExactQuadraticBoundary({
    variable: '\\lambda',
    coefficients: characteristic.coefficients,
    source: 'matrix-eigen-2x2',
  });

  if (solved.kind === 'unsupported') {
    return matrixEigenStop(
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
    );
  }

  const roots = [...solved.roots].sort((left, right) =>
    exactScalarToNumber(right.value) - exactScalarToNumber(left.value));
  const eigenspaceLines: string[] = [];
  const resultEntries: string[] = [];

  for (const root of roots) {
    const eigenvalue = normalizeExactScalar(root.value);
    const shifted = shiftedMatrix(exactMatrix, eigenvalue);
    const reduced = rrefExactMatrix(shifted);
    if (reduced.kind === 'stop') {
      return matrixEigenStop('Eigen could not compute the eigenspace for this Matrix.');
    }

    const pivotColumns = reduced.pivotColumns.filter((column) => column < 2);
    const basis = nullSpaceBasis(reduced.matrix, pivotColumns, 2);
    const eigenvalueLatex = exactScalarToLatex(eigenvalue);
    const spaceLatex = basisLatex(basis);
    const multiplicityText = root.multiplicity === 2 ? ',\\ m=2' : '';
    resultEntries.push(`\\lambda=${eigenvalueLatex}${multiplicityText}:E_{${eigenvalueLatex}}=${spaceLatex}`);
    eigenspaceLines.push(
      `E_{${eigenvalueLatex}}=\\operatorname{Null}(${input.label}-${eigenvalueLatex}I)=${spaceLatex}`,
      `${input.label}-${eigenvalueLatex}I=${exactMatrixToLatex(shifted)}`,
    );
  }

  return {
    resultLatex: `\\operatorname{eigen}(${input.label})=\\left\\{${resultEntries.join(',')}\\right\\}`,
    approxText: `eigenvalues ${roots.map((root) => root.latex).join(', ')}`,
    detailSections: [
      ...characteristicDetails({
        label: input.label,
        trace: characteristic.trace,
        determinant: characteristic.determinant,
        equationLatex: solved.equationLatex,
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
