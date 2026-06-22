import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { normalizeAst } from '../../normalize';
import {
  decomposeExplicitProductFactors,
  discoverSymbolicFactorPattern,
  explicitProductNodeFromZeroEquation,
  type MathJson,
} from './factorization';

const ce = new ComputeEngine();

function parse(latex: string): MathJson {
  return ce.parse(latex).json as MathJson;
}

function factorLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll(' ', '');
}

function expectPattern(latex: string, target = 'x') {
  const result = discoverSymbolicFactorPattern(parse(latex), target, 12);
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') {
    throw new Error(`Expected pattern success for ${latex}`);
  }
  return result;
}

describe('factorization primitive product decomposition', () => {
  it('extracts explicit zero-product sides from equations', () => {
    const leftProduct: MathJson = ['Multiply', 'a', 'z'];
    const rightProduct: MathJson = ['Multiply', 'z', 'b'];

    expect(explicitProductNodeFromZeroEquation(['Equal', leftProduct, 0])).toEqual(leftProduct);
    expect(explicitProductNodeFromZeroEquation(['Equal', 0, rightProduct])).toEqual(rightProduct);
    expect(explicitProductNodeFromZeroEquation(['Equal', leftProduct, rightProduct])).toBeNull();
    expect(explicitProductNodeFromZeroEquation(['Add', leftProduct, 0])).toBeNull();
  });

  it('flattens products and records positive-power multiplicity', () => {
    const product: MathJson = [
      'Multiply',
      'a',
      ['InvisibleOperator', ['Power', ['Add', 'z', ['Negate', 'b']], 3], 'c'],
    ];

    const result = decomposeExplicitProductFactors(product, 'z');

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(result.message);
    }
    expect(result.factors.map((factor) => factor.hasTarget)).toEqual([false, true, false]);
    expect(result.factors.map((factor) => factor.multiplicity)).toEqual([1, 3, 1]);
    expect(result.factors[1].node).toEqual(['Add', 'z', ['Negate', 'b']]);
  });

  it('rejects target-bearing invalid powers but preserves target-free powers', () => {
    const targetPower: MathJson = ['Power', ['Add', 'z', 'a'], ['Rational', 1, 2]];
    const parameterPower: MathJson = ['Power', 'a', ['Rational', 1, 2]];

    expect(decomposeExplicitProductFactors(targetPower, 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'target-power',
    });
    expect(decomposeExplicitProductFactors(parameterPower, 'z')).toMatchObject({
      kind: 'ok',
      factors: [{ node: parameterPower, multiplicity: 1, hasTarget: false }],
    });
  });
});

describe('factorization primitive symbolic patterns', () => {
  it('discovers common pure and affine carrier powers', () => {
    const pure = expectPattern('x^5-a*x^3');
    const affine = expectPattern('(x+c)^3-a*(x+c)^2');

    expect(pure.metadata).toMatchObject({ pattern: 'common-carrier-power', commonPower: 3 });
    expect(pure.totalDegree).toBe(5);
    expect(pure.factors.map((factor) => factor.multiplicity)).toEqual([3, 1]);
    expect(affine.metadata).toMatchObject({ pattern: 'common-carrier-power', commonPower: 2 });
    expect(factorLatex(affine.factors[0].node)).toContain('c+x');
  });

  it('discovers safe real difference-of-powers factors', () => {
    const square = expectPattern('x^2-a^2');
    const cube = expectPattern('x^3-a^3');

    expect(square.metadata).toMatchObject({ pattern: 'difference-of-powers', branchKind: 'two-real' });
    expect(square.factors.map((factor) => factorLatex(factor.node))).toEqual(
      expect.arrayContaining(['x-a', 'a+x']),
    );
    expect(cube.metadata).toMatchObject({ pattern: 'difference-of-powers', branchKind: 'single-real' });
    expect(cube.factors).toHaveLength(1);
  });

  it('discovers shared-carrier factor-by-grouping', () => {
    const result = expectPattern('x*(x+a)+b*(x+a)');

    expect(result.metadata).toMatchObject({ pattern: 'shared-carrier-grouping', commonPower: 1 });
    expect(result.factors).toHaveLength(2);
    expect(result.factors.map((factor) => factor.degree)).toEqual([1, 1]);
  });

  it('discovers grouped affine-carrier quadratics', () => {
    const grouped = expectPattern('(x+c)^2+(a+b)*(x+c)+a*b');
    const repeated = expectPattern('(x+c)^2+2*a*(x+c)+a^2');

    expect(grouped.metadata).toMatchObject({ pattern: 'grouped-carrier-quadratic', repeated: false });
    expect(grouped.factors.map((factor) => factorLatex(factor.node))).toEqual(
      expect.arrayContaining(['a+c+x', 'b+c+x']),
    );
    expect(repeated.metadata).toMatchObject({ pattern: 'grouped-carrier-quadratic', repeated: true });
    expect(repeated.factors).toMatchObject([{ multiplicity: 2, degree: 1 }]);
  });

  it('stops over-degree and unsupported factor shapes honestly', () => {
    const overDegree = discoverSymbolicFactorPattern(parse('x^{13}-a*x^{11}'), 'x', 12);
    const unsupported = discoverSymbolicFactorPattern(parse('x^3*\\sin(x)-a*x^2'), 'x', 12);
    const residualDegree = discoverSymbolicFactorPattern(parse('x^7-a*x^3'), 'x', 12);

    expect(overDegree).toMatchObject({ kind: 'unsupported', reason: 'degree-limit' });
    expect(unsupported).toMatchObject({ kind: 'unsupported', reason: 'unsupported-factor' });
    expect(residualDegree).toMatchObject({
      kind: 'unsupported',
      reason: 'unsupported-expanded-polynomial',
    });
  });

  it('uses normalized structural nodes for stable grouped output', () => {
    const result = expectPattern('(2x-1)^5-a*(2x-1)^3');
    expect(normalizeAst(result.factors[0].node)).toEqual(normalizeAst(['Add', -1, ['Multiply', 2, 'x']]));
  });
});
