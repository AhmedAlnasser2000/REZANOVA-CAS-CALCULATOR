import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1NamedRootReadback } from './integration/algebraic-genus1/named-root-readback';

const ce = new ComputeEngine();

function readback(latex: string, variable = 'x') {
  return buildAlgebraicGenus1NamedRootReadback(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = readback(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected named-root readback for ${latex}`);
  }
  return result;
}

function allText(result: ReturnType<typeof success>) {
  return [
    result.radicandLatex,
    ...result.rootSymbolsLatex,
    ...result.detailSections.flatMap((section) => [section.title, ...section.lines]),
    ...result.readinessNotes,
  ].join('\n');
}

describe('algebraic genus-1 named-root readback', () => {
  it('renders exact cubic real roots as detail-only alpha definitions', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.rootSymbolsLatex).toEqual([
      '\\alpha_{1}',
      '\\alpha_{2}',
      '\\alpha_{3}',
    ]);
    expect(result.detailSections[0]).toMatchObject({
      title: 'Genus-1 Root Definitions',
    });
    expect(result.detailSections[0].lines[0]).toContain('P\\left(x\\right)');
    expect(result.detailSections[0].lines.join('\n')).toContain('\\alpha_{1}\\text{ is the unique real root');
    expect(result.detailSections[0].lines.at(-1)).toContain('\\alpha_{1}<\\alpha_{2}<\\alpha_{3}');
    expect(allText(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('keeps reciprocal-radical endpoint exclusions in a separate detail section', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-2*x^2)}}');

    const endpointSection = result.detailSections.find((section) => section.title === 'Endpoint Exclusions');
    expect(endpointSection).toBeTruthy();
    expect(endpointSection?.lines).toContain('x-\\alpha_{1}\\ne0');
    expect(endpointSection?.lines).toContain('x-\\alpha_{4}\\ne0');
    expect(result.realDomainRows.map((row) => row.intervalLatex)).toEqual([
      'x<\\alpha_{1}',
      '\\alpha_{2}<x<\\alpha_{3}',
      'x>\\alpha_{4}',
    ]);
    expect(allText(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('supports selected-variable root definitions without assuming x', () => {
    const result = success('\\sqrt{t^3+t+1}', 't');

    expect(result.detailSections[0].lines[0]).toContain('P\\left(t\\right)');
    expect(result.realDomainRows.map((row) => row.intervalLatex)).toEqual(['t>\\alpha_{1}']);
    expect(allText(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('stops symbolic named-root readback until branch formulas are capped', () => {
    const result = readback('\\sqrt{a*x^3+b*x^2+c*x+d}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'branch-facts-stop',
    });
    if (result.kind === 'stop') {
      expect(result.branchFacts).toMatchObject({
        kind: 'stop',
        reason: 'symbolic-branch-deferred',
      });
    }
  });

  it('preserves current integration behavior for genus-1 radicals', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('genus-1');
      expect(result.error).toContain('elliptic');
    }
  });
});
