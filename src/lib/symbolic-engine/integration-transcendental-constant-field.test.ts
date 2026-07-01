import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  classifyTranscendentalConstantExpression,
  transcendentalConstantFactsToExactSupplementEntries,
  transcendentalConstantFactsToExactSupplementLatex,
  transcendentalConstantFieldFact,
  validateTranscendentalConstantFieldFacts,
  type TranscendentalConstantFieldFact,
} from './integration/transcendental-constant-field';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function classify(latex: string, variable = 'x') {
  return classifyTranscendentalConstantExpression(node(latex), variable);
}

describe('transcendental constant field and proof facts', () => {
  it('classifies exact-rational and target-free symbolic constants', () => {
    const sum = classify('c+d');
    expect(sum.kind).toBe('constant');
    if (sum.kind !== 'constant') {
      throw new Error('expected constant');
    }
    expect(compact(sum.coefficient.latex)).toBe('c+d');
    expect(sum.facts).toEqual([]);

    const product = classify('a*b');
    expect(product.kind).toBe('constant');
    if (product.kind !== 'constant') {
      throw new Error('expected constant');
    }
    expect(compact(product.coefficient.latex)).toBe('ab');
  });

  it('threads denominator facts into exact supplement entries', () => {
    const result = classify('\\frac{1}{a+b}');
    expect(result.kind).toBe('constant');
    if (result.kind !== 'constant') {
      throw new Error('expected constant');
    }

    expect(result.facts).toContainEqual({
      kind: 'denominator-nonzero',
      expressionLatex: 'a+b',
      relation: '\\ne0',
      source: 'denominator',
    });
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } a+b\\ne0']);
  });

  it('keeps the selected variable out of the coefficient field only for that variable', () => {
    expect(classify('x+a')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent',
    });

    const targetFreeInT = classify('x+a', 't');
    expect(targetFreeInT.kind).toBe('constant');
    if (targetFreeInT.kind !== 'constant') {
      throw new Error('expected x+a to be target-free when integrating in t');
    }
    expect(compact(targetFreeInT.coefficient.latex)).toBe('a+x');
  });

  it('rejects constants outside the exact symbolic proof scope', () => {
    expect(classify('2.5')).toMatchObject({ kind: 'stop', reason: 'decimal-coefficient' });
    expect(classify('|a|')).toMatchObject({ kind: 'stop', reason: 'branch-sensitive-carrier' });
    expect(classify('\\sin(a)')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-transcendental-constant',
    });
    expect(classify('\\frac{1}{0}')).toMatchObject({ kind: 'stop', reason: 'zero-denominator' });
  });

  it('normalizes proof facts into the existing exact supplement relation set', () => {
    const facts = [
      transcendentalConstantFieldFact('positive', 'q'),
      transcendentalConstantFieldFact('nonunit', 'q'),
      transcendentalConstantFieldFact('branch-exclusion', '\\ln\\left(x\\right)'),
      transcendentalConstantFieldFact('interval-open-unit', 'u'),
      transcendentalConstantFieldFact('greater-than-one', 's'),
      transcendentalConstantFieldFact('zero', 'D'),
      transcendentalConstantFieldFact('negative', 'E'),
    ];

    const entries = transcendentalConstantFactsToExactSupplementEntries(facts);
    expect(entries).toEqual(expect.arrayContaining([
      { kind: 'condition', expressionLatex: 'q', relation: '>0', source: 'candidate-validation' },
      { kind: 'exclusion', expressionLatex: 'q-1', relation: '\\ne0', source: 'candidate-validation' },
      {
        kind: 'exclusion',
        expressionLatex: '\\ln\\left(x\\right)',
        relation: '\\ne0',
        source: 'candidate-validation',
      },
      { kind: 'condition', expressionLatex: 'u', relation: '>0', source: 'candidate-validation' },
      { kind: 'condition', expressionLatex: '1-u', relation: '>0', source: 'candidate-validation' },
      { kind: 'condition', expressionLatex: 's-1', relation: '>0', source: 'candidate-validation' },
      { kind: 'condition', expressionLatex: 'D', relation: '=0', source: 'candidate-validation' },
      { kind: 'condition', expressionLatex: 'E', relation: '<0', source: 'candidate-validation' },
    ]));

    const lines = transcendentalConstantFactsToExactSupplementLatex(facts) ?? [];
    expect(lines.join('\n')).toContain('q-1\\ne0');
    expect(lines.join('\n')).toContain('\\ln\\left(x\\right)\\ne0');
    expect(lines.join('\n')).toContain('q>0');
    expect(lines.join('\n')).toContain('1-u>0');
    expect(lines.join('\n')).toContain('s-1>0');
    expect(lines.join('\n')).toContain('D=0');
    expect(lines.join('\n')).toContain('E<0');
  });

  it('stops when a proof fact cannot be represented safely', () => {
    const malformed = {
      kind: 'positive',
      expressionLatex: '',
      relation: '>0',
      source: 'proof-obligation',
    } satisfies TranscendentalConstantFieldFact;

    expect(validateTranscendentalConstantFieldFacts([malformed])).toMatchObject({
      kind: 'stop',
      reason: 'unrepresentable-fact',
    });
  });
});
