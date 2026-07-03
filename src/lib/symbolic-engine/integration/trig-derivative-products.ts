import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  multiplyLatex,
  parseAffine,
} from '../patterns';
import { numericNodeValue, sameNode } from './node-helpers';
import { scaleLatex } from './rational';
import { parseSymbolicAffine } from './symbolic-coefficients';

type TrigHead = 'Sin' | 'Cos' | 'Tan' | 'Cot' | 'Sec' | 'Csc';

export type TrigDerivativeProductRuleResult = {
  exactLatex: string;
  verification?: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
};

type TrigDerivativeProductOptions = {
  symbolicAffine?: boolean;
};

const ce = new ComputeEngine();

function productFactorsWithNegation(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return [-1, ...productFactorsWithNegation(node[1])];
  }

  return isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
}

function multiplyNodeFactors(factors: unknown[]): unknown {
  if (factors.length === 0) {
    return 1;
  }

  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function negateNodeExpression(node: unknown): unknown {
  if (typeof node === 'number') {
    return -node;
  }

  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function splitTargetFreeScalarProduct(
  node: unknown,
  variable: string,
): { coefficient: unknown; factors: unknown[] } {
  const scalarFactors: unknown[] = [];
  const factors: unknown[] = [];
  for (const factor of productFactorsWithNegation(node)) {
    if (!dependsOnVariable(factor, variable)) {
      scalarFactors.push(factor);
    } else {
      factors.push(factor);
    }
  }

  return {
    coefficient: multiplyNodeFactors(scalarFactors),
    factors,
  };
}

function splitNumericScalarProduct(node: unknown): { coefficient: number; factors: unknown[] } {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const split = splitNumericScalarProduct(node[1]);
    return {
      coefficient: -split.coefficient,
      factors: split.factors,
    };
  }

  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  let coefficient = 1;
  const symbolicFactors: unknown[] = [];
  for (const factor of factors) {
    const numeric = numericNodeValue(factor);
    if (numeric !== undefined) {
      coefficient *= numeric;
    } else {
      symbolicFactors.push(factor);
    }
  }

  return { coefficient, factors: symbolicFactors };
}

function nonzeroFact(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function exactSupplementLatex(entries: ExactSupplementEntry[]) {
  const merged = mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
  if (merged.length > 0) {
    return merged;
  }

  return entries.map((entry) =>
    entry.kind === 'condition' || entry.kind === 'exclusion'
      ? `\\text{Affine slope fact: } ${entry.expressionLatex}${entry.relation}`
      : 'latex' in entry ? entry.latex : '');
}

function proof(reason: string): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason,
  };
}

function simplifyLatex(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().latex;
  } catch {
    return boxLatex(node);
  }
}

function ratioLatex(numerator: unknown, denominator: unknown) {
  return simplifyLatex(['Divide', numerator, denominator]);
}

function symbolicTrigDerivativeProductResult(
  coefficient: unknown,
  affineSlope: unknown,
  affineSlopeLatex: string,
  primitiveLatex: string,
  reason: string,
  sign: 1 | -1,
  denominatorMultiplier?: unknown,
): TrigDerivativeProductRuleResult {
  const numerator = sign === 1 ? coefficient : negateNodeExpression(coefficient);
  const denominator = denominatorMultiplier === undefined
    ? affineSlope
    : multiplyNodeFactors([denominatorMultiplier, affineSlope]);
  return {
    exactLatex: multiplyLatex(ratioLatex(numerator, denominator), primitiveLatex),
    verification: proof(reason),
    exactSupplementLatex: exactSupplementLatex([nonzeroFact(affineSlopeLatex)]),
  };
}

function trigArgument(factor: unknown, head: TrigHead) {
  return isNodeArray(factor) && factor[0] === head && factor.length === 2
    ? factor[1]
    : undefined;
}

function sharedTrigArgument(
  left: unknown,
  right: unknown,
  leftHead: TrigHead,
  rightHead: TrigHead,
) {
  const leftArgument = trigArgument(left, leftHead);
  const rightArgument = trigArgument(right, rightHead);
  return leftArgument !== undefined
    && rightArgument !== undefined
    && sameNode(leftArgument, rightArgument)
    ? leftArgument
    : undefined;
}

