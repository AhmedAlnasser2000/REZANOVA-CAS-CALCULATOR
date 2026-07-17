import type {
  CanonicalMathValueV2,
  CanonicalSpecialFunctionNameV4,
  CanonicalSpecialFunctionExpressionV4,
} from '../../../types/calculator';
import {
  normalizeStandardMathJson,
  renderCalculusStandardMathJson as standardMathLatex,
  scaleStandardMathJson,
  standardLeaf,
} from './antiderivative-standard-math';
import { renderCanonicalSpecialFunctionExpressionV4 } from '../../result-contract';

export { renderCalculusStandardMathJson, scaleStandardMathJson } from './antiderivative-standard-math';

export type CalculusAntiderivativeBaseExpression =
  | {
      kind: 'standard-math-json';
      mathJson: unknown;
      source: string;
    }
  | {
      kind: 'special-function-expression';
      expression: CanonicalSpecialFunctionExpressionV4;
      source: string;
    };

export type CalculusAntiderivativeExpression =
  | CalculusAntiderivativeBaseExpression
  | {
      kind: 'indefinite-family';
      antiderivative: CalculusAntiderivativeBaseExpression;
      constantSymbol: string;
    };

export type CalculusIntegrationFactNode = {
  role: 'general' | 'exclusion' | 'condition' | 'parameter-constraint';
  presentationLatex: string;
  mathJson: unknown;
  source: string;
};

export type CalculusIntegrationDetailNodePart =
  | { kind: 'text'; text: string }
  | {
      kind: 'math';
      canonicalLatex: string;
      mathJson: unknown;
      source: string;
    };

export type CalculusIntegrationDetailNode = {
  title: string;
  lines: CalculusIntegrationDetailNodePart[][];
};

export type CalculusAntiderivativeExpressionMathLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

const SPECIAL_FUNCTION_HEADS = new Map<string, CanonicalSpecialFunctionNameV4>([
  ['Erfi', 'erfi'],
  ['Si', 'Si'],
  ['Ci', 'Ci'],
  ['Ei', 'Ei'],
  ['LogarithmicIntegral', 'li'],
  ['EllipticF', 'EllipticF'],
  ['EllipticE', 'EllipticE'],
  ['EllipticPi', 'EllipticPi'],
]);

const V4_EXCLUDED_STANDARD_SPECIAL_HEADS = new Set([
  'Erf',
  'Erfc',
  'FresnelS',
  'FresnelC',
]);

function containsHead(node: unknown, heads: ReadonlySet<string>): boolean {
  if (!Array.isArray(node)) return false;
  const head = node[0];
  if (typeof head === 'string' && heads.has(head)) return true;
  return node.slice(1).some((child) => containsHead(child, heads));
}

type SpecialExpressionConversion = {
  expression: CanonicalSpecialFunctionExpressionV4;
  containsSpecial: boolean;
};

