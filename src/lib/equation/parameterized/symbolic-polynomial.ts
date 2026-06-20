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

function isSymbolicZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function normalizeSymbolicZero(node: MathJson): MathJson {
  return isSymbolicZeroNode(node) ? ZERO : node;
}

function normalizeSymbolicPolynomial(polynomial: SymbolicTargetPolynomial): SymbolicTargetPolynomial {
  return {
    terms: [
      normalizeSymbolicZero(polynomial.terms[0]),
      normalizeSymbolicZero(polynomial.terms[1]),
      normalizeSymbolicZero(polynomial.terms[2]),
    ],
  };
}

export type SymbolicTargetPolynomial = {
  terms: [MathJson, MathJson, MathJson];
};

export type SymbolicPolynomialStop<Reason extends string> = {
  kind: 'unsupported';
  reason: Reason;
  message: string;
};

export type SymbolicPolynomialCollectResult<Reason extends string> =
  | { kind: 'ok'; polynomial: SymbolicTargetPolynomial }
  | SymbolicPolynomialStop<Reason>;

type StopDescriptor<Reason extends string> = {
  reason: Reason;
  message: string;
};

type CollectMessages<Reason extends string> = {
  targetInDenominator: StopDescriptor<Reason>;
  negativePower?: StopDescriptor<Reason>;
  degreeLimit: StopDescriptor<Reason>;
  targetInUnsupportedExpression: StopDescriptor<Reason>;
  targetInUnsupportedPower: StopDescriptor<Reason>;
  targetInUnsupportedFamily: StopDescriptor<Reason>;
};

type CollectOptions<Reason extends string> = {
  allowPolynomialBasePowers: boolean;
  messages: CollectMessages<Reason>;
};

function stop<Reason extends string>(
  descriptor: StopDescriptor<Reason>,
): SymbolicPolynomialStop<Reason> {
  return {
    kind: 'unsupported',
    reason: descriptor.reason,
    message: descriptor.message,
  };
}

export function zeroSymbolicPolynomial(): SymbolicTargetPolynomial {
  return { terms: [ZERO, ZERO, ZERO] };
}

export function oneSymbolicPolynomial(): SymbolicTargetPolynomial {
  return { terms: [ONE, ZERO, ZERO] };
}

export function symbolicPolynomialFromDegree(
  degree: number,
  coefficient: MathJson,
): SymbolicTargetPolynomial {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  terms[degree] = normalizeSymbolicZero(coefficient);
  return { terms };
}

export function addSymbolicPolynomials(
  left: SymbolicTargetPolynomial,
  right: SymbolicTargetPolynomial,
): SymbolicTargetPolynomial {
  return {
    terms: [
      normalizeSymbolicZero(addNodes(left.terms[0], right.terms[0])),
      normalizeSymbolicZero(addNodes(left.terms[1], right.terms[1])),
      normalizeSymbolicZero(addNodes(left.terms[2], right.terms[2])),
    ],
  };
}

export function negateSymbolicPolynomial(
  polynomial: SymbolicTargetPolynomial,
): SymbolicTargetPolynomial {
  return {
    terms: [
      normalizeSymbolicZero(negateNode(polynomial.terms[0])),
      normalizeSymbolicZero(negateNode(polynomial.terms[1])),
      normalizeSymbolicZero(negateNode(polynomial.terms[2])),
    ],
  };
}

export function subtractSymbolicPolynomials(
  left: SymbolicTargetPolynomial,
  right: SymbolicTargetPolynomial,
): SymbolicTargetPolynomial {
  return addSymbolicPolynomials(left, negateSymbolicPolynomial(right));
}

export function multiplySymbolicPolynomials<Reason extends string>(
  left: SymbolicTargetPolynomial,
  right: SymbolicTargetPolynomial,
  degreeLimit: StopDescriptor<Reason>,
): SymbolicPolynomialCollectResult<Reason> {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  for (let leftDegree = 0; leftDegree <= 2; leftDegree += 1) {
    for (let rightDegree = 0; rightDegree <= 2; rightDegree += 1) {
      const coefficient = multiplyNodes(left.terms[leftDegree], right.terms[rightDegree]);
      if (isSymbolicZeroNode(coefficient)) {
        continue;
      }
      const degree = leftDegree + rightDegree;
      if (degree > 2) {
        return stop(degreeLimit);
      }
      terms[degree] = normalizeSymbolicZero(addNodes(terms[degree], coefficient));
    }
  }
  return { kind: 'ok', polynomial: normalizeSymbolicPolynomial({ terms }) };
}

export function scaleSymbolicPolynomial(
  polynomial: SymbolicTargetPolynomial,
  denominator: MathJson,
): SymbolicTargetPolynomial {
  return {
    terms: [
      normalizeSymbolicZero(divideNodes(polynomial.terms[0], denominator)),
      normalizeSymbolicZero(divideNodes(polynomial.terms[1], denominator)),
      normalizeSymbolicZero(divideNodes(polynomial.terms[2], denominator)),
    ],
  };
}

export function powerSymbolicPolynomial<Reason extends string>(
  polynomial: SymbolicTargetPolynomial,
  exponent: number,
  degreeLimit: StopDescriptor<Reason>,
): SymbolicPolynomialCollectResult<Reason> {
  let current = oneSymbolicPolynomial();
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplySymbolicPolynomials(current, polynomial, degreeLimit);
    if (next.kind === 'unsupported') {
      return next;
    }
    current = next.polynomial;
  }
  return { kind: 'ok', polynomial: current };
}

