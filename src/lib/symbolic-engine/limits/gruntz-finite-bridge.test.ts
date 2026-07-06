import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildGruntzFiniteTargetBridgeContract } from './gruntz-finite-bridge';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('Gruntz finite-target bridge contract', () => {
  it('bridges a right-hand finite exponential blowup to infinity', () => {
    const contract = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/x}`), 'x', 0, 'right');

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('finite-to-infinity-substitution');
    expect(contract.exactLatex).toBe(String.raw`\infty`);
    expect(contract.sideContracts?.[0]?.substitutionLatex).toBe(String.raw`x=\frac{1}{t}`);
    expect(contract.sideContracts?.[0]?.transformedLatex).toBe(String.raw`e^{t}`);
  });

  it('bridges a left-hand finite exponential decay to zero', () => {
    const contract = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/x}`), 'x', 0, 'left');

    expect(contract.supported).toBe(true);
    expect(contract.exactLatex).toBe('0');
    expect(contract.sideContracts?.[0]?.substitutionLatex).toBe(String.raw`x=-\frac{1}{t}`);
    expect(contract.sideContracts?.[0]?.transformedLatex).toBe(String.raw`e^{-t}`);
  });

  it('accepts two-sided finite limits when the bridge sides agree', () => {
    const contract = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/x^2}`));

    expect(contract.supported).toBe(true);
    expect(contract.route).toBe('two-sided-agreement');
    expect(contract.exactLatex).toBe(String.raw`\infty`);
    expect(contract.sideContracts?.map((side) => side.transformedLatex)).toEqual([
      String.raw`e^{t^{2}}`,
      String.raw`e^{t^{2}}`,
    ]);
  });

  it('stops two-sided finite limits when bridge sides disagree', () => {
    const contract = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/x}`));

    expect(contract.supported).toBe(false);
    expect(contract.route).toBe('two-sided-disagreement');
    expect(contract.stopReason).toContain('do not agree');
  });

  it('preserves shifted finite targets through the local bridge substitution', () => {
    const right = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/(x-2)}`), 'x', 2, 'right');
    const left = buildGruntzFiniteTargetBridgeContract(parse(String.raw`e^{1/(x-2)}`), 'x', 2, 'left');

    expect(right.supported).toBe(true);
    expect(right.exactLatex).toBe(String.raw`\infty`);
    expect(right.sideContracts?.[0]?.transformedLatex).toBe(String.raw`e^{t}`);

    expect(left.supported).toBe(true);
    expect(left.exactLatex).toBe('0');
    expect(left.sideContracts?.[0]?.transformedLatex).toBe(String.raw`e^{-t}`);
  });
});
