import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1EndpointReadiness } from './integration/algebraic-genus1/endpoint-readiness';

const ce = new ComputeEngine();

function readiness(latex: string, variable = 'x') {
  return buildAlgebraicGenus1EndpointReadiness(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = readiness(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected endpoint readiness for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 pre-definite endpoint readiness', () => {
  it('records canonical first-kind endpoint and complete-integral readiness', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.readinessKind).toBe('canonical-legendre-template');
    expect(result.endpointRows[0]).toMatchObject({
      intervalLatex: '-1<x<1',
      endpointPolicy: 'excluded-singular-endpoint',
      convergence: 'improper-integrable',
    });
    expect(result.completeIntegralReadiness.join('\n')).toContain('K(m)');
    expect(result.convergenceNotes.join('\n')).toContain('definite integral evaluation is not live');
  });

  it('records third-kind characteristic pole exclusions before definite evaluation', () => {
    const result = success('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.readinessKind).toBe('canonical-legendre-template');
    expect(result.endpointRows.map((row) => row.intervalLatex)).toContain('1-nx^2\\ne0');
    expect(result.completeIntegralReadiness.join('\n')).toContain('Pi(n,m)');
    expect(result.singularityFacts).toContainEqual(expect.objectContaining({
      expressionLatex: '1-nx^2',
      relation: '\\ne0',
    }));
  });

  it('uses exact root branch rows for root-based cubic readiness', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.readinessKind).toBe('exact-root-branch-readiness');
    expect(result.endpointRows.map((row) => row.intervalLatex)).toEqual([
      '\\alpha_{1}<x<\\alpha_{2}',
      'x>\\alpha_{3}',
    ]);
    expect(result.endpointRows.every((row) => row.endpointPolicy === 'closed-radical-endpoint')).toBe(true);
    expect(result.detailLines.join('\n')).toContain('\\alpha_{1}');
  });

  it('marks reciprocal radical exact-root endpoints as singular readiness facts', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.readinessKind).toBe('exact-root-branch-readiness');
    expect(result.endpointRows.every((row) => row.endpointPolicy === 'excluded-singular-endpoint')).toBe(true);
    expect(result.singularityFacts.length).toBeGreaterThan(0);
    expect(result.exactSupplementEntries[0]).toMatchObject({
      relation: '\\ne0',
      source: 'denominator',
    });
  });

  it('keeps symbolic generic genus-1 endpoint ordering deferred', () => {
    const result = success('\\sqrt{a*x^3+b*x^2+c*x+d}');

    expect(result.readinessKind).toBe('symbolic-generic-readiness');
    expect(result.endpointRows[0]).toMatchObject({
      endpointPolicy: 'branch-ordering-deferred',
      convergence: 'deferred',
    });
    expect(result.completeIntegralReadiness.join('\n')).toContain('Symbolic complete-integral');
  });

  it('does not make definite genus-1 evaluation live', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');
    expect(result.kind).toBe('error');
  });
});
