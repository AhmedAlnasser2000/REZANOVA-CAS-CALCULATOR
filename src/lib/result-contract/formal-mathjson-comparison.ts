type FormalComparisonValue =
  | boolean
  | number
  | string
  | FormalComparisonValue[];

const FORMAL_STANDARD_HEADS = new Set([
  'Determinant',
  'Dimension',
  'E',
  'Erf',
  'Erfc',
  'Norm',
  'Trace',
]);

const FORMAL_NAME_ALIASES = new Map([
  ['det', 'Determinant'],
  ['dim', 'Dimension'],
  ['dimension', 'Dimension'],
  ['erf', 'Erf'],
  ['erfc', 'Erfc'],
  ['\\imaginaryI', 'ImaginaryUnit'],
  ['i', 'ImaginaryUnit'],
  ['norm', 'Norm'],
  ['tr', 'Trace'],
]);

function containsFormalProducerNode(value: unknown): boolean {
  if (typeof value === 'string') {
    const unquoted = value.replace(/^'/u, '').replace(/'$/u, '');
    return unquoted === 'ImaginaryUnit'
      || FORMAL_NAME_ALIASES.get(unquoted) === 'ImaginaryUnit';
  }
  if (!Array.isArray(value)) return false;
  const head = value[0];
  return head === 'Apply'
    || head === 'InvisibleOperator'
    || head === 'Subscript'
    || (typeof head === 'string' && FORMAL_STANDARD_HEADS.has(head))
    || (typeof head === 'string' && /^[a-z]/u.test(head))
    || value.slice(1).some(containsFormalProducerNode);
}

function normalizeSubscriptedName(value: string): FormalComparisonValue {
  const arrow = /^'?([^_']+)_([^']+)\\leftarrow([^']+)'?$/u.exec(value);
  if (arrow) {
    return [
      'Subscript',
      arrow[1],
      ['List', normalizeSubscriptedName(arrow[2]), normalizeSubscriptedName(arrow[3])],
    ];
  }
  const parts = value.split('_');
  if (parts.length === 1 || parts.some((part) => !part)) return value;
  const normalizePart = (part: string): FormalComparisonValue =>
    /^[0-9]+$/u.test(part) ? Number(part) : FORMAL_NAME_ALIASES.get(part) ?? part;
  let suffix = normalizePart(parts.at(-1)!);
  for (let index = parts.length - 2; index >= 1; index -= 1) {
    suffix = ['Subscript', normalizePart(parts[index]), suffix];
  }
  return ['Subscript', normalizePart(parts[0]), suffix];
}

function normalizeFormalName(value: unknown): FormalComparisonValue | undefined {
  if (typeof value === 'string') {
    const unquoted = value.replace(/^'/u, '').replace(/'$/u, '');
    const alias = FORMAL_NAME_ALIASES.get(unquoted);
    return normalizeSubscriptedName(alias ?? unquoted);
  }
  if (
    Array.isArray(value)
    && value[0] === 'Subscript'
    && value.length === 3
  ) {
    const base = normalizeFormalName(value[1]);
    const subscript = normalizeFormalValue(value[2]);
    return base === undefined || subscript === undefined
      ? undefined
      : ['Subscript', base, subscript];
  }
  return undefined;
}

function formalArguments(value: unknown): unknown[] {
  const unwrapped = Array.isArray(value) && value[0] === 'Delimiter'
    ? value[1]
    : value;
  if (
    Array.isArray(unwrapped)
    && (unwrapped[0] === 'List' || unwrapped[0] === 'Sequence')
  ) return unwrapped.slice(1);
  return [unwrapped];
}

function isFormalCallArgument(value: unknown) {
  return Array.isArray(value)
    && (
      value[0] === 'Delimiter'
      || value[0] === 'List'
      || value[0] === 'Sequence'
      || value[0] === 'Set'
      || (value[0] === 'Power'
        && Array.isArray(value[1])
        && value[1][0] === 'Delimiter')
    );
}

function normalizeFormalCall(
  nameValue: unknown,
  argumentValue: unknown,
): FormalComparisonValue | undefined {
  const name = normalizeFormalName(nameValue);
  if (name === undefined) return undefined;

  if (
    Array.isArray(argumentValue)
    && argumentValue[0] === 'Power'
    && Array.isArray(argumentValue[1])
    && argumentValue[1][0] === 'Delimiter'
    && argumentValue.length === 3
  ) {
    const call: FormalComparisonValue | undefined = normalizeFormalCall(
      nameValue,
      argumentValue[1],
    );
    const exponent = normalizeFormalValue(argumentValue[2]);
    return call === undefined || exponent === undefined
      ? undefined
      : ['Power', call, exponent] satisfies FormalComparisonValue;
  }

  const args = formalArguments(argumentValue).map(normalizeFormalValue);
  return args.some((argument) => argument === undefined)
    ? undefined
    : ['FormalCall', name, ...(args as FormalComparisonValue[])] satisfies FormalComparisonValue;
}

