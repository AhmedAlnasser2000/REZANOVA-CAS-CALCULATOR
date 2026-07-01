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
  addSymbolicCoefficients,
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
import { solveRischNormanLinearSystem } from './risch-norman/linear-solver';

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

const RDE_EXACT_RATIONAL_POLYNOMIAL_CAP = 12;
const RDE_TARGET_FREE_SYMBOLIC_POLYNOMIAL_CAP = 10;

function isRdeBuildStop(value: unknown): value is TranscendentalRdeBuildStop {
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
  const parsed = parseSymbolicPolynomial(node, variable, RDE_EXACT_RATIONAL_POLYNOMIAL_CAP);
  if (parsed.kind === 'success') {
    if (
      parsed.polynomial.degree > RDE_TARGET_FREE_SYMBOLIC_POLYNOMIAL_CAP
      && polynomialUsesTargetFreeSymbolicCoefficients(parsed.polynomial)
    ) {
      return stop(
        variable,
        'over-cap-degree',
        `RDE ${label} polynomial degree ${parsed.polynomial.degree} exceeds the target-free symbolic cap ${RDE_TARGET_FREE_SYMBOLIC_POLYNOMIAL_CAP}.`,
        { polynomialReason: 'over-cap-degree' },
      );
    }
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

function polynomialUsesTargetFreeSymbolicCoefficients(polynomial: SymbolicPolynomial) {
  return polynomial.coefficients.some((coefficient) => !readExactScalarNode(coefficient.node));
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

function checkedCoefficient(
  variable: string,
  result:
    | ReturnType<typeof addSymbolicCoefficients>
    | ReturnType<typeof subtractSymbolicCoefficients>
    | ReturnType<typeof multiplySymbolicCoefficients>
    | ReturnType<typeof divideSymbolicCoefficients>,
  detail: string,
): SymbolicCoefficient | TranscendentalRdeBuildStop {
  if (result.kind === 'success') {
    return result.coefficient;
  }
  return stop(variable, mapCoefficientStop(result.reason), detail, { coefficientReason: result.reason });
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

type RdeLinearRow = {
  degree: number;
  entries: SymbolicCoefficient[];
  rhs: SymbolicCoefficient;
};

function addToMatrixEntry(
  variable: string,
  existing: SymbolicCoefficient,
  contribution: SymbolicCoefficient,
) {
  return checkedCoefficient(
    variable,
    addSymbolicCoefficients(existing, contribution, variable),
    'RDE coefficient-comparison stopped while adding matrix contributions.',
  );
}

function buildCoefficientComparisonRows(
  equation: TranscendentalRdeEquation,
  solutionDegree: number,
): RdeLinearRow[] | TranscendentalRdeBuildStop {
  const variable = equation.variable;
  const coefficient = normalizeSymbolicPolynomial(equation.coefficientPolynomial);
  const rhs = normalizeSymbolicPolynomial(equation.rhsPolynomial);
  const equationDegree = Math.max(
    rhs.degree,
    coefficient.degree + solutionDegree,
    solutionDegree > 0 ? solutionDegree - 1 : 0,
  );
  const zero = zeroCoefficient(variable);
  const rows: RdeLinearRow[] = [];

  for (let degree = 0; degree <= equationDegree; degree += 1) {
    const entries: SymbolicCoefficient[] = Array.from({ length: solutionDegree + 1 }, () => zero);
    for (let unknownDegree = 0; unknownDegree <= solutionDegree; unknownDegree += 1) {
      let entry = entries[unknownDegree];
      if (unknownDegree > 0 && degree === unknownDegree - 1) {
        const derivativeFactor = coefficientForInteger(unknownDegree, variable);
        if (!derivativeFactor) {
          return stop(variable, 'coefficient-stop', 'Unable to build exact derivative factor for RDE coefficient comparison.');
        }
        const combined = addToMatrixEntry(variable, entry, derivativeFactor);
        if (isRdeBuildStop(combined)) {
          return combined;
        }
        entry = combined;
      }

      const coefficientDegree = degree - unknownDegree;
      if (coefficientDegree >= 0 && coefficientDegree <= coefficient.degree) {
        const combined = addToMatrixEntry(
          variable,
          entry,
          getSymbolicPolynomialCoefficient(coefficient, coefficientDegree),
        );
        if (isRdeBuildStop(combined)) {
          return combined;
        }
        entry = combined;
      }

      entries[unknownDegree] = entry;
    }

    rows.push({
      degree,
      entries,
      rhs: getSymbolicPolynomialCoefficient(rhs, degree),
    });
  }

  return rows;
}

function rowHasMatrixEntry(row: RdeLinearRow) {
  return row.entries.some((entry) => !isSymbolicCoefficientZero(entry));
}

function rowIsInconsistent(row: RdeLinearRow) {
  return !rowHasMatrixEntry(row) && !isSymbolicCoefficientZero(row.rhs);
}

function candidateRowSelections(rows: RdeLinearRow[], size: number) {
  const active = rows.filter(rowHasMatrixEntry);
  if (active.length < size) {
    return [];
  }

  const selections: RdeLinearRow[][] = [];
  const seen = new Set<string>();
  const addSelection = (selection: RdeLinearRow[]) => {
    if (selection.length !== size) {
      return;
    }
    const key = selection.map((row) => row.degree).join(',');
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    selections.push(selection);
  };

  addSelection(active.slice(0, size));
  addSelection(active.slice(-size));
  for (let start = 0; start <= active.length - size; start += 1) {
    addSelection(active.slice(start, start + size));
  }

  return selections;
}

function verifyCoefficientComparisonSolution(
  rows: RdeLinearRow[],
  solution: SymbolicCoefficient[],
  variable: string,
) {
  const zero = zeroCoefficient(variable);
  for (const row of rows) {
    let sum = zero;
    for (let index = 0; index < row.entries.length; index += 1) {
      if (isSymbolicCoefficientZero(row.entries[index]) || isSymbolicCoefficientZero(solution[index])) {
        continue;
      }
      const product = checkedCoefficient(
        variable,
        multiplySymbolicCoefficients(row.entries[index], solution[index], variable),
        'RDE coefficient-comparison stopped while verifying a solved row product.',
      );
      if (isRdeBuildStop(product)) {
        return product;
      }
      const combined = checkedCoefficient(
        variable,
        addSymbolicCoefficients(sum, product, variable),
        'RDE coefficient-comparison stopped while verifying a solved row sum.',
      );
      if (isRdeBuildStop(combined)) {
        return combined;
      }
      sum = combined;
    }

    const residual = checkedCoefficient(
      variable,
      subtractSymbolicCoefficients(sum, row.rhs, variable),
      'RDE coefficient-comparison stopped while verifying the solved residual.',
    );
    if (isRdeBuildStop(residual)) {
      return residual;
    }
    if (!isSymbolicCoefficientZero(residual)) {
      return false;
    }
  }
  return true;
}

function solveParametricCoefficientComparisonRde(
  equation: TranscendentalRdeEquation,
): TranscendentalRdeSolveResult | undefined {
  const variable = equation.variable;
  const coefficient = normalizeSymbolicPolynomial(equation.coefficientPolynomial);
  const rhs = normalizeSymbolicPolynomial(equation.rhsPolynomial);
  const cap = polynomialUsesTargetFreeSymbolicCoefficients(equation.coefficientPolynomial)
    || polynomialUsesTargetFreeSymbolicCoefficients(equation.rhsPolynomial)
    ? RDE_TARGET_FREE_SYMBOLIC_POLYNOMIAL_CAP
    : RDE_EXACT_RATIONAL_POLYNOMIAL_CAP;
  const maxSolutionDegree = rhs.degree - coefficient.degree;
  if (maxSolutionDegree < 0) {
    return undefined;
  }

  let lastStop: TranscendentalRdeBuildStop | undefined;
  for (let solutionDegree = 0; solutionDegree <= Math.min(cap, maxSolutionDegree); solutionDegree += 1) {
    const rows = buildCoefficientComparisonRows(equation, solutionDegree);
    if (isRdeBuildStop(rows)) {
      return rows;
    }
    if (rows.some(rowIsInconsistent)) {
      continue;
    }

    const unknownCount = solutionDegree + 1;
    for (const selection of candidateRowSelections(rows, unknownCount)) {
      const solved = solveRischNormanLinearSystem(
        selection.map((row) => row.entries),
        selection.map((row) => row.rhs),
        variable,
        RDE_EXACT_RATIONAL_POLYNOMIAL_CAP + 1,
      );
      if (solved.kind === 'stop') {
        if (solved.reason === 'coefficient-stop') {
          lastStop = stop(
            variable,
            solved.coefficientReason ? mapCoefficientStop(solved.coefficientReason) : 'coefficient-stop',
            solved.detail ?? 'RDE coefficient-comparison linear solve stopped on coefficient arithmetic.',
            { coefficientReason: solved.coefficientReason },
          );
          continue;
        }
        continue;
      }

      const verified = verifyCoefficientComparisonSolution(rows, solved.solution, variable);
      if (isRdeBuildStop(verified)) {
        return verified;
      }
      if (!verified) {
        continue;
      }

      return buildSolution(
        equation,
        solved.solution,
        'Solved the first-order RDE by bounded parametric coefficient comparison.',
        [
          `Used a polynomial ansatz for r(${variable}) of degree ${solutionDegree}.`,
          'Matched coefficients in r\'(v)+A(v)r(v)=B(v) and solved the resulting exact linear system.',
          'Verified every coefficient equation exactly before accepting the polynomial certificate.',
        ],
      );
    }
  }

  return lastStop;
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

  const parametric = solveParametricCoefficientComparisonRde(equation);
  if (parametric) {
    return parametric;
  }

  if (rhs.degree === 0) {
    return obstructionForPolynomialCoefficient(equation);
  }

  return stop(
    equation.variable,
    'unsupported-nonconstant-rhs',
    'The bounded RDE coefficient-comparison solver did not find a supported polynomial certificate within the active cap.',
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
  const exponent = parsePolynomialForRde(input.exponentNode, variable, 'coefficient');
  if (isRdeBuildStop(exponent)) {
    return exponent;
  }

  const derivative = derivativeSymbolicPolynomial(exponent);
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
