import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import {
  addExactScalars,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  subtractExactScalars,
  buildExactScalarNode,
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
import { LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorSetMathJson,
  labelMathJson,
  operatorMathJson,
} from './canonical-evidence';

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

function characteristicEquationMathJson(input: ReturnType<typeof characteristicData>) {
  return equationMathJson([
    'Add',
    ['Power', 'lambda', 2],
    ['Multiply', buildExactScalarNode(input.coefficients.linear), 'lambda'],
    buildExactScalarNode(input.coefficients.constant),
  ], 0);
}

function characteristicEvidence(
  label: string,
  matrix: ExactMatrix,
  characteristic: ReturnType<typeof characteristicData>,
  equationLatex: string,
) {
  const operand = labelMathJson(label, exactMatrixMathJson(matrix));
  return [
    {
      kind: 'math' as const,
      value: canonicalLeafEvidence(`\\operatorname{tr}(${label})=${exactScalarToLatex(characteristic.trace)}`, equationMathJson(operatorMathJson('tr', operand), buildExactScalarNode(characteristic.trace)), 'matrix.eigen.native-trace'),
    },
    {
      kind: 'math' as const,
      value: canonicalLeafEvidence(`\\det(${label})=${exactScalarToLatex(characteristic.determinant)}`, equationMathJson(operatorMathJson('det', operand), buildExactScalarNode(characteristic.determinant)), 'matrix.eigen.native-determinant'),
    },
    {
      kind: 'math' as const,
      value: canonicalLeafEvidence(equationLatex, characteristicEquationMathJson(characteristic), 'matrix.eigen.native-characteristic-polynomial'),
    },
  ];
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

export function matrixEigenspaceLabelLatex(root: MatrixEigenAnalysisRoot) {
  if (root.eigenvalue.denominator !== 1) {
    return `\\operatorname{E}\\left(${root.eigenvalueLatex}\\right)`;
  }
  return root.eigenvalue.numerator >= 0
    ? `E_{${root.eigenvalueLatex}}`
    : `\\mathrm{E_{${root.eigenvalueLatex}}}`;
}

export function matrixEigenspaceMathJson(root: MatrixEigenAnalysisRoot) {
  if (root.eigenvalue.denominator !== 1) {
    return operatorMathJson('E', buildExactScalarNode(root.eigenvalue));
  }
  return root.eigenvalue.numerator >= 0
    ? `E_${root.eigenvalue.numerator}`
    : `E_minus${Math.abs(root.eigenvalue.numerator)}`;
}

function eigenEntryMathJson(root: MatrixEigenAnalysisRoot) {
  const space = ['InvisibleOperator', 'span', exactVectorSetMathJson(root.basis)];
  if (root.multiplicity === 2) {
    return ['Delimiter', ['Sequence',
      equationMathJson('lambda', buildExactScalarNode(root.eigenvalue)),
      equationMathJson('m', 2),
      equationMathJson(matrixEigenspaceMathJson(root), space),
    ], "'(,)'"];
  }
  const joined = ['Equal',
    ['InvisibleOperator', buildExactScalarNode(root.eigenvalue), "':'", matrixEigenspaceMathJson(root)],
    space,
  ];
  return equationMathJson('lambda', joined);
}

function eigenEntryLatex(root: MatrixEigenAnalysisRoot) {
  if (root.multiplicity === 2) {
    return `\\left(\\lambda=${root.eigenvalueLatex},m=2,${matrixEigenspaceLabelLatex(root)}=${root.spaceLatex}\\right)`;
  }
  return `\\lambda=${root.eigenvalueLatex}\\text{:}${matrixEigenspaceLabelLatex(root)}=${root.spaceLatex}`;
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
    exactMatrix.length !== LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE
    || exactMatrix.some((row) => row.length !== LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE)
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
    const response = matrixEigenStop(
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
    const equationEvidence = canonicalLeafEvidence(
      solved.equationLatex,
      characteristicEquationMathJson(characteristic),
      'matrix.eigen.native-characteristic-polynomial-action',
    );
    attachLinearAlgebraCanonicalEvidence(response, {
      details: characteristicEvidence(input.label, exactMatrix, characteristic, solved.equationLatex),
      runtimeActions: [equationEvidence],
    });
    return {
      kind: 'stop',
      response,
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
    resultEntries.push(eigenEntryLatex(root));
    eigenspaceLines.push(
      `${matrixEigenspaceLabelLatex(root)}=\\operatorname{Null}(${analysis.label}-(${root.eigenvalueLatex})I)=${root.spaceLatex}`,
      `${analysis.label}-(${root.eigenvalueLatex})I=${exactMatrixToLatex(root.shifted)}`,
    );
  }

  const response = profileLinearAlgebraResult({
    resultLatex: `\\operatorname{eigen}(${analysis.label})=\\left\\{${resultEntries.join(',')}\\right\\}`,
    answerRows: {
      rows: resultEntries.map((entry) => ({ latex: entry })),
    },
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
        lineKind: 'text' as const,
      },
      eigenspaceDetails(eigenspaceLines),
    ],
    warnings: [],
  });
  const characteristic = characteristicData(analysis.exactMatrix);
  const operand = labelMathJson(analysis.label, exactMatrixMathJson(analysis.exactMatrix));
  const entryNodes = analysis.roots.map(eigenEntryMathJson);
  const entryLatex = resultEntries;
  const primaryLatex = `\\operatorname{eigen}(${analysis.label})=\\left\\{${entryLatex.join(',')}\\right\\}`;
  const details = [
    ...characteristicEvidence(analysis.label, analysis.exactMatrix, characteristic, analysis.equationLatex),
    ...analysis.roots.flatMap((root, index) => {
      const eigenspaceLatex = `${matrixEigenspaceLabelLatex(root)}=\\operatorname{Null}(${analysis.label}-(${root.eigenvalueLatex})I)=${root.spaceLatex}`;
      const shiftedLatex = `${analysis.label}-(${root.eigenvalueLatex})I=${exactMatrixToLatex(root.shifted)}`;
      return [
        {
          kind: 'math' as const,
          value: canonicalLeafEvidence(eigenspaceLatex, equationMathJson(
            matrixEigenspaceMathJson(root),
            equationMathJson(
              operatorMathJson('Null', ['Subtract', operand, ['InvisibleOperator', buildExactScalarNode(root.eigenvalue), 'I']]),
              ['InvisibleOperator', 'span', exactVectorSetMathJson(root.basis)],
            ),
          ), `matrix.eigen.native-eigenspace-${index}`),
        },
        {
          kind: 'math' as const,
          value: canonicalLeafEvidence(shiftedLatex, equationMathJson(['Subtract', operand, ['Multiply', buildExactScalarNode(root.eigenvalue), 'IdentityMatrix']], exactMatrixMathJson(root.shifted)), `matrix.eigen.native-shifted-matrix-${index}`),
        },
      ];
    }),
  ];
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson(operatorMathJson('eigen', operand), ['Set', ...entryNodes]), 'matrix.eigen.native-eigenpairs'),
    answerRows: entryLatex.map((latex, index) => canonicalLeafEvidence(latex, entryNodes[index], `matrix.eigen.native-eigenpair-${index}`)),
    details,
  });
}
