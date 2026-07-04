import type { CanonicalizationChange } from '../../types/calculator';

const DERIVATIVE_PATTERN = /(^|[^\\A-Za-z])d\s*\/\s*d([xyz])\b/g;
const DISPLAY_DERIVATIVE_PATTERN = /\\frac\{\\mathrm\{d\}\}\{\\mathrm\{d\}([xyz])\}/g;
const DERIVATIVE_SHORTCUT_VARIABLE_SOURCE = '(?:theta|alpha|beta|gamma|delta|lambda|mu|[A-Za-z])';
const ORDINARY_DERIVATIVE_SHORTCUT_PATTERN = new RegExp(
  `(^|[^\\\\A-Za-z])dd(${DERIVATIVE_SHORTCUT_VARIABLE_SOURCE})\\b`,
  'g',
);
const PARTIAL_DERIVATIVE_SHORTCUT_PATTERN = new RegExp(
  `(^|[^\\\\A-Za-z])pd(${DERIVATIVE_SHORTCUT_VARIABLE_SOURCE})\\b`,
  'g',
);
const PARTIAL_SYMBOL_SHORTCUT_PATTERN = /(^|[^\\A-Za-z])pd\b/g;

export function normalizeDerivativeDisplay(source: string) {
  return source.replace(DISPLAY_DERIVATIVE_PATTERN, (_match, variable: string) => `\\frac{d}{d${variable}}`);
}

export function normalizeDerivativeTokens(source: string, changes: CanonicalizationChange[]) {
  return source.replace(DERIVATIVE_PATTERN, (match, prefix: string, variable: string) => {
    const after = `${prefix}\\frac{d}{d${variable}}`;
    changes.push({
      kind: 'derivative-token',
      before: match,
      after,
    });
    return after;
  });
}

function derivativeShortcutVariableLatex(variable: string) {
  return variable.length === 1 ? variable : `\\${variable}`;
}

export function normalizeDerivativeShortcuts(source: string, changes: CanonicalizationChange[]) {
  let next = source.replace(
    ORDINARY_DERIVATIVE_SHORTCUT_PATTERN,
    (match, prefix: string, variable: string) => {
      const variableLatex = derivativeShortcutVariableLatex(variable);
      const after = `${prefix}\\frac{d}{d${variableLatex}}`;
      changes.push({
        kind: 'derivative-token',
        before: match,
        after,
      });
      return after;
    },
  );

  next = next.replace(
    PARTIAL_DERIVATIVE_SHORTCUT_PATTERN,
    (match, prefix: string, variable: string) => {
      const variableLatex = derivativeShortcutVariableLatex(variable);
      const after = `${prefix}\\frac{\\partial}{\\partial ${variableLatex}}`;
      changes.push({
        kind: 'derivative-token',
        before: match,
        after,
      });
      return after;
    },
  );

  return next.replace(PARTIAL_SYMBOL_SHORTCUT_PATTERN, (match, prefix: string) => {
    const after = `${prefix}\\partial`;
    changes.push({
      kind: 'derivative-token',
      before: match,
      after,
    });
    return after;
  });
}
