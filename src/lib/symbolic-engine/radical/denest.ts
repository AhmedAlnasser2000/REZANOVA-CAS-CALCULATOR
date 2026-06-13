import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import type { ExactScalar } from '../../algebra/polynomial-core';
import { expressionHasVariable } from '../../algebra/radical-core';
import type { RadicalNormalizationMode } from './types';
import { flattenAdd, isNodeArray, termKey } from '../patterns';
import { normalizeAst } from '../normalize';
import {
  addScalars,
  divideScalars,
  isNonnegativeScalar,
  multiplyScalars,
  powerScalar,
  readExactScalar,
  readPerfectSquareScalar,
  subtractScalars,
} from './scalars';
import { buildScalarNode } from './nodes';

const ce = new ComputeEngine();

type ConstantNestedRadicalParts = {
  outerScalar: ExactScalar;
  innerScalar: ExactScalar;
  nestedRadicand: ExactScalar;
};

function parseConstantNestedSquareRootParts(node: unknown): ConstantNestedRadicalParts | null {
  const normalized = normalizeAst(node);
  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  let outerScalar: ExactScalar | null = null;
  let innerScalar: ExactScalar | null = null;
  let nestedRadicand: ExactScalar | null = null;

  for (const term of terms) {
    const scalar = readExactScalar(term);
    if (scalar) {
      outerScalar = outerScalar ? addScalars(outerScalar, scalar) : scalar;
      continue;
    }

    if (isNodeArray(term) && term[0] === 'Multiply' && term.length === 3) {
      const leftScalar = readExactScalar(term[1]);
      const rightSqrtTerm =
        isNodeArray(term[2]) && term[2][0] === 'Sqrt' && term[2].length === 2
          ? term[2]
          : null;
      const rightRadical = rightSqrtTerm ? readExactScalar(rightSqrtTerm[1]) : null;
      if (leftScalar && rightRadical && rightSqrtTerm && !expressionHasVariable(rightSqrtTerm[1])) {
        innerScalar = leftScalar;
        nestedRadicand = rightRadical;
        continue;
      }

      const rightScalar = readExactScalar(term[2]);
      const leftSqrtTerm =
        isNodeArray(term[1]) && term[1][0] === 'Sqrt' && term[1].length === 2
          ? term[1]
          : null;
      const leftRadical = leftSqrtTerm ? readExactScalar(leftSqrtTerm[1]) : null;
      if (rightScalar && leftRadical && leftSqrtTerm && !expressionHasVariable(leftSqrtTerm[1])) {
        innerScalar = rightScalar;
        nestedRadicand = leftRadical;
        continue;
      }
    }

    if (isNodeArray(term) && term[0] === 'Sqrt' && term.length === 2 && !expressionHasVariable(term[1])) {
      innerScalar = { numerator: 1, denominator: 1 };
      nestedRadicand = readExactScalar(term[1]);
      continue;
    }

    return null;
  }

  if (!outerScalar || !innerScalar || !nestedRadicand) {
    return null;
  }

  return {
    outerScalar,
    innerScalar,
    nestedRadicand,
  };
}

export function tryDenestConstantNestedSquareRoot(
  node: unknown,
  mode: RadicalNormalizationMode,
  variable: string | undefined,
  normalizeRootPart: (node: unknown) => unknown,
): unknown | null {
  if (mode !== 'simplify' || variable !== undefined) {
    return null;
  }

  const parts = parseConstantNestedSquareRootParts(node);
  if (!parts) {
    return null;
  }

  const innerSquared = multiplyScalars(parts.innerScalar, parts.innerScalar);
  if (!innerSquared) {
    return null;
  }

  const discriminant = subtractScalars(
    powerScalar(parts.outerScalar, 2) ?? { numerator: 0, denominator: 1 },
    multiplyScalars(innerSquared, parts.nestedRadicand) ?? { numerator: 0, denominator: 1 },
  );
  if (!discriminant || !isNonnegativeScalar(discriminant)) {
    return null;
  }

  const sqrtDiscriminant = readPerfectSquareScalar(buildScalarNode(discriminant));
  if (!sqrtDiscriminant) {
    return null;
  }

  const positivePart = divideScalars(
    addScalars(parts.outerScalar, sqrtDiscriminant),
    { numerator: 2, denominator: 1 },
  );
  const negativeNumerator = subtractScalars(parts.outerScalar, sqrtDiscriminant);
  if (!negativeNumerator) {
    return null;
  }
  const negativePart = divideScalars(
    negativeNumerator,
    { numerator: 2, denominator: 1 },
  );
  if (!positivePart || !negativePart || !isNonnegativeScalar(positivePart) || !isNonnegativeScalar(negativePart)) {
    return null;
  }

  const leftPart = normalizeRootPart(['Sqrt', buildScalarNode(positivePart)]);
  const rightPart = normalizeRootPart(['Sqrt', buildScalarNode(negativePart)]);
  const denested =
    parts.innerScalar.numerator >= 0
      ? normalizeAst(['Add', leftPart, rightPart])
      : normalizeAst(['Add', leftPart, ['Negate', rightPart]]);
  const squared = normalizeAst(
    (expand(ce.box(['Power', denested, 2] as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json,
  );
  const normalizedOriginal = normalizeAst(node);
  if (termKey(squared) !== termKey(normalizedOriginal)) {
    return null;
  }

  return denested;
}
