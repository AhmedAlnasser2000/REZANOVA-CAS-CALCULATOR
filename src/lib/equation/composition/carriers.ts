import { ComputeEngine } from '@cortex-js/compute-engine';
import { buildExactScalarNode, exactScalarToNumber, getExactPolynomialCoefficient, multiplyExactScalars, parseExactPolynomial, readExactScalarNode, type ExactScalar } from '../../algebra/polynomial-core';
import { readNumericNode } from '../domain-guards';
import { dedupe } from '../guarded/merge';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { matchAffineVariableArgument } from '../../trigonometry/normalize';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

type NumericTarget = {
  node: unknown;
  latex: string;
  value: number;
};

export type SymbolicFamilyBranch = {
  node: unknown;
  latex: string;
  representativeValue: number;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function parseNumericTarget(node: unknown): NumericTarget | null {
  const normalized = normalizeAst(node);
  try {
    const numeric = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.().json;
    const value = readNumericNode(numeric);
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return {
      node: normalized,
      latex: boxLatex(normalized),
      value,
    };
  } catch {
    return null;
  }
}

function evaluateRealNode(node: unknown) {
  try {
    const boxed = ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).evaluate();
    const numeric = boxed.N?.() ?? boxed;
    return readNumericNode(numeric.json) ?? readNumericNode(boxed.json);
  } catch {
    return null;
  }
}

function substituteVariableNode(node: unknown, value: number) {
  try {
    const substituted = ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).subs({ x: value });
    const simplified = substituted.simplify?.() ?? substituted;
    const normalized = normalizeAst(simplified.json);
    const numericValue = evaluateRealNode(normalized);
    if (numericValue === null || !Number.isFinite(numericValue)) {
      return null;
    }
    return {
      node: normalized,
      value: numericValue,
    };
  } catch {
    return null;
  }
}

function readExactScalar(node: unknown): ExactScalar | null {
  return readExactScalarNode(normalizeAst(node));
}

function isBareVariable(node: unknown) {
  return normalizeAst(node) === 'x';
}

export function buildSymbolicFamilyBranchFromNode(node: unknown, representativeValue?: number): SymbolicFamilyBranch {
  const normalized = normalizeAst(node);
  return {
    node: normalized,
    latex: boxLatex(normalized),
    representativeValue:
      representativeValue
      ?? evaluateRealNode(normalized)
      ?? Number.NaN,
  };
}

export function dedupeSymbolicFamilyBranches(branches: SymbolicFamilyBranch[]) {
  const seen = new Set<string>();
  return branches.filter((branch) => {
    if (seen.has(branch.latex)) {
      return false;
    }
    seen.add(branch.latex);
    return true;
  });
}

export function numericAffineCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isBareVariable(normalized)) {
    return {
      coefficient: 1,
      offsetNode: 0 as unknown,
      offsetValue: 0,
    };
  }

  const affine = matchAffineVariableArgument(normalized);
  if (!affine) {
    if (!dependsOnVariable(normalized, 'x')) {
      return null;
    }

    const atNegOne = substituteVariableNode(normalized, -1);
    const atZero = substituteVariableNode(normalized, 0);
    const atOne = substituteVariableNode(normalized, 1);
    const atTwo = substituteVariableNode(normalized, 2);

    if (!atNegOne || !atZero || !atOne || !atTwo) {
      return null;
    }

    const coefficientEstimate = atOne.value - atZero.value;
    const roundedCoefficient = Math.round(coefficientEstimate);
    if (
      Math.abs(coefficientEstimate - roundedCoefficient) > EPSILON
      || roundedCoefficient === 0
      || Math.abs((atTwo.value - atOne.value) - roundedCoefficient) > EPSILON
      || Math.abs((atZero.value - atNegOne.value) - roundedCoefficient) > EPSILON
    ) {
      return null;
    }

    return {
      coefficient: roundedCoefficient,
      offsetNode: atZero.node,
      offsetValue: atZero.value,
    };
  }

  const offsetValue = evaluateRealNode(affine.offsetNode);
  if (offsetValue === null) {
    return null;
  }

  return {
    coefficient: affine.coefficient,
    offsetNode: affine.offsetNode,
    offsetValue,
  };
}

export function transformAffineBranches(
  carrier: ReturnType<typeof numericAffineCarrier>,
  branches: SymbolicFamilyBranch[],
): SymbolicFamilyBranch[] {
  if (!carrier) {
    return [];
  }

  return branches.map((branch) => {
    const node = carrier.coefficient === 1 && carrier.offsetValue === 0
      ? branch.node
      : normalizeAst(['Divide', ['Subtract', branch.node, carrier.offsetNode], carrier.coefficient]);
    return {
      node,
      latex: boxLatex(node),
      representativeValue: (branch.representativeValue - carrier.offsetValue) / carrier.coefficient,
    };
  });
}

