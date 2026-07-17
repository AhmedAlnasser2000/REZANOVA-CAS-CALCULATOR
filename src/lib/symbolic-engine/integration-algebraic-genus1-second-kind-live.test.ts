import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  tryAlgebraicFunctionFieldOrchestrator,
} from './integration/algebraic-function-field-orchestrator';
import { tryAlgebraicGenus1SecondKindLiveRule } from './integration/algebraic-genus1/second-kind-live';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

describe('algebraic genus-1 second-kind live gate', () => {
  it('adopts the selected radical-product regression through a first-kind residual', () => {
    const result = tryAlgebraicGenus1SecondKindLiveRule(
      node('\\sqrt{x^3}\\sqrt{x^2+1}'),
      'x',
    );

    expect(result).toBeDefined();
    expect(result?.kind, JSON.stringify(result, null, 2)).toBe('success');
    if (result?.kind !== 'success') {
      throw new Error('expected live first-kind residual adoption');
    }

    expect(result.exactLatex).toContain('EllipticF');
    expect(result.exactLatex).toContain('\\sqrt{x^3+x}');
    expect(result.exactLatex).toContain('2\\arctan\\sqrt{x}');
    expect(result.exactLatex).not.toContain('A_{\\alpha');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactSupplementLatex.join('\n')).toContain('x\\ge0');
    expect(result.detailSections.map((section) => section.title)).toContain(
      'Genus-1 Cubic Hermite Live Composition',
    );
    expect(result.antiderivativeExpression.kind).toBe('special-function-expression');
  });

  it('fails closed for unresolved true second-kind residuals', () => {
    const result = tryAlgebraicGenus1SecondKindLiveRule(node('\\sqrt{x^3-x}'), 'x');

    expect(result).toMatchObject({
      kind: 'boundary',
    });
    if (result?.kind !== 'boundary') {
      throw new Error('expected controlled second-kind boundary');
    }
    expect(result.error).toContain('second-kind elliptic residual');
    expect(result.detailSections.map((section) => section.title)).toContain(
      'Genus-1 Second-Kind Live Boundary',
    );
  });

  it('threads the controlled boundary through the algebraic orchestrator', () => {
    const result = tryAlgebraicFunctionFieldOrchestrator(node('\\sqrt{x^3-x}'), 'x');

    expect(result?.family).toBe('genus1-second-kind-live');
    expect(result?.resolution.kind).toBe('error');
    if (result?.resolution.kind !== 'error') {
      throw new Error('expected orchestrator boundary');
    }
    expect(result.resolution.detailSections?.map((section) => section.title)).toContain(
      'Genus-1 Second-Kind Live Boundary',
    );
  });
});
