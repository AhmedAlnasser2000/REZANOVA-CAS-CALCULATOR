import type { DisplayDetailSection } from '../../types/calculator';
import type { ExactRowOperation } from './exact-matrix-core';
import { exactScalarToLatex } from './exact-matrix-format';
import type { ExactScalar } from '../algebra/polynomial-core';

const ROW_REDUCTION_STEPS_TITLE = 'Row Reduction Steps';

function rowLabel(row: number) {
  return `R_{${row + 1}}`;
}

function isOne(value: ExactScalar) {
  return value.numerator === value.denominator;
}

function isNegativeOne(value: ExactScalar) {
  return value.numerator === -value.denominator;
}

function absoluteScalar(value: ExactScalar): ExactScalar {
  return {
    numerator: Math.abs(value.numerator),
    denominator: value.denominator,
  };
}

function coefficientPrefix(value: ExactScalar) {
  if (isOne(value)) {
    return '';
  }
  if (isNegativeOne(value)) {
    return '-';
  }
  return exactScalarToLatex(value);
}

export function formatRowOperation(operation: ExactRowOperation): string | null {
  if (operation.kind === 'swap') {
    return `${rowLabel(operation.rowA)}\\leftrightarrow ${rowLabel(operation.rowB)}`;
  }

  if (operation.kind === 'scale') {
    if (isOne(operation.factor)) {
      return null;
    }
    return `${rowLabel(operation.row)}\\leftarrow ${coefficientPrefix(operation.factor)}${rowLabel(operation.row)}`;
  }

  const target = rowLabel(operation.targetRow);
  const pivot = rowLabel(operation.pivotRow);
  const magnitude = absoluteScalar(operation.factor);
  const prefix = coefficientPrefix(magnitude);
  const sign = operation.factor.numerator < 0 ? '+' : '-';
  return `${target}\\leftarrow ${target}${sign}${prefix}${pivot}`;
}

export function rowOperationDetailSection(
  operations: readonly ExactRowOperation[],
): DisplayDetailSection {
  const lines = operations
    .map(formatRowOperation)
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return {
      title: ROW_REDUCTION_STEPS_TITLE,
      lines: ['The matrix was already in reduced row echelon form.'],
      lineKind: 'text',
    };
  }

  return {
    title: ROW_REDUCTION_STEPS_TITLE,
    lines,
    lineKind: 'math',
  };
}
