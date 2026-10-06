import type { CanonicalSpecialFunctionExpression } from '../../../types/calculator/canonical-result-special';
import type { CanonicalResultProducerInput, CanonicalResultMathResolver } from './producer-draft';

type SpecialExpressionProducerInput = Extract<NonNullable<
  CanonicalResultProducerInput['primary']
>, { kind: 'special-function-expression' }>['expression'];

export function provenSpecialExpression(
  expression: CanonicalSpecialFunctionExpression,
  mathValue: CanonicalResultMathResolver,
  path: string,
): SpecialExpressionProducerInput {
  if (expression.kind === 'standard-math') {
    return {
      kind: 'standard-math',
      value: mathValue(expression.value.canonicalLatex, `${path}.value`),
    };
  }
  if (expression.kind === 'named-function') {
    return {
      kind: 'named-function',
      name: expression.name,
      arguments: expression.arguments.map((argument, index) =>
        provenSpecialExpression(argument, mathValue, `${path}.arguments[${index}]`)),
    };
  }
  if (expression.kind === 'sum') {
    return {
      kind: 'sum',
      terms: expression.terms.map((term, index) =>
        provenSpecialExpression(term, mathValue, `${path}.terms[${index}]`)),
    };
  }
  if (expression.kind === 'product') {
    return {
      kind: 'product',
      factors: expression.factors.map((factor, index) =>
        provenSpecialExpression(factor, mathValue, `${path}.factors[${index}]`)),
    };
  }
  if (expression.kind === 'quotient') {
    return {
      kind: 'quotient',
      numerator: provenSpecialExpression(expression.numerator, mathValue, `${path}.numerator`),
      denominator: provenSpecialExpression(expression.denominator, mathValue, `${path}.denominator`),
    };
  }
  if (expression.kind === 'power') {
    return {
      kind: 'power',
      base: provenSpecialExpression(expression.base, mathValue, `${path}.base`),
      exponent: provenSpecialExpression(expression.exponent, mathValue, `${path}.exponent`),
    };
  }
  if (expression.kind === 'negation') {
    return {
      kind: 'negation',
      operand: provenSpecialExpression(expression.operand, mathValue, `${path}.operand`),
    };
  }
  return {
    kind: 'piecewise',
    branches: expression.branches.map((branch, index) => ({
      value: provenSpecialExpression(branch.value, mathValue, `${path}.branches[${index}].value`),
      condition: mathValue(
        branch.condition.canonicalLatex,
        `${path}.branches[${index}].condition`,
      ),
    })),
    ...(expression.otherwise
      ? {
          otherwise: provenSpecialExpression(
            expression.otherwise,
            mathValue,
            `${path}.otherwise`,
          ),
        }
      : {}),
  };
}
