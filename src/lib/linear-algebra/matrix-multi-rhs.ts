import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import { addExactScalars, multiplyExactScalars } from '../algebra/polynomial-core';
import {
  inverseExactMatrix,
  rrefExactMatrix,
  scalar,
  type ExactMatrix,
  type ExactMatrixStopReason,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
} from './exact-matrix-format';
import { formatRowOperation, rowOperationDetailSection } from './row-operation-readback';
import {
  exactMatrixDimensionLimitMessage,
  LINEAR_ALGEBRA_MULTI_RHS_AUGMENTED_MAX_DIMENSION,
} from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import { mathPart, mixedDetailSection, textPart } from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  labelMathJson,
  operatorMathJson,
  rowOperationEvidence,
  textMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
} from './canonical-evidence';

export type MatrixMultiRhsInput = {
  coefficientLabel: string;
  rhsLabel: string;
  coefficients: number[][];
  rhs: number[][];
  exactCoefficients?: ExactScalarWire[][];
  exactRhs?: ExactScalarWire[][];
};

function augmentedMatrix(coefficients: ExactMatrix, rhs: ExactMatrix): ExactMatrix {
  return coefficients.map((row, rowIndex) => [...row, ...rhs[rowIndex]]);
}

function multiplyExactMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix {
  return left.map((row) =>
    right[0].map((_, column) =>
      row.reduce(
        (sum, value, index) => addExactScalars(sum, multiplyExactScalars(value, right[index][column])),
        scalar(0),
      ),
    ));
}

function augmentedOperatorParts(
  operator: 'rank' | 'rref',
  coefficientLabel: string,
  rhsLabel: string,
) {
  return [
    mathPart(`\\operatorname{${operator}}`),
    textPart('(['),
    mathPart(coefficientLabel),
    textPart('|'),
    mathPart(rhsLabel),
    textPart('])'),
  ];
}

function exactStopReasonToMessage(reason: ExactMatrixStopReason): string {
  switch (reason) {
    case 'empty-matrix':
      return 'Multi-RHS solve needs complete Matrix entries.';
    case 'ragged-matrix':
      return 'Multi-RHS solve needs rectangular Matrix entries.';
    case 'dimension-limit':
      return exactMatrixDimensionLimitMessage('multi-RHS solve inputs');
    case 'invalid-scalar':
      return 'Multi-RHS solve needs exact Matrix entries in this move.';
    case 'scalar-growth-limit':
      return 'This multi-RHS solve exceeded the exact Matrix arithmetic limit.';
    default:
      return 'This multi-RHS solve could not be classified by the Matrix rank/RREF path.';
  }
}

