import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

export function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

export function wrapGroupedLatex(latex: string) {
  if (/^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex)) {
    return latex;
  }

  if (/^\\(?:sin|cos|tan|cot|sec|csc|ln|log|arcsin|arccos|arctan|arcsec|arccsc|arccot)\\left\(.+\\right\)(?:\^\{?[-+]?\d+\}?)?$/.test(latex)) {
    return latex;
  }

  return `\\left(${latex}\\right)`;
}

export function multiplyLatex(left: string, right: string) {
  if (left === '1') {
    return right;
  }

  if (left === '-1') {
    return `-${wrapGroupedLatex(right)}`;
  }

  return `${left}${wrapGroupedLatex(right)}`;
}

export function divideByNumericCoefficient(numeratorLatex: string, denominator: number) {
  if (denominator === 1) {
    return numeratorLatex;
  }

  if (denominator === -1) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  return `\\frac{${numeratorLatex}}{${boxLatex(denominator)}}`;
}