function mathJsonToSpecialExpressionResult(node: unknown): SpecialExpressionConversion | undefined {
  if (containsHead(node, V4_EXCLUDED_STANDARD_SPECIAL_HEADS)) return undefined;
  if (!Array.isArray(node) || typeof node[0] !== 'string') {
    return {
      expression: { kind: 'standard-math', value: standardLeaf(node) },
      containsSpecial: false,
    };
  }

  const mapped = SPECIAL_FUNCTION_HEADS.get(node[0]);
  if (mapped) {
    const args = node.slice(1).map(mathJsonToSpecialExpressionResult);
    if (args.some((arg) => arg === undefined)) return undefined;
    return {
      expression: {
        kind: 'named-function',
        name: mapped,
        arguments: args.map((arg) => arg!.expression),
      },
      containsSpecial: true,
    };
  }

  if (node[0] === 'Add' || node[0] === 'Multiply') {
    const children = node.slice(1).map(mathJsonToSpecialExpressionResult);
    if (children.some((child) => child === undefined)) return undefined;
    const containsSpecial = children.some((child) => child!.containsSpecial);
    if (!containsSpecial) {
      return {
        expression: { kind: 'standard-math', value: standardLeaf(node) },
        containsSpecial: false,
      };
    }
    return {
      expression: node[0] === 'Add'
        ? { kind: 'sum', terms: children.map((child) => child!.expression) }
        : { kind: 'product', factors: children.map((child) => child!.expression) },
      containsSpecial: true,
    };
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = mathJsonToSpecialExpressionResult(node[1]);
    const denominator = mathJsonToSpecialExpressionResult(node[2]);
    if (!numerator || !denominator) return undefined;
    if (!numerator.containsSpecial && !denominator.containsSpecial) {
      return {
        expression: { kind: 'standard-math', value: standardLeaf(node) },
        containsSpecial: false,
      };
    }
    return {
      expression: {
        kind: 'quotient',
        numerator: numerator.expression,
        denominator: denominator.expression,
      },
      containsSpecial: true,
    };
  }

  if (node[0] === 'Power' && node.length === 3) {
    const base = mathJsonToSpecialExpressionResult(node[1]);
    const exponent = mathJsonToSpecialExpressionResult(node[2]);
    if (!base || !exponent) return undefined;
    if (!base.containsSpecial && !exponent.containsSpecial) {
      return {
        expression: { kind: 'standard-math', value: standardLeaf(node) },
        containsSpecial: false,
      };
    }
    return {
      expression: {
        kind: 'power',
        base: base.expression,
        exponent: exponent.expression,
      },
      containsSpecial: true,
    };
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const operand = mathJsonToSpecialExpressionResult(node[1]);
    if (!operand) return undefined;
    if (!operand.containsSpecial) {
      return {
        expression: { kind: 'standard-math', value: standardLeaf(node) },
        containsSpecial: false,
      };
    }
    return {
      expression: { kind: 'negation', operand: operand.expression },
      containsSpecial: true,
    };
  }

  return {
    expression: { kind: 'standard-math', value: standardLeaf(node) },
    containsSpecial: false,
  };
}

export function mathJsonToCanonicalSpecialFunctionExpression(
  mathJson: unknown,
): CanonicalSpecialFunctionExpressionV4 | undefined {
  const converted = mathJsonToSpecialExpressionResult(mathJson);
  return converted?.containsSpecial ? converted.expression : undefined;
}

export function specialFunctionAntiderivativeExpressionFromMathJson(input: {
  mathJson: unknown;
  source: string;
}): CalculusAntiderivativeBaseExpression | undefined {
  const expression = mathJsonToCanonicalSpecialFunctionExpression(input.mathJson);
  return expression
    ? specialFunctionAntiderivativeExpression({
        expression,
        source: input.source,
      })
    : undefined;
}

function asSpecialExpression(
  expression: CalculusAntiderivativeBaseExpression,
): CanonicalSpecialFunctionExpressionV4 {
  return expression.kind === 'special-function-expression'
    ? expression.expression
    : { kind: 'standard-math', value: standardLeaf(expression.mathJson) };
}

export function standardSpecialFunctionExpressionFromMathJson(
  mathJson: unknown,
): CanonicalSpecialFunctionExpressionV4 {
  return { kind: 'standard-math', value: standardLeaf(mathJson) };
}

export function standardSpecialFunctionExpression(input: {
  mathJson: unknown;
  canonicalLatex?: string;
}): CanonicalSpecialFunctionExpressionV4 {
  return {
    kind: 'standard-math',
    value: input.canonicalLatex
      ? {
          canonicalLatex: input.canonicalLatex,
          mathJson: structuredClone(input.mathJson) as CanonicalMathValueV2['mathJson'],
        }
      : standardLeaf(input.mathJson),
  };
}

export function namedSpecialFunctionCallExpression(input: {
  name: CanonicalSpecialFunctionNameV4;
  arguments: CanonicalSpecialFunctionExpressionV4[];
}): CanonicalSpecialFunctionExpressionV4 {
  return {
    kind: 'named-function',
    name: input.name,
    arguments: structuredClone(input.arguments),
  };
}

function baseExpression(
  expression: CalculusAntiderivativeExpression,
): CalculusAntiderivativeBaseExpression {
  return expression.kind === 'indefinite-family'
    ? expression.antiderivative
    : expression;
}

export function standardAntiderivativeExpression(input: {
  mathJson: unknown;
  source: string;
}): CalculusAntiderivativeBaseExpression {
  const mathJson = normalizeStandardMathJson(input.mathJson);
  standardMathLatex(mathJson);
  return {
    kind: 'standard-math-json',
    mathJson: structuredClone(mathJson),
    source: input.source,
  };
}

