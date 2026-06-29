function normalizeInlineDivision(latex: string) {
  return latex.replace(
    /\(([-+]?\d*[A-Za-z](?:[A-Za-z0-9]*|\^\{?\d+\}?)(?:[-+]\d*[A-Za-z](?:[A-Za-z0-9]*|\^\{?\d+\}?)?)*)\)\/([A-Za-z](?:\^\{?\d+\}?)?)/g,
    '\\frac{$1}{$2}',
  );
}

function normalizeFractionSigns(latex: string) {
  const simpleGroup = '((?:[^{}]|\\{[^{}]*\\})+)';
  return latex
    .replace(new RegExp(`\\\\frac\\{-([^{}]+)\\}\\{${simpleGroup}\\}`, 'g'), '-\\frac{$1}{$2}')
    .replace(new RegExp(`\\\\frac\\{\\+([^{}]+)\\}\\{${simpleGroup}\\}`, 'g'), '\\frac{$1}{$2}');
}

function normalizeDoubleNegatives(latex: string) {
  let next = latex;
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = next
      .replace(/--/g, '+')
      .replace(/\+\+/g, '+')
      .replace(/\+-/g, '-')
      .replace(/-\+/g, '-')
      .replace(/-\(-([^()]+)\)/g, '+$1')
      .replace(/\+\(-([^()]+)\)/g, '-$1')
      .replace(/\(\+([^()]+)\)/g, '($1)')
      .replace(/\\left\(\+([^()]+)\\right\)/g, '\\left($1\\right)');
  }
  return next;
}

function normalizeSingleSymbolNegatedFactors(latex: string) {
  return latex
    .replace(/(\d*)([A-Za-z])\\left\(-([A-Za-z])\\right\)\^\{2\}/g, '$1$2$3^{2}')
    .replace(/(\d*)([A-Za-z])\\left\(-([A-Za-z])\\right\)/g, '-$1$2$3')
    .replace(/\\left\(-([A-Za-z])\\right\)\^\{2\}/g, '$1^{2}');
}

export function normalizeGeneratedRischNormanLatex(latex: string) {
  return normalizeDoubleNegatives(
    normalizeFractionSigns(
      normalizeInlineDivision(
        normalizeSingleSymbolNegatedFactors(
          normalizeDoubleNegatives(latex),
        ),
      ),
    )
      .replace(/\\left\(-\\frac\{([^{}]+)\}\{([^{}]+)\}\\right\)/g, '-\\frac{$1}{$2}'),
  );
}
