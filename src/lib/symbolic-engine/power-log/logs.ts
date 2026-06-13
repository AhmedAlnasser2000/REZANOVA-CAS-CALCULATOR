import { isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import type { LogCall, SerializedNode } from './types';
import { mergeConstraints } from './constraints';
import { buildProductNode } from './radicals';
import { exactPositiveBase, isExponentialE, readNumericConstant } from './scalars';
import { serializeNode } from './serialization';

function matchLogCall(node: unknown): LogCall | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Ln' && normalized.length === 2) {
    return {
      family: 'ln',
      baseKey: 'ln',
      argumentNode: normalized[1],
      argumentLatex: serializeNode(normalized[1]),
    };
  }

  if (normalized[0] !== 'Log' || normalized.length < 2 || normalized.length > 3) {
    return null;
  }

  const argumentNode = normalized[1];
  const argumentLatex = serializeNode(argumentNode);
  if (normalized.length === 2) {
    return {
      family: 'log',
      baseKey: 'log10',
      argumentNode,
      argumentLatex,
    };
  }

  const base = normalized[2];
  if (isExponentialE(base)) {
    return {
      family: 'ln',
      baseKey: 'ln',
      argumentNode,
      argumentLatex,
    };
  }

  const numericBase = readNumericConstant(base);
  if (numericBase === 10) {
    return {
      family: 'log',
      baseKey: 'log10',
      argumentNode,
      argumentLatex,
    };
  }

  if (!exactPositiveBase(base)) {
    return null;
  }

  return {
    family: 'log',
    baseNode: base,
    baseKey: serializeNode(base),
    argumentNode,
    argumentLatex,
  };
}

function buildLogNode(call: LogCall, argumentNode: unknown) {
  if (call.family === 'ln') {
    return ['Ln', argumentNode];
  }

  if (!call.baseNode) {
    return ['Log', argumentNode];
  }

  return ['Log', argumentNode, call.baseNode];
}

export function tryCombineSameBaseLogs(node: unknown, left: SerializedNode, right: SerializedNode): SerializedNode | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add' || normalized.length !== 3) {
    return null;
  }

  const leftCall = matchLogCall(left.node);
  const rightCall = matchLogCall(right.node);
  if (!leftCall || !rightCall || leftCall.baseKey !== rightCall.baseKey) {
    return null;
  }

  const combinedArgument = buildProductNode(leftCall.argumentNode, rightCall.argumentNode);
  const combinedNode = normalizeAst(buildLogNode(leftCall, combinedArgument));
  const constraints = mergeConstraints(
    left.conditionConstraints,
    mergeConstraints(
      right.conditionConstraints,
      [
        { kind: 'positive' as const, expressionLatex: leftCall.argumentLatex },
        { kind: 'positive' as const, expressionLatex: rightCall.argumentLatex },
      ],
    ),
  );

  return {
    node: combinedNode,
    latex: serializeNode(combinedNode),
    changed: true,
    handled: true,
    conditionConstraints: constraints,
    containsTrackedNotation: true,
  };
}

export function changeBase(node: unknown): SerializedNode | null {
  const call = matchLogCall(node);
  if (!call || call.family !== 'log' || !call.baseNode) {
    return null;
  }

  const baseValue = readNumericConstant(call.baseNode);
  if (baseValue === undefined || baseValue === 10 || !exactPositiveBase(call.baseNode)) {
    return null;
  }

  const ratioNode = normalizeAst([
    'Divide',
    ['Ln', call.argumentNode],
    ['Ln', call.baseNode],
  ]);

  return {
    node: ratioNode,
    latex: serializeNode(ratioNode),
    changed: true,
    handled: true,
    conditionConstraints: [{
      kind: 'positive',
      expressionLatex: call.argumentLatex,
    }],
    containsTrackedNotation: true,
  };
}
