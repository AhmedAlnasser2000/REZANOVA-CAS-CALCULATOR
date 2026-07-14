import {
  exactVectorWireToLatex,
  matrixEnvironmentEndAt,
  parseMatrixLiteral,
  parsePlainListLiteral,
} from './editor-matrix-literals';
import {
  fail,
  ParseFailure,
} from './editor-parser-errors';
import {
  isMatrixNamedValueName,
  isVectorNamedValueName,
} from './named-values';
import { splitTopLevelArguments } from './editor-parser-arguments';
import {
  parseScalarExpression,
  splitLatexFraction,
  splitLeadingScalarProduct,
} from './editor-vector-scalars';
import type {
  LinearAlgebraEditorExpression,
  LinearAlgebraEditorParseOptions,
  LinearAlgebraEditorParseResult,
  LinearAlgebraNamedValue,
  LinearAlgebraUnaryOperator,
  LinearAlgebraValueExpression,
} from './editor-parser-types';

export type { LinearAlgebraEditorParseErrorReason } from './editor-parser-errors';
export type {
  LinearAlgebraBinaryOperator,
  LinearAlgebraEditorExpression,
  LinearAlgebraEditorMode,
  LinearAlgebraEditorParseOptions,
  LinearAlgebraEditorParseResult,
  LinearAlgebraNamedValue,
  LinearAlgebraScalarExpression,
  LinearAlgebraSystemForm,
  LinearAlgebraUnaryOperator,
  LinearAlgebraValueExpression,
} from './editor-parser-types';

