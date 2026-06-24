import { describe, expect, it } from 'vitest';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedFactorablePolynomialEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedFactorablePolynomialEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

function linearProduct(symbols: string[]) {
  return `${symbols.map((symbol) => `(z-${symbol})`).join('')}=0`;
}

function multiplyCoefficients(left: number[], right: number[]) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] += left[leftIndex] * right[rightIndex];
    }
  }
  return result;
}

function expandedPolynomialLatex(variable: string, roots: number[]) {
  const coefficients = roots
    .map((root) => [-root, 1])
    .reduce((current, factor) => multiplyCoefficients(current, factor), [1]);

  return coefficients
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => coefficient !== 0)
    .reverse()
    .map(({ coefficient, degree }, index) => {
      const sign = coefficient < 0 ? '-' : index === 0 ? '' : '+';
      const absolute = Math.abs(coefficient);
      const scalar = absolute === 1 && degree > 0 ? '' : String(absolute);
      const power = degree === 0 ? '' : degree === 1 ? variable : `${variable}^{${degree}}`;
      return `${sign}${scalar}${power}`;
    })
    .join('');
}

describe('solveParameterizedFactorablePolynomialEquation', () => {
  it('solves explicit symbolic zero products', () => {
    const result = expectSuccess('(z-a)(z-b)(z-c)=0', 'z');

    expect(result.exactLatex).toBe('z\\in\\left\\{a,\\ b,\\ c\\right\\}');
    expect(result.branchReadback).toMatchObject({
      targetLatex: 'z',
      branchesLatex: ['a', 'b', 'c'],
      source: 'equation-parameterized-factorable-polynomial',
    });
    expect(result.detailSections.some((section) => section.title === 'Parameterized Factorable Polynomial Solve')).toBe(true);
    expect(result.parameterNames).toEqual(['a', 'b', 'c']);
  });

  it('dedupes repeated symbolic factors while preserving multiplicity detail', () => {
    const result = expectSuccess('(z-a)^3=0', 'z');

    expect(result.exactLatex).toBe('z=a');
    expect(result.branchReadback).toBeUndefined();
    expect(result.detailSections.flatMap((section) => section.lines).join(' ')).toContain('multiplicity 3');
  });

  it('solves explicit products through the frontier target-degree cap', () => {
    const five = expectSuccess(linearProduct(['a', 'b', 'c', 'd', 'f']), 'z');
    expect(five.branchReadback?.branchesLatex).toEqual(['a', 'b', 'c', 'd', 'f']);
    expect(five.exactLatex).toBe('z\\in\\left\\{a,\\ b,\\ c,\\ d,\\ f\\right\\}');

    const twelveSymbols = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n'];
    const twelve = expectSuccess(linearProduct(twelveSymbols), 'z');
    expect(twelve.branchReadback?.branchesLatex).toEqual(twelveSymbols);
    expect(twelve.detailSections.flatMap((section) => section.lines).join(' ')).toContain('degree 12');
  });

  it('keeps explicit products bounded after twelve target-degree slots', () => {
    const result = expectUnsupported(linearProduct([
      'a', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p',
    ]), 'z');

    expect(result.reason).toBe('degree-limit');
    expect(result.message).toContain('target degree 12');
  });

  it('solves repeated factors at the frontier cap while preserving multiplicity detail', () => {
    const result = expectSuccess('(z-a)^{12}=0', 'z');

    expect(result.exactLatex).toBe('z=a');
    expect(result.branchReadback).toBeUndefined();
    expect(result.detailSections.flatMap((section) => section.lines).join(' ')).toContain('multiplicity 12');
  });

  it('merges linear and quadratic explicit factor branches', () => {
    const result = expectSuccess('(z-a)(z^2+x z+1)=0', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a');
    expect(result.exactLatex).toContain('x^2-4');
    expect(result.exactSupplementLatex).toEqual(['x^2-4\\ge0']);
  });

  it('preserves real-domain facts from delegated quadratic factor branches', () => {
    const result = expectSuccess('(z^2-a)(z-b)=0', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\sqrt{a}');
    expect(result.exactLatex).toContain('b');
    expect(result.exactSupplementLatex).toEqual(['a\\ge0']);
  });

  it('solves mixed linear and quadratic factors up to twelve target-degree slots', () => {
    const result = expectSuccess('(z^2-a)(z-b)(z^2-c)(z-d)(z^2-m)(z-f)(z^2-g)(z-h)=0', 'z');

    expect(result.branchReadback?.branchesLatex).toHaveLength(12);
    expect(result.exactSupplementLatex).toEqual(['a\\ge0', 'c\\ge0', 'g\\ge0', 'm\\ge0']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' ')).toContain('degree 12');
  });

  it('adopts exact-rational expanded cubic and quartic factor solving', () => {
    const cubic = expectSuccess('z^3-6z^2+11z-6=0', 'z');
    expect(cubic.exactLatex).toBe('z\\in\\left\\{1,\\ 2,\\ 3\\right\\}');
    expect(cubic.branchReadback?.branchesLatex).toEqual(['1', '2', '3']);

    const repeated = expectSuccess('z^3-4z^2+5z-2=0', 'z');
    expect(repeated.exactLatex).toBe('z\\in\\left\\{1,\\ 2\\right\\}');
    expect(repeated.branchReadback?.branchesLatex).toEqual(['1', '2']);

    const quartic = expectSuccess('z^4-5z^2+4=0', 'z');
    expect(quartic.exactLatex).toContain('-2');
    expect(quartic.exactLatex).toContain('2');
  });

  it('adopts exact-rational coefficient expanded factor solving', () => {
    const result = expectSuccess('\\frac{1}{2}z^4-\\frac{5}{2}z^2+2=0', 'z');

    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('2');
  });

  it('solves expanded exact-rational factors through the frontier cap', () => {
    const degreeFive = expectSuccess(`${expandedPolynomialLatex('z', [1, 2, 3, 4, 5])}=0`, 'z');
    expect(degreeFive.exactLatex).toBe('z\\in\\left\\{1,\\ 2,\\ 3,\\ 4,\\ 5\\right\\}');
    expect(degreeFive.branchReadback?.branchesLatex).toEqual(['1', '2', '3', '4', '5']);

    const degreeTwelve = expectSuccess(
      `${expandedPolynomialLatex('z', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}=0`,
      'z',
    );
    expect(degreeTwelve.branchReadback?.branchesLatex).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
    ]);
    expect(degreeTwelve.detailSections.flatMap((section) => section.lines).join(' ')).toContain('degree-12');
  });

  it('keeps expanded exact-rational factorable solving bounded after twelve target-degree slots', () => {
    const result = expectUnsupported(
      `${expandedPolynomialLatex('z', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])}=0`,
      'z',
    );

    expect(result.reason).toBe('degree-limit');
    expect(result.message).toContain('degree 12');
  });

  it('keeps unsupported exact-rational high-degree expanded polynomials honest', () => {
    const result = expectUnsupported('z^5+z+1=0', 'z');

    expect(result.reason).toBe('unsupported-expanded-polynomial');
    expect(result.message).toContain('degree 12');
  });

  it('stops arbitrary symbolic expanded cubics instead of using a general formula', () => {
    const result = expectUnsupported('a z^3+b z^2+c z+d=0', 'z');

    expect(result.reason).toBe('unsupported-expanded-polynomial');
    expect(result.message).toContain('explicit zero products');
  });

  it('discovers symbolic common target-power factors with linear residuals', () => {
    const result = expectSuccess('x^3-a*x^2=0', 'x');

    expect(result.exactLatex).toBe('x\\in\\left\\{0,\\ a\\right\\}');
    expect(result.branchReadback?.branchesLatex).toEqual(['0', 'a']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('multiplicity 2');
  });

  it('discovers symbolic common target-power factors with quadratic residuals', () => {
    const result = expectSuccess('x^5-a*x^3=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('\\sqrt{a}');
    expect(result.exactSupplementLatex).toEqual(['a\\ge0']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('multiplicity 3');
  });

  it('keeps symbolic common target-power factor discovery within degree twelve', () => {
    const result = expectSuccess('x^{12}-a*x^{10}=0', 'x');

    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('\\sqrt{a}');
    expect(result.exactSupplementLatex).toEqual(['a\\ge0']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('Total selected-target degree: 12');
  });

  it('discovers affine common carrier-power factors', () => {
    const shifted = expectSuccess('(x+c)^3-a*(x+c)^2=0', 'x');
    const scaled = expectSuccess('(2x-1)^5-a*(2x-1)^3=0', 'x');

    expect(shifted.exactLatex).toContain('x\\in');
    expect(shifted.exactLatex).toContain('-c');
    expect(shifted.exactLatex).toMatch(/a-c|-c\+a/);
    expect(shifted.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('symbolic common');
    expect(scaled.exactLatex).toContain('\\frac');
    expect(scaled.exactLatex).toContain('\\sqrt{a}');
    expect(scaled.exactSupplementLatex).toEqual(['a\\ge0']);
  });

  it('discovers safe real difference-of-powers patterns', () => {
    const square = expectSuccess('x^2-a^2=0', 'x');
    const shiftedSquare = expectSuccess('(x+c)^2-a^2=0', 'x');
    const cube = expectSuccess('x^3-a^3=0', 'x');

    expect(square.branchReadback?.branchesLatex).toEqual(['a', '-a']);
    expect(shiftedSquare.exactLatex).toContain('a-c');
    expect(shiftedSquare.exactLatex).toContain('-a-c');
    expect(cube.exactLatex).toBe('x=a');
    expect(cube.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('difference-of-powers');
  });

  it('discovers symbolic factor-by-grouping patterns', () => {
    const result = expectSuccess('x*(x+a)+b*(x+a)=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactLatex).toContain('-b');
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('factor-by-grouping');
  });

  it('discovers grouped affine-carrier quadratics', () => {
    const grouped = expectSuccess('(x+c)^2+(a+b)*(x+c)+a*b=0', 'x');
    const repeated = expectSuccess('(x+c)^2+2*a*(x+c)+a^2=0', 'x');

    expect(grouped.exactLatex).toContain('x\\in');
    expect(grouped.exactLatex).toMatch(/-a-c|-c-a/);
    expect(grouped.exactLatex).toMatch(/-b-c|-c-b/);
    expect(grouped.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('grouped carrier quadratic');
    expect(repeated.exactLatex).toMatch(/-a-c|-c-a/);
    expect(repeated.branchReadback).toBeUndefined();
    expect(repeated.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('multiplicity 2');
  });

  it('stops symbolic common factors whose residual degree is too large', () => {
    const result = expectUnsupported('x^7-a*x^3=0', 'x');

    expect(result.reason).toBe('unsupported-expanded-polynomial');
    expect(result.message).toContain('residual linear or quadratic');
  });

  it('stops target-free symbolic product factors that would create conditional families', () => {
    const result = expectUnsupported('a\\cdot(z-b)=0', 'z');

    expect(result.reason).toBe('target-free-factor-condition');
  });

  it('stops unsupported factors, degree overflow, and raw adjacent products', () => {
    expect(expectUnsupported('\\sin\\left(z\\right)(z-a)=0', 'z').reason).toBe('unsupported-factor');
    expect(expectUnsupported('x^3\\sin\\left(x\\right)-a*x^2=0', 'x').reason).toBe('unsupported-factor');
    expect(expectUnsupported(linearProduct([
      'a', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p',
    ]), 'z').reason).toBe('degree-limit');
    expect(expectUnsupported('az=0', 'z').reason).toBe('ambiguous-adjacent-product');
  });
});
