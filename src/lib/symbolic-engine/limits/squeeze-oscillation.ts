import type { LimitDirection, DisplayDetailSection } from '../../../types/calculator';
import {
  limitDetailSection,
  limitMathPart,
  limitMethodSection,
  limitTextPart,
} from './detail-readback';
import { box, evaluateNodeAt, success } from './evaluation';
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

function nodeLatex(node: unknown) {
  try {
    return box(node).latex;
  } catch {
    return undefined;
  }
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
    productLatex: nodeLatex(node) ?? 'product',
    vanishingLatex: nodeLatex(vanishingFactor) ?? 'g(x)',
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
  const sequenceRows = label.startsWith('\\cos')
    ? [
        [
          limitTextPart('Choose '),
          limitMathPart(`${variable}_n=1/(2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${label.replace(`1/${variable}`, `1/${variable}_n`)}=1`),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Choose '),
          limitMathPart(`y_n=1/(\\pi+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${label.replace(`1/${variable}`, '1/y_n')}=-1`),
          limitTextPart('.'),
        ],
      ]
    : [
        [
          limitTextPart('Choose '),
          limitMathPart(`${variable}_n=1/(\\pi/2+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${label.replace(`1/${variable}`, `1/${variable}_n`)}=1`),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Choose '),
          limitMathPart(`y_n=1/(3\\pi/2+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${label.replace(`1/${variable}`, '1/y_n')}=-1`),
          limitTextPart('.'),
        ],
      ];

  return {
    kind: 'failure',
    error: 'The expression oscillates near the target, so this limit does not exist.',
    detailSections: [
      limitDetailSection('Why This Limit Fails', [
        [
          limitTextPart('The factor '),
          limitMathPart(label),
          limitTextPart(` is sampled as ${variable} approaches 0 ${sidePhrase(direction)}.`),
        ],
        ...sequenceRows,
        [
          limitTextPart('Both sequences approach '),
          limitMathPart('0'),
          limitTextPart(', but the function values approach different numbers. Because the expression does not approach one number, the limit does not exist.'),
        ],
      ]),
    ],
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

  return {
    ...success(0, 'rule-based-symbolic', [
      `Squeeze bound: -\\left|${product.vanishingLatex}\\right|\\le ${product.productLatex}\\le \\left|${product.vanishingLatex}\\right|.`,
      `Bounded oscillation: ${product.oscillatorLabels.join(' and ')} stays between -1 and 1.`,
      `The remaining factor tends to 0 as ${variable} approaches 0.`,
      'By the squeeze theorem, the product tends to 0.',
      'Final limit: 0.',
    ]),
    detailSections: limitMethodSection(
      `Squeeze bound: -\\left|${product.vanishingLatex}\\right|\\le ${product.productLatex}\\le \\left|${product.vanishingLatex}\\right|.`,
      `Bounded oscillation: ${product.oscillatorLabels.join(' and ')} stays between -1 and 1.`,
      `The remaining factor tends to 0 as ${variable} approaches 0.`,
      'By the squeeze theorem, the product tends to 0.',
      'Final limit: 0.',
    ),
  };
}

export function hasFiniteSqueezeOscillationCandidate(
  node: unknown,
  target: number,
  variable = 'x',
  direction: LimitDirection = 'two-sided',
) {
  return resolveFiniteSqueezeOscillationLimit(node, target, variable, direction) !== undefined;
}
