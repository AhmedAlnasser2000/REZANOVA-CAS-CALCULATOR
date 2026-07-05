import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  buildExactScalarNode,
  divideExactScalars,
  multiplyExactScalars,
  negateExactScalar,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import { boxLatex, isNodeArray, multiplyLatex, wrapGroupedLatex } from '../patterns';
import { parseExactAffineArgument } from './exact-parts';
import { scaleByExactScalar } from './rational';

type HyperbolicTableResult = {
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

function hyperbolicDetail(lines: string[]): DisplayDetailSection {
  return {
    title: 'Integration Hyperbolic Table',
    lines,
  };
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
  if (!isNodeArray(node[1]) || node[1].length !== 2 || boxLatex(exponent) !== '2') {
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

  const doubledArgument = multiplyLatex('2', wrapGroupedLatex(affine.latex));
  const sinhTerm = scaleByExactScalar(
    `\\sinh\\left(${doubledArgument}\\right)`,
    sinhCoefficient,
  );
  const signedLinearCoefficient = head === 'Sinh'
    ? negateExactScalar(linearCoefficient)
    : linearCoefficient;
  const linearTerm = scaleByExactScalar(affine.latex, signedLinearCoefficient);
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
    exactLatex,
    verification,
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: [nonzero(exactScalarLatex(affine.slope))],
      source: 'candidate-validation',
    }),
    detailSections: [hyperbolicDetail([
      `Recognized table form: ${boxLatex(node)}`,
      `Affine argument: ${affine.latex}`,
      'Used sinh/cosh square identity and accepted only after derivative backcheck.',
    ])],
  };
}
