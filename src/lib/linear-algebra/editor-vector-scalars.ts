import type {
  ExactScalarWire,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
} from '../../types/calculator';
import {
  exactWireToLatex,
  tryParseExactScalarLiteral,
} from './editor-matrix-literals';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

export type LinearAlgebraScalarExpression = {
  kind: 'scalar';
  exactValue: ExactScalarWire;
  displayLatex: string;
};

export type LinearAlgebraSymbolicScalarExpression = {
  kind: 'symbolicScalar';
  scalarWire: LinearAlgebraScalarWireV1;
  displayLatex: string;
};

export type LinearAlgebraVectorScalarExpression =
  | LinearAlgebraScalarExpression
  | LinearAlgebraSymbolicScalarExpression;

type ScalarArithmeticNode = {
  kind: string;
  left?: ScalarArithmeticNode;
  right?: ScalarArithmeticNode;
};

export function parseScalarExpression(input: string): LinearAlgebraScalarExpression | null {
  const exactValue = tryParseExactScalarLiteral(input);
  return exactValue
    ? { kind: 'scalar', exactValue, displayLatex: exactWireToLatex(exactValue) }
    : null;
}

export function parseSymbolicScalarExpression(
  input: string,
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraSymbolicScalarExpression | null {
  const parsed = parseLinearAlgebraScalarWire(input, domain);
  return parsed.ok
    ? { kind: 'symbolicScalar', scalarWire: parsed.value, displayLatex: parsed.value.canonicalLatex }
    : null;
}

export function splitLeadingScalarProduct(
  input: string,
): { scalar: LinearAlgebraScalarExpression; rest: string } | null {
  const latexFraction = input.match(/^(\\frac\{-?(?:\d+\.?\d*|\.\d+)\}\{-?(?:\d+\.?\d*|\.\d+)\})(.+)$/);
  const asciiFraction = input.match(/^(-?(?:\d+\.?\d*|\.\d+)\/-?(?:\d+\.?\d*|\.\d+))(.+)$/);
  const decimal = input.match(/^(-?(?:\d+\.?\d*|\.\d+))(.+)$/);
  const match = latexFraction ?? asciiFraction ?? decimal;
  if (!match) return null;
  const scalar = parseScalarExpression(match[1]);
  const rest = match[2];
  return scalar
    && rest
    && !rest.startsWith('\\cdot')
    && !rest.startsWith('\\times')
    && !rest.startsWith('*')
    && !rest.startsWith('/')
    ? { scalar, rest }
    : null;
}

export function splitLatexFraction(input: string): [string, string] | null {
  if (!input.startsWith('\\frac{')) return null;
  let index = '\\frac'.length;
  const groups: string[] = [];
  for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
    if (input[index] !== '{') return null;
    let depth = 0;
    const start = index + 1;
    for (; index < input.length; index += 1) {
      if (input[index] === '{') depth += 1;
      if (input[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          groups.push(input.slice(start, index));
          index += 1;
          break;
        }
      }
    }
  }
  return groups.length === 2 && index === input.length ? [groups[0], groups[1]] : null;
}

export function containsVectorScalarArithmetic(expression: ScalarArithmeticNode): boolean {
  switch (expression.kind) {
    case 'scale':
    case 'negate':
    case 'vectorDivide':
      return true;
    case 'binary':
      return Boolean(
        expression.left
        && expression.right
        && (
          containsVectorScalarArithmetic(expression.left)
          || containsVectorScalarArithmetic(expression.right)
          || expression.left.kind === 'scalar'
          || expression.left.kind === 'symbolicScalar'
          || expression.right.kind === 'scalar'
          || expression.right.kind === 'symbolicScalar'
        )
      );
    default:
      return false;
  }
}
