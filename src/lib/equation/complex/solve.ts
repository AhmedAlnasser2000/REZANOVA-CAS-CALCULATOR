import type { EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { solveEquationAlgebraicIsolation } from '../equation-algebraic-isolation';
import { solveDirectComplexLinearEquation, solveRationalComplexEquation } from './linear-rational';
import { solveComplexPreimageEquation } from './preimage';
import {
  solveDirectComplexPowerEquation,
  solveFactorableComplexPolynomial,
  solveNegativeDiscriminantQuadratic,
} from './polynomial';
import type { ComplexEquationOptions } from './types';

export function solveBoundedComplexEquation(
  equationLatex: string,
  target: string,
  options: ComplexEquationOptions = {},
): EquationAlgebraicIsolationSuccess | null {
  const outputStyle = options.outputStyle ?? 'exact';
  const complexExactForm = options.complexExactForm ?? 'rectangular';
  const angleUnit = options.angleUnit ?? 'rad';
  const directLinear = solveDirectComplexLinearEquation(equationLatex, target, outputStyle, complexExactForm);
  if (directLinear) {
    return directLinear;
  }

  const directPower = solveDirectComplexPowerEquation(equationLatex, target, {
    ...options,
    outputStyle,
    complexExactForm,
  });
  if (directPower) {
    return directPower;
  }

  const preimage = solveComplexPreimageEquation(equationLatex, target, outputStyle, complexExactForm, angleUnit);
  if (preimage) {
    return preimage;
  }

  const rational = solveRationalComplexEquation(equationLatex, target, outputStyle, complexExactForm);
  if (rational) {
    return rational;
  }

  const factorable = solveFactorableComplexPolynomial(equationLatex, target, outputStyle, complexExactForm);
  if (factorable) {
    return factorable;
  }

  const quadratic = solveNegativeDiscriminantQuadratic(equationLatex, target, outputStyle, complexExactForm);
  if (quadratic) {
    return quadratic;
  }

  const power = solveEquationAlgebraicIsolation(equationLatex, target, {
    ...options,
    answerDomain: 'complex',
    complexExactForm,
  });

  return power.kind === 'success' && power.answerDomain === 'complex'
    ? power
    : null;
}
