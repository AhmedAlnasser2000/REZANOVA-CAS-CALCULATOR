import { readExactScalarNode } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  createAlgebraicRootDescriptor,
  algebraicRootLogTermLatex,
  type AlgebraicRootDescriptor,
} from '../../primitives/algebraic-root-descriptor';
import {
  mergeSymbolicCoefficientFacts,
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
} from '../../primitives/coefficient-domain';
import {
  buildSymbolicPolynomialNode,
  derivativeSymbolicPolynomial,
  parseSymbolicPolynomial,
  resultantSymbolicPolynomials,
  squarefreeReadinessSymbolicPolynomial,
  type SymbolicPolynomial,
  type SymbolicPolynomialStopReason,
} from '../../primitives/symbolic-polynomial';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { expandMathJsonNode } from '../../primitives/expansion/expansion';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';

export type RischNormanLrtLogPartStopReason =
  | 'descriptor-stop'
  | 'improper-rational-residual'
  | 'non-squarefree-denominator'
  | 'over-cap-degree'
  | 'parse-stop'
  | 'resultant-stop'
  | 'symbolic-denominator-cap'
  | 'unsupported-denominator';

export type RischNormanLrtLogPartResult =
  | {
    kind: 'success';
    variable: string;
    lambdaVariable: string;
    antiderivativeNode: unknown;
    exactLatex: string;
    resultantLatex: string;
    resultantPolynomial: SymbolicPolynomial;
    rootDescriptor: AlgebraicRootDescriptor;
    definitionsLatex: string[];
    proofEvidence: {
      squarefreeDenominator: true;
      resultantDefinitionLatex: string;
      gcdDefinitionsLatex: string[];
    };
  }
  | {
    kind: 'stop';
    reason: RischNormanLrtLogPartStopReason;
    primitiveReason?: SymbolicPolynomialStopReason | 'degree-cap' | 'constant-polynomial' | 'zero-polynomial';
  };

export type RischNormanLrtRationalIntegrationResult =
  | {
    kind: 'success';
    antiderivativeNode: unknown;
    exactLatex: string;
    verification: AntiderivativeBackcheck;
    exactSupplementLatex: string[];
  }
  | {
    kind: 'stop';
    reason: RischNormanLrtLogPartStopReason | 'non-rational-shape';
  };

export type RischNormanLrtLogPartInput = {
  numerator: unknown;
  denominator: unknown;
  variable: string;
  lambdaVariable?: string;
  maxPolynomialDegree?: number;
  maxDescriptorDegree?: number;
};

const DEFAULT_LRT_POLYNOMIAL_DEGREE_CAP = 8;
const DEFAULT_LRT_DESCRIPTOR_DEGREE_CAP = 6;

type CoefficientNodePolynomial =
  | { kind: 'success'; coefficients: unknown[] }
  | { kind: 'stop'; reason: 'over-cap-degree' | 'selected-variable-dependent-coefficient' };

function polynomialLatex(polynomial: SymbolicPolynomial) {
  return boxLatex(buildSymbolicPolynomialNode(polynomial));
}

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman LRT logarithmic-part rule proof',
  };
}

function containsTargetFreeSymbol(node: unknown, variable: string): boolean {
  if (typeof node === 'string') {
    return node !== variable
      && node !== 'ExponentialE'
      && node !== 'Pi'
      && node !== 'ImaginaryUnit';
  }

  return isNodeArray(node) && node.slice(1).some((child) => containsTargetFreeSymbol(child, variable));
}

function hasSymbolicDenominatorCoefficient(polynomial: SymbolicPolynomial) {
  return polynomial.coefficients.some((coefficient) =>
    containsTargetFreeSymbol(coefficient.node, polynomial.variable));
}

function exactNonnegativeInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 && scalar.numerator >= 0
    ? scalar.numerator
    : undefined;
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function exactZeroNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function zeroArray(length: number) {
  return Array.from({ length }, () => 0 as unknown);
}

function trimCoefficientNodes(coefficients: unknown[]) {
  const trimmed = [...coefficients];
  while (trimmed.length > 1 && exactZeroNode(trimmed[trimmed.length - 1])) {
    trimmed.pop();
  }
  return trimmed;
}

function coefficientNodeDegree(coefficients: unknown[]) {
  return trimCoefficientNodes(coefficients).length - 1;
}

function addCoefficientNodePolynomials(left: unknown[], right: unknown[]) {
  const width = Math.max(left.length, right.length);
  return trimCoefficientNodes(Array.from({ length: width }, (_, index) =>
    addMathJsonNodes(left[index] ?? 0, right[index] ?? 0)));
}

