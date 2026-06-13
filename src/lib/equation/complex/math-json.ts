import { ComputeEngine } from '@cortex-js/compute-engine';
import type { MathJson } from './types';

export const ce = new ComputeEngine();

export function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

export function latexForNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return typeof node === 'string' ? node : String(node);
  }
}

export function containsTarget(node: unknown, target: string): boolean {
  if (node === target) {
    return true;
  }
  if (isArrayNode(node)) {
    return node.some((part) => containsTarget(part, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((part) => containsTarget(part, target));
  }
  return false;
}

export function hasTopLevelTargetOnlyOnOneSide(json: MathJson, target: string) {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  const left = json[1] as MathJson;
  const right = json[2] as MathJson;
  const leftHasTarget = containsTarget(left, target);
  const rightHasTarget = containsTarget(right, target);
  if (leftHasTarget === rightHasTarget) {
    return null;
  }

  return leftHasTarget
    ? { expression: left, otherSide: right }
    : { expression: right, otherSide: left };
}

export function parseTopLevelEquationSides(equationLatex: string, target: string) {
  const json = ce.parse(equationLatex).json as MathJson;
  return hasTopLevelTargetOnlyOnOneSide(json, target);
}
