import type {
  CanonicalSpecialFunctionExpressionV4,
  CanonicalSpecialFunctionNameV4,
} from '../../types/calculator';

const FUNCTION_LATEX: Record<CanonicalSpecialFunctionNameV4, string> = {
  erfi: String.raw`\operatorname{erfi}`,
  Si: String.raw`\operatorname{Si}`,
  Ci: String.raw`\operatorname{Ci}`,
  Ei: String.raw`\operatorname{Ei}`,
  li: String.raw`\operatorname{li}`,
  EllipticF: String.raw`\operatorname{EllipticF}`,
  EllipticE: String.raw`\operatorname{EllipticE}`,
  EllipticPi: String.raw`\operatorname{EllipticPi}`,
};

type Precedence = 0 | 1 | 2 | 3 | 4;

function expressionPrecedence(expression: CanonicalSpecialFunctionExpressionV4): Precedence {
  if (expression.kind === 'sum' || expression.kind === 'piecewise') return 0;
  if (expression.kind === 'negation') return 1;
  if (expression.kind === 'product' || expression.kind === 'quotient') return 2;
  if (expression.kind === 'power') return 3;
  return 4;
}

function grouped(latex: string) {
  return String.raw`\left(${latex}\right)`;
}

function renderChild(
  expression: CanonicalSpecialFunctionExpressionV4,
  parentPrecedence: Precedence,
) {
  const rendered = renderCanonicalSpecialFunctionExpressionV4(expression);
  return expressionPrecedence(expression) < parentPrecedence ? grouped(rendered) : rendered;
}

function renderSum(terms: CanonicalSpecialFunctionExpressionV4[]) {
  return terms.map((term, index) => {
    if (term.kind === 'negation') {
      const value = renderChild(term.operand, 1);
      return index === 0 ? `-${value}` : ` - ${value}`;
    }
    const value = renderChild(term, 0);
    return index === 0 ? value : ` + ${value}`;
  }).join('');
}

function renderPiecewise(expression: Extract<
  CanonicalSpecialFunctionExpressionV4,
  { kind: 'piecewise' }
>) {
  const rows = expression.branches.map((branch) => (
    `${renderCanonicalSpecialFunctionExpressionV4(branch.value)}`
      + String.raw` & \text{if } `
      + branch.condition.canonicalLatex
  ));
  if (expression.otherwise) {
    rows.push(
      `${renderCanonicalSpecialFunctionExpressionV4(expression.otherwise)}`
        + String.raw` & \text{otherwise}`,
    );
  }
  return String.raw`\begin{cases} ${rows.join(String.raw` \\ `)} \end{cases}`;
}

export function renderCanonicalSpecialFunctionExpressionV4(
  expression: CanonicalSpecialFunctionExpressionV4,
): string {
  switch (expression.kind) {
    case 'standard-math':
      return expression.value.canonicalLatex;
    case 'named-function':
      return FUNCTION_LATEX[expression.name]
        + String.raw`\left(`
        + expression.arguments.map(renderCanonicalSpecialFunctionExpressionV4).join(',')
        + String.raw`\right)`;
    case 'sum':
      return renderSum(expression.terms);
    case 'product':
      return expression.factors.map((factor) => renderChild(factor, 2)).join(String.raw` \cdot `);
    case 'quotient':
      return String.raw`\frac{${renderCanonicalSpecialFunctionExpressionV4(expression.numerator)}}{${renderCanonicalSpecialFunctionExpressionV4(expression.denominator)}}`;
    case 'power':
      return `{${renderChild(expression.base, 3)}}^{${renderCanonicalSpecialFunctionExpressionV4(expression.exponent)}}`;
    case 'negation':
      return `-${renderChild(expression.operand, 1)}`;
    case 'piecewise':
      return renderPiecewise(expression);
  }
}

export function canonicalSpecialFunctionExpressionActionLatexV4(
  expression: CanonicalSpecialFunctionExpressionV4,
) {
  return renderCanonicalSpecialFunctionExpressionV4(expression);
}
