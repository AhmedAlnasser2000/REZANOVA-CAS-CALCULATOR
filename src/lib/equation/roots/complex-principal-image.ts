import { normalizeExactScalar, type ExactScalar } from '../../algebra/polynomial-core';
import {
  exactScalarIsZero,
  normalizeExactComplexScalar,
  parseExactComplexConstantNode,
} from '../complex/exact';
import { latexForNode, simplifyNode, type MathJson } from '../parameterized/math-json';
import type { ComplexPrincipalRootDegree } from './complex-principal-roots';

export type ComplexPrincipalRootImageClassification = 'inside' | 'outside' | 'unknown';

export type ComplexPrincipalRootImageFact = {
  degree: ComplexPrincipalRootDegree;
  value: MathJson;
  valueLatex: string;
  conditionLatex: string;
  classification: ComplexPrincipalRootImageClassification;
  detailLines: string[];
};

function scalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return 0;
  }
  return normalized.numerator > 0 ? 1 : -1;
}

function classifySquareRootImage(node: MathJson): ComplexPrincipalRootImageClassification {
  const exact = parseExactComplexConstantNode(simplifyNode(node));
  if (!exact) {
    return 'unknown';
  }

  const normalized = normalizeExactComplexScalar(exact);
  const realSign = scalarSign(normalized.re);
  const imaginarySign = scalarSign(normalized.im);
  if (realSign > 0 || (realSign === 0 && imaginarySign >= 0)) {
    return 'inside';
  }
  return 'outside';
}

function classifyHigherRootImage(node: MathJson): ComplexPrincipalRootImageClassification {
  const exact = parseExactComplexConstantNode(simplifyNode(node));
  if (!exact) {
    return 'unknown';
  }

  const normalized = normalizeExactComplexScalar(exact);
  const realIsZero = exactScalarIsZero(normalized.re);
  const imaginaryIsZero = exactScalarIsZero(normalized.im);
  if (realIsZero && imaginaryIsZero) {
    return 'inside';
  }
  if (imaginaryIsZero) {
    return scalarSign(normalized.re) > 0 ? 'inside' : 'outside';
  }
  if (realIsZero) {
    return 'outside';
  }
  return 'unknown';
}

export function classifyPrincipalRootImageValue(
  node: MathJson,
  degree: ComplexPrincipalRootDegree,
): ComplexPrincipalRootImageClassification {
  return degree === 2
    ? classifySquareRootImage(node)
    : classifyHigherRootImage(node);
}

export function principalRootImageConditionLatex(
  valueLatex: string,
  degree: ComplexPrincipalRootDegree,
) {
  if (degree === 2) {
    return [
      `\\operatorname{Re}\\left(${valueLatex}\\right)>0`,
      '\\ \\lor\\ ',
      `\\left(\\operatorname{Re}\\left(${valueLatex}\\right)=0`,
      '\\ \\land\\ ',
      `\\operatorname{Im}\\left(${valueLatex}\\right)\\ge0\\right)`,
    ].join('');
  }

  return [
    `${valueLatex}=0`,
    '\\ \\lor\\ ',
    `-\\frac{\\pi}{${degree}}<\\arg\\left(${valueLatex}\\right)`,
    `\\le\\frac{\\pi}{${degree}}`,
  ].join('');
}

function classificationLine(classification: ComplexPrincipalRootImageClassification) {
  if (classification === 'inside') {
    return 'The isolated value is provably inside the principal-root image.';
  }
  if (classification === 'outside') {
    return 'The isolated value is provably outside the principal-root image.';
  }
  return 'The isolated value needs this principal-root image condition as a guarded fact.';
}

export function buildPrincipalRootImageFact(
  node: MathJson,
  degree: ComplexPrincipalRootDegree,
): ComplexPrincipalRootImageFact {
  const value = simplifyNode(node);
  const valueLatex = latexForNode(value);
  const conditionLatex = principalRootImageConditionLatex(valueLatex, degree);
  const classification = classifyPrincipalRootImageValue(value, degree);
  return {
    degree,
    value,
    valueLatex,
    conditionLatex,
    classification,
    detailLines: [
      `Principal ${degree}-root image: ${conditionLatex}`,
      classificationLine(classification),
    ],
  };
}

export function principalRootImageSupplementLatex(
  node: MathJson,
  degree: ComplexPrincipalRootDegree,
) {
  const fact = buildPrincipalRootImageFact(node, degree);
  return fact.classification === 'unknown' ? fact.conditionLatex : null;
}
