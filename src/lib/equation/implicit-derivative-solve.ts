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
  mathJsonLeaves?: Array<{
    canonicalLatex: string;
    mathJson: unknown;
    source: string;
  }>;
};

function displayDerivativeMathJson(displayDerivativeLatex: string) {
  const match = displayDerivativeLatex.match(/^\\frac\{d([A-Za-z])\}\{d([A-Za-z])\}$/u);
  return match
    ? ['Divide', ['InvisibleOperator', 'd', match[1]], ['InvisibleOperator', 'd', match[2]]]
    : undefined;
}

function isolatePlaceholderProduct(
  equation: unknown,
  placeholder: string,
): { rhs: unknown; nonzeroFactor?: unknown } | undefined {
  if (!Array.isArray(equation) || equation[0] !== 'Equal' || equation.length !== 3) {
    return undefined;
  }
  const [left, right] = equation.slice(1);
  if (left === placeholder) return { rhs: right };
  if (
    !Array.isArray(left)
    || (left[0] !== 'Multiply' && left[0] !== 'InvisibleOperator')
  ) return undefined;
  const factors = left.slice(1);
  if (factors.filter((factor) => factor === placeholder).length !== 1) return undefined;
  const remaining = factors.filter((factor) => factor !== placeholder);
  const nonzeroFactor = remaining.length === 0
    ? 1
    : remaining.length === 1
      ? remaining[0]
      : ['Multiply', ...remaining];
  return {
    rhs: nonzeroFactor === 1 ? right : ['Divide', right, nonzeroFactor],
    ...(nonzeroFactor === 1 ? {} : { nonzeroFactor }),
  };
}

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
          lineKind: 'text',
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
            lineKind: 'text',
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
  const solvedAnswer = solved.mathJsonLeaves?.find(
    (leaf) => leaf.canonicalLatex === solved.exactLatex,
  )?.mathJson;
  const generatedEquation = solved.mathJsonLeaves?.find(
    (leaf) => leaf.canonicalLatex === solved.generatedEquationLatex,
  )?.mathJson;
  const isolated = isolatePlaceholderProduct(generatedEquation, placeholder);
  const rhsMathJson = Array.isArray(solvedAnswer)
    && solvedAnswer[0] === 'Equal'
    && solvedAnswer[1] === placeholder
      ? solvedAnswer[2]
      : isolated?.rhs;
  const derivativeMathJson = displayDerivativeMathJson(displayDerivative);
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
        lineKind: 'text',
        lines: [
          `Internal derivative placeholder: ${placeholder}`,
          `Display derivative: ${displayDerivative}`,
          `Equation isolated: ${solved.exactLatex}`,
          `Mapped result: ${exactLatex}`,
        ],
      },
      ...solved.detailSections,
    ],
    mathJsonLeaves: [
      ...(solved.mathJsonLeaves ?? []),
      ...(rhsMathJson !== undefined && derivativeMathJson
        ? [{
            canonicalLatex: exactLatex,
            mathJson: ['Equal', derivativeMathJson, rhsMathJson],
            source: 'calculus-implicit-derivative-mapped-answer',
          }]
        : []),
      ...(isolated?.nonzeroFactor !== undefined
        ? (solved.exactSupplementLatex ?? []).map((canonicalLatex) => ({
            canonicalLatex,
            mathJson: ['NotEqual', isolated.nonzeroFactor, 0],
            source: 'calculus-implicit-derivative-nonzero-factor',
          }))
        : []),
    ],
  };
}
