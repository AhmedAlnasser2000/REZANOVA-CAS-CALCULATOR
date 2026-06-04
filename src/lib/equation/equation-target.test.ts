import { describe, expect, it } from 'vitest';
import {
  resolveEquationSolveTarget,
  retargetEquationLatexToX,
  rewriteEquationOutcomeTarget,
} from './equation-target';

describe('equation-target', () => {
  it('keeps x as the selected target for ordinary x equations', () => {
    const result = resolveEquationSolveTarget('x+1=3');

    expect(result.status).toBe('ready');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['x']);
    expect(result.selectedTarget).toBe('x');
    expect(result.shouldShowSelector).toBe(false);
  });

  it('discovers safe single-symbol non-x targets', () => {
    const result = resolveEquationSolveTarget('z+1=3');

    expect(result.status).toBe('ready');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['z']);
    expect(result.selectedTarget).toBe('z');
  });

  it('preserves case-sensitive target choices', () => {
    const result = resolveEquationSolveTarget('K+k=8', 'k');

    expect(result.status).toBe('parameterized-unsupported');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['K', 'k']);
    expect(result.selectedTarget).toBe('k');
    expect(result.shouldShowSelector).toBe(true);
  });

  it('filters reserved-only equations away from targets', () => {
    const result = resolveEquationSolveTarget('\\sin\\left(\\pi\\right)=e');

    expect(result.status).toBe('no-target');
    expect(result.candidates).toEqual([]);
    expect(result.message).toContain('reserved');
  });

  it('keeps the imaginary unit out of equation target choices', () => {
    const result = resolveEquationSolveTarget('x+\\imaginaryI=0');

    expect(result.status).toBe('ready');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['x']);
    expect(result.selectedTarget).toBe('x');
    expect(result.analysis.reservedIdentifiers.map((entry) => `${entry.name}:${entry.identifierKind}`))
      .toContain('ImaginaryUnit:reserved-unit');
  });

  it('exposes raw adjacent letters as multiplied single-symbol target choices', () => {
    const result = resolveEquationSolveTarget('mass=5', 's');

    expect(result.status).toBe('parameterized-unsupported');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['a', 'm', 's']);
    expect(result.selectedTarget).toBe('s');
    expect(result.shouldShowSelector).toBe(true);
  });

  it('allows explicit named variables as solve targets', () => {
    const result = resolveEquationSolveTarget('@hello=5');

    expect(result.status).toBe('ready');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['hello']);
    expect(result.selectedTarget).toBe('hello');
  });

  it('allows explicit named variables as symbolic parameters beside supported targets', () => {
    const result = resolveEquationSolveTarget('x+@mass=7', 'x');

    expect(result.status).toBe('parameterized-unsupported');
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['mass', 'x']);
    expect(result.selectedTarget).toBe('x');
    expect(result.analysis.symbols.find((symbol) => symbol.name === 'mass')?.identifierKind).toBe('named-variable');
  });

  it('retargets a safe non-x equation through the x backend', () => {
    expect(retargetEquationLatexToX('z+1=3', 'z').replace(/\s+/g, '')).toBe('x+1=3');
  });

  it('rewrites x backend outcomes back to the selected target', () => {
    const result = rewriteEquationOutcomeTarget({
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=2',
      approxText: 'x ~= 2',
      warnings: [],
    }, 'z');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('z=2');
    expect(result.approxText).toBe('z ~= 2');
  });
});
