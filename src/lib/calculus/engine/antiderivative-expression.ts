import type {
  CanonicalMathValueV2,
  CanonicalSpecialFunctionExpressionV4,
} from '../../../types/calculator';
import { printMathJson } from '../../display/printer';
import { renderCanonicalSpecialFunctionExpressionV4 } from '../../result-contract';

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

function standardMathLatex(mathJson: unknown) {
  const printed = printMathJson({
    mathJson,
    profile: 'pedagogical-v1',
    target: 'canonical-latex',
  });
  if (!printed.ok) {
    throw new Error('Calculus antiderivative MathJSON could not be rendered: ' + printed.message);
  }
  return printed.canonicalLatex;
}

function standardLeaf(
  mathJson: unknown,
): CanonicalMathValueV2 {
  return {
    canonicalLatex: standardMathLatex(mathJson),
    mathJson: structuredClone(mathJson) as CanonicalMathValueV2['mathJson'],
  };
}

function asSpecialExpression(
  expression: CalculusAntiderivativeBaseExpression,
): CanonicalSpecialFunctionExpressionV4 {
  return expression.kind === 'special-function-expression'
    ? expression.expression
    : { kind: 'standard-math', value: standardLeaf(expression.mathJson) };
}

function baseExpression(
  expression: CalculusAntiderivativeExpression,
): CalculusAntiderivativeBaseExpression {
  return expression.kind === 'indefinite-family'
    ? expression.antiderivative
    : expression;
}

export function scaleStandardMathJson(
  coefficient: unknown,
  mathJson: unknown,
): unknown {
  if (Array.isArray(mathJson) && mathJson[0] === 'Divide' && mathJson.length === 3) {
    return [
      'Divide',
      ['Multiply', structuredClone(coefficient), structuredClone(mathJson[1])],
      structuredClone(mathJson[2]),
    ];
  }
  return ['Multiply', structuredClone(coefficient), structuredClone(mathJson)];
}

export function standardAntiderivativeExpression(input: {
  mathJson: unknown;
  source: string;
}): CalculusAntiderivativeBaseExpression {
  standardMathLatex(input.mathJson);
  return {
    kind: 'standard-math-json',
    mathJson: structuredClone(input.mathJson),
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
