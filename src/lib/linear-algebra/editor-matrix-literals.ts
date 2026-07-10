import type { ExactScalarWire } from '../../types/calculator';
import { fail } from './editor-parser-errors';
import type { LinearAlgebraValueExpression } from './editor-parser';

const MATRIX_ENVIRONMENTS = ['bmatrix', 'matrix', 'pmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix'] as const;
const ARRAY_ENVIRONMENT = 'array';

type MatrixEnvironmentMatch = {
  bodyStart: number;
  bodyEnd: number;
  endIndex: number;
};

function readBraceGroup(input: string, startIndex: number): { endIndex: number } | null {
  if (input[startIndex] !== '{') {
    return null;
  }

  let depth = 0;
  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { endIndex: index + 1 };
      }
    }
  }

  return null;
}

function matrixEnvironmentAt(input: string, index: number): MatrixEnvironmentMatch | null {
  for (const environment of MATRIX_ENVIRONMENTS) {
    const startToken = `\\begin{${environment}}`;
    if (!input.startsWith(startToken, index)) {
      continue;
    }
    const endToken = `\\end{${environment}}`;
    const bodyStart = index + startToken.length;
    const bodyEnd = input.indexOf(endToken, bodyStart);
    if (bodyEnd < 0) {
      return null;
    }
    return { bodyStart, bodyEnd, endIndex: bodyEnd + endToken.length };
  }

  const arrayStartToken = `\\begin{${ARRAY_ENVIRONMENT}}`;
  if (!input.startsWith(arrayStartToken, index)) {
    return null;
  }
  const columnSpec = readBraceGroup(input, index + arrayStartToken.length);
  if (!columnSpec) {
    return null;
  }
  const endToken = `\\end{${ARRAY_ENVIRONMENT}}`;
  const bodyStart = columnSpec.endIndex;
  const bodyEnd = input.indexOf(endToken, bodyStart);
  if (bodyEnd < 0) {
    return null;
  }
  return { bodyStart, bodyEnd, endIndex: bodyEnd + endToken.length };
}

export function matrixEnvironmentEndAt(input: string, index: number): number | null {
  return matrixEnvironmentAt(input, index)?.endIndex ?? null;
}

function parseWholeMatrixEnvironment(input: string): MatrixEnvironmentMatch | null {
  const match = matrixEnvironmentAt(input, 0);
  return match && match.endIndex === input.length ? match : null;
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

export function exactWireToNumber(value: ExactScalarWire): number {
  return value.numerator / value.denominator;
}

export function exactWireToLatex(value: ExactScalarWire): string {
  if (value.denominator === 1) {
    return `${value.numerator}`;
  }
  if (value.numerator < 0) {
    return `-\\frac{${Math.abs(value.numerator)}}{${value.denominator}}`;
  }
  return `\\frac{${value.numerator}}{${value.denominator}}`;
}

export function exactVectorWireToLatex(vector: ExactScalarWire[]): string {
  return `\\begin{bmatrix}${vector.map(exactWireToLatex).join('\\\\')}\\end{bmatrix}`;
}

function vectorCellsToLatex(rows: string[][]): string {
  return `\\begin{bmatrix}${rows.map((row) => row[0]).join('\\\\')}\\end{bmatrix}`;
}

function matrixCellsToLatex(rows: string[][]): string {
  return `\\begin{bmatrix}${rows.map((row) => row.join('&')).join('\\\\')}\\end{bmatrix}`;
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

function parseAsciiFractionExact(input: string): ExactScalarWire | null {
  const fraction = input.match(/^(-?(?:\d+\.?\d*|\.\d+))\/(-?(?:\d+\.?\d*|\.\d+))$/);
  if (!fraction) {
    return null;
  }

  const numerator = parseFiniteDecimalExact(fraction[1]);
  const denominator = parseFiniteDecimalExact(fraction[2]);
  if (!numerator || !denominator) {
    return null;
  }
  if (denominator.numerator === 0) {
    fail('invalid-number', 'Matrix and vector entries cannot divide by zero.');
  }

  const exactNumerator = numerator.numerator * denominator.denominator;
  const exactDenominator = numerator.denominator * denominator.numerator;
  if (!Number.isSafeInteger(exactNumerator) || !Number.isSafeInteger(exactDenominator)) {
    fail('invalid-number', `Unsupported numeric entry "${input}".`);
  }
  return normalizeExactWire({ numerator: exactNumerator, denominator: exactDenominator });
}

function parseScalarAtom(input: string): ExactScalarWire {
  const asciiFraction = parseAsciiFractionExact(input);
  if (asciiFraction) {
    return asciiFraction;
  }

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

export function tryParseExactScalarLiteral(input: string): ExactScalarWire | null {
  const finiteDecimal = /^-?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))$/;
  const asciiFraction = /^-?(?:\d+\.?\d*|\.\d+)\/-?(?:\d+\.?\d*|\.\d+)$/;
  const latexFraction = /^-?\\frac\{-?(?:\d+\.?\d*|\.\d+)\}\{-?(?:\d+\.?\d*|\.\d+)\}$/;
  return finiteDecimal.test(input) || asciiFraction.test(input) || latexFraction.test(input)
    ? parseScalarAtom(input)
    : null;
}

function parseLatexNumber(input: string): { value: number; exactValue: ExactScalarWire } {
  const exactValue = parseScalarAtom(input);
  return {
    value: exactWireToNumber(exactValue),
    exactValue,
  };
}

function splitPlainListItems(input: string): string[] {
  const items: string[] = [];
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let itemStart = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '{') {
      braceDepth += 1;
    } else if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (char === '(') {
      parenDepth += 1;
    } else if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (char === '[') {
      bracketDepth += 1;
    } else if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (char === ',' && braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
      items.push(input.slice(itemStart, index));
      itemStart = index + 1;
    }
  }

  items.push(input.slice(itemStart));
  return items;
}

