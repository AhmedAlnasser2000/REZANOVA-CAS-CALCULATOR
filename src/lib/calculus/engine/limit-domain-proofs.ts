import type { OneSidedDomainCheck } from '../../algebra/domain-range-core';
import type { DisplayDetailSection, LimitDirection } from '../../../types/calculator';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from '../../symbolic-engine/limits/detail-readback';
import { domainCheckDetails, limitValueToLatex } from './shared';

function sideLabel(side: Exclude<LimitDirection, 'two-sided'>) {
  return side === 'left' ? 'left-hand' : 'right-hand';
}

function sideApproachLatex(input: {
  variable: string;
  target: number;
  side: Exclude<LimitDirection, 'two-sided'>;
}) {
  return `${input.variable}\\to ${limitValueToLatex(input.target)}^{${input.side === 'left' ? '-' : '+'}}`;
}

function requirementLatex(constraint: OneSidedDomainCheck['constraints'][number]) {
  switch (constraint.kind) {
    case 'nonzero':
      return `${constraint.expressionLatex}\\ne 0`;
    case 'positive':
      return `${constraint.expressionLatex}>0`;
    case 'nonnegative':
      return `${constraint.expressionLatex}\\ge 0`;
    case 'expression-interval': {
      const lower = constraint.min === undefined
        ? '-\\infty'
        : `${constraint.min}`;
      const upper = constraint.max === undefined
        ? '\\infty'
        : `${constraint.max}`;
      return `${constraint.minInclusive ? '[' : '('}${lower},${upper}${constraint.maxInclusive ? ']' : ')'}`;
    }
    case 'interval': {
      const lower = constraint.min === undefined
        ? '-\\infty'
        : `${constraint.min}`;
      const upper = constraint.max === undefined
        ? '\\infty'
        : `${constraint.max}`;
      return `${constraint.variable}\\in ${constraint.minInclusive ? '[' : '('}${lower},${upper}${constraint.maxInclusive ? ']' : ')'}`;
    }
    case 'carrier-range':
      return `-1\\le ${constraint.carrier}\\le 1`;
    case 'carrier-square-range':
      return `0\\le ${constraint.carrier}\\le 1`;
    case 'exp-positive':
      return 'e^{u}>0';
  }
}

function violatedRequirementLatex(check: Extract<OneSidedDomainCheck, { kind: 'outside-domain' }>) {
  const { constraint } = check.violation;
  if (
    constraint.kind === 'nonzero'
    || constraint.kind === 'positive'
    || constraint.kind === 'nonnegative'
    || constraint.kind === 'expression-interval'
    || constraint.kind === 'interval'
    || constraint.kind === 'carrier-range'
    || constraint.kind === 'carrier-square-range'
    || constraint.kind === 'exp-positive'
  ) {
    return requirementLatex(constraint);
  }
  return undefined;
}

function constraintSubjectLatex(
  constraint: OneSidedDomainCheck['constraints'][number],
) {
  switch (constraint.kind) {
    case 'nonzero':
    case 'positive':
    case 'nonnegative':
    case 'expression-interval':
      return constraint.expressionLatex;
    case 'interval':
      return constraint.variable;
    case 'carrier-range':
    case 'carrier-square-range':
      return constraint.carrier;
    case 'exp-positive':
      return undefined;
  }
}

function typedDomainCheckSections(
  sections: readonly DisplayDetailSection[],
  check: OneSidedDomainCheck,
) {
  const subjects = check.constraints
    .map(constraintSubjectLatex)
    .filter((subject): subject is string => Boolean(subject));

  return sections.map((section) => limitDetailSection(
    section.title,
    section.lines.map((line, index) => {
      const existing = section.lineParts?.[index];
      if (existing?.length) {
        return existing;
      }

      const subject = subjects.find((candidate) => line.startsWith(candidate));
      return subject
        ? [limitMathPart(subject), limitTextPart(line.slice(subject.length))]
        : [limitTextPart(line)];
    }),
  ));
}

function domainProofSection(input: {
  check: Extract<OneSidedDomainCheck, { kind: 'outside-domain' }>;
  variable: string;
  target: number;
  side: Exclude<LimitDirection, 'two-sided'>;
}): DisplayDetailSection {
  const requirement = violatedRequirementLatex(input.check);
  return limitDetailSection('Domain Proof', [
    [limitTextPart(`Form detected: ${sideLabel(input.side)} real-domain boundary.`)],
    [
      limitTextPart('Approach: '),
      limitMathPart(sideApproachLatex(input)),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Requirement: '),
      requirement
        ? limitMathPart(requirement)
        : limitTextPart('a real-domain constraint must hold'),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Key calculation: this side '),
      limitTextPart(input.check.violation.message),
      limitTextPart('.'),
    ],
    [
      limitTextPart(`Conclusion: the ${sideLabel(input.side)} behavior is outside the real domain, so the real limit stops here.`),
    ],
  ]);
}

export function limitDomainCheckDetails(input: {
  check: OneSidedDomainCheck;
  variable: string;
  target: number;
  side: Exclude<LimitDirection, 'two-sided'>;
}): DisplayDetailSection[] {
  const base = typedDomainCheckSections(
    domainCheckDetails(undefined, input.check) ?? [],
    input.check,
  );
  if (input.check.kind !== 'outside-domain') {
    return base;
  }

  return [
    ...base,
    domainProofSection({
      check: input.check,
      variable: input.variable,
      target: input.target,
      side: input.side,
    }),
  ];
}
