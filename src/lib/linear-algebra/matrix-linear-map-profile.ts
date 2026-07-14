import type {
  DisplayDetailSection,
  ExactScalarWire,
  MatrixResponse,
} from '../../types/calculator';
import { buildExactScalarNode, exactScalarIsZero, type ExactScalar } from '../algebra/polynomial-core';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { determinantExactMatrix, type ExactVector } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import {
  analyzeExactColumnFamily,
  type ExactColumnFamilyAnalysis,
} from './matrix-column-family';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  exactMatrixMathJson,
  exactVectorSetMathJson,
  integerSetMathJson,
} from './canonical-evidence';

export type MatrixLinearMapProfileInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

function profileStop(message: string): MatrixResponse {
  return { warnings: [], error: message };
}

function vectorSetLatex(vectors: readonly ExactVector[]) {
  return vectors.length > 0
    ? `\\left\\{${vectors.map(exactVectorToColumnLatex).join(',')}\\right\\}`
    : '\\varnothing';
}

function pivotColumnSetLatex(columns: readonly number[]) {
  return columns.length > 0
    ? `\\left\\{${columns.map((column) => column + 1).join(',')}\\right\\}`
    : '\\varnothing';
}

function profileFacts(
  analysis: ExactColumnFamilyAnalysis,
): DisplayDetailSection[] {
  const rows = analysis.matrix.length;
  const columns = analysis.matrix[0]?.length ?? 0;
  const oneToOne = analysis.nullity === 0;
  const onto = analysis.rank === rows;
  return [
    mixedDetailSection('Rank-Nullity Facts', [
      [
        textPart('Rank-nullity: '),
        mathPart(`${analysis.rank}+${analysis.nullity}=${columns}`),
      ],
      [
        textPart('Pivot columns: '),
        mathPart(pivotColumnSetLatex(analysis.pivotColumns)),
      ],
      [textPart('Rank counts independent output directions; nullity counts independent input directions that map to zero.')],
    ]),
    mixedDetailSection('Kernel', [
      [
        textPart('Kernel spanning set: '),
        mathPart(vectorSetLatex(analysis.kernelBasis)),
      ],
      [textPart(`One-to-one: ${oneToOne ? 'yes' : 'no'}.`)],
      [textPart(oneToOne
        ? 'Nullity is 0, so only the zero vector maps to zero.'
        : `Nullity is ${analysis.nullity}, so nonzero vectors in the kernel map to zero.`)],
    ]),
    mixedDetailSection('Image', [
      [
        textPart('Image spanning set: '),
        mathPart(vectorSetLatex(analysis.imageBasis)),
      ],
      [textPart(`Onto: ${onto ? 'yes' : 'no'}.`)],
      [textPart(onto
        ? 'The rank equals the codomain dimension, so every codomain vector is reached.'
        : `The rank is ${analysis.rank}, smaller than the codomain dimension ${rows}, so some codomain directions are not reached.`)],
    ]),
  ];
}

function invertibilityFacts(
  analysis: ExactColumnFamilyAnalysis,
): { section: DisplayDetailSection; determinant?: ExactScalar } | MatrixResponse {
  const rows = analysis.matrix.length;
  const columns = analysis.matrix[0]?.length ?? 0;
  if (rows !== columns) {
    return {
      section: {
        title: 'Invertibility',
        lines: [
          'Invertibility is not applicable to rectangular matrices.',
          'Use the one-to-one and onto facts above to describe this linear map.',
        ],
        lineKind: 'text',
      },
    };
  }

  const determinant = determinantExactMatrix(analysis.matrix);
  if (determinant.kind === 'stop') {
    return profileStop('This profile could not compute the square-matrix determinant exactly.');
  }
  const invertible = !exactScalarIsZero(determinant.determinant);
  return {
    determinant: determinant.determinant,
    section: mixedDetailSection('Invertibility', [
      [
        textPart('Determinant: '),
        mathPart(exactScalarToLatex(determinant.determinant)),
      ],
      [textPart(`Invertible: ${invertible ? 'yes' : 'no'}.`)],
      [textPart(invertible
        ? 'The determinant is nonzero, so the map is both one-to-one and onto.'
        : 'The determinant is zero, so the square matrix is not invertible.')],
    ]),
  };
}

