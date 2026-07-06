import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildGruntzSignLimitExtractionContract } from './gruntz-sign-extraction';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('Gruntz sign and limit extraction contract', () => {
  it('turns a divergent positive leading w term into infinity', () => {
    const contract = buildGruntzSignLimitExtractionContract(parse(String.raw`e^x+x^3`));

    expect(contract.supported).toBe(true);
    expect(contract.resultKind).toBe('infinity');
    expect(contract.exactLatex).toBe(String.raw`\infty`);
    expect(contract.detailSections?.[0]?.title).toBe('Gruntz Sign Extraction');
  });

  it('turns a positive-order leading w term into zero', () => {
    const contract = buildGruntzSignLimitExtractionContract(parse(String.raw`x^5/e^x`));

    expect(contract.supported).toBe(true);
    expect(contract.resultKind).toBe('zero');
    expect(contract.exactLatex).toBe('0');
  });

  it('keeps finite residual coefficients exact', () => {
    const contract = buildGruntzSignLimitExtractionContract(
      parse(String.raw`(e^x+x^5)/(e^x-\log(x))`),
    );

    expect(contract.supported).toBe(true);
    expect(contract.resultKind).toBe('finite');
    expect(contract.exactLatex).toBe('1');
  });

  it('branches on one symbolic leading coefficient', () => {
    const contract = buildGruntzSignLimitExtractionContract(parse(String.raw`a e^x`));

    expect(contract.supported).toBe(true);
    expect(contract.resultKind).toBe('casewise');
    expect(contract.cases?.map((row) => row.valueLatex)).toEqual([
      String.raw`\infty`,
      '0',
      String.raw`-\infty`,
    ]);
    expect(contract.exactLatex).toBe(
      String.raw`L=\begin{cases}\infty,&a>0\\0,&a=0\\-\infty,&a<0\end{cases}`,
    );
  });

  it('branches on a two-driver symbolic product within the row cap', () => {
    const contract = buildGruntzSignLimitExtractionContract(parse(String.raw`a b e^x`));

    expect(contract.supported).toBe(true);
    expect(contract.resultKind).toBe('casewise');
    expect(contract.cases).toHaveLength(9);
    expect(contract.exactLatex).toContain('a>0');
    expect(contract.exactLatex).toContain('b<0');
  });

  it('stops symbolic products that would exceed the case row cap', () => {
    const contract = buildGruntzSignLimitExtractionContract(parse(String.raw`a b c e^x`));

    expect(contract.supported).toBe(false);
    expect(contract.stopReason).toContain('too many symbolic cases');
    expect(contract.cases).toHaveLength(27);
    expect(contract.detailSections?.[0]?.title).toBe('Limit Case Explosion');
  });

  it('threads principal-branch evidence through complex-mode extraction', () => {
    const contract = buildGruntzSignLimitExtractionContract(
      parse(String.raw`\sqrt{x^2+x}`),
      'x',
      'posInfinity',
      { domain: 'complex-principal' },
    );

    expect(contract.supported).toBe(true);
    expect(contract.branchAssumptions?.map((assumption) => assumption.reason))
      .toContain('principal square-root branch');
  });
});
