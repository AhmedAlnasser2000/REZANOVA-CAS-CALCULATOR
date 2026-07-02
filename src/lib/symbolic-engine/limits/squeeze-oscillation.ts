import type { LimitDirection, DisplayDetailSection } from '../../../types/calculator';
import { evaluateNodeAt, success } from './evaluation';
import type { FiniteLimitRuleSuccess } from './types';

type SqueezeOscillationFailure = {
  kind: 'failure';
  error: string;
  detailSections: DisplayDetailSection[];
};

export type SqueezeOscillationLimitResult = FiniteLimitRuleSuccess | SqueezeOscillationFailure;

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isReciprocalVariable(node: unknown, variable: string) {
  return (
    isNodeArray(node)
    && (
      (node[0] === 'Divide' && node[1] === 1 && node[2] === variable)
      || (node[0] === 'Power' && node[1] === variable && node[2] === -1)
    )
  );
}

function boundedOscillatorLabel(node: unknown, variable: string) {
  if (!isNodeArray(node) || !['Sin', 'Cos'].includes(String(node[0])) || node.length !== 2) {
    return undefined;
  }

  if (!isReciprocalVariable(node[1], variable)) {
    return undefined;
  }

  return node[0] === 'Sin'
    ? `\\sin(1/${variable})`
    : `\\cos(1/${variable})`;
}

function multiplyNode(nodes: unknown[]) {
  if (nodes.length === 0) {
    return undefined;
  }
  if (nodes.length === 1) {
    return nodes[0];
  }
  return ['Multiply', ...nodes];
}

function resolveSqueezeProduct(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = node.slice(1);
  const oscillators = factors
    .map((factor, index) => ({ factor, index, label: boundedOscillatorLabel(factor, variable) }))
    .filter((entry): entry is { factor: unknown; index: number; label: string } => Boolean(entry.label));

  if (oscillators.length === 0) {
    return undefined;
  }

  const remaining = factors.filter((_, index) => !oscillators.some((entry) => entry.index === index));
  const vanishingFactor = multiplyNode(remaining);
  if (vanishingFactor === undefined) {
    return undefined;
  }

  const vanishingLimit = evaluateNodeAt(vanishingFactor, 0, variable);
  if (vanishingLimit === undefined || Math.abs(vanishingLimit) >= 1e-8) {
    return undefined;
  }

  return {
    oscillatorLabels: oscillators.map((entry) => entry.label),
  };
}

function sidePhrase(direction: LimitDirection) {
  if (direction === 'left') {
    return 'from the left';
  }
  if (direction === 'right') {
    return 'from the right';
  }
  return 'from both sides';
}

function oscillationFailure(label: string, variable: string, direction: LimitDirection): SqueezeOscillationFailure {
  return {
    kind: 'failure',
    error: 'The expression oscillates near the target, so this limit does not exist.',
    detailSections: [{
      title: 'Why This Limit Fails',
      lines: [
        `The factor ${label} is sampled as ${variable} approaches 0 ${sidePhrase(direction)}.`,
        `The inner term 1/${variable} grows without settling, so the trigonometric factor keeps taking different values between -1 and 1.`,
        'Because the expression does not approach one number, the limit does not exist.',
      ],
    }],
  };
}

export function resolveFiniteSqueezeOscillationLimit(
  node: unknown,
  target: number,
  variable = 'x',
  direction: LimitDirection = 'two-sided',
): SqueezeOscillationLimitResult | undefined {
  if (Math.abs(target) >= 1e-12) {
    return undefined;
  }

  const directOscillator = boundedOscillatorLabel(node, variable);
  if (directOscillator) {
    return oscillationFailure(directOscillator, variable, direction);
  }

  const product = resolveSqueezeProduct(node, variable);
  if (!product) {
    return undefined;
  }

  return success(0, 'rule-based-symbolic', [
    `Bounded oscillation: ${product.oscillatorLabels.join(' and ')} stays between -1 and 1.`,
    `The remaining factor tends to 0 as ${variable} approaches 0.`,
    'By the squeeze theorem, the product tends to 0.',
  ]);
}

export function hasFiniteSqueezeOscillationCandidate(
  node: unknown,
  target: number,
  variable = 'x',
  direction: LimitDirection = 'two-sided',
) {
  return resolveFiniteSqueezeOscillationLimit(node, target, variable, direction) !== undefined;
}