export function specialFunctionAntiderivativeExpression(input: {
  expression: CanonicalSpecialFunctionExpressionV4;
  source: string;
}): CalculusAntiderivativeBaseExpression {
  return {
    kind: 'special-function-expression',
    expression: structuredClone(input.expression),
    source: input.source,
  };
}

export function addAntiderivativeExpressions(input: {
  terms: Array<{
    expression: CalculusAntiderivativeExpression;
    sign?: 1 | -1;
  }>;
  source: string;
}): CalculusAntiderivativeBaseExpression | undefined {
  if (input.terms.length === 0 || input.terms.some(
    (term) => term.expression.kind === 'indefinite-family',
  )) {
    return undefined;
  }
  const terms = input.terms.map((term) => {
    const expression = baseExpression(term.expression);
    if (expression.kind === 'standard-math-json') {
      return term.sign === -1
        ? ['Negate', expression.mathJson]
        : expression.mathJson;
    }
    return undefined;
  });
  if (terms.every((term) => term !== undefined)) {
    return standardAntiderivativeExpression({
      mathJson: terms.length === 1 ? terms[0] : ['Add', ...terms],
      source: input.source,
    });
  }

  return specialFunctionAntiderivativeExpression({
    expression: {
      kind: 'sum',
      terms: input.terms.map((term) => {
        const expression = asSpecialExpression(baseExpression(term.expression));
        return term.sign === -1
          ? { kind: 'negation' as const, operand: expression }
          : expression;
      }),
    },
    source: input.source,
  });
}

export function scaleAntiderivativeExpression(input: {
  coefficient: unknown;
  expression: CalculusAntiderivativeExpression;
  source: string;
}): CalculusAntiderivativeBaseExpression | undefined {
  if (input.expression.kind === 'indefinite-family') return undefined;
  const expression = baseExpression(input.expression);
  if (expression.kind === 'standard-math-json') {
    return standardAntiderivativeExpression({
      mathJson: scaleStandardMathJson(input.coefficient, expression.mathJson),
      source: input.source,
    });
  }
  return specialFunctionAntiderivativeExpression({
    expression: {
      kind: 'product',
      factors: [
        { kind: 'standard-math', value: standardLeaf(input.coefficient) },
        expression.expression,
      ],
    },
    source: input.source,
  });
}

export function withIntegrationConstant(
  expression: CalculusAntiderivativeExpression,
  variable: string,
): CalculusAntiderivativeExpression {
  if (expression.kind === 'indefinite-family') return expression;
  return {
    kind: 'indefinite-family',
    antiderivative: expression,
    constantSymbol: variable === 'C' ? 'K' : 'C',
  };
}

export function calculusAntiderivativeSpecialExpression(
  expression: CalculusAntiderivativeExpression,
): CanonicalSpecialFunctionExpressionV4 | undefined {
  if (expression.kind === 'special-function-expression') return structuredClone(expression.expression);
  if (expression.kind !== 'indefinite-family') return undefined;
  if (expression.antiderivative.kind !== 'special-function-expression') return undefined;
  return {
    kind: 'sum',
    terms: [
      structuredClone(expression.antiderivative.expression),
      { kind: 'standard-math', value: standardLeaf(expression.constantSymbol) },
    ],
  };
}

function collectSpecialExpressionMathLeaves(
  expression: CanonicalSpecialFunctionExpressionV4,
  source: string,
): CalculusAntiderivativeExpressionMathLeaf[] {
  if (expression.kind === 'standard-math') {
    return [{
      canonicalLatex: expression.value.canonicalLatex,
      mathJson: structuredClone(expression.value.mathJson),
      source,
    }];
  }
  if (expression.kind === 'named-function') {
    return expression.arguments.flatMap((argument) =>
      collectSpecialExpressionMathLeaves(argument, source));
  }
  if (expression.kind === 'sum') {
    return expression.terms.flatMap((term) => collectSpecialExpressionMathLeaves(term, source));
  }
  if (expression.kind === 'product') {
    return expression.factors.flatMap((factor) => collectSpecialExpressionMathLeaves(factor, source));
  }
  if (expression.kind === 'quotient') {
    return [
      ...collectSpecialExpressionMathLeaves(expression.numerator, source),
      ...collectSpecialExpressionMathLeaves(expression.denominator, source),
    ];
  }
  if (expression.kind === 'power') {
    return [
      ...collectSpecialExpressionMathLeaves(expression.base, source),
      ...collectSpecialExpressionMathLeaves(expression.exponent, source),
    ];
  }
  if (expression.kind === 'negation') {
    return collectSpecialExpressionMathLeaves(expression.operand, source);
  }
  return [
    ...expression.branches.flatMap((branch) => [
      ...collectSpecialExpressionMathLeaves(branch.value, source),
      {
        canonicalLatex: branch.condition.canonicalLatex,
        mathJson: structuredClone(branch.condition.mathJson),
        source,
      },
    ]),
    ...(expression.otherwise
      ? collectSpecialExpressionMathLeaves(expression.otherwise, source)
      : []),
  ];
}

