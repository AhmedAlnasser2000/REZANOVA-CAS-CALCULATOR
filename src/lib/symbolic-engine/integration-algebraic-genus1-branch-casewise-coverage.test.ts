import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1BranchCasewiseCoverage,
} from './integration/algebraic-genus1/branch-casewise-coverage';

const ce = new ComputeEngine();

function coverage(latex: string, variable = 'x') {
  return buildAlgebraicGenus1BranchCasewiseCoverage(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = coverage(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected branch casewise coverage for ${latex}: ${result.detail}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.radicandLatex,
    result.rows.map((row) => `${row.conditionLatex}:${row.radicandSignLatex}:${row.realRadicalStatus}`).join('\n'),
    ...result.endpointExclusionsLatex,
    ...result.readinessNotes,
    ...result.proofObligations,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? [])
        .flat()
        .map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 branch casewise coverage', () => {
  it('packages cubic radical sign rows as capped casewise evidence', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('branch-casewise-ready');
    expect(result.branchRowCap).toBe(12);
    expect(result.rootCount).toBe(3);
    expect(result.rows).toHaveLength(4);
    expect(result.realValuedRows.map((row) => row.conditionLatex)).toEqual([
      '\\alpha_{1}<x<\\alpha_{2}',
      'x>\\alpha_{3}',
    ]);
    expect(result.realValuedRows.every((row) => row.endpointPolicy === 'included-where-radicand-zero')).toBe(true);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('casewise coverage');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('preserves reciprocal-radical endpoint exclusions in casewise rows', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-2*x^2)}}');

    expect(result.rows).toHaveLength(5);
    expect(result.realValuedRows.map((row) => row.conditionLatex)).toEqual([
      'x<\\alpha_{1}',
      '\\alpha_{2}<x<\\alpha_{3}',
      'x>\\alpha_{4}',
    ]);
    expect(result.endpointExclusionsLatex).toHaveLength(4);
    expect(result.endpointExclusionsLatex.join('\n')).toContain('x-\\alpha_{1}\\ne0');
    expect(result.realValuedRows.every((row) => row.endpointPolicy === 'excluded')).toBe(true);
  });

  it('threads selected variables through branch casewise evidence', () => {
    const result = success('\\sqrt{t^3+t+1}', 't');

    expect(result.variable).toBe('t');
    expect(result.realValuedRows.map((row) => row.conditionLatex)).toEqual(['t>\\alpha_{1}']);
    expect(text(result)).not.toContain('x>');
  });

  it('stops symbolic branch formulas until their casewise surface is capped', () => {
    const result = coverage('\\sqrt{a*x^3+b*x^2+c*x+d}');

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
});
