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
import { normalizeDerivativeOutputNode } from '../../symbolic-engine/differentiation-normalization';
import type {
  CalculusDerivativeStrategy,
  DerivativeVariable,
  DisplayDetailSection,
} from '../../../types/calculator';
import { derivativeVariableLatex } from '../derivative-target';
import type { DerivativeOperatorSpec } from '../derivative-operator';
import type { CalculusWorkspaceEvaluation } from './integrals';
import { profileCalculusResult } from '../../display/printer';

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

type DerivativeStep = {
  index: number;
  variable: DerivativeVariable;
  latex: string;
};

type DifferentiationPassResult =
  | {
      ok: true;
      ast: unknown;
      strategies: CalculusDerivativeStrategy[];
      steps: DerivativeStep[];
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
  return boxNode(normalizeAst(normalizeDerivativeOutputNode(simplifyNode(node)))).latex;
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

function appliedPathLatex(path: readonly DerivativeVariable[]) {
  return path
    .map((variable) => derivativeVariableLatex(variable))
    .join('\\to ');
}

function derivativeStepsDetailSection(
  operator: DerivativeOperatorSpec,
  steps: readonly DerivativeStep[],
  substitution?: {
    variable: DerivativeVariable;
    pointLatex: string;
    resultLatex: string;
  },
): DisplayDetailSection {
  const lines = [
    `\\operatorname{operator}\\quad ${operator.canonicalLatex}`,
    `\\operatorname{applied}\\quad ${appliedPathLatex(operator.appliedPath)}`,
    ...steps.map((step) => `D_{${step.index}}=${step.latex}`),
  ];

  if (substitution) {
    lines.push(
      `D_{${steps.length}}\\big|_{${derivativeVariableLatex(substitution.variable)}=${substitution.pointLatex}}=${substitution.resultLatex}`,
    );
  }

  return {
    title: 'Derivative Steps',
    lines,
    lineKind: 'math',
  };
}

function differentiateAlongPath(
  startAst: unknown,
  path: readonly DerivativeVariable[],
): DifferentiationPassResult {
  let ast = startAst;
  const strategies: CalculusDerivativeStrategy[] = [];
  const steps: DerivativeStep[] = [];

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
      steps.push({
        index: steps.length + 1,
        variable,
        latex: renderNodeLatex(ast),
      });
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
    steps,
  };
}

export function buildCalculusDerivativeStepsDetail({
  bodyLatex,
  operator,
  pointLatex,
}: {
  bodyLatex: string;
  operator: DerivativeOperatorSpec;
  pointLatex?: string;
}): DisplayDetailSection | undefined {
  const body = bodyLatex.trim();
  if (!body) {
    return undefined;
  }

  const differentiated = differentiateAlongPath(parseLatexNode(body), operator.appliedPath);
  if (!differentiated.ok) {
    return undefined;
  }

  if (!pointLatex) {
    return derivativeStepsDetailSection(operator, differentiated.steps);
  }

  if (operator.kind !== 'derivative') {
    return derivativeStepsDetailSection(operator, differentiated.steps);
  }

  const point = pointLatex.trim();
  const variable = operator.appliedPath[0] ?? operator.writtenFactors[0]?.variable;
  if (!point || !variable) {
    return derivativeStepsDetailSection(operator, differentiated.steps);
  }

  const pointAst = parseLatexNode(point);
  if (nodeToFiniteNumber(pointAst) === undefined) {
    return derivativeStepsDetailSection(operator, differentiated.steps);
  }

  return derivativeStepsDetailSection(operator, differentiated.steps, profileCalculusResult({
    variable,
    pointLatex: point,
    resultLatex: renderNodeLatex(replaceSymbol(differentiated.ast, variable, pointAst)),
  }));
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

  return profileCalculusResult({
    exactLatex: renderNodeLatex(differentiated.ast),
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
    detailSections: [
      derivativeStepsDetailSection(operator, differentiated.steps),
    ],
  });
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
  const exactLatex = renderNodeLatex(substituted);

  return {
    exactLatex,
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
    detailSections: [
      derivativeStepsDetailSection(operator, differentiated.steps, profileCalculusResult({
        variable,
        pointLatex: point,
        resultLatex: exactLatex,
      })),
    ],
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

  return profileCalculusResult({
    exactLatex: renderNodeLatex(differentiated.ast),
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: differentiated.strategies,
    detailSections: [
      derivativeStepsDetailSection(operator, differentiated.steps),
    ],
  });
}
