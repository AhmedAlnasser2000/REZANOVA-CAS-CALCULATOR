import type {
  LinearAlgebraBinaryOperator,
  LinearAlgebraEditorExpression,
  LinearAlgebraUnaryOperator,
} from './editor-parser';
import { exactVectorWireToLatex } from './editor-matrix-literals';

function callLatex(name: string, ...args: string[]) {
  return `\\operatorname{${name}}\\left(${args.join(',')}\\right)`;
}

function detLatex(value: string) {
  return `\\det\\left(${value}\\right)`;
}

function suffixOperand(expression: LinearAlgebraEditorExpression) {
  const formatted = formatLinearAlgebraEditorExpression(expression);
  return expression.kind === 'named' || expression.kind === 'matrixLiteral' || expression.kind === 'vectorLiteral' || expression.kind === 'scalar'
    ? formatted
    : `\\left(${formatted}\\right)`;
}

function formatUnary(operator: LinearAlgebraUnaryOperator, value: LinearAlgebraEditorExpression) {
  const formattedValue = formatLinearAlgebraEditorExpression(value);
  switch (operator) {
    case 'determinant':
      return detLatex(formattedValue);
    case 'rank':
      return callLatex('rank', formattedValue);
    case 'rref':
      return callLatex('rref', formattedValue);
    case 'nullSpace':
      return callLatex('null', formattedValue);
    case 'columnSpace':
      return callLatex('col', formattedValue);
    case 'basis':
      return callLatex('basis', formattedValue);
    case 'lu':
      return callLatex('lu', formattedValue);
    case 'plu':
      return callLatex('plu', formattedValue);
    case 'qr':
      return callLatex('qr', formattedValue);
    case 'invertibility':
      return callLatex('invertible', formattedValue);
    case 'profile':
      return callLatex('profile', formattedValue);
    case 'eigen':
      return callLatex('eigen', formattedValue);
    case 'diagonalization':
      return callLatex('diag', formattedValue);
    case 'transpose':
      return `${suffixOperand(value)}^{\\mathsf{T}}`;
    case 'inverse':
      return `${suffixOperand(value)}^{-1}`;
    case 'norm':
      return `\\left\\lVert ${formattedValue}\\right\\rVert`;
    case 'projectionOntoU':
      return `\\operatorname{proj}_{u}\\left(${formattedValue}\\right)`;
    case 'projectionOntoV':
      return `\\operatorname{proj}_{v}\\left(${formattedValue}\\right)`;
    case 'orthogonalComponentToU':
      return `\\operatorname{orth}_{u}\\left(${formattedValue}\\right)`;
    case 'orthogonalComponentToV':
      return `\\operatorname{orth}_{v}\\left(${formattedValue}\\right)`;
    case 'unit':
      return callLatex('unit', formattedValue);
  }
}

function binaryToken(operator: LinearAlgebraBinaryOperator) {
  switch (operator) {
    case 'add':
      return '+';
    case 'subtract':
      return '-';
    case 'multiply':
    case 'cross':
      return '\\times ';
    case 'dot':
      return '\\cdot ';
  }
}

function negatedVectorDisplayLatex(expression: LinearAlgebraEditorExpression) {
  if (expression.kind !== 'vectorLiteral') {
    return formatLinearAlgebraEditorExpression(expression);
  }

  return exactVectorWireToLatex(expression.exactValue.map((value) => ({
    numerator: -value.numerator,
    denominator: value.denominator,
  })));
}

export function formatLinearAlgebraEditorExpression(expression: LinearAlgebraEditorExpression): string {
  switch (expression.kind) {
    case 'named':
      return expression.displayLatex;
    case 'matrixLiteral':
    case 'vectorLiteral':
    case 'scalar':
      return expression.displayLatex;
    case 'negate':
      return `-${suffixOperand(expression.value)}`;
    case 'scale':
      return `${expression.scalar.displayLatex}${suffixOperand(expression.vector)}`;
    case 'vectorDivide':
      return `\\frac{${formatLinearAlgebraEditorExpression(expression.vector)}}{${expression.scalar.displayLatex}}`;
    case 'unary':
      return formatUnary(expression.operator, expression.value);
    case 'binary':
      return [
        formatLinearAlgebraEditorExpression(expression.left),
        binaryToken(expression.operator),
        formatLinearAlgebraEditorExpression(expression.right),
      ].join('');
    case 'angle':
      return `\\angle\\left(${formatLinearAlgebraEditorExpression(expression.left)},${formatLinearAlgebraEditorExpression(expression.right)}\\right)`;
    case 'orthogonality':
      return callLatex(
        'orthogonal',
        formatLinearAlgebraEditorExpression(expression.left),
        formatLinearAlgebraEditorExpression(expression.right),
      );
    case 'gramSchmidt':
      return callLatex(
        'gram',
        formatLinearAlgebraEditorExpression(expression.left),
        formatLinearAlgebraEditorExpression(expression.right),
      );
    case 'vectorFamily':
      return callLatex(
        expression.operator,
        ...expression.operands.map(formatLinearAlgebraEditorExpression),
      );
    case 'projection':
      return callLatex(
        'proj',
        formatLinearAlgebraEditorExpression(expression.base),
        formatLinearAlgebraEditorExpression(expression.target),
      );
    case 'scalarTripleProduct':
      return callLatex(
        'triple',
        formatLinearAlgebraEditorExpression(expression.first),
        formatLinearAlgebraEditorExpression(expression.second),
        formatLinearAlgebraEditorExpression(expression.third),
      );
    case 'coordinates':
      return callLatex(
        'coords',
        formatLinearAlgebraEditorExpression(expression.basis),
        formatLinearAlgebraEditorExpression(expression.vector),
      );
    case 'columnProjection':
      return callLatex(
        'projcol',
        formatLinearAlgebraEditorExpression(expression.matrix),
        formatLinearAlgebraEditorExpression(expression.vector),
      );
    case 'leastSquares':
      return callLatex(
        'ls',
        formatLinearAlgebraEditorExpression(expression.matrix),
        formatLinearAlgebraEditorExpression(expression.vector),
      );
    case 'matrixPower':
      return callLatex(
        'mpow',
        formatLinearAlgebraEditorExpression(expression.matrix),
        expression.exponentLatex,
      );
    case 'factorSolve':
      return callLatex(
        expression.method === 'lu' ? 'lusolve' : 'plusolve',
        formatLinearAlgebraEditorExpression(expression.matrix),
        formatLinearAlgebraEditorExpression(expression.vector),
      );
    case 'changeOfBasis':
      return callLatex(
        'change',
        formatLinearAlgebraEditorExpression(expression.source),
        formatLinearAlgebraEditorExpression(expression.target),
      );
    case 'multiRhsSystem':
      return `${formatLinearAlgebraEditorExpression(expression.coefficients)} X = ${formatLinearAlgebraEditorExpression(expression.constants)}`;
    case 'linearSystem':
      if (expression.form === 'Ax+b=0') {
        return `${formatLinearAlgebraEditorExpression(expression.coefficients)} x + ${negatedVectorDisplayLatex(expression.constants)} = 0`;
      }
      return `${formatLinearAlgebraEditorExpression(expression.coefficients)} x = ${formatLinearAlgebraEditorExpression(expression.constants)}`;
  }
}
