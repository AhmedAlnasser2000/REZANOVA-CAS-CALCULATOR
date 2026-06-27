import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialToNode,
  exactScalarIsZero,
  multiplyExactScalars,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';

type RadicalScalar = {
  rational: ExactScalar;
  radicals: Map<string, { value: ExactScalar; count: number }>;
};

function exactScalarSquare(value: ExactScalar) {
  return multiplyExactScalars(value, value);
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function oneRadicalScalar(): RadicalScalar {
  return {
    rational: { numerator: 1, denominator: 1 },
    radicals: new Map(),
  };
}

function combineRadicalScalar(
  left: RadicalScalar,
  right: RadicalScalar,
  sign: 1 | -1,
): RadicalScalar | undefined {
  const rational = sign === 1
    ? multiplyExactScalars(left.rational, right.rational)
    : divideExactScalars(left.rational, right.rational);
  if (!rational) {
    return undefined;
  }

  const radicals = new Map(left.radicals);
  for (const [key, radical] of right.radicals.entries()) {
    const current = radicals.get(key);
    radicals.set(key, {
      value: radical.value,
      count: (current?.count ?? 0) + sign * radical.count,
    });
  }

  return { rational, radicals };
}

function decomposeRadicalScalar(node: unknown): RadicalScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return { rational: scalar, radicals: new Map() };
  }

  if (!Array.isArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const radicand = readExactScalarNode(node[1]);
    if (!radicand || radicand.numerator < 0) {
      return undefined;
    }
    return {
      rational: { numerator: 1, denominator: 1 },
      radicals: new Map([[exactScalarKey(radicand), { value: radicand, count: 1 }]]),
    };
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = decomposeRadicalScalar(node[1]);
    const denominator = decomposeRadicalScalar(node[2]);
    return numerator && denominator
      ? combineRadicalScalar(numerator, denominator, -1)
      : undefined;
  }

  if (node[0] === 'Multiply' && node.length > 1) {
    return node.slice(1).reduce<RadicalScalar | undefined>((current, child) => {
      if (!current) {
        return undefined;
      }
      const childScalar = decomposeRadicalScalar(child);
      return childScalar ? combineRadicalScalar(current, childScalar, 1) : undefined;
    }, oneRadicalScalar());
  }

  return undefined;
}

function radicalScalarToNode(input: RadicalScalar): unknown {
  let rational = input.rational;
  const numeratorRadicals: unknown[] = [];
  const denominatorRadicals: unknown[] = [];

  for (const radical of input.radicals.values()) {
    let count = radical.count;
    while (count >= 2) {
      rational = multiplyExactScalars(rational, radical.value);
      count -= 2;
    }
    while (count <= -2) {
      rational = divideExactScalars(rational, radical.value) ?? rational;
      count += 2;
    }
    if (count === 1) {
      numeratorRadicals.push(['Sqrt', buildExactScalarNode(radical.value)]);
    } else if (count === -1) {
      denominatorRadicals.push(['Sqrt', buildExactScalarNode(radical.value)]);
    }
  }

  const numeratorFactors = [
    ...(rational.numerator === rational.denominator ? [] : [buildExactScalarNode(rational)]),
    ...numeratorRadicals,
  ];
  const numerator = numeratorFactors.length === 0
    ? 1
    : numeratorFactors.length === 1
      ? numeratorFactors[0]
      : normalizeAst(['Multiply', ...numeratorFactors]);

  if (denominatorRadicals.length === 0) {
    return numerator;
  }

  const denominator = denominatorRadicals.length === 1
    ? denominatorRadicals[0]
    : normalizeAst(['Multiply', ...denominatorRadicals]);
  return normalizeAst(['Divide', numerator, denominator]);
}

function exactScalarFromSquaredConstant(node: unknown): ExactScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarSquare(scalar);
  }

  if (!Array.isArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const radicand = readExactScalarNode(node[1]);
    return radicand && radicand.numerator >= 0 ? radicand : undefined;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = exactScalarFromSquaredConstant(node[1]);
    const denominator = exactScalarFromSquaredConstant(node[2]);
    return numerator && denominator && !exactScalarIsZero(denominator)
      ? divideExactScalars(numerator, denominator) ?? undefined
      : undefined;
  }

  if (node[0] === 'Multiply' && node.length > 1) {
    return node.slice(1).reduce<ExactScalar | undefined>((current, child) => {
      if (!current) {
        return undefined;
      }
      const childSquare = exactScalarFromSquaredConstant(child);
      return childSquare ? multiplyExactScalars(current, childSquare) : undefined;
    }, { numerator: 1, denominator: 1 });
  }

  return undefined;
}

