import type { AngleUnit, ComplexExactForm, OutputStyle } from '../../../types/calculator';
import type { EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { solveComplexPreimageEquation } from '../complex/preimage';

export type ParameterizedComplexPreimageHandoff = {
  domain: 'complex';
  outputStyle: OutputStyle;
  complexExactForm: ComplexExactForm;
  angleUnit: AngleUnit;
  maxPowerDegree?: number;
};

export function solveParameterizedComplexPreimageCarrierEquation(
  equationLatex: string,
  target: string,
  handoff: ParameterizedComplexPreimageHandoff,
): EquationAlgebraicIsolationSuccess | null {
  return solveComplexPreimageEquation(
    equationLatex,
    target,
    handoff.outputStyle,
    handoff.complexExactForm,
    handoff.angleUnit,
    handoff.maxPowerDegree,
  );
}
