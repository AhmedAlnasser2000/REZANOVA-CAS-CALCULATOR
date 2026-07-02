import type { DisplayDetailSection, LimitDirection } from '../../../types/calculator';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
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

function isVariable(node: unknown, variable: string) {
  return node === variable;
}

function isVariableSquared(node: unknown, variable: string) {
  return (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && node[2] === 2
  );
}

function isNegatedVariable(node: unknown, variable: string) {
  return (
    isNodeArray(node)
    && node[0] === 'Negate'
    && node.length === 2
    && isVariable(node[1], variable)
  );
}

function isVariableSquaredPlusVariable(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return false;
  }

  const terms = node.slice(1);
  return terms.some((term) => isVariableSquared(term, variable))
    && terms.some((term) => isVariable(term, variable));
}

function isPrincipalSqrtBoundaryPattern(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return false;
  }

  const terms = node.slice(1);
  const sqrtTerm = terms.find((term) => isNodeArray(term) && term[0] === 'Sqrt' && term.length === 2);
  return Boolean(sqrtTerm)
    && terms.some((term) => isNegatedVariable(term, variable))
    && isNodeArray(sqrtTerm)
    && isVariableSquaredPlusVariable(sqrtTerm[1], variable);
}

function complexUnsupportedDetail(reason: string): DisplayDetailSection[] {
  return [
    limitDetailSection('Complex Domain', [
      [
        limitTextPart(reason),
      ],
      [
        limitTextPart('Complex mode is proof-first for limits, so this route stops instead of guessing from numeric samples.'),
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

export function resolveFiniteComplexDomainLimit(input: {
  node: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
}): ComplexDomainLimitAttempt | undefined {
  if (Math.abs(input.target) > 1e-12) {
    return undefined;
  }

  if (!isPrincipalSqrtBoundaryPattern(input.node, input.variable)) {
    return undefined;
  }

  return {
    kind: 'success',
    value: 0,
    exactLatex: '0',
    origin: 'rule-based-symbolic',
    detailSections: [
      limitDetailSection('Complex Domain', [
        [
          limitTextPart('Complex mode uses the principal square-root branch.'),
        ],
        [
          limitTextPart('Near '),
          limitMathPart(`${input.variable}=0`),
          limitTextPart(', the inner expression '),
          limitMathPart(`${input.variable}^2+${input.variable}`),
          limitTextPart(' tends to '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Therefore '),
          limitMathPart(`\\sqrt{${input.variable}^2+${input.variable}}`),
          limitTextPart(' tends to '),
          limitMathPart('0'),
          limitTextPart(' on the recognized principal-branch path.'),
        ],
        [
          limitTextPart('The remaining term '),
          limitMathPart(`-${input.variable}`),
          limitTextPart(' also tends to '),
          limitMathPart('0'),
          limitTextPart(', so the limit is '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      ]),
    ],
  };
}
