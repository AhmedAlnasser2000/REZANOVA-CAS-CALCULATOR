import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  backcheckAntiderivativeAst,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../patterns';
import {
  integrationDetailSection,
  integrationMathRow,
  integrationTextRow,
  type IntegrationDetailRow,
} from './detail-readback';
import { parseExactAffineArgument } from './exact-parts';
import { sameNode } from './node-helpers';
import { LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP } from './types';

type TrigIbpFormalResult = {
  exactLatex: string;
  antiderivativeNode: unknown;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  trustMode?: 'precomputed-exact';
};

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const LOG_POWER_BY_PARTS_CAP = 4;
const FORMAL_FUNCTION_NAME = /^[A-Za-z][A-Za-z0-9_]*$/u;
const KNOWN_MATH_HEADS = new Set([
  'Abs', 'Add', 'Arccos', 'Arcsin', 'Arctan', 'Cos', 'Cosh', 'Cot', 'Csc',
  'Divide', 'Exp', 'ExponentialE', 'Ln', 'Log', 'Multiply', 'Negate', 'Power',
  'Sec', 'Sin', 'Sinh', 'Sqrt', 'Subtract', 'Tan', 'Tanh',
]);

function byPartsDetail(title: string, rows: readonly IntegrationDetailRow[]): DisplayDetailSection {
  return integrationDetailSection(title, rows);
}

function exactFact(expressionLatex: string, relation: '>0' | '\\ne0'): ExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex,
    relation,
    source: 'candidate-validation',
  };
}

function exactSupplementLatex(entries: ExactSupplementEntry[]) {
  return mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
}

function verifiedAstResult(
  node: unknown,
  variable: string,
  antiderivativeNode: unknown,
  reason: string,
) {
  const verification = backcheckAntiderivativeAst({
    antiderivative: antiderivativeNode,
    integrand: node,
    variable,
  });
  return verification.status === 'verified-exact'
    || verification.status === 'verified-numeric-confidence'
    ? { status: 'verified-exact' as const, reason }
    : undefined;
}

function productNodeFromFactors(factors: unknown[]) {
  if (factors.length === 0) return 1;
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function productWithoutSelectedFactor(factors: unknown[], selectedIndex: number) {
  return productNodeFromFactors(factors.filter((_, index) => index !== selectedIndex));
}

function exactScalarFromInteger(value: number): ExactScalar {
  return { numerator: value, denominator: 1 };
}

function exactScalarPower(base: ExactScalar, exponent: number) {
  let result = EXACT_ONE;
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyExactScalars(result, base);
  }
  return result;
}

function exactScalarFactorial(value: number) {
  let result = EXACT_ONE;
  for (let index = 2; index <= value; index += 1) {
    result = multiplyExactScalars(result, exactScalarFromInteger(index));
  }
  return result;
}

function exactPowerNode(base: unknown, exponent: number) {
  return exponent === 1 ? structuredClone(base) : ['Power', structuredClone(base), exponent];
}

function multiplyNodeFactors(factors: unknown[]) {
  const cleaned = factors.filter((factor) => factor !== 1);
  if (cleaned.length === 0) return 1;
  return cleaned.length === 1 ? cleaned[0] : ['Multiply', ...cleaned];
}

function logPowerFactor(factor: unknown, variable: string): number | undefined {
  if (isNodeArray(factor) && (factor[0] === 'Ln' || factor[0] === 'Log') && factor.length === 2) {
    return sameNode(factor[1], variable) ? 1 : undefined;
  }
  if (
    !isNodeArray(factor)
    || factor[0] !== 'Power'
    || factor.length !== 3
    || !isNodeArray(factor[1])
    || !(factor[1][0] === 'Ln' || factor[1][0] === 'Log')
    || factor[1].length !== 2
    || !sameNode(factor[1][1], variable)
    || typeof factor[2] !== 'number'
    || !Number.isInteger(factor[2])
  ) {
    return undefined;
  }
  return factor[2] >= 1 && factor[2] <= LOG_POWER_BY_PARTS_CAP ? factor[2] : undefined;
}

function findPolynomialTimesLogPower(node: unknown, variable: string) {
  const factors = flattenMultiply(node);
  for (let index = 0; index < factors.length; index += 1) {
    const power = logPowerFactor(factors[index], variable);
    if (power === undefined) {
      continue;
    }

    const polynomial = parseExactPolynomial(
      productWithoutSelectedFactor(factors, index),
      variable,
      LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP,
    );
    if (
      !polynomial
      || exactPolynomialIsZero(polynomial)
      || exactPolynomialDegree(polynomial) > LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP
    ) {
      return undefined;
    }
    return { polynomial, power };
  }
  return undefined;
}