export function symbolicPolynomialDegree(polynomial: SymbolicTargetPolynomial) {
  for (let degree = 2; degree >= 0; degree -= 1) {
    if (!isSymbolicZeroNode(polynomial.terms[degree])) {
      return degree;
    }
  }
  return -1;
}

export function isOneSymbolicPolynomial(polynomial: SymbolicTargetPolynomial) {
  return isOneNode(polynomial.terms[0])
    && isSymbolicZeroNode(polynomial.terms[1])
    && isSymbolicZeroNode(polynomial.terms[2]);
}

export function symbolicPolynomialToNode(
  polynomial: SymbolicTargetPolynomial,
  target: string,
): MathJson {
  const terms: MathJson[] = [];
  for (let degree = 2; degree >= 0; degree -= 1) {
    const coefficient = polynomial.terms[degree];
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

export function coefficientNeedsExplicitTargetProduct(node: MathJson): boolean {
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

export function symbolicPolynomialNeedsExplicitLatex(polynomial: SymbolicTargetPolynomial) {
  return polynomial.terms.some((coefficient, degree) =>
    degree > 0
    && !isSymbolicZeroNode(coefficient)
    && !isOneNode(coefficient)
    && !isNegativeOneNode(coefficient)
    && coefficientNeedsExplicitTargetProduct(coefficient));
}

export function symbolicPolynomialToExplicitLatex(
  polynomial: SymbolicTargetPolynomial,
  target: string,
) {
  const terms: string[] = [];
  for (let degree = 2; degree >= 0; degree -= 1) {
    const coefficient = polynomial.terms[degree];
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

function collectSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  options: CollectOptions<Reason>,
): SymbolicPolynomialCollectResult<Reason> {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      polynomial: node === target
        ? symbolicPolynomialFromDegree(1, ONE)
        : symbolicPolynomialFromDegree(0, node as MathJson),
    };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', polynomial: symbolicPolynomialFromDegree(0, node as MathJson) };
  }

  if (!isArrayNode(node)) {
    return hasTarget(node, target)
      ? stop(options.messages.targetInUnsupportedExpression)
      : { kind: 'ok', polynomial: symbolicPolynomialFromDegree(0, node as MathJson) };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current = zeroSymbolicPolynomial();
    for (const operand of operands) {
      const collected = collectSymbolicTargetPolynomial(operand, target, options);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addSymbolicPolynomials(current, collected.polynomial);
    }
    return { kind: 'ok', polynomial: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectSymbolicTargetPolynomial(left, target, options);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectSymbolicTargetPolynomial(right, target, options);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return {
      kind: 'ok',
      polynomial: subtractSymbolicPolynomials(leftCollected.polynomial, rightCollected.polynomial),
    };
  }

  if (operator === 'Negate') {
    const collected = collectSymbolicTargetPolynomial(operands[0], target, options);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', polynomial: negateSymbolicPolynomial(collected.polynomial) };
  }

  if (operator === 'Multiply') {
    let current = oneSymbolicPolynomial();
    for (const operand of operands) {
      const collected = collectSymbolicTargetPolynomial(operand, target, options);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const multiplied = multiplySymbolicPolynomials(
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

    const collected = collectSymbolicTargetPolynomial(numerator, target, options);
    if (collected.kind === 'unsupported') {
      return collected;
    }

    return {
      kind: 'ok',
      polynomial: scaleSymbolicPolynomial(collected.polynomial, denominator as MathJson),
    };
  }

  if (operator === 'Power') {
    const [base, exponent] = operands;
    if (typeof exponent === 'number' && Number.isInteger(exponent)) {
      if (exponent < 0) {
        return stop(options.messages.negativePower ?? options.messages.targetInDenominator);
      }

      if (options.allowPolynomialBasePowers) {
        const basePolynomial = collectSymbolicTargetPolynomial(base, target, options);
        if (basePolynomial.kind === 'unsupported') {
          return basePolynomial;
        }
        if (exponent > 2 && hasTarget(base, target)) {
          return stop(options.messages.degreeLimit);
        }
        return powerSymbolicPolynomial(basePolynomial.polynomial, exponent, options.messages.degreeLimit);
      }

      if (base === target) {
        if (exponent > 2) {
          return stop(options.messages.degreeLimit);
        }
        return { kind: 'ok', polynomial: symbolicPolynomialFromDegree(exponent, ONE) };
      }
    }

    if (hasTarget(node, target)) {
      return stop(options.messages.targetInUnsupportedPower);
    }
  }

  if (hasTarget(node, target)) {
    return stop(options.messages.targetInUnsupportedFamily);
  }

  return { kind: 'ok', polynomial: symbolicPolynomialFromDegree(0, node as MathJson) };
}

export function collectDirectSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  messages: CollectMessages<Reason>,
) {
  return collectSymbolicTargetPolynomial(node, target, {
    allowPolynomialBasePowers: false,
    messages,
  });
}

export function collectBoundedSymbolicTargetPolynomial<Reason extends string>(
  node: unknown,
  target: string,
  messages: CollectMessages<Reason>,
) {
  return collectSymbolicTargetPolynomial(node, target, {
    allowPolynomialBasePowers: true,
    messages,
  });
}
