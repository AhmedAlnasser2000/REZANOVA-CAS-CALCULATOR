import type { VariableAnalysis } from '../../algebra/variable-core/types';

export type EquationReadbackDomainIntent = 'real' | 'complex' | 'unknown';

export type ExactReadbackNormalizationContext = {
  target?: string;
  variableAnalysis?: VariableAnalysis;
  domainIntent?: EquationReadbackDomainIntent;
  validatedRootExpression?: boolean;
  allowPlainImaginaryUnit?: boolean;
};

export type ExactReadbackNormalizationResult = {
  latex: string;
  changed: boolean;
  notes: string[];
};

const MAX_NORMALIZATION_PASSES = 6;

export function normalizeExactReadbackExpression(
  latex: string,
  context: ExactReadbackNormalizationContext = {},
): ExactReadbackNormalizationResult {
  let current = normalizeSpacing(latex);
  const notes: string[] = [];

  for (let pass = 0; pass < MAX_NORMALIZATION_PASSES; pass += 1) {
    const before = current;
    current = normalizeExactScalarFragments(current, notes);
    current = normalizeImaginaryUnitProducts(current, context, notes);
    current = normalizeSignNoise(current, notes);
    current = normalizeAdditiveIdentity(current, notes);
    current = normalizeMultiplicativeIdentity(current, notes);
    current = normalizeValidatedZeroProduct(current, context, notes);
    current = normalizeExternalCoefficientBeforeRadical(current, notes);
    current = unwrapOuterParens(current);

    if (current === before) {
      break;
    }
  }

  return {
    latex: current,
    changed: current !== latex,
    notes: [...new Set(notes)],
  };
}

function normalizeSpacing(latex: string) {
  return latex
    .trim()
    .replace(/\s+/gu, '')
    .replace(/\\left\s*/gu, '\\left')
    .replace(/\\right\s*/gu, '\\right');
}

function normalizeExactScalarFragments(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/\\frac\{(?:\\left\()?(-?1\+1|1-1)(?:\\right\))?\}\{[1-9]\d*\}/gu, () => {
    notes.push('exact-zero-scalar');
    return '0';
  });
  result = result.replace(/\\frac\{(-?\d+)\}\{(-?\d+)\}/gu, (match, rawNumerator: string, rawDenominator: string) => {
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
      return match;
    }
    if (numerator === 0) {
      notes.push('exact-zero-scalar');
      return '0';
    }
    if (numerator === denominator) {
      notes.push('exact-unit-scalar');
      return '1';
    }
    if (numerator === -denominator) {
      notes.push('exact-negative-unit-scalar');
      return '-1';
    }
    return match;
  });
  return result;
}

function normalizeImaginaryUnitProducts(
  latex: string,
  context: ExactReadbackNormalizationContext,
  notes: string[],
) {
  let result = latex.replace(
    /(?:\\left\()?\\imaginaryI(?:\\right\))?(?:\\cdot)?(?:\\left\()?\\imaginaryI(?:\\right\))?/gu,
    () => {
      notes.push('imaginary-unit-square');
      return '-1';
    },
  );

  if (!plainIIsImaginaryUnit(context)) {
    return result;
  }

  result = result.replace(/(^|[+\-*/{(])(\d+(?:\.\d+)?)ii(?=$|[+\-*/})])/gu, (_match, prefix: string, scalar: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-${scalar}`;
  });

  result = result.replace(/(^|[+\-*/{(])ii(?=$|[+\-*/})])/gu, (_match, prefix: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-1`;
  });

  result = result.replace(/(^|[^A-Za-z\\])i(?:\\cdot)?i(?=$|[^A-Za-z])/gu, (_match, prefix: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-1`;
  });

  return result;
}

function normalizeSignNoise(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/[+][-]/gu, () => {
    notes.push('sign-cleanup');
    return '-';
  });
  result = result.replace(/[-][-]/gu, () => {
    notes.push('sign-cleanup');
    return '+';
  });
  result = result.replace(/^\+/u, () => {
    notes.push('sign-cleanup');
    return '';
  });
  result = result.replace(/^-\\left\(-(.+)\\right\)$/u, (_match, inner: string) => {
    notes.push('sign-cleanup');
    return inner;
  });
  result = result.replace(/^-\(-(.+)\)$/u, (_match, inner: string) => {
    notes.push('sign-cleanup');
    return inner;
  });
  return result;
}

function normalizeAdditiveIdentity(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/^0\+(.+)$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^(.+)\+0$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^(.+)-0$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^0-(.+)$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return `-${inner}`;
  });
  return result;
}

function normalizeMultiplicativeIdentity(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/^1\\cdot(.+)$/u, (_match, inner: string) => {
    notes.push('multiplicative-identity');
    return inner;
  });
  result = result.replace(/^(.+)\\cdot1$/u, (_match, inner: string) => {
    notes.push('multiplicative-identity');
    return inner;
  });
  result = result.replace(/^1(?:\\,)?(\\sqrt\{.+\})$/u, (_match, radical: string) => {
    notes.push('multiplicative-identity');
    return radical;
  });
  return result;
}

function normalizeValidatedZeroProduct(
  latex: string,
  context: ExactReadbackNormalizationContext,
  notes: string[],
) {
  if (!context.validatedRootExpression) {
    return latex;
  }

  if (
    /^0(?:\\cdot|\\,|\\sqrt|\\left|[A-Za-z\\]).+/u.test(latex)
    || /^.+(?:\\cdot|\\,)0$/u.test(latex)
  ) {
    notes.push('validated-zero-product');
    return '0';
  }

  return latex;
}

function normalizeExternalCoefficientBeforeRadical(latex: string, notes: string[]) {
  const radicalFirst = latex.match(/^(\\sqrt\{.+\})([A-Za-z](?:_\{[^{}]+\})?)$/u);
  if (radicalFirst) {
    notes.push('coefficient-order');
    return `${radicalFirst[2]}${radicalFirst[1]}`;
  }

  const radicalFirstWithCdot = latex.match(/^(\\sqrt\{.+\})\\cdot([A-Za-z](?:_\{[^{}]+\})?)$/u);
  if (radicalFirstWithCdot) {
    notes.push('coefficient-order');
    return `${radicalFirstWithCdot[2]}${radicalFirstWithCdot[1]}`;
  }

  return latex;
}

function unwrapOuterParens(latex: string) {
  const leftRight = latex.match(/^\\left\((.+)\\right\)$/u);
  if (leftRight && hasBalancedLatexBraces(leftRight[1])) {
    return leftRight[1];
  }
  const plain = latex.match(/^\((.+)\)$/u);
  if (plain && hasBalancedLatexBraces(plain[1])) {
    return plain[1];
  }
  return latex;
}

function plainIIsImaginaryUnit(context: ExactReadbackNormalizationContext) {
  if (context.allowPlainImaginaryUnit === false) {
    return false;
  }
  if (context.variableAnalysis?.symbols.some((symbol) => symbol.name === 'i')) {
    return false;
  }
  return context.allowPlainImaginaryUnit === true
    || context.variableAnalysis?.reservedIdentifiers.some((entry) => entry.name === 'ImaginaryUnit')
    || context.domainIntent === 'complex'
    || context.validatedRootExpression === true;
}

function hasBalancedLatexBraces(latex: string) {
  let depth = 0;
  for (const character of latex) {
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    }
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
}
