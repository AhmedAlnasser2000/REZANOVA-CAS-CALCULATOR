import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  buildExactScalarNode,
  divideExactScalars,
  multiplyExactScalars,
  negateExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import { boxLatex, isNodeArray } from '../patterns';
import {
  integrationDetailSection,
  integrationMathRow,
  integrationTextRow,
  type IntegrationDetailRow,
} from './detail-readback';
import { parseExactAffineArgument } from './exact-parts';
import { scaleByExactScalar } from './rational';

type HyperbolicTableResult = {
  antiderivativeNode: unknown;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  detailSections: DisplayDetailSection[];
};

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const EXACT_TWO: ExactScalar = { numerator: 2, denominator: 1 };
const EXACT_FOUR: ExactScalar = { numerator: 4, denominator: 1 };

function reciprocal(value: ExactScalar) {
  return divideExactScalars(EXACT_ONE, value);
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function nonzero(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function scaledMathJsonTerm(value: ExactScalar, expression: unknown) {
  if (value.numerator < 0) {
    return ['Negate', ['Multiply',
      buildExactScalarNode({ numerator: -value.numerator, denominator: value.denominator }),
      expression,
    ]];
  }
  return ['Multiply', buildExactScalarNode(value), expression];
}

function exactScalarIsTwo(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar?.numerator === 2 && scalar.denominator === 1;
}

function groupedAffineLatex(latex: string) {
  return /^[A-Za-z](?:\^\{?[-+]?\d+\}?)?$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function doubledAffineLatex(latex: string) {
  return /^[A-Za-z]$/.test(latex)
    ? `2${latex}`
    : `2\\left(${latex}\\right)`;
}

function hyperbolicDetail(rows: readonly IntegrationDetailRow[]): DisplayDetailSection {
  return integrationDetailSection('Integration Hyperbolic Table', rows);
}

function exactTemplateProofAfterBackcheck(
  verification: AntiderivativeBackcheck,
): AntiderivativeBackcheck | undefined {
  return verification.status === 'verified-exact'
    || verification.status === 'verified-numeric-confidence'
    ? {
      status: 'verified-exact',
      reason: 'verified by affine hyperbolic-square table proof after derivative backcheck',
    }
    : undefined;
}

export function tryHyperbolicSquareTableRule(
  node: unknown,
  variable: string,
): HyperbolicTableResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return undefined;
  }

  const exponent = node[2];
  if (!isNodeArray(node[1]) || node[1].length !== 2 || !exactScalarIsTwo(exponent)) {
    return undefined;
  }

  const head = node[1][0];
  if (head !== 'Sinh' && head !== 'Cosh') {
    return undefined;
  }

  const affine = parseExactAffineArgument(node[1][1], variable);
  if (!affine) {
    return undefined;
  }

  const sinhCoefficient = reciprocal(multiplyExactScalars(EXACT_FOUR, affine.slope));
  const linearCoefficient = reciprocal(multiplyExactScalars(EXACT_TWO, affine.slope));
  if (!sinhCoefficient || !linearCoefficient) {
    return undefined;
  }

  const sinhTerm = scaleByExactScalar(
    `\\sinh\\left(${doubledAffineLatex(affine.latex)}\\right)`,
    sinhCoefficient,
  );
  const signedLinearCoefficient = head === 'Sinh'
    ? negateExactScalar(linearCoefficient)
    : linearCoefficient;
  const linearTerm = scaleByExactScalar(groupedAffineLatex(affine.latex), signedLinearCoefficient);
  const exactLatex = joinAdditiveLatex([sinhTerm, linearTerm]);
  if (!exactLatex) {
    return undefined;
  }

  const verification = exactTemplateProofAfterBackcheck(backcheckAntiderivative({
    antiderivativeLatex: exactLatex,
    integrand: node,
    variable,
  }));
  if (!verification) {
    return undefined;
  }

  return {
    antiderivativeNode: ['Add',
      scaledMathJsonTerm(sinhCoefficient, ['Sinh', ['Multiply', 2, node[1][1]]]),
      scaledMathJsonTerm(signedLinearCoefficient, node[1][1]),
    ],
    exactLatex,
    verification,
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: [nonzero(exactScalarLatex(affine.slope))],
      source: 'candidate-validation',
    }),
    detailSections: [hyperbolicDetail([
      integrationMathRow('Recognized table form: ', boxLatex(node)),
      integrationMathRow('Affine argument: ', affine.latex),
      integrationTextRow('Used sinh/cosh square identity and accepted only after derivative backcheck.'),
    ])],
  };
}
