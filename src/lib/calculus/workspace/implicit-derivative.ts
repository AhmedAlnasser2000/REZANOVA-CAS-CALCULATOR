import type {
  CalculusDerivativeStrategy,
  DerivativeVariable,
  DisplayDetailSection,
  ImplicitDerivativeState,
} from '../../../types/calculator';
import { derivativeVariableLatex, parseDerivativeVariable } from '../derivative-target';
import {
  boxNode,
  ce,
} from '../engine/shared';
import { solveImplicitDerivativePlaceholder } from '../../equation/implicit-derivative-solve';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { simplifyNode } from '../../symbolic-engine/differentiation';
import type { CalculusWorkspaceEvaluation } from './integrals';

type ImplicitDifferentiationContext = {
  independentVariable: DerivativeVariable;
  dependentVariable: DerivativeVariable;
  derivativePlaceholder: string;
};

type ImplicitDifferentiationResult =
  | {
      ok: true;
      ast: unknown;
      strategies: CalculusDerivativeStrategy[];
    }
  | {
      ok: false;
      error: string;
    };

const PLACEHOLDER_CANDIDATES = ['u', 'v', 'w', 'q', 'r', 'p'];

function unsupported(error: string): ImplicitDifferentiationResult {
  return { ok: false, error };
}

function uniqueStrategies(strategies: readonly CalculusDerivativeStrategy[]) {
  return [...new Set(strategies)];
}

function isZeroNode(node: unknown) {
  return node === 0;
}

function isOneNode(node: unknown) {
  return node === 1;
}

function addNodes(...nodes: unknown[]) {
  const terms = nodes.filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return 0;
  }
  return terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function multiplyNodes(...nodes: unknown[]) {
  if (nodes.some((node) => isZeroNode(node))) {
    return 0;
  }
  const factors = nodes.filter((node) => !isOneNode(node));
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function negateNode(node: unknown) {
  return isZeroNode(node) ? 0 : multiplyNodes(-1, node);
}

function subtractNodes(left: unknown, right: unknown) {
  return addNodes(left, negateNode(right));
}

function divideNodes(numerator: unknown, denominator: unknown) {
  if (isZeroNode(numerator)) {
    return 0;
  }
  if (isOneNode(denominator)) {
    return numerator;
  }
  return ['Divide', numerator, denominator];
}

function powerNode(base: unknown, exponent: unknown) {
  if (exponent === 0) {
    return 1;
  }
  if (exponent === 1) {
    return base;
  }
  return ['Power', base, exponent];
}

function containsSymbol(node: unknown, symbol: string): boolean {
  if (typeof node === 'string') {
    return node === symbol;
  }

  if (Array.isArray(node)) {
    return node.some((child) => containsSymbol(child, symbol));
  }

  return false;
}

function containsDifferentiationSymbol(node: unknown, context: ImplicitDifferentiationContext) {
  return containsSymbol(node, context.independentVariable)
    || containsSymbol(node, context.dependentVariable);
}

function collectSymbols(node: unknown, symbols = new Set<string>()) {
  if (typeof node === 'string' && /^[A-Za-z]$/.test(node)) {
    symbols.add(node);
    return symbols;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectSymbols(child, symbols);
    }
  }

  return symbols;
}

function renderNodeLatex(node: unknown) {
  return boxNode(normalizeAst(simplifyNode(node))).latex;
}

function combineResults(
  ast: unknown,
  ...results: ImplicitDifferentiationResult[]
): ImplicitDifferentiationResult {
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    return failed;
  }

  return {
    ok: true,
    ast,
    strategies: uniqueStrategies(results.flatMap((result) => result.ok ? result.strategies : [])),
  };
}

