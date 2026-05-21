import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber } from '../display/format';

const ce = new ComputeEngine();
const TARGET_OPERATORS = new Set(['Power', 'Root', 'Sqrt', 'Log', 'Ln']);
const EPSILON = 1e-12;
const INTEGER_EPSILON = 1e-12;

type NumericSuccess = {
  kind: 'success';
  value: number;
};

type NumericFailure = {
  kind: 'domain-error' | 'unsupported';
  error: string;
};

type NumericResult = NumericSuccess | NumericFailure;

export type RealNumericEvaluation =
  | {
      kind: 'success';
      value: number;
      exactLatex: string;
      approxText: string;
    }
  | {
      kind: 'domain-error';
      error: string;
    }
  | {
      kind: 'unsupported';
      error: string;
    };

type ExactRational = {
  numerator: number;
  denominator: number;
};

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function gcd(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }

  return left === 0 ? 1 : left;
}

function normalizeResult(value: number) {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (Object.is(value, -0)) {
    return 0;
  }

  const roundedInteger = Math.round(value);
  if (Math.abs(value) > 1e-9 && Math.abs(value - roundedInteger) < INTEGER_EPSILON) {
    return roundedInteger;
  }

  return value;
}

function readFiniteNumberLiteral(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function readExactIntegerLiteral(node: unknown): number | null {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const raw = (node as { num: string }).num;
    if (!/^-?\d+$/.test(raw)) {
      return null;
    }
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
  }

  if (isMathJsonArray(node) && node[0] === 'Negate' && node.length === 2) {
    const inner = readExactIntegerLiteral(node[1]);
    return inner === null ? null : -inner;
  }

  return null;
}

function readExactRationalLiteral(node: unknown): ExactRational | null {
  const integer = readExactIntegerLiteral(node);
  if (integer !== null) {
    return { numerator: integer, denominator: 1 };
  }

  if (isMathJsonArray(node) && node[0] === 'Rational' && node.length === 3) {
    const numerator = readExactIntegerLiteral(node[1]);
    const denominator = readExactIntegerLiteral(node[2]);
    if (numerator === null || denominator === null || denominator === 0) {
      return null;
    }

    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    return {
      numerator: sign * (numerator / divisor),
      denominator: Math.abs(denominator / divisor),
    };
  }

  if (isMathJsonArray(node) && node[0] === 'Negate' && node.length === 2) {
    const inner = readExactRationalLiteral(node[1]);
    return inner === null
      ? null
      : { numerator: -inner.numerator, denominator: inner.denominator };
  }

  return null;
}

function nthRoot(value: number, index: number) {
  if (index % 2 === 0) {
    return Math.pow(value, 1 / index);
  }

  const magnitude = Math.pow(Math.abs(value), 1 / index);
  return value < 0 ? -magnitude : magnitude;
}

function zeroPowerError(rawLatex?: string): string | null {
  if (!rawLatex || !rawLatex.includes('^')) {
    return null;
  }

  const compact = rawLatex
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll(' ', '');

  if (/^\(?0\)?\^\{?0\}?$/.test(compact)) {
    return '0^0 is undefined in the real domain.';
  }

  if (/^\(?0\)?\^\{?-[^}]+\}?$/.test(compact)) {
    return 'Zero cannot be raised to a negative exponent in the real domain.';
  }

  return null;
}

function unsupported(message = 'This numeric expression is outside the current real-domain evaluator.') {
  return {
    kind: 'unsupported',
    error: message,
  } satisfies NumericFailure;
}

function domainError(error: string) {
  return {
    kind: 'domain-error',
    error,
  } satisfies NumericFailure;
}

