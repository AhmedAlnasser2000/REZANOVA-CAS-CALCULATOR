import type { RunEquationModeRequest } from '../../lib/modes/equation';
import type { EquationReplaySeed } from '../../types/calculator';

function copySystem(system: readonly (readonly number[])[]) {
  return system.map((row) => [...row]);
}

function polynomialSystemSeedLatex(
  polynomialSystem2Latex: RunEquationModeRequest['polynomialSystem2Latex'],
): [string, string] {
  return [
    polynomialSystem2Latex[0] ?? '',
    polynomialSystem2Latex[1] ?? '',
  ];
}

export function equationReplaySeedFromRequest(
  request: RunEquationModeRequest,
  committedInput: string,
): EquationReplaySeed | undefined {
  if (request.equationScreen === 'symbolic') {
    return {
      screen: 'symbolic',
      equationLatex: request.equationLatex,
      ...(request.equationSolveTarget ? { equationSolveTarget: request.equationSolveTarget } : {}),
      ...(request.numericInterval ? { numericInterval: request.numericInterval } : {}),
      ...(request.complexRegion ? { complexRegion: request.complexRegion } : {}),
    };
  }

  if (
    request.equationScreen === 'quadratic'
    || request.equationScreen === 'cubic'
    || request.equationScreen === 'quartic'
  ) {
    const coefficientSource = request.equationScreen === 'quadratic'
      ? request.quadraticCoefficients
      : request.equationScreen === 'cubic'
        ? request.cubicCoefficients
        : request.quarticCoefficients;
    return {
      screen: request.equationScreen,
      coefficients: [...coefficientSource],
      equationLatex: committedInput,
    };
  }

  if (request.equationScreen === 'linear2' || request.equationScreen === 'linear3') {
    return {
      screen: request.equationScreen,
      equationLatex: committedInput,
      system: copySystem(request.equationScreen === 'linear2' ? request.system2 : request.system3),
    };
  }

  if (request.equationScreen === 'polynomialSystem2') {
    return {
      screen: 'polynomialSystem2',
      equationLatex: committedInput,
      polynomialSystem2Latex: polynomialSystemSeedLatex(request.polynomialSystem2Latex),
    };
  }

  return undefined;
}
