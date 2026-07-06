import type { DisplayDetailSection } from '../../../types/calculator';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import { boxLatex, flattenMultiply, isNodeArray } from '../patterns';
import { unsupportedCandidateMetadata } from './metadata';
import type { IntegralResolution } from './types';

const MAX_SINGLE_SIN_COS_POWER = 12;
const MAX_PRODUCT_INDIVIDUAL_POWER = 8;
const MAX_PRODUCT_TOTAL_DEGREE = 12;
const TRIG_HEADS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Cot', 'Csc']);

type PoweredTrigFactor = {
  head: string;
  exponent: number;
};

function positiveIntegerExponent(node: unknown) {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return node;
  }

  const scalar = readExactScalarNode(node);
  return scalar?.denominator === 1 ? scalar.numerator : undefined;
}

function poweredTrigFactor(node: unknown): PoweredTrigFactor | undefined {
  const base = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[1] : node;
  const exponentNode = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[2] : 1;
  const exponent = positiveIntegerExponent(exponentNode);
  if (
    exponent === undefined
    || exponent < 1
    || !isNodeArray(base)
    || base.length !== 2
    || !TRIG_HEADS.has(String(base[0]))
  ) {
    return undefined;
  }

  return { head: String(base[0]), exponent };
}

function trigPowerBoundaryDetail(node: unknown, factors: PoweredTrigFactor[]): DisplayDetailSection | undefined {
  const totalDegree = factors.reduce((sum, factor) => sum + factor.exponent, 0);
  const maxExponent = Math.max(...factors.map((factor) => factor.exponent));
  const singleSinCos = factors.length === 1 && (factors[0].head === 'Sin' || factors[0].head === 'Cos');
  const overCap = singleSinCos
    ? maxExponent > MAX_SINGLE_SIN_COS_POWER
    : maxExponent > MAX_PRODUCT_INDIVIDUAL_POWER || totalDegree > MAX_PRODUCT_TOTAL_DEGREE;

  if (!overCap) {
    return undefined;
  }

  return {
    title: 'Integration Trig Power Boundary',
    lines: [
      `Recognized trig-power integrand: ${boxLatex(node)}`,
      `Largest exponent: ${maxExponent}; total trig degree: ${totalDegree}`,
      `Current cap: single sin/cos powers up to ${MAX_SINGLE_SIN_COS_POWER}, mixed trig products with individual exponent <= ${MAX_PRODUCT_INDIVIDUAL_POWER} and total degree <= ${MAX_PRODUCT_TOTAL_DEGREE}.`,
      'No partial antiderivative was adopted outside the bounded textbook reduction slice.',
    ],
  };
}

export function unsupportedTrigPowerBoundary(
  node: unknown,
  variable: string,
): IntegralResolution | undefined {
  const factors = (isNodeArray(node) && node[0] === 'Multiply' ? flattenMultiply(node) : [node])
    .map(poweredTrigFactor);
  if (factors.some((factor) => !factor)) {
    return undefined;
  }

  const detail = trigPowerBoundaryDetail(node, factors as PoweredTrigFactor[]);
  return detail
    ? {
      kind: 'error',
      error: 'This antiderivative could not be determined symbolically in this milestone.',
      candidate: unsupportedCandidateMetadata(node, variable),
      detailSections: [detail],
    }
    : undefined;
}
