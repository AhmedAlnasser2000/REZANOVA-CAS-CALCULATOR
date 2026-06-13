import type { ExactScalar } from '../../algebra/polynomial-core';
import { flattenAdd, flattenMultiply, termKey } from '../patterns';
import { normalizeAst } from '../normalize';
import { addScalars, multiplyScalars, readExactScalar } from './scalars';
import { buildProductNode, buildScalarNode } from './nodes';

function decomposeAddTerm(node: unknown) {
  const factors = flattenMultiply(node).map((factor) => normalizeAst(factor));
  let scalar: ExactScalar = { numerator: 1, denominator: 1 };
  const symbolicFactors: unknown[] = [];

  for (const factor of factors) {
    const factorScalar = readExactScalar(factor);
    if (factorScalar) {
      const nextScalar = multiplyScalars(scalar, factorScalar);
      if (!nextScalar) {
        return null;
      }
      scalar = nextScalar;
    } else {
      symbolicFactors.push(factor);
    }
  }

  const normalizedFactors = symbolicFactors
    .slice()
    .sort((left, right) => termKey(left).localeCompare(termKey(right)));

  return {
    scalar,
    factors: normalizedFactors,
  };
}

function buildAddTerm(
  scalar: ExactScalar,
  factors: unknown[],
): unknown {
  if (scalar.numerator === 0) {
    return 0;
  }

  const parts: unknown[] = [];
  if (scalar.numerator !== 1 || scalar.denominator !== 1 || factors.length === 0) {
    parts.push(buildScalarNode(scalar));
  }
  parts.push(...factors);

  return buildProductNode(parts);
}

export function addChildren(children: unknown[]) {
  if (children.length === 0) {
    return 0;
  }
  if (children.length === 1) {
    return children[0];
  }
  return ['Add', ...children];
}

export function multiplyChildren(children: unknown[]) {
  if (children.length === 0) {
    return 1;
  }
  if (children.length === 1) {
    return children[0];
  }
  return ['Multiply', ...children];
}

export function combineAddTerms(children: unknown[]) {
  const terms = children.flatMap((child) => flattenAdd(child));
  const groups = new Map<string, { scalar: ExactScalar; factors: unknown[] }>();

  for (const term of terms) {
    const decomposed = decomposeAddTerm(term);
    if (!decomposed) {
      return { node: addChildren(terms), changed: false };
    }

    const key = JSON.stringify(decomposed.factors);
    const current = groups.get(key);
    groups.set(key, {
      factors: decomposed.factors,
      scalar: current ? addScalars(current.scalar, decomposed.scalar) : decomposed.scalar,
    });
  }

  const combined = [...groups.values()]
    .filter((entry) => entry.scalar.numerator !== 0)
    .map((entry) => buildAddTerm(entry.scalar, entry.factors));

  const originalNode = addChildren(terms);
  const combinedNode = addChildren(combined);
  return {
    node: combinedNode,
    changed: termKey(combinedNode) !== termKey(originalNode),
  };
}
