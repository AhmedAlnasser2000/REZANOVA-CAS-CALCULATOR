import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import { exactScalarToNumber, readExactScalarNode } from '../../algebra/polynomial-core';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import {
  solveGeneratedRealCubicCardanoFormulaEquation,
  solveGeneratedRealQuarticFerrariFormulaEquation,
} from './generated-formula-routes';
import {
  exactLatexForSolutions,
} from './generated-handoff';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import type {
  AlgebraicCarrier,
  MathJson,
  MixedAffine,
  SolveCarrierResult,
} from './mixed-algebraic';

const MAX_GENERATED_BRANCHES = 8;
const BRANCH_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };

type BranchHelpers = {
  addNodes: (...nodes: MathJson[]) => MathJson;
  divideNodes: (numerator: MathJson, denominator: MathJson) => MathJson;
  expandedSquareNode: (node: MathJson) => MathJson;
  isZeroNode: (node: unknown) => boolean;
  latexForNode: (node: MathJson) => string;
  multiplyNodes: (...nodes: MathJson[]) => MathJson;
  negateNode: (node: MathJson) => MathJson;
  nonnegativeFactForNode: (node: MathJson) => string | null;
  nonzeroFactForNode: (node: MathJson) => string | null;
  squareNode: (node: MathJson) => MathJson;
  subtractNodes: (left: MathJson, right: MathJson) => MathJson;
};

export function exactLatexForMixedAlgebraicSolutions(target: string, solutionExpressions: string[]) {
  return exactLatexForSolutions(target, solutionExpressions);
}

function mixedAlgebraicBranchFamilies(
  allowFormulaHandoff: boolean,
): GeneratedBranchHandoffFamily[] {
  return [
    {
      family: 'linear',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedLinearEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedPolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'rational',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedRationalEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'factorable-polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedFactorablePolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    ...(
      allowFormulaHandoff
        ? [
            {
              family: 'cubic-cardano' as const,
              solve: (branchLatex: string, branchTarget: string) =>
                solveGeneratedRealCubicCardanoFormulaEquation(branchLatex, branchTarget),
            },
            {
              family: 'quartic-ferrari' as const,
              solve: (branchLatex: string, branchTarget: string) =>
                solveGeneratedRealQuarticFerrariFormulaEquation(branchLatex, branchTarget),
            },
          ]
        : []
    ),
  ];
}

function branchEquationsForCarrier(
  carrier: AlgebraicCarrier,
  value: MathJson,
  helpers: BranchHelpers,
) {
  const innerLatex = helpers.latexForNode(carrier.inner);
  const valueLatex = helpers.latexForNode(value);
  if (carrier.kind === 'square-root') {
    return [`${innerLatex}=${helpers.latexForNode(helpers.expandedSquareNode(value))}`];
  }
  if (carrier.kind === 'square-power') {
    return [
      `${innerLatex}=\\sqrt{${valueLatex}}`,
      `${innerLatex}=-\\sqrt{${valueLatex}}`,
    ];
  }
  const exactValue = readExactScalarNode(value);
  if (exactValue) {
    const numericValue = exactScalarToNumber(exactValue);
    if (numericValue < 0) {
      return [];
    }
    if (Math.abs(numericValue) <= 1e-12) {
      return [`${innerLatex}=${valueLatex}`];
    }
  }
  return [
    `${innerLatex}=${valueLatex}`,
    `${innerLatex}=${helpers.latexForNode(helpers.negateNode(value))}`,
  ];
}

function squareEquivalentForCarrier(carrier: AlgebraicCarrier, helpers: BranchHelpers): MathJson | null {
  if (carrier.kind === 'square-root') {
    return carrier.inner;
  }
  if (carrier.kind === 'absolute-value') {
    return helpers.squareNode(carrier.inner);
  }
  return null;
}

function mixedBranchFailureMessage(
  attempts: GeneratedBranchHandoffAttempt[],
) {
  const polynomial = attempts.find((attempt) => attempt.family === 'polynomial')?.result;
  const rational = attempts.find((attempt) => attempt.family === 'rational')?.result;
  const factorable = attempts.find((attempt) => attempt.family === 'factorable-polynomial')?.result;
  if (rational && rational.reason !== 'not-rational') {
    return rational.message;
  }
  return polynomial?.message
    ?? rational?.message
    ?? factorable?.message
    ?? 'This generated mixed algebraic branch is outside current selected-target parameter solvers.';
}

function solveSingleCarrierAffine(
  carrier: AlgebraicCarrier,
  coefficient: MathJson,
  constant: MathJson,
  target: string,
  helpers: BranchHelpers,
  extraFacts: string[] = [],
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
  formulaHandoff?: { domain: 'real' },
): SolveCarrierResult {
  if (helpers.isZeroNode(coefficient)) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'The algebraic carrier cancels before isolation.',
    };
  }

  const value = helpers.divideNodes(helpers.negateNode(constant), coefficient);
  const branchEquations = branchEquationsForCarrier(carrier, value, helpers);
  if (branchEquations.length === 0) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'No real solutions because absolute values are always nonnegative.',
    };
  }
  if (branchEquations.length > MAX_GENERATED_BRANCHES) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Algebraic mixed-carrier branch generation exceeded the supported cap.',
    };
  }

  const allowFormulaHandoff = formulaHandoff?.domain === 'real' && carrier.kind === 'square-root';
  const solvedBranches = solveGeneratedBranchEquations({
    branchEquations,
    target,
    families: mixedAlgebraicBranchFamilies(allowFormulaHandoff),
    searchTrace,
    dropComplexInfinity: true,
    failureMessage: ({ attempts }) => mixedBranchFailureMessage(attempts),
    ...(allowFormulaHandoff
      ? {
          formulaValidationEvidence: () => ({
            wrapperBackSubstitutionValidated: true,
            candidatesValidated: true,
            caseMathPreserved: true,
            scopedFactsPreserved: true,
          }),
        }
      : {}),
  });
  if (solvedBranches.kind === 'unsupported') {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: solvedBranches.message,
    };
  }

  const supplements = [
    helpers.nonzeroFactForNode(coefficient),
    carrier.kind === 'square-root' || carrier.kind === 'absolute-value' || carrier.kind === 'square-power'
      ? helpers.nonnegativeFactForNode(value)
      : null,
    ...extraFacts,
    ...solvedBranches.exactSupplementLatex,
  ].filter((entry): entry is string => Boolean(entry));

  return {
    kind: 'success',
    solutions: solvedBranches.solutionExpressions,
    supplements: [...new Set(supplements)],
    generatedEquations: branchEquations,
    ...(solvedBranches.formulaPayloads?.length === 1
      ? { formulaPayload: solvedBranches.formulaPayloads[0] }
      : {}),
  };
}

