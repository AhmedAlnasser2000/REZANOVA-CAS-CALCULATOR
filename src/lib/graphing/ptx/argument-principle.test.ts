import { describe, expect, it } from 'vitest';
import { ptxCountZerosAndPoles, ptxProveComplexZero, ptxReciprocalExpression, ptxWindingNumber } from './argument-principle';
import { currentPtxSolverPort as port } from './solver-port-current';

const tools = (mathJson: unknown) => ({
  f: port.complexFunction(mathJson, {})!,
  enclose: port.complexEnclosure!(mathJson, {})!,
  inverse: port.complexEnclosure!(ptxReciprocalExpression(mathJson), {})!,
});
const count = (mathJson: unknown, region: { reMin: number; reMax: number; imMin: number; imMax: number }) => {
  const t = tools(mathJson);
  return ptxCountZerosAndPoles(t.f, t.enclose, t.inverse, region);
};

describe('PTX-ENGINE1 E8: the argument principle', () => {
  it('winds once round a simple zero and not at all round an empty box', () => {
    const t = tools(['Add', 'z', -1]);
    expect(ptxWindingNumber(t.f, t.enclose, { reMin: 0, reMax: 2, imMin: -1, imMax: 1 })).toBe(1);
    expect(ptxWindingNumber(t.f, t.enclose, { reMin: 2, reMax: 3, imMin: -1, imMax: 1 })).toBe(0);
  });

  it('counts zeros and poles exactly, with multiplicity', () => {
    expect(count(['Divide', ['Add', ['Power', 'z', 2], -1], 'z'], { reMin: -2, reMax: 2, imMin: -2, imMax: 2 })).toEqual({ zeros: 2, poles: 1 });
    expect(count(['Add', ['Power', 'z', 3], -1], { reMin: -2, reMax: 2, imMin: -2, imMax: 2 })).toEqual({ zeros: 3, poles: 0 });
    expect(count(['Power', ['Add', 'z', -0.5], 2], { reMin: -2, reMax: 2, imMin: -2, imMax: 2 })).toEqual({ zeros: 2, poles: 0 });
    expect(count(['Add', ['Exp', 'z'], -1], { reMin: -1, reMax: 1, imMin: -7, imMax: 7 })).toEqual({ zeros: 3, poles: 0 });
    expect(count(['Tan', 'z'], { reMin: -2, reMax: 2, imMin: -1, imMax: 1 })).toEqual({ zeros: 1, poles: 2 });
  });

  it('refuses expressions that are not meromorphic', () => {
    expect(port.complexEnclosure!(['Sqrt', 'z'], {})).toBeNull();
    expect(port.complexEnclosure!(['Abs', 'z'], {})).toBeNull();
  });

  it('proves a zero inside a small box round it', () => {
    const t = tools(['Add', ['Power', 'z', 2], 1]);
    expect(ptxProveComplexZero(t.f, t.enclose, { re: 1e-12, im: 1 - 1e-12 }, 1e-8)).toMatchObject({ multiplicity: 1 });
  });
});
