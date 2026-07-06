import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildGruntzRecursiveEvaluatorContract } from './gruntz-recursive-evaluator';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('Gruntz recursive evaluator contract', () => {
  it('keeps direct sign extraction as the first recursive route', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(parse(String.raw`e^{\sqrt{x}}/x^5`));

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('direct-sign-extraction');
    expect(contract.exactLatex).toBe(String.raw`\infty`);
  });

  it('cleans residual exponential quotients by evaluating the exponent difference', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(parse(String.raw`e^x/e^{x+\log(x)}`));

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('exponential-quotient');
    expect(contract.exactLatex).toBe('0');
    expect(contract.transformedLatex).toBe(String.raw`e^{-\log(x)}`);
    expect(contract.children?.[0]?.route).toBe('exponential-exponent');
  });

  it('handles nested exponential quotient towers through the same recursive route', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(
      parse(String.raw`e^{e^x}/e^{e^x+x}`),
    );

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('exponential-quotient');
    expect(contract.exactLatex).toBe('0');
    expect(contract.transformedLatex).toBe(String.raw`e^{-x}`);
  });

  it('turns a positive exponent residual into infinity', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(parse(String.raw`e^{x+\log(x)}/e^x`));

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('exponential-quotient');
    expect(contract.exactLatex).toBe(String.raw`\infty`);
    expect(contract.transformedLatex).toBe(String.raw`e^{\log(x)}`);
  });

  it('branches parameterized exponential exponents without guessing a sign', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(parse(String.raw`e^{a x}`));

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('exponential-exponent');
    expect(contract.resultKind).toBe('casewise');
    expect(contract.cases?.map((row) => row.valueLatex)).toEqual([
      String.raw`\infty`,
      '1',
      '0',
    ]);
    expect(contract.exactLatex).toBe(
      String.raw`L=\begin{cases}\infty,&a>0\\1,&a=0\\0,&a<0\end{cases}`,
    );
  });

  it('threads principal-branch evidence through recursive complex contracts', () => {
    const contract = buildGruntzRecursiveEvaluatorContract(
      parse(String.raw`e^{\sqrt{x^2+x}}`),
      'x',
      'posInfinity',
      { domain: 'complex-principal' },
    );

    expect(contract.supported).toBe(true);
    expect(contract.branchAssumptions?.map((assumption) => assumption.reason))
      .toContain('principal square-root branch');
  });
});