export function calculusAntiderivativeExpressionMathLeaves(
  expression: CalculusAntiderivativeExpression,
): CalculusAntiderivativeExpressionMathLeaf[] {
  if (expression.kind === 'standard-math-json') {
    return [{
      canonicalLatex: standardMathLatex(expression.mathJson),
      mathJson: structuredClone(expression.mathJson),
      source: expression.source,
    }];
  }
  if (expression.kind === 'special-function-expression') {
    return collectSpecialExpressionMathLeaves(expression.expression, expression.source);
  }
  return [
    ...calculusAntiderivativeExpressionMathLeaves(expression.antiderivative),
    {
      canonicalLatex: expression.constantSymbol,
      mathJson: expression.constantSymbol,
      source: 'calculus.indefinite-integral:constant',
    },
  ];
}

export function renderCalculusAntiderivativeExpression(
  expression: CalculusAntiderivativeExpression,
): string {
  if (expression.kind === 'standard-math-json') {
    return standardMathLatex(expression.mathJson);
  }
  if (expression.kind === 'special-function-expression') {
    return renderCanonicalSpecialFunctionExpressionV4(expression.expression);
  }
  return `${renderCalculusAntiderivativeExpression(expression.antiderivative)}+${expression.constantSymbol}`;
}

function specialExpressionToAst(
  expression: CanonicalSpecialFunctionExpressionV4,
): unknown | undefined {
  if (expression.kind === 'standard-math') return structuredClone(expression.value.mathJson);
  if (expression.kind === 'named-function') {
    const argumentsList = expression.arguments.map(specialExpressionToAst);
    if (argumentsList.some((argument) => argument === undefined)) return undefined;
    const head = expression.name === 'erfi'
      ? 'Erfi'
      : expression.name === 'li'
        ? 'LogarithmicIntegral'
        : expression.name;
    return [head, ...argumentsList];
  }
  if (expression.kind === 'sum' || expression.kind === 'product') {
    const entries = expression.kind === 'sum' ? expression.terms : expression.factors;
    const children = entries.map(specialExpressionToAst);
    if (children.some((child) => child === undefined)) return undefined;
    return [expression.kind === 'sum' ? 'Add' : 'Multiply', ...children];
  }
  if (expression.kind === 'quotient') {
    const numerator = specialExpressionToAst(expression.numerator);
    const denominator = specialExpressionToAst(expression.denominator);
    return numerator === undefined || denominator === undefined
      ? undefined
      : ['Divide', numerator, denominator];
  }
  if (expression.kind === 'power') {
    const base = specialExpressionToAst(expression.base);
    const exponent = specialExpressionToAst(expression.exponent);
    return base === undefined || exponent === undefined
      ? undefined
      : ['Power', base, exponent];
  }
  if (expression.kind === 'negation') {
    const operand = specialExpressionToAst(expression.operand);
    return operand === undefined ? undefined : ['Negate', operand];
  }
  return undefined;
}

export function calculusAntiderivativeExpressionToAst(
  expression: CalculusAntiderivativeExpression,
): unknown | undefined {
  if (expression.kind === 'standard-math-json') return structuredClone(expression.mathJson);
  if (expression.kind === 'special-function-expression') {
    return specialExpressionToAst(expression.expression);
  }
  const antiderivative = calculusAntiderivativeExpressionToAst(expression.antiderivative);
  return antiderivative === undefined
    ? undefined
    : ['Add', antiderivative, expression.constantSymbol];
}