function addTerm(terms: unknown[], coefficient: ExactScalar, factors: unknown[]) {
  if (exactScalarIsZero(coefficient)) {
    return;
  }
  terms.push(multiplyNodeFactors([
    buildExactScalarNode(coefficient),
    ...factors,
  ]));
}

function integrateMonomialTimesLogPower(
  variable: string,
  monomialDegree: number,
  coefficient: ExactScalar,
  logPower: number,
) {
  const integratedPower = monomialDegree + 1;
  const k = exactScalarFromInteger(integratedPower);
  const terms: unknown[] = [];
  for (let step = 0; step <= logPower; step += 1) {
    const sign = step % 2 === 0 ? 1 : -1;
    const numerator = exactScalarFactorial(logPower);
    const denominatorFactorial = exactScalarFactorial(logPower - step);
    const factorialRatio = divideExactScalars(numerator, denominatorFactorial);
    const powerDenominator = exactScalarPower(k, step + 1);
    if (!factorialRatio) {
      return undefined;
    }
    const baseCoefficient = divideExactScalars(
      multiplyExactScalars(coefficient, factorialRatio),
      powerDenominator,
    );
    if (!baseCoefficient) {
      return undefined;
    }
    const signedCoefficient = sign === 1
      ? baseCoefficient
      : { numerator: -baseCoefficient.numerator, denominator: baseCoefficient.denominator };
    const remainingLogPower = logPower - step;
    addTerm(terms, signedCoefficient, [
      exactPowerNode(variable, integratedPower),
      ...(remainingLogPower === 0
        ? []
        : [exactPowerNode(['Ln', variable], remainingLogPower)]),
    ]);
  }
  return terms;
}

