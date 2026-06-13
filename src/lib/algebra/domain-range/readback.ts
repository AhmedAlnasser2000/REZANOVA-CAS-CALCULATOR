import type {
  DisplayDetailSection,
  SolveDomainConstraint,
} from '../../../types/calculator';

export function domainFactsDetailSection(constraints: SolveDomainConstraint[]): DisplayDetailSection[] | undefined {
  if (constraints.length === 0) {
    return undefined;
  }

  const lines = constraints.map((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return `${constraint.expressionLatex} must stay nonzero.`;
      case 'positive':
        return `${constraint.expressionLatex} must stay positive.`;
      case 'nonnegative':
        return `${constraint.expressionLatex} must stay nonnegative.`;
      case 'expression-interval': {
        const lower = constraint.min === undefined ? '-\\infty' : `${constraint.min}`;
        const upper = constraint.max === undefined ? '\\infty' : `${constraint.max}`;
        return `${constraint.expressionLatex} must stay in ${constraint.minInclusive ? '[' : '('}${lower}, ${upper}${constraint.maxInclusive ? ']' : ')'}.`;
      }
      case 'interval':
        return 'The variable must stay inside the permitted interval.';
      case 'carrier-range':
        return 'The trig carrier target must stay between -1 and 1.';
      case 'carrier-square-range':
        return 'The trig-square carrier target must stay between 0 and 1.';
      case 'exp-positive':
        return 'The exponential carrier target must stay positive.';
    }
  });

  return [{
    title: 'Domain Facts',
    lines,
  }];
}