function negateCoefficientNodePolynomial(polynomial: unknown[]) {
  return polynomial.map(negateMathJsonNode);
}

function multiplyCoefficientNodePolynomials(left: unknown[], right: unknown[]) {
  const product = zeroArray(Math.max(1, left.length + right.length - 1));
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      product[leftDegree + rightDegree] = addMathJsonNodes(
        product[leftDegree + rightDegree],
        multiplyMathJsonNodes(leftCoefficient, rightCoefficient),
      );
    });
  });
  return trimCoefficientNodes(product);
}

function monomialCoefficientNodes(degree: number) {
  const coefficients = zeroArray(degree + 1);
  coefficients[degree] = 1;
  return coefficients;
}

function signedTerms(node: unknown, sign: 1 | -1 = 1): Array<{ node: unknown; sign: 1 | -1 }> {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedTerms(term, sign));
  }
  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedTerms(first, sign)),
      ...rest.flatMap((term) => signedTerms(term, sign === 1 ? -1 : 1)),
    ];
  }
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedTerms(node[1], sign === 1 ? -1 : 1);
  }
  return [{ node, sign }];
}

function collectCoefficientNodePolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): CoefficientNodePolynomial {
  if (!dependsOnVariable(node, variable)) {
    return { kind: 'success', coefficients: [node] };
  }
  if (node === variable) {
    return { kind: 'success', coefficients: [0, 1] };
  }
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const power = exactNonnegativeInteger(node[2]);
    if (node[1] === variable && power !== undefined) {
      return power > maxDegree
        ? { kind: 'stop', reason: 'over-cap-degree' }
        : { kind: 'success', coefficients: monomialCoefficientNodes(power) };
    }
    if (power === undefined) {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }
    const base = collectCoefficientNodePolynomial(node[1], variable, maxDegree);
    if (base.kind === 'stop') {
      return base;
    }
    let product: unknown[] = [1];
    for (let index = 0; index < power; index += 1) {
      product = multiplyCoefficientNodePolynomials(product, base.coefficients);
      if (coefficientNodeDegree(product) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
    }
    return { kind: 'success', coefficients: product };
  }
  if (isNodeArray(node) && (node[0] === 'Add' || node[0] === 'Subtract' || node[0] === 'Negate')) {
    let sum: unknown[] = [0];
    for (const term of signedTerms(node)) {
      const collected = collectCoefficientNodePolynomial(term.node, variable, maxDegree);
      if (collected.kind === 'stop') {
        return collected;
      }
      sum = addCoefficientNodePolynomials(
        sum,
        term.sign === 1 ? collected.coefficients : negateCoefficientNodePolynomial(collected.coefficients),
      );
      if (coefficientNodeDegree(sum) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
    }
    return { kind: 'success', coefficients: sum };
  }
  if (isNodeArray(node) && node[0] === 'Multiply') {
    let product: unknown[] = [1];
    for (const factor of flattenMultiply(node)) {
      const collected = collectCoefficientNodePolynomial(factor, variable, maxDegree);
      if (collected.kind === 'stop') {
        return collected;
      }
      product = multiplyCoefficientNodePolynomials(product, collected.coefficients);
      if (coefficientNodeDegree(product) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
    }
    return { kind: 'success', coefficients: product };
  }

  return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
}

function symbolicPolynomialFromCoefficientNodes(
  coefficients: unknown[],
  variable: string,
): { kind: 'success'; polynomial: SymbolicPolynomial } | { kind: 'stop'; reason: SymbolicPolynomialStopReason } {
  const parsedCoefficients: SymbolicCoefficient[] = [];
  const facts: SymbolicCoefficientFact[] = [];
  for (const coefficient of trimCoefficientNodes(coefficients)) {
    const parsed = parseSymbolicCoefficient(coefficient, variable);
    if (parsed.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop' };
    }
    parsedCoefficients.push(parsed.coefficient);
    facts.push(...parsed.coefficient.facts);
  }

  return {
    kind: 'success',
    polynomial: {
      variable,
      degree: parsedCoefficients.length - 1,
      coefficients: parsedCoefficients,
      facts: mergeSymbolicCoefficientFacts(facts),
    },
  };
}

function parseResultantPolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): { kind: 'success'; polynomial: SymbolicPolynomial } | { kind: 'stop'; reason: SymbolicPolynomialStopReason } {
  const collected = collectCoefficientNodePolynomial(node, variable, maxDegree);
  if (collected.kind === 'stop') {
    return { kind: 'stop', reason: collected.reason };
  }
  return symbolicPolynomialFromCoefficientNodes(collected.coefficients, variable);
}

function formalLogArgumentNode(index: number, variable: string) {
  return ['Apply', `S_${index}`, variable];
}

function buildFormalAntiderivativeNode(rootDescriptor: AlgebraicRootDescriptor, variable: string) {
  return rootDescriptor.roots.length === 1
    ? multiplyMathJsonNodes(
      `alpha_${rootDescriptor.roots[0].index}`,
      ['Ln', ['Abs', formalLogArgumentNode(rootDescriptor.roots[0].index, variable)]],
    )
    : [
      'Add',
      ...rootDescriptor.roots.map((root) =>
        multiplyMathJsonNodes(
          `alpha_${root.index}`,
          ['Ln', ['Abs', formalLogArgumentNode(root.index, variable)]],
        )),
    ];
}

function parseRationalIntegrand(node: unknown): { numerator: unknown; denominator: unknown } | undefined {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return { numerator: node[1], denominator: node[2] };
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const power = exactInteger(node[2]);
    if (power === -1) {
      return { numerator: 1, denominator: node[1] };
    }
  }

  return undefined;
}