function solveTwoCarrierAffine(
  affine: MixedAffine,
  target: string,
  helpers: BranchHelpers,
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
): SolveCarrierResult {
  const [first, second] = affine.terms;
  if (!first || !second) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'Two algebraic carriers were expected before branch generation.',
    };
  }

  if (first.carrier.kind === 'square-power') {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'Square-power mixed-carrier branches need a simpler companion before this exact pass can solve them.',
    };
  }

  const p = helpers.divideNodes(helpers.negateNode(affine.constant), first.coefficient);
  const q = helpers.divideNodes(helpers.negateNode(second.coefficient), first.coefficient);
  const isolatedFirstFact = helpers.nonnegativeFactForNode(
    helpers.addNodes(p, helpers.multiplyNodes(q, second.carrier.node)),
  );
  const firstCoefficientFact = helpers.nonzeroFactForNode(first.coefficient);
  const inheritedFacts = affine.facts;

  if (first.carrier.kind === 'square-root') {
    const secondSquare = squareEquivalentForCarrier(second.carrier, helpers);
    if (!secondSquare) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'This square-root mixed-carrier branch would introduce a nested carrier outside the supported pass.',
      };
    }

    const coefficient = helpers.multiplyNodes(2, p, q);
    if (helpers.isZeroNode(coefficient)) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'The mixed square-root branch cancels before a bounded second-carrier isolation.',
      };
    }

    const constant = helpers.subtractNodes(
      helpers.addNodes(
        helpers.expandedSquareNode(p),
        helpers.multiplyNodes(helpers.expandedSquareNode(q), secondSquare),
      ),
      first.carrier.inner,
    );
    const solved = solveSingleCarrierAffine(
      second.carrier,
      coefficient,
      constant,
      target,
      helpers,
      [
        ...inheritedFacts,
        firstCoefficientFact,
        isolatedFirstFact,
      ].filter((entry): entry is string => Boolean(entry)),
      searchTrace,
    );
    if (solved.kind === 'unsupported') {
      return solved;
    }
    return {
      ...solved,
      generatedEquations: [
        `${helpers.latexForNode(first.carrier.inner)}=${
          helpers.latexForNode(
            helpers.expandedSquareNode(helpers.addNodes(p, helpers.multiplyNodes(q, second.carrier.node))),
          )
        }`,
        ...solved.generatedEquations,
      ],
    };
  }

  const branchAffines = [
    {
      coefficient: helpers.negateNode(q),
      constant: helpers.subtractNodes(first.carrier.inner, p),
    },
    {
      coefficient: q,
      constant: helpers.addNodes(first.carrier.inner, p),
    },
  ];
  const branchResults = branchAffines.map((branch) =>
    solveSingleCarrierAffine(
      second.carrier,
      branch.coefficient,
      branch.constant,
      target,
      helpers,
      [
        ...inheritedFacts,
        firstCoefficientFact,
        isolatedFirstFact,
      ].filter((entry): entry is string => Boolean(entry)),
      searchTrace,
    ));
  const failedBranch = branchResults.find((entry) => entry.kind === 'unsupported');
  if (failedBranch?.kind === 'unsupported') {
    return failedBranch;
  }
  const successes = branchResults.filter(
    (entry): entry is Extract<SolveCarrierResult, { kind: 'success' }> => entry.kind === 'success',
  );
  const generatedEquations = successes.flatMap((entry) => entry.generatedEquations);
  if (generatedEquations.length > MAX_GENERATED_BRANCHES) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Algebraic mixed-carrier branch generation exceeded the supported cap.',
    };
  }
  return {
    kind: 'success',
    solutions: successes.flatMap((entry) => entry.solutions),
    supplements: [...new Set(successes.flatMap((entry) => entry.supplements))],
    generatedEquations,
  };
}

export function solveMixedAffine(
  affine: MixedAffine,
  target: string,
  helpers: BranchHelpers,
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
  formulaHandoff?: { domain: 'real' },
): SolveCarrierResult {
  if (affine.terms.length === 1) {
    const [term] = affine.terms;
    return solveSingleCarrierAffine(
      term.carrier,
      term.coefficient,
      affine.constant,
      target,
      helpers,
      affine.facts,
      searchTrace,
      formulaHandoff,
    );
  }

  if (affine.terms.length === 2) {
    return solveTwoCarrierAffine(affine, target, helpers, searchTrace);
  }

  return {
    kind: 'unsupported',
    reason: 'no-mixed-algebraic',
    message: 'No additive algebraic selected-target carriers were found.',
  };
}
