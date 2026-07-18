import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  complexSolutionsToApproxText,
  complexSolutionsToLatex,
} from '../../display/format';
import { runExpressionAction } from '../../engine/math-engine';
import { solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { solvePolynomialRoots } from '../../algebra/polynomial-roots';
import { buildRuntimeOutcome } from '../../kernel/runtime-envelope';
import {
  buildPolynomialEquationLatex,
  normalizedPolynomialCoefficients,
  POLYNOMIAL_VIEW_META,
} from '../equation-ui-model';
import type {
  AngleUnit,
  ResultProducerDraft,
  EquationDomainIntent,
  EquationSystemCell,
  OutputStyle,
  PolynomialEquationView,
} from '../../../types/calculator';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';
import { tryEquationMathValuesFromOwnedPayload } from '../../equation/solve-result/math-values';
import { solveGuidedLinearSystem } from './guided-linear-system';

const ce = new ComputeEngine();

export function solveSystem(source: EquationSystemCell[][], size: 2 | 3): ResultProducerDraft {
  return solveGuidedLinearSystem(source, size);
}

export function solvePolynomial(
  screen: PolynomialEquationView,
  coefficients: number[],
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationDomainIntent: EquationDomainIntent = 'real',
): ResultProducerDraft {
  const meta = POLYNOMIAL_VIEW_META[screen];
  const normalized = normalizedPolynomialCoefficients(coefficients, meta.degree + 1);

  if (Math.abs(normalized[0]) < 1e-10) {
    return createEquationResultOutcome({
      kind: 'error',
      title: meta.title,
      error: `Set ${meta.coefficientLabels[0]} to a non-zero value for the ${meta.title.toLowerCase()} equation.`,
      warnings: [],
    });
  }

  const polynomialLatex = buildPolynomialEquationLatex(screen, normalized);
  if (screen === 'cubic' || screen === 'quartic') {
    const bounded = solveBoundedPolynomialEquationAst(ce.parse(polynomialLatex).json, 'x');
    if (bounded) {
      return createEquationResultOutcome(buildRuntimeOutcome({
        title: meta.title,
        exactLatex: bounded.exactLatex,
        approxText: bounded.approxText,
        warnings: [],
        resultOrigin: 'symbolic',
      }));
    }
  }

  const response = screen === 'quadratic'
    ? runExpressionAction(
      {
        mode: 'equation',
        document: { latex: polynomialLatex },
        angleUnit,
        outputStyle,
        variables: { Ans: ansLatex },
      },
      'solve',
    )
    : {
      exactLatex: undefined,
      exactSupplementLatex: undefined,
      approxText: undefined,
      warnings: [] as string[],
      error: 'No bounded exact symbolic solution was found.',
    };

  if (screen === 'quadratic' && !response.error && response.exactLatex) {
    const outcome = buildRuntimeOutcome({
      title: meta.title,
      exactLatex: response.exactLatex,
      exactSupplementLatex: response.exactSupplementLatex,
      approxText: response.approxText,
      warnings: response.warnings,
      resultOrigin: 'symbolic',
    });
    const mathValues = response.answerMathJson === undefined
      ? undefined
      : tryEquationMathValuesFromOwnedPayload({
          primaryMath: {
            canonicalLatex: response.exactLatex,
            mathJson: response.answerMathJson,
          },
          routeId: 'equation.polynomial',
          source: 'equation.guided-quadratic:native-expression-answer',
        });
    return createEquationResultOutcome(
      outcome,
      mathValues ? { mathValues } : undefined,
    );
  }

  const numericRoots = solvePolynomialRoots({ coefficients: normalized });
  if (numericRoots.kind === 'error') {
    return createEquationResultOutcome({
      kind: 'error',
      title: meta.title,
      error: response.error ?? numericRoots.error,
      warnings: response.warnings,
    });
  }

  const hasComplexRoots = numericRoots.roots.some((root) => Math.abs(root.im) > 1e-10);
  return profileEquationResult(createEquationResultOutcome({
    kind: 'success',
    title: meta.title,
    exactLatex: complexSolutionsToLatex('x', numericRoots.roots),
    approxText: complexSolutionsToApproxText('x', numericRoots.roots),
    warnings: ['Symbolic solve unavailable; showing numeric roots.'],
    resultOrigin: 'numeric-fallback',
    ...(equationDomainIntent === 'complex' && hasComplexRoots ? { answerDomain: 'complex' as const } : {}),
  }));
}
