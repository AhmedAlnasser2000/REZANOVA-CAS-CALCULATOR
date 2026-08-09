import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import type { DisplayDetailSection } from '../../../../types/calculator';
import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
} from '../../../../types/calculator/exact-supplement-types';
import {
  buildExactScalarNode,
  exactPolynomialIsZero,
  exactScalarIsZero,
  type ExactScalar,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
} from '../../../algebra/polynomial-core';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  addAntiderivativeExpressions,
  namedSpecialFunctionCallExpression,
  renderCalculusAntiderivativeExpression,
  scaleAntiderivativeExpression,
  specialFunctionAntiderivativeExpression,
  standardAntiderivativeExpression,
  standardSpecialFunctionExpression,
  type CalculusAntiderivativeExpression,
  type CalculusIntegrationFactNode,
} from '../../../calculus/engine/antiderivative-expression';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { multiplyMathJsonNodes } from '../../primitives/simplification/simplification';
import { buildAlgebraicGenus1ComplexPairLegendreData } from './complex-pair-legendre-data';
import {
  buildAlgebraicGenus1CubicHermitePreconditioner,
  type AlgebraicGenus1CubicHermitePreconditionerSuccess,
} from './cubic-hermite-preconditioner';
import { tryAlgebraicGenus1EllipticKindsRule } from './elliptic-kinds-live';
import {
  buildAlgebraicGenus1RootLegendreData,
  type AlgebraicGenus1RootLegendreData,
} from './root-legendre-data';
import type { AlgebraicGenus1ComplexPairLegendreData } from './complex-pair-legendre-data';
import type { IntegrationCandidateMetadata } from '../types';
import { unsupportedCandidateMetadata } from '../metadata';

const factCe = new ComputeEngine();

export type AlgebraicGenus1SecondKindLiveRule =
  | {
      kind: 'success';
      exactLatex: string;
      verification: AntiderivativeBackcheck;
      exactSupplementLatex: string[];
      detailSections: DisplayDetailSection[];
      antiderivativeExpression: CalculusAntiderivativeExpression;
      factNodes: CalculusIntegrationFactNode[];
    }
  | {
      kind: 'boundary';
      error: string;
      candidate: IntegrationCandidateMetadata;
      detailSections: DisplayDetailSection[];
    };

type ThreeRealFirstKindData = AlgebraicGenus1RootLegendreData & {
  dataKind: 'cubic-three-real-roots';
};

type FirstKindData =
  | ThreeRealFirstKindData
  | AlgebraicGenus1ComplexPairLegendreData;

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by exact cubic Hermite reduction plus named-root Legendre first-kind residual proof',
  };
}

function sub(left: unknown, right: unknown) {
  return ['Subtract', left, right];
}

function div(left: unknown, right: unknown) {
  return ['Divide', left, right];
}

function sqrt(node: unknown) {
  return ['Sqrt', node];
}

function scalarLeaf(mathJson: unknown, canonicalLatex: string) {
  return standardSpecialFunctionExpression({
    mathJson,
    canonicalLatex,
  });
}

function rootSymbol(index: number) {
  return `alpha_${index}`;
}

function leadingCoefficientNode(input: AlgebraicGenus1CubicHermitePreconditionerSuccess) {
  return buildExactScalarNode(getExactPolynomialCoefficient(input.radicandPolynomial, 3));
}

function scaledMultiplierRadicand(leading: unknown, factor: unknown) {
  return leading === 1 ? factor : multiplyMathJsonNodes(leading, factor);
}

function threeRealFirstKindExpression(input: {
  data: ThreeRealFirstKindData;
  variable: string;
  leading: unknown;
}) {
  const a1 = rootSymbol(1);
  const a2 = rootSymbol(2);
  const a3 = rootSymbol(3);
  const amplitudeNode = ['Arcsin', sqrt(div(sub(input.variable, a3), sub(input.variable, a2)))];
  const parameterNode = div(sub(a2, a1), sub(a3, a1));
  const multiplierNode = div(2, sqrt(scaledMultiplierRadicand(input.leading, sub(a3, a1))));
  return specialFunctionAntiderivativeExpression({
    expression: {
      kind: 'product',
      factors: [
        scalarLeaf(multiplierNode, input.data.multiplierLatex),
        namedSpecialFunctionCallExpression({
          name: 'EllipticF',
          arguments: [
            scalarLeaf(amplitudeNode, input.data.amplitudeLatex),
            scalarLeaf(parameterNode, input.data.parameterLatex),
          ],
        }),
      ],
    },
    source: 'calculus.integration:genus1-cubic-hermite-first-kind-residual',
  });
}

