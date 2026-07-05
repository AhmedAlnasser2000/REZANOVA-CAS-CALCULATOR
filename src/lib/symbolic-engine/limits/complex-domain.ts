import type { DisplayDetailSection, LimitDirection } from '../../../types/calculator';
import { evaluateNodeAt } from './evaluation';
import {
  formatLimitNumberLatex,
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import { boxLatex } from '../patterns/latex';
import type { FiniteLimitRuleSuccess } from './types';

export type ComplexDomainLimitAttempt =
  | FiniteLimitRuleSuccess
  | {
      kind: 'unsupported';
      reason: string;
      detailSections: DisplayDetailSection[];
    };

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function complexUnsupportedDetail(reason: string): DisplayDetailSection[] {
  return [
    limitDetailSection('Complex Domain', [
      [
        limitTextPart('Form detected: finite complex-domain boundary.'),
      ],
      [
        limitTextPart(`Key calculation: ${reason}`),
      ],
      [
        limitTextPart('Conclusion: Complex mode is proof-first for limits, so this route stops instead of guessing from numeric samples.'),
      ],
    ]),
  ];
}

export function unsupportedComplexDomainLimit(reason: string): ComplexDomainLimitAttempt {
  return {
    kind: 'unsupported',
    reason,
    detailSections: complexUnsupportedDetail(reason),
  };
}

type PrincipalSqrtLimit = {
  value: number;
  radicands: string[];
  radicals: string[];
};

function isZero(value: number | undefined) {
  return value !== undefined && Math.abs(value) <= 1e-12;
}

function combinePrincipalSqrtLimits(parts: PrincipalSqrtLimit[]): PrincipalSqrtLimit {
  return {
    value: parts.reduce((sum, part) => sum + part.value, 0),
    radicands: [...new Set(parts.flatMap((part) => part.radicands))],
    radicals: [...new Set(parts.flatMap((part) => part.radicals))],
  };
}

function principalSqrtTermLimit(input: {
  node: unknown;
  variable: string;
  target: number;
}): PrincipalSqrtLimit | undefined {
  if (isNodeArray(input.node) && input.node[0] === 'Sqrt' && input.node.length === 2) {
    const radicandValue = evaluateNodeAt(input.node[1], input.target, input.variable);
    if (!isZero(radicandValue)) {
      return undefined;
    }

    return {
      value: 0,
      radicands: [boxLatex(input.node[1])],
      radicals: [boxLatex(input.node)],
    };
  }

  if (isNodeArray(input.node) && input.node[0] === 'Negate' && input.node.length === 2) {
    const child = principalSqrtTermLimit({
      ...input,
      node: input.node[1],
    });
    return child
      ? {
          ...child,
          value: -child.value,
        }
      : undefined;
  }

  if (isNodeArray(input.node) && input.node[0] === 'Multiply') {
    const childLimits = input.node.slice(1).map((factor) =>
      principalSqrtTermLimit({
        ...input,
        node: factor,
      }));
    const sqrtParts = childLimits.filter((part): part is PrincipalSqrtLimit => Boolean(part));
    if (sqrtParts.length === 0) {
      return undefined;
    }

    const finiteFactors = input.node
      .slice(1)
      .filter((_, index) => childLimits[index] === undefined)
      .map((factor) => evaluateNodeAt(factor, input.target, input.variable));

    if (!finiteFactors.every((value) => value !== undefined && Number.isFinite(value))) {
      return undefined;
    }

    return {
      value: 0,
      radicands: [...new Set(sqrtParts.flatMap((part) => part.radicands))],
      radicals: [...new Set(sqrtParts.flatMap((part) => part.radicals))],
    };
  }

  const direct = evaluateNodeAt(input.node, input.target, input.variable);
  if (direct === undefined || !Number.isFinite(direct)) {
    return undefined;
  }

  return {
    value: direct,
    radicands: [],
    radicals: [],
  };
}

function principalSqrtBoundaryLimit(input: {
  node: unknown;
  variable: string;
  target: number;
}): PrincipalSqrtLimit | undefined {
  if (isNodeArray(input.node) && input.node[0] === 'Add') {
    const parts = input.node.slice(1).map((term) =>
      principalSqrtTermLimit({
        ...input,
        node: term,
      }));
    if (!parts.every(Boolean)) {
      return undefined;
    }

    const combined = combinePrincipalSqrtLimits(parts as PrincipalSqrtLimit[]);
    return combined.radicals.length > 0 ? combined : undefined;
  }

  const direct = principalSqrtTermLimit(input);
  return direct && direct.radicals.length > 0 ? direct : undefined;
}

function principalSqrtDetails(input: {
  result: PrincipalSqrtLimit;
  variable: string;
  target: number;
}): DisplayDetailSection[] {
  const targetLatex = formatLimitNumberLatex(input.target);
  return [
    limitDetailSection('Complex Domain', [
      [
        limitTextPart('Form detected: recognized principal square-root boundary.'),
      ],
      [
        limitTextPart('Branch: Complex mode uses the principal square-root branch for this form.'),
      ],
      ...input.result.radicands.map((radicand, index) => [
        limitTextPart('Key calculation: '),
        limitMathPart(`\\lim_{${input.variable}\\to ${targetLatex}}${radicand}=0`),
        limitTextPart(', so '),
        limitMathPart(input.result.radicals[index] ?? `\\sqrt{${radicand}}`),
        limitTextPart(' tends to '),
        limitMathPart('0'),
        limitTextPart(' on the principal branch.'),
      ]),
      [
        limitTextPart('Remaining finite terms are evaluated at '),
        limitMathPart(`${input.variable}=${targetLatex}`),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Conclusion: the complex principal-branch limit is '),
        limitMathPart(formatLimitNumberLatex(input.result.value)),
        limitTextPart('.'),
      ],
    ]),
  ];
}

export function resolveFiniteComplexDomainLimit(input: {
  node: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
}): ComplexDomainLimitAttempt | undefined {
  const principalSqrt = principalSqrtBoundaryLimit({
    node: input.node,
    variable: input.variable,
    target: input.target,
  });
  if (!principalSqrt) {
    return undefined;
  }

  return {
    kind: 'success',
    value: principalSqrt.value,
    exactLatex: formatLimitNumberLatex(principalSqrt.value),
    origin: 'rule-based-symbolic',
    detailSections: principalSqrtDetails({
      result: principalSqrt,
      variable: input.variable,
      target: input.target,
    }),
  };
}
