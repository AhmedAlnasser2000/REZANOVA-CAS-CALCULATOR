import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1NormalForm } from './integration/algebraic-genus1/normal-form';

const ce = new ComputeEngine();

function normalForm(latex: string, variable = 'x') {
  return buildAlgebraicGenus1NormalForm(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = normalForm(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-1 normal-form evidence for ${latex}`);
  }
  return result;
}

function entryExpression(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return '';
  }
  if ('expressionLatex' in entry && typeof entry.expressionLatex === 'string') {
    return entry.expressionLatex;
  }
  if ('latex' in entry && typeof entry.latex === 'string') {
    return entry.latex;
  }
  return '';
}

function entryRelation(entry: unknown) {
  return entry && typeof entry === 'object' && 'relation' in entry && typeof entry.relation === 'string'
    ? entry.relation
    : '';
}

describe('algebraic genus-1 normal-form readiness', () => {
  it('recognizes canonical first-kind Legendre normal form', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.normalFormKind).toBe('legendre-first-kind');
    expect(result.legendreData).toMatchObject({
      head: 'EllipticF',
      amplitudeLatex: '\\arcsin(x)',
      parameterLatex: 'm',
      multiplierLatex: '1',
      inverseMapLatex: 'x=\\sin\\phi',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)',
    });
    expect(result.detailSections.find((section) =>
      section.title === 'Legendre Normal Form')?.lineKind).toBe('math');
    expect(result.exactSupplementEntries.map(entryExpression)).toContain('1-x^2');
    expect(result.exactSupplementEntries.map(entryExpression)).toContain('1-mx^2');
  });

  it('recognizes canonical second-kind Legendre normal form', () => {
    const result = success('\\sqrt{\\frac{1-m*x^2}{1-x^2}}');

    expect(result.normalFormKind).toBe('legendre-second-kind');
    expect(result.legendreData).toMatchObject({
      head: 'EllipticE',
      amplitudeLatex: '\\arcsin(x)',
      parameterLatex: 'm',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)',
    });
  });

  it('recognizes canonical third-kind Legendre normal form', () => {
    const result = success('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.normalFormKind).toBe('legendre-third-kind');
    expect(result.legendreData).toMatchObject({
      head: 'EllipticPi',
      amplitudeLatex: '\\arcsin(x)',
      parameterLatex: 'm',
      characteristicLatex: 'n',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)',
    });
    expect(result.exactSupplementEntries).toContainEqual(expect.objectContaining({
      expressionLatex: '1-nx^2',
      relation: '\\ne0',
    }));
  });

  it('keeps exact cubic curves in root-based readiness without live adoption', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.normalFormKind).toBe('root-based-readiness');
    expect(result.detailSections[0].title).toBe('Genus-1 Root Definitions');
    expect(result.detailSections[0].lines.join('\n')).toContain('\\alpha_{1}');
    expect(result.readinessNotes.join('\n')).toContain('differential-basis reduction');
  });

  it('keeps generic symbolic cubic curves readiness-only with explicit facts', () => {
    const result = success('\\sqrt{a*x^3+b*x^2+c*x+d}');

    expect(result.normalFormKind).toBe('symbolic-generic-readiness');
    expect(result.detailSections[0].title).toBe('Symbolic Genus-1 Readiness');
    expect(result.exactSupplementEntries.some((entry) => entryRelation(entry) === '\\ne0')).toBe(true);
    expect(result.readinessNotes.join('\n')).toContain('Symbolic Legendre data is readiness-only');
  });

  it('keeps generic exact curves non-live while canonical templates are adopted elsewhere', () => {
    const firstKind = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    const cubic = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(firstKind.kind).toBe('success');
    expect(cubic.kind).toBe('error');
  });
});
