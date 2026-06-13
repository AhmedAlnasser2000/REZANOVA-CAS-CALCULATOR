import { buildTermNode, mergeFactor, type FactorMap } from '../patterns';

export function cloneFactors(source: FactorMap) {
  const cloned = new Map<string, { node: unknown; exponent: number }>();
  for (const [key, value] of source.entries()) {
    cloned.set(key, { node: value.node, exponent: value.exponent });
  }
  return cloned;
}

export function mergeFactors(target: FactorMap, source: FactorMap, exponentScale = 1) {
  for (const value of source.values()) {
    mergeFactor(target, value.node, value.exponent * exponentScale);
  }
}

export function scaleFactors(source: FactorMap, exponent: number) {
  const result = new Map<string, { node: unknown; exponent: number }>();
  for (const entry of source.values()) {
    mergeFactor(result, entry.node, entry.exponent * exponent);
  }
  return result;
}

export function buildFactorNodeWithCoefficient(coefficient: number, factors: FactorMap) {
  return buildTermNode(coefficient, factors);
}