function normalizeLatex(latex: string): string {
  return latex
    .trim()
    .replace(/\s+/g, '')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\,/g, '')
    .replace(/\\;/g, '')
    .replace(/\\operatorname\{rank\}/g, 'rank')
    .replace(/\\operatorname\{Rank\}/g, 'rank')
    .replace(/\\operatorname\{rref\}/g, 'rref')
    .replace(/\\operatorname\{RREF\}/g, 'rref')
    .replace(/\\operatorname\{null\}/g, 'null')
    .replace(/\\operatorname\{Null\}/g, 'null')
    .replace(/\\operatorname\{col\}/g, 'col')
    .replace(/\\operatorname\{Col\}/g, 'col')
    .replace(/\\operatorname\{basis\}/g, 'basis')
    .replace(/\\operatorname\{Basis\}/g, 'basis')
    .replace(/\\operatorname\{coords\}/g, 'coords')
    .replace(/\\operatorname\{Coords\}/g, 'coords')
    .replace(/\\operatorname\{coord\}/g, 'coords')
    .replace(/\\operatorname\{Coord\}/g, 'coords')
    .replace(/\\operatorname\{change\}/g, 'change')
    .replace(/\\operatorname\{Change\}/g, 'change')
    .replace(/\\operatorname\{changebasis\}/g, 'changebasis')
    .replace(/\\operatorname\{ChangeBasis\}/g, 'changebasis')
    .replace(/\\operatorname\{lu\}/g, 'lu')
    .replace(/\\operatorname\{LU\}/g, 'lu')
    .replace(/\\operatorname\{plu\}/g, 'plu')
    .replace(/\\operatorname\{PLU\}/g, 'plu')
    .replace(/\\operatorname\{qr\}/g, 'qr')
    .replace(/\\operatorname\{QR\}/g, 'qr')
    .replace(/\\operatorname\{projcol\}/g, 'projcol')
    .replace(/\\operatorname\{ProjCol\}/g, 'projcol')
    .replace(/\\operatorname\{colproj\}/g, 'projcol')
    .replace(/\\operatorname\{ColProj\}/g, 'projcol')
    .replace(/\\operatorname\{ls\}/g, 'ls')
    .replace(/\\operatorname\{mpow\}/g, 'mpow')
    .replace(/\\operatorname\{MPow\}/g, 'mpow')
    .replace(/\\operatorname\{least\}/g, 'ls')
    .replace(/\\operatorname\{Least\}/g, 'ls')
    .replace(/\\operatorname\{lstsq\}/g, 'ls')
    .replace(/\\operatorname\{LSTSQ\}/g, 'ls')
    .replace(/\\operatorname\{lusolve\}/g, 'lusolve')
    .replace(/\\operatorname\{LUSolve\}/g, 'lusolve')
    .replace(/\\operatorname\{plusolve\}/g, 'plusolve')
    .replace(/\\operatorname\{PLUSolve\}/g, 'plusolve')
    .replace(/\\operatorname\{invertible\}/g, 'invertible')
    .replace(/\\operatorname\{Invertible\}/g, 'invertible')
    .replace(/\\operatorname\{eigen\}/g, 'eigen')
    .replace(/\\operatorname\{Eigen\}/g, 'eigen')
    .replace(/\\operatorname\{diag\}/g, 'diag')
    .replace(/\\operatorname\{Diag\}/g, 'diag')
    .replace(/\\operatorname\{diagonalize\}/g, 'diag')
    .replace(/\\operatorname\{Diagonalize\}/g, 'diag')
    .replace(/\\operatorname\{proj\}_\{u\}/g, 'proj_u')
    .replace(/\\operatorname\{proj\}_u/g, 'proj_u')
    .replace(/\\operatorname\{proj\}_\{v\}/g, 'proj_v')
    .replace(/\\operatorname\{proj\}_v/g, 'proj_v')
    .replace(/\\operatorname\{proj\}/g, 'proj')
    .replace(/\\operatorname\{cross\}/g, 'cross')
    .replace(/\\operatorname\{Cross\}/g, 'cross')
    .replace(/\\operatorname\{triple\}/g, 'triple')
    .replace(/\\operatorname\{Triple\}/g, 'triple')
    .replace(/\\operatorname\{scalartriple\}/g, 'triple')
    .replace(/\\operatorname\{ScalarTriple\}/g, 'triple')
    .replace(/\\operatorname\{stp\}/g, 'triple')
    .replace(/\\operatorname\{STP\}/g, 'triple')
    .replace(/\\operatorname\{orth\}_\{u\}/g, 'orth_u')
    .replace(/\\operatorname\{orth\}_u/g, 'orth_u')
    .replace(/\\operatorname\{orth\}_\{v\}/g, 'orth_v')
    .replace(/\\operatorname\{orth\}_v/g, 'orth_v')
    .replace(/\\operatorname\{unit\}/g, 'unit')
    .replace(/\\operatorname\{orthogonal\}/g, 'orthogonal')
    .replace(/\\operatorname\{gram\}/g, 'gram')
    .replace(/\\operatorname\{span\}/g, 'span')
    .replace(/\\operatorname\{independent\}/g, 'independent')
    .replace(/\\operatorname\{profile\}/g, 'profile')
    .replace(/\\operatorname\{angle\}/g, 'angle')
    .replace(/\\operatorname\{(parallel|distance|parallelogramArea|triangleArea|volume)\}/g, '$1')
    .replace(/\\det/g, 'det')
    .replace(/\\angle/g, 'angle')
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\\tfrac/g, '\\frac')
    .replace(/\\lbrack/g, '[')
    .replace(/\\rbrack/g, ']');
}

function splitTopLevel(input: string, tokens: readonly string[]): { token: string; left: string; right: string } | null {
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    if (input.startsWith('\\begin{', index)) {
      const environmentEnd = matrixEnvironmentEndAt(input, index);
      if (environmentEnd === null) {
        return null;
      }
      index = environmentEnd - 1;
      continue;
    }

    const char = input[index];
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (braceDepth > 0 || parenDepth > 0 || bracketDepth > 0) {
      continue;
    }

    for (const token of tokens) {
      if (input.startsWith(token, index) && !(token === '-' && index === 0)) {
        return {
          token,
          left: input.slice(0, index),
          right: input.slice(index + token.length),
        };
      }
    }
  }

  return null;
}

function splitTopLevelComma(input: string): [string, string] | null {
  const split = splitTopLevel(input, [',']);
  return split ? [split.left, split.right] : null;
}