function normalizeEqualOperands(values: readonly unknown[]): FormalComparisonValue[] | undefined {
  const result: FormalComparisonValue[] = [];
  for (const value of values) {
    if (Array.isArray(value) && value[0] === 'Equal') {
      const nested = normalizeEqualOperands(value.slice(1));
      if (!nested) return undefined;
      result.push(...nested);
      continue;
    }
    const normalized = normalizeFormalValue(value);
    if (normalized === undefined) return undefined;
    result.push(normalized);
  }
  return result;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function exactIntegerProduct(value: unknown): { coefficient: number; factors: unknown[] } {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return { coefficient: value, factors: [] };
  }
  if (
    Array.isArray(value)
    && value[0] === 'Rational'
    && value.length === 3
    && typeof value[1] === 'number'
    && Number.isInteger(value[1])
    && typeof value[2] === 'number'
    && Number.isInteger(value[2])
    && value[2] !== 0
  ) {
    const sign = Math.sign(value[1]) * Math.sign(value[2]);
    return {
      coefficient: sign,
      factors: sign === 0 ? [] : [['Rational', Math.abs(value[1]), Math.abs(value[2])]],
    };
  }
  if (Array.isArray(value) && value[0] === 'Negate' && value.length === 2) {
    const negated = exactIntegerProduct(value[1]);
    return { coefficient: -negated.coefficient, factors: negated.factors };
  }
  if (Array.isArray(value) && value[0] === 'Divide' && value.length === 3) {
    const numerator = exactIntegerProduct(value[1]);
    const denominator = exactIntegerProduct(value[2]);
    if (denominator.coefficient !== 0) {
      const sign = Math.sign(numerator.coefficient) * Math.sign(denominator.coefficient);
      return {
        coefficient: sign,
        factors: sign === 0
          ? []
          : [[
              'Divide',
              productFromIntegerCoefficient(Math.abs(numerator.coefficient), numerator.factors),
              productFromIntegerCoefficient(Math.abs(denominator.coefficient), denominator.factors),
            ]],
      };
    }
  }
  if (Array.isArray(value) && value[0] === 'Multiply') {
    return value.slice(1).reduce<{ coefficient: number; factors: unknown[] }>((result, factor) => {
      const next = exactIntegerProduct(factor);
      return {
        coefficient: result.coefficient * next.coefficient,
        factors: [...result.factors, ...next.factors],
      };
    }, { coefficient: 1, factors: [] });
  }
  return { coefficient: 1, factors: [value] };
}

function productFromIntegerCoefficient(coefficient: number, factors: readonly unknown[]): unknown {
  const magnitude = Math.abs(coefficient);
  const unsigned = factors.length === 0
    ? magnitude
    : magnitude === 1
      ? factors.length === 1 ? factors[0] : ['Multiply', ...factors]
      : ['Multiply', magnitude, ...factors];
  return coefficient < 0 ? ['Negate', unsigned] : unsigned;
}

