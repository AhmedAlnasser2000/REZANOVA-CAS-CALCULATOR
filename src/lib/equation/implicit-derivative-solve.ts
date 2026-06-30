import type { DisplayDetailSection } from '../../types/calculator';
import type { AngleUnit } from '../../types/calculator/mode-types';
import {
  solveSelectedTargetIsolationEquation,
  type SelectedTargetIsolationStopReason,
} from './equation-selected-target-isolation';

export type EquationImplicitDerivativeSolveInput = {
  differentiatedRelationLatex: string;
  derivativePlaceholder: string;
  displayDerivativeLatex: string;
  angleUnit?: AngleUnit;
};

export type EquationImplicitDerivativeSolveSuccess = {
  kind: 'success';
  derivativePlaceholder: string;
  displayDerivativeLatex: string;
  rhsLatex: string;
  exactLatex: string;
  placeholderExactLatex: string;
  generatedEquationLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type EquationImplicitDerivativeSolveStopReason =
  | 'invalid-placeholder'
  | 'invalid-display-derivative'
  | 'equation-unsupported'
  | 'placeholder-not-found'
  | 'nonlinear-derivative'
  | 'unclean-isolation';

export type EquationImplicitDerivativeSolveStop = {
  kind: 'unsupported';
  reason: EquationImplicitDerivativeSolveStopReason;
  message: string;
  equationReason?: SelectedTargetIsolationStopReason;
  detailSections?: DisplayDetailSection[];
};

export type EquationImplicitDerivativeSolveResult =
  | EquationImplicitDerivativeSolveSuccess
  | EquationImplicitDerivativeSolveStop;

function unsupported(
  reason: EquationImplicitDerivativeSolveStopReason,
  message: string,
  options: Pick<EquationImplicitDerivativeSolveStop, 'equationReason' | 'detailSections'> = {},
): EquationImplicitDerivativeSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    ...options,
  };
}

function isSupportedInternalPlaceholder(value: string) {
  return /^[A-Za-z]$/.test(value.trim());
}

function extractCleanPlaceholderRhs(exactLatex: string, placeholder: string) {
  const equalityPrefix = `${placeholder}=`;
  if (!exactLatex.startsWith(equalityPrefix)) {
    return null;
  }

  const rhsLatex = exactLatex.slice(equalityPrefix.length).trim();
  return rhsLatex.length > 0 ? rhsLatex : null;
}

export function solveImplicitDerivativePlaceholder({
  differentiatedRelationLatex,
  derivativePlaceholder,
  displayDerivativeLatex,
  angleUnit = 'rad',
}: EquationImplicitDerivativeSolveInput): EquationImplicitDerivativeSolveResult {
  const placeholder = derivativePlaceholder.trim();
  const displayDerivative = displayDerivativeLatex.trim();

  if (!isSupportedInternalPlaceholder(placeholder)) {
    return unsupported(
      'invalid-placeholder',
      'Implicit differentiation needs a single-letter internal derivative placeholder.',
    );
  }

  if (displayDerivative.length === 0) {
    return unsupported(
      'invalid-display-derivative',
      'Implicit differentiation needs a display derivative such as dy/dx.',
    );
  }

  const solved = solveSelectedTargetIsolationEquation(
    differentiatedRelationLatex,
    placeholder,
    angleUnit,
    { allowGeneratedImplicitProducts: true },
  );

  if (solved.kind === 'unsupported') {
    return unsupported(
      solved.reason === 'target-not-found' ? 'placeholder-not-found' : 'equation-unsupported',
      `Equation could not isolate the implicit derivative placeholder: ${solved.message}`,
      {
        equationReason: solved.reason,
        detailSections: [{
          title: 'Implicit Derivative Solve',
          lines: [
            `Internal derivative placeholder: ${placeholder}`,
            `Display derivative: ${displayDerivative}`,
            `Equation stop: ${solved.message}`,
          ],
        }],
      },
    );
  }

  const rhsLatex = extractCleanPlaceholderRhs(solved.exactLatex, placeholder);
  if (!rhsLatex) {
    const reason = solved.exactLatex.includes('\\in') ? 'nonlinear-derivative' : 'unclean-isolation';
    return unsupported(
      reason,
      'Equation isolated the derivative placeholder, but not as one clean derivative expression.',
      {
        detailSections: [
          {
            title: 'Implicit Derivative Solve',
            lines: [
              `Internal derivative placeholder: ${placeholder}`,
              `Display derivative: ${displayDerivative}`,
              `Equation output: ${solved.exactLatex}`,
            ],
          },
          ...solved.detailSections,
        ],
      },
    );
  }

  const exactLatex = `${displayDerivative}=${rhsLatex}`;
  return {
    kind: 'success',
    derivativePlaceholder: placeholder,
    displayDerivativeLatex: displayDerivative,
    rhsLatex,
    exactLatex,
    placeholderExactLatex: solved.exactLatex,
    generatedEquationLatex: solved.generatedEquationLatex,
    exactSupplementLatex: solved.exactSupplementLatex,
    detailSections: [
      {
        title: 'Implicit Derivative Solve',
        lines: [
          `Internal derivative placeholder: ${placeholder}`,
          `Display derivative: ${displayDerivative}`,
          `Equation isolated: ${solved.exactLatex}`,
          `Mapped result: ${exactLatex}`,
        ],
      },
      ...solved.detailSections,
    ],
  };
}