function integratePolynomialTimesLogPower(polynomial: ExactPolynomial, power: number) {
  const terms: unknown[] = [];
  for (let degree = 0; degree <= exactPolynomialDegree(polynomial); degree += 1) {
    const coefficient = getExactPolynomialCoefficient(polynomial, degree);
    if (exactScalarIsZero(coefficient)) {
      continue;
    }
    const monomialTerms = integrateMonomialTimesLogPower(
      polynomial.variable,
      degree,
      coefficient,
      power,
    );
    if (!monomialTerms) {
      return undefined;
    }
    terms.push(...monomialTerms);
  }
  return terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function tryPolynomialLogPowerByPartsRule(
  node: unknown,
  variable: string,
): TrigIbpFormalResult | undefined {
  const product = findPolynomialTimesLogPower(node, variable);
  if (!product) {
    return undefined;
  }
  const antiderivativeNode = integratePolynomialTimesLogPower(product.polynomial, product.power);
  if (!antiderivativeNode) {
    return undefined;
  }
  const verification = verifiedAstResult(
    node,
    variable,
    antiderivativeNode,
    'verified by bounded polynomial-times-log-power integration-by-parts after derivative backcheck',
  );
  if (!verification) {
    return undefined;
  }
  return {
    exactLatex: boxLatex(antiderivativeNode),
    antiderivativeNode,
    verification,
    exactSupplementLatex: exactSupplementLatex([exactFact(variable, '>0')]),
    detailSections: [byPartsDetail('Integration By Parts', [
      integrationMathRow('Polynomial factor: ', exactPolynomialToLatex(product.polynomial), '.'),
      integrationMathRow('Logarithmic power: ', `\\ln(${variable})^${product.power}`, '.'),
      integrationTextRow('Repeated integration by parts is capped to textbook-sized polynomial/log powers.'),
      integrationTextRow('Accepted only after derivative backcheck against the original integrand.'),
    ])],
    trustMode: 'precomputed-exact',
  };
}

function squaredTrigFactor(factor: unknown, head: 'Sin' | 'Sec' | 'Csc') {
  return isNodeArray(factor)
    && factor[0] === 'Power'
    && factor.length === 3
    && factor[2] === 2
    && isNodeArray(factor[1])
    && factor[1][0] === head
    && factor[1].length === 2
    ? factor[1][1]
    : undefined;
}

function trigFunctionFactor(factor: unknown, head: 'Sin' | 'Cos', argument: unknown) {
  return isNodeArray(factor)
    && factor[0] === head
    && factor.length === 2
    && sameNode(factor[1], argument);
}

function findLinearVariableTimesTrig(node: unknown, variable: string) {
  const factors = flattenMultiply(node);
  const variableIndex = factors.findIndex((factor) => sameNode(factor, variable));
  if (variableIndex < 0) {
    return undefined;
  }

  const rest = factors.filter((_, index) => index !== variableIndex);
  if (rest.length === 1) {
    const sinSquaredArgument = squaredTrigFactor(rest[0], 'Sin');
    if (sinSquaredArgument && sameNode(sinSquaredArgument, variable)) {
      return { kind: 'x-sin-squared' as const };
    }
  }

  if (
    rest.length === 2
    && (
      (trigFunctionFactor(rest[0], 'Sin', variable) && trigFunctionFactor(rest[1], 'Cos', variable))
      || (trigFunctionFactor(rest[0], 'Cos', variable) && trigFunctionFactor(rest[1], 'Sin', variable))
    )
  ) {
    return { kind: 'x-sin-cos' as const };
  }

  return undefined;
}

function tryLinearVariableTrigProductByPartsRule(
  node: unknown,
  variable: string,
): TrigIbpFormalResult | undefined {
  const product = findLinearVariableTimesTrig(node, variable);
  if (!product) {
    return undefined;
  }

  const doubled = () => ['Multiply', 2, variable];
  const antiderivativeNode = product.kind === 'x-sin-squared'
    ? ['Add',
        ['Divide', ['Power', variable, 2], 4],
        ['Negate', ['Divide', ['Multiply', variable, ['Sin', doubled()]], 4]],
        ['Negate', ['Divide', ['Cos', doubled()], 8]],
      ]
    : ['Add',
        ['Negate', ['Divide', ['Multiply', variable, ['Cos', doubled()]], 4]],
        ['Divide', ['Sin', doubled()], 8],
      ];
  const verification = verifiedAstResult(
    node,
    variable,
    antiderivativeNode,
    'verified by bounded trig product identity plus integration by parts',
  );
  if (!verification) {
    return undefined;
  }

  return {
    exactLatex: boxLatex(antiderivativeNode),
    antiderivativeNode,
    verification,
    detailSections: [byPartsDetail('Integration By Parts', [
      integrationMathRow('Recognized product: ', product.kind === 'x-sin-squared'
        ? `${variable}\\sin^2(${variable})`
        : `${variable}\\sin(${variable})\\cos(${variable})`, '.'),
      integrationTextRow('Used a bounded double-angle rewrite before integration by parts.'),
      integrationTextRow('Accepted only after derivative backcheck against the original integrand.'),
    ])],
    trustMode: 'precomputed-exact',
  };
}

function findSecCscSquareProduct(node: unknown, variable: string) {
  const factors = flattenMultiply(node);
  let secArgument: unknown;
  let cscArgument: unknown;
  const rest: unknown[] = [];
  for (const factor of factors) {
    const sec = squaredTrigFactor(factor, 'Sec');
    if (sec !== undefined && secArgument === undefined) {
      secArgument = sec;
      continue;
    }
    const csc = squaredTrigFactor(factor, 'Csc');
    if (csc !== undefined && cscArgument === undefined) {
      cscArgument = csc;
      continue;
    }
    rest.push(factor);
  }
  if (rest.length > 0 || secArgument === undefined || cscArgument === undefined || !sameNode(secArgument, cscArgument)) {
    return undefined;
  }
  const affine = parseExactAffineArgument(secArgument, variable);
  return affine ? { argument: secArgument, affine } : undefined;
}

function trySecCscSquareIdentityRule(
  node: unknown,
  variable: string,
): TrigIbpFormalResult | undefined {
  const product = findSecCscSquareProduct(node, variable);
  if (!product) {
    return undefined;
  }
  const coefficient = divideExactScalars({ numerator: -2, denominator: 1 }, product.affine.slope);
  if (!coefficient) {
    return undefined;
  }
  const doubledArgument = ['Multiply', 2, structuredClone(product.affine.node)];
  const antiderivativeNode = ['Multiply', buildExactScalarNode(coefficient), ['Cot', doubledArgument]];
  const verification = verifiedAstResult(
    node,
    variable,
    antiderivativeNode,
    'verified by sec^2(u)csc^2(u)=4csc^2(2u) plus derivative backcheck',
  );
  if (!verification) {
    return undefined;
  }
  return {
    exactLatex: `${boxLatex(buildExactScalarNode(coefficient))}\\cot(${boxLatex(doubledArgument)})`,
    antiderivativeNode,
    verification,
    exactSupplementLatex: exactSupplementLatex([
      exactFact(boxLatex(buildExactScalarNode(product.affine.slope)), '\\ne0'),
      exactFact(`\\sin(${product.affine.latex})`, '\\ne0'),
      exactFact(`\\cos(${product.affine.latex})`, '\\ne0'),
    ]),
    detailSections: [byPartsDetail('Integration Trig Identity', [
      integrationMathRow('Recognized product: ', String.raw`\sec^2(u)\csc^2(u)`, '.'),
      integrationMathRow('Identity used: ', String.raw`\sec^2(u)\csc^2(u)=4\csc^2(2u)`, '.'),
      integrationMathRow('Affine argument: ', product.affine.latex, '.'),
      integrationTextRow('Accepted only after derivative backcheck against the original integrand.'),
    ])],
    trustMode: 'precomputed-exact',
  };
}

function safeFormalName(name: unknown) {
  return typeof name === 'string'
    && FORMAL_FUNCTION_NAME.test(name)
    && !KNOWN_MATH_HEADS.has(name)
    ? name
    : undefined;
}

function formalApplication(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Apply'
    && node.length === 3
    && safeFormalName(node[1])
    && sameNode(node[2], variable)
  ) {
    return { name: node[1] as string, node: ['Apply', node[1], variable] };
  }
  if (
    isNodeArray(node)
    && node.length === 2
    && safeFormalName(node[0])
    && sameNode(node[1], variable)
  ) {
    return { name: node[0] as string, node: ['Apply', node[0], variable] };
  }
  return undefined;
}

