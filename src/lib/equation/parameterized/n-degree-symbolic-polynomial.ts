import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  latexForNode,
  ONE,
  simplifyNode,
  type MathJson,
  ZERO,
} from './math-json';

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
} = createArithmeticHelpers(simplifyNode);

export type NDegreeSymbolicPolynomialMaxDegree = 0 | 1 | 2 | 3 | 4;

export type NDegreeSymbolicTargetPolynomial = {
  maxDegree: NDegreeSymbolicPolynomialMaxDegree;
  terms: MathJson[];
};

export type NDegreeSymbolicPolynomialStop<Reason extends string> = {
  kind: 'unsupported';
  reason: Reason;
  message: string;
};

export type NDegreeSymbolicPolynomialCollectResult<Reason extends string> =
  | { kind: 'ok'; polynomial: NDegreeSymbolicTargetPolynomial }
  | NDegreeSymbolicPolynomialStop<Reason>;

export type NDegreeSymbolicPolynomialStopDescriptor<Reason extends string> = {
  reason: Reason;
  message: string;
};

export type NDegreeSymbolicPolynomialCollectMessages<Reason extends string> = {
  targetInDenominator: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
  negativePower?: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
  degreeLimit: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
  targetInUnsupportedExpression: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
  targetInUnsupportedPower: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
  targetInUnsupportedFamily: NDegreeSymbolicPolynomialStopDescriptor<Reason>;
};

type CollectOptions<Reason extends string> = {
  allowPolynomialBasePowers: boolean;
  maxDegree: NDegreeSymbolicPolynomialMaxDegree;
  messages: NDegreeSymbolicPolynomialCollectMessages<Reason>;
};

function isSymbolicZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function normalizeSymbolicZero(node: MathJson): MathJson {
  return isSymbolicZeroNode(node) ? ZERO : node;
}

function stop<Reason extends string>(
  descriptor: NDegreeSymbolicPolynomialStopDescriptor<Reason>,
): NDegreeSymbolicPolynomialStop<Reason> {
  return {
    kind: 'unsupported',
    reason: descriptor.reason,
    message: descriptor.message,
  };
}

function zeroTerms(maxDegree: NDegreeSymbolicPolynomialMaxDegree) {
  return Array.from({ length: maxDegree + 1 }, () => ZERO);
}

function normalizePolynomial(polynomial: NDegreeSymbolicTargetPolynomial): NDegreeSymbolicTargetPolynomial {
  return {
    maxDegree: polynomial.maxDegree,
    terms: polynomial.terms
      .slice(0, polynomial.maxDegree + 1)
      .map((term) => normalizeSymbolicZero(term)),
  };
}

function maxPolynomialDegree(
  left: NDegreeSymbolicTargetPolynomial,
  right: NDegreeSymbolicTargetPolynomial,
): NDegreeSymbolicPolynomialMaxDegree {
  return Math.max(left.maxDegree, right.maxDegree) as NDegreeSymbolicPolynomialMaxDegree;
}

function coefficientAt(polynomial: NDegreeSymbolicTargetPolynomial, degree: number): MathJson {
  return polynomial.terms[degree] ?? ZERO;
}

export function zeroNDegreeSymbolicPolynomial(
  maxDegree: NDegreeSymbolicPolynomialMaxDegree,
): NDegreeSymbolicTargetPolynomial {
  return { maxDegree, terms: zeroTerms(maxDegree) };
}

export function oneNDegreeSymbolicPolynomial(
  maxDegree: NDegreeSymbolicPolynomialMaxDegree,
): NDegreeSymbolicTargetPolynomial {
  const terms = zeroTerms(maxDegree);
  terms[0] = ONE;
  return { maxDegree, terms };
}

