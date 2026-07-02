import type { ExactScalarWire } from '../../types/calculator';

export type LinearAlgebraEditorMode = 'matrix' | 'vector';

export type LinearAlgebraNamedValue = 'A' | 'B' | 'u' | 'v';

export type LinearAlgebraValueExpression =
  | { kind: 'named'; name: LinearAlgebraNamedValue }
  | { kind: 'matrixLiteral'; value: number[][]; exactValue: ExactScalarWire[][] }
  | { kind: 'vectorLiteral'; value: number[]; exactValue: ExactScalarWire[] };

export type LinearAlgebraSystemForm = 'Ax=b' | 'Ax+b=0';

export type LinearAlgebraUnaryOperator =
  | 'determinant'
  | 'rank'
  | 'rref'
  | 'nullSpace'
  | 'columnSpace'
  | 'invertibility'
  | 'transpose'
  | 'inverse'
  | 'norm'
  | 'projectionOntoU'
  | 'projectionOntoV'
  | 'orthogonalComponentToU'
  | 'orthogonalComponentToV'
  | 'unit';

export type LinearAlgebraBinaryOperator =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'dot'
  | 'cross';

export type LinearAlgebraEditorExpression =
  | LinearAlgebraValueExpression
  | { kind: 'unary'; operator: LinearAlgebraUnaryOperator; value: LinearAlgebraEditorExpression }
  | { kind: 'binary'; operator: LinearAlgebraBinaryOperator; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'angle'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'orthogonality'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'gramSchmidt'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | {
      kind: 'linearSystem';
      form: LinearAlgebraSystemForm;
      coefficients: LinearAlgebraValueExpression;
      constants: LinearAlgebraValueExpression;
    };

export type LinearAlgebraEditorParseErrorReason =
  | 'empty-expression'
  | 'placeholder'
  | 'invalid-matrix-literal'
  | 'invalid-number'
  | 'unsupported-equation-shape'
  | 'unsupported-expression';

export type LinearAlgebraEditorParseResult =
  | { ok: true; expression: LinearAlgebraEditorExpression }
  | { ok: false; reason: LinearAlgebraEditorParseErrorReason; message: string };

export type LinearAlgebraEditorParseOptions = {
  mode?: LinearAlgebraEditorMode;
};

class ParseFailure extends Error {
  readonly reason: LinearAlgebraEditorParseErrorReason;

  constructor(
    reason: LinearAlgebraEditorParseErrorReason,
    message: string,
  ) {
    super(message);
    this.reason = reason;
  }
}

const BMATRIX_START = '\\begin{bmatrix}';
const BMATRIX_END = '\\end{bmatrix}';

function fail(reason: LinearAlgebraEditorParseErrorReason, message: string): never {
  throw new ParseFailure(reason, message);
}

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
    .replace(/\\operatorname\{invertible\}/g, 'invertible')
    .replace(/\\operatorname\{Invertible\}/g, 'invertible')
    .replace(/\\operatorname\{proj\}_\{u\}/g, 'proj_u')
    .replace(/\\operatorname\{proj\}_u/g, 'proj_u')
    .replace(/\\operatorname\{proj\}_\{v\}/g, 'proj_v')
    .replace(/\\operatorname\{proj\}_v/g, 'proj_v')
    .replace(/\\operatorname\{orth\}_\{u\}/g, 'orth_u')
    .replace(/\\operatorname\{orth\}_u/g, 'orth_u')
    .replace(/\\operatorname\{orth\}_\{v\}/g, 'orth_v')
    .replace(/\\operatorname\{orth\}_v/g, 'orth_v')
    .replace(/\\operatorname\{unit\}/g, 'unit')
    .replace(/\\operatorname\{orthogonal\}/g, 'orthogonal')
    .replace(/\\operatorname\{gram\}/g, 'gram')
    .replace(/\\operatorname\{angle\}/g, 'angle')
    .replace(/\\det/g, 'det')
    .replace(/\\angle/g, 'angle')
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\\tfrac/g, '\\frac');
}