export function matchParameterizedPowerCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const exponent = readExactScalar(normalized[2]);
  if (
    !exponent
    || exponent.denominator !== 1
    || exponent.numerator < 2
    || exponent.numerator > 6
  ) {
    return null;
  }

  const affineBase = numericAffineCarrier(normalized[1]);
  if (!affineBase || !dependsOnVariable(normalized[1], 'x')) {
    return null;
  }

  return {
    degree: exponent.numerator,
    baseNode: normalized[1],
    affineBase,
  };
}

export function matchQuadraticCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  const polynomial = parseExactPolynomial(normalized, 'x', 2);
  if (!polynomial) {
    return null;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  if (!a || a.numerator === 0) {
    return null;
  }

  const b = getExactPolynomialCoefficient(polynomial, 1);
  const c = getExactPolynomialCoefficient(polynomial, 0);

  return {
    a,
    b,
    c,
    aNode: buildExactScalarNode(a),
    bNode: buildExactScalarNode(b),
    cNode: buildExactScalarNode(c),
    aValue: exactScalarToNumber(a),
    bValue: exactScalarToNumber(b),
    cValue: exactScalarToNumber(c),
  };
}

function supportsShiftedCarrierClosure(node: unknown) {
  const parameterizedPower = matchParameterizedPowerCarrier(node);
  if (parameterizedPower && parameterizedPower.degree >= 2 && parameterizedPower.degree <= 4) {
    return true;
  }

  const normalized = normalizeAst(node);
  if (
    isNodeArray(normalized)
    && (
      (normalized[0] === 'Ln' && normalized.length === 2)
      || (normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3))
    )
    && dependsOnVariable(normalized[1], 'x')
  ) {
    return true;
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && !dependsOnVariable(normalized[1], 'x')
    && dependsOnVariable(normalized[2], 'x')
  ) {
    const base = parseNumericTarget(normalized[1]);
    if (base && base.value > 0 && Math.abs(base.value - 1) > EPSILON) {
      return true;
    }
  }

  return Boolean(matchQuadraticCarrier(node));
}

export function matchShiftedSupportedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner = normalizeAst(normalized[1]);
    if (supportsShiftedCarrierClosure(inner)) {
      return {
        innerNode: inner,
        shiftNode: 0 as unknown,
        shiftValue: 0,
        sign: -1 as const,
      };
    }
  }

  if (!isNodeArray(normalized) || normalized.length !== 3) {
    return null;
  }

  const [operator, left, right] = normalized;
  if (operator !== 'Add' && operator !== 'Subtract') {
    return null;
  }

  const leftNormalized = normalizeAst(left);
  const rightNormalized = normalizeAst(right);
  const leftTarget = parseNumericTarget(leftNormalized);
  const rightTarget = parseNumericTarget(rightNormalized);

  if (operator === 'Add') {
    if (rightTarget && supportsShiftedCarrierClosure(leftNormalized)) {
      return {
        innerNode: leftNormalized,
        shiftNode: rightTarget.node,
        shiftValue: rightTarget.value,
        sign: 1 as const,
      };
    }

    if (leftTarget && supportsShiftedCarrierClosure(rightNormalized)) {
      return {
        innerNode: rightNormalized,
        shiftNode: leftTarget.node,
        shiftValue: leftTarget.value,
        sign: 1 as const,
      };
    }
  }

  if (operator === 'Subtract') {
    if (rightTarget && supportsShiftedCarrierClosure(leftNormalized)) {
      return {
        innerNode: leftNormalized,
        shiftNode: normalizeAst(['Negate', rightTarget.node]),
        shiftValue: -rightTarget.value,
        sign: 1 as const,
      };
    }

    if (leftTarget && supportsShiftedCarrierClosure(rightNormalized)) {
      return {
        innerNode: rightNormalized,
        shiftNode: leftTarget.node,
        shiftValue: leftTarget.value,
        sign: -1 as const,
      };
    }
  }

  return null;
}

function buildNthRootNode(node: unknown, degree: number) {
  if (degree === 2) {
    return normalizeAst(['Sqrt', node]);
  }

  return normalizeAst(['Root', node, degree]);
}

function nthRootRepresentativeValue(value: number, degree: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (degree % 2 === 0) {
    if (value < 0) {
      return Number.NaN;
    }
    return Math.pow(value, 1 / degree);
  }

  return Math.sign(value) * Math.pow(Math.abs(value), 1 / degree);
}