function normalizeFormalValue(value: unknown): FormalComparisonValue | undefined {
  if (typeof value === 'number') {
    return value < 0 ? ['Negate', -value] : value;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'Yes') return 'True';
    if (value === 'No') return 'False';
    return normalizeFormalName(value);
  }
  if (!Array.isArray(value) || typeof value[0] !== 'string') return undefined;

  const [head, ...operands] = value;
  if (head === 'Delimiter' && operands.length >= 1) {
    return normalizeFormalValue(operands[0]);
  }
  if (head === 'Rational' && operands.length === 2) {
    return normalizeFormalValue(['Divide', operands[0], operands[1]]);
  }
  if (
    head === 'Power'
    && operands.length === 2
    && (
      (Array.isArray(operands[1])
        && operands[1][0] === 'Rational'
        && operands[1][1] === 1
        && operands[1][2] === 2)
      || (Array.isArray(operands[1])
        && operands[1][0] === 'Divide'
        && operands[1][1] === 1
        && operands[1][2] === 2)
    )
  ) {
    const radicand = normalizeFormalValue(operands[0]);
    return radicand === undefined ? undefined : ['Sqrt', radicand];
  }
  if (head === 'Divide' && operands.length === 2) {
    const numeratorProduct = exactIntegerProduct(operands[0]);
    const denominatorProduct = exactIntegerProduct(operands[1]);
    if (
      numeratorProduct.coefficient !== 0
      && denominatorProduct.coefficient !== 0
    ) {
      const divisor = greatestCommonDivisor(
        numeratorProduct.coefficient,
        denominatorProduct.coefficient,
      );
      const numeratorCoefficient = numeratorProduct.coefficient / divisor;
      const denominatorCoefficient = denominatorProduct.coefficient / divisor;
      const numerator = normalizeFormalValue(productFromIntegerCoefficient(
        Math.abs(numeratorCoefficient),
        numeratorProduct.factors,
      ));
      const denominator = normalizeFormalValue(productFromIntegerCoefficient(
        Math.abs(denominatorCoefficient),
        denominatorProduct.factors,
      ));
      if (numerator !== undefined && denominator !== undefined) {
        const quotient: FormalComparisonValue = Array.isArray(numerator)
          && typeof denominator === 'number'
          && denominator > 1
          ? ['Multiply', ['Divide', 1, denominator], numerator]
          : ['Divide', numerator, denominator];
        return Math.sign(numeratorCoefficient) === Math.sign(denominatorCoefficient)
          ? quotient
          : ['Negate', quotient];
      }
    }
  }
  if (head === 'InvisibleOperator' && operands.length === 2) {
    if (operands[0] === 'd' && operands[1] === 'f') return 'df';
    const call = isFormalCallArgument(operands[1])
      ? normalizeFormalCall(operands[0], operands[1])
      : undefined;
    if (call !== undefined) return call;
    const unwrappedOperands = operands.map((operand) => (
      Array.isArray(operand) && operand[0] === 'Delimiter' ? operand[1] : operand
    ));
    if (unwrappedOperands.some((operand) => exactIntegerProduct(operand).factors.length === 0)) {
      return normalizeFormalValue(['Multiply', ...unwrappedOperands]);
    }
    const factors = unwrappedOperands.map(normalizeFormalValue);
    return factors.some((factor) => factor === undefined)
      ? undefined
      : ['Multiply', ...(factors as FormalComparisonValue[])];
  }
  if (head === 'Apply' && operands.length === 2) {
    return normalizeFormalCall(operands[0], operands[1]);
  }
  if (FORMAL_STANDARD_HEADS.has(head) && operands.length >= 1) {
    const args = operands.map(normalizeFormalValue);
    return args.some((argument) => argument === undefined)
      ? undefined
      : ['FormalCall', FORMAL_NAME_ALIASES.get(head) ?? head, ...(args as FormalComparisonValue[])];
  }
  if (head === 'Equal') {
    const normalized = normalizeEqualOperands(operands);
    return normalized ? ['Equal', ...normalized] : undefined;
  }
  if (head === 'Subtract' && operands.length === 2) {
    const left = normalizeFormalValue(operands[0]);
    const right = normalizeFormalValue(operands[1]);
    if (left === undefined || right === undefined) return undefined;
    const terms: FormalComparisonValue[] = [left, ['Negate', right]];
    return [
      'Add',
      ...terms.sort((first, second) => JSON.stringify(first).localeCompare(JSON.stringify(second))),
    ];
  }
  if (head === 'Multiply') {
    const product = exactIntegerProduct(value);
    const factors = product.factors.map(normalizeFormalValue);
    if (factors.some((factor) => factor === undefined)) return undefined;
    const normalizedFactors = factors as FormalComparisonValue[];
    const magnitude = Math.abs(product.coefficient);
    const unsigned: FormalComparisonValue = normalizedFactors.length === 0
      ? magnitude
      : magnitude === 1
        ? normalizedFactors.length === 1
          ? normalizedFactors[0]
          : ['Multiply', ...normalizedFactors]
        : ['Multiply', magnitude, ...normalizedFactors];
    return product.coefficient < 0 ? ['Negate', unsigned] : unsigned;
  }
  if (head === 'Subscript' && operands.length === 2) {
    const base = normalizeFormalName(operands[0]) ?? normalizeFormalValue(operands[0]);
    const arrowSubscript = typeof operands[1] === 'string'
      ? /^([^']+)\\leftarrow([^']+)'?$/u.exec(operands[1])
      : null;
    const subscript = arrowSubscript
      ? (() => {
          const target = normalizeFormalName(arrowSubscript[1]);
          const source = normalizeFormalName(arrowSubscript[2]);
          return target === undefined || source === undefined
            ? undefined
            : ['List', target, source] satisfies FormalComparisonValue;
        })()
      : normalizeFormalValue(operands[1]);
    return base === undefined || subscript === undefined
      ? undefined
      : ['Subscript', base, subscript];
  }

  if (/^[a-z]/u.test(head)) {
    const name = normalizeFormalName(head);
    const args = operands.map(normalizeFormalValue);
    return name === undefined || args.some((argument) => argument === undefined)
      ? undefined
      : ['FormalCall', name, ...(args as FormalComparisonValue[])];
  }

  const normalizedOperands = operands.map(normalizeFormalValue);
  if (normalizedOperands.some((operand) => operand === undefined)) return undefined;
  if (head === 'Add' || head === 'Multiply') {
    const flattened = (normalizedOperands as FormalComparisonValue[]).flatMap((operand) => (
      Array.isArray(operand) && operand[0] === head ? operand.slice(1) : [operand]
    ));
    return [
      head,
      ...(head === 'Add'
        ? [...flattened].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
        : flattened),
    ];
  }
  return [head, ...(normalizedOperands as FormalComparisonValue[])];
}

