import type {
  DisplayDetailSection,
  VectorRequest,
  VectorResponse,
} from '../../types/calculator';
import {
  exactScalarIsZero,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { exactVectorFamilyDimensionLimitMessage } from './dimension-contract';
import {
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import type { ExactVector } from './exact-matrix-core';
import {
  analyzeExactColumnFamily,
  exactMatrixFromColumnVectors,
  type ExactColumnFamilyAnalysis,
} from './matrix-column-family';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result-detail-lines';

function vectorFamilyStop(message: string): VectorResponse {
  return { warnings: [], error: message };
}

function exactOperandVectors(req: VectorRequest): ExactVector[] | null {
  const operands = req.vectorOperands ?? [req.vectorA, ...(req.vectorB ? [req.vectorB] : [])];
  const exactVectors = operands.map((vector, index) => (
    exactVectorFromWire(req.exactVectorOperands?.[index])
    ?? exactVectorFromNumeric(vector)
  ));
  return exactVectors.every((vector): vector is ExactVector => vector !== null)
    ? exactVectors
    : null;
}

function familyLabels(req: VectorRequest, count: number) {
  return Array.from({ length: count }, (_, index) => (
    req.vectorOperandLatexList?.[index]
    ?? (index === 0 ? req.vectorOperandLatexA : index === 1 ? req.vectorOperandLatexB : undefined)
    ?? `v_{${index + 1}}`
  ));
}

function familyCall(name: string, labels: readonly string[]) {
  return `\\operatorname{${name}}\\left(${labels.join(',')}\\right)`;
}

function pivotColumnSetLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? `\\left\\{${pivotColumns.map((column) => column + 1).join(',')}\\right\\}`
    : '\\varnothing';
}

function selectedBasisSetLatex(labels: readonly string[], pivotColumns: readonly number[]) {
  const selected = pivotColumns.map((column) => labels[column]);
  return selected.length > 0
    ? `\\left\\{${selected.join(',')}\\right\\}`
    : '\\varnothing';
}

function selectedBasisLatex(labels: readonly string[], pivotColumns: readonly number[]) {
  const selected = pivotColumns.map((column) => labels[column]);
  return `\\left\\{${selected.join(',')}\\right\\}`;
}

function negateRelation(relation: ExactVector): ExactVector {
  return relation.map((value) => ({
    numerator: -value.numerator,
    denominator: value.denominator,
  }));
}

function canonicalRelation(relation: ExactVector): ExactVector {
  const last = [...relation].reverse().find((value) => !exactScalarIsZero(value));
  return last && last.numerator > 0 ? negateRelation(relation) : relation;
}

function relationTerm(value: ExactScalar, label: string) {
  const magnitude = {
    numerator: Math.abs(value.numerator),
    denominator: value.denominator,
  };
  const coefficient = magnitude.numerator === magnitude.denominator
    ? ''
    : exactScalarToLatex(magnitude);
  return `${coefficient}${label}`;
}

function relationSumLatex(relation: ExactVector, labels: readonly string[]) {
  const terms = relation.flatMap((value, index) => {
    if (exactScalarIsZero(value)) return [];
    const term = relationTerm(value, labels[index]);
    return [{ negative: value.numerator < 0, term }];
  });
  return terms.map(({ negative, term }, index) => (
    index === 0 ? `${negative ? '-' : ''}${term}` : `${negative ? '-' : '+'}${term}`
  )).join('') || '0';
}

function solvedRelationLatex(relation: ExactVector, labels: readonly string[]) {
  let target = -1;
  for (let index = relation.length - 1; index >= 0; index -= 1) {
    if (!exactScalarIsZero(relation[index])) {
      target = index;
      break;
    }
  }
  if (target < 0) return null;
  const coefficient = relation[target];
  if (coefficient.numerator !== -1 || coefficient.denominator !== 1) return null;
  const right = relation.map((value, index) => index === target
    ? { numerator: 0, denominator: 1 }
    : value);
  return `${labels[target]}=${relationSumLatex(right, labels)}`;
}

function relationDetails(
  analysis: ExactColumnFamilyAnalysis,
  labels: readonly string[],
): DisplayDetailSection[] {
  const witness = analysis.kernelBasis[0];
  if (!witness) return [];
  const relation = canonicalRelation(witness);
  const solved = solvedRelationLatex(relation, labels);
  return [{
    title: 'Dependence Relation',
    lines: [
      `${relationSumLatex(relation, labels)}=0`,
      ...(solved ? [solved] : []),
      'This nonzero coefficient relation shows that at least one input vector is a combination of the others.',
    ],
    lineKinds: ['math', ...(solved ? ['math'] as const : []), 'text'],
  }];
}

function familyDetailSections(
  analysis: ExactColumnFamilyAnalysis,
  labels: readonly string[],
): DisplayDetailSection[] {
  return [
    mixedDetailSection('Span Facts', [
      [textPart('Span dimension: '), mathPart(`${analysis.rank}`)],
      [
        textPart('Pivot columns: '),
        mathPart(pivotColumnSetLatex(analysis.pivotColumns)),
      ],
      [
        textPart('Selected basis: '),
        mathPart(selectedBasisSetLatex(labels, analysis.pivotColumns)),
      ],
      ...analysis.pivotColumns.map((column, index) => [mathPart(
        `b_{${index + 1}}=${labels[column]}=${exactVectorToColumnLatex(analysis.imageBasis[index])}`,
      )]),
    ]),
    ...relationDetails(analysis, labels),
    mixedDetailSection('RREF Evidence', [
      [textPart('RREF: '), mathPart(exactMatrixToLatex(analysis.rref))],
      [textPart(analysis.nullity === 0
        ? 'Every input column is a pivot column, so the vector family is linearly independent.'
        : `${analysis.nullity} free coefficient${analysis.nullity === 1 ? ' produces' : 's produce'} nonzero dependence relations.`)],
    ]),
  ];
}

export function runVectorFamilyOperation(req: VectorRequest): VectorResponse {
  const operands = req.vectorOperands ?? [];
  if (operands.length < 1 || operands.length > 6) {
    return vectorFamilyStop(exactVectorFamilyDimensionLimitMessage());
  }
  const length = operands[0]?.length ?? 0;
  if (length < 1 || length > 6) {
    return vectorFamilyStop(exactVectorFamilyDimensionLimitMessage());
  }
  if (operands.some((vector) => vector.length !== length)) {
    return vectorFamilyStop('All vectors in span and independence must have the same length.');
  }

  const exactVectors = exactOperandVectors(req);
  if (!exactVectors) {
    return vectorFamilyStop('Span and independence need exact vector entries in this move.');
  }
  const matrix = exactMatrixFromColumnVectors(exactVectors);
  if (!matrix) {
    return vectorFamilyStop('Span and independence need a complete vector family.');
  }
  const analysis = analyzeExactColumnFamily(matrix);
  if (analysis.kind === 'stop') {
    return vectorFamilyStop(analysis.reason === 'dimension-limit'
      ? exactVectorFamilyDimensionLimitMessage()
      : 'This vector family could not be reduced exactly.');
  }

  const labels = familyLabels(req, operands.length);
  const independent = analysis.nullity === 0;
  const details = familyDetailSections(analysis, labels);
  if (req.operation === 'independent') {
    const resultLatex = `${familyCall('independent', labels)}=\\text{${independent ? 'Yes' : 'No'}}`;
    return {
      resultLatex,
      answerRows: { rows: [{ latex: resultLatex }] },
      detailSections: details,
      warnings: [],
    };
  }

  const resultLatex = `${familyCall('span', labels)}=\\operatorname{span}${selectedBasisLatex(labels, analysis.pivotColumns)}`;
  return {
    resultLatex,
    answerRows: {
      rows: [
        { latex: `\\dim\\operatorname{span}\\left(${labels.join(',')}\\right)=${analysis.rank}` },
        { latex: `\\operatorname{basis}=${selectedBasisLatex(labels, analysis.pivotColumns)}` },
      ],
    },
    detailSections: details,
    warnings: [],
  };
}