function stopFromParse(reason: SymbolicPolynomialStopReason): RischNormanLrtLogPartResult {
  return {
    kind: 'stop',
    reason: reason === 'over-cap-degree' ? 'over-cap-degree' : 'parse-stop',
    primitiveReason: reason,
  };
}

function buildResultantInput(input: {
  numerator: SymbolicPolynomial;
  denominatorDerivative: SymbolicPolynomial;
  variable: string;
  lambdaVariable: string;
  maxPolynomialDegree: number;
}) {
  const numeratorNode = buildSymbolicPolynomialNode(input.numerator);
  const derivativeNode = buildSymbolicPolynomialNode(input.denominatorDerivative);
  return parseSymbolicPolynomial(
    subtractMathJsonNodes(
      numeratorNode,
      multiplyMathJsonNodes(input.lambdaVariable, derivativeNode),
    ),
    input.variable,
    input.maxPolynomialDegree,
  );
}

function gcdArgumentLatex(input: {
  rootLatex: string;
  numeratorLatex: string;
  denominatorDerivativeLatex: string;
}) {
  return `${input.numeratorLatex}-${input.rootLatex}${input.denominatorDerivativeLatex}`;
}

export function constructRischNormanLrtLogPart(
  input: RischNormanLrtLogPartInput,
): RischNormanLrtLogPartResult {
  const maxPolynomialDegree = input.maxPolynomialDegree ?? DEFAULT_LRT_POLYNOMIAL_DEGREE_CAP;
  const maxDescriptorDegree = input.maxDescriptorDegree ?? DEFAULT_LRT_DESCRIPTOR_DEGREE_CAP;
  const lambdaVariable = input.lambdaVariable ?? 'lambda';
  const numerator = parseSymbolicPolynomial(input.numerator, input.variable, maxPolynomialDegree);
  if (numerator.kind === 'stop') {
    return stopFromParse(numerator.reason);
  }
  const denominator = parseSymbolicPolynomial(input.denominator, input.variable, maxPolynomialDegree);
  if (denominator.kind === 'stop') {
    return stopFromParse(denominator.reason);
  }
  if (denominator.polynomial.degree < 3) {
    return { kind: 'stop', reason: 'unsupported-denominator' };
  }
  if (denominator.polynomial.degree > 3) {
    return {
      kind: 'stop',
      reason: 'resultant-stop',
      primitiveReason: 'sylvester-dimension-limit',
    };
  }
  if (denominator.polynomial.degree >= 3 && hasSymbolicDenominatorCoefficient(denominator.polynomial)) {
    return { kind: 'stop', reason: 'symbolic-denominator-cap' };
  }
  if (numerator.polynomial.degree >= denominator.polynomial.degree) {
    return { kind: 'stop', reason: 'improper-rational-residual' };
  }

  const squarefree = squarefreeReadinessSymbolicPolynomial(denominator.polynomial, {
    maxDegree: maxPolynomialDegree,
  });
  if (squarefree.kind === 'stop') {
    return { kind: 'stop', reason: 'parse-stop', primitiveReason: squarefree.reason };
  }
  if (!squarefree.squarefree) {
    return { kind: 'stop', reason: 'non-squarefree-denominator' };
  }

  const denominatorDerivative = derivativeSymbolicPolynomial(denominator.polynomial);
  if (denominatorDerivative.kind === 'stop') {
    return { kind: 'stop', reason: 'parse-stop', primitiveReason: denominatorDerivative.reason };
  }

  const resultantInput = buildResultantInput({
    numerator: numerator.polynomial,
    denominatorDerivative: denominatorDerivative.polynomial,
    variable: input.variable,
    lambdaVariable,
    maxPolynomialDegree,
  });
  if (resultantInput.kind === 'stop') {
    return stopFromParse(resultantInput.reason);
  }

  const resultant = resultantSymbolicPolynomials(
    denominator.polynomial,
    resultantInput.polynomial,
    {
      maxDegree: maxPolynomialDegree,
      maxSylvesterDimension: maxDescriptorDegree,
    },
  );
  if (resultant.kind === 'stop') {
    return { kind: 'stop', reason: 'resultant-stop', primitiveReason: resultant.reason };
  }

  const expandedResultant = expandMathJsonNode(resultant.resultant.node, {
    maxPower: maxDescriptorDegree,
    maxExpandedTerms: 96,
    maxNodeCount: 1200,
  });
  if (expandedResultant.kind === 'unsupported') {
    return { kind: 'stop', reason: 'resultant-stop', primitiveReason: 'expansion-limit' };
  }

  const resultantPolynomial = parseResultantPolynomial(
    expandedResultant.node,
    lambdaVariable,
    maxDescriptorDegree,
  );
  if (resultantPolynomial.kind === 'stop') {
    return resultantPolynomial.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree', primitiveReason: resultantPolynomial.reason }
      : { kind: 'stop', reason: 'resultant-stop', primitiveReason: resultantPolynomial.reason };
  }

  const rootDescriptor = createAlgebraicRootDescriptor(resultantPolynomial.polynomial, {
    familyId: 'risch-norman-lrt-log-part',
    maxDegree: maxDescriptorDegree,
    polynomialNameLatex: 'R',
    variableLatex: '\\lambda',
  });
  if (rootDescriptor.kind === 'stop') {
    return { kind: 'stop', reason: 'descriptor-stop', primitiveReason: rootDescriptor.reason };
  }

  const variableLatex = boxLatex(input.variable);
  const numeratorLatex = polynomialLatex(numerator.polynomial);
  const denominatorLatex = polynomialLatex(denominator.polynomial);
  const derivativeLatex = polynomialLatex(denominatorDerivative.polynomial);
  const resultantLatex = polynomialLatex(resultantPolynomial.polynomial);
  const resultantDefinitionLatex =
    `R\\left(\\lambda\\right)=\\operatorname{Res}_{${variableLatex}}\\left(${denominatorLatex},${gcdArgumentLatex({
      rootLatex: '\\lambda',
      numeratorLatex,
      denominatorDerivativeLatex: derivativeLatex,
    })}\\right)=${resultantLatex}`;
  const gcdDefinitionsLatex = rootDescriptor.roots.map((root) =>
    `S_{${root.index}}\\left(${variableLatex}\\right)=\\gcd\\left(${denominatorLatex},${gcdArgumentLatex({
      rootLatex: root.symbolLatex,
      numeratorLatex,
      denominatorDerivativeLatex: derivativeLatex,
    })}\\right)`);
  const exactLatex = rootDescriptor.roots
    .map((root) => algebraicRootLogTermLatex(root, `S_{${root.index}}\\left(${variableLatex}\\right)`))
    .join('+');
  const antiderivativeNode = buildFormalAntiderivativeNode(rootDescriptor, input.variable);

  return {
    kind: 'success',
    variable: input.variable,
    lambdaVariable,
    antiderivativeNode,
    exactLatex,
    resultantLatex,
    resultantPolynomial: resultantPolynomial.polynomial,
    rootDescriptor,
    definitionsLatex: [
      resultantDefinitionLatex,
      ...rootDescriptor.definitionLatex,
      ...gcdDefinitionsLatex,
    ],
    proofEvidence: {
      squarefreeDenominator: true,
      resultantDefinitionLatex,
      gcdDefinitionsLatex,
    },
  };
}

export function tryRischNormanLrtRationalIntegrationRule(
  node: unknown,
  variable: string,
): RischNormanLrtRationalIntegrationResult {
  const parsed = parseRationalIntegrand(node);
  if (!parsed) {
    return { kind: 'stop', reason: 'non-rational-shape' };
  }

  const lrt = constructRischNormanLrtLogPart({
    numerator: parsed.numerator,
    denominator: parsed.denominator,
    variable,
  });
  if (lrt.kind === 'stop') {
    return { kind: 'stop', reason: lrt.reason };
  }

  return {
    kind: 'success',
    antiderivativeNode: lrt.antiderivativeNode,
    exactLatex: lrt.exactLatex,
    verification: proof(),
    exactSupplementLatex: lrt.definitionsLatex,
  };
}
