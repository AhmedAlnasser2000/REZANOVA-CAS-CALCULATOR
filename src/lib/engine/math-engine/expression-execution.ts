import type { EvaluateResponse, SerializableMathJson } from '../../../types/calculator';
import { resolveCalculusEvaluation } from '../../calculus/engine/eval';
import { latexToApproxText, solutionsToLatex } from '../../display/format';
import { canUseExpressionNumericFallback } from '../../kernel/runtime-profile';
import {
  containsRealNumericFamily,
  evaluateRealNumericExpression,
} from '../../numeric/real-numeric-eval';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { assumptionFactsToDetailSections } from '../../algebra/assumption-readback';
import { getResultGuardError } from '../result-guard';
import { normalizeExactAbsoluteValueNode } from '../../algebra/abs-core';
import { factorMathJson } from '../../algebra/symbolic-factor';
import { runFactoringEngine } from '../../symbolic-engine/orchestrator';
import { normalizeExactPowerLogNode } from '../../symbolic-engine/power-log';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { detectRealRangeImpossibility } from '../../equation/range-impossibility';
import {
  ce,
  isNumericOnlyNode,
  numericExpression,
  readNumericValue,
} from './math-json';
import { exactExpression } from './expression-prep';
import type {
  BoxedLike,
  ExpressionActionContext,
} from './types';

function normalizedSupplementLatex(
  left: string[] | undefined,
  right: string[] | undefined,
) {
  const merged = mergeExactSupplementLatex(
    { latex: left, source: 'legacy' },
    { latex: right, source: 'legacy' },
  );
  return merged.length > 0 ? merged : undefined;
}

function answerMathJson(node: unknown): SerializableMathJson {
  return node as SerializableMathJson;
}

function solutionApproximationText(symbol: string, solutions: unknown[]) {
  const approximations = solutions
    .map((solution) => {
      const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
      const numeric = boxed.N?.() ?? boxed.evaluate();
      return latexToApproxText(numeric.latex);
    })
    .filter((value): value is string => Boolean(value));

  if (approximations.length === 0) {
    return undefined;
  }

  return approximations.length === 1
    ? `${symbol} ~= ${approximations[0]}`
    : `${symbol} ~= ${approximations.join(', ')}`;
}

function numericSolutionValues(solutions: unknown[]) {
  return solutions.map((solution) => {
    const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
    const numeric = boxed.N?.() ?? boxed.evaluate();
    return readNumericValue(numeric.json);
  });
}

function guardSolvedSolutions(solutions: unknown[]) {
  for (const solution of solutions) {
    const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const guardError = getResultGuardError(numeric?.latex, boxed?.latex);
    if (guardError) {
      return guardError;
    }
  }

  return undefined;
}

function isCollapsedPowerSingularity(node: unknown, rawLatex: string) {
  return (
    typeof node === 'string'
    && (node === 'NaN' || node === 'ComplexInfinity')
    && rawLatex.includes('^')
  );
}

function shouldUseRealNumericEvaluator(expr: BoxedLike, rawLatex: string) {
  return (
    containsRealNumericFamily(expr.json)
    && isNumericOnlyNode(expr.json)
  ) || isCollapsedPowerSingularity(expr.json, rawLatex);
}

function isInvalidRealNumericApprox(approxLatex?: string) {
  const approxText = latexToApproxText(approxLatex);
  return !approxText || approxText.includes('i') || approxText.includes('NaN');
}

