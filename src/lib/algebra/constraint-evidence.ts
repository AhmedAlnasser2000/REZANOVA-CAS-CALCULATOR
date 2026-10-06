import type { SolveDomainConstraint, SerializableMathJson } from '../../types/calculator';
import { mergeExactSupplementEntries, renderExactSupplementLatex } from './exact-supplements';

/** Native constraints supply truth; the existing formatter supplies only grouping/labels. */
export function constraintSupplementEvidence(constraints: readonly SolveDomainConstraint[]) {
  const entries = mergeExactSupplementEntries({ constraints: [...constraints] });
  return (['exclusion', 'condition'] as const).flatMap(role => {
    const selected = entries.filter(entry => entry.kind === role);
    if (!selected.length) return [];
    const nodes = selected.map(entry => {
      if (!('expressionLatex' in entry)) throw new Error('Expected a relational constraint.');
      const kind = entry.relation === '\\ne0' ? 'nonzero' : entry.relation === '>0' ? 'positive' : 'nonnegative';
      const native = constraints.find(c => c.kind === kind && 'expressionLatex' in c
        && c.expressionLatex.trim() === entry.expressionLatex);
      if (!native || !('expressionMathJson' in native) || native.expressionMathJson === undefined) {
        throw new Error('Native constraint is missing its mathematical expression.');
      }
      const operator = kind === 'nonzero' ? 'NotEqual' : kind === 'positive' ? 'Greater' : 'GreaterEqual';
      return [operator, native.expressionMathJson, 0] as SerializableMathJson;
    });
    const presentationLatex = renderExactSupplementLatex(selected)[0];
    const mathJson: SerializableMathJson = nodes.length === 1 ? nodes[0] : ['And', ...nodes];
    return [{ role, presentationLatex, mathJson }];
  });
}
