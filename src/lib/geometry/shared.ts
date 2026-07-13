import type {
  DisplayBranchReadback,
  GeometryResultOrigin,
  Point2D,
} from '../../types/calculator';
import { formatNumber, latexToApproxText } from '../display/format';
import { parseSignedNumberInput } from '../numeric/signed-number';
import { profileGeometryResult } from '../display/printer';
import type { GeometryOwnedMathJsonLeaf } from './math-values';

export type GeometryEvaluation = {
  exactLatex?: string;
  branchReadback?: DisplayBranchReadback;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: GeometryResultOrigin;
  mathJsonLeaves?: GeometryOwnedMathJsonLeaf[];
};

export type GeometryRow = {
  label: string;
  latex: string;
  text?: string;
  mathJson?: unknown;
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

export function numericGeometryMathJson(value: number) {
  if (!Number.isFinite(value)) return undefined;
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return Number(normalized.toFixed(6));
}

export function pointGeometryMathJson(x: number, y: number) {
  return ['Delimiter', ['Sequence',
    numericGeometryMathJson(x),
    numericGeometryMathJson(y),
  ], "'(,)'"];
}

export function geometryResult(
  rows: GeometryRow[],
  warnings: string[],
  resultOrigin: GeometryResultOrigin,
): GeometryEvaluation {
  const exactLatex = rows.map((row) => `${row.label}=${row.latex}`).join(',\\ ');
  const mathJson = rows.every((row) => row.mathJson !== undefined)
    ? ['Delimiter', ['Sequence', ...rows.map((row) => ['Equal', row.label, row.mathJson])], "','"]
    : undefined;
  return profileGeometryResult({
    exactLatex,
    approxText: rows
      .map((row) => `${row.label}=${row.text ?? latexToApproxText(row.latex) ?? row.latex}`)
      .join(', '),
    warnings,
    resultOrigin,
    ...(mathJson !== undefined
      ? {
          mathJsonLeaves: [{
            canonicalLatex: exactLatex,
            mathJson,
            source: 'geometry.native-result-rows',
          }],
        }
      : {}),
  });
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
