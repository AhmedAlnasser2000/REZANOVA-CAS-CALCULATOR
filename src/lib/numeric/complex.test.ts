import { describe, expect, it } from 'vitest';
import {
  areComplexClose,
  complex,
  complexAdd,
  complexAllRootsReadback,
  complexArg,
  complexBranchesToApproxText,
  complexBranchesToLatex,
  complexConjugate,
  complexDiv,
  complexFromPolar,
  complexMul,
  complexNthRoots,
  complexPowInteger,
  complexPrincipalNthRoot,
  complexPrincipalRootReadback,
  complexSqrt,
  complexSub,
  complexToApproxText,
  complexToLatex,
  normalizeComplex,
} from './complex';

describe('complex utilities', () => {
  it('formats pure and mixed imaginary values', () => {
    expect(complexToLatex(complex(0, 1))).toBe('i');
    expect(complexToLatex(complex(0, -1))).toBe('-i');
    expect(complexToLatex(complex(-1, 1))).toBe('-1+i');
    expect(complexToApproxText(complex(0.87026667, 1.0364649))).toBe('0.870267 + 1.036465i');
  });

  it('normalizes near-zero components', () => {
    expect(normalizeComplex({ re: -1e-12, im: 1e-12 })).toEqual({ re: 0, im: 0 });
  });

  it('supports arithmetic helpers', () => {
    const left = complex(2, 3);
    const right = complex(1, -4);

    expect(complexAdd(left, right)).toEqual({ re: 3, im: -1 });
    expect(complexSub(left, right)).toEqual({ re: 1, im: 7 });
    expect(complexMul(left, right)).toEqual({ re: 14, im: -5 });
    expect(areComplexClose(complexDiv(left, right), { re: -0.5882352941, im: 0.6470588235 })).toBe(true);
    expect(complexConjugate(left)).toEqual({ re: 2, im: -3 });
  });

  it('computes complex square roots', () => {
    expect(complexSqrt(complex(-4, 0))).toEqual({ re: 0, im: 2 });
    expect(areComplexClose(complexSqrt(complex(3, 4)), { re: 2, im: 1 })).toBe(true);
  });

  it('converts polar form and reports deterministic arguments', () => {
    expect(areComplexClose(complexFromPolar(2, Math.PI / 2), { re: 0, im: 2 })).toBe(true);
    expect(complexArg(complex(0, -1))).toBeCloseTo(-Math.PI / 2);
    expect(complexArg(complex(0, 0))).toBe(0);
    expect(() => complexFromPolar(-1, 0)).toThrow(RangeError);
  });

  it('raises complex values to integer powers', () => {
    expect(complexPowInteger(complex(2, 3), 0)).toEqual({ re: 1, im: 0 });
    expect(complexPowInteger(complex(1, 1), 3)).toEqual({ re: -2, im: 2 });
    expect(areComplexClose(complexPowInteger(complex(1, 1), -1), { re: 0.5, im: -0.5 })).toBe(true);
    expect(() => complexPowInteger(complex(1, 1), 1.5)).toThrow(RangeError);
  });

  it('computes principal nth roots', () => {
    expect(areComplexClose(
      complexPrincipalNthRoot(complex(-8, 0), 3),
      { re: 1, im: Math.sqrt(3) },
    )).toBe(true);
    expect(complexPrincipalNthRoot(complex(0, 0), 5)).toEqual({ re: 0, im: 0 });
    expect(() => complexPrincipalNthRoot(complex(1, 0), 0)).toThrow(RangeError);
  });

  it('computes all nth roots in stable angle order', () => {
    const fourthRoots = complexNthRoots(complex(1, 0), 4);
    expect(fourthRoots).toHaveLength(4);
    expect(fourthRoots.every((root) => areComplexClose(complexPowInteger(root, 4), complex(1, 0)))).toBe(true);
    expect(fourthRoots).toEqual([
      { re: 1, im: 0 },
      { re: 0, im: 1 },
      { re: -1, im: 0 },
      { re: 0, im: -1 },
    ]);

    const negativeSquareRoots = complexNthRoots(complex(-1, 0), 2);
    expect(negativeSquareRoots).toEqual([
      { re: 0, im: 1 },
      { re: 0, im: -1 },
    ]);
    expect(complexNthRoots(complex(0, 0), 4)).toEqual([{ re: 0, im: 0 }]);
  });

  it('formats complex branch and root readback without implying equation solving', () => {
    const branches = [complex(1, 0), complex(0, 1), complex(-1, 0), complex(0, -1)];
    expect(complexBranchesToLatex(branches)).toBe('\\left\\{1, i, -1, -i\\right\\}');
    expect(complexBranchesToApproxText(branches)).toBe('{ 1, i, -1, -i }');

    const principal = complexPrincipalRootReadback(complex(-4, 0), 2);
    expect(principal).toMatchObject({
      kind: 'principal-root',
      degree: 2,
      latex: '2i',
      text: '2i',
    });

    const all = complexAllRootsReadback(complex(1, 0), 4);
    expect(all.kind).toBe('all-branches');
    expect(all.latex).toBe('\\left\\{1, i, -1, -i\\right\\}');
  });
});
