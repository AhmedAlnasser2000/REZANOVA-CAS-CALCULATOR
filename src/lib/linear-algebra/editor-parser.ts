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
import { normalizeLinearAlgebraEditorLatex } from './editor-normalize';
import {
  parseScalarExpression,
  parseSymbolicScalarExpression,
  splitLatexFraction,
  splitLeadingScalarProduct,
} from './editor-vector-scalars';
import { symbolicScalarNegate } from './symbolic-scalar-core';
import type {
  LinearAlgebraEditorExpression,
  LinearAlgebraEditorParseOptions,
  LinearAlgebraEditorParseResult,
  LinearAlgebraNamedValue,
  LinearAlgebraUnaryOperator,
  LinearAlgebraValueExpression,
  LinearAlgebraVectorScalarExpression,
} from './editor-parser-types';
import type { LinearAlgebraScalarDomain } from '../../types/calculator';

export type { LinearAlgebraEditorParseErrorReason } from './editor-parser-errors';
export type {
  LinearAlgebraBinaryOperator,
  LinearAlgebraEditorExpression,
  LinearAlgebraEditorMode,
  LinearAlgebraEditorParseOptions,
  LinearAlgebraEditorParseResult,
  LinearAlgebraNamedValue,
  LinearAlgebraScalarExpression,
  LinearAlgebraSymbolicScalarExpression,
  LinearAlgebraVectorScalarExpression,
  LinearAlgebraSystemForm,
  LinearAlgebraUnaryOperator,
  LinearAlgebraValueExpression,
} from './editor-parser-types';

