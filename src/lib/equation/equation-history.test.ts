import { describe, expect, it } from 'vitest';
import {
  inferEquationReplayTarget,
  inferSimultaneousReplayScreen,
  parseGeneratedPolynomialEquationLatex,
} from './equation-history';
import { historyEntryFixture } from '../../test-utils/history-result-document';

describe('equation history replay inference', () => {
  it('prefers saved Equation replay seeds over result inference', () => {
    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: 'seed-poly-system',
        mode: 'equation',
        inputLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
        resultLatex: '\\left(x,y\\right)\\in\\left\\{\\left(-4,-6\\right),\\left(3,1\\right)\\right\\}',
        equationScreen: 'polynomialSystem2',
        equationSeed: {
          screen: 'polynomialSystem2',
          equationLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
          polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
        },
        timestamp: '2026-07-04T00:00:00.000Z',
      })),
    ).toEqual({
      screen: 'polynomialSystem2',
      equationLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
      polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
    });

    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: 'seed-linear3',
        mode: 'equation',
        inputLatex: 'linear-system',
        resultLatex: 'x=1,\\;y=2,\\;z=3',
        equationScreen: 'linear3',
        equationSeed: {
          screen: 'linear3',
          equationLatex: 'linear-system',
          system: [
            [1, 1, 1, 6],
            [2, -1, 1, 3],
            [1, 2, -1, 3],
          ],
        },
        timestamp: '2026-07-04T00:00:00.000Z',
      })),
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

  it('infers quadratic and quartic polynomial branches from generated equations', () => {
    expect(parseGeneratedPolynomialEquationLatex('x^{2}-5x+6=0')).toEqual({
      screen: 'quadratic',
      coefficients: [1, -5, 6],
      equationLatex: 'x^{2}-5x+6=0',
    });

    expect(parseGeneratedPolynomialEquationLatex('5x^{4}-6x^{3}+5x^{2}+4x+1=0')).toEqual({
      screen: 'quartic',
      coefficients: [5, -6, 5, 4, 1],
      equationLatex: '5x^{4}-6x^{3}+5x^{2}+4x+1=0',
    });
  });

  it('infers simultaneous branches from saved result variables', () => {
    expect(inferSimultaneousReplayScreen('x=1,\\;y=2')).toBe('linear2');
    expect(inferSimultaneousReplayScreen('x=1,\\;y=2,\\;z=3')).toBe('linear3');
  });

  it('falls back to symbolic when the history entry is not inferable', () => {
    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: '1',
        mode: 'equation',
        inputLatex: 'x^2+2x+2=0',
        resultLatex: 'x\\approx\\left\\{-1-i,-1+i\\right\\}',
        approxText: 'x ~= -1 - i, -1 + i',
        timestamp: '2026-03-02T00:00:00.000Z',
      })),
    ).toEqual({
      screen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: null,
    });

    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: '2',
        mode: 'equation',
        inputLatex: '5x+6=3',
        resultLatex: 'x=\\frac{-3}{5}',
        approxText: 'x ~= -0.6',
        timestamp: '2026-03-02T00:00:00.000Z',
      })),
    ).toEqual({
      screen: 'symbolic',
      equationLatex: '5x+6=3',
      equationSolveTarget: null,
    });
  });

  it('preserves stored selected targets for symbolic equation replay', () => {
    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: 'targeted-1',
        mode: 'equation',
        inputLatex: 'x+z=5',
        resultLatex: 'z=5-x',
        equationSolveTarget: 'z',
        timestamp: '2026-05-23T00:00:00.000Z',
      })),
    ).toEqual({
      screen: 'symbolic',
      equationLatex: 'x+z=5',
      equationSolveTarget: 'z',
    });
  });

  it('restores simultaneous branch context without reconstructing the grid', () => {
    expect(
      inferEquationReplayTarget(historyEntryFixture({
        id: '3',
        mode: 'equation',
        inputLatex: 'linear-system',
        resultLatex: 'x=1,\\;y=2,\\;z=3',
        approxText: 'x ~= 1, y ~= 2, z ~= 3',
        systemReadback: {
          variablesLatex: ['x', 'y', 'z'],
          rows: [{ valuesLatex: ['1', '2', '3'] }],
        },
        timestamp: '2026-03-02T00:00:00.000Z',
      })),
    ).toEqual({
      screen: 'linear3',
      equationLatex: 'linear-system',
    });
  });
});
