import { describe, expect, it } from 'vitest';
import {
  classifyEquationNumericShape,
} from '../equation';
import {
  equationToZeroFormLatex,
  evaluateLatexAtTarget,
} from '../../equation/domain-guards';

function factMessages(result: ReturnType<typeof classifyEquationNumericShape>) {
  return result.domainFacts.map((fact) => fact.message);
}

describe('Equation numeric shape classifier', () => {
  it('classifies stored-value-ready linear equations as deterministic algebraic', () => {
    const result = classifyEquationNumericShape({
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });

    expect(result.numericReady).toBe(true);
    expect(result.selectedTarget).toBe('z');
    expect(result.effectiveLatex).toBe('z+2=5');
    expect(result.unresolvedNonTargetSymbols).toEqual([]);
    expect(result.route).toBe('deterministic-algebraic');
    expect(result.intervalNeed).toBe('none');
    expect(result.substitution.usedStoredValues).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
  });

  it('blocks numeric readiness when unresolved non-target symbols remain', () => {
    const result = classifyEquationNumericShape({
      equationLatex: 'z+a+b=5',
      equationSolveTarget: 'z',
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });

    expect(result.numericReady).toBe(false);
    expect(result.effectiveLatex).toBe('b+z+2=5');
    expect(result.unresolvedNonTargetSymbols).toEqual(['b']);
    expect(result.route).toBe('unsupported-non-evaluable');
  });

  it('evaluates zero forms at the selected target instead of assuming x', () => {
    const zeroForm = equationToZeroFormLatex('t^2-4=0');
    const evaluated = evaluateLatexAtTarget(zeroForm, 't', 2);

    expect(zeroForm).toBe('t^2-4');
    expect(evaluated.value).toBeCloseTo(0, 12);
  });

  it('classifies mixed algebraic-trig equations as nonlinear search', () => {
    const result = classifyEquationNumericShape({
      equationLatex: 'z^2+\\sin(z)=2',
      equationSolveTarget: 'z',
    });

    expect(result.numericReady).toBe(true);
    expect(result.route).toBe('nonlinear-search');
    expect(result.intervalNeed).toBe('recommended');
    expect(result.domainFacts.some((fact) => fact.kind === 'periodic-carrier')).toBe(true);
  });

  it('classifies single-carrier trig equations as periodic interval problems', () => {
    const result = classifyEquationNumericShape({
      equationLatex: '\\sin(z)=0',
      equationSolveTarget: 'z',
    });

    expect(result.numericReady).toBe(true);
    expect(result.route).toBe('periodic-interval');
    expect(result.intervalNeed).toBe('required');
    expect(result.domainFacts.some((fact) => fact.kind === 'periodic-carrier')).toBe(true);
  });

  it('collects internal discontinuity and log-domain facts', () => {
    const result = classifyEquationNumericShape({
      equationLatex: '\\ln(z-1)+\\frac{1}{z-2}=3',
      equationSolveTarget: 'z',
    });

    expect(result.route).toBe('discontinuity-heavy');
    expect(factMessages(result)).toEqual(expect.arrayContaining([
      'z-2 \\ne0',
      'z-1 >0',
    ]));
  });

  it('collects internal even-root domain facts', () => {
    const result = classifyEquationNumericShape({
      equationLatex: '\\sqrt{z+1}=2',
      equationSolveTarget: 'z',
    });

    expect(result.numericReady).toBe(true);
    expect(result.route).toBe('nonlinear-search');
    expect(factMessages(result)).toContain('z+1 \\ge0');
  });
});
