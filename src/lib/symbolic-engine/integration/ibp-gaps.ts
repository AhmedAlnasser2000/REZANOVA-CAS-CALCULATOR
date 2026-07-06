import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  addExactPolynomials,
  addExactScalars,
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  multiplyExactPolynomials,
  negateExactScalar,
  parseExactPolynomial,
  scaleExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
  multiplyLatex,
  wrapGroupedLatex,
} from '../patterns';
import { negateGeneratedLatex } from './generated-latex';
import { sameNode } from './node-helpers';
import { parseExactAffineArgument } from './exact-parts';
import { normalizeGeneratedIntegrationLatex } from './readback-hygiene';
import { scaleByExactScalar } from './rational-latex';
import { tryRationalPartialFractionRule } from './rational';

type IbpGapResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

type InverseTrigHead = 'Arctan' | 'Arcsin';
type TrigDerivativeHead = 'Sec' | 'Csc';
type ExactAffineArgument = NonNullable<ReturnType<typeof parseExactAffineArgument>>;
type ArcsinKernel = {
  arcsinCoefficient: ExactScalar;
  radicalPolynomial: ExactPolynomial;
};

const EXACT_ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const INVERSE_TRIG_POLYNOMIAL_DEGREE_CAP = 6;
const AFFINE_TRIG_DERIVATIVE_POLYNOMIAL_DEGREE_CAP = 1;

function joinAdditiveLatex(parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part) && part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function negateAdditiveLatex(latex: string) {
  return latex.includes('+') || latex.slice(1).includes('-')
    ? `-${wrapGroupedLatex(latex)}`
    : negateGeneratedLatex(latex);
}

function scaleExpressionByExactScalar(latex: string, coefficient: ExactScalar) {
  return latex.includes('+') || latex.slice(1).includes('-')
    ? scaleByExactScalar(wrapGroupedLatex(latex), coefficient)
    : scaleByExactScalar(latex, coefficient);
}

