import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildGruntzLimitExtractionContract,
  buildGruntzMrvSet,
  buildGruntzRewriteToWContract,
  compareGruntzScales,
} from './gruntz-foundation';

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
    });
    expect(contract.rewrittenLatex).toContain(String.raw`\frac{1}{w}`);
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
});
