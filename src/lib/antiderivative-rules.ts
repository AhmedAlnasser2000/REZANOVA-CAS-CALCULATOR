import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

type AffineForm = {
  a: number;
  b: number;
  latex: string;
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

function wrapGroupedLatex(latex: string) {
  return /^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

function multiplyLatex(left: string, right: string) {
  if (left === '1') {
    return right;
  }

  if (left === '-1') {
    return `-${wrapGroupedLatex(right)}`;
  }

  return `${left}${wrapGroupedLatex(right)}`;
}

function divideByNumericCoefficient(numeratorLatex: string, denominator: number) {
  if (denominator === 1) {
    return numeratorLatex;
  }

  if (denominator === -1) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  return `\\frac{${numeratorLatex}}{${boxLatex(denominator)}}`;
}

function parseLinearTerm(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  if (left === variable && isFiniteNumber(right)) {
    return right;
  }

  if (right === variable && isFiniteNumber(left)) {
    return left;
  }

  return undefined;
}

function parseAffine(node: unknown, variable: string): AffineForm | undefined {
  if (node === variable) {
    return { a: 1, b: 0, latex: variable };
  }

  const linear = parseLinearTerm(node, variable);
  if (linear !== undefined) {
    return {
      a: linear,
      b: 0,
      latex: boxLatex(node),
    };
  }

  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  if (isFiniteNumber(left)) {
    const affine = parseAffine(right, variable);
    if (!affine) {
      return undefined;
    }

    return {
      a: affine.a,
      b: affine.b + left,
      latex: boxLatex(node),
    };
  }

  if (isFiniteNumber(right)) {
    const affine = parseAffine(left, variable);
    if (!affine) {
      return undefined;
    }

    return {
      a: affine.a,
      b: affine.b + right,
      latex: boxLatex(node),
    };
  }

  return undefined;
}

function integralOfPower(variable: string, exponent: number) {
  if (exponent === -1) {
    return '\\ln\\left|x\\right|';
  }

  if (exponent === 0) {
    return variable;
  }

  const nextExponent = exponent + 1;
  if (nextExponent === 1) {
    return variable;
  }

  return `\\frac{${variable}^{${boxLatex(nextExponent)}}}{${boxLatex(nextExponent)}}`;
}

function integralOfAffinePower(affine: AffineForm, exponent: number) {
  if (affine.a === 0) {
    return undefined;
  }

  if (exponent === -1) {
    return divideByNumericCoefficient(
      `\\ln\\left|${wrapGroupedLatex(affine.latex)}\\right|`,
      affine.a,
    );
  }

  const nextExponent = exponent + 1;
  const powered =
    nextExponent === 1
      ? wrapGroupedLatex(affine.latex)
      : `${wrapGroupedLatex(affine.latex)}^{${boxLatex(nextExponent)}}`;

  return divideByNumericCoefficient(powered, affine.a * nextExponent);
}

function separateConstantFactor(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length < 3) {
    return undefined;
  }

  const factors = node.slice(1);
  const constantFactors = factors.filter((factor) => !dependsOnVariable(factor, variable));
  const variableFactors = factors.filter((factor) => dependsOnVariable(factor, variable));

  if (constantFactors.length === 0 || variableFactors.length !== 1) {
    return undefined;
  }

  const constantNode =
    constantFactors.length === 1 ? constantFactors[0] : ['Multiply', ...constantFactors];

  return {
    constantLatex: boxLatex(constantNode),
    body: variableFactors[0],
  };
}

function joinAdditiveLatex(parts: string[]) {
  if (parts.length === 0) {
    return undefined;
  }

  return parts.reduce((result, current, index) => {
    if (index === 0) {
      return current;
    }

    return current.startsWith('-') ? `${result}${current}` : `${result}+${current}`;
  }, '');
}

export function resolveAntiderivativeRule(
  node: unknown,
  variable = 'x',
): string | undefined {
  if (!dependsOnVariable(node, variable)) {
    const latex = boxLatex(node);
    return latex === '0' ? '0' : multiplyLatex(latex, variable);
  }

  if (node === variable) {
    return '\\frac{x^{2}}{2}';
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const integrals = node
      .slice(1)
      .map((term) => resolveAntiderivativeRule(term, variable));
    if (integrals.some((term) => !term)) {
      return undefined;
    }

    return joinAdditiveLatex(integrals as string[]);
  }

  const separated = separateConstantFactor(node, variable);
  if (separated) {
    const integral = resolveAntiderivativeRule(separated.body, variable);
    if (!integral) {
      return undefined;
    }

    return multiplyLatex(separated.constantLatex, integral);
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    if (node[2] === variable) {
      return '\\ln\\left|x\\right|';
    }

    const affine = parseAffine(node[2], variable);
    if (affine) {
      return divideByNumericCoefficient(
        `\\ln\\left|${wrapGroupedLatex(affine.latex)}\\right|`,
        affine.a,
      );
    }
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const base = node[1];
    const exponent = node[2];
    if (base === variable && isFiniteNumber(exponent)) {
      return integralOfPower(variable, exponent);
    }

    if (base === 'ExponentialE') {
      const affine = parseAffine(exponent, variable);
      if (affine) {
        return divideByNumericCoefficient(
          `${boxLatex(base)}^{${wrapGroupedLatex(affine.latex)}}`,
          affine.a,
        );
      }
    }

    if (isFiniteNumber(exponent)) {
      const affine = parseAffine(base, variable);
      if (affine) {
        return integralOfAffinePower(affine, exponent);
      }
    }
  }

  if (isNodeArray(node) && node.length === 2) {
    const affine = parseAffine(node[1], variable);
    if (!affine) {
      return undefined;
    }

    if (node[0] === 'Sin') {
      return divideByNumericCoefficient(
        `-\\cos\\left(${affine.latex}\\right)`,
        affine.a,
      );
    }

    if (node[0] === 'Cos') {
      return divideByNumericCoefficient(
        `\\sin\\left(${affine.latex}\\right)`,
        affine.a,
      );
    }
  }

  return undefined;
}