function evaluateNumericNode(node: unknown): NumericResult {
  const literal = readFiniteNumberLiteral(node);
  if (literal !== null) {
    return { kind: 'success', value: normalizeResult(literal) };
  }

  if (typeof node === 'string') {
    if (node === 'Pi') {
      return { kind: 'success', value: Math.PI };
    }

    if (node === 'ExponentialE') {
      return { kind: 'success', value: Math.E };
    }

    if (node === 'NaN') {
      return domainError('This expression is undefined in the real domain.');
    }

    if (node === 'ComplexInfinity') {
      return domainError('This expression is undefined in the real domain.');
    }

    return unsupported();
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return unsupported();
  }

  const [operator, ...operands] = node;
  if (typeof operator !== 'string') {
    return unsupported();
  }

  switch (operator) {
    case 'Rational': {
      const rational = readExactRationalLiteral(node);
      if (!rational) {
        return unsupported();
      }
      return {
        kind: 'success',
        value: normalizeResult(rational.numerator / rational.denominator),
      };
    }

    case 'Negate': {
      if (operands.length !== 1) {
        return unsupported();
      }
      const inner = evaluateNumericNode(operands[0]);
      return inner.kind === 'success'
        ? { kind: 'success', value: normalizeResult(-inner.value) }
        : inner;
    }

    case 'Add': {
      let total = 0;
      for (const operand of operands) {
        const evaluated = evaluateNumericNode(operand);
        if (evaluated.kind !== 'success') {
          return evaluated;
        }
        total += evaluated.value;
      }
      return { kind: 'success', value: normalizeResult(total) };
    }

    case 'Subtract': {
      if (operands.length === 0) {
        return unsupported();
      }
      const first = evaluateNumericNode(operands[0]);
      if (first.kind !== 'success') {
        return first;
      }

      let total = first.value;
      for (const operand of operands.slice(1)) {
        const evaluated = evaluateNumericNode(operand);
        if (evaluated.kind !== 'success') {
          return evaluated;
        }
        total -= evaluated.value;
      }

      return { kind: 'success', value: normalizeResult(total) };
    }

    case 'Multiply': {
      let total = 1;
      for (const operand of operands) {
        const evaluated = evaluateNumericNode(operand);
        if (evaluated.kind !== 'success') {
          return evaluated;
        }
        total *= evaluated.value;
      }
      return { kind: 'success', value: normalizeResult(total) };
    }

    case 'Divide': {
      if (operands.length !== 2) {
        return unsupported();
      }
      const numerator = evaluateNumericNode(operands[0]);
      if (numerator.kind !== 'success') {
        return numerator;
      }
      const denominator = evaluateNumericNode(operands[1]);
      if (denominator.kind !== 'success') {
        return denominator;
      }
      if (Math.abs(denominator.value) < EPSILON) {
        return domainError('Division by zero is undefined in the real domain.');
      }
      return {
        kind: 'success',
        value: normalizeResult(numerator.value / denominator.value),
      };
    }

    case 'Power': {
      if (operands.length !== 2) {
        return unsupported();
      }
      const base = evaluateNumericNode(operands[0]);
      if (base.kind !== 'success') {
        return base;
      }
      const exponent = evaluateNumericNode(operands[1]);
      if (exponent.kind !== 'success') {
        return exponent;
      }

      const exponentInteger = readExactIntegerLiteral(operands[1]);
      const exponentRational = readExactRationalLiteral(operands[1]);

      if (base.value > 0) {
        return {
          kind: 'success',
          value: normalizeResult(Math.pow(base.value, exponent.value)),
        };
      }

      if (base.value === 0) {
        if (Math.abs(exponent.value) < EPSILON) {
          return domainError('0^0 is undefined in the real domain.');
        }
        if (exponent.value < 0) {
          return domainError('Zero cannot be raised to a negative exponent in the real domain.');
        }

        return { kind: 'success', value: 0 };
      }

      if (exponentInteger !== null) {
        return {
          kind: 'success',
          value: normalizeResult(Math.pow(base.value, exponentInteger)),
        };
      }

      if (exponentRational && exponentRational.denominator % 2 === 1) {
        const rooted = nthRoot(base.value, exponentRational.denominator);
        return {
          kind: 'success',
          value: normalizeResult(Math.pow(rooted, exponentRational.numerator)),
        };
      }

      return domainError(
        'Negative bases require integer exponents or exact rational exponents with odd denominators in the real domain.',
      );
    }

    case 'Sqrt': {
      if (operands.length !== 1) {
        return unsupported();
      }
      const radicand = evaluateNumericNode(operands[0]);
      if (radicand.kind !== 'success') {
        return radicand;
      }
      if (radicand.value < 0) {
        return domainError('Square roots require non-negative radicands in the real domain.');
      }
      return {
        kind: 'success',
        value: normalizeResult(Math.sqrt(radicand.value)),
      };
    }

    case 'Root': {
      if (operands.length !== 2) {
        return unsupported();
      }
      const radicand = evaluateNumericNode(operands[0]);
      if (radicand.kind !== 'success') {
        return radicand;
      }
      const index = readExactIntegerLiteral(operands[1]);
      if (index === null || index < 2) {
        return domainError('Root indices must be integers greater than or equal to 2 in the real domain.');
      }
      if (index % 2 === 0 && radicand.value < 0) {
        return domainError('Even roots require non-negative radicands in the real domain.');
      }
      return {
        kind: 'success',
        value: normalizeResult(nthRoot(radicand.value, index)),
      };
    }

    case 'Ln': {
      if (operands.length !== 1) {
        return unsupported();
      }
      const argument = evaluateNumericNode(operands[0]);
      if (argument.kind !== 'success') {
        return argument;
      }
      if (argument.value <= 0) {
        return domainError('Natural logarithms require positive arguments in the real domain.');
      }
      return {
        kind: 'success',
        value: normalizeResult(Math.log(argument.value)),
      };
    }

    case 'Log': {
      if (operands.length < 1 || operands.length > 2) {
        return unsupported();
      }
      const argument = evaluateNumericNode(operands[0]);
      if (argument.kind !== 'success') {
        return argument;
      }
      if (argument.value <= 0) {
        return domainError('Logarithms require positive arguments in the real domain.');
      }

      const base = operands.length === 2
        ? evaluateNumericNode(operands[1])
        : { kind: 'success', value: 10 } as const;
      if (base.kind !== 'success') {
        return base.kind === 'unsupported'
          ? domainError('Explicit-base logarithms require numeric bases in this milestone.')
          : base;
      }
      if (base.value <= 0 || Math.abs(base.value - 1) < EPSILON) {
        return domainError('Explicit-base logarithms require a positive base that is not 1.');
      }
      return {
        kind: 'success',
        value: normalizeResult(Math.log(argument.value) / Math.log(base.value)),
      };
    }

    default:
      return unsupported();
  }
}