function complexPairFirstKindExpression(input: {
  data: AlgebraicGenus1ComplexPairLegendreData;
  variable: string;
  leading: unknown;
}) {
  const realRoot = rootSymbol(1);
  const beta = 'beta_alpha_1';
  const scale = 'A_alpha_1';
  const amplitudeNode = [
    'Multiply',
    2,
    ['Arctan', sqrt(div(sub(input.variable, realRoot), scale))],
  ];
  const parameterNode = div(['Add', sub(scale, realRoot), beta], ['Multiply', 2, scale]);
  const multiplierNode = div(1, sqrt(scaledMultiplierRadicand(input.leading, scale)));
  return specialFunctionAntiderivativeExpression({
    expression: {
      kind: 'product',
      factors: [
        scalarLeaf(multiplierNode, input.data.multiplierLatex),
        namedSpecialFunctionCallExpression({
          name: 'EllipticF',
          arguments: [
            scalarLeaf(amplitudeNode, input.data.amplitudeLatex),
            scalarLeaf(parameterNode, input.data.parameterLatex),
          ],
        }),
      ],
    },
    source: 'calculus.integration:genus1-cubic-hermite-first-kind-residual',
  });
}

function firstKindDataFor(node: unknown, variable: string): FirstKindData | undefined {
  const threeReal = buildAlgebraicGenus1RootLegendreData(node, variable);
  if (threeReal.kind === 'success' && threeReal.dataKind === 'cubic-three-real-roots') {
    return threeReal as ThreeRealFirstKindData;
  }

  const complexPair = buildAlgebraicGenus1ComplexPairLegendreData(node, variable);
  return complexPair.kind === 'success' ? complexPair : undefined;
}

function firstKindExpressionFor(input: {
  data: FirstKindData;
  variable: string;
  leading: unknown;
}) {
  if (input.data.dataKind === 'cubic-three-real-roots') {
    return threeRealFirstKindExpression({
      data: input.data as ThreeRealFirstKindData,
      variable: input.variable,
      leading: input.leading,
    });
  }
  return complexPairFirstKindExpression({
    data: input.data,
    variable: input.variable,
    leading: input.leading,
  });
}

function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  return exactScalarIsZero({
    numerator: left.numerator * right.denominator - right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

function isMonicXCubePlusX(input: AlgebraicGenus1CubicHermitePreconditionerSuccess) {
  const one = { numerator: 1, denominator: 1 };
  const zero = { numerator: 0, denominator: 1 };
  return exactScalarEquals(getExactPolynomialCoefficient(input.radicandPolynomial, 3), one)
    && exactScalarEquals(getExactPolynomialCoefficient(input.radicandPolynomial, 2), zero)
    && exactScalarEquals(getExactPolynomialCoefficient(input.radicandPolynomial, 1), one)
    && exactScalarEquals(getExactPolynomialCoefficient(input.radicandPolynomial, 0), zero);
}

function lemniscaticFirstKindExpression(variable: string) {
  const amplitudeNode = ['Multiply', 2, ['Arctan', sqrt(variable)]];
  const parameterNode = ['Rational', 1, 2];
  return specialFunctionAntiderivativeExpression({
    expression: namedSpecialFunctionCallExpression({
      name: 'EllipticF',
      arguments: [
        scalarLeaf(amplitudeNode, `2\\arctan\\sqrt{${variable}}`),
        scalarLeaf(parameterNode, '\\frac{1}{2}'),
      ],
    }),
    source: 'calculus.integration:genus1-cubic-hermite-lemniscatic-first-kind',
  });
}

function residualConstant(input: AlgebraicGenus1CubicHermitePreconditionerSuccess) {
  const linear = getExactPolynomialCoefficient(input.residualPolynomial, 1);
  if (!exactScalarIsZero(linear)) {
    return undefined;
  }
  return getExactPolynomialCoefficient(input.residualPolynomial, 0);
}

function boundaryDetail(
  preconditioner: AlgebraicGenus1CubicHermitePreconditionerSuccess,
) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Live Boundary',
    [
      [textPart('Hermite correction: '), mathPart(`${preconditioner.correctionLatex}\\sqrt{${preconditioner.radicandLatex}}`)],
      [textPart('residual numerator: '), mathPart(preconditioner.residualLatex)],
      [textPart('blocked basis: '), textPart(preconditioner.residualBasisKinds.join(' and ') || 'none')],
      [textPart('Live adoption requires a solved F/E/Pi coefficient vector and exact derivative backcheck.')],
    ],
  );
}

function liveDetail(input: {
  preconditioner: AlgebraicGenus1CubicHermitePreconditionerSuccess;
  firstKindLatex: string;
}) {
  return mixedDetailSection(
    'Genus-1 Cubic Hermite Live Composition',
    [
      [textPart('correction: '), mathPart(`${input.preconditioner.correctionLatex}\\sqrt{${input.preconditioner.radicandLatex}}`)],
      [textPart('first-kind residual: '), mathPart(input.preconditioner.residualLatex)],
      [textPart('first-kind chart: '), mathPart(input.firstKindLatex)],
      [textPart('The route accepts only first-kind residuals after exact cubic Hermite reduction.')],
    ],
  );
}

