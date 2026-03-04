import { ComputeEngine } from '@cortex-js/compute-engine';
import { clampSeriesOrder } from './examples';
import type {
  AdvancedCalcResultOrigin,
  SeriesState,
} from '../../types/calculator';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  simplify: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type AdvancedSeriesEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: AdvancedCalcResultOrigin;
};

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
}

function coefficientLatex(derivative: BoxedLike, center: number, order: number) {
  const value = derivative.subs({ x: center }).evaluate();
  if (value.latex.includes('x')) {
    return undefined;
  }

  if (order === 0) {
    return value.latex;
  }

  return box(['Divide', value.json, factorial(order)]).simplify().latex;
}

function normalizeCoefficient(latex: string) {
  return latex
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\s+/g, '')
    .trim();
}

function buildTerm(coefficient: string, order: number, center: number) {
  const normalized = normalizeCoefficient(coefficient);
  if (normalized === '0') {
    return undefined;
  }

  if (order === 0) {
    return coefficient;
  }

  const base = center === 0
    ? (order === 1 ? 'x' : `x^{${order}}`)
    : (order === 1
      ? `\\left(x-${center}\\right)`
      : `\\left(x-${center}\\right)^{${order}}`);

  if (normalized === '1') {
    return base;
  }

  if (normalized === '-1') {
    return `-${base}`;
  }

  return `${coefficient}${base}`;
}

function joinTerms(terms: string[]) {
  return terms.reduce((result, term, index) => {
    if (index === 0) {
      return term;
    }

    return term.startsWith('-') ? `${result}${term}` : `${result}+${term}`;
  }, '');
}

function evaluateSeries(state: SeriesState, center: number) {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an expression before expanding a series.',
    } satisfies AdvancedSeriesEvaluation;
  }

  const order = clampSeriesOrder(state.order);
  const parsed = ce.parse(bodyLatex) as BoxedLike;
  const terms: string[] = [];
  let derivative = parsed;

  for (let degree = 0; degree <= order; degree += 1) {
    const coeff = coefficientLatex(derivative, center, degree);
    if (!coeff) {
      return {
        warnings: [],
        error: 'This series expansion is not supported at the selected center.',
      } satisfies AdvancedSeriesEvaluation;
    }

    const term = buildTerm(coeff, degree, center);
    if (term) {
      terms.push(term);
    }

    derivative = box(['D', derivative.json, 'x']).evaluate();
    if (derivative.latex.includes('\\frac{\\mathrm{d}}{\\mathrm{d}')) {
      return {
        warnings: [],
        error: 'This series expansion is not supported at the selected center.',
      } satisfies AdvancedSeriesEvaluation;
    }
  }

  return {
    exactLatex: joinTerms(terms) || '0',
    warnings: [],
    resultOrigin: 'heuristic-symbolic',
  } satisfies AdvancedSeriesEvaluation;
}

export function evaluateMaclaurinSeries(state: SeriesState): AdvancedSeriesEvaluation {
  if (state.kind !== 'maclaurin') {
    return {
      warnings: [],
      error: 'Maclaurin mode expects a Maclaurin series request.',
    };
  }

  return evaluateSeries({ ...state, center: '0' }, 0);
}

export function evaluateTaylorSeries(state: SeriesState): AdvancedSeriesEvaluation {
  if (state.kind !== 'taylor') {
    return {
      warnings: [],
      error: 'Taylor mode expects a Taylor series request.',
    };
  }

  const center = Number(state.center);
  if (!Number.isFinite(center)) {
    return {
      warnings: [],
      error: 'Taylor center must be numeric in Advanced Calc.',
    };
  }

  if (state.order < 1 || state.order > 8) {
    return {
      warnings: [],
      error: 'Series order must stay between 1 and 8.',
    };
  }

  return evaluateSeries(state, center);
}