export function nDegreeSymbolicPolynomialFromDegree(
  degree: number,
  coefficient: MathJson,
  maxDegree: NDegreeSymbolicPolynomialMaxDegree,
): NDegreeSymbolicTargetPolynomial {
  const terms = zeroTerms(maxDegree);
  if (degree >= 0 && degree <= maxDegree) {
    terms[degree] = normalizeSymbolicZero(coefficient);
  }
  return { maxDegree, terms };
}

export function addNDegreeSymbolicPolynomials(
  left: NDegreeSymbolicTargetPolynomial,
  right: NDegreeSymbolicTargetPolynomial,
): NDegreeSymbolicTargetPolynomial {
  const maxDegree = maxPolynomialDegree(left, right);
  return normalizePolynomial({
    maxDegree,
    terms: zeroTerms(maxDegree).map((_, degree) =>
      normalizeSymbolicZero(addNodes(coefficientAt(left, degree), coefficientAt(right, degree)))),
  });
}

export function negateNDegreeSymbolicPolynomial(
  polynomial: NDegreeSymbolicTargetPolynomial,
): NDegreeSymbolicTargetPolynomial {
  return normalizePolynomial({
    maxDegree: polynomial.maxDegree,
    terms: polynomial.terms.map((term) => normalizeSymbolicZero(negateNode(term))),
  });
}

export function subtractNDegreeSymbolicPolynomials(
  left: NDegreeSymbolicTargetPolynomial,
  right: NDegreeSymbolicTargetPolynomial,
): NDegreeSymbolicTargetPolynomial {
  return addNDegreeSymbolicPolynomials(left, negateNDegreeSymbolicPolynomial(right));
}

export function multiplyNDegreeSymbolicPolynomials<Reason extends string>(
  left: NDegreeSymbolicTargetPolynomial,
  right: NDegreeSymbolicTargetPolynomial,
  degreeLimit: NDegreeSymbolicPolynomialStopDescriptor<Reason>,
): NDegreeSymbolicPolynomialCollectResult<Reason> {
  const maxDegree = maxPolynomialDegree(left, right);
  const terms = zeroTerms(maxDegree);
  for (let leftDegree = 0; leftDegree <= left.maxDegree; leftDegree += 1) {
    for (let rightDegree = 0; rightDegree <= right.maxDegree; rightDegree += 1) {
      const coefficient = multiplyNodes(coefficientAt(left, leftDegree), coefficientAt(right, rightDegree));
      if (isSymbolicZeroNode(coefficient)) {
        continue;
      }
      const degree = leftDegree + rightDegree;
      if (degree > maxDegree) {
        return stop(degreeLimit);
      }
      terms[degree] = normalizeSymbolicZero(addNodes(terms[degree], coefficient));
    }
  }
  return { kind: 'ok', polynomial: normalizePolynomial({ maxDegree, terms }) };
}

export function scaleNDegreeSymbolicPolynomial(
  polynomial: NDegreeSymbolicTargetPolynomial,
  denominator: MathJson,
): NDegreeSymbolicTargetPolynomial {
  return normalizePolynomial({
    maxDegree: polynomial.maxDegree,
    terms: polynomial.terms.map((term) => normalizeSymbolicZero(divideNodes(term, denominator))),
  });
}

export function powerNDegreeSymbolicPolynomial<Reason extends string>(
  polynomial: NDegreeSymbolicTargetPolynomial,
  exponent: number,
  degreeLimit: NDegreeSymbolicPolynomialStopDescriptor<Reason>,
): NDegreeSymbolicPolynomialCollectResult<Reason> {
  let current = oneNDegreeSymbolicPolynomial(polynomial.maxDegree);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyNDegreeSymbolicPolynomials(current, polynomial, degreeLimit);
    if (next.kind === 'unsupported') {
      return next;
    }
    current = next.polynomial;
  }
  return { kind: 'ok', polynomial: current };
}

export function nDegreeSymbolicPolynomialDegree(polynomial: NDegreeSymbolicTargetPolynomial) {
  for (let degree = polynomial.maxDegree; degree >= 0; degree -= 1) {
    if (!isSymbolicZeroNode(coefficientAt(polynomial, degree))) {
      return degree;
    }
  }
  return -1;
}