function alignParsedFormalOperators(
  producer: FormalComparisonValue,
  canonical: FormalComparisonValue,
  canonicalLatex: string,
): FormalComparisonValue {
  if (!Array.isArray(producer) || !Array.isArray(canonical)) return canonical;
  if (producer[0] === 'FormalCall' && canonical[0] === 'Delimiter' && canonical.length >= 2) {
    return alignParsedFormalOperators(producer, canonical[1], canonicalLatex);
  }

  if (
    producer[0] === 'FormalCall'
    && canonical[0] === 'Multiply'
    && producer.length === canonical.length + 1
    && typeof producer[1] === 'string'
  ) {
    const operator = producer[1];
    const tokenMatches = operator === 'dot'
      ? canonicalLatex.includes('\\cdot')
      : operator === 'cross'
        ? canonicalLatex.includes('\\times')
        : false;
    if (tokenMatches) {
      return [
        'FormalCall',
        operator,
        ...producer.slice(2).map((operand, index) => (
          alignParsedFormalOperators(operand, canonical[index + 1], canonicalLatex)
        )),
      ];
    }
  }

  if (producer.length !== canonical.length || producer[0] !== canonical[0]) return canonical;
  return canonical.map((operand, index) => (
    index === 0
      ? operand
      : alignParsedFormalOperators(producer[index], operand, canonicalLatex)
  ));
}

function formalInfixOperators(value: FormalComparisonValue): string[] {
  if (!Array.isArray(value)) return [];
  const own = value[0] === 'FormalCall'
    && (value[1] === 'dot' || value[1] === 'cross')
    ? [value[1]]
    : [];
  return [
    ...value.slice(1).flatMap(formalInfixOperators),
    ...own,
  ];
}

function canonicalInfixOperators(canonicalLatex: string): string[] {
  return Array.from(canonicalLatex.matchAll(/\\(cdot|times)\b/gu), (match) => (
    match[1] === 'cdot' ? 'dot' : 'cross'
  ));
}

export function compareFormalMathJson(
  producerMathJson: unknown,
  parsedCanonicalMathJson: unknown,
  canonicalLatex: string,
): { applicable: boolean; equal: boolean } {
  const producer = normalizeFormalValue(producerMathJson);
  const parsedCanonical = normalizeFormalValue(parsedCanonicalMathJson);
  if (!containsFormalProducerNode(producerMathJson)) {
    return {
      applicable: false,
      equal: producer !== undefined
        && parsedCanonical !== undefined
        && JSON.stringify(producer) === JSON.stringify(parsedCanonical),
    };
  }
  const infixOperatorsMatch = producer !== undefined
    && JSON.stringify(formalInfixOperators(producer))
      === JSON.stringify(canonicalInfixOperators(canonicalLatex));
  const canonical = producer === undefined || parsedCanonical === undefined || !infixOperatorsMatch
    ? parsedCanonical
    : alignParsedFormalOperators(producer, parsedCanonical, canonicalLatex);
  return {
    applicable: true,
    equal: producer !== undefined
      && canonical !== undefined
      && JSON.stringify(producer) === JSON.stringify(canonical),
  };
}
