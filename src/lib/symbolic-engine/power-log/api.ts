import { boxLatex, isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import type { PowerLogMode, PowerLogNormalizationResult, SerializedNode } from './types';
import { buildConditionSupplement, mergeConstraints } from './constraints';
import { changeBase, tryCombineSameBaseLogs } from './logs';
import { normalizeEquationPreprocess } from './preprocess';
import {
  buildPowerNode,
  extractRadicalInfo,
  isPlainFamiliarRoot,
  radicalConstraints,
  rewriteAsPower,
  rewriteAsRoot,
  shouldCanonicalizePower,
} from './radicals';
import { serializeNode, serializeRebuiltNode } from './serialization';

function normalizeForSimplify(node: unknown): SerializedNode {
  const normalized = normalizeAst(node);

  if (typeof normalized === 'string' || typeof normalized === 'number' || !isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      latex: serializeNode(normalized),
      changed: false,
      handled: false,
      conditionConstraints: [],
      containsTrackedNotation: false,
    };
  }

  if (shouldCanonicalizePower(normalized)) {
    const info = extractRadicalInfo(normalized);
    if (info) {
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
  }

  if (isPlainFamiliarRoot(normalized)) {
    return {
      node: normalized,
      latex: serializeNode(normalized),
      changed: false,
      handled: true,
      conditionConstraints: [],
      containsTrackedNotation: false,
    };
  }

  const [head, ...children] = normalized;
  const childResults = children.map((child) => normalizeForSimplify(child));

  if (head === 'Add' && childResults.length === 2) {
    const combined = tryCombineSameBaseLogs(normalized, childResults[0], childResults[1]);
    if (combined) {
      return combined;
    }
  }

  const rebuilt = serializeRebuiltNode(normalized, childResults);
  if (rebuilt.containsTrackedNotation) {
    return {
      ...rebuilt,
      changed: rebuilt.changed || rebuilt.latex !== boxLatex(normalized),
      handled: true,
    };
  }

  return rebuilt;
}

function normalizeByMode(node: unknown, mode: PowerLogMode): SerializedNode | null {
  switch (mode) {
    case 'simplify':
      return normalizeForSimplify(node);
    case 'rewrite-power':
      return rewriteAsPower(node);
    case 'rewrite-root':
      return rewriteAsRoot(node);
    case 'change-base':
      return changeBase(node);
    case 'equation-preprocess':
      return normalizeEquationPreprocess(node);
    default:
      return null;
  }
}

export function normalizeExactPowerLogNode(
  node: unknown,
  mode: PowerLogMode,
): PowerLogNormalizationResult | null {
  const normalized = normalizeByMode(node, mode);
  if (!normalized) {
    return null;
  }

  const originalLatex = serializeNode(normalizeAst(node));
  const conditionConstraints = mergeConstraints(normalized.conditionConstraints);
  const exactSupplementLatex = buildConditionSupplement(conditionConstraints);
  const changed = normalized.changed || exactSupplementLatex.length > 0;

  if (!changed && !normalized.handled) {
    return null;
  }

  return {
    handled: normalized.handled,
    changed: normalized.latex !== originalLatex || exactSupplementLatex.length > 0,
    normalizedNode: normalized.node,
    normalizedLatex: normalized.latex,
    conditionConstraints,
    exactSupplementLatex,
  };
}
