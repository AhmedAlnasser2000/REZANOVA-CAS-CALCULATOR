import type {
  GruntzFiniteTargetBridgeContract,
  GruntzRecursiveEvaluatorContract,
} from '../../symbolic-engine/limits';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from '../../symbolic-engine/limits/detail-readback';
import {
  limitValueToApproxText,
  type CalculusCoreEvaluation,
} from './shared';

function gruntzApproxText(exactLatex: string | undefined) {
  if (exactLatex === undefined || exactLatex.includes('\\begin{cases}')) {
    return undefined;
  }
  if (exactLatex === String.raw`\infty`) {
    return 'Infinity';
  }
  if (exactLatex === String.raw`-\infty`) {
    return '-Infinity';
  }
  if (exactLatex === '0') {
    return '0';
  }
  if (/^-?\d+(?:\.\d+)?$/u.test(exactLatex)) {
    return limitValueToApproxText(Number(exactLatex));
  }
  return undefined;
}

function gruntzLimitMethodSection(input: {
  route: string;
  sourceLatex: string;
  transformedLatex?: string;
  exactLatex?: string;
}) {
  return limitDetailSection('Limit Method', [
    [
      limitTextPart('Form detected: '),
      limitTextPart(`Gruntz ${input.route.replaceAll('-', ' ')}.`),
    ],
    [
      limitTextPart('Expression compared: '),
      limitMathPart(input.sourceLatex),
      limitTextPart('.'),
    ],
    ...(input.transformedLatex
      ? [[
          limitTextPart('Key transformation: '),
          limitMathPart(input.transformedLatex),
          limitTextPart('.'),
        ]]
      : []),
    ...(input.exactLatex
      ? [[
          limitTextPart('Conclusion: '),
          limitMathPart(input.exactLatex),
          limitTextPart('.'),
        ]]
      : []),
  ]);
}

export function gruntzRecursiveEvaluation(
  contract: GruntzRecursiveEvaluatorContract,
): CalculusCoreEvaluation | null {
  if (!contract.supported || !contract.exactLatex) {
    return null;
  }

  return {
    exactLatex: contract.exactLatex,
    approxText: gruntzApproxText(contract.exactLatex),
    warnings: [],
    resultOrigin: 'rule-based-symbolic',
    detailSections: [
      gruntzLimitMethodSection({
        route: contract.route,
        sourceLatex: contract.sourceLatex,
        transformedLatex: contract.transformedLatex,
        exactLatex: contract.exactLatex,
      }),
      ...(contract.detailSections ?? []),
    ],
  };
}

export function gruntzFiniteBridgeEvaluation(
  contract: GruntzFiniteTargetBridgeContract,
): CalculusCoreEvaluation | null {
  if (!contract.supported || !contract.exactLatex) {
    if (contract.route === 'two-sided-disagreement') {
      return {
        warnings: [],
        error: contract.stopReason ?? 'Right-hand and left-hand Gruntz bridge results do not agree.',
        detailSections: contract.detailSections,
      };
    }
    return null;
  }

  return {
    exactLatex: contract.exactLatex,
    approxText: gruntzApproxText(contract.exactLatex),
    warnings: [],
    resultOrigin: 'rule-based-symbolic',
    detailSections: [
      gruntzLimitMethodSection({
        route: contract.route,
        sourceLatex: contract.sourceLatex,
        transformedLatex: contract.sideContracts?.map((side) => side.transformedLatex).join(', '),
        exactLatex: contract.exactLatex,
      }),
      ...(contract.detailSections ?? []),
    ],
  };
}