function formalDerivative(node: unknown, application: { name: string; node: unknown }, variable: string) {
  if (
    isNodeArray(node)
    && (node[0] === 'D' || node[0] === 'Derivative')
    && node.length === 3
    && sameNode(node[2], variable)
  ) {
    const differentiated = formalApplication(node[1], variable);
    return differentiated?.name === application.name;
  }
  if (
    isNodeArray(node)
    && node[0] === 'Apply'
    && node.length === 3
    && sameNode(node[2], variable)
    && isNodeArray(node[1])
    && node[1][0] === 'Derivative'
    && node[1].length === 2
    && node[1][1] === application.name
  ) {
    return true;
  }
  return false;
}

function findFormalFunctionProduct(node: unknown, variable: string) {
  if (isNodeArray(node) && node[0] === 'Tuple' && node.length === 4) {
    const name = safeFormalName(node[1]);
    if (name && sameNode(node[2], variable)) {
      const application = { name, node: ['Apply', name, variable] };
      return formalDerivative(node[3], application, variable) ? application : undefined;
    }
  }
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }
  const factors = flattenMultiply(node);
  if (factors.length !== 2) {
    return undefined;
  }
  const leftApplication = formalApplication(factors[0], variable);
  if (leftApplication && formalDerivative(factors[1], leftApplication, variable)) {
    return leftApplication;
  }
  const rightApplication = formalApplication(factors[1], variable);
  if (rightApplication && formalDerivative(factors[0], rightApplication, variable)) {
    return rightApplication;
  }
  return undefined;
}

function tryFormalFunctionProductRule(
  node: unknown,
  variable: string,
): TrigIbpFormalResult | undefined {
  const application = findFormalFunctionProduct(node, variable);
  if (!application) {
    return undefined;
  }
  const antiderivativeNode = ['Divide', ['Power', application.node, 2], 2];
  return {
    exactLatex: boxLatex(antiderivativeNode),
    antiderivativeNode,
    verification: {
      status: 'verified-exact',
      reason: 'verified by formal product identity d(f(x)^2/2)=f(x)f\\prime(x)',
    },
    detailSections: [byPartsDetail('Integration Formal Function Rule', [
      integrationMathRow('Recognized product: ', `${application.name}(x)${application.name}'(x)`, '.'),
      integrationTextRow('Formal function identity is accepted only for one function and its matching derivative.'),
    ])],
    trustMode: 'precomputed-exact',
  };
}

export function tryTrigIbpFormalRule(
  node: unknown,
  variable: string,
): TrigIbpFormalResult | undefined {
  return tryLinearVariableTrigProductByPartsRule(node, variable)
    ?? trySecCscSquareIdentityRule(node, variable)
    ?? tryPolynomialLogPowerByPartsRule(node, variable)
    ?? tryFormalFunctionProductRule(node, variable);
}
