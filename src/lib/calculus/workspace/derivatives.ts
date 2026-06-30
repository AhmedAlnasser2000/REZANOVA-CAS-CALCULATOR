import {
  boxNode,
  ce,
  nodeToFiniteNumber,
} from '../engine/shared';
import {
  differentiateAstWithMetadata,
  simplifyNode,
  UnsupportedDifferentiationFallbackError,
} from '../../symbolic-engine/differentiation';
import {
  classifyDerivativePreflight,
  type DerivativePreflightResult,
} from '../../symbolic-engine/differentiation-preflight';
import { normalizeAst } from '../../symbolic-engine/normalize';
import type {
  CalculusDerivativeStrategy,
  DerivativeVariable,
} from '../../../types/calculator';
import type { DerivativeOperatorSpec } from '../derivative-operator';
import type { CalculusWorkspaceEvaluation } from './integrals';

type HigherOrderDerivativeRequest = {
  bodyLatex: string;
  operator: DerivativeOperatorSpec;
};

type HigherOrderDerivativeAtPointRequest = HigherOrderDerivativeRequest & {
  pointLatex: string;
};

type MixedPartialDerivativeRequest = {
  bodyLatex: string;
  operator: DerivativeOperatorSpec;
};

type DifferentiationPassResult =
  | {
      ok: true;
      ast: unknown;
      strategies: CalculusDerivativeStrategy[];
    }
  | {
      ok: false;
      error: string;
    };

function derivativePreflightError(preflight: DerivativePreflightResult) {
  if (preflight.kind === 'malformed') {
    return 'This derivative input could not be parsed as a supported expression.';
  }

  if (preflight.kind === 'too-complex') {
    return 'This derivative is too complex for the current symbolic differentiator. Try simplifying it first.';
  }

  return 'This derivative uses an unsupported expression form in this milestone.';
}

function preflightBlocksSymbolic(preflight: DerivativePreflightResult) {
  return preflight.kind === 'unsupported'
    || preflight.kind === 'too-complex'
    || preflight.kind === 'malformed';
}

function derivativeFallbackMode(preflight: DerivativePreflightResult) {
  return preflight.kind === 'direct-symbolic' ? 'deny' : 'allow';
}

function renderNodeLatex(node: unknown) {
  return boxNode(normalizeAst(simplifyNode(node))).latex;
}

function parseLatexNode(latex: string) {
  return ce.parse(latex).json;
}

function replaceSymbol(node: unknown, variable: DerivativeVariable, replacement: unknown): unknown {
  if (typeof node === 'string') {
    return node === variable ? replacement : node;
  }

  if (Array.isArray(node)) {
    return node.map((child) => replaceSymbol(child, variable, replacement));
  }

  return node;
}

function uniqueStrategies(strategies: readonly CalculusDerivativeStrategy[]) {
  return [...new Set(strategies)];
}

function differentiateAlongPath(
  startAst: unknown,
  path: readonly DerivativeVariable[],
): DifferentiationPassResult {
  let ast = startAst;
  const strategies: CalculusDerivativeStrategy[] = [];

  for (const variable of path) {
    const preflight = classifyDerivativePreflight(ast, variable);
    if (preflightBlocksSymbolic(preflight)) {
      return {
        ok: false,
        error: derivativePreflightError(preflight),
      };
    }

    try {
      const derivative = differentiateAstWithMetadata(ast, variable, {
        computeEngineFallback: derivativeFallbackMode(preflight),
      });
      ast = derivative.ast;
      strategies.push(...derivative.strategies);
    } catch (error) {
      if (error instanceof UnsupportedDifferentiationFallbackError) {
        return {
          ok: false,
          error: 'This derivative uses an unsupported expression form in this milestone.',
        };
      }

      return {
        ok: false,
        error: 'This derivative could not be evaluated by the current symbolic differentiator.',
      };
    }
  }

  return {
    ok: true,
    ast,
    strategies: uniqueStrategies(strategies),
  };
}

export function evaluateCalculusHigherOrderDerivative({
  bodyLatex,
  operator,
}: HigherOrderDerivativeRequest): CalculusWorkspaceEvaluation {
  const body = bodyLatex.trim();
  if (!body) {
    return {
      warnings: [],
      error: 'Enter an expression before evaluating the derivative.',
    };
  }

  if (operator.kind !== 'derivative') {
    return {
      warnings: [],
      error: 'Use an ordinary derivative operator on this screen.',
    };
  }

  const differentiated = differentiateAlongPath(parseLatexNode(body), operator.appliedPath);
  if (!differentiated.ok) {
    return {
      warnings: [],
      error: differentiated.error,
    };
  }

  return {
    exactLatex: renderNodeLatex(differentiated.ast),
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
  };
}

export function evaluateCalculusHigherOrderDerivativeAtPoint({
  bodyLatex,
  pointLatex,
  operator,
}: HigherOrderDerivativeAtPointRequest): CalculusWorkspaceEvaluation {
  const body = bodyLatex.trim();
  const point = pointLatex.trim();
  if (!body || !point) {
    return {
      warnings: [],
      error: 'Enter an expression and a numeric point before evaluating the derivative.',
    };
  }

  if (operator.kind !== 'derivative') {
    return {
      warnings: [],
      error: 'Use an ordinary derivative operator on this screen.',
    };
  }

  const variable = operator.appliedPath[0] ?? operator.writtenFactors[0]?.variable;
  if (!variable) {
    return {
      warnings: [],
      error: 'Choose the variable to differentiate with respect to.',
    };
  }

  const pointAst = parseLatexNode(point);
  if (nodeToFiniteNumber(pointAst) === undefined) {
    return {
      warnings: [],
      error: 'Derivative-at-point requires a numeric point in this milestone.',
    };
  }

  const differentiated = differentiateAlongPath(parseLatexNode(body), operator.appliedPath);
  if (!differentiated.ok) {
    return {
      warnings: [],
      error: differentiated.error,
    };
  }

  const substituted = replaceSymbol(differentiated.ast, variable, pointAst);

  return {
    exactLatex: renderNodeLatex(substituted),
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
  };
}

export function evaluateCalculusMixedPartialDerivative({
  bodyLatex,
  operator,
}: MixedPartialDerivativeRequest): CalculusWorkspaceEvaluation {
  const body = bodyLatex.trim();
  if (!body) {
    return {
      warnings: [],
      error: 'Enter a multivariable expression before taking a partial derivative.',
    };
  }

  if (operator.kind !== 'partial') {
    return {
      warnings: [],
      error: 'Use a partial derivative operator on this screen.',
    };
  }

  const differentiated = differentiateAlongPath(parseLatexNode(body), operator.appliedPath);
  if (!differentiated.ok) {
    return {
      warnings: [],
      error: differentiated.error,
    };
  }

  return {
    exactLatex: renderNodeLatex(differentiated.ast),
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
  };
}
