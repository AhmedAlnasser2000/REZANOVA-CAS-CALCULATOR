import { complexToApproxText, complexToLatex, type ComplexValue } from './complex';

const EPSILON = 1e-10;

function normalizeZero(value: number) {
  return Math.abs(value) < EPSILON ? 0 : value;
}

export function formatNumber(value: number, digits = 6) {
  if (!Number.isFinite(value)) {
    return 'undefined';
  }

  const normalized = normalizeZero(value);
  const rounded = Number.parseFloat(normalized.toFixed(digits));
  return `${rounded}`;
}

export function numberToLatex(value: number, digits = 6) {
  const text = formatNumber(value, digits);
  return text === 'undefined' ? '\\text{undefined}' : text;
}

export function scalarToLatex(value: number) {
  return numberToLatex(value);
}

export function matrixToLatex(matrix: number[][]) {
  const body = matrix
    .map((row) => row.map((cell) => numberToLatex(cell)).join(' & '))
    .join('\\\\');

  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function vectorToLatex(vector: number[]) {
  const body = vector.map((cell) => numberToLatex(cell)).join('\\\\');
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function solutionsToLatex(symbol: string, solutions: string[]) {
  if (solutions.length === 0) {
    return `\\text{No solution for } ${symbol}`;
  }

  if (solutions.length === 1) {
    return `${symbol}=${solutions[0]}`;
  }

  return `${symbol}\\in\\left\\{${solutions.join(', ')}\\right\\}`;
}

export function complexSolutionsToLatex(
  symbol: string,
  roots: ComplexValue[],
  approximate = true,
) {
  if (roots.length === 0) {
    return `\\text{No solution for } ${symbol}`;
  }

  const relation = approximate ? '\\approx' : '=';
  const formattedRoots = roots.map((root) => complexToLatex(root));

  if (formattedRoots.length === 1) {
    return `${symbol}${relation}${formattedRoots[0]}`;
  }

  return `${symbol}${relation}\\left\\{${formattedRoots.join(', ')}\\right\\}`;
}

export function complexSolutionsToApproxText(symbol: string, roots: ComplexValue[]) {
  if (roots.length === 0) {
    return undefined;
  }

  const formattedRoots = roots.map((root) => complexToApproxText(root));
  return formattedRoots.length === 1
    ? `${symbol} ~= ${formattedRoots[0]}`
    : `${symbol} ~= ${formattedRoots.join(', ')}`;
}

export function latexToApproxText(latex?: string) {
  if (!latex) {
    return undefined;
  }

  return latex
    .replaceAll('\\,', '')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\cdot', '\u00B7')
    .replaceAll('\\times', '\u00D7')
    .replaceAll('\\imaginaryI', 'i')
    .trim();
}
