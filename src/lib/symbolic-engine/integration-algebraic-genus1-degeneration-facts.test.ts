import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1DegenerationFacts } from './integration/algebraic-genus1/degeneration-facts';

const ce = new ComputeEngine();

function facts(latex: string, variable = 'x') {
  return buildAlgebraicGenus1DegenerationFacts(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = facts(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-1 degeneration facts for ${latex}: ${result.reason}`);
  }
  return result;
}

function compact(lines: string[]) {
  return lines.join('\n').replace(/\s+/g, '');
}

describe('algebraic genus-1 degeneration facts', () => {
  it('classifies exact-rational squarefree cubic and quartic curves as genus-1 candidates', () => {
    const cubic = success('\\sqrt{x^3+x+1}');
    expect(cubic).toMatchObject({
      classification: 'exact-squarefree-genus1',
      radicandDegree: 3,
    });
    expect(cubic.readinessNotes.join(' ')).toContain('squarefree');
    expect(compact(cubic.exactSupplementLatex)).toContain('x^3+x+1\\ge0');

    const quartic = success('\\frac{1}{\\sqrt{x^4+x+1}}');
    expect(quartic.classification).toBe('exact-squarefree-genus1');
    expect(quartic.radicandDegree).toBe(4);
  });

  it('detects exact-rational repeated-root radicands as genus-0 degeneration candidates', () => {
    const result = success('\\sqrt{x^3}');
    expect(result.classification).toBe('repeated-root-genus0-degeneration');
    expect(result.repeatedFactorLatex).toContain('x');
    expect(result.squarefreePartLatex).toContain('x');
    expect(result.readinessNotes.join(' ')).toContain('genus-0 degeneration');
  });

  it('guards symbolic cubic curves with squarefree resultant facts', () => {
    const result = success('\\sqrt{a*x^3+b*x^2+c*x+d}');
    const rendered = compact(result.exactSupplementLatex);

    expect(result.classification).toBe('generic-squarefree-genus1');
    expect(result.radicandDegree).toBe(3);
    expect(result.globalFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'leading-coefficient-nonzero', relation: '\\ne0' }),
        expect.objectContaining({ kind: 'genus1-squarefree-resultant-nonzero', relation: '\\ne0' }),
      ]),
    );
    expect(rendered).toContain('a\\ne0');
    expect(rendered).toContain('\\ne0');
  });

  it('guards Legendre-shaped symbolic quartics without expanding live integration', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    const rendered = compact(result.exactSupplementLatex);

    expect(result.classification).toBe('generic-squarefree-genus1');
    expect(result.radicandDegree).toBe(4);
    expect(rendered).toContain('m\\ne0');
    expect(rendered).toContain('\\ne0');
  });

  it('detects symbolic repeated-root degeneration when the resultant vanishes structurally', () => {
    const result = success('\\sqrt{(x-a)^3}');
    expect(result.classification).toBe('repeated-root-genus0-degeneration');
    expect(result.readinessNotes.join(' ')).toContain('resultant vanished');
  });

  it('stops non-genus-1 or unsafe radical inputs through the curve profiler boundary', () => {
    expect(facts('\\sqrt{x^2+1}')).toMatchObject({
      kind: 'stop',
      reason: 'curve-profile-stop',
      profileStop: expect.objectContaining({ reason: 'genus0-radicand' }),
    });
    expect(facts('\\sqrt{x^5+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'curve-profile-stop',
      profileStop: expect.objectContaining({ reason: 'over-cap-radicand-degree' }),
    });
    expect(facts('|x|\\sqrt{x^3+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'curve-profile-stop',
      profileStop: expect.objectContaining({ reason: 'branch-sensitive' }),
    });
  });

  it('does not change current live integration routing for genus-1 radical candidates', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3+x+1}}');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('genus-1');
      expect(result.error).toContain('elliptic');
    }
  });
});