export function buildParameterizedPowerBranches(
  carrier: NonNullable<ReturnType<typeof matchParameterizedPowerCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  const transformedBranches: SymbolicFamilyBranch[] = [];
  const parameterConstraints: string[] = [];

  for (const branch of branches) {
    const constantTarget = parseNumericTarget(branch.node);
    if (carrier.degree % 2 === 0 && constantTarget && constantTarget.value < -EPSILON) {
      continue;
    }

    const rootNode = buildNthRootNode(branch.node, carrier.degree);
    const rootRepresentative = nthRootRepresentativeValue(branch.representativeValue, carrier.degree);
    const rootBranch: SymbolicFamilyBranch = {
      node: rootNode,
      latex: boxLatex(rootNode),
      representativeValue: rootRepresentative,
    };

    const affineSolved = transformAffineBranches(carrier.affineBase, [rootBranch]);
    transformedBranches.push(...affineSolved);

    if (carrier.degree % 2 === 0) {
      const negativeRootNode = normalizeAst(['Negate', rootNode]);
      const negativeBranch: SymbolicFamilyBranch = {
        node: negativeRootNode,
        latex: boxLatex(negativeRootNode),
        representativeValue: Number.isFinite(rootRepresentative) ? -rootRepresentative : Number.NaN,
      };
      transformedBranches.push(...transformAffineBranches(carrier.affineBase, [negativeBranch]));

      if (!constantTarget || Math.abs(constantTarget.value) > EPSILON) {
        parameterConstraints.push(`${branch.latex}\\ge0`);
      }
    }
  }

  return {
    branches: dedupeSymbolicFamilyBranches(transformedBranches),
    parameterConstraintLatex: dedupe(parameterConstraints),
  };
}

export function buildShiftedCarrierBranches(
  carrier: NonNullable<ReturnType<typeof matchShiftedSupportedCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  return branches.map((branch) => {
    const node = carrier.sign === 1
      ? normalizeAst(['Subtract', branch.node, carrier.shiftNode])
      : normalizeAst(['Subtract', carrier.shiftNode, branch.node]);
    const representativeValue = carrier.sign === 1
      ? branch.representativeValue - carrier.shiftValue
      : carrier.shiftValue - branch.representativeValue;
    return buildSymbolicFamilyBranchFromNode(node, representativeValue);
  });
}

export function buildQuadraticBranches(
  carrier: NonNullable<ReturnType<typeof matchQuadraticCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  const transformedBranches: SymbolicFamilyBranch[] = [];
  const parameterConstraints: string[] = [];
  const negativeBNode = normalizeAst(['Negate', carrier.bNode]);
  const twoANode = buildExactScalarNode(multiplyExactScalars(carrier.a, { numerator: 2, denominator: 1 }));
  const bSquaredNode = normalizeAst(['Power', carrier.bNode, 2]);
  const fourANode = buildExactScalarNode(multiplyExactScalars(carrier.a, { numerator: 4, denominator: 1 }));

  for (const branch of branches) {
    const cMinusTargetNode = normalizeAst(['Subtract', carrier.cNode, branch.node]);
    const discriminantNode = normalizeAst(['Subtract', bSquaredNode, ['Multiply', fourANode, cMinusTargetNode]]);
    const discriminantTarget = parseNumericTarget(discriminantNode);
    if (discriminantTarget && discriminantTarget.value < -EPSILON) {
      continue;
    }

    if (!discriminantTarget) {
      parameterConstraints.push(`${boxLatex(discriminantNode)}\\ge0`);
    }

    const discriminantValue = carrier.bValue * carrier.bValue
      - 4 * carrier.aValue * (carrier.cValue - branch.representativeValue);
    const sqrtRepresentative = discriminantValue >= -EPSILON
      ? Math.sqrt(Math.max(0, discriminantValue))
      : Number.NaN;
    const denominator = 2 * carrier.aValue;

    const positiveNode = normalizeAst(['Divide', ['Add', negativeBNode, ['Sqrt', discriminantNode]], twoANode]);
    const negativeNode = normalizeAst(['Divide', ['Subtract', negativeBNode, ['Sqrt', discriminantNode]], twoANode]);

    transformedBranches.push(buildSymbolicFamilyBranchFromNode(
      positiveNode,
      Number.isFinite(sqrtRepresentative) ? ((-carrier.bValue + sqrtRepresentative) / denominator) : Number.NaN,
    ));
    transformedBranches.push(buildSymbolicFamilyBranchFromNode(
      negativeNode,
      Number.isFinite(sqrtRepresentative) ? ((-carrier.bValue - sqrtRepresentative) / denominator) : Number.NaN,
    ));
  }

  return {
    branches: dedupeSymbolicFamilyBranches(transformedBranches),
    parameterConstraintLatex: dedupe(parameterConstraints),
  };
}