export function nDegreeSymbolicPolynomialLeadingCoefficient(
  polynomial: NDegreeSymbolicTargetPolynomial,
): MathJson | null {
  const degree = nDegreeSymbolicPolynomialDegree(polynomial);
  return degree >= 0 ? coefficientAt(polynomial, degree) : null;
}

export function nDegreeSymbolicPolynomialToNode(
  polynomial: NDegreeSymbolicTargetPolynomial,
  target: string,
): MathJson {
  const terms: MathJson[] = [];
  for (let degree = polynomial.maxDegree; degree >= 0; degree -= 1) {
    const coefficient = coefficientAt(polynomial, degree);
    if (isSymbolicZeroNode(coefficient)) {
      continue;
    }
    if (degree === 0) {
      terms.push(coefficient);
      continue;
    }
    const targetNode: MathJson = degree === 1
      ? target
      : ['Power', target, degree];
    terms.push(isOneNode(coefficient) ? targetNode : multiplyNodes(coefficient, targetNode));
  }
  return terms.length === 0 ? ZERO : addNodes(...terms);
}

export function nDegreeSymbolicPolynomialNeedsExplicitLatex(polynomial: NDegreeSymbolicTargetPolynomial) {
  return polynomial.terms.some((coefficient, degree) =>
    degree > 0
    && !isSymbolicZeroNode(coefficient)
    && !isOneNode(coefficient)
    && !isNegativeOneNode(coefficient)
    && coefficientNeedsExplicitTargetProduct(coefficient));
}

export function nDegreeSymbolicPolynomialToExplicitLatex(
  polynomial: NDegreeSymbolicTargetPolynomial,
  target: string,
) {
  const terms: string[] = [];
  for (let degree = polynomial.maxDegree; degree >= 0; degree -= 1) {
    const coefficient = coefficientAt(polynomial, degree);
    if (isSymbolicZeroNode(coefficient)) {
      continue;
    }
    if (degree === 0) {
      terms.push(latexForNode(coefficient));
      continue;
    }

    const targetPower = degree === 1 ? target : `${target}^${degree}`;
    if (isOneNode(coefficient)) {
      terms.push(targetPower);
      continue;
    }
    if (isNegativeOneNode(coefficient)) {
      terms.push(`-${targetPower}`);
      continue;
    }
    terms.push(`\\left(${latexForNode(coefficient)}\\right)\\cdot ${targetPower}`);
  }

  return (terms.length === 0 ? '0' : terms.join('+')).replaceAll('+-', '-');
}

function coefficientNeedsExplicitTargetProduct(node: MathJson): boolean {
  if (typeof node === 'string') {
    return false;
  }
  if (isArrayNode(node)) {
    const [operator] = node;
    if (
      operator === 'Power'
      || operator === 'Exp'
      || operator === 'Log'
      || operator === 'Ln'
    ) {
      return true;
    }
    return node.some((entry) => coefficientNeedsExplicitTargetProduct(entry as MathJson));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) =>
      entry !== undefined && coefficientNeedsExplicitTargetProduct(entry));
  }
  return false;
}

function collectNDegreeSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  options: CollectOptions<Reason>,
): NDegreeSymbolicPolynomialCollectResult<Reason> {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      polynomial: node === target
        ? nDegreeSymbolicPolynomialFromDegree(1, ONE, options.maxDegree)
        : nDegreeSymbolicPolynomialFromDegree(0, node as MathJson, options.maxDegree),
    };
  }

  if (typeof node === 'number') {
    return {
      kind: 'ok',
      polynomial: nDegreeSymbolicPolynomialFromDegree(0, node as MathJson, options.maxDegree),
    };
  }

  if (!isArrayNode(node)) {
    return hasTarget(node, target)
      ? stop(options.messages.targetInUnsupportedExpression)
      : {
        kind: 'ok',
        polynomial: nDegreeSymbolicPolynomialFromDegree(0, node as MathJson, options.maxDegree),
      };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current = zeroNDegreeSymbolicPolynomial(options.maxDegree);
    for (const operand of operands) {
      const collected = collectNDegreeSymbolicTargetPolynomial(operand, target, options);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addNDegreeSymbolicPolynomials(current, collected.polynomial);
    }
    return { kind: 'ok', polynomial: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectNDegreeSymbolicTargetPolynomial(left, target, options);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectNDegreeSymbolicTargetPolynomial(right, target, options);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return {
      kind: 'ok',
      polynomial: subtractNDegreeSymbolicPolynomials(leftCollected.polynomial, rightCollected.polynomial),
    };
  }

  if (operator === 'Negate') {
    const collected = collectNDegreeSymbolicTargetPolynomial(operands[0], target, options);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', polynomial: negateNDegreeSymbolicPolynomial(collected.polynomial) };
  }

  if (operator === 'Multiply') {
    let current = oneNDegreeSymbolicPolynomial(options.maxDegree);
    for (const operand of operands) {
      const collected = collectNDegreeSymbolicTargetPolynomial(operand, target, options);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const multiplied = multiplyNDegreeSymbolicPolynomials(
        current,
        collected.polynomial,
        options.messages.degreeLimit,
      );
      if (multiplied.kind === 'unsupported') {
        return multiplied;
      }
      current = multiplied.polynomial;
    }
    return { kind: 'ok', polynomial: current };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return stop(options.messages.targetInDenominator);
    }

    const collected = collectNDegreeSymbolicTargetPolynomial(numerator, target, options);
    if (collected.kind === 'unsupported') {
      return collected;
    }

    return {
      kind: 'ok',
      polynomial: scaleNDegreeSymbolicPolynomial(collected.polynomial, denominator as MathJson),
    };
  }

  if (operator === 'Power') {
    const [base, exponent] = operands;
    if (typeof exponent === 'number' && Number.isInteger(exponent)) {
      if (exponent < 0) {
        return stop(options.messages.negativePower ?? options.messages.targetInDenominator);
      }

      if (options.allowPolynomialBasePowers) {
        const basePolynomial = collectNDegreeSymbolicTargetPolynomial(base, target, options);
        if (basePolynomial.kind === 'unsupported') {
          return basePolynomial;
        }
        return powerNDegreeSymbolicPolynomial(
          basePolynomial.polynomial,
          exponent,
          options.messages.degreeLimit,
        );
      }

      if (base === target) {
        if (exponent > options.maxDegree) {
          return stop(options.messages.degreeLimit);
        }
        return {
          kind: 'ok',
          polynomial: nDegreeSymbolicPolynomialFromDegree(exponent, ONE, options.maxDegree),
        };
      }
    }

    if (hasTarget(node, target)) {
      return stop(options.messages.targetInUnsupportedPower);
    }
  }

  if (hasTarget(node, target)) {
    return stop(options.messages.targetInUnsupportedFamily);
  }

  return {
    kind: 'ok',
    polynomial: nDegreeSymbolicPolynomialFromDegree(0, node as MathJson, options.maxDegree),
  };
}

export function collectDirectNDegreeSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  maxDegree: NDegreeSymbolicPolynomialMaxDegree,
  messages: NDegreeSymbolicPolynomialCollectMessages<Reason>,
) {
  return collectNDegreeSymbolicTargetPolynomial(node, target, {
    allowPolynomialBasePowers: false,
    maxDegree,
    messages,
  });
}

export function collectBoundedNDegreeSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  maxDegree: NDegreeSymbolicPolynomialMaxDegree,
  messages: NDegreeSymbolicPolynomialCollectMessages<Reason>,
) {
  return collectNDegreeSymbolicTargetPolynomial(node, target, {
    allowPolynomialBasePowers: true,
    maxDegree,
    messages,
  });
}
