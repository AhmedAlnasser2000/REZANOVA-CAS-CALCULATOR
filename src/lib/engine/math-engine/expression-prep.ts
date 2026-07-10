import {
  expand,
  factor,
} from '@cortex-js/compute-engine';
import type { EvaluateRequest } from '../../../types/calculator';
import { normalizeDirectionalLimitLatex } from '../../calculus/engine/finite-limit-target';
import { latexToApproxText } from '../../display/format';
import { canonicalizeMathInput } from '../../input/input-canonicalization';
import { rewriteDiscreteOperators } from '../../numeric/discrete-eval';
import { parsePartialDerivativeLatex, resolvePartialDerivative } from '../../symbolic-engine/partials';
import {
  evaluateExactInverseTrigSpecial,
  rewriteDirectTrigAngles,
} from './angle-units';
import { ce } from './math-json';
import type {
  BoxedLike,
  PreparedExpressionRequest,
  PreparedExpressionRuntime,
  SymbolicAction,
} from './types';

function injectAns(latex: string, variables: Record<string, string>) {
  const ans = variables.Ans?.trim();
  if (!ans) {
    return latex;
  }

  return latex.replace(/\bAns\b/g, `\\left(${ans}\\right)`);
}

function isExplicitNegativeFactorial(latex: string) {
  return /^\(\s*-\s*\d+(?:\.\d+)?\s*\)!$/.test(latex.replaceAll('\\left', '').replaceAll('\\right', ''));
}

export function exactExpression(expr: BoxedLike, action: SymbolicAction) {
  switch (action) {
    case 'simplify':
      return expr.simplify();
    case 'factor':
      return factor(expr as unknown as Parameters<typeof factor>[0]) as unknown as BoxedLike;
    case 'expand':
      return expand(expr as unknown as Parameters<typeof expand>[0]) as unknown as BoxedLike;
    case 'evaluate':
      return expr.evaluate();
    case 'solve':
      return expr;
    default:
      return expr;
  }
}

type PreparedExpression =
  | {
      expr: BoxedLike;
      warnings: string[];
    }
  | {
      error: string;
      warnings: string[];
    };

function prepareExpression(expr: BoxedLike, action: SymbolicAction): PreparedExpression {
  if (action !== 'evaluate') {
    return {
      expr,
      warnings: [] as string[],
    };
  }

  const rewritten = rewriteDiscreteOperators(expr.json);
  if (rewritten.kind === 'error') {
    return {
      error: rewritten.error,
      warnings: [] as string[],
    };
  }

  return {
    expr: rewritten.changed
      ? (ce.box(rewritten.node as Parameters<typeof ce.box>[0]) as BoxedLike)
      : expr,
    warnings: [] as string[],
  };
}

export function prepareExpressionRequest(
  request: EvaluateRequest,
  action: SymbolicAction,
): PreparedExpressionRequest {
  const canonicalized = canonicalizeMathInput(request.document.latex, {
    mode: request.mode,
    screenHint: action === 'solve' ? 'symbolic' : 'standard',
  });
  const rawLatex = (canonicalized.ok ? canonicalized.canonicalLatex : request.document.latex).trim();
  const limitNormalized = action === 'evaluate'
    ? normalizeDirectionalLimitLatex(rawLatex)
    : { latex: rawLatex, directionOverride: undefined };
  const normalizedRawLatex = limitNormalized.latex.trim();

  if (!normalizedRawLatex) {
    return {
      kind: 'done',
      response: {
        warnings: [],
        error: 'Enter an expression first.',
      },
    };
  }

  if (action === 'evaluate' && isExplicitNegativeFactorial(normalizedRawLatex)) {
    return {
      kind: 'done',
      response: {
        warnings: [],
        error: 'Factorial is defined only for non-negative integers in this milestone.',
      },
    };
  }

  if (action === 'evaluate') {
    const partial = parsePartialDerivativeLatex(normalizedRawLatex);
    if (partial) {
      const resolved = resolvePartialDerivative(partial);
      if (resolved.kind === 'error') {
        return {
          kind: 'done',
          response: {
            warnings: [],
            error: resolved.error,
          },
        };
      }

      return {
        kind: 'done',
        response: {
          exactLatex: resolved.exactLatex,
          approxText: latexToApproxText(resolved.exactLatex),
          normalizedMathJson: request.document.mathJson,
          warnings: [],
          resultOrigin: 'symbolic-engine',
        },
      };
    }
  }

  return {
    kind: 'ready',
    rawLatex: normalizedRawLatex,
    limitDirectionOverride: limitNormalized.directionOverride,
  };
}

export function prepareExpressionRuntime(
  request: EvaluateRequest,
  action: SymbolicAction,
  rawLatex: string,
): PreparedExpressionRuntime {
  const sourceLatex = injectAns(rawLatex, request.variables);
  const parsedExpr = ce.parse(sourceLatex) as BoxedLike;
  const exactInverseTrig =
    request.mode === 'calculate' && action === 'evaluate'
      ? evaluateExactInverseTrigSpecial(parsedExpr.json, request.angleUnit)
      : undefined;
  if (exactInverseTrig) {
    return {
      kind: 'done',
      response: {
        ...exactInverseTrig,
        normalizedMathJson: parsedExpr.json,
        warnings: [],
        resultOrigin: 'exact-special-angle',
      },
    };
  }
  const angleAwareExpr =
    request.mode === 'calculate' && action === 'evaluate'
      ? (() => {
          const rewrittenJson = rewriteDirectTrigAngles(parsedExpr.json, request.angleUnit);
          return rewrittenJson === parsedExpr.json
            ? parsedExpr
            : (ce.box(rewrittenJson as Parameters<typeof ce.box>[0]) as BoxedLike);
        })()
      : parsedExpr;

  const prepared = prepareExpression(angleAwareExpr, action);
  if ('error' in prepared) {
    return {
      kind: 'done',
      response: {
        warnings: prepared.warnings,
        error: prepared.error,
      },
    };
  }

  return {
    kind: 'ready',
    expr: prepared.expr,
    sourceLatex,
    warnings: prepared.warnings,
  };
}