function functionArgument(input: string, name: string): string | null {
  const prefix = `${name}(`;
  return input.startsWith(prefix) && input.endsWith(')')
    ? input.slice(prefix.length, -1)
    : null;
}

function normWrapperArgument(input: string): string | null {
  return input.startsWith('\\lVert') && input.endsWith('\\rVert')
    ? input.slice('\\lVert'.length, -'\\rVert'.length)
    : null;
}

function namedValueExpression(name: LinearAlgebraNamedValue): LinearAlgebraValueExpression {
  return {
    kind: 'named',
    name,
    displayLatex: name,
  };
}

function isMatrixName(name: string, options: LinearAlgebraEditorParseOptions) {
  return isMatrixNamedValueName(name, options.matrixNamedValues);
}

function isVectorName(name: string, options: LinearAlgebraEditorParseOptions) {
  return isVectorNamedValueName(name, options.vectorNamedValues);
}

function parseMatrixPowerExponent(input: string): { exponent: number; exponentLatex: string } {
  if (!/^-?\d+$/.test(input)) {
    fail('invalid-number', 'Matrix powers need an integer exponent.');
  }
  const exponent = Number(input);
  if (!Number.isSafeInteger(exponent)) {
    fail('invalid-number', 'Matrix power exponent is outside the safe integer range.');
  }
  return { exponent, exponentLatex: input };
}

function isMatrixCoefficientExpression(
  expression: LinearAlgebraEditorExpression | null,
  options: LinearAlgebraEditorParseOptions,
): expression is LinearAlgebraValueExpression {
  return expression !== null && (
    expression.kind === 'matrixLiteral'
    || (expression.kind === 'named' && isMatrixName(expression.name, options))
  );
}

function isInlineVectorExpression(
  expression: LinearAlgebraEditorExpression | null,
): expression is LinearAlgebraValueExpression {
  return expression !== null && expression.kind === 'vectorLiteral';
}

function isMatrixRhsExpression(
  expression: LinearAlgebraEditorExpression | null,
  options: LinearAlgebraEditorParseOptions,
): expression is LinearAlgebraValueExpression {
  return expression !== null && (
    expression.kind === 'matrixLiteral'
    || (expression.kind === 'named' && isMatrixName(expression.name, options))
  );
}

function negateVectorExpression(expression: LinearAlgebraValueExpression): LinearAlgebraValueExpression {
  if (expression.kind !== 'vectorLiteral') {
    return expression;
  }

  const exactValue = expression.exactValue.map((value) => ({
    numerator: -value.numerator,
    denominator: value.denominator,
  }));
  return {
    kind: 'vectorLiteral',
    value: expression.value.map((value) => -value),
    exactValue,
    displayLatex: exactVectorWireToLatex(exactValue),
  };
}

function isSingleWrappedParenGroup(input: string): boolean {
  if (!input.startsWith('(') || !input.endsWith(')')) {
    return false;
  }

  let depth = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0 && index < input.length - 1) {
        return false;
      }
    }
  }
  return depth === 0;
}

function stripWrappedParens(input: string): string {
  return isSingleWrappedParenGroup(input) ? input.slice(1, -1) : input;
}

