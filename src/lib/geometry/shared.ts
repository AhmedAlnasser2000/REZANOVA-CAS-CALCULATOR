import type {
  GeometryResultOrigin,
  Point2D,
} from '../../types/calculator';
import { formatNumber, latexToApproxText } from '../format';
import { parseSignedNumberInput } from '../signed-number';

export type GeometryEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: GeometryResultOrigin;
};

export type GeometryRow = {
  label: string;
  latex: string;
  text?: string;
};

const EPSILON = 1e-9;

export function parsePositiveDraft(value: string) {
  const parsed = parseSignedNumberInput(value);
  if (parsed === null) {
    return null;
  }
  return parsed > 0 ? parsed : null;
}

export function parsePointDraft(point: Point2D) {
  return {
    x: parseSignedNumberInput(point.x),
    y: parseSignedNumberInput(point.y),
  };
}

export function nearlyEqual(left: number, right: number, epsilon = EPSILON) {
  return Math.abs(left - right) < epsilon;
}

export function numericLatex(value: number) {
  return formatNumber(value);
}

export function geometryResult(
  rows: GeometryRow[],
  warnings: string[],
  resultOrigin: GeometryResultOrigin,
): GeometryEvaluation {
  return {
    exactLatex: rows.map((row) => `${row.label}=${row.latex}`).join(',\\ '),
    approxText: rows
      .map((row) => `${row.label}=${row.text ?? latexToApproxText(row.latex) ?? row.latex}`)
      .join(', '),
    warnings,
    resultOrigin,
  };
}

export function geometryError(error: string): GeometryEvaluation {
  return {
    error,
    warnings: [],
  };
}

export function pointLatex(x: number, y: number) {
  return `\\left(${numericLatex(x)},${numericLatex(y)}\\right)`;
}