export function runMatrixLinearMapProfile(input: MatrixLinearMapProfileInput): MatrixResponse {
  const exactMatrix = exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
  if (!exactMatrix) {
    return profileStop('Linear-map profiles need exact Matrix entries in this move.');
  }

  const analysis = analyzeExactColumnFamily(exactMatrix);
  if (analysis.kind === 'stop') {
    return profileStop(analysis.reason === 'dimension-limit'
      ? exactMatrixDimensionLimitMessage('linear-map profiles')
      : 'Linear-map profiles need a complete rectangular Matrix.');
  }
  const rows = exactMatrix.length;
  const columns = exactMatrix[0]?.length ?? 0;
  const invertibility = invertibilityFacts(analysis);
  if ('warnings' in invertibility) return invertibility;

  const mapLatex = `${input.label}:\\mathbb{R}^{${columns}}\\to\\mathbb{R}^{${rows}}`;
  const response = profileLinearAlgebraResult({
    resultLatex: `${mapLatex},\\quad\\operatorname{rank}(${input.label})=${analysis.rank},\\quad\\operatorname{nullity}(${input.label})=${analysis.nullity}`,
    answerRows: {
      rows: [
        { latex: mapLatex },
        { latex: `\\operatorname{rank}(${input.label})=${analysis.rank}` },
        { latex: `\\operatorname{nullity}(${input.label})=${analysis.nullity}` },
      ],
    },
    detailSections: [
      ...profileFacts(analysis),
      invertibility.section,
      mixedDetailSection('RREF Evidence', [
        [
          textPart('RREF: '),
          mathPart(exactMatrixToLatex(analysis.rref)),
        ],
        [
          textPart('Pivot columns: '),
          mathPart(pivotColumnSetLatex(analysis.pivotColumns)),
        ],
        [textPart('The pivot columns determine rank and image; the free columns determine nullity and the kernel basis.')],
      ]),
    ],
    warnings: [],
  });
  const pivotNumbers = analysis.pivotColumns.map((column) => column + 1);
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => ({
    kind: 'math' as const,
    value: canonicalLeafEvidence(canonicalLatex, mathJson, source),
  });
  return attachLinearAlgebraCanonicalEvidence(response, {
    semanticPrimary: {
      kind: 'linear-map-profile',
      operand: canonicalLeafEvidence(
        exactMatrixToLatex(exactMatrix),
        exactMatrixMathJson(exactMatrix),
        'matrix.profile.native-exact-operand',
      ),
      domainDimension: columns,
      codomainDimension: rows,
      rank: analysis.rank,
      nullity: analysis.nullity,
    },
    details: [
      math(`${analysis.rank}+${analysis.nullity}=${columns}`, ['Equal', ['Add', analysis.rank, analysis.nullity], columns], 'matrix.profile.native-rank-nullity-values'),
      math(pivotColumnSetLatex(analysis.pivotColumns), integerSetMathJson(pivotNumbers), 'matrix.profile.native-pivots'),
      math(vectorSetLatex(analysis.kernelBasis), exactVectorSetMathJson(analysis.kernelBasis), 'matrix.profile.native-kernel'),
      math(vectorSetLatex(analysis.imageBasis), exactVectorSetMathJson(analysis.imageBasis), 'matrix.profile.native-image'),
      ...(invertibility.determinant ? [math(
        exactScalarToLatex(invertibility.determinant),
        buildExactScalarNode(invertibility.determinant),
        'matrix.profile.native-determinant',
      )] : []),
      math(exactMatrixToLatex(analysis.rref), exactMatrixMathJson(analysis.rref), 'matrix.profile.native-rref'),
      math(pivotColumnSetLatex(analysis.pivotColumns), integerSetMathJson(pivotNumbers), 'matrix.profile.native-rref-pivots'),
    ],
  });
}