function sameArgumentTrigProduct(
  factors: unknown[],
  leftHead: TrigHead,
  rightHead: TrigHead,
) {
  return sharedTrigArgument(factors[0], factors[1], leftHead, rightHead)
    ?? sharedTrigArgument(factors[1], factors[0], leftHead, rightHead);
}

function tryNumericTrigDerivativeProductRule(
  node: unknown,
  variable: string,
): TrigDerivativeProductRuleResult | undefined {
  const { coefficient, factors } = splitNumericScalarProduct(node);
  if (Math.abs(coefficient) < 1e-10 || factors.length !== 2) {
    return undefined;
  }

  const secTan = sameArgumentTrigProduct(factors, 'Sec', 'Tan');
  if (secTan !== undefined) {
    const affine = parseAffine(secTan, variable);
    return affine && affine.a !== 0
      ? { exactLatex: scaleLatex(`\\sec\\left(${affine.latex}\\right)`, coefficient / affine.a) }
      : undefined;
  }

  const cscCot = sameArgumentTrigProduct(factors, 'Csc', 'Cot');
  if (cscCot !== undefined) {
    const affine = parseAffine(cscCot, variable);
    return affine && affine.a !== 0
      ? { exactLatex: scaleLatex(`\\csc\\left(${affine.latex}\\right)`, -coefficient / affine.a) }
      : undefined;
  }

  const sinCos = sameArgumentTrigProduct(factors, 'Sin', 'Cos');
  if (sinCos !== undefined) {
    const affine = parseAffine(sinCos, variable);
    return affine && affine.a !== 0
      ? { exactLatex: scaleLatex(`\\sin\\left(${affine.latex}\\right)^2`, coefficient / (2 * affine.a)) }
      : undefined;
  }

  return undefined;
}

export function tryTrigDerivativeProductRule(
  node: unknown,
  variable: string,
  options: TrigDerivativeProductOptions = {},
): TrigDerivativeProductRuleResult | undefined {
  if (options.symbolicAffine === false) {
    return tryNumericTrigDerivativeProductRule(node, variable);
  }

  const { coefficient, factors } = splitTargetFreeScalarProduct(node, variable);
  if ((numericNodeValue(coefficient) ?? 1) === 0 || factors.length !== 2) {
    return undefined;
  }

  const secTan = sameArgumentTrigProduct(factors, 'Sec', 'Tan');
  if (secTan !== undefined) {
    const affine = parseSymbolicAffine(secTan, variable);
    return affine && (numericNodeValue(affine.slope) ?? 1) !== 0
      ? symbolicTrigDerivativeProductResult(
        coefficient,
        affine.slope,
        affine.slopeLatex,
        `\\sec\\left(${affine.latex}\\right)`,
        'verified by symbolic affine secant-tangent derivative product proof',
        1,
      )
      : undefined;
  }

  const cscCot = sameArgumentTrigProduct(factors, 'Csc', 'Cot');
  if (cscCot !== undefined) {
    const affine = parseSymbolicAffine(cscCot, variable);
    return affine && (numericNodeValue(affine.slope) ?? 1) !== 0
      ? symbolicTrigDerivativeProductResult(
        coefficient,
        affine.slope,
        affine.slopeLatex,
        `\\csc\\left(${affine.latex}\\right)`,
        'verified by symbolic affine cosecant-cotangent derivative product proof',
        -1,
      )
      : undefined;
  }

  const sinCos = sameArgumentTrigProduct(factors, 'Sin', 'Cos');
  if (sinCos !== undefined) {
    const affine = parseSymbolicAffine(sinCos, variable);
    return affine && (numericNodeValue(affine.slope) ?? 1) !== 0
      ? symbolicTrigDerivativeProductResult(
        coefficient,
        affine.slope,
        affine.slopeLatex,
        `\\sin\\left(${affine.latex}\\right)^2`,
        'verified by symbolic affine sine-cosine derivative product proof',
        1,
        2,
      )
      : undefined;
  }

  return undefined;
}
