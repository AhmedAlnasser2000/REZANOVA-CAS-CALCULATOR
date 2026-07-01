import {
  buildDerivativeRequestLatex,
  parseDerivativeOperator,
  type DerivativeOperatorKind,
  type DerivativeOperatorSpec,
} from './derivative-operator';

export type NaturalDerivativeRequest = {
  operator: DerivativeOperatorSpec;
  bodyLatex: string;
  canonicalLatex: string;
};

export type NaturalDerivativeRequestParseResult =
  | { ok: true; request: NaturalDerivativeRequest }
  | { ok: false; error: string; looksLikeDerivativeRequest: boolean };

function trimInput(input: string | null | undefined) {
  return (input ?? '').trim();
}

function readBraceGroup(source: string, startIndex: number) {
  if (source[startIndex] !== '{') {
    return null;
  }
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(startIndex + 1, index),
          nextIndex: index + 1,
        };
      }
    }
  }
  return null;
}

function readFracPrefix(source: string) {
  if (!source.startsWith('\\frac')) {
    return null;
  }
  const numerator = readBraceGroup(source, '\\frac'.length);
  if (!numerator) {
    return null;
  }
  const denominator = readBraceGroup(source, numerator.nextIndex);
  return denominator ? { nextIndex: denominator.nextIndex } : null;
}

function looksLikeDerivativeRequest(input: string) {
  const compact = input.replace(/\s+/g, '');
  return compact.startsWith('d/')
    || compact.startsWith('d^')
    || compact.startsWith('\\frac{d')
    || compact.startsWith('∂')
    || compact.startsWith('\\partial')
    || compact.startsWith('partial')
    || compact.startsWith('\\frac{\\partial');
}

function findBodyStartForSlashOperator(source: string) {
  const leftIndex = source.indexOf('\\left(');
  const plainIndex = source.indexOf('(');
  if (leftIndex >= 0 && (plainIndex < 0 || leftIndex <= plainIndex)) {
    return leftIndex + '\\left'.length;
  }
  return plainIndex;
}

function readParenthesizedBody(source: string, startIndex: number) {
  let index = startIndex;
  while (/\s/.test(source[index] ?? '')) {
    index += 1;
  }
  if (source.startsWith('\\left', index)) {
    index += '\\left'.length;
  }
  if (source[index] !== '(') {
    return null;
  }

  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (source[cursor] === '(') {
      depth += 1;
    } else if (source[cursor] === ')') {
      depth -= 1;
      if (depth === 0) {
        const body = source
          .slice(index + 1, cursor)
          .replace(/\\right\s*$/u, '')
          .trim();
        return {
          body,
          nextIndex: cursor + 1,
        };
      }
    }
  }
  return null;
}

function splitOperatorAndBody(input: string) {
  const fraction = readFracPrefix(input);
  if (fraction) {
    return {
      operatorLatex: input.slice(0, fraction.nextIndex).trim(),
      bodyStart: fraction.nextIndex,
    };
  }

  const bodyStart = findBodyStartForSlashOperator(input);
  if (bodyStart < 0) {
    return null;
  }

  const operatorLatex = input
    .slice(0, bodyStart)
    .replace(/\\left\s*$/u, '')
    .trim();
  return { operatorLatex, bodyStart };
}

export function parseNaturalDerivativeRequest(
  input: string | null | undefined,
  expectedKind?: DerivativeOperatorKind,
): NaturalDerivativeRequestParseResult {
  const source = trimInput(input);
  if (!source) {
    return {
      ok: false,
      error: 'Enter a derivative request.',
      looksLikeDerivativeRequest: false,
    };
  }

  const requestLike = looksLikeDerivativeRequest(source);
  const split = requestLike ? splitOperatorAndBody(source) : null;
  if (!split) {
    return {
      ok: false,
      error: 'Enter a derivative request such as d/dx(f(x)) or ∂/∂x(f(x,y)).',
      looksLikeDerivativeRequest: requestLike,
    };
  }

  const operator = parseDerivativeOperator(split.operatorLatex, expectedKind);
  if (!operator.ok) {
    return {
      ok: false,
      error: operator.error,
      looksLikeDerivativeRequest: true,
    };
  }

  const body = readParenthesizedBody(source, split.bodyStart);
  if (!body || body.nextIndex !== source.length || !body.body) {
    return {
      ok: false,
      error: 'Enter the expression body in parentheses after the derivative operator.',
      looksLikeDerivativeRequest: true,
    };
  }

  return {
    ok: true,
    request: {
      operator: operator.operator,
      bodyLatex: body.body,
      canonicalLatex: buildDerivativeRequestLatex(body.body, operator.operator),
    },
  };
}
