import { ComputeEngine } from '@cortex-js/compute-engine';
import { clampSeriesOrder } from './examples';
import type {
  CalculusResultOrigin,
  SeriesState,
} from '../../../types/calculator';
import { profileCalculusResult } from '../../display/printer';
import type { CalculusOwnedMathJsonLeaf } from '../engine/shared';

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
  resultOrigin?: CalculusResultOrigin;
  mathJsonLeaves?: CalculusOwnedMathJsonLeaf[];
};

type SeriesCoefficient = { latex: string; mathJson: unknown };
type SeriesTerm = { latex: string; mathJson: unknown };

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

function seriesCoefficient(derivative: BoxedLike, center: number, order: number): SeriesCoefficient | undefined {
  const value = derivative.subs({ x: center }).evaluate();
  if (value.latex.includes('x')) {
    return undefined;
  }

  if (order === 0) {
    return { latex: value.latex, mathJson: value.json };
  }

  const coefficient = box(['Divide', value.json, factorial(order)]).simplify();
  return { latex: coefficient.latex, mathJson: coefficient.json };
}

function normalizeCoefficient(latex: string) {
  return latex
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\s+/g, '')
    .trim();
}

function buildTerm(coefficient: SeriesCoefficient, order: number, center: number): SeriesTerm | undefined {
  const normalized = normalizeCoefficient(coefficient.latex);
  if (normalized === '0') {
    return undefined;
  }

  if (order === 0) {
    return { latex: coefficient.latex, mathJson: coefficient.mathJson };
  }

  const baseLatex = center === 0
    ? (order === 1 ? 'x' : `x^{${order}}`)
    : (order === 1
      ? `\\left(x-${center}\\right)`
      : `\\left(x-${center}\\right)^{${order}}`);
  const centered: unknown = center === 0 ? 'x' : ['Subtract', 'x', center];
  const baseMathJson: unknown = order === 1 ? centered : ['Power', centered, order];

  if (normalized === '1') {
    return { latex: baseLatex, mathJson: baseMathJson };
  }

  if (normalized === '-1') {
    return { latex: `-${baseLatex}`, mathJson: ['Negate', baseMathJson] };
  }

  return {
    latex: `${coefficient.latex}${baseLatex}`,
    mathJson: ['Multiply', coefficient.mathJson, baseMathJson],
  };
}

function joinTerms(terms: readonly SeriesTerm[]) {
  return terms.reduce((result, term, index) => {
    if (index === 0) {
      return term.latex;
    }

    return term.latex.startsWith('-') ? `${result}${term.latex}` : `${result}+${term.latex}`;
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
  const terms: SeriesTerm[] = [];
  let derivative = parsed;

  for (let degree = 0; degree <= order; degree += 1) {
    const coeff = seriesCoefficient(derivative, center, degree);
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

  const exactLatex = joinTerms(terms) || '0';
  const answerMathJson = terms.length === 0
    ? 0
    : terms.length === 1
      ? terms[0].mathJson
      : ['Add', ...terms.map((term) => term.mathJson)];
  return profileCalculusResult({
    exactLatex,
    warnings: [],
    resultOrigin: 'heuristic-symbolic',
    mathJsonLeaves: [{
      canonicalLatex: exactLatex,
      mathJson: answerMathJson,
      source: 'calculus.series:native-coefficients-answer',
    }],
  }) satisfies AdvancedSeriesEvaluation;
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
      error: 'Taylor center must be numeric in Calculus.',
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
