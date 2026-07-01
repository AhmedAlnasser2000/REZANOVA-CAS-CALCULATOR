import { readExactScalarNode } from '../../algebra/polynomial-core';
import { boxLatex } from '../patterns';
import {
  buildSymbolicPolynomialNode,
  derivativeSymbolicPolynomial,
  getSymbolicPolynomialCoefficient,
  normalizeSymbolicPolynomial,
  parseSymbolicPolynomial,
  symbolicPolynomialIsZero,
  type SymbolicPolynomial,
  type SymbolicPolynomialStopReason,
} from '../primitives/symbolic-polynomial';
import {
  divideSymbolicCoefficients,
  isSymbolicCoefficientZero,
  mergeSymbolicCoefficientFacts,
  multiplySymbolicCoefficients,
  parseSymbolicCoefficient,
  subtractSymbolicCoefficients,
  type SymbolicCoefficient,
  type SymbolicCoefficientStopReason,
} from '../primitives/coefficient-domain';
import {
  coefficientFactsToTranscendentalConstantFacts,
  mergeTranscendentalConstantFieldFacts,
  transcendentalConstantFactsToExactSupplementLatex,
  transcendentalConstantFieldFact,
  type TranscendentalConstantFieldFact,
} from './transcendental-constant-field';

export type TranscendentalRdeStopReason =
  | 'branch-sensitive-carrier'
  | 'coefficient-stop'
  | 'decimal-coefficient'
  | 'malformed'
  | 'over-cap-degree'
  | 'selected-variable-dependent'
  | 'unsupported-coefficient'
  | 'unsupported-nonconstant-rhs'
  | 'unsupported-rational-shape'
  | 'zero-denominator';

