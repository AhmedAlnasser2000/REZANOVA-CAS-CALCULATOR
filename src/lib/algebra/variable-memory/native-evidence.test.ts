import { describe, expect, it } from 'vitest';
import { applyStoredVariableSubstitutions } from './substitution';
import { applyCalculateStoredVariableSubstitutions } from '../../modes/calculate/stored-values';
import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';

const entries = [{ name: 'a', valueLatex: String.raw`\frac{1}{3}`, numericValue: 1 / 3 }];
const prove = (canonicalLatex: string, mathJson: unknown) => requireProvenCanonicalMathValueV2({
  canonicalLatex, mathJson, owner: 'calculate', routeId: 'calculate.arithmetic', source: 'native-substitution-test',
});

describe('stored-value native evidence', () => {
  it('retains the exact value and binding trees used by substitution, independently of the approximate number', () => {
    const snapshot = structuredClone(entries);
    const result = applyStoredVariableSubstitutions('a+x', entries);
    expect(result.substitutions).toEqual(entries);
    expect(result.mathJsonLeaves).toHaveLength(3);
    for (const leaf of result.mathJsonLeaves ?? []) expect(() => prove(leaf.canonicalLatex, leaf.mathJson)).not.toThrow();
    expect(JSON.stringify(result.mathJson)).not.toContain('0.333333');
    expect(entries).toEqual(snapshot);
    expect(structuredClone(result)).toEqual(result);
  });

  it('keeps protected symbols and the owned request when no substitution is allowed', () => {
    const result = applyStoredVariableSubstitutions('a+x', entries, { protectedNames: ['a'] });
    expect(result.substitutions).toEqual([]);
    expect(result.protectedSubstitutions).toEqual(entries);
    expect(result.mathJson).toBeDefined();
    expect(() => prove(result.latex, result.mathJson)).not.toThrow();
  });

  it('reconstructs derivative-at-point requests from their native body and point', () => {
    const result = applyCalculateStoredVariableSubstitutions(
      String.raw`\left.\frac{\mathrm{d}}{\mathrm{d}x}\left(ax^2\right)\right|_{x=2}`, entries, ['x'], 'Derivative',
    );
    expect(result.substitutions).toEqual(entries);
    expect(() => prove(result.latex, result.mathJson)).not.toThrow();
    expect(result.mathJsonLeaves?.some(leaf => leaf.source === 'stored-value:derivative-request')).toBe(true);
  });
});
