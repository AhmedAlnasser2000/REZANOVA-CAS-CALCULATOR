import type { TrigIdentityState } from '../../types/calculator';
import type { TrigEvaluation } from './angles';

function normalizeLatex(latex: string) {
  return latex
    .trim()
    .replace(/\s+/g, '')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\cdot', '')
    .replaceAll('^{2}', '^2');
}

function wrapArgument(argument: string) {
  return `\\left(${argument}\\right)`;
}

function simplifyIdentity(expressionLatex: string) {
  const normalized = normalizeLatex(expressionLatex);

  let match = normalized.match(/^\\sin\^2\((.+)\)\+\\cos\^2\((.+)\)$/);
  if (match && match[1] === match[2]) {
    return '1';
  }

  match = normalized.match(/^\\cos\^2\((.+)\)\+\\sin\^2\((.+)\)$/);
  if (match && match[1] === match[2]) {
    return '1';
  }

  match = normalized.match(/^1-\\sin\^2\((.+)\)$/);
  if (match) {
    return `\\cos^2${wrapArgument(match[1])}`;
  }

  match = normalized.match(/^1-\\cos\^2\((.+)\)$/);
  if (match) {
    return `\\sin^2${wrapArgument(match[1])}`;
  }

  match = normalized.match(/^\\frac\{\\sin\((.+)\)\}\{\\cos\((.+)\)\}$/);
  if (match && match[1] === match[2]) {
    return `\\tan${wrapArgument(match[1])}`;
  }

  return undefined;
}

function convertProductToSum(expressionLatex: string) {
  const normalized = normalizeLatex(expressionLatex);

  let match = normalized.match(/^\\sin\((.+)\)\\sin\((.+)\)$/);
  if (match) {
    return `\\frac{1}{2}\\left(\\cos${wrapArgument(`${match[1]}-${match[2]}`)}-\\cos${wrapArgument(`${match[1]}+${match[2]}`)}\\right)`;
  }

  match = normalized.match(/^\\cos\((.+)\)\\cos\((.+)\)$/);
  if (match) {
    return `\\frac{1}{2}\\left(\\cos${wrapArgument(`${match[1]}-${match[2]}`)}+\\cos${wrapArgument(`${match[1]}+${match[2]}`)}\\right)`;
  }

  match = normalized.match(/^\\sin\((.+)\)\\cos\((.+)\)$/);
  if (match) {
    return `\\frac{1}{2}\\left(\\sin${wrapArgument(`${match[1]}+${match[2]}`)}+\\sin${wrapArgument(`${match[1]}-${match[2]}`)}\\right)`;
  }

  return undefined;
}

function convertSumToProduct(expressionLatex: string) {
  const normalized = normalizeLatex(expressionLatex);

  let match = normalized.match(/^\\sin\((.+)\)\+\\sin\((.+)\)$/);
  if (match) {
    return `2\\sin${wrapArgument(`\\frac{${match[1]}+${match[2]}}{2}`)}\\cos${wrapArgument(`\\frac{${match[1]}-${match[2]}}{2}`)}`;
  }

  match = normalized.match(/^\\sin\((.+)\)-\\sin\((.+)\)$/);
  if (match) {
    return `2\\cos${wrapArgument(`\\frac{${match[1]}+${match[2]}}{2}`)}\\sin${wrapArgument(`\\frac{${match[1]}-${match[2]}}{2}`)}`;
  }

  match = normalized.match(/^\\cos\((.+)\)\+\\cos\((.+)\)$/);
  if (match) {
    return `2\\cos${wrapArgument(`\\frac{${match[1]}+${match[2]}}{2}`)}\\cos${wrapArgument(`\\frac{${match[1]}-${match[2]}}{2}`)}`;
  }

  match = normalized.match(/^\\cos\((.+)\)-\\cos\((.+)\)$/);
  if (match) {
    return `-2\\sin${wrapArgument(`\\frac{${match[1]}+${match[2]}}{2}`)}\\sin${wrapArgument(`\\frac{${match[1]}-${match[2]}}{2}`)}`;
  }

  return undefined;
}

function convertDoubleAngle(expressionLatex: string) {
  const normalized = normalizeLatex(expressionLatex);

  let match = normalized.match(/^2\\sin\((.+)\)\\cos\((.+)\)$/);
  if (match && match[1] === match[2]) {
    return `\\sin${wrapArgument(`2${match[1]}`)}`;
  }

  match = normalized.match(/^\\cos\^2\((.+)\)-\\sin\^2\((.+)\)$/);
  if (match && match[1] === match[2]) {
    return `\\cos${wrapArgument(`2${match[1]}`)}`;
  }

  match = normalized.match(/^\\sin\((.+)\)$/);
  if (match && match[1].startsWith('2')) {
    return `2\\sin${wrapArgument(match[1].slice(1))}\\cos${wrapArgument(match[1].slice(1))}`;
  }

  return undefined;
}

function convertHalfAngle(expressionLatex: string) {
  const normalized = normalizeLatex(expressionLatex);

  let match = normalized.match(/^\\sin\^2\((.+)\)$/);
  if (match) {
    return `\\frac{1-\\cos${wrapArgument(`2${match[1]}`)}}{2}`;
  }

  match = normalized.match(/^\\cos\^2\((.+)\)$/);
  if (match) {
    return `\\frac{1+\\cos${wrapArgument(`2${match[1]}`)}}{2}`;
  }

  match = normalized.match(/^\\frac\{1-\\cos\((.+)\)\}\{2\}$/);
  if (match && match[1].startsWith('2')) {
    return `\\sin^2${wrapArgument(match[1].slice(1))}`;
  }

  match = normalized.match(/^\\frac\{1\+\\cos\((.+)\)\}\{2\}$/);
  if (match && match[1].startsWith('2')) {
    return `\\cos^2${wrapArgument(match[1].slice(1))}`;
  }

  return undefined;
}

export function evaluateTrigIdentity(state: TrigIdentityState): TrigEvaluation {
  const expressionLatex = state.expressionLatex.trim();
  if (!expressionLatex) {
    return {
      error: 'Enter a trig identity expression before converting it.',
      warnings: [],
    };
  }

  const exactLatex =
    state.targetForm === 'simplified'
      ? simplifyIdentity(expressionLatex)
      : state.targetForm === 'productToSum'
        ? convertProductToSum(expressionLatex)
        : state.targetForm === 'sumToProduct'
          ? convertSumToProduct(expressionLatex)
          : state.targetForm === 'doubleAngle'
            ? convertDoubleAngle(expressionLatex)
            : convertHalfAngle(expressionLatex);

  if (!exactLatex) {
    return {
      error: 'This trig identity is outside the supported conversion set for the first release.',
      warnings: [],
    };
  }

  return {
    exactLatex,
    approxText: undefined,
    warnings: ['Bounded identity conversion applied.'],
    resultOrigin: 'symbolic',
  };
}
