import type { LimitDirection, DisplayDetailSection } from '../../../types/calculator';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import { box } from './evaluation';
import { resolveLocalEquivalentLimit } from './local-equivalents';
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

  const label = nodeLatex(node);
  return label ?? (node[0] === 'Sin' ? `\\sin(h(${variable}))` : `\\cos(h(${variable}))`);
}

function oscillatingAtZeroLabel(node: unknown, variable: string) {
  if (!isNodeArray(node) || !['Sin', 'Cos'].includes(String(node[0])) || node.length !== 2) {
    return undefined;
  }

  if (!isReciprocalVariable(node[1], variable)) {
    return undefined;
  }

  return nodeLatex(node)
    ?? (node[0] === 'Sin' ? `\\sin(1/${variable})` : `\\cos(1/${variable})`);
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

function resolveSqueezeProduct(node: unknown, variable: string, direction: LimitDirection) {
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

  const vanishingLimit = resolveLocalEquivalentLimit(
    vanishingFactor,
    0,
    variable,
    direction,
    'Proved the non-oscillating factor tends to 0 by local equivalent comparison.',
  );
  if (
    !vanishingLimit
    || vanishingLimit.kind !== 'success'
    || vanishingLimit.value !== 0
  ) {
    return undefined;
  }

  return {
    oscillatorLabels: oscillators.map((entry) => entry.label),
    productLatex: nodeLatex(node) ?? 'product',
    vanishingLatex: nodeLatex(vanishingFactor) ?? 'g(x)',
    vanishingProof: 'local equivalent comparison',
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
  const functionName = label.startsWith('\\cos') ? '\\cos' : '\\sin';
  const sequenceRows = label.startsWith('\\cos')
    ? [
        [
          limitTextPart('Choose '),
          limitMathPart(`${variable}_n=1/(2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${variable}_n\\to 0`),
          limitTextPart(' and '),
          limitMathPart(`${functionName}\\left(1/${variable}_n\\right)=1`),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Choose '),
          limitMathPart(`y_n=1/(\\pi+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart('y_n\\to 0'),
          limitTextPart(' and '),
          limitMathPart(`${functionName}\\left(1/y_n\\right)=-1`),
          limitTextPart('.'),
        ],
      ]
    : [
        [
          limitTextPart('Choose '),
          limitMathPart(`${variable}_n=1/(\\pi/2+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart(`${variable}_n\\to 0`),
          limitTextPart(' and '),
          limitMathPart(`${functionName}\\left(1/${variable}_n\\right)=1`),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Choose '),
          limitMathPart(`y_n=1/(3\\pi/2+2\\pi n)`),
          limitTextPart('; then '),
          limitMathPart('y_n\\to 0'),
          limitTextPart(' and '),
          limitMathPart(`${functionName}\\left(1/y_n\\right)=-1`),
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

  const directOscillator = oscillatingAtZeroLabel(node, variable);
  if (directOscillator) {
    return oscillationFailure(directOscillator, variable, direction);
  }

  const product = resolveSqueezeProduct(node, variable, direction);
  if (!product) {
    return undefined;
  }

  const boundedOscillatorParts = product.oscillatorLabels.flatMap((label, index) => [
    ...(index === 0 ? [] : [limitTextPart(index === product.oscillatorLabels.length - 1 ? ' and ' : ', ')]),
    limitMathPart(label),
  ]);

  return {
    kind: 'success' as const,
    value: 0,
    exactLatex: '0',
    approxText: '0',
    origin: 'rule-based-symbolic' as const,
    detailSections: [
      limitDetailSection('Limit Method', [
        [limitTextPart('Form detected: vanishing factor times bounded oscillator.')],
        [
          limitTextPart('Squeeze bound: '),
          limitMathPart(`-\\left|${product.vanishingLatex}\\right|\\le ${product.productLatex}\\le \\left|${product.vanishingLatex}\\right|`),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Bounded oscillation: '),
          ...boundedOscillatorParts,
          limitTextPart(' stays between -1 and 1.'),
        ],
        [
          limitTextPart('Key calculation: '),
          limitMathPart(`\\lim_{${variable}\\to 0}${product.vanishingLatex}=0`),
          limitTextPart(` by ${product.vanishingProof}.`),
        ],
        [limitTextPart('Conclusion: by the squeeze theorem, the product tends to 0.')],
        [
          limitTextPart('Conclusion: final limit is '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      ]),
    ],
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