function rankFacts(input: {
  coefficientLabel: string;
  rhsLabel: string;
  rankA: number;
  rankAugmented: number;
  unknowns: number;
  rhsColumns: number;
  rref: ExactMatrix;
}): DisplayDetailSection[] {
  return [
    {
      ...mixedDetailSection('Rank Facts', [
      [mathPart(`\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`)],
      [...augmentedOperatorParts('rank', input.coefficientLabel, input.rhsLabel), textPart('='), mathPart(`${input.rankAugmented}`)],
      [mathPart(`\\operatorname{unknowns}=${input.unknowns}`)],
      [mathPart(`\\operatorname{RHS\\ columns}=${input.rhsColumns}`)],
      ]),
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`,
        `\\operatorname{rank}([${input.coefficientLabel}|${input.rhsLabel}])=${input.rankAugmented}`,
        `\\operatorname{unknowns}=${input.unknowns}`,
        `\\operatorname{RHS\\ columns}=${input.rhsColumns}`,
      ],
    },
    {
      ...mixedDetailSection('Augmented RREF', [[
      ...augmentedOperatorParts('rref', input.coefficientLabel, input.rhsLabel),
      textPart('='),
      mathPart(exactMatrixToLatex(input.rref)),
      ]]),
      lines: [`\\operatorname{rref}\\left([${input.coefficientLabel}|${input.rhsLabel}]\\right)=${exactMatrixToLatex(input.rref)}`],
    },
  ];
}

function multiRhsProof(input: {
  kind: 'unique' | 'none' | 'nonUnique';
  coefficientLabel: string;
  rhsLabel: string;
  rankA: number;
  rankAugmented: number;
  unknowns: number;
  rhsColumns: number;
}): DisplayDetailSection {
  if (input.kind === 'unique') {
    return {
      ...mixedDetailSection('Multi-RHS Proof', [
      [
        mathPart(`\\operatorname{rank}(${input.coefficientLabel})`),
        textPart('='),
        ...augmentedOperatorParts('rank', input.coefficientLabel, input.rhsLabel),
        textPart('='),
        mathPart(`${input.rankA}`),
      ],
      [mathPart(`\\operatorname{unknowns}=${input.unknowns}`)],
      [mathPart(`\\operatorname{RHS\\ columns}=${input.rhsColumns}`)],
      [textPart('Each RHS column has exactly one solution vector. Those solution vectors are collected as the columns of X.')],
      ]),
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=\\operatorname{rank}([${input.coefficientLabel}|${input.rhsLabel}])=${input.rankA}`,
        `\\operatorname{unknowns}=${input.unknowns}`,
        `\\operatorname{RHS\\ columns}=${input.rhsColumns}`,
        'Each RHS column has exactly one solution vector. Those solution vectors are collected as the columns of X.',
      ],
    };
  }

  if (input.kind === 'none') {
    return {
      ...mixedDetailSection('Multi-RHS Proof', [
      [mathPart(`\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`)],
      [...augmentedOperatorParts('rank', input.coefficientLabel, input.rhsLabel), textPart('='), mathPart(`${input.rankAugmented}`)],
      [textPart('At least one RHS column creates a contradiction, so no single matrix X satisfies all RHS columns.')],
      ]),
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`,
        `\\operatorname{rank}([${input.coefficientLabel}|${input.rhsLabel}])=${input.rankAugmented}`,
        'At least one RHS column creates a contradiction, so no single matrix X satisfies all RHS columns.',
      ],
    };
  }

  return {
    ...mixedDetailSection('Multi-RHS Proof', [
    [
      mathPart(`\\operatorname{rank}(${input.coefficientLabel})`),
      textPart('='),
      ...augmentedOperatorParts('rank', input.coefficientLabel, input.rhsLabel),
      textPart('='),
      mathPart(`${input.rankA}`),
    ],
    [mathPart(`\\operatorname{unknowns}=${input.unknowns}`)],
    [textPart('The ranks match, but the coefficient matrix has fewer pivots than unknowns. The solution matrix is not unique.')],
    ]),
    lines: [
      `\\operatorname{rank}(${input.coefficientLabel})=\\operatorname{rank}([${input.coefficientLabel}|${input.rhsLabel}])=${input.rankA}`,
      `\\operatorname{unknowns}=${input.unknowns}`,
      'The ranks match, but the coefficient matrix has fewer pivots than unknowns. The solution matrix is not unique.',
    ],
  };
}

function uniqueSolutionMatrix(
  augmentedRref: ExactMatrix,
  pivotColumns: number[],
  unknowns: number,
  rhsColumns: number,
): ExactMatrix | null {
  const solution: ExactMatrix = Array.from({ length: unknowns }, () => []);
  for (let column = 0; column < unknowns; column += 1) {
    const pivotRow = pivotColumns.indexOf(column);
    if (pivotRow < 0) {
      return null;
    }
    solution[column] = augmentedRref[pivotRow].slice(unknowns, unknowns + rhsColumns);
  }
  return solution;
}

function inverseComparisonDetails(input: {
  coefficientLabel: string;
  rhsLabel: string;
  coefficients: ExactMatrix;
  rhs: ExactMatrix;
  solution: ExactMatrix;
}): { section: DisplayDetailSection; inverse: ExactMatrix; product: ExactMatrix } | null {
  const inverse = inverseExactMatrix(input.coefficients);
  if (inverse.kind === 'stop') {
    return null;
  }

  const product = multiplyExactMatrices(inverse.inverse, input.rhs);
  return {
    inverse: inverse.inverse,
    product,
    section: {
      title: 'Inverse Comparison',
      lines: [
        `${input.coefficientLabel}^{-1}=${exactMatrixToLatex(inverse.inverse)}`,
        `X=${input.coefficientLabel}^{-1}${input.rhsLabel}`,
        `${input.coefficientLabel}^{-1}${input.rhsLabel}=${exactMatrixToLatex(product)}`,
        'Because the coefficient matrix is invertible, solving every RHS column at once matches multiplying by the inverse.',
      ],
      lineKinds: ['math', 'math', 'math', 'text'],
    },
  };
}

function multiRhsEvidenceContext(input: MatrixMultiRhsInput, coefficients: ExactMatrix, rhs: ExactMatrix) {
  const coefficient = labelMathJson(input.coefficientLabel, exactMatrixMathJson(coefficients));
  const right = labelMathJson(input.rhsLabel, exactMatrixMathJson(rhs));
  return { coefficient, right };
}

function mathEvidence(canonicalLatex: string, mathJson: unknown, source: string) {
  return { kind: 'math' as const, value: canonicalLeafEvidence(canonicalLatex, mathJson, source) };
}

function augmentedOperatorEvidence(
  operator: 'rank' | 'rref',
  input: MatrixMultiRhsInput,
  nodes: ReturnType<typeof multiRhsEvidenceContext>,
  source: string,
) {
  return [
    mathEvidence(`\\operatorname{${operator}}`, operator, `${source}-operator`),
    mathEvidence(input.coefficientLabel, nodes.coefficient, `${source}-coefficient`),
    mathEvidence(input.rhsLabel, nodes.right, `${source}-rhs`),
  ];
}

function multiRhsRowEvidence(
  operations: Parameters<typeof rowOperationDetailSection>[0],
): LinearAlgebraCanonicalDetailEvidence[] {
  return operations.flatMap((operation, index) => {
    const presentation = formatRowOperation(operation);
    return presentation
      ? [rowOperationEvidence(presentation, operation, `matrix.multi-rhs.native-row-operation-${index}`)]
      : [];
  });
}

export function runMatrixMultiRhsSolve(input: MatrixMultiRhsInput): MatrixResponse {
  const coefficients = exactMatrixFromWire(input.exactCoefficients) ?? exactMatrixFromNumeric(input.coefficients);
  const rhs = exactMatrixFromWire(input.exactRhs) ?? exactMatrixFromNumeric(input.rhs);
  if (!coefficients || !rhs) {
    return {
      warnings: [],
      error: 'Multi-RHS solve needs exact Matrix entries in this move.',
    };
  }

  if (coefficients.length === 0 || coefficients[0]?.length === 0 || rhs.length === 0 || rhs[0]?.length === 0) {
    return {
      warnings: [],
      error: 'Multi-RHS solve needs complete coefficient and RHS matrices.',
    };
  }

  if (coefficients.length !== rhs.length) {
    return {
      warnings: [],
      error: 'The RHS matrix row count must match the coefficient matrix row count.',
    };
  }

  const coefficientRref = rrefExactMatrix(coefficients);
  if (coefficientRref.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(coefficientRref.reason),
    };
  }

  const augmentedRref = rrefExactMatrix(augmentedMatrix(coefficients, rhs), {
    maxDimension: LINEAR_ALGEBRA_MULTI_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (augmentedRref.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(augmentedRref.reason),
    };
  }

  const unknowns = coefficients[0].length;
  const rhsColumns = rhs[0].length;
  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const facts = rankFacts({
    coefficientLabel: input.coefficientLabel,
    rhsLabel: input.rhsLabel,
    rankA,
    rankAugmented,
    unknowns,
    rhsColumns,
    rref: augmentedRref.matrix,
  });
  const nodes = multiRhsEvidenceContext(input, coefficients, rhs);
  const factEvidence = [
    mathEvidence(`\\operatorname{rank}(${input.coefficientLabel})=${rankA}`, equationMathJson(operatorMathJson('rank', nodes.coefficient), rankA), 'matrix.multi-rhs.native-rank'),
    ...augmentedOperatorEvidence('rank', input, nodes, 'matrix.multi-rhs.native-augmented-rank'),
    mathEvidence(`${rankAugmented}`, rankAugmented, 'matrix.multi-rhs.native-augmented-rank-value'),
    mathEvidence(`\\operatorname{unknowns}=${unknowns}`, equationMathJson('unknowns', unknowns), 'matrix.multi-rhs.native-unknowns'),
    mathEvidence(`\\operatorname{RHS\\ columns}=${rhsColumns}`, equationMathJson('rhsColumns', rhsColumns), 'matrix.multi-rhs.native-rhs-columns'),
    ...augmentedOperatorEvidence('rref', input, nodes, 'matrix.multi-rhs.native-augmented-rref'),
    mathEvidence(exactMatrixToLatex(augmentedRref.matrix), exactMatrixMathJson(augmentedRref.matrix), 'matrix.multi-rhs.native-augmented-rref-value'),
  ];

  if (rankA < rankAugmented) {
    const response = profileLinearAlgebraResult({
      resultLatex: '\\text{No solution matrix}',
      approxText: 'no solution matrix',
      detailSections: [
        multiRhsProof({
          kind: 'none',
          coefficientLabel: input.coefficientLabel,
          rhsLabel: input.rhsLabel,
          rankA,
          rankAugmented,
          unknowns,
          rhsColumns,
        }),
        ...facts,
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
    });
    return attachLinearAlgebraCanonicalEvidence(response, {
      primary: canonicalLeafEvidence('\\text{No solution matrix}', textMathJson('No solution matrix'), 'matrix.multi-rhs.native-inconsistent-classification'),
      details: [
        mathEvidence(`\\operatorname{rank}(${input.coefficientLabel})=${rankA}`, equationMathJson(operatorMathJson('rank', nodes.coefficient), rankA), 'matrix.multi-rhs.native-proof-rank'),
        ...augmentedOperatorEvidence('rank', input, nodes, 'matrix.multi-rhs.native-proof-augmented-rank'),
        mathEvidence(`${rankAugmented}`, rankAugmented, 'matrix.multi-rhs.native-proof-augmented-rank-value'),
        ...factEvidence,
        ...multiRhsRowEvidence(augmentedRref.rowOperations),
      ],
    });
  }

  if (rankA < unknowns) {
    const response = profileLinearAlgebraResult({
      resultLatex: '\\text{Infinitely many solution matrices}',
      approxText: 'not unique',
      detailSections: [
        multiRhsProof({
          kind: 'nonUnique',
          coefficientLabel: input.coefficientLabel,
          rhsLabel: input.rhsLabel,
          rankA,
          rankAugmented,
          unknowns,
          rhsColumns,
        }),
        ...facts,
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
    });
    return attachLinearAlgebraCanonicalEvidence(response, {
      primary: canonicalLeafEvidence('\\text{Infinitely many solution matrices}', textMathJson('Infinitely many solution matrices'), 'matrix.multi-rhs.native-nonunique-classification'),
      details: [
        mathEvidence(`\\operatorname{rank}(${input.coefficientLabel})`, operatorMathJson('rank', nodes.coefficient), 'matrix.multi-rhs.native-proof-coefficient-rank'),
        ...augmentedOperatorEvidence('rank', input, nodes, 'matrix.multi-rhs.native-proof-augmented-rank'),
        mathEvidence(`${rankA}`, rankA, 'matrix.multi-rhs.native-proof-rank-value'),
        mathEvidence(`\\operatorname{unknowns}=${unknowns}`, equationMathJson('unknowns', unknowns), 'matrix.multi-rhs.native-proof-unknowns'),
        ...factEvidence,
        ...multiRhsRowEvidence(augmentedRref.rowOperations),
      ],
    });
  }

  const solution = uniqueSolutionMatrix(augmentedRref.matrix, augmentedRref.pivotColumns, unknowns, rhsColumns);
  if (!solution) {
    return {
      warnings: [],
      error: 'This multi-RHS solve could not extract a unique solution matrix from RREF.',
    };
  }
  const inverseComparison = inverseComparisonDetails({
    coefficientLabel: input.coefficientLabel,
    rhsLabel: input.rhsLabel,
    coefficients,
    rhs,
    solution,
  });

  const response = profileLinearAlgebraResult({
    resultLatex: `X=${exactMatrixToLatex(solution)}`,
    approxText: `unique ${rhsColumns}-column solution`,
    detailSections: [
      multiRhsProof({
        kind: 'unique',
        coefficientLabel: input.coefficientLabel,
        rhsLabel: input.rhsLabel,
        rankA,
        rankAugmented,
        unknowns,
        rhsColumns,
      }),
      ...facts,
      ...(inverseComparison ? [inverseComparison.section] : []),
      rowOperationDetailSection(augmentedRref.rowOperations),
    ],
    warnings: [],
  });
  const solutionNode = exactMatrixMathJson(solution);
  const inverseNode = inverseComparison ? exactMatrixMathJson(inverseComparison.inverse) : undefined;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(`X=${exactMatrixToLatex(solution)}`, equationMathJson('X', solutionNode), 'matrix.multi-rhs.native-solution'),
    details: [
      mathEvidence(`\\operatorname{rank}(${input.coefficientLabel})`, operatorMathJson('rank', nodes.coefficient), 'matrix.multi-rhs.native-proof-coefficient-rank'),
      ...augmentedOperatorEvidence('rank', input, nodes, 'matrix.multi-rhs.native-proof-augmented-rank'),
      mathEvidence(`${rankA}`, rankA, 'matrix.multi-rhs.native-proof-rank-value'),
      mathEvidence(`\\operatorname{unknowns}=${unknowns}`, equationMathJson('unknowns', unknowns), 'matrix.multi-rhs.native-proof-unknowns'),
      mathEvidence(`\\operatorname{RHS\\ columns}=${rhsColumns}`, equationMathJson('rhsColumns', rhsColumns), 'matrix.multi-rhs.native-proof-rhs-columns'),
      ...factEvidence,
      ...(inverseComparison && inverseNode ? [
        mathEvidence(`${input.coefficientLabel}^{-1}=${exactMatrixToLatex(inverseComparison.inverse)}`, equationMathJson(['Power', nodes.coefficient, -1], inverseNode), 'matrix.multi-rhs.native-inverse'),
        mathEvidence(`X=${input.coefficientLabel}^{-1}${input.rhsLabel}`, equationMathJson('X', ['Multiply', inverseNode, nodes.right]), 'matrix.multi-rhs.native-inverse-formula'),
        mathEvidence(`${input.coefficientLabel}^{-1}${input.rhsLabel}=${exactMatrixToLatex(inverseComparison.product)}`, equationMathJson(['Multiply', inverseNode, nodes.right], exactMatrixMathJson(inverseComparison.product)), 'matrix.multi-rhs.native-inverse-product'),
      ] : []),
      ...multiRhsRowEvidence(augmentedRref.rowOperations),
    ],
  });
}
