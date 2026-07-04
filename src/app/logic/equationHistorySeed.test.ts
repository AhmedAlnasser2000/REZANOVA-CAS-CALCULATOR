import { describe, expect, it } from 'vitest';
import type { RunEquationModeRequest } from '../../lib/modes/equation';
import { equationReplaySeedFromRequest } from './equationHistorySeed';

function baseRequest(overrides: Partial<RunEquationModeRequest>): RunEquationModeRequest {
  return {
    equationScreen: 'symbolic',
    equationLatex: 'x=1',
    equationSolveTarget: null,
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    complexExactForm: 'rectangular',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, 0, 0, -1],
    polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
    system2: [
      [1, 1, 3],
      [1, -1, 1],
    ],
    system3: [
      [1, 1, 1, 6],
      [2, -1, 1, 3],
      [1, 2, -1, 3],
    ],
    angleUnit: 'rad',
    outputStyle: 'exact',
    ansLatex: '0',
    ...overrides,
  };
}

describe('equationReplaySeedFromRequest', () => {
  it('captures guided Equation screens that cannot be inferred from result text', () => {
    expect(
      equationReplaySeedFromRequest(
        baseRequest({ equationScreen: 'polynomialSystem2' }),
        'x^{2}+y=10\\quad;\\quadx-y=2',
      ),
    ).toEqual({
      screen: 'polynomialSystem2',
      equationLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
      polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
    });

    expect(
      equationReplaySeedFromRequest(
        baseRequest({ equationScreen: 'linear3' }),
        'linear-system',
      ),
    ).toEqual({
      screen: 'linear3',
      equationLatex: 'linear-system',
      system: [
        [1, 1, 1, 6],
        [2, -1, 1, 3],
        [1, 2, -1, 3],
      ],
    });
  });

  it('keeps symbolic numeric and complex replay data with the symbolic seed', () => {
    expect(
      equationReplaySeedFromRequest(
        baseRequest({
          equationScreen: 'symbolic',
          equationLatex: 'e^z+z=0',
          equationSolveTarget: 'z',
          numericInterval: { start: '-2', end: '2', subdivisions: 64 },
          complexRegion: {
            reMin: '-1',
            reMax: '1',
            imMin: '-2',
            imMax: '2',
            gridSize: 9,
          },
        }),
        'e^z+z=0',
      ),
    ).toEqual({
      screen: 'symbolic',
      equationLatex: 'e^z+z=0',
      equationSolveTarget: 'z',
      numericInterval: { start: '-2', end: '2', subdivisions: 64 },
      complexRegion: {
        reMin: '-1',
        reMax: '1',
        imMin: '-2',
        imMax: '2',
        gridSize: 9,
      },
    });
  });
});