function parsePlainVectorCells(input: string): string[] {
  if (!input.startsWith('[') || !input.endsWith(']')) {
    fail('invalid-matrix-literal', 'Plain vector literals use brackets, for example [5,11].');
  }

  const body = input.slice(1, -1);
  if (!body) {
    fail('invalid-matrix-literal', 'Matrix/vector literals must contain at least one entry.');
  }

  const cells = splitPlainListItems(body);
  if (cells.some((cell) => !cell)) {
    fail('placeholder', 'Fill every Matrix/Vector cell before running it.');
  }
  return cells;
}

function matrixOrVectorFromCells(rowCells: string[][]): LinearAlgebraValueExpression {
  const parsedRows = rowCells.map((row) => row.map((cell) => {
    return parseLatexNumber(cell);
  }));
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
        displayLatex: vectorCellsToLatex(rowCells),
      }
    : {
        kind: 'matrixLiteral',
        value: matrix,
        exactValue: exactMatrix,
        displayLatex: matrixCellsToLatex(rowCells),
      };
}

export function parsePlainListLiteral(input: string): LinearAlgebraValueExpression | null {
  if (!input.startsWith('[')) {
    return null;
  }
  if (!input.endsWith(']')) {
    fail('invalid-matrix-literal', 'Plain Matrix/Vector lists need a closing ].');
  }

  const outer = input.slice(1, -1);
  if (!outer) {
    fail('invalid-matrix-literal', 'Matrix/vector literals must contain at least one entry.');
  }

  const items = splitPlainListItems(outer);
  const isMatrix = items.every((item) => item.startsWith('[') && item.endsWith(']'));
  if (isMatrix) {
    return matrixOrVectorFromCells(items.map(parsePlainVectorCells));
  }

  if (items.some((item) => item.startsWith('[') || item.endsWith(']'))) {
    fail('invalid-matrix-literal', 'Plain matrix rows must be bracketed consistently.');
  }

  const rowCells = parsePlainVectorCells(input).map((cell) => [cell]);
  return matrixOrVectorFromCells(rowCells);
}

export function parseMatrixLiteral(input: string): LinearAlgebraValueExpression | null {
  const environment = parseWholeMatrixEnvironment(input);
  if (!environment) {
    return null;
  }

  const body = input.slice(environment.bodyStart, environment.bodyEnd);
  if (!body) {
    fail('invalid-matrix-literal', 'Matrix/vector literals must contain at least one entry.');
  }

  const rows = body.split('\\\\').map((row) => row.trim());
  const rowCells = rows.map((row) => {
    if (!row) {
      fail('invalid-matrix-literal', 'Matrix/vector literals cannot contain empty rows.');
    }
    return row.split('&').map((cell) => {
      if (!cell) {
        fail('placeholder', 'Fill every Matrix/Vector cell before running it.');
      }
      return cell;
    });
  });
  return matrixOrVectorFromCells(rowCells);
}