function parseVectorScalarExpression(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraVectorScalarExpression | null {
  return parseScalarExpression(input)
    ?? (options.scalarDomain
      ? parseSymbolicScalarExpression(input, options.scalarDomain)
      : null);
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
  return expression !== null && (
    expression.kind === 'vectorLiteral'
    || expression.kind === 'symbolicVectorLiteral'
  );
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

function negateVectorExpression(
  expression: LinearAlgebraValueExpression,
  domain: LinearAlgebraScalarDomain = 'real',
): LinearAlgebraValueExpression {
  if (expression.kind === 'symbolicVectorLiteral') {
    const value = expression.value.map((entry) => symbolicScalarNegate(entry, domain));
    return {
      kind: 'symbolicVectorLiteral',
      value,
      displayLatex: `\\begin{bmatrix}${value.map((entry) => entry.canonicalLatex).join('\\\\')}\\end{bmatrix}`,
    };
  }
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

function symbolicUnknownIdentifier(
  input: string,
  options: LinearAlgebraEditorParseOptions,
) {
  if (!options.scalarDomain) return null;
  const parsed = parseSymbolicScalarExpression(input, options.scalarDomain);
  if (!parsed) return null;
  const node = parsed.scalarWire.mathJson;
  const identifier = typeof node === 'string'
    && !node.startsWith("'")
    && !['ImaginaryUnit', 'Pi', 'ExponentialE', 'Infinity'].includes(node);
  const indexed = Array.isArray(node)
    && node[0] === 'Subscript'
    && (typeof node[1] === 'string' || Array.isArray(node[1]));
  return identifier || indexed ? parsed.displayLatex : null;
}

function orderedUnknownSuffix(
  input: string,
  options: LinearAlgebraEditorParseOptions,
) {
  const bracket = /^(.*)\[([^\]]+)\](?:\^\{?T\}?)?$/u.exec(input);
  if (bracket) {
    const rawUnknowns = bracket[2].split(/[;,]/u);
    const unknowns = rawUnknowns.map((entry) => symbolicUnknownIdentifier(entry, options));
    if (unknowns.length > 0 && unknowns.every((entry): entry is string => Boolean(entry))) {
      return { coefficientLatex: bracket[1], unknowns };
    }
  }
  const column = /^(.*)\\begin\{bmatrix\}(.+)\\end\{bmatrix\}$/u.exec(input);
  if (column && !column[2].includes('&')) {
    const rawUnknowns = column[2].split('\\\\');
    const unknowns = rawUnknowns.map((entry) => symbolicUnknownIdentifier(entry, options));
    if (unknowns.length > 0 && unknowns.every((entry): entry is string => Boolean(entry))) {
      return { coefficientLatex: column[1], unknowns };
    }
  }
  return null;
}

function parseCoefficientTimesDeclaredUnknowns(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): {
  coefficients: LinearAlgebraValueExpression;
  unknowns?: string[];
  unknownVectorName?: string;
} | null {
  const normalized = stripWrappedParens(input);
  const ordered = orderedUnknownSuffix(normalized, options);
  if (ordered) {
    const coefficient = tryParseExpression(ordered.coefficientLatex, options);
    return isMatrixCoefficientExpression(coefficient, options)
      ? { coefficients: coefficient, unknowns: ordered.unknowns }
      : null;
  }
  for (let index = normalized.length - 1; index > 0; index -= 1) {
    const unknownVectorName = symbolicUnknownIdentifier(normalized.slice(index), options);
    if (!unknownVectorName) continue;
    const coefficient = tryParseExpression(normalized.slice(0, index), options);
    if (isMatrixCoefficientExpression(coefficient, options)) {
      return { coefficients: coefficient, unknownVectorName };
    }
  }
  if (normalized.endsWith('i')) {
    const coefficient = tryParseExpression(normalized.slice(0, -1), options);
    if (isMatrixCoefficientExpression(coefficient, options)) {
      fail(
        'unsupported-expression',
        options.scalarDomain === 'real'
          ? 'The imaginary unit i requires Complex mode and cannot be used as a system unknown.'
          : 'The imaginary unit i is reserved in Complex mode; choose another system unknown.',
      );
    }
  }
  return null;
}

function parseSymbolicInlineVector(
  input: string,
  options: LinearAlgebraEditorParseOptions,
): LinearAlgebraValueExpression | null {
  if (!options.scalarDomain) return null;
  let cells: string[] | null = null;
  if (input.startsWith('[') && input.endsWith(']')) {
    const body = input.slice(1, -1);
    if (body && !body.includes('[') && !body.includes(']')) {
      cells = splitTopLevelArguments(body);
    }
  } else {
    const column = /^\\begin\{bmatrix\}(.+)\\end\{bmatrix\}$/u.exec(input);
    if (column && !column[1].includes('&')) cells = column[1].split('\\\\');
  }
  if (!cells?.length) return null;
  const values = cells.map((cell) => parseSymbolicScalarExpression(cell, options.scalarDomain!));
  if (values.some((entry) => !entry)) return null;
  const scalarValues = values.map((entry) => entry!.scalarWire);
  return {
    kind: 'symbolicVectorLiteral',
    value: scalarValues,
    displayLatex: `\\begin{bmatrix}${scalarValues.map((entry) => entry.canonicalLatex).join('\\\\')}\\end{bmatrix}`,
  };
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
          ...(options.scalarDomain ? { unknownVectorName: 'x' } : {}),
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

  const declared = parseCoefficientTimesDeclaredUnknowns(equation.left, options);
  if (declared) {
    const constants = parseSymbolicInlineVector(equation.right, options)
      ?? tryParseExpression(equation.right, options);
    return constants?.kind === 'vectorLiteral' || constants?.kind === 'symbolicVectorLiteral'
      ? {
          kind: 'linearSystem',
          form: 'Ax=b',
          coefficients: declared.coefficients,
          constants,
          ...(declared.unknowns ? { unknowns: declared.unknowns } : {}),
          ...(declared.unknownVectorName
            ? { unknownVectorName: declared.unknownVectorName }
            : {}),
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
    constants: leftOffset.token === '+'
      ? negateVectorExpression(offset, options.scalarDomain)
      : offset,
    ...(options.scalarDomain ? { unknownVectorName: 'x' } : {}),
  };
}

function parseSuffixUnary(input: string, options: LinearAlgebraEditorParseOptions): LinearAlgebraEditorExpression | null {
  const suffixes: Array<[string, LinearAlgebraUnaryOperator]> = [
    ['^{\\dagger}', 'adjoint'],
    ['^\\dagger', 'adjoint'],
    ['^{*}', 'adjoint'],
    ['^*', 'adjoint'],
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

    const namedScale = [...(options.vectorNamedValues ?? [])]
      .sort((left, right) => right.length - left.length)
      .find((name) => input.endsWith(name) && input.length > name.length);
    if (namedScale) {
      const scalar = parseVectorScalarExpression(
        input.slice(0, -namedScale.length),
        options,
      );
      if (scalar) {
        return {
          kind: 'scale',
          scalar,
          vector: namedValueExpression(namedScale),
        };
      }
    }

    const latexFraction = splitLatexFraction(input);
    if (latexFraction) {
      const denominator = parseVectorScalarExpression(latexFraction[1], options);
      if (!denominator) {
        fail('unsupported-expression', 'Vector division needs a scalar denominator.');
      }
      const numerator = parseExpression(latexFraction[0], options);
      if (numerator.kind === 'scalar' || numerator.kind === 'symbolicScalar') {
        fail('unsupported-expression', 'Scalar-only expressions are not Vector results.');
      }
      return { kind: 'vectorDivide', vector: numerator, scalar: denominator };
    }

    const divide = splitTopLevel(input, ['/']);
    if (divide) {
      const denominator = parseVectorScalarExpression(divide.right, options);
      const numerator = tryParseExpression(divide.left, options);
      if (!denominator) {
        fail('unsupported-expression', 'Vector division needs a scalar denominator.');
      }
      if (!numerator || numerator.kind === 'scalar' || numerator.kind === 'symbolicScalar') {
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

  const suffix = parseSuffixUnary(input, options);
  if (suffix) {
    return suffix;
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
    ['definite', 'definiteness'],
    ['svd', 'svd'],
    ['pinv', 'pseudoinverse'],
    ['cond', 'conditionNumber'],
    ['nrank', 'numericalRank'],
    ['eigen', 'eigen'],
    ['diag', 'diagonalization'],
    ['adjoint', 'adjoint'],
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

  const symbolicVector = parseSymbolicInlineVector(input, options);
  if (symbolicVector) return symbolicVector;

  const literal = parseMatrixLiteral(input);
  if (literal) {
    return literal;
  }

  const plainListLiteral = parsePlainListLiteral(input);
  if (plainListLiteral) {
    return plainListLiteral;
  }

  if (isMatrixName(input, options)) {
    return namedValueExpression(input);
  }

  if (isVectorName(input, options)) {
    return namedValueExpression(input);
  }

  const scalar = parseVectorScalarExpression(input, options);
  if (scalar) return scalar;

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
    const normalized = normalizeLinearAlgebraEditorLatex(latex);
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
