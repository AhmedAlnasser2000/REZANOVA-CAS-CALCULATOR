import type { SolveDomainConstraint } from '../../../types/calculator';
import { boxLatex, isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import type { RadicalInfo, RationalValue, SerializedNode } from './types';
import type { SerializableMathJson } from '../../../types/calculator';
import { asPositiveInteger, asRational, expressionHasVariable, reduceRational } from './scalars';
import { serializeNode } from './serialization';

export function buildRationalNode(value: RationalValue): unknown {
  if (value.denominator === 1) {
    return value.numerator;
  }

  return ['Rational', value.numerator, value.denominator];
}

export function buildPowerNode(base: unknown, numerator: number, denominator: number) {
  if (denominator === 1) {
    return numerator === 1 ? base : ['Power', base, numerator];
  }

  return ['Power', base, buildRationalNode(reduceRational(numerator, denominator))];
}

export function buildRootNode(base: unknown, numerator: number, denominator: number): unknown {
  const poweredBase = numerator === 1 ? base : ['Power', base, numerator];
  if (denominator === 2) {
    return ['Sqrt', poweredBase];
  }
  return ['Root', poweredBase, denominator];
}

export function buildProductNode(left: unknown, right: unknown): unknown {
  const normalized = normalizeAst(['Multiply', left, right]);
  return normalized;
}

export function extractRadicalInfo(node: unknown): RadicalInfo | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  const [head, left, right] = normalized;
  if (head === 'Sqrt') {
    const inner = extractRadicalInfo(left);
    if (inner) {
      const combined = reduceRational(inner.numerator, inner.denominator * 2);
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
      };
    }

    return { base: left, numerator: 1, denominator: 2 };
  }

  if (head === 'Root') {
    const index = asPositiveInteger(right);
    if (!index) {
      return null;
    }

    const inner = extractRadicalInfo(left);
    if (inner) {
      const combined = reduceRational(inner.numerator, inner.denominator * index);
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
      };
    }

    return { base: left, numerator: 1, denominator: index };
  }

  if (head === 'Power') {
    const exponent = asRational(right);
    if (!exponent) {
      return null;
    }

    const inner = extractRadicalInfo(left);
    if (inner) {
      const combined = reduceRational(
        inner.numerator * exponent.numerator,
        inner.denominator * exponent.denominator,
      );
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
      };
    }

    if (exponent.denominator > 1) {
      return {
        base: left,
        numerator: exponent.numerator,
        denominator: exponent.denominator,
      };
    }
  }

  return null;
}

export function isPlainFamiliarRoot(node: unknown) {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    return extractRadicalInfo(node[1]) === null;
  }

  if (node[0] === 'Root' && node.length === 3) {
    const index = asPositiveInteger(node[2]);
    return index === 3 && extractRadicalInfo(node[1]) === null;
  }

  return false;
}

export function shouldCanonicalizePower(node: unknown) {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Sqrt') {
    return !isPlainFamiliarRoot(node);
  }

  if (node[0] === 'Root') {
    return !isPlainFamiliarRoot(node);
  }

  return node[0] === 'Power' && isNodeArray(node[1]) && (node[1][0] === 'Sqrt' || node[1][0] === 'Root');
}

export function radicalConstraints(base: unknown, denominator: number) {
  if (denominator % 2 !== 0 || !expressionHasVariable(base)) {
    return [] as SolveDomainConstraint[];
  }

  return [{
    kind: 'nonnegative' as const,
    expressionLatex: boxLatex(base),
    expressionMathJson: base as SerializableMathJson,
  }];
}

export function rewriteAsPower(node: unknown): SerializedNode | null {
  const info = extractRadicalInfo(node);
  if (!info) {
    return null;
  }

  const powerNode = normalizeAst(buildPowerNode(info.base, info.numerator, info.denominator));
  return {
    node: powerNode,
    latex: serializeNode(powerNode),
    changed: true,
    handled: true,
    conditionConstraints: radicalConstraints(info.base, info.denominator),
    containsTrackedNotation: false,
  };
}

export function rewriteAsRoot(node: unknown): SerializedNode | null {
  const info = extractRadicalInfo(node);
  if (!info || info.denominator <= 1) {
    return null;
  }

  const rootNode = normalizeAst(buildRootNode(info.base, info.numerator, info.denominator));
  return {
    node: rootNode,
    latex: serializeNode(rootNode),
    changed: true,
    handled: true,
    conditionConstraints: radicalConstraints(info.base, info.denominator),
    containsTrackedNotation: false,
  };
}
