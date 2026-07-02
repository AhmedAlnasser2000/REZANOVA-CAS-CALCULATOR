import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { multiplyMathJsonNodes } from '../../primitives/simplification/simplification';
import {
  buildAlgebraicGenus1DegenerationFacts,
  type AlgebraicGenus1DegenerationFactResult,
} from './degeneration-facts';
import { ellipticFunctionCallLatex, type EllipticFunctionHead } from './elliptic-functions';
import {
  buildAlgebraicGenus1NamedRootReadback,
  type AlgebraicGenus1NamedRootReadbackDetail,
  type AlgebraicGenus1NamedRootReadbackResult,
} from './named-root-readback';

export type AlgebraicGenus1NormalFormKind =
  | 'legendre-first-kind'
  | 'legendre-second-kind'
  | 'legendre-third-kind'
  | 'root-based-readiness'
  | 'symbolic-generic-readiness';

export type AlgebraicGenus1LegendreData = {
  head: EllipticFunctionHead;
  amplitudeNode: unknown;
  amplitudeLatex: string;
  parameterNode: unknown;
  parameterLatex: string;
  characteristicNode?: unknown;
  characteristicLatex?: string;
  multiplierNode: unknown;
  multiplierLatex: string;
  inverseMapLatex: string;
  prototypeAntiderivativeNode: unknown;
  prototypeAntiderivativeLatex: string;
};