function exactScalarSquareRoot(value: ExactScalar): ExactScalar | undefined {
  if (value.numerator < 0 || value.denominator <= 0) {
    return undefined;
  }

  const numeratorRoot = Math.sqrt(value.numerator);
  const denominatorRoot = Math.sqrt(value.denominator);
  if (!Number.isInteger(numeratorRoot) || !Number.isInteger(denominatorRoot)) {
    return undefined;
  }

  return {
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  };
}

function simplifySquaredProduct(base: unknown): unknown {
  if (!Array.isArray(base) || base.length === 0) {
    return ['Power', base, 2];
  }

  if (base[0] === 'Divide' && base.length === 3) {
    return normalizeAst([
      'Divide',
      simplifySquaredProduct(base[1]),
      simplifySquaredProduct(base[2]),
    ]);
  }

  if (base[0] !== 'Multiply' || base.length <= 1) {
    return ['Power', base, 2];
  }

  const squaredFactors = base.slice(1).map((factor) => {
    const squaredConstant = exactScalarFromSquaredConstant(factor);
    return squaredConstant
      ? buildExactScalarNode(squaredConstant)
      : ['Power', factor, 2];
  });

  return normalizeAst(['Multiply', ...squaredFactors]);
}

function absoluteExactScalar(value: ExactScalar): ExactScalar {
  return value.numerator < 0
    ? { numerator: -value.numerator, denominator: value.denominator }
    : value;
}

function exactScalarIsOne(value: ExactScalar) {
  return value.numerator === value.denominator;
}

function scalarTimesAffineBase(node: unknown, variable: string) {
  if (!Array.isArray(node) || node[0] !== 'Multiply' || node.length < 3) {
    const polynomial = parseExactPolynomial(node, variable, 1);
    return polynomial
      ? { scalar: { numerator: 1, denominator: 1 } as ExactScalar, affineNode: exactPolynomialToNode(polynomial) }
      : undefined;
  }

  let scalar: ExactScalar = { numerator: 1, denominator: 1 };
  const remaining: unknown[] = [];
  for (const factor of node.slice(1)) {
    const factorScalar = readExactScalarNode(factor);
    if (factorScalar) {
      scalar = multiplyExactScalars(scalar, factorScalar);
    } else {
      remaining.push(factor);
    }
  }

  if (remaining.length !== 1) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(remaining[0], variable, 1);
  return polynomial ? { scalar, affineNode: exactPolynomialToNode(polynomial) } : undefined;
}

function scaledAffineSquareTerm(node: unknown, variable: string) {
  if (Array.isArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = readExactScalarNode(node[2]);
    if (exponent?.numerator === 2 && exponent.denominator === 1) {
      return scalarTimesAffineBase(node[1], variable);
    }
  }

  if (!Array.isArray(node) || node[0] !== 'Multiply' || node.length < 3) {
    return undefined;
  }

  let scalar: ExactScalar = { numerator: 1, denominator: 1 };
  let powerTerm: unknown;
  for (const factor of node.slice(1)) {
    const factorScalar = readExactScalarNode(factor);
    if (factorScalar) {
      scalar = multiplyExactScalars(scalar, factorScalar);
      continue;
    }

    if (powerTerm !== undefined) {
      return undefined;
    }
    powerTerm = factor;
  }

  const scalarRoot = exactScalarSquareRoot(scalar);
  if (!scalarRoot || !Array.isArray(powerTerm) || powerTerm[0] !== 'Power' || powerTerm.length !== 3) {
    return undefined;
  }

  const exponent = readExactScalarNode(powerTerm[2]);
  if (!exponent || exponent.numerator !== 2 || exponent.denominator !== 1) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(powerTerm[1], variable, 1);
  return polynomial ? { scalar: scalarRoot, affineNode: exactPolynomialToNode(polynomial) } : undefined;
}

