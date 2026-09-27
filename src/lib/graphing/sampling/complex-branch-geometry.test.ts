import { describe, expect, it } from 'vitest';
import {
  clipGraphComplexBranchRay,
  extractGraphComplexAffine,
  graphComplexBranchGeometry,
} from './complex-branch-geometry';

const viewport = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
const close = (value: { re: number; im: number }, re: number, im: number) => {
  expect(value.re).toBeCloseTo(re, 12);
  expect(value.im).toBeCloseTo(im, 12);
};

describe('Graph complex branch geometry', () => {
  it('extracts affine arguments from the parser MathJSON shapes', () => {
    expect(extractGraphComplexAffine(['Add', 'z', -1], 'z')).toEqual({ a: { re: 1, im: 0 }, b: { re: -1, im: 0 } });
    expect(extractGraphComplexAffine(['Add', ['Multiply', ['Complex', 0, 2], 'z'], 1], 'z'))
      .toEqual({ a: { re: 0, im: 2 }, b: { re: 1, im: 0 } });
    expect(extractGraphComplexAffine(['Add', ['Multiply', ['Rational', 1, 2], 'z'], ['Complex', 0, 1]], 'z'))
      .toEqual({ a: { re: 0.5, im: 0 }, b: { re: 0, im: 1 } });
    expect(extractGraphComplexAffine(['Add', ['Negate', 'z'], 3], 'z')).toEqual({ a: { re: -1, im: 0 }, b: { re: 3, im: 0 } });
    expect(extractGraphComplexAffine(['Subtract', ['Divide', 'z', 4], 'a'], 'z', { a: 2 }))
      .toEqual({ a: { re: 0.25, im: 0 }, b: { re: -2, im: 0 } });
    expect(extractGraphComplexAffine(['Add', ['Power', 'z', 2], 1], 'z')).toBeNull();
    expect(extractGraphComplexAffine(['Multiply', 'z', 'z'], 'z')).toBeNull();
    expect(extractGraphComplexAffine(['Divide', 1, 'z'], 'z')).toBeNull();
    expect(extractGraphComplexAffine(['Add', 'z', 'b'], 'z')).toBeNull();
  });

  it('places the principal log point and cut at the shifted argument, not at 0', () => {
    const geometry = graphComplexBranchGeometry(['Log', ['Add', 'z', -1]], 'z');
    expect(geometry.unresolvedOperators).toEqual([]);
    expect(geometry.points).toEqual([{ family: 'principal-log-branch-point', z: { re: 1, im: 0 } }]);
    expect(geometry.rays).toEqual([{ family: 'principal-log-cut', origin: { re: 1, im: 0 }, direction: { re: -1, im: 0 } }]);
    expect(clipGraphComplexBranchRay(geometry.rays[0]!, viewport)).toEqual({ from: { re: 1, im: 0 }, to: { re: -4, im: 0 } });
  });

  it('rotates cuts for complex coefficients and reverses them for negated arguments', () => {
    const rotated = graphComplexBranchGeometry(['Ln', ['Add', ['Multiply', ['Complex', 0, 2], 'z'], 1]], 'z');
    close(rotated.points[0]!.z, 0, 0.5);
    // 2i z + 1 = -t  =>  z = i/2 + i t/2: the cut runs straight up from i/2.
    close(rotated.rays[0]!.direction, 0, 0.5);
    const segment = clipGraphComplexBranchRay(rotated.rays[0]!, viewport)!;
    close(segment.from, 0, 0.5);
    close(segment.to, 0, 3);
    const negated = graphComplexBranchGeometry(['Sqrt', ['Add', ['Negate', 'z'], 3]], 'z');
    expect(negated.points[0]!.z).toEqual({ re: 3, im: 0 });
    expect(clipGraphComplexBranchRay(negated.rays[0]!, viewport)).toEqual({ from: { re: 3, im: 0 }, to: { re: 4, im: 0 } });
  });

  it('models inverse sine, cosine, and tangent cuts and principal non-integer powers', () => {
    const arcsin = graphComplexBranchGeometry(['Arcsin', ['Add', 'z', 1]], 'z');
    expect(arcsin.points.map((point) => point.z)).toEqual([{ re: -2, im: 0 }, { re: 0, im: 0 }]);
    expect(arcsin.rays.map((ray) => clipGraphComplexBranchRay(ray, viewport))).toEqual([
      { from: { re: -2, im: 0 }, to: { re: -4, im: 0 } },
      { from: { re: 0, im: 0 }, to: { re: 4, im: 0 } },
    ]);
    const arctan = graphComplexBranchGeometry(['Arctan', ['Add', 'z', ['Complex', 0, -1]]], 'z');
    expect(arctan.points.map((point) => point.z)).toEqual([{ re: 0, im: 2 }, { re: 0, im: 0 }]);
    expect(arctan.rays.map((ray) => ray.direction)).toEqual([{ re: 0, im: 1 }, { re: -0, im: -1 }]);
    expect(graphComplexBranchGeometry(['Power', ['Add', 'z', -1], ['Complex', 0, 1]], 'z').points)
      .toEqual([{ family: 'principal-power-branch-point', z: { re: 1, im: 0 } }]);
    expect(graphComplexBranchGeometry(['Power', ['Add', 'z', -1], 3], 'z').points).toEqual([]);
    expect(graphComplexBranchGeometry(['Power', 2, 'z'], 'z').points).toEqual([]);
  });

  it('reports non-affine and unmodelled multivalued arguments instead of guessing', () => {
    expect(graphComplexBranchGeometry(['Ln', ['Add', ['Power', 'z', 2], 1]], 'z'))
      .toEqual({ points: [], rays: [], unresolvedOperators: ['Ln'] });
    const nested = graphComplexBranchGeometry(['Ln', ['Ln', 'z']], 'z');
    expect(nested.points).toEqual([{ family: 'principal-log-branch-point', z: { re: 0, im: 0 } }]);
    expect(nested.unresolvedOperators).toEqual(['Ln']);
    expect(graphComplexBranchGeometry(['Arsinh', 'z'], 'z').unresolvedOperators).toEqual(['Arsinh']);
    expect(graphComplexBranchGeometry(['Ln', 3], 'z')).toEqual({ points: [], rays: [], unresolvedOperators: [] });
  });

  it('clips rays that miss the viewport to nothing', () => {
    expect(clipGraphComplexBranchRay({ family: 'cut', origin: { re: -5, im: 0 }, direction: { re: -1, im: 0 } }, viewport)).toBeNull();
    expect(clipGraphComplexBranchRay({ family: 'cut', origin: { re: 0, im: 5 }, direction: { re: -1, im: 0 } }, viewport)).toBeNull();
  });
});
