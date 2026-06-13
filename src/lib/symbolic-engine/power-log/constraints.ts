import type { SolveDomainConstraint } from '../../../types/calculator';

export function mergeConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

export function buildConditionSupplement(constraints: SolveDomainConstraint[]) {
  const supported = constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'nonnegative':
        return [`${constraint.expressionLatex}\\ge0`];
      case 'positive':
        return [`${constraint.expressionLatex}>0`];
      default:
        return [];
    }
  });

  if (supported.length === 0) {
    return [] as string[];
  }

  return [`\\text{Conditions: } ${supported.join(',\\;')}`];
}