function tryParseExpression(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraEditorExpression | null {
  try {
    return parseExpression(input, options);
  } catch (error) {
    if (error instanceof ParseFailure) {
      return null;
    }
    throw error;
  }
}

function parseCoefficientTimesX(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraValueExpression | null {
  const normalized = stripWrappedParens(input);
  const suffixes = ['\\timesx', '\\cdotx', '*x', 'x'];
  const suffix = suffixes.find((candidate) => normalized.endsWith(candidate));
  if (!suffix) {
    return null;
  }

  const coefficientLatex = normalized.slice(0, -suffix.length);
  if (!coefficientLatex) {
    return null;
  }

  const coefficient = tryParseExpression(coefficientLatex, options);
  return isMatrixCoefficientExpression(coefficient, options) ? coefficient : null;
}

function parseCoefficientTimesUnknownMatrix(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraValueExpression | null {
  const normalized = stripWrappedParens(input);
  const suffixes = ['\\timesX', '\\cdotX', '*X', 'X'];
  const suffix = suffixes.find((candidate) => normalized.endsWith(candidate));
  if (!suffix) {
    return null;
  }

  const coefficientLatex = normalized.slice(0, -suffix.length);
  if (!coefficientLatex) {
    return null;
  }

  const coefficient = tryParseExpression(coefficientLatex, options);
  return isMatrixCoefficientExpression(coefficient, options) ? coefficient : null;
}

function parseLinearSystemExpression(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraEditorExpression | null {
  const equation = splitTopLevel(input, ['=']);
  if (!equation || !equation.left || !equation.right) {
    return null;
  }

  const directCoefficients = parseCoefficientTimesX(equation.left, options);
  if (directCoefficients) {
    const constants = tryParseExpression(equation.right, options);
    return isInlineVectorExpression(constants)
      ? {
          kind: 'linearSystem',
          form: 'Ax=b',
          coefficients: directCoefficients,
          constants,
        }
      : null;
  }

  const multiRhsCoefficients = parseCoefficientTimesUnknownMatrix(equation.left, options);
  if (multiRhsCoefficients) {
    const constants = tryParseExpression(equation.right, options);
    return isMatrixRhsExpression(constants, options)
      ? {
          kind: 'multiRhsSystem',
          coefficients: multiRhsCoefficients,
          constants,
        }
      : null;
  }

  if (equation.right !== '0') {
    return null;
  }

  const leftOffset = splitTopLevel(equation.left, ['+', '-']);
  if (!leftOffset || !leftOffset.left || !leftOffset.right) {
    return null;
  }

  const coefficients = parseCoefficientTimesX(leftOffset.left, options);
  if (!coefficients) {
    return null;
  }

  const offset = tryParseExpression(leftOffset.right, options);
  if (!isInlineVectorExpression(offset)) {
    return null;
  }

  return {
    kind: 'linearSystem',
    form: 'Ax+b=0',
    coefficients,
    constants: leftOffset.token === '+' ? negateVectorExpression(offset) : offset,
  };
}

function parseSuffixUnary(input: string, options: LinearAlgebraEditorParseOptions): LinearAlgebraEditorExpression | null {
  const suffixes: Array<[string, LinearAlgebraUnaryOperator]> = [
    ['^{\\mathsf{T}}', 'transpose'],
    ['^{T}', 'transpose'],
    ['^T', 'transpose'],
    ['^{\\top}', 'transpose'],
    ['^\\top', 'transpose'],
    ['^{-1}', 'inverse'],
  ];

  for (const [suffix, operator] of suffixes) {
    if (input.endsWith(suffix)) {
      const value = input.slice(0, -suffix.length);
      if (!value) {
        fail('unsupported-expression', `Missing operand before ${suffix}.`);
      }
      return { kind: 'unary', operator, value: parseExpression(value, options) };
    }
  }

  return null;
}

function parseExpression(input: string, options: LinearAlgebraEditorParseOptions): LinearAlgebraEditorExpression {
  const unwrapped = stripWrappedParens(input);
  if (unwrapped !== input) {
    return parseExpression(unwrapped, options);
  }

  const normArgument = normWrapperArgument(input);
  if (normArgument !== null) {
    return {
      kind: 'unary',
      operator: 'norm',
      value: parseExpression(normArgument, options),
    };
  }

  const addSubtract = splitTopLevel(input, ['+', '-']);
  if (addSubtract) {
    if (!addSubtract.left || !addSubtract.right) {
      fail('unsupported-expression', 'Addition and subtraction require two operands.');
    }
    return {
      kind: 'binary',
      operator: addSubtract.token === '+' ? 'add' : 'subtract',
      left: parseExpression(addSubtract.left, options),
      right: parseExpression(addSubtract.right, options),
    };
  }

  if (input.startsWith('-')) {
    if (input.length === 1) {
      fail('unsupported-expression', 'Vector negation needs an operand.');
    }
    return { kind: 'negate', value: parseExpression(input.slice(1), options) };
  }

  if (options.mode === 'vector') {
    const implicitScale = splitLeadingScalarProduct(input);
    if (implicitScale) {
      return {
        kind: 'scale',
        scalar: implicitScale.scalar,
        vector: parseExpression(implicitScale.rest, options),
      };
    }

    const latexFraction = splitLatexFraction(input);
    if (latexFraction) {
      const denominator = parseScalarExpression(latexFraction[1]);
      if (!denominator) {
        fail('unsupported-expression', 'Vector division needs an exact numeric scalar denominator.');
      }
      const numerator = parseExpression(latexFraction[0], options);
      if (numerator.kind === 'scalar') {
        fail('unsupported-expression', 'Scalar-only expressions are not Vector results.');
      }
      return { kind: 'vectorDivide', vector: numerator, scalar: denominator };
    }

    const divide = splitTopLevel(input, ['/']);
    if (divide) {
      const denominator = parseScalarExpression(divide.right);
      const numerator = tryParseExpression(divide.left, options);
      if (!denominator) {
        fail('unsupported-expression', 'Vector division needs an exact numeric scalar denominator.');
      }
      if (!numerator || numerator.kind === 'scalar') {
        fail('unsupported-expression', 'A scalar cannot be divided by a vector.');
      }
      return { kind: 'vectorDivide', vector: numerator, scalar: denominator };
    }
  }

  const dot = splitTopLevel(input, ['\\cdot']);
  if (dot) {
    return {
      kind: 'binary',
      operator: 'dot',
      left: parseExpression(dot.left, options),
      right: parseExpression(dot.right, options),
    };
  }

  const times = splitTopLevel(input, ['\\times', '*']);
  if (times) {
    return {
      kind: 'binary',
      operator: options.mode === 'vector' ? 'cross' : 'multiply',
      left: parseExpression(times.left, options),
      right: parseExpression(times.right, options),
    };
  }

  if (
    options.mode !== 'vector'
    && input.length > 1
    && [...input].every((name) => isMatrixName(name, options))
  ) {
    return [...input].slice(1).reduce<LinearAlgebraEditorExpression>(
      (left, name) => ({
        kind: 'binary',
        operator: 'multiply',
        left,
        right: namedValueExpression(name),
      }),
      namedValueExpression(input[0]),
    );
  }

  const suffix = parseSuffixUnary(input, options);
  if (suffix) {
    return suffix;
  }

  for (const [name, operator] of [
    ['det', 'determinant'],
    ['rank', 'rank'],
    ['rref', 'rref'],
    ['null', 'nullSpace'],
    ['col', 'columnSpace'],
    ['basis', 'basis'],
    ['lu', 'lu'],
    ['plu', 'plu'],
    ['qr', 'qr'],
    ['invertible', 'invertibility'],
    ['profile', 'profile'],
    ['eigen', 'eigen'],
    ['diag', 'diagonalization'],
    ['norm', 'norm'],
    ['proj_u', 'projectionOntoU'],
    ['proj_v', 'projectionOntoV'],
    ['orth_u', 'orthogonalComponentToU'],
    ['orth_v', 'orthogonalComponentToV'],
    ['unit', 'unit'],
  ] as const) {
    const argument = functionArgument(input, name);
    if (argument !== null) {
      return { kind: 'unary', operator, value: parseExpression(argument, options) };
    }
  }

  const angleArgument = functionArgument(input, 'angle');
  if (angleArgument !== null) {
    const parts = splitTopLevelComma(angleArgument);
    if (!parts) {
      fail('unsupported-expression', 'Angle requires two vector operands.');
    }
    return {
      kind: 'angle',
      left: parseExpression(parts[0], options),
      right: parseExpression(parts[1], options),
    };
  }

  const crossArgument = functionArgument(input, 'cross');
  if (crossArgument !== null) {
    const parts = splitTopLevelComma(crossArgument);
    if (!parts) {
      fail('unsupported-expression', 'Cross product requires two vector operands.');
    }
    return {
      kind: 'binary',
      operator: 'cross',
      left: parseExpression(parts[0], options),
      right: parseExpression(parts[1], options),
    };
  }

  const projectionArgument = functionArgument(input, 'proj');
  if (projectionArgument !== null) {
    const parts = splitTopLevelComma(projectionArgument);
    if (!parts) {
      fail('unsupported-expression', 'Projection requires a base vector and a target vector.');
    }
    return {
      kind: 'projection',
      base: parseExpression(parts[0], options),
      target: parseExpression(parts[1], options),
    };
  }

  const tripleArgument = functionArgument(input, 'triple');
  if (tripleArgument !== null) {
    const firstSplit = splitTopLevelComma(tripleArgument);
    const secondSplit = firstSplit ? splitTopLevelComma(firstSplit[1]) : null;
    if (!firstSplit || !secondSplit) {
      fail('unsupported-expression', 'Scalar triple product requires three vector operands.');
    }
    return {
      kind: 'scalarTripleProduct',
      first: parseExpression(firstSplit[0], options),
      second: parseExpression(secondSplit[0], options),
      third: parseExpression(secondSplit[1], options),
    };
  }

  const orthogonalityArgument = functionArgument(input, 'orthogonal');
  if (orthogonalityArgument !== null) {
    const parts = splitTopLevelComma(orthogonalityArgument);
    if (!parts) {
      fail('unsupported-expression', 'Orthogonality check requires two vector operands.');
    }
    return {
      kind: 'orthogonality',
      left: parseExpression(parts[0], options),
      right: parseExpression(parts[1], options),
    };
  }

  const gramArgument = functionArgument(input, 'gram');
  if (gramArgument !== null) {
    const operands = splitTopLevelArguments(gramArgument);
    if (!operands || operands.length < 1 || operands.length > 6) {
      fail('unsupported-expression', 'Gram-Schmidt requires one through six vector operands.');
    }
    return {
      kind: 'gramSchmidt',
      operands: operands.map((operand) => parseExpression(operand, options)),
    };
  }

  for (const [operator, operandCount] of [
    ['parallel', 2],
    ['distance', 2],
    ['parallelogramArea', 2],
    ['triangleArea', 2],
    ['volume', 3],
  ] as const) {
    const argument = functionArgument(input, operator);
    if (argument !== null) {
      const operands = splitTopLevelArguments(argument);
      if (!operands || operands.length !== operandCount) {
        fail(
          'unsupported-expression',
          `${operator === 'volume' ? 'Volume' : operator} requires exactly ${operandCount} vector operands.`,
        );
      }
      return {
        kind: 'geometricMeasure',
        operator,
        operands: operands.map((operand) => parseExpression(operand, options)),
      };
    }
  }

  for (const operator of ['span', 'independent'] as const) {
    const argument = functionArgument(input, operator);
    if (argument !== null) {
      const operands = splitTopLevelArguments(argument);
      if (!operands || operands.length === 0) {
        fail('unsupported-expression', `${operator === 'span' ? 'Span' : 'Independence'} needs at least one vector.`);
      }
      return {
        kind: 'vectorFamily',
        operator,
        operands: operands.map((operand) => parseExpression(operand, options)),
      };
    }
  }

  const coordsArgument = functionArgument(input, 'coords');
  if (coordsArgument !== null) {
    const parts = splitTopLevelComma(coordsArgument);
    if (!parts) {
      fail('unsupported-expression', 'Coordinates require a basis matrix and a vector.');
    }
    return {
      kind: 'coordinates',
      basis: parseExpression(parts[0], options),
      vector: parseExpression(parts[1], options),
    };
  }

  const columnProjectionArgument = functionArgument(input, 'projcol');
  if (columnProjectionArgument !== null) {
    const parts = splitTopLevelComma(columnProjectionArgument);
    if (!parts) {
      fail('unsupported-expression', 'Column projection requires a matrix and an inline vector.');
    }
    return {
      kind: 'columnProjection',
      matrix: parseExpression(parts[0], options),
      vector: parseExpression(parts[1], options),
    };
  }

  const leastSquaresArgument = functionArgument(input, 'ls');
  if (leastSquaresArgument !== null) {
    const parts = splitTopLevelComma(leastSquaresArgument);
    if (!parts) {
      fail('unsupported-expression', 'Least squares requires a matrix and an inline vector.');
    }
    return {
      kind: 'leastSquares',
      matrix: parseExpression(parts[0], options),
      vector: parseExpression(parts[1], options),
    };
  }

  const matrixPowerArgument = functionArgument(input, 'mpow');
  if (matrixPowerArgument !== null) {
    const parts = splitTopLevelComma(matrixPowerArgument);
    if (!parts) {
      fail('unsupported-expression', 'Matrix powers require a matrix and an integer exponent.');
    }
    const exponent = parseMatrixPowerExponent(parts[1]);
    return {
      kind: 'matrixPower',
      matrix: parseExpression(parts[0], options),
      exponent: exponent.exponent,
      exponentLatex: exponent.exponentLatex,
    };
  }

  for (const [name, method] of [
    ['lusolve', 'lu'],
    ['plusolve', 'plu'],
  ] as const) {
    const solveArgument = functionArgument(input, name);
    if (solveArgument !== null) {
      const parts = splitTopLevelComma(solveArgument);
      if (!parts) {
        fail('unsupported-expression', 'Factor solve requires a matrix and an inline RHS vector.');
      }
      return {
        kind: 'factorSolve',
        method,
        matrix: parseExpression(parts[0], options),
        vector: parseExpression(parts[1], options),
      };
    }
  }

  const changeArgument = functionArgument(input, 'change') ?? functionArgument(input, 'changebasis');
  if (changeArgument !== null) {
    const parts = splitTopLevelComma(changeArgument);
    if (!parts) {
      fail('unsupported-expression', 'Change of basis requires source and target basis matrices.');
    }
    return {
      kind: 'changeOfBasis',
      source: parseExpression(parts[0], options),
      target: parseExpression(parts[1], options),
    };
  }

  const literal = parseMatrixLiteral(input);
  if (literal) {
    return literal;
  }

  const plainListLiteral = parsePlainListLiteral(input);
  if (plainListLiteral) {
    return plainListLiteral;
  }

  const scalar = parseScalarExpression(input);
  if (scalar) {
    return scalar;
  }

  if (isMatrixName(input, options)) {
    return namedValueExpression(input);
  }

  if (isVectorName(input, options)) {
    return namedValueExpression(input);
  }

  if (
    options.mode === 'vector'
    && /^[A-Za-z][A-Za-z]$/.test(input)
    && isVectorName(input.slice(1), options)
  ) {
    fail('unsupported-expression', 'Symbolic vector coefficients are not supported yet. Use an exact number.');
  }

  fail('unsupported-expression', 'Unsupported Matrix/Vector editor expression.');
}

export function parseLinearAlgebraEditorLatex(
  latex: string,
  options: LinearAlgebraEditorParseOptions = {},
): LinearAlgebraEditorParseResult {
  try {
    const normalized = normalizeLatex(latex);
    if (!normalized) {
      fail('empty-expression', 'Enter a Matrix or Vector expression.');
    }
    if (normalized.includes('#') || normalized.includes('\\placeholder')) {
      fail('placeholder', 'Fill every Matrix/Vector template slot before running it.');
    }

    if (normalized.includes('=')) {
      if (options.mode === 'matrix') {
        const system = parseLinearSystemExpression(normalized, options);
        if (system) {
          return {
            ok: true,
            expression: system,
          };
        }
      }
      fail(
        'unsupported-equation-shape',
        'This equation is outside Matrix/Vector structured forms. Open it in Equation for free-form solving.',
      );
    }

    return {
      ok: true,
      expression: parseExpression(normalized, options),
    };
  } catch (error) {
    if (error instanceof ParseFailure) {
      return {
        ok: false,
        reason: error.reason,
        message: error.message,
      };
    }

    return {
      ok: false,
      reason: 'unsupported-expression',
      message: 'Unsupported Matrix/Vector editor expression.',
    };
  }
}
