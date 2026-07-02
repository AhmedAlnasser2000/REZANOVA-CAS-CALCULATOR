function normalizeInlineDivision(latex: string) {
  return latex.replace(
    /\(([-+]?\d*[A-Za-z](?:[A-Za-z0-9]*|\^\{?\d+\}?)(?:[-+]\d*[A-Za-z](?:[A-Za-z0-9]*|\^\{?\d+\}?)?)*)\)\/([A-Za-z](?:\^\{?\d+\}?)?)/g,
    '\\frac{$1}{$2}',
  );
}

function normalizeFractionSigns(latex: string) {
  const simpleGroup = '((?:[^{}]|\\{[^{}]*\\})+)';
  return latex
    .replace(new RegExp(`\\\\frac\\{-${simpleGroup}\\}\\{${simpleGroup}\\}`, 'g'), '-\\frac{$1}{$2}')
    .replace(new RegExp(`\\\\frac\\{\\+${simpleGroup}\\}\\{${simpleGroup}\\}`, 'g'), '\\frac{$1}{$2}');
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

function normalizeRepeatedSimpleMonomials(latex: string) {
  let next = latex;
  let previous = '';
  const simpleMonomial = '([A-Za-z](?:\\^\\{?\\d+\\}?)*(?:[A-Za-z](?:\\^\\{?\\d+\\}?)*)*)';
  while (next !== previous) {
    previous = next;
    next = next
      .replace(new RegExp(`(\\d+)${simpleMonomial}\\+\\1\\2`, 'g'), (_, count: string, monomial: string) =>
        `${Number(count) * 2}${monomial}`)
      .replace(new RegExp(`-${simpleMonomial}-${simpleMonomial}`, 'g'), (match: string, left: string, right: string) =>
        left === right ? `-2${left}` : match)
      .replace(new RegExp(`${simpleMonomial}\\+\\1`, 'g'), '2$1')
      .replace(new RegExp(`-(\\d+)${simpleMonomial}-\\1\\2`, 'g'), (_, count: string, monomial: string) =>
        `-${Number(count) * 2}${monomial}`);
  }
  return next;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeVariableRightProducts(latex: string, variable: string) {
  const escapedVariable = escapeRegExp(variable);
  const variablePower = `${escapedVariable}(?:\\^\\{?\\d+\\}?)?`;
  return latex.replace(
    new RegExp(`\\\\left\\(([^()]*\\\\frac[^()]*)\\\\right\\)(${variablePower})`, 'g'),
    '$2\\left($1\\right)',
  );
}

function normalizeWrappedSimpleFractions(latex: string) {
  return latex
    .replace(/\(\\frac\{([^{}]+)\}\{([^{}]+)\}\)/g, '\\frac{$1}{$2}')
    .replace(/\\left\(\\frac\{([^{}]+)\}\{([^{}]+)\}\\right\)/g, '\\frac{$1}{$2}')
    .replace(/\(-\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(-\\frac{$1}{$2}');
}

function normalizeExplicitFunctionProducts(latex: string) {
  const functionCommand = String.raw`(?:\\(?:sin|cos|tan|cot|sec|csc|arctan|arcsin|arccos|ln|log)\b|e\^|\\exponentialE\^)`;
  const leftFactor = String.raw`(\\right\)|\)|\}|[A-Za-z0-9])`;

  return latex.replace(
    new RegExp(`${leftFactor}(?=${functionCommand})`, 'g'),
    '$1\\cdot ',
  );
}

function normalizeScalarReciprocalProducts(latex: string) {
  const functionFactor = String.raw`(?:\\sqrt\{[^{}]+\}|\\(?:arcsin|arccos|arctan)\b|\\operatorname\{(?:arsinh|arcosh|atanh|EllipticF|EllipticE|EllipticPi)\})`;
  return latex.replace(
    new RegExp(`(?<![A-Za-z])([2-9]|\\d{2,})\\\\frac\\{1\\}\\{([^{}]+)\\}(?=${functionFactor})`, 'g'),
    '\\frac{$1}{$2}',
  );
}

export function normalizeGeneratedIntegrationLatex(latex: string, variable = 'x') {
  return normalizeDoubleNegatives(
    normalizeExplicitFunctionProducts(
      normalizeScalarReciprocalProducts(
        normalizeFractionSigns(
          normalizeInlineDivision(
            normalizeVariableRightProducts(
              normalizeRepeatedSimpleMonomials(
                normalizeSingleSymbolNegatedFactors(
                  normalizeDoubleNegatives(
                    normalizeWrappedSimpleFractions(latex),
                  ),
                ),
              ),
              variable,
            ),
          ),
        )
          .replace(/\\left\(-\\frac\{([^{}]+)\}\{([^{}]+)\}\\right\)/g, '-\\frac{$1}{$2}'),
      ),
    ),
  );
}