function readFiniteRealFromComputeEngine(node: unknown): number | null {
  const literal = readFiniteNumberLiteral(node);
  return literal === null ? null : normalizeResult(literal);
}

function fallbackToComputeEngine(node: unknown): RealNumericEvaluation {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const value = readFiniteRealFromComputeEngine(numeric.json);
    if (value === null) {
      return {
        kind: 'unsupported',
        error: 'This numeric expression is outside the current real-domain evaluator.',
      };
    }

    return {
      kind: 'success',
      value,
      exactLatex: ce.number(value).latex,
        approxText: formatApproxNumber(value),
    };
  } catch {
    return {
      kind: 'unsupported',
      error: 'This numeric expression is outside the current real-domain evaluator.',
    };
  }
}

export function containsRealNumericFamily(node: unknown): boolean {
  if (typeof node === 'string') {
    return false;
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  const [operator, ...operands] = node;
  if (typeof operator === 'string' && TARGET_OPERATORS.has(operator)) {
    return true;
  }

  return operands.some((operand) => containsRealNumericFamily(operand));
}

export function evaluateRealNumericExpression(
  node: unknown,
  rawLatex?: string,
): RealNumericEvaluation {
  const singularPowerError = zeroPowerError(rawLatex);
  if (singularPowerError) {
    return {
      kind: 'domain-error',
      error: singularPowerError,
    };
  }

  const result = evaluateNumericNode(node);
  if (result.kind === 'success') {
    return {
      kind: 'success',
      value: result.value,
      exactLatex: ce.number(result.value).latex,
        approxText: formatApproxNumber(result.value),
    };
  }

  if (result.kind === 'domain-error') {
    return result;
  }

  return fallbackToComputeEngine(node);
}