export type TranscendentalRdeEquation = {
  kind: 'rde-equation';
  variable: string;
  equationKind: 'first-order-linear-rational-certificate';
  coefficientPolynomial: SymbolicPolynomial;
  rhsPolynomial: SymbolicPolynomial;
  coefficientLatex: string;
  rhsLatex: string;
  equationLatex: string;
  facts: TranscendentalConstantFieldFact[];
  exactSupplementLatex?: string[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalRdeBuildStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalRdeStopReason;
  detail: string;
  coefficientReason?: SymbolicCoefficientStopReason;
  polynomialReason?: SymbolicPolynomialStopReason;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalRdeBuildResult =
  | { kind: 'success'; equation: TranscendentalRdeEquation }
  | TranscendentalRdeBuildStop;

export type TranscendentalRdeSolution = {
  kind: 'solution';
  solutionKind: 'polynomial';
  variable: string;
  equation: TranscendentalRdeEquation;
  solutionPolynomial: SymbolicPolynomial;
  solutionNode: unknown;
  solutionLatex: string;
  facts: TranscendentalConstantFieldFact[];
  exactSupplementLatex?: string[];
  proofSummary: string;
  proofSteps: string[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalRdeObstruction = {
  kind: 'obstruction';
  obstruction: 'no-rational-solution-polynomial-degree';
  variable: string;
  equation: TranscendentalRdeEquation;
  facts: TranscendentalConstantFieldFact[];
  exactSupplementLatex?: string[];
  proofSummary: string;
  proofSteps: string[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalRdeSolveResult =
  | TranscendentalRdeSolution
  | TranscendentalRdeObstruction
  | TranscendentalRdeBuildStop;

const RDE_POLYNOMIAL_CAP = 8;

function isRdeBuildStop(
  value: SymbolicPolynomial | TranscendentalRdeBuildStop,
): value is TranscendentalRdeBuildStop {
  return (value as TranscendentalRdeBuildStop).kind === 'stop';
}

function stop(
  variable: string,
  reason: TranscendentalRdeStopReason,
  detail: string,
  metadata: {
    coefficientReason?: SymbolicCoefficientStopReason;
    polynomialReason?: SymbolicPolynomialStopReason;
  } = {},
): TranscendentalRdeBuildStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    coefficientReason: metadata.coefficientReason,
    polynomialReason: metadata.polynomialReason,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function mapCoefficientStop(reason: SymbolicCoefficientStopReason): TranscendentalRdeStopReason {
  switch (reason) {
    case 'branch-sensitive':
      return 'branch-sensitive-carrier';
    case 'inexact-coefficient':
      return 'decimal-coefficient';
    case 'selected-variable-dependent-coefficient':
      return 'selected-variable-dependent';
    case 'unsupported-transcendental-coefficient':
      return 'unsupported-coefficient';
    case 'zero-denominator':
      return 'zero-denominator';
    case 'node-limit':
    default:
      return 'coefficient-stop';
  }
}

function mapPolynomialStop(
  reason: SymbolicPolynomialStopReason,
  coefficientReason?: SymbolicCoefficientStopReason,
): TranscendentalRdeStopReason {
  if (coefficientReason) {
    return mapCoefficientStop(coefficientReason);
  }
  if (reason === 'over-cap-degree') {
    return 'over-cap-degree';
  }
  if (reason === 'selected-variable-dependent-coefficient') {
    return 'selected-variable-dependent';
  }
  return 'unsupported-coefficient';
}

function parsePolynomialForRde(node: unknown, variable: string, label: 'coefficient' | 'right-hand side') {
  const parsed = parseSymbolicPolynomial(node, variable, RDE_POLYNOMIAL_CAP);
  if (parsed.kind === 'success') {
    return parsed.polynomial;
  }

  return stop(
    variable,
    mapPolynomialStop(parsed.reason, parsed.coefficientReason),
    `RDE ${label} polynomial parsing stopped: ${parsed.detail ?? parsed.reason}.`,
    {
      coefficientReason: parsed.coefficientReason,
      polynomialReason: parsed.reason,
    },
  );
}

function nonzeroFactForCoefficient(
  coefficient: SymbolicCoefficient,
  source: 'proof-obligation' | 'denominator' = 'proof-obligation',
) {
  const scalar = readExactScalarNode(coefficient.node);
  if (scalar && scalar.numerator !== 0) {
    return [];
  }
  return [
    transcendentalConstantFieldFact('nonzero', coefficient.latex, {
      source,
      relation: '\\ne0',
    }),
  ];
}

function polynomialFactsToConstantFacts(polynomial: SymbolicPolynomial) {
  return coefficientFactsToTranscendentalConstantFacts(polynomial.facts);
}

function factsForEquation(
  coefficientPolynomial: SymbolicPolynomial,
  rhsPolynomial: SymbolicPolynomial,
) {
  const coefficient = normalizeSymbolicPolynomial(coefficientPolynomial);
  const leading = getSymbolicPolynomialCoefficient(coefficient, coefficient.degree);
  return mergeTranscendentalConstantFieldFacts([
    ...polynomialFactsToConstantFacts(coefficient),
    ...polynomialFactsToConstantFacts(rhsPolynomial),
    ...(coefficient.degree > 0 ? nonzeroFactForCoefficient(leading) : []),
  ]);
}

function equationLatex(variable: string, coefficientLatex: string, rhsLatex: string) {
  return String.raw`r'(${variable})+\left(${coefficientLatex}\right)r(${variable})=${rhsLatex}`;
}

function zeroCoefficient(variable: string): SymbolicCoefficient {
  const zero = parseSymbolicCoefficient(0, variable);
  if (zero.kind === 'stop') {
    throw new Error(`Unable to build zero RDE coefficient: ${zero.reason}`);
  }
  return zero.coefficient;
}

function coefficientForInteger(value: number, variable: string) {
  const parsed = parseSymbolicCoefficient(value, variable);
  return parsed.kind === 'success' ? parsed.coefficient : undefined;
}

function buildSolution(
  equation: TranscendentalRdeEquation,
  coefficients: SymbolicCoefficient[],
  proofSummary: string,
  proofSteps: string[],
): TranscendentalRdeSolution {
  const solutionPolynomial = normalizeSymbolicPolynomial({
    variable: equation.variable,
    degree: Math.max(0, coefficients.length - 1),
    coefficients,
    facts: mergeSymbolicCoefficientFacts(coefficients.flatMap((coefficient) => coefficient.facts)),
  });
  const solutionNode = buildSymbolicPolynomialNode(solutionPolynomial);
  const facts = mergeTranscendentalConstantFieldFacts([
    ...equation.facts,
    ...polynomialFactsToConstantFacts(solutionPolynomial),
  ]);

  return {
    kind: 'solution',
    solutionKind: 'polynomial',
    variable: equation.variable,
    equation,
    solutionPolynomial,
    solutionNode,
    solutionLatex: boxLatex(solutionNode),
    facts,
    exactSupplementLatex: transcendentalConstantFactsToExactSupplementLatex(facts),
    proofSummary,
    proofSteps,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function solveZeroCoefficientRde(equation: TranscendentalRdeEquation): TranscendentalRdeSolveResult {
  const variable = equation.variable;
  const zero = zeroCoefficient(variable);
  const coefficients: SymbolicCoefficient[] = [zero];
  for (let degree = 0; degree <= equation.rhsPolynomial.degree; degree += 1) {
    const divisor = coefficientForInteger(degree + 1, variable);
    if (!divisor) {
      return stop(variable, 'coefficient-stop', 'Unable to build exact integer divisor for RDE integration.');
    }
    const divided = divideSymbolicCoefficients(
      getSymbolicPolynomialCoefficient(equation.rhsPolynomial, degree),
      divisor,
      variable,
    );
    if (divided.kind === 'stop') {
      return stop(
        variable,
        mapCoefficientStop(divided.reason),
        `RDE polynomial integration stopped while dividing by ${degree + 1}.`,
        { coefficientReason: divided.reason },
      );
    }
    coefficients[degree + 1] = divided.coefficient;
  }

  return buildSolution(
    equation,
    coefficients,
    'Solved the first-order RDE by exact polynomial integration because the coefficient term is zero.',
    [
      'The equation reduces to r\'(v)=P(v).',
      'Each polynomial coefficient is divided by its exact integer degree shift.',
      'No numeric or Compute Engine proof evidence is used.',
    ],
  );
}

function solveConstantCoefficientRde(
  equation: TranscendentalRdeEquation,
  coefficient: SymbolicCoefficient,
): TranscendentalRdeSolveResult {
  const variable = equation.variable;
  const zero = zeroCoefficient(variable);
  const coefficients: SymbolicCoefficient[] = Array.from(
    { length: equation.rhsPolynomial.degree + 2 },
    () => zero,
  );

  for (let degree = equation.rhsPolynomial.degree; degree >= 0; degree -= 1) {
    let numerator = getSymbolicPolynomialCoefficient(equation.rhsPolynomial, degree);
    const next = coefficients[degree + 1];
    if (next && !isSymbolicCoefficientZero(next)) {
      const factor = coefficientForInteger(degree + 1, variable);
      if (!factor) {
        return stop(variable, 'coefficient-stop', 'Unable to build exact integer derivative factor.');
      }
      const derivativeContribution = multiplySymbolicCoefficients(next, factor, variable);
      if (derivativeContribution.kind === 'stop') {
        return stop(
          variable,
          mapCoefficientStop(derivativeContribution.reason),
          'RDE recurrence stopped while building the derivative contribution.',
          { coefficientReason: derivativeContribution.reason },
        );
      }
      const adjusted = subtractSymbolicCoefficients(numerator, derivativeContribution.coefficient, variable);
      if (adjusted.kind === 'stop') {
        return stop(
          variable,
          mapCoefficientStop(adjusted.reason),
          'RDE recurrence stopped while subtracting the derivative contribution.',
          { coefficientReason: adjusted.reason },
        );
      }
      numerator = adjusted.coefficient;
    }

    const divided = divideSymbolicCoefficients(numerator, coefficient, variable);
    if (divided.kind === 'stop') {
      return stop(
        variable,
        mapCoefficientStop(divided.reason),
        'RDE recurrence stopped while dividing by the constant coefficient.',
        { coefficientReason: divided.reason },
      );
    }
    coefficients[degree] = divided.coefficient;
  }

  return buildSolution(
    equation,
    coefficients,
    'Solved the first-order RDE by exact polynomial recurrence over a nonzero constant coefficient.',
    [
      'The coefficient of r(v) is target-free and constant.',
      'The highest-degree polynomial coefficient is solved first, then the recurrence descends degree by degree.',
      'Any required nonzero pivot facts are recorded as exact supplements.',
    ],
  );
}

function obstructionForPolynomialCoefficient(
  equation: TranscendentalRdeEquation,
): TranscendentalRdeObstruction {
  return {
    kind: 'obstruction',
    obstruction: 'no-rational-solution-polynomial-degree',
    variable: equation.variable,
    equation,
    facts: equation.facts,
    exactSupplementLatex: equation.exactSupplementLatex,
    proofSummary: 'The bounded RDE core proves that this polynomial-coefficient certificate equation has no rational solution in the stated base field.',
    proofSteps: [
      'A rational solution would have no finite poles because the polynomial coefficient has no denominator poles in the base field.',
      'A nonconstant polynomial coefficient in r\'(v)+A(v)r(v)=constant forces incompatible polynomial degrees.',
      'Therefore no rational certificate r(v) exists for this RDE shape.',
    ],
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

export function buildTranscendentalRdeEquation(input: {
  variable?: string;
  coefficientNode: unknown;
  rhsNode: unknown;
}): TranscendentalRdeBuildResult {
  const variable = input.variable ?? 'x';
  const coefficientPolynomial = parsePolynomialForRde(input.coefficientNode, variable, 'coefficient');
  if (isRdeBuildStop(coefficientPolynomial)) {
    return coefficientPolynomial;
  }
  const rhsPolynomial = parsePolynomialForRde(input.rhsNode, variable, 'right-hand side');
  if (isRdeBuildStop(rhsPolynomial)) {
    return rhsPolynomial;
  }

  const coefficientLatex = boxLatex(buildSymbolicPolynomialNode(coefficientPolynomial));
  const rhsLatex = boxLatex(buildSymbolicPolynomialNode(rhsPolynomial));
  const facts = factsForEquation(coefficientPolynomial, rhsPolynomial);

  return {
    kind: 'success',
    equation: {
      kind: 'rde-equation',
      variable,
      equationKind: 'first-order-linear-rational-certificate',
      coefficientPolynomial,
      rhsPolynomial,
      coefficientLatex,
      rhsLatex,
      equationLatex: equationLatex(variable, coefficientLatex, rhsLatex),
      facts,
      exactSupplementLatex: transcendentalConstantFactsToExactSupplementLatex(facts),
      proofMode: 'exact-symbolic-no-compute-engine',
    },
  };
}

export function solveTranscendentalRdeEquation(
  equation: TranscendentalRdeEquation,
): TranscendentalRdeSolveResult {
  const coefficient = normalizeSymbolicPolynomial(equation.coefficientPolynomial);
  const rhs = normalizeSymbolicPolynomial(equation.rhsPolynomial);

  if (symbolicPolynomialIsZero(rhs)) {
    return buildSolution(
      equation,
      [zeroCoefficient(equation.variable)],
      'Solved the homogeneous zero-right-hand-side RDE with the zero rational certificate.',
      ['The zero certificate satisfies r\'(v)+A(v)r(v)=0 exactly.'],
    );
  }

  if (symbolicPolynomialIsZero(coefficient)) {
    return solveZeroCoefficientRde(equation);
  }

  if (coefficient.degree === 0) {
    return solveConstantCoefficientRde(
      equation,
      getSymbolicPolynomialCoefficient(coefficient, 0),
    );
  }

  if (rhs.degree === 0) {
    return obstructionForPolynomialCoefficient(equation);
  }

  return stop(
    equation.variable,
    'unsupported-nonconstant-rhs',
    'The first RDE core only solves nonzero constant-coefficient polynomial RHS cases and constant-RHS obstruction cases for nonconstant coefficients.',
  );
}

export function solveTranscendentalRde(input: {
  variable?: string;
  coefficientNode: unknown;
  rhsNode: unknown;
}): TranscendentalRdeSolveResult {
  const built = buildTranscendentalRdeEquation(input);
  if (built.kind === 'stop') {
    return built;
  }
  return solveTranscendentalRdeEquation(built.equation);
}

export function buildLiouvilleRationalCertificateRde(input: {
  variable?: string;
  exponentNode: unknown;
  rhsNode?: unknown;
}): TranscendentalRdeBuildResult {
  const variable = input.variable ?? 'x';
  const exponent = parseSymbolicPolynomial(input.exponentNode, variable, RDE_POLYNOMIAL_CAP);
  if (exponent.kind === 'stop') {
    return stop(
      variable,
      mapPolynomialStop(exponent.reason, exponent.coefficientReason),
      `Liouville RDE exponent parsing stopped: ${exponent.detail ?? exponent.reason}.`,
      {
        coefficientReason: exponent.coefficientReason,
        polynomialReason: exponent.reason,
      },
    );
  }

  const derivative = derivativeSymbolicPolynomial(exponent.polynomial);
  if (derivative.kind === 'stop') {
    return stop(
      variable,
      mapPolynomialStop(derivative.reason, derivative.coefficientReason),
      `Liouville RDE exponent derivative stopped: ${derivative.detail ?? derivative.reason}.`,
      {
        coefficientReason: derivative.coefficientReason,
        polynomialReason: derivative.reason,
      },
    );
  }

  return buildTranscendentalRdeEquation({
    variable,
    coefficientNode: buildSymbolicPolynomialNode(derivative.polynomial),
    rhsNode: input.rhsNode ?? 1,
  });
}
