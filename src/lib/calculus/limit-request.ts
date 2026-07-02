import type {
  LimitDirection,
  LimitTargetKind,
} from '../../types/calculator';
import {
  derivativeVariableLatex,
  parseDerivativeVariable,
} from './derivative-target';
import { parseFiniteLimitTargetDraft } from './engine/finite-limit-target';

export type NaturalFiniteLimitTarget = {
  kind: 'finite';
  value: number;
  normalizedTargetLatex: string;
  direction: LimitDirection;
};

export type NaturalInfiniteLimitTarget = {
  kind: 'infinite';
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  normalizedTargetLatex: string;
};

export type NaturalLimitTarget = NaturalFiniteLimitTarget | NaturalInfiniteLimitTarget;

export type NaturalLimitRequest = {
  variable: string;
  variableLatex: string;
  bodyLatex: string;
  target: NaturalLimitTarget;
  canonicalLatex: string;
};

export type NaturalLimitRequestParseResult =
  | { ok: true; request: NaturalLimitRequest }
  | { ok: false; error: string; looksLikeLimitRequest: boolean };

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

function wrapBody(latex: string) {
  const trimmed = latex.trim();
  if (!trimmed) {
    return '';
  }

  if (/^\\left\(.+\\right\)$/u.test(trimmed)) {
    return trimmed;
  }

  return /^[-+]?[\w\\]+$/u.test(trimmed) ? trimmed : `\\left(${trimmed}\\right)`;
}

function compactTarget(input: string) {
  return input
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replaceAll('∞', '\\infty')
    .replace(/\s+/g, '');
}

function normalizePlainBody(input: string) {
  return input
    .trim()
    .replace(/\b(sin|cos|tan|ln|log|sqrt)(?=\s*\()/gu, '\\$1')
    .replace(/\bpi\b/gu, '\\pi');
}

function splitSubscript(input: string) {
  const normalized = input
    .trim()
    .replace(/\\rightarrow/gu, '\\to')
    .replace(/→/gu, '\\to')
    .replace(/->/gu, '\\to');
  const arrowIndex = normalized.indexOf('\\to');
  if (arrowIndex < 0) {
    return null;
  }

  return {
    variable: normalized.slice(0, arrowIndex).trim(),
    target: normalized.slice(arrowIndex + '\\to'.length).trim(),
  };
}

function parseTarget(input: string): NaturalLimitTarget | null {
  const compact = compactTarget(input);
  if (!compact) {
    return null;
  }

  const infinity = compact
    .replace(/^\\\+/u, '+')
    .replace(/^\\-/u, '-')
    .replace(/infinity/giu, 'infty');
  if (
    infinity === '\\infty'
    || infinity === '+\\infty'
    || infinity === 'infty'
    || infinity === '+infty'
  ) {
    return {
      kind: 'infinite',
      targetKind: 'posInfinity',
      normalizedTargetLatex: '\\infty',
    };
  }
  if (
    infinity === '-\\infty'
    || infinity === '-infty'
  ) {
    return {
      kind: 'infinite',
      targetKind: 'negInfinity',
      normalizedTargetLatex: '-\\infty',
    };
  }

  const finite = parseFiniteLimitTargetDraft(input);
  if (!finite) {
    return null;
  }

  return {
    kind: 'finite',
    value: finite.value,
    normalizedTargetLatex: finite.normalizedTargetLatex,
    direction: finite.directionOverride ?? 'two-sided',
  };
}

function targetLatex(target: NaturalLimitTarget) {
  if (target.kind === 'infinite') {
    return target.normalizedTargetLatex;
  }

  if (target.direction === 'left') {
    return `${target.normalizedTargetLatex}^{-}`;
  }
  if (target.direction === 'right') {
    return `${target.normalizedTargetLatex}^{+}`;
  }
  return target.normalizedTargetLatex;
}

function looksLikeLimitRequest(input: string) {
  const trimmed = input.trim();
  return trimmed.startsWith('\\lim')
    || /^lim\b/iu.test(trimmed);
}

function splitLatexLimit(input: string) {
  const source = input.trim();
  if (!source.startsWith('\\lim_')) {
    return null;
  }
  const groupStart = '\\lim_'.length;
  const subscript = readBraceGroup(source, groupStart);
  if (!subscript) {
    return null;
  }

  return {
    subscript: subscript.content,
    bodyLatex: source.slice(subscript.nextIndex).trim(),
  };
}

function splitPlainLimit(input: string) {
  const match = input.trim().match(/^lim\s+(.+?)\s*(?:->|→|\\to|to)\s*(\S+)\s+(.+)$/iu);
  if (!match) {
    return null;
  }

  return {
    subscript: `${match[1]}\\to ${match[2]}`,
    bodyLatex: normalizePlainBody(match[3]),
  };
}

export function buildNaturalLimitRequestLatex(request: Pick<NaturalLimitRequest, 'variableLatex' | 'target' | 'bodyLatex'>) {
  const target = targetLatex(request.target);
  return request.bodyLatex.trim()
    ? `\\lim_{${request.variableLatex}\\to ${target}}${wrapBody(request.bodyLatex)}`
    : '';
}

export function parseNaturalLimitRequest(input: string | null | undefined): NaturalLimitRequestParseResult {
  const source = (input ?? '').trim();
  if (!source) {
    return {
      ok: false,
      error: 'Enter a limit request.',
      looksLikeLimitRequest: false,
    };
  }

  const requestLike = looksLikeLimitRequest(source);
  const split = splitLatexLimit(source) ?? splitPlainLimit(source);
  if (!split) {
    return {
      ok: false,
      error: 'Enter a limit request such as lim x -> 0 sin(x)/x or \\lim_{x\\to0}\\frac{\\sin(x)}{x}.',
      looksLikeLimitRequest: requestLike,
    };
  }

  const subscript = splitSubscript(split.subscript);
  if (!subscript) {
    return {
      ok: false,
      error: 'Limit requests need a variable and approach target.',
      looksLikeLimitRequest: true,
    };
  }

  const variable = parseDerivativeVariable(subscript.variable);
  if (!variable.ok) {
    return {
      ok: false,
      error: variable.error,
      looksLikeLimitRequest: true,
    };
  }

  const target = parseTarget(subscript.target);
  if (!target) {
    return {
      ok: false,
      error: 'Use a numeric target, pi/e constant, or +/- infinity.',
      looksLikeLimitRequest: true,
    };
  }

  const bodyLatex = split.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      ok: false,
      error: 'Enter the expression after the limit target.',
      looksLikeLimitRequest: true,
    };
  }

  const variableLatex = derivativeVariableLatex(variable.variable);
  const request = {
    variable: variable.variable,
    variableLatex,
    bodyLatex,
    target,
  };

  return {
    ok: true,
    request: {
      ...request,
      canonicalLatex: buildNaturalLimitRequestLatex(request),
    },
  };
}
