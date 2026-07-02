export type LinearAlgebraEditorMode = 'matrix' | 'vector';

export type LinearAlgebraNamedValue = 'A' | 'B' | 'u' | 'v';

export type LinearAlgebraValueExpression =
  | { kind: 'named'; name: LinearAlgebraNamedValue }
  | { kind: 'matrixLiteral'; value: number[][] }
  | { kind: 'vectorLiteral'; value: number[] };

export type LinearAlgebraUnaryOperator =
  | 'determinant'
  | 'rank'
  | 'rref'
  | 'transpose'
  | 'inverse'
  | 'norm';

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
  | { kind: 'angle'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression };

export type LinearAlgebraEditorParseErrorReason =
  | 'empty-expression'
  | 'placeholder'
  | 'invalid-matrix-literal'
  | 'invalid-number'
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

function parseLatexNumber(input: string): number {
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(input)) {
    return Number(input);
  }

  const fraction = input.match(/^(-)?\\frac\{(-?(?:\d+\.?\d*|\.\d+))\}\{(-?(?:\d+\.?\d*|\.\d+))\}$/);
  if (fraction) {
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    if (denominator === 0) {
      fail('invalid-number', 'Matrix and vector entries cannot divide by zero.');
    }
    return (fraction[1] ? -1 : 1) * numerator / denominator;
  }

  fail('invalid-number', `Unsupported numeric entry "${input}".`);
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
  const matrix = rows.map((row) => {
    if (!row) {
      fail('invalid-matrix-literal', 'Matrix/vector literals cannot contain empty rows.');
    }
    return row.split('&').map((cell) => parseLatexNumber(cell));
  });
  const columns = matrix[0]?.length ?? 0;
  if (columns === 0 || matrix.some((row) => row.length !== columns)) {
    fail('invalid-matrix-literal', 'Matrix rows must have a consistent number of columns.');
  }

  return columns === 1
    ? { kind: 'vectorLiteral', value: matrix.map((row) => row[0]) }
    : { kind: 'matrixLiteral', value: matrix };
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
    ['norm', 'norm'],
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
