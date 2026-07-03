import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1SecondKindDenominatorClearingSurface,
} from './integration/algebraic-genus1/second-kind-denominator-clearing-surface';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindDenominatorClearingSurface(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind denominator-clearing surface for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    JSON.stringify(result.clearingMultiplierNode),
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

describe('algebraic genus-1 second-kind denominator clearing surface', () => {
  it('records denominator clearing evidence for three-real-root raw radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('denominator-clearing-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.denominatorFactorNodes.length).toBeGreaterThan(0);
    expect(result.canPopulateRows).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('denominator-clearing multiplier');
    expect(text(result)).toContain('n_p');
    expect(text(result)).not.toMatch(/RootOf|rootof|blacksquare|mathtip\\{\\error/i);
  });

  it('records denominator clearing evidence for one-real-root complex-pair raw radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.denominatorFactorNodes.length).toBeGreaterThan(0);
    expect(text(result)).toContain('A_alpha_1');
    expect(text(result)).toContain('denominator-clearing multiplier');
  });

  it('threads selected variables through denominator clearing evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.rowBasisNodes.length).toBe(8);
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(text(result)).toContain('row basis count: ');
  });

  it('stops rational-in-radical cases at the matrix node-surface boundary', () => {
    expect(surface('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'matrix-node-surface-stop',
    });
  });
});
