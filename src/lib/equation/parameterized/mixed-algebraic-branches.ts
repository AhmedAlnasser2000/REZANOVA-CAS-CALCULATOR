import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import {
  type GeneratedHandoffSuccess,
  exactLatexForSolutions,
  solutionExpressionsFromExactLatex,
} from './generated-handoff';
import type {
  AlgebraicCarrier,
  BranchSolveResult,
  MathJson,
  MixedAffine,
  SolveCarrierResult,
} from './mixed-algebraic';

const MAX_GENERATED_BRANCHES = 8;

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

function solveGeneratedEquation(
  equationLatex: string,
  target: string,
): BranchSolveResult {
  const options = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(equationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  const factorable = solveParameterizedFactorablePolynomialEquation(equationLatex, target);
  if (factorable.kind === 'success') {
    return factorable;
  }

  return {
    kind: 'unsupported',
    reason: 'unsupported-branch',
    message: rational.reason === 'not-rational' ? polynomial.message : rational.message,
  };
}

function solveSingleCarrierAffine(
  carrier: AlgebraicCarrier,
  coefficient: MathJson,
  constant: MathJson,
  target: string,
  helpers: BranchHelpers,
  extraFacts: string[] = [],
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
  if (branchEquations.length > MAX_GENERATED_BRANCHES) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Algebraic mixed-carrier branch generation exceeded the supported cap.',
    };
  }

  const solvedBranches = branchEquations.map((equationLatex) => solveGeneratedEquation(equationLatex, target));
  const failedBranch = solvedBranches.find((entry) => entry.kind === 'unsupported');
  if (failedBranch?.kind === 'unsupported') {
    return failedBranch;
  }

  const successfulBranches = solvedBranches.filter(
    (entry): entry is GeneratedHandoffSuccess => entry.kind === 'success',
  );
  const solutions = successfulBranches.flatMap((branch) =>
    solutionExpressionsFromExactLatex(branch.exactLatex, target, { dropComplexInfinity: true }));
  const supplements = [
    helpers.nonzeroFactForNode(coefficient),
    carrier.kind === 'square-root' || carrier.kind === 'absolute-value' || carrier.kind === 'square-power'
      ? helpers.nonnegativeFactForNode(value)
      : null,
    ...extraFacts,
    ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
  ].filter((entry): entry is string => Boolean(entry));

  return {
    kind: 'success',
    solutions,
    supplements: [...new Set(supplements)],
    generatedEquations: branchEquations,
  };
}

function solveTwoCarrierAffine(
  affine: MixedAffine,
  target: string,
  helpers: BranchHelpers,
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
): SolveCarrierResult {
  if (affine.terms.length === 1) {
    const [term] = affine.terms;
    return solveSingleCarrierAffine(term.carrier, term.coefficient, affine.constant, target, helpers, affine.facts);
  }

  if (affine.terms.length === 2) {
    return solveTwoCarrierAffine(affine, target, helpers);
  }

  return {
    kind: 'unsupported',
    reason: 'no-mixed-algebraic',
    message: 'No additive algebraic selected-target carriers were found.',
  };
}
