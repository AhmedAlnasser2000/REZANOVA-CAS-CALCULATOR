import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result-detail-lines';

function intervalLatex(constraint: Extract<SolveDomainConstraint, { kind: 'expression-interval' }>) {
  const lower = constraint.min === undefined ? '-\\infty' : `${constraint.min}`;
  const upper = constraint.max === undefined ? '\\infty' : `${constraint.max}`;
  return `${constraint.minInclusive ? '[' : '('}${lower}, ${upper}${constraint.maxInclusive ? ']' : ')'}`;
}

function domainConstraintParts(constraint: SolveDomainConstraint): DisplayDetailLinePart[] {
  switch (constraint.kind) {
    case 'nonzero':
      return [mathPart(constraint.expressionLatex), textPart(' must stay nonzero.')];
    case 'positive':
      return [mathPart(constraint.expressionLatex), textPart(' must stay positive.')];
    case 'nonnegative':
      return [mathPart(constraint.expressionLatex), textPart(' must stay nonnegative.')];
    case 'expression-interval':
      return [
        mathPart(constraint.expressionLatex),
        textPart(' must stay in '),
        mathPart(intervalLatex(constraint)),
        textPart('.'),
      ];
    case 'interval':
      return [textPart('The variable must stay inside the permitted interval.')];
    case 'carrier-range':
      return [
        textPart('The trig carrier target must stay between '),
        mathPart('-1'),
        textPart(' and '),
        mathPart('1'),
        textPart('.'),
      ];
    case 'carrier-square-range':
      return [
        textPart('The trig-square carrier target must stay between '),
        mathPart('0'),
        textPart(' and '),
        mathPart('1'),
        textPart('.'),
      ];
    case 'exp-positive':
      return [textPart('The exponential carrier target must stay positive.')];
  }
}

export function domainFactsDetailSection(constraints: SolveDomainConstraint[]): DisplayDetailSection[] | undefined {
  if (constraints.length === 0) {
    return undefined;
  }

  return [mixedDetailSection('Domain Facts', constraints.map(domainConstraintParts))];
}