function differentiateFunction(
  head: string,
  argument: unknown,
  context: ImplicitDifferentiationContext,
): ImplicitDifferentiationResult {
  const argumentDerivative = differentiateImplicitNode(argument, context);
  if (!argumentDerivative.ok) {
    return argumentDerivative;
  }
  if (isZeroNode(argumentDerivative.ast)) {
    return { ok: true, ast: 0, strategies: argumentDerivative.strategies };
  }

  if (head === 'Sin') {
    return combineResults(
      multiplyNodes(['Cos', argument], argumentDerivative.ast),
      argumentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  if (head === 'Cos') {
    return combineResults(
      multiplyNodes(-1, ['Sin', argument], argumentDerivative.ast),
      argumentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  if (head === 'Tan') {
    return combineResults(
      divideNodes(argumentDerivative.ast, powerNode(['Cos', argument], 2)),
      argumentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule', 'quotient-rule'] },
    );
  }

  if (head === 'Ln') {
    return combineResults(
      divideNodes(argumentDerivative.ast, argument),
      argumentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  if (head === 'Log') {
    return combineResults(
      divideNodes(argumentDerivative.ast, multiplyNodes(argument, ['Ln', 10])),
      argumentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  return unsupported('This implicit derivative uses an unsupported function in this milestone.');
}

function differentiateProduct(
  factors: unknown[],
  context: ImplicitDifferentiationContext,
): ImplicitDifferentiationResult {
  const derivativeResults = factors.map((factor) => differentiateImplicitNode(factor, context));
  const failed = derivativeResults.find((result) => !result.ok);
  if (failed && !failed.ok) {
    return failed;
  }

  const terms = derivativeResults.map((result, index) => {
    if (!result.ok || isZeroNode(result.ast)) {
      return 0;
    }
    return multiplyNodes(
      ...factors.slice(0, index),
      result.ast,
      ...factors.slice(index + 1),
    );
  });

  return {
    ok: true,
    ast: addNodes(...terms),
    strategies: uniqueStrategies([
      ...derivativeResults.flatMap((result) => result.ok ? result.strategies : []),
      'product-rule',
    ]),
  };
}

function differentiatePower(
  base: unknown,
  exponent: unknown,
  context: ImplicitDifferentiationContext,
): ImplicitDifferentiationResult {
  const baseDerivative = differentiateImplicitNode(base, context);
  const exponentDerivative = differentiateImplicitNode(exponent, context);
  if (!baseDerivative.ok) {
    return baseDerivative;
  }
  if (!exponentDerivative.ok) {
    return exponentDerivative;
  }

  if (typeof exponent === 'number' && Number.isFinite(exponent)) {
    return combineResults(
      multiplyNodes(exponent, powerNode(base, exponent - 1), baseDerivative.ast),
      baseDerivative,
      { ok: true, ast: 0, strategies: ['function-power'] },
    );
  }

  if (base === 'ExponentialE') {
    return combineResults(
      multiplyNodes(powerNode(base, exponent), exponentDerivative.ast),
      exponentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  if (!containsDifferentiationSymbol(exponent, context)) {
    return combineResults(
      multiplyNodes(exponent, powerNode(base, subtractNodes(exponent, 1)), baseDerivative.ast),
      baseDerivative,
      { ok: true, ast: 0, strategies: ['general-power'] },
    );
  }

  if (!containsDifferentiationSymbol(base, context)) {
    return combineResults(
      multiplyNodes(powerNode(base, exponent), ['Ln', base], exponentDerivative.ast),
      exponentDerivative,
      { ok: true, ast: 0, strategies: ['chain-rule'] },
    );
  }

  return unsupported('This implicit derivative uses an unsupported power form in this milestone.');
}

function differentiateImplicitNode(
  node: unknown,
  context: ImplicitDifferentiationContext,
): ImplicitDifferentiationResult {
  if (typeof node === 'number') {
    return { ok: true, ast: 0, strategies: [] };
  }

  if (typeof node === 'string') {
    if (node === context.independentVariable) {
      return { ok: true, ast: 1, strategies: ['direct-rule'] };
    }
    if (node === context.dependentVariable) {
      return { ok: true, ast: context.derivativePlaceholder, strategies: ['chain-rule'] };
    }
    return { ok: true, ast: 0, strategies: [] };
  }

  if (!Array.isArray(node)) {
    return { ok: true, ast: 0, strategies: [] };
  }

  if (!containsDifferentiationSymbol(node, context)) {
    return { ok: true, ast: 0, strategies: [] };
  }

  const [head, ...args] = node;
  if (typeof head !== 'string') {
    return unsupported('This implicit derivative input could not be parsed as a supported expression.');
  }

  if (head === 'Add') {
    const derivatives = args.map((arg) => differentiateImplicitNode(arg, context));
    const failed = derivatives.find((result) => !result.ok);
    if (failed && !failed.ok) {
      return failed;
    }
    return {
      ok: true,
      ast: addNodes(...derivatives.map((result) => result.ok ? result.ast : 0)),
      strategies: uniqueStrategies(derivatives.flatMap((result) => result.ok ? result.strategies : [])),
    };
  }

  if (head === 'Subtract' && args.length === 2) {
    const left = differentiateImplicitNode(args[0], context);
    const right = differentiateImplicitNode(args[1], context);
    return combineResults(
      subtractNodes(left.ok ? left.ast : 0, right.ok ? right.ast : 0),
      left,
      right,
    );
  }

  if (head === 'Negate' && args.length === 1) {
    const derivative = differentiateImplicitNode(args[0], context);
    return derivative.ok
      ? { ok: true, ast: negateNode(derivative.ast), strategies: derivative.strategies }
      : derivative;
  }

  if (head === 'Multiply') {
    return differentiateProduct(args, context);
  }

  if (head === 'Divide' && args.length === 2) {
    const numerator = args[0];
    const denominator = args[1];
    const numeratorDerivative = differentiateImplicitNode(numerator, context);
    const denominatorDerivative = differentiateImplicitNode(denominator, context);
    return combineResults(
      divideNodes(
        subtractNodes(
          multiplyNodes(numeratorDerivative.ok ? numeratorDerivative.ast : 0, denominator),
          multiplyNodes(numerator, denominatorDerivative.ok ? denominatorDerivative.ast : 0),
        ),
        powerNode(denominator, 2),
      ),
      numeratorDerivative,
      denominatorDerivative,
      { ok: true, ast: 0, strategies: ['quotient-rule'] },
    );
  }

  if (head === 'Power' && args.length === 2) {
    return differentiatePower(args[0], args[1], context);
  }

  if (args.length === 1) {
    return differentiateFunction(head, args[0], context);
  }

  return unsupported('This implicit derivative uses an unsupported expression form in this milestone.');
}

function parseRelation(relationLatex: string) {
  const parsed = ce.parse(relationLatex).json;
  if (!Array.isArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }
  return { left: parsed[1], right: parsed[2], ast: parsed };
}

function chooseDerivativePlaceholder(
  relationAst: unknown,
  independentVariable: DerivativeVariable,
  dependentVariable: DerivativeVariable,
) {
  const usedSymbols = collectSymbols(relationAst);
  return PLACEHOLDER_CANDIDATES.find((candidate) =>
    candidate !== independentVariable
    && candidate !== dependentVariable
    && !usedSymbols.has(candidate));
}

function displayDerivativeLatex(
  dependentVariable: DerivativeVariable,
  independentVariable: DerivativeVariable,
) {
  return `\\frac{d${derivativeVariableLatex(dependentVariable)}}{d${derivativeVariableLatex(independentVariable)}}`;
}

function implicitDifferentiationDetail({
  relationLatex,
  differentiatedRelationLatex,
  displayDerivative,
}: {
  relationLatex: string;
  differentiatedRelationLatex: string;
  displayDerivative: string;
}): DisplayDetailSection {
  return {
    title: 'Implicit Differentiation',
    lines: [
      `\\operatorname{relation}\\quad ${relationLatex}`,
      `\\operatorname{differentiate}\\quad ${displayDerivative}`,
      `\\operatorname{differentiated}\\quad ${differentiatedRelationLatex}`,
    ],
    lineKind: 'math',
  };
}

export function evaluateCalculusImplicitDerivative(
  state: ImplicitDerivativeState,
): CalculusWorkspaceEvaluation {
  const relationLatex = state.relationLatex.trim();
  if (!relationLatex) {
    return {
      warnings: [],
      error: 'Enter one equation before implicit differentiation.',
    };
  }

  const independent = parseDerivativeVariable(state.independentVariable ?? 'x');
  if (!independent.ok) {
    return { warnings: [], error: independent.error };
  }

  const dependent = parseDerivativeVariable(state.dependentVariable ?? 'y');
  if (!dependent.ok) {
    return { warnings: [], error: dependent.error };
  }

  if (independent.variable === dependent.variable) {
    return {
      warnings: [],
      error: 'Choose different independent and dependent variables.',
    };
  }

  const relation = parseRelation(relationLatex);
  if (!relation) {
    return {
      warnings: [],
      error: 'Implicit differentiation expects one equation, such as x^2+y^2=25.',
    };
  }

  const derivativePlaceholder = chooseDerivativePlaceholder(
    relation.ast,
    independent.variable,
    dependent.variable,
  );
  if (!derivativePlaceholder) {
    return {
      warnings: [],
      error: 'Implicit differentiation could not reserve an internal derivative placeholder.',
    };
  }

  const context: ImplicitDifferentiationContext = {
    independentVariable: independent.variable,
    dependentVariable: dependent.variable,
    derivativePlaceholder,
  };
  const leftDerivative = differentiateImplicitNode(relation.left, context);
  const rightDerivative = differentiateImplicitNode(relation.right, context);
  if (!leftDerivative.ok) {
    return { warnings: [], error: leftDerivative.error };
  }
  if (!rightDerivative.ok) {
    return { warnings: [], error: rightDerivative.error };
  }

  const differentiatedRelationLatex = `${renderNodeLatex(leftDerivative.ast)}=${renderNodeLatex(rightDerivative.ast)}`;
  const displayDerivative = displayDerivativeLatex(dependent.variable, independent.variable);
  const solveResult = solveImplicitDerivativePlaceholder({
    differentiatedRelationLatex,
    derivativePlaceholder,
    displayDerivativeLatex: displayDerivative,
  });
  const baseDetail = implicitDifferentiationDetail({
    relationLatex,
    differentiatedRelationLatex,
    displayDerivative,
  });

  if (solveResult.kind === 'unsupported') {
    return {
      warnings: [],
      error: solveResult.message,
      detailSections: [
        baseDetail,
        ...(solveResult.detailSections ?? []),
      ],
    };
  }

  return {
    exactLatex: solveResult.exactLatex,
    exactSupplementLatex: solveResult.exactSupplementLatex,
    warnings: [],
    resultOrigin: 'symbolic-engine',
    derivativeStrategies: uniqueStrategies([
      ...leftDerivative.strategies,
      ...rightDerivative.strategies,
    ]),
    detailSections: [
      baseDetail,
      ...solveResult.detailSections,
    ],
  };
}