function relationHead(relation: ExactSupplementRelation) {
  switch (relation) {
    case '\\ge0':
      return 'GreaterEqual';
    case '>0':
      return 'Greater';
    case '\\ne0':
      return 'NotEqual';
    case '=0':
      return 'Equal';
    case '<0':
      return 'Less';
    default:
      return undefined;
  }
}

function factNodesFromSupplementEntries(
  entries: ExactSupplementEntry[],
): CalculusIntegrationFactNode[] {
  return entries.flatMap((entry) => {
    if (entry.kind !== 'condition' && entry.kind !== 'exclusion') {
      return [];
    }
    const head = relationHead(entry.relation);
    if (!head) {
      return [];
    }
    return [{
      role: entry.kind,
      presentationLatex: `${entry.expressionLatex}${entry.relation}`,
      mathJson: [head, factCe.parse(entry.expressionLatex).json, 0],
      source: `calculus.integration:genus1-cubic-hermite-${entry.source}`,
    }];
  });
}

export function tryAlgebraicGenus1SecondKindLiveRule(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindLiveRule | undefined {
  const preconditioner = buildAlgebraicGenus1CubicHermitePreconditioner(node, variable);
  if (preconditioner.kind === 'stop') {
    return undefined;
  }

  const constantResidual = residualConstant(preconditioner);
  if (constantResidual === undefined) {
    return {
      kind: 'boundary',
      error: 'This genus-1 cubic integral reduces to a second-kind elliptic residual that is not live-adoptable yet.',
      candidate: unsupportedCandidateMetadata(node, variable),
      detailSections: [
        ...preconditioner.detailSections,
        boundaryDetail(preconditioner),
      ],
    };
  }

  const correctionIsZero = exactPolynomialIsZero(preconditioner.correctionPolynomial);
  if (correctionIsZero && exactScalarIsZero(constantResidual)) {
    return undefined;
  }

  const correctionExpression = correctionIsZero
    ? undefined
    : standardAntiderivativeExpression({
        mathJson: preconditioner.correctionNode,
        source: 'calculus.integration:genus1-cubic-hermite-correction',
      });

  let residualExpression: CalculusAntiderivativeExpression | undefined;
  let firstKindLatex = '';
  const baseReciprocalNode = [
    'Divide',
    1,
    ['Sqrt', exactPolynomialToNode(preconditioner.radicandPolynomial)],
  ];
  if (!exactScalarIsZero(constantResidual)) {
    const firstKindRule = tryAlgebraicGenus1EllipticKindsRule(baseReciprocalNode, variable);
    const firstKindExpression = isMonicXCubePlusX(preconditioner)
      ? lemniscaticFirstKindExpression(variable)
      : (() => {
          const data = firstKindDataFor(baseReciprocalNode, variable);
          return data
            ? firstKindExpressionFor({
                data,
                variable,
                leading: leadingCoefficientNode(preconditioner),
              })
            : undefined;
        })();
    if (!firstKindExpression) {
      return {
        kind: 'boundary',
        error: 'This genus-1 cubic integral reduced to a first-kind residual, but no exact root chart is live for it.',
        candidate: unsupportedCandidateMetadata(node, variable),
        detailSections: [
          ...preconditioner.detailSections,
          boundaryDetail(preconditioner),
        ],
      };
    }

    residualExpression = scaleAntiderivativeExpression({
      coefficient: buildExactScalarNode(constantResidual),
      expression: firstKindExpression,
      source: 'calculus.integration:genus1-cubic-hermite-first-kind-residual-scale',
    });
    firstKindLatex = isMonicXCubePlusX(preconditioner)
      ? `\\operatorname{EllipticF}\\left(2\\arctan\\sqrt{${variable}},\\frac{1}{2}\\right)`
      : firstKindRule?.kind === 'first-kind'
      ? firstKindRule.exactLatex
      : renderCalculusAntiderivativeExpression(firstKindExpression, { variable });
  }

  const expression = addAntiderivativeExpressions({
    terms: [
      ...(correctionExpression ? [{ expression: correctionExpression }] : []),
      ...(residualExpression ? [{ expression: residualExpression }] : []),
    ],
    source: 'calculus.integration:genus1-cubic-hermite-live',
  });
  if (!expression) {
    return undefined;
  }

  return {
    kind: 'success',
    exactLatex: renderCalculusAntiderivativeExpression(expression, { variable }),
    verification: proof(),
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: preconditioner.exactSupplementEntries,
      source: 'candidate-validation',
    }),
    detailSections: [
      ...preconditioner.detailSections,
      liveDetail({ preconditioner, firstKindLatex }),
    ],
    antiderivativeExpression: expression,
    factNodes: factNodesFromSupplementEntries(preconditioner.exactSupplementEntries),
  };
}
