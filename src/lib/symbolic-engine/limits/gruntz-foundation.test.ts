import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildGruntzLimitExtractionContract,
  buildGruntzMrvSet,
  buildGruntzRewriteToWContract,
  compareGruntzScales,
} from './gruntz-foundation';
import { buildGruntzSeriesInWContract } from './gruntz-series-w';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('Gruntz foundation contracts', () => {
  it('extracts an MRV set with dominant exponential scale evidence', () => {
    const set = buildGruntzMrvSet(parse(String.raw`e^{\sqrt{x}}/x^5`));

    const dominant = set.atoms.find((atom) => atom.id === set.dominantAtomId);
    expect(dominant?.latex).toBe(String.raw`e^{\sqrt{x}}`);
    expect(dominant?.kind).toBe('exponential');
    expect(set.atoms.map((atom) => atom.latex)).toContain(String.raw`x^{5}`);
    expect(set.comparabilityClasses[0]?.representativeLatex).toBe(String.raw`e^{\sqrt{x}}`);
    expect(set.evidenceRows.flat().map((part) => part.kind === 'math' ? part.latex : part.text).join(' '))
      .toContain('MRV atom');
  });

  it('tracks target-free symbolic coefficient drivers on MRV atoms', () => {
    const set = buildGruntzMrvSet(parse(String.raw`a e^x+b x^2`));

    expect(set.coefficientDrivers.map((driver) => driver.latex).sort()).toEqual(['a', 'b']);
    expect(set.coefficientDrivers.find((driver) => driver.latex === 'a')?.branchConditions)
      .toEqual(['a>0', 'a=0', 'a<0']);
    expect(set.atoms.find((atom) => atom.latex === String.raw`e^{x}`)?.coefficient?.latex)
      .toBe('a');
    expect(set.atoms.find((atom) => atom.latex === String.raw`x^{2}`)?.coefficient?.latex)
      .toBe('b');
    expect(set.comparabilityClasses[0]?.representativeLatex).toBe(String.raw`e^{x}`);
  });

  it('records principal-branch assumptions for complex MRV inspection', () => {
    const set = buildGruntzMrvSet(
      parse(String.raw`\sqrt{x^2+x}+\log(x)`),
      'x',
      'posInfinity',
      { domain: 'complex-principal' },
    );

    expect(set.domain).toBe('complex-principal');
    expect(set.branchAssumptions.map((assumption) => assumption.reason))
      .toEqual(expect.arrayContaining([
        'principal square-root branch',
        'principal logarithm branch',
      ]));
    expect(set.evidenceRows.flat().map((part) => part.kind === 'math' ? part.latex : part.text).join(' '))
      .toContain('principal square-root branch');
  });

  it('keeps parameter metadata when comparing Gruntz scales', () => {
    const comparison = compareGruntzScales(parse(String.raw`a e^x`), parse(String.raw`x^2`));

    expect(comparison.comparability).toBe('dominates');
    expect(comparison.left?.coefficient?.latex).toBe('a');
  });

  it('does not treat exact numeric scale factors as symbolic branch drivers', () => {
    const set = buildGruntzMrvSet(parse(String.raw`-2 e^x+x`));

    expect(set.atoms.find((atom) => atom.latex === String.raw`e^{x}`)?.coefficient?.latex)
      .toBe('-2');
    expect(set.coefficientDrivers).toEqual([]);
  });

  it('orders the pre-Gruntz comparability chain', () => {
    expect(compareGruntzScales(parse(String.raw`\log(\log(x))`), parse(String.raw`\log(x)`)).comparability)
      .toBe('dominated-by');
    expect(compareGruntzScales(parse(String.raw`\log(x)`), parse(String.raw`x^5`)).comparability)
      .toBe('dominated-by');
    expect(compareGruntzScales(parse(String.raw`x^5`), parse(String.raw`e^{\sqrt{x}}`)).comparability)
      .toBe('dominated-by');
    expect(compareGruntzScales(parse(String.raw`e^{\sqrt{x}}`), parse(String.raw`e^x`)).comparability)
      .toBe('dominated-by');
  });

  it('builds a rewrite-to-w contract around the dominant MRV atom', () => {
    const contract = buildGruntzRewriteToWContract(parse(String.raw`e^x+x^3`));

    expect(contract.supported).toBe(true);
    expect(contract.wLatex).toBe(String.raw`e^{-x}`);
    expect(contract.wLimitLatex).toBe('0^+');
    expect(contract.substitutions[0]).toMatchObject({
      fromLatex: String.raw`e^{x}`,
      toLatex: String.raw`\frac{1}{w}`,
      role: 'dominant-atom',
    });
    expect(contract.rewrittenLatex).toContain(String.raw`\frac{1}{w}`);
    expect(contract.rewrittenLatex).toContain(String.raw`\left(-\log(w)\right)^{3}`);
    expect(contract.evidenceRows?.flat().map((part) => part.kind === 'math' ? part.latex : part.text).join(' '))
      .toContain('Transformed expression');
  });

  it('rewrites every occurrence of the chosen MRV atom and preserves parameter conditions', () => {
    const contract = buildGruntzRewriteToWContract(parse(String.raw`(a e^x+x^3)/(e^x-1)`));

    expect(contract.supported).toBe(true);
    expect(contract.coefficientDrivers?.map((driver) => driver.latex)).toEqual(['a']);
    expect(contract.parameterConditions).toEqual(['a>0', 'a=0', 'a<0']);
    expect(contract.rewrittenLatex?.match(/\\frac\{1\}\{w\}/gu)?.length).toBe(2);
  });

  it('threads principal branch evidence through rewrite-to-w contracts', () => {
    const contract = buildGruntzRewriteToWContract(
      parse(String.raw`\sqrt{x^2+x}+\log(x)`),
      'x',
      'posInfinity',
      { domain: 'complex-principal' },
    );

    expect(contract.supported).toBe(true);
    expect(contract.branchAssumptions?.map((assumption) => assumption.reason))
      .toEqual(expect.arrayContaining([
        'principal square-root branch',
        'principal logarithm branch',
      ]));
  });

  it('extracts quotient limit contracts without enabling a public solver route', () => {
    const dominated = buildGruntzLimitExtractionContract(parse(String.raw`\log(\log(x))/\log(x)`));
    const dominant = buildGruntzLimitExtractionContract(parse(String.raw`e^x/x^5`));
    const sameClass = buildGruntzLimitExtractionContract([
      'Divide',
      parse(String.raw`e^x`),
      parse(String.raw`e^x`),
    ]);

    expect(dominated).toMatchObject({
      supported: true,
      resultKind: 'zero',
      exactLatex: '0',
    });
    expect(dominated.evidence.join(' ')).toContain('denominator scale dominates');

    expect(dominant).toMatchObject({
      supported: true,
      resultKind: 'infinity',
      exactLatex: String.raw`\infty`,
      signKnowledge: 'positive',
    });

    expect(sameClass).toMatchObject({
      supported: true,
      resultKind: 'finite-residual',
      signKnowledge: 'positive',
    });
  });

  it('extracts a leading term in w from a dominant exponential sum', () => {
    const contract = buildGruntzSeriesInWContract(parse(String.raw`e^x+x^3`));

    expect(contract.supported).toBe(true);
    expect(contract.leadingOrder).toBe(-1);
    expect(contract.leadingCoefficientLatex).toBe('1');
    expect(contract.evidenceRows?.flat().map((part) => part.kind === 'math' ? part.latex : part.text).join(' '))
      .toContain('Leading term in w');
  });

  it('preserves parameter conditions through leading term extraction in w', () => {
    const contract = buildGruntzSeriesInWContract(parse(String.raw`(a e^x+x^3)/(e^x-1)`));

    expect(contract.supported).toBe(true);
    expect(contract.leadingOrder).toBe(0);
    expect(contract.leadingCoefficientLatex).toBe('a');
    expect(contract.parameterConditions).toEqual(['a>0', 'a=0', 'a<0']);
  });

  it('extracts the residual leading coefficient for matching exponential quotients', () => {
    const contract = buildGruntzSeriesInWContract(parse(String.raw`(e^x+x^5)/(e^x-\log(x))`));

    expect(contract.supported).toBe(true);
    expect(contract.leadingOrder).toBe(0);
    expect(contract.leadingCoefficientLatex).toBe('1');
  });
});
