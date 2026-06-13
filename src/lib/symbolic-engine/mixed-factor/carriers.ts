import { ComputeEngine, expand } from '@cortex-js/compute-engine';

import {
  buildExactScalarNode,
  readExactScalarNode,
} from '../../algebra/polynomial-core';
import { matchSupportedRationalPower } from '../../algebra/radical-core';
import { normalizeAst } from '../normalize';
import { isNodeArray, termKey } from '../patterns';
import type { MixedCarrierCandidate } from './types';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE', 'ImaginaryUnit']);

export function collectVariableSymbols(node: unknown, result = new Set<string>()) {
  if (typeof node === 'string' && !NUMERIC_CONSTANT_SYMBOLS.has(node)) {
    result.add(node);
    return result;
  }

  if (!isNodeArray(node)) {
    return result;
  }

  node.forEach((child, index) => {
    if (index > 0) {
      collectVariableSymbols(child, result);
    }
  });

  return result;
}

export function expandOnce(node: unknown) {
  const normalized = normalizeAst(node);
  try {
    return normalizeAst(
      (expand(ce.box(normalized as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json,
    );
  } catch {
    return normalized;
  }
}

function buildCarrierNode(base: unknown, denominator: number) {
  if (denominator === 2) {
    return normalizeAst(['Sqrt', base]);
  }

  return normalizeAst(['Power', base, ['Rational', 1, denominator]]);
}

function parsePositiveInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1 || scalar.numerator <= 0) {
    return null;
  }

  return scalar.numerator;
}

function buildCarrierPowerNode(candidate: MixedCarrierCandidate, degree: number): unknown {
  if (degree === 0) {
    return 1;
  }

  if (candidate.denominator === 2) {
    const integerExponent = Math.floor(degree / 2);
    const hasRadicalFactor = degree % 2 === 1;
    const parts: unknown[] = [];

    if (integerExponent > 0) {
      parts.push(integerExponent === 1 ? candidate.base : ['Power', candidate.base, integerExponent]);
    }

    if (hasRadicalFactor) {
      parts.push(candidate.carrierNode);
    }

    if (parts.length === 0) {
      return 1;
    }

    return parts.length === 1 ? parts[0] : normalizeAst(['Multiply', ...parts]);
  }

  const exponent = normalizeAst(buildExactScalarNode({ numerator: degree, denominator: candidate.denominator }));
  const exactExponent = readExactScalarNode(exponent);
  if (exactExponent?.denominator === 1) {
    return exactExponent.numerator === 1
      ? candidate.base
      : normalizeAst(['Power', candidate.base, exactExponent.numerator]);
  }

  return normalizeAst(['Power', candidate.base, exponent]);
}

export function findCandidatePowers(node: unknown, variable: string) {
  const candidates = new Map<string, MixedCarrierCandidate>();

  const visit = (current: unknown) => {
    const normalized = normalizeAst(current);
    const matched = matchSupportedRationalPower(normalized, variable);
    if (matched && matched.denominator > 1) {
      const base = normalizeAst(matched.base);
      const key = `${termKey(base)}::${matched.denominator}`;
      if (!candidates.has(key)) {
        candidates.set(key, {
          variable,
          base,
          baseKey: termKey(base),
          denominator: matched.denominator,
          carrierNode: buildCarrierNode(base, matched.denominator),
        });
      }
    }

    if (!isNodeArray(normalized)) {
      return;
    }

    normalized.slice(1).forEach(visit);
  };

  visit(node);

  return [...candidates.values()];
}

export function extractCarrierDegree(node: unknown, candidate: MixedCarrierCandidate): number | null {
  const normalized = normalizeAst(node);
  if (termKey(normalized) === candidate.baseKey) {
    return candidate.denominator;
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && termKey(normalizeAst(normalized[1])) === candidate.baseKey
  ) {
    const exponent = parsePositiveInteger(normalized[2]);
    if (exponent !== null) {
      return exponent * candidate.denominator;
    }
  }

  const matched = matchSupportedRationalPower(normalized, candidate.variable);
  if (
    matched
    && matched.denominator === candidate.denominator
    && termKey(normalizeAst(matched.base)) === candidate.baseKey
  ) {
    return matched.numerator;
  }

  return null;
}

export function mapCarrierVariable(node: unknown, candidate: MixedCarrierCandidate): unknown {
  if (node === 'u') {
    return candidate.carrierNode;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'u'
  ) {
    const exponent = parsePositiveInteger(node[2]);
    if (exponent !== null) {
      return buildCarrierPowerNode(candidate, exponent);
    }
  }

  if (!isNodeArray(node)) {
    return node;
  }

  return [node[0], ...node.slice(1).map((child) => mapCarrierVariable(child, candidate))];
}