function productNodeFromFactors(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function productWithoutSelectedFactor(factors: unknown[], selectedIndex: number) {
  return productNodeFromFactors(factors.filter((_, index) => index !== selectedIndex));
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function groupedLatex(latex: string) {
  return /^[A-Za-z](?:\^\{?[-+]?\d+\}?)?$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function nonzeroFact(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function conditionFact(expressionLatex: string, relation: '\\ge0'): ExactSupplementEntry {
  return {
    kind: 'condition',
    expressionLatex,
    relation,
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

function exactTemplateProofAfterBackcheck(
  verification: AntiderivativeBackcheck,
  reason: string,
): AntiderivativeBackcheck | undefined {
  return verification.status === 'verified-exact'
    || verification.status === 'verified-numeric-confidence'
    ? { status: 'verified-exact', reason }
    : undefined;
}

function verifiedResult(
  node: unknown,
  variable: string,
  exactLatex: string,
  reason: string,
) {
  return exactTemplateProofAfterBackcheck(
    backcheckAntiderivative({ antiderivativeLatex: exactLatex, integrand: node, variable }),
    reason,
  );
}

function integrateExactPolynomial(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  const coefficients: ExactScalar[] = [];
  for (let primitiveDegree = degree + 1; primitiveDegree >= 0; primitiveDegree -= 1) {
    if (primitiveDegree === 0) {
      coefficients.push(EXACT_ZERO);
      continue;
    }

    const coefficient = getExactPolynomialCoefficient(polynomial, primitiveDegree - 1);
    const integrated = divideExactScalars(coefficient, {
      numerator: primitiveDegree,
      denominator: 1,
    });
    if (!integrated) {
      return undefined;
    }
    coefficients.push(integrated);
  }

  return buildExactPolynomialFromCoefficients(polynomial.variable, coefficients);
}

function groupedCoefficientLatex(latex: string) {
  return latex.includes('+') || latex.slice(1).includes('-')
    ? wrapGroupedLatex(latex)
    : latex;
}

function productWithFunctionLatex(coefficientLatex: string, functionLatex: string) {
  if (coefficientLatex === '1') {
    return functionLatex;
  }
  if (coefficientLatex === '-1') {
    return negateGeneratedLatex(functionLatex);
  }
  return multiplyLatex(groupedCoefficientLatex(coefficientLatex), functionLatex);
}

function inverseTrigFactor(factor: unknown, head: InverseTrigHead, variable: string) {
  if (!isNodeArray(factor) || factor[0] !== head || factor.length !== 2) {
    return undefined;
  }

  const affine = parseExactAffineArgument(factor[1], variable);
  const argumentPolynomial = parseExactPolynomial(factor[1], variable, 1);
  if (!affine || !argumentPolynomial) {
    return undefined;
  }

  return {
    affine,
    argumentNode: factor[1],
    argumentPolynomial,
    factorLatex: head === 'Arctan'
      ? `\\arctan\\left(${affine.latex}\\right)`
      : `\\arcsin\\left(${affine.latex}\\right)`,
  };
}

function findInverseTrigProduct(
  node: unknown,
  variable: string,
): {
  head: InverseTrigHead;
  polynomial: ExactPolynomial;
  factorLatex: string;
  argumentNode: unknown;
  argumentPolynomial: ExactPolynomial;
  affine: ExactAffineArgument;
} | undefined {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  for (let index = 0; index < factors.length; index += 1) {
    const factor = factors[index];
    const arctan = inverseTrigFactor(factor, 'Arctan', variable);
    const arcsin = arctan ? undefined : inverseTrigFactor(factor, 'Arcsin', variable);
    const inverseTrig = arctan ?? arcsin;
    const head: InverseTrigHead | undefined = arctan ? 'Arctan' : arcsin ? 'Arcsin' : undefined;
    if (!head || !inverseTrig || !inverseTrig.affine) {
      continue;
    }

    const polynomial = parseExactPolynomial(
      productWithoutSelectedFactor(factors, index),
      variable,
      INVERSE_TRIG_POLYNOMIAL_DEGREE_CAP,
    );
    if (!polynomial || exactPolynomialDegree(polynomial) > INVERSE_TRIG_POLYNOMIAL_DEGREE_CAP) {
      return undefined;
    }

    return {
      head,
      polynomial,
      factorLatex: inverseTrig.factorLatex,
      argumentNode: inverseTrig.argumentNode,
      argumentPolynomial: inverseTrig.argumentPolynomial,
      affine: inverseTrig.affine,
    };
  }

  return undefined;
}

function residualRationalNode(
  primitivePolynomial: ExactPolynomial,
  product: NonNullable<ReturnType<typeof findInverseTrigProduct>>,
) {
  return [
    'Divide',
    exactPolynomialToNode(scaleExactPolynomial(primitivePolynomial, product.affine.slope)),
    ['Add', ['Power', product.argumentNode, 2], 1],
  ];
}

function radicalLatex(carrierLatex: string) {
  return `\\sqrt{1-${groupedLatex(carrierLatex)}^2}`;
}

function zeroPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [EXACT_ZERO]);
}

function monomialPolynomial(variable: string, degree: number, coefficient: ExactScalar) {
  return buildExactPolynomialFromCoefficients(variable, [
    coefficient,
    ...Array.from({ length: degree }, () => EXACT_ZERO),
  ]);
}

function buildArcsinKernelTable(variable: string, maxDegree: number) {
  const table: ArcsinKernel[] = [];
  table[0] = {
    arcsinCoefficient: EXACT_ONE,
    radicalPolynomial: zeroPolynomial(variable),
  };
  if (maxDegree >= 1) {
    table[1] = {
      arcsinCoefficient: EXACT_ZERO,
      radicalPolynomial: monomialPolynomial(variable, 0, { numerator: -1, denominator: 1 }),
    };
  }

  for (let degree = 2; degree <= maxDegree; degree += 1) {
    const recurrenceScale = {
      numerator: degree - 1,
      denominator: degree,
    };
    const boundaryPolynomial = monomialPolynomial(variable, degree - 1, {
      numerator: -1,
      denominator: degree,
    });
    table[degree] = {
      arcsinCoefficient: multiplyExactScalars(
        table[degree - 2].arcsinCoefficient,
        recurrenceScale,
      ),
      radicalPolynomial: addExactPolynomials(
        scaleExactPolynomial(table[degree - 2].radicalPolynomial, recurrenceScale),
        boundaryPolynomial,
      ),
    };
  }

  return table;
}

function exactPolynomialPower(
  polynomial: ExactPolynomial,
  exponent: number,
  maxDegree: number,
): ExactPolynomial | undefined {
  let current = buildExactPolynomialFromCoefficients(polynomial.variable, [EXACT_ONE]);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyExactPolynomials(current, polynomial, maxDegree);
    if (!next) {
      return undefined;
    }
    current = next;
  }
  return current;
}

function composePolynomialWithAffineCarrier(
  polynomial: ExactPolynomial,
  affinePolynomial: ExactPolynomial,
  carrierVariable: string,
): ExactPolynomial | undefined {
  const slope = getExactPolynomialCoefficient(affinePolynomial, 1);
  const intercept = getExactPolynomialCoefficient(affinePolynomial, 0);
  const inverseSlope = divideExactScalars(EXACT_ONE, slope);
  const inverseIntercept = divideExactScalars(negateExactScalar(intercept), slope);
  if (!inverseSlope || !inverseIntercept) {
    return undefined;
  }

  const carrierAsOriginalVariable = buildExactPolynomialFromCoefficients(carrierVariable, [
    inverseSlope,
    inverseIntercept,
  ]);
  let composed = zeroPolynomial(carrierVariable);
  const degree = exactPolynomialDegree(polynomial);
  for (let power = 0; power <= degree; power += 1) {
    const coefficient = getExactPolynomialCoefficient(polynomial, power);
    if (exactScalarIsZero(coefficient)) {
      continue;
    }

    const powered = exactPolynomialPower(carrierAsOriginalVariable, power, degree);
    if (!powered) {
      return undefined;
    }
    composed = addExactPolynomials(composed, scaleExactPolynomial(powered, coefficient));
  }

  return composed;
}

function substituteCarrierLatex(latex: string, carrierVariable: string, carrierLatex: string) {
  const carrier = groupedLatex(carrierLatex);
  return latex.replace(new RegExp(`\\b${carrierVariable}\\b`, 'g'), carrier);
}

function integrateArcsinResidual(
  primitivePolynomial: ExactPolynomial,
  product: NonNullable<ReturnType<typeof findInverseTrigProduct>>,
  variable: string,
) {
  if (sameNode(product.argumentNode, variable)) {
    return integrateArcsinKernelPolynomial(primitivePolynomial, variable, variable);
  }

  const carrierVariable = 'z';
  const carrierPolynomial = composePolynomialWithAffineCarrier(
    primitivePolynomial,
    product.argumentPolynomial,
    carrierVariable,
  );
  if (!carrierPolynomial) {
    return undefined;
  }

  return integrateArcsinKernelPolynomial(carrierPolynomial, product.affine.latex, carrierVariable);
}

function integrateArcsinKernelPolynomial(
  primitivePolynomial: ExactPolynomial,
  carrierLatex: string,
  carrierVariable: string,
) {
  const degree = exactPolynomialDegree(primitivePolynomial);
  const kernels = buildArcsinKernelTable(primitivePolynomial.variable, degree);

  let arcsinCoefficient = EXACT_ZERO;
  let radicalPolynomial = zeroPolynomial(primitivePolynomial.variable);
  for (let power = 0; power <= degree; power += 1) {
    const coefficient = getExactPolynomialCoefficient(primitivePolynomial, power);
    if (exactScalarIsZero(coefficient)) {
      continue;
    }
    arcsinCoefficient = addExactScalars(
      arcsinCoefficient,
      multiplyExactScalars(coefficient, kernels[power].arcsinCoefficient),
    );
    radicalPolynomial = addExactPolynomials(
      radicalPolynomial,
      scaleExactPolynomial(kernels[power].radicalPolynomial, coefficient),
    );
  }

  const arcsinLatex = exactScalarIsZero(arcsinCoefficient)
    ? undefined
    : scaleExpressionByExactScalar(`\\arcsin\\left(${carrierLatex}\\right)`, arcsinCoefficient);
  const radicalTermLatex = exactPolynomialIsZero(radicalPolynomial)
    ? undefined
    : productWithFunctionLatex(
      substituteCarrierLatex(exactPolynomialToLatex(radicalPolynomial), carrierVariable, carrierLatex),
      radicalLatex(carrierLatex),
    );

  return joinAdditiveLatex([arcsinLatex, radicalTermLatex]);
}

function byPartsDetail(title: string, lines: string[]): DisplayDetailSection {
  return { title, lines };
}

function tryInverseTrigByPartsRule(node: unknown, variable: string): IbpGapResult | undefined {
  const product = findInverseTrigProduct(node, variable);
  if (!product) {
    return undefined;
  }

  const polynomialDegree = exactPolynomialDegree(product.polynomial);
  if (
    product.head === 'Arcsin'
    && (!sameNode(product.argumentNode, variable) || polynomialDegree > 4)
  ) {
    return undefined;
  }

  const primitivePolynomial = integrateExactPolynomial(product.polynomial);
  if (!primitivePolynomial) {
    return undefined;
  }

  const primitiveLatex = exactPolynomialToLatex(primitivePolynomial);
  const boundaryLatex = productWithFunctionLatex(primitiveLatex, product.factorLatex);
  const residualLatex = product.head === 'Arctan'
    ? tryRationalPartialFractionRule(residualRationalNode(primitivePolynomial, product), variable)?.exactLatex
    : integrateArcsinResidual(primitivePolynomial, product, variable);
  if (!residualLatex) {
    return undefined;
  }

  const candidateLatex = joinAdditiveLatex([boundaryLatex, negateAdditiveLatex(residualLatex)]);
  if (!candidateLatex) {
    return undefined;
  }
  const exactLatex = normalizeGeneratedIntegrationLatex(candidateLatex, variable);

  const verification = verifiedResult(
    node,
    variable,
    exactLatex,
    product.head === 'Arctan'
      ? 'verified by bounded polynomial-times-arctan integration-by-parts rule with rational residual backcheck'
      : 'verified by bounded polynomial-times-arcsin integration-by-parts rule with capped radical-kernel recurrence',
  );
  if (!verification) {
    return undefined;
  }

  return {
    exactLatex,
    verification,
    exactSupplementLatex: exactSupplementLatex([
      nonzeroFact(exactScalarLatex(product.affine.slope)),
      ...(product.head === 'Arcsin'
        ? [conditionFact(`1-${groupedLatex(product.affine.latex)}^2`, '\\ge0')]
        : []),
    ]),
    detailSections: [byPartsDetail('Integration By Parts', [
      `Polynomial factor: ${exactPolynomialToLatex(product.polynomial)}`,
      `Primitive polynomial: ${primitiveLatex}`,
      `Affine inverse-trig argument: ${product.affine.latex}`,
      product.head === 'Arctan'
        ? 'Residual route: rational integration over 1+x^2.'
        : 'Residual route: affine change of variable, then capped recurrence for powers over sqrt(1-z^2).',
      'Accepted only after derivative backcheck against the original integrand.',
    ])],
  };
}

function squaredTrigDerivativeFactor(factor: unknown): { head: TrigDerivativeHead; argument: unknown } | undefined {
  if (
    !isNodeArray(factor)
    || factor[0] !== 'Power'
    || factor.length !== 3
    || factor[2] !== 2
    || !isNodeArray(factor[1])
    || factor[1].length !== 2
  ) {
    return undefined;
  }

  const head = factor[1][0];
  return head === 'Sec' || head === 'Csc'
    ? { head, argument: factor[1][1] }
    : undefined;
}

function findAffineTrigDerivativeProduct(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  for (let index = 0; index < factors.length; index += 1) {
    const squaredTrig = squaredTrigDerivativeFactor(factors[index]);
    if (!squaredTrig) {
      continue;
    }

    const affine = parseExactAffineArgument(squaredTrig.argument, variable);
    const polynomial = parseExactPolynomial(
      productWithoutSelectedFactor(factors, index),
      variable,
      AFFINE_TRIG_DERIVATIVE_POLYNOMIAL_DEGREE_CAP,
    );
    if (!affine || !polynomial) {
      return undefined;
    }

    return { ...squaredTrig, affine, polynomial };
  }

  return undefined;
}

function tryAffineTrigDerivativeByPartsRule(
  node: unknown,
  variable: string,
): IbpGapResult | undefined {
  const product = findAffineTrigDerivativeProduct(node, variable);
  if (
    !product
    || exactPolynomialDegree(product.polynomial) > AFFINE_TRIG_DERIVATIVE_POLYNOMIAL_DEGREE_CAP
  ) {
    return undefined;
  }

  const reciprocalSlope = divideExactScalars(EXACT_ONE, product.affine.slope);
  const slopeSquared = multiplyExactScalars(product.affine.slope, product.affine.slope);
  const derivativeCoefficient = getExactPolynomialCoefficient(product.polynomial, 1);
  const logCoefficient = divideExactScalars(derivativeCoefficient, slopeSquared);
  if (!reciprocalSlope || !logCoefficient) {
    return undefined;
  }

  const scaledPolynomial = scaleExactPolynomial(product.polynomial, reciprocalSlope);
  const scaledPolynomialLatex = exactPolynomialToLatex(scaledPolynomial);
  const argumentLatex = product.affine.latex;
  const primitiveTrig = product.head === 'Sec'
    ? `\\tan\\left(${argumentLatex}\\right)`
    : `\\cot\\left(${argumentLatex}\\right)`;
  const signedTrigTerm = product.head === 'Sec'
    ? productWithFunctionLatex(scaledPolynomialLatex, primitiveTrig)
    : negateGeneratedLatex(productWithFunctionLatex(scaledPolynomialLatex, primitiveTrig));
  const logCarrier = product.head === 'Sec'
    ? `\\cos\\left(${argumentLatex}\\right)`
    : `\\sin\\left(${argumentLatex}\\right)`;
  const logTerm = exactScalarIsZero(logCoefficient)
    ? undefined
    : scaleByExactScalar(`\\ln\\left|${logCarrier}\\right|`, logCoefficient);
  const candidateLatex = joinAdditiveLatex([signedTrigTerm, logTerm]);
  if (!candidateLatex) {
    return undefined;
  }
  const exactLatex = normalizeGeneratedIntegrationLatex(candidateLatex, variable);

  const verification = verifiedResult(
    node,
    variable,
    exactLatex,
    `verified by bounded affine-polynomial times ${product.head.toLowerCase()}^2 integration-by-parts rule after derivative backcheck`,
  );
  if (!verification) {
    return undefined;
  }

  return {
    exactLatex,
    verification,
    exactSupplementLatex: exactSupplementLatex([
      nonzeroFact(exactScalarLatex(product.affine.slope)),
      nonzeroFact(logCarrier),
    ]),
    detailSections: [byPartsDetail('Integration By Parts', [
      `Polynomial factor: ${exactPolynomialToLatex(product.polynomial)}`,
      `Affine argument: ${argumentLatex}`,
      `Affine slope fact: ${exactScalarLatex(product.affine.slope)}\\ne0`,
      `Primitive trig kernel: ${product.head === 'Sec' ? 'tan' : '-cot'}.`,
      'Accepted only after derivative backcheck against the original integrand.',
    ])],
  };
}

export function tryTextbookIbpGapRule(node: unknown, variable: string): IbpGapResult | undefined {
  return tryInverseTrigByPartsRule(node, variable)
    ?? tryAffineTrigDerivativeByPartsRule(node, variable);
}