export function executePreparedExpressionAction(
  context: ExpressionActionContext,
): EvaluateResponse {
  const { request, action, executionBudget, preparedRequest, preparedRuntime } = context;
  const { expr, sourceLatex, warnings } = preparedRuntime;

  const radical =
    action === 'simplify' || action === 'factor'
      ? normalizeExactRadicalNode(expr.json, action)
      : action === 'expand'
        ? normalizeExactRadicalNode(exactExpression(expr, action).json, 'expand')
        : null;

  const radicalExpr = radical
    ? (ce.box(radical.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike)
    : expr;
  const radicalSupplementLatex = radical?.exactSupplementLatex ?? [];
  const absoluteValue =
    action === 'simplify'
      ? normalizeExactAbsoluteValueNode(radicalExpr.json)
      : null;
  const simplifyNormalizedExpr = absoluteValue
    ? (ce.box(absoluteValue.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike)
    : radicalExpr;
  const simplifySupplementLatex = action === 'simplify'
    ? mergeExactSupplementLatex(
      { latex: radicalSupplementLatex, source: 'radical-domain' },
      { latex: absoluteValue?.exactSupplementLatex, source: 'legacy' },
    )
    : radicalSupplementLatex;

  const rational =
    action === 'simplify'
      ? normalizeExactRationalNode(simplifyNormalizedExpr.json, action)
      : action === 'factor'
        ? normalizeExactRationalNode(radicalExpr.json, action)
      : null;
  if (rational) {
      const rationalDetailSections = assumptionFactsToDetailSections(rational.assumptionFacts);
      const detailSections = rationalDetailSections.length > 0 ? rationalDetailSections : undefined;
      const powerLog =
        action === 'simplify'
          ? normalizeExactPowerLogNode(rational.normalizedNode, 'simplify')
          : null;
      const exactExpr = ce.box(rational.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike;
      const approx = isNumericOnlyNode(exactExpr.json)
        ? numericExpression(exactExpr)
        : undefined;
      const exactSupplementLatex = mergeExactSupplementLatex(
        { latex: simplifySupplementLatex, source: 'legacy' },
        { latex: rational.exactSupplementLatex, source: 'denominator' },
      );
      if (powerLog?.changed) {
        return {
          exactLatex: powerLog.normalizedLatex,
          answerMathJson: answerMathJson(powerLog.normalizedNode),
          exactSupplementLatex: normalizedSupplementLatex(
              exactSupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
          detailSections,
        };
      }
      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'symbolic-normalization-recovery',
        )
        && shouldUseRealNumericEvaluator(expr, sourceLatex)
        && isInvalidRealNumericApprox(approx?.latex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
              exactSupplementLatex,
              detailSections,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            exactSupplementLatex,
            approxText: numeric.approxText,
            normalizedMathJson: rational.normalizedNode,
            warnings,
            resultOrigin: 'numeric-fallback',
            detailSections,
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
            exactSupplementLatex,
            detailSections,
          };
        }
      }
      const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
      if (guardError) {
        return {
          warnings,
          error: guardError,
          exactSupplementLatex,
          detailSections,
        };
      }

      return {
        exactLatex: rational.normalizedLatex,
        answerMathJson: answerMathJson(rational.normalizedNode),
        exactSupplementLatex,
        approxText: latexToApproxText(approx?.latex),
        normalizedMathJson: rational.normalizedNode,
        warnings,
        resultOrigin: 'symbolic-engine',
        detailSections,
      };
    }

    if ((radical || absoluteValue) && action === 'simplify') {
      const powerLog = normalizeExactPowerLogNode(simplifyNormalizedExpr.json, 'simplify');
      const approx = isNumericOnlyNode(simplifyNormalizedExpr.json)
        ? numericExpression(simplifyNormalizedExpr)
        : undefined;
      if (powerLog?.changed) {
        return {
          exactLatex: powerLog.normalizedLatex,
          answerMathJson: answerMathJson(powerLog.normalizedNode),
          exactSupplementLatex: normalizedSupplementLatex(
              simplifySupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
        };
      }
      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'symbolic-normalization-recovery',
        )
        &&
        shouldUseRealNumericEvaluator(expr, sourceLatex)
        && isInvalidRealNumericApprox(approx?.latex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
              exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
            approxText: numeric.approxText,
            normalizedMathJson: simplifyNormalizedExpr.json,
            warnings,
            resultOrigin: 'numeric-fallback',
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
            exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
          };
        }
      }
      const guardError = getResultGuardError(approx?.latex, simplifyNormalizedExpr?.latex);
      if (guardError) {
        return {
          warnings,
          error: guardError,
          exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
        };
      }

      return {
        exactLatex: absoluteValue?.normalizedLatex ?? radical?.normalizedLatex,
        answerMathJson: simplifyNormalizedExpr.json,
        exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
        approxText: latexToApproxText(approx?.latex),
        normalizedMathJson: simplifyNormalizedExpr.json,
        warnings,
        resultOrigin: 'symbolic-engine',
      };
    }

    if (action === 'simplify') {
      const powerLog = normalizeExactPowerLogNode(simplifyNormalizedExpr.json, 'simplify');
      if (powerLog?.handled) {
        if (
          canUseExpressionNumericFallback(
            executionBudget,
            action,
            'symbolic-normalization-recovery',
          )
          && shouldUseRealNumericEvaluator(expr, sourceLatex)
        ) {
          const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
          if (numeric.kind === 'success') {
            const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
            if (guardError) {
              return {
                warnings,
                error: guardError,
              };
            }

            return {
              exactLatex: numeric.exactLatex,
              approxText: numeric.approxText,
              normalizedMathJson: expr.json,
              warnings,
              resultOrigin: 'numeric-fallback',
            };
          }

          if (numeric.kind === 'domain-error') {
            return {
              warnings,
              error: numeric.error,
            };
          }
        }

        const exactExpr = ce.box(powerLog.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike;
        const approx = isNumericOnlyNode(exactExpr.json)
          ? numericExpression(exactExpr)
          : undefined;
        return {
          exactLatex: powerLog.normalizedLatex,
          answerMathJson: answerMathJson(powerLog.normalizedNode),
          exactSupplementLatex: normalizedSupplementLatex(
              simplifySupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
        };
      }
    }

    if (action === 'solve') {
      const rangeImpossibility = detectRealRangeImpossibility(sourceLatex);
      if (rangeImpossibility.kind === 'impossible') {
        return {
          warnings: [],
          normalizedMathJson: expr.json,
          error: rangeImpossibility.error,
        };
      }

      const solutions = expr.solve?.('x');
      if (!Array.isArray(solutions) || solutions.length === 0) {
        return {
          warnings: [],
          normalizedMathJson: expr.json,
          error: 'No symbolic solution was found for x.',
        };
      }

      const guardError = guardSolvedSolutions(solutions);
      if (guardError) {
        return {
          warnings: [],
          normalizedMathJson: expr.json,
          error: guardError,
        };
      }

      const exactLatex = solutionsToLatex(
        'x',
        solutions.map((solution) => ce.box(solution).latex),
      );

      return {
        exactLatex,
        approxText: solutionApproximationText('x', solutions),
        normalizedMathJson: expr.json,
        rawSolutions: solutions,
        rawSolutionLatex: solutions.map((solution) => ce.box(solution as Parameters<typeof ce.box>[0]).latex),
        numericSolutions: numericSolutionValues(solutions),
        warnings: [],
      };
    }

    const exact =
      action === 'expand' && radical
        ? radicalExpr
        : exactExpression(radicalExpr, action);
    if (action === 'evaluate') {
      const calculus = resolveCalculusEvaluation(
        expr,
        exact,
        preparedRequest.limitDirectionOverride
          ? {
              ...request.calculusOptions,
              limitDirection: preparedRequest.limitDirectionOverride,
            }
          : request.calculusOptions,
      );
      if (calculus.kind === 'error') {
          return {
            warnings: [...warnings, ...calculus.warnings],
            error: calculus.error,
            detailSections: calculus.detailSections,
          };
        }

      if (calculus.kind === 'handled') {
        const guardError = getResultGuardError(calculus.exactLatex, calculus.approxText);
          if (guardError) {
            return {
              warnings: [...warnings, ...calculus.warnings],
              error: guardError,
              detailSections: calculus.detailSections,
            };
          }

        return {
            exactLatex: calculus.exactLatex,
            answerRows: calculus.answerRows,
            approxText: calculus.approxText,
            normalizedMathJson: expr.json,
            warnings: [...warnings, ...calculus.warnings],
            resultOrigin: calculus.resultOrigin,
            calculusStrategy: calculus.integrationStrategy,
            calculusDerivativeStrategies: calculus.derivativeStrategies,
            detailSections: calculus.detailSections,
          };
        }

      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'evaluate-real-family',
        )
        && shouldUseRealNumericEvaluator(expr, sourceLatex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            approxText: numeric.approxText,
            normalizedMathJson: expr.json,
            warnings,
            resultOrigin: 'numeric-fallback',
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
          };
        }
      }
    }

    const factorSourceNode = radical?.normalizedNode ?? expr.json;
    const factorSourceLatex = radical?.normalizedLatex ?? preparedRequest.rawLatex;
    const factorOutcome =
      action === 'factor'
        ? runFactoringEngine(factorSourceLatex)
        : undefined;
    const symbolicFactorSucceeded =
      factorOutcome?.kind === 'success' && factorOutcome.strategy !== 'none';
    const fallbackExact = factorOutcome?.kind === 'success'
      && factorOutcome.strategy !== 'none'
      ? factorMathJson(factorSourceNode)
      : undefined;
    const exactExpr = fallbackExact
      ? (ce.box(fallbackExact as Parameters<typeof ce.box>[0]) as BoxedLike)
      : exact;
    const approx = isNumericOnlyNode(exactExpr?.json ?? radicalExpr.json)
      ? numericExpression(exactExpr)
      : undefined;
    if (
      canUseExpressionNumericFallback(
        executionBudget,
        action,
        'symbolic-normalization-recovery',
      )
      && shouldUseRealNumericEvaluator(expr, sourceLatex)
      && isInvalidRealNumericApprox(approx?.latex)
    ) {
      const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
      if (numeric.kind === 'success') {
        const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
        if (guardError) {
          return {
            warnings,
            error: guardError,
            exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
          };
        }

        return {
          exactLatex: numeric.exactLatex,
          exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
          approxText: numeric.approxText,
          normalizedMathJson: radical?.normalizedNode ?? expr.json,
          warnings,
          resultOrigin: 'numeric-fallback',
        };
      }

      if (numeric.kind === 'domain-error') {
        return {
          warnings,
          error: numeric.error,
          exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
        };
      }
    }
    const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
    if (guardError) {
      return {
        warnings,
        error: guardError,
        exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
      };
    }

    return {
      exactLatex: exactExpr?.latex ?? radicalExpr.latex,
      answerMathJson: exactExpr?.json ?? radicalExpr.json,
      exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
      approxText: latexToApproxText(approx?.latex),
      normalizedMathJson: radical?.normalizedNode ?? expr.json,
      warnings:
        action === 'factor' && (exactExpr?.latex ?? radicalExpr.latex) === radicalExpr.latex
          ? radical
            ? warnings
            : ['No simpler factorization was found for this expression.']
          : action === 'factor' && symbolicFactorSucceeded
            ? [`Factored via ${factorOutcome.strategy!.replaceAll('-', ' ')}.`]
            : warnings,
      resultOrigin:
        radical
          ? 'symbolic-engine'
          : action === 'factor' && symbolicFactorSucceeded
          ? 'symbolic-engine'
          : undefined,
    };
}