export type AlgebraicGenus1NormalFormResult =
  | {
      kind: 'success';
      variable: string;
      normalFormKind: AlgebraicGenus1NormalFormKind;
      legendreData?: AlgebraicGenus1LegendreData;
      exactSupplementEntries: ExactSupplementEntry[];
      detailSections: AlgebraicGenus1NamedRootReadbackDetail[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'degeneration-stop'
        | 'named-root-stop'
        | 'not-genus1-candidate'
        | 'unsupported-normal-form';
      degeneration?: AlgebraicGenus1DegenerationFactResult;
      namedRootReadback?: AlgebraicGenus1NamedRootReadbackResult;
      detail?: string;
    };

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

function isExactOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function isVariableSquared(node: unknown, variable: string) {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && node[2] === 2;
}

function scaledVariableSquareCoefficient(node: unknown, variable: string) {
  if (isVariableSquared(node, variable)) {
    return 1;
  }

  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const coefficientFactors: unknown[] = [];
  let squareCount = 0;

  for (const factor of factors) {
    if (isVariableSquared(factor, variable)) {
      squareCount += 1;
      continue;
    }
    if (dependsOnVariable(factor, variable)) {
      return undefined;
    }
    coefficientFactors.push(factor);
  }

  if (squareCount !== 1) {
    return undefined;
  }
  return coefficientFactors.length === 0
    ? 1
    : multiplyMathJsonNodes(...coefficientFactors);
}

function unitMinusScaledSquareParameter(node: unknown, variable: string) {
  const terms = signedAddTerms(node);
  if (terms.length !== 2) {
    return undefined;
  }

  const constant = terms.find((term) => term.sign === 1 && isExactOne(term.node));
  const squareTerm = terms.find((term) => term !== constant);
  if (!constant || !squareTerm || squareTerm.sign !== -1) {
    return undefined;
  }

  return scaledVariableSquareCoefficient(squareTerm.node, variable);
}

function divideParts(node: unknown) {
  return isNodeArray(node) && node[0] === 'Divide' && node.length === 3
    ? { numerator: node[1], denominator: node[2] }
    : undefined;
}

function sqrtBody(node: unknown) {
  return isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2
    ? node[1]
    : undefined;
}

function productFactors(node: unknown) {
  return isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
}

function unitMinusPairFromProduct(node: unknown, variable: string) {
  const factors = productFactors(node);
  if (factors.length !== 2) {
    return undefined;
  }

  const parameters = factors.map((factor) => unitMinusScaledSquareParameter(factor, variable));
  if (parameters.some((parameter) => parameter === undefined)) {
    return undefined;
  }
  const [left, right] = parameters as [unknown, unknown];
  if (isExactOne(left)) {
    return { baseFactor: factors[0], parameterFactor: factors[1], parameter: right };
  }
  if (isExactOne(right)) {
    return { baseFactor: factors[1], parameterFactor: factors[0], parameter: left };
  }
  return undefined;
}

function reciprocalSqrtProduct(node: unknown) {
  const body = sqrtBody(node);
  const bodyDivide = body ? divideParts(body) : undefined;
  if (bodyDivide && isExactOne(bodyDivide.numerator)) {
    return bodyDivide.denominator;
  }

  const outerDivide = divideParts(node);
  if (outerDivide && isExactOne(outerDivide.numerator)) {
    return sqrtBody(outerDivide.denominator);
  }

  return undefined;
}

function legendreTemplateFacts(input: {
  variable: string;
  parameterNode: unknown;
  characteristicNode?: unknown;
}) {
  const facts: ExactSupplementEntry[] = [
    {
      kind: 'condition',
      expressionLatex: `1-${input.variable}^2`,
      relation: '\\ge0',
      source: 'radical-domain',
    },
    {
      kind: 'condition',
      expressionLatex: `1-${boxLatex(input.parameterNode)}${input.variable}^2`,
      relation: '\\ge0',
      source: 'radical-domain',
    },
  ];

  if (input.characteristicNode !== undefined) {
    facts.push({
      kind: 'exclusion',
      expressionLatex: `1-${boxLatex(input.characteristicNode)}${input.variable}^2`,
      relation: '\\ne0',
      source: 'denominator',
    });
  }

  return facts;
}

function legendreData(input: {
  head: EllipticFunctionHead;
  variable: string;
  parameterNode: unknown;
  characteristicNode?: unknown;
}): AlgebraicGenus1LegendreData {
  const amplitudeNode = ['Arcsin', input.variable];
  const args = input.head === 'EllipticPi'
    ? [input.characteristicNode, amplitudeNode, input.parameterNode]
    : [amplitudeNode, input.parameterNode];
  return {
    head: input.head,
    amplitudeNode,
    amplitudeLatex: boxLatex(amplitudeNode),
    parameterNode: input.parameterNode,
    parameterLatex: boxLatex(input.parameterNode),
    characteristicNode: input.characteristicNode,
    characteristicLatex: input.characteristicNode === undefined ? undefined : boxLatex(input.characteristicNode),
    multiplierNode: 1,
    multiplierLatex: '1',
    inverseMapLatex: `${input.variable}=\\sin\\phi`,
    prototypeAntiderivativeNode: [input.head, ...args],
    prototypeAntiderivativeLatex: ellipticFunctionCallLatex(input.head, args),
  };
}

function legendreSuccess(input: {
  variable: string;
  normalFormKind: AlgebraicGenus1NormalFormKind;
  head: EllipticFunctionHead;
  parameterNode: unknown;
  characteristicNode?: unknown;
}) {
  const data = legendreData(input);
  return {
    kind: 'success' as const,
    variable: input.variable,
    normalFormKind: input.normalFormKind,
    legendreData: data,
    exactSupplementEntries: legendreTemplateFacts({
      variable: input.variable,
      parameterNode: input.parameterNode,
      characteristicNode: input.characteristicNode,
    }),
    detailSections: [
      {
        title: 'Legendre Normal Form',
        lines: [
          `\\phi=${data.amplitudeLatex}`,
          `m=${data.parameterLatex}`,
          ...(data.characteristicLatex ? [`n=${data.characteristicLatex}`] : []),
          `${data.inverseMapLatex}`,
        ],
      },
    ],
    readinessNotes: [
      'Canonical Legendre data is behavior-invisible evidence for the later elliptic live route.',
      'The prototype answer is not adopted until elliptic basis proof/backcheck gates are live.',
    ],
  };
}

function firstKindTemplate(node: unknown, variable: string) {
  const product = reciprocalSqrtProduct(node);
  if (!product) {
    return undefined;
  }
  const pair = unitMinusPairFromProduct(product, variable);
  return pair
    ? legendreSuccess({
        variable,
        normalFormKind: 'legendre-first-kind',
        head: 'EllipticF',
        parameterNode: pair.parameter,
      })
    : undefined;
}

function secondKindTemplate(node: unknown, variable: string) {
  const body = sqrtBody(node);
  const fraction = body ? divideParts(body) : undefined;
  if (!fraction) {
    return undefined;
  }

  const numeratorParameter = unitMinusScaledSquareParameter(fraction.numerator, variable);
  const denominatorParameter = unitMinusScaledSquareParameter(fraction.denominator, variable);
  if (numeratorParameter === undefined || !isExactOne(denominatorParameter)) {
    return undefined;
  }

  return legendreSuccess({
    variable,
    normalFormKind: 'legendre-second-kind',
    head: 'EllipticE',
    parameterNode: numeratorParameter,
  });
}

function thirdKindTemplate(node: unknown, variable: string) {
  const fraction = divideParts(node);
  if (!fraction || !isExactOne(fraction.numerator)) {
    return undefined;
  }

  const denominatorFactors = productFactors(fraction.denominator);
  if (denominatorFactors.length !== 2) {
    return undefined;
  }

  const sqrtFactorIndex = denominatorFactors.findIndex((factor) => sqrtBody(factor) !== undefined);
  if (sqrtFactorIndex < 0) {
    return undefined;
  }

  const sqrtProduct = sqrtBody(denominatorFactors[sqrtFactorIndex]);
  const characteristicFactor = denominatorFactors[1 - sqrtFactorIndex];
  if (!sqrtProduct) {
    return undefined;
  }

  const pair = unitMinusPairFromProduct(sqrtProduct, variable);
  const characteristic = unitMinusScaledSquareParameter(characteristicFactor, variable);
  if (!pair || characteristic === undefined) {
    return undefined;
  }

  return legendreSuccess({
    variable,
    normalFormKind: 'legendre-third-kind',
    head: 'EllipticPi',
    parameterNode: pair.parameter,
    characteristicNode: characteristic,
  });
}

function symbolicReadiness(
  variable: string,
  degeneration: AlgebraicGenus1DegenerationFactResult,
) {
  if (degeneration.kind !== 'success' || degeneration.classification !== 'generic-squarefree-genus1') {
    return undefined;
  }

  return {
    kind: 'success' as const,
    variable,
    normalFormKind: 'symbolic-generic-readiness' as const,
    exactSupplementEntries: degeneration.exactSupplementEntries,
    detailSections: [
      {
        title: 'Symbolic Genus-1 Readiness',
        lines: [
          `P\\left(${variable}\\right)=${degeneration.radicandLatex}`,
          'Generic symbolic squarefree facts are available for later Legendre normalization.',
        ],
      },
    ],
    readinessNotes: [
      ...degeneration.readinessNotes,
      'Symbolic Legendre data is readiness-only until branch formulas and elliptic proof backcheck are capped.',
    ],
  };
}

function rootBasedReadiness(node: unknown, variable: string) {
  const named = buildAlgebraicGenus1NamedRootReadback(node, variable);
  if (named.kind === 'stop') {
    return {
      kind: 'stop' as const,
      variable,
      reason: 'named-root-stop' as const,
      namedRootReadback: named,
      detail: named.detail,
    };
  }

  return {
    kind: 'success' as const,
    variable,
    normalFormKind: 'root-based-readiness' as const,
    exactSupplementEntries: named.endpointExclusionFacts,
    detailSections: named.detailSections,
    readinessNotes: [
      ...named.readinessNotes,
      'Root-based Legendre substitution data waits for the differential-basis reduction milestone.',
    ],
  };
}

export function buildAlgebraicGenus1NormalForm(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1NormalFormResult {
  const directTemplate =
    firstKindTemplate(node, variable)
    ?? secondKindTemplate(node, variable)
    ?? thirdKindTemplate(node, variable);
  if (directTemplate) {
    return directTemplate;
  }

  const degeneration = buildAlgebraicGenus1DegenerationFacts(node, variable);
  if (degeneration.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'degeneration-stop',
      degeneration,
      detail: degeneration.detail,
    };
  }

  const symbolic = symbolicReadiness(variable, degeneration);
  if (symbolic) {
    return symbolic;
  }

  if (degeneration.classification === 'exact-squarefree-genus1') {
    return rootBasedReadiness(node, variable);
  }

  return {
    kind: 'stop',
    variable,
    reason: 'unsupported-normal-form',
    degeneration,
    detail: 'Only exact squarefree or generic symbolic genus-1 candidates are normal-form-ready in this milestone.',
  };
}