function scaledArcsinDifference(node: unknown, variable: string) {
  if (!Array.isArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const leftScalar = readExactScalarNode(node[1]);
  const rightScalar = readExactScalarNode(node[2]);
  const negatedPower =
    leftScalar && exactScalarIsOne(leftScalar) && Array.isArray(node[2]) && node[2][0] === 'Negate'
      ? node[2][1]
      : rightScalar && exactScalarIsOne(rightScalar) && Array.isArray(node[1]) && node[1][0] === 'Negate'
        ? node[1][1]
        : undefined;

  const base = scaledAffineSquareTerm(negatedPower, variable);
  if (!base || exactScalarIsZero(base.scalar)) {
    return undefined;
  }

  const squaredScale = multiplyExactScalars(base.scalar, base.scalar);
  const inverseSquaredScale = divideExactScalars({ numerator: 1, denominator: 1 }, squaredScale);
  if (!inverseSquaredScale) {
    return undefined;
  }

  return {
    scale: absoluteExactScalar(base.scalar),
    radicand: normalizeAst([
      'Add',
      buildExactScalarNode(inverseSquaredScale),
      ['Negate', ['Power', base.affineNode, 2]],
    ]),
  };
}

export function simplifyExactScalarRadicalProducts(node: unknown, variable: string): unknown {
  if (!Array.isArray(node) || node.length === 0) {
    return node;
  }

  const simplified = node.map((child, index) =>
    index === 0 ? child : simplifyExactScalarRadicalProducts(child, variable));

  if (simplified[0] === 'Power' && simplified.length === 3) {
    const exponent = readExactScalarNode(simplified[2]);
    if (exponent?.numerator === 2 && exponent.denominator === 1) {
      const squaredConstant = exactScalarFromSquaredConstant(simplified[1]);
      return squaredConstant
        ? buildExactScalarNode(squaredConstant)
        : simplifySquaredProduct(simplified[1]);
    }
  }

  if (
    simplified[0] === 'Sqrt'
    && simplified.length === 2
    && Array.isArray(simplified[1])
    && simplified[1][0] === 'Divide'
    && simplified[1].length === 3
  ) {
    const numerator = readExactScalarNode(simplified[1][1]);
    const numeratorRoot = numerator ? exactScalarSquareRoot(numerator) : undefined;
    if (numeratorRoot) {
      return normalizeAst([
        'Divide',
        buildExactScalarNode(numeratorRoot),
        ['Sqrt', simplified[1][2]],
      ]);
    }
  }

  if (simplified[0] === 'Divide' && simplified.length === 3) {
    if (Array.isArray(simplified[2]) && simplified[2][0] === 'Sqrt' && simplified[2].length === 2) {
      const numerator = readExactScalarNode(simplified[1]);
      const scaled = numerator ? scaledArcsinDifference(simplified[2][1], variable) : undefined;
      const coefficient = numerator && scaled ? divideExactScalars(numerator, scaled.scale) : undefined;
      if (coefficient && scaled) {
        return normalizeAst([
          'Divide',
          buildExactScalarNode(coefficient),
          ['Sqrt', scaled.radicand],
        ]);
      }
    }

    const numeratorScalar = decomposeRadicalScalar(simplified[1]);
    const denominatorScalar = decomposeRadicalScalar(simplified[2]);
    if (numeratorScalar && denominatorScalar) {
      const divided = combineRadicalScalar(numeratorScalar, denominatorScalar, -1);
      if (divided) {
        return radicalScalarToNode(divided);
      }
    }
    if (numeratorScalar && !denominatorScalar) {
      return normalizeAst([
        'Multiply',
        radicalScalarToNode(numeratorScalar),
        ['Divide', 1, simplified[2]],
      ]);
    }
    if (!numeratorScalar && denominatorScalar) {
      return normalizeAst([
        'Multiply',
        simplified[1],
        ['Divide', 1, radicalScalarToNode(denominatorScalar)],
      ]);
    }

    const numerator = readExactScalarNode(simplified[1]);
    const denominator = readExactScalarNode(simplified[2]);
    if (numerator && denominator && !exactScalarIsZero(denominator)) {
      const divided = divideExactScalars(numerator, denominator);
      if (divided) {
        return buildExactScalarNode(divided);
      }
    }
  }

  if (simplified[0] === 'Multiply' && simplified.length > 1) {
    const flatFactors = simplified.slice(1).flatMap((factor) =>
      Array.isArray(factor) && factor[0] === 'Multiply' ? factor.slice(1) : [factor]);
    let scalar = oneRadicalScalar();
    const remaining: unknown[] = [];
    for (const factor of flatFactors) {
      const factorScalar = decomposeRadicalScalar(factor);
      if (factorScalar) {
        const combined = combineRadicalScalar(scalar, factorScalar, 1);
        if (combined) {
          scalar = combined;
        }
      } else {
        remaining.push(factor);
      }
    }

    const scalarNode = radicalScalarToNode(scalar);
    const scalarValue = readExactScalarNode(scalarNode);
    const factors = [
      ...(scalarValue?.numerator === 1 && scalarValue.denominator === 1 ? [] : [scalarNode]),
      ...remaining,
    ];
    if (factors.length === 2 && Array.isArray(factors[1]) && factors[1][0] === 'Divide' && factors[1].length === 3) {
      const leftScalar = readExactScalarNode(factors[0]);
      const numerator = readExactScalarNode(factors[1][1]);
      if (leftScalar && numerator) {
        return normalizeAst([
          'Divide',
          buildExactScalarNode(multiplyExactScalars(leftScalar, numerator)),
          factors[1][2],
        ]);
      }
    }
    return factors.length === 0
      ? 1
      : factors.length === 1
        ? factors[0]
        : normalizeAst(['Multiply', ...factors]);
  }

  return normalizeAst(simplified);
}