function splitTopLevel(input: string, tokens: readonly string[]): { token: string; left: string; right: string } | null {
  let braceDepth = 0;
  let parenDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    if (input.startsWith(BMATRIX_START, index)) {
      const endIndex = input.indexOf(BMATRIX_END, index + BMATRIX_START.length);
      if (endIndex < 0) {
        return null;
      }
      index = endIndex + BMATRIX_END.length - 1;
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
    if (braceDepth > 0 || parenDepth > 0) {
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

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function normalizeExactWire(value: ExactScalarWire): ExactScalarWire {
  if (value.numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = value.denominator < 0 ? -1 : 1;
  const numerator = value.numerator * sign;
  const denominator = Math.abs(value.denominator);
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function exactWireToNumber(value: ExactScalarWire): number {
  return value.numerator / value.denominator;
}

function parseFiniteDecimalExact(input: string): ExactScalarWire | null {
  const match = input.match(/^(-)?(?:(\d+)(?:\.(\d*))?|\.(\d+))$/);
  if (!match) {
    return null;
  }

  const sign = match[1] ? -1 : 1;
  const whole = match[2] ?? '0';
  const fractional = match[3] ?? match[4] ?? '';
  const denominator = 10 ** fractional.length;
  const numerator = sign * Number(`${whole}${fractional || ''}`);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    fail('invalid-number', `Unsupported numeric entry "${input}".`);
  }
  return normalizeExactWire({ numerator, denominator });
}

function parseScalarAtom(input: string): ExactScalarWire {
  const decimal = parseFiniteDecimalExact(input);
  if (decimal) {
    return decimal;
  }

  const fraction = input.match(/^(-)?\\frac\{(-?(?:\d+\.?\d*|\.\d+))\}\{(-?(?:\d+\.?\d*|\.\d+))\}$/);
  if (fraction) {
    const numerator = parseScalarAtom(fraction[2]);
    const denominator = parseScalarAtom(fraction[3]);
    if (denominator.numerator === 0) {
      fail('invalid-number', 'Matrix and vector entries cannot divide by zero.');
    }
    const signedNumerator = fraction[1] ? -numerator.numerator : numerator.numerator;
    const exactNumerator = signedNumerator * denominator.denominator;
    const exactDenominator = numerator.denominator * denominator.numerator;
    if (!Number.isSafeInteger(exactNumerator) || !Number.isSafeInteger(exactDenominator)) {
      fail('invalid-number', `Unsupported numeric entry "${input}".`);
    }
    return normalizeExactWire({ numerator: exactNumerator, denominator: exactDenominator });
  }

  fail('invalid-number', `Unsupported numeric entry "${input}".`);
}

function parseLatexNumber(input: string): { value: number; exactValue: ExactScalarWire } {
  const exactValue = parseScalarAtom(input);
  return {
    value: exactWireToNumber(exactValue),
    exactValue,
  };
}

function parseMatrixLiteral(input: string): LinearAlgebraValueExpression | null {
  if (!input.startsWith(BMATRIX_START) || !input.endsWith(BMATRIX_END)) {
    return null;
  }

  const body = input.slice(BMATRIX_START.length, -BMATRIX_END.length);
  if (!body) {
    fail('invalid-matrix-literal', 'Matrix/vector literals must contain at least one entry.');
  }

  const rows = body.split('\\\\').map((row) => row.trim());
  const parsedRows = rows.map((row) => {
    if (!row) {
      fail('invalid-matrix-literal', 'Matrix/vector literals cannot contain empty rows.');
    }
    return row.split('&').map((cell) => parseLatexNumber(cell));
  });
  const matrix = parsedRows.map((row) => row.map((cell) => cell.value));
  const exactMatrix = parsedRows.map((row) => row.map((cell) => cell.exactValue));
  const columns = matrix[0]?.length ?? 0;
  if (columns === 0 || matrix.some((row) => row.length !== columns)) {
    fail('invalid-matrix-literal', 'Matrix rows must have a consistent number of columns.');
  }

  return columns === 1
    ? {
        kind: 'vectorLiteral',
        value: matrix.map((row) => row[0]),
        exactValue: exactMatrix.map((row) => row[0]),
      }
    : { kind: 'matrixLiteral', value: matrix, exactValue: exactMatrix };
}

function isMatrixCoefficientExpression(
  expression: LinearAlgebraEditorExpression | null,
): expression is LinearAlgebraValueExpression {
  return expression !== null && (
    expression.kind === 'matrixLiteral'
    || (expression.kind === 'named' && (expression.name === 'A' || expression.name === 'B'))
  );
}

function isInlineVectorExpression(
  expression: LinearAlgebraEditorExpression | null,
): expression is LinearAlgebraValueExpression {
  return expression !== null && expression.kind === 'vectorLiteral';
}

function negateVectorExpression(expression: LinearAlgebraValueExpression): LinearAlgebraValueExpression {
  return expression.kind === 'vectorLiteral'
    ? {
        kind: 'vectorLiteral',
        value: expression.value.map((value) => -value),
        exactValue: expression.exactValue.map((value) => ({
          numerator: -value.numerator,
          denominator: value.denominator,
        })),
      }
    : expression;
}

function stripWrappedParens(input: string): string {
  return input.startsWith('(') && input.endsWith(')') ? input.slice(1, -1) : input;
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
  return isMatrixCoefficientExpression(coefficient) ? coefficient : null;
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

  if (options.mode !== 'vector' && input === 'AB') {
    return {
      kind: 'binary',
      operator: 'multiply',
      left: { kind: 'named', name: 'A' },
      right: { kind: 'named', name: 'B' },
    };
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
    ['invertible', 'invertibility'],
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
    const parts = splitTopLevelComma(gramArgument);
    if (!parts) {
      fail('unsupported-expression', 'Gram-Schmidt requires two vector operands.');
    }
    return {
      kind: 'gramSchmidt',
      left: parseExpression(parts[0], options),
      right: parseExpression(parts[1], options),
    };
  }

  if (input.startsWith('\\lVert') && input.endsWith('\\rVert')) {
    return {
      kind: 'unary',
      operator: 'norm',
      value: parseExpression(input.slice('\\lVert'.length, -'\\rVert'.length), options),
    };
  }

  const literal = parseMatrixLiteral(input);
  if (literal) {
    return literal;
  }

  if (input === 'A' || input === 'B' || input === 'u' || input === 'v') {
    return { kind: 'named', name: input };
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
    if (normalized.includes('#')) {
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
