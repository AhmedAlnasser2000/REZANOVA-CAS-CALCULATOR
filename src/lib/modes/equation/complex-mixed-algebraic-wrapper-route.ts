import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ComplexExactForm,
  DisplayDetailSection,
  DisplayOutcome,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { exactScalarIsZero, readExactScalarNode } from '../../algebra/polynomial-core';
import { expandMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/expansion/expansion';
import { MAX_COMPLEX_SPECIAL_FORM_DEGREE } from '../../equation/complex/special-form-carrier';
import { solveEquationAlgebraicIsolation } from '../../equation/equation-algebraic-isolation';
import type {
  EquationSelectedTargetRoutePlan,
  EquationSelectedTargetSearchTraceRecorder,
} from '../../equation/equation-target-shape';
import {
  buildPrincipalRootImageFact,
  principalRootImageSupplementLatex,
} from '../../equation/roots/complex-principal-image';
import {
  type ComplexPrincipalRootDegree,
  isComplexPrincipalRootDegree,
} from '../../equation/roots/complex-principal-roots';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from '../../equation/parameterized/math-json';
import { solveParameterizedFactorablePolynomialEquation } from '../../equation/parameterized/factorable-polynomial';
import {
  exactLatexForSolutions,
  solutionExpressionsFromExactLatex,
} from '../../equation/parameterized/generated-handoff';
import {
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from '../../equation/parameterized/generated-branch-handoff';
import { solveParameterizedLinearEquation } from '../../equation/parameterized/linear';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from '../../equation/parameterized/readback';
import { solveParameterizedRationalEquation } from '../../equation/parameterized/rational';
import {
  collectBoundedSymbolicTargetPolynomial,
  symbolicPolynomialDegree,
} from '../../equation/parameterized/symbolic-polynomial';
import { finiteBranchReadbackForNormalizedBranches } from '../../equation/readback/finite-branches';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';

type ComplexMixedAlgebraicWrapperRouteInput = {
  equationLatex: string;
  parameterizedEquationLatex: string;
  selectedTarget: string;
  parameterizedOptions: { allowGeneratedImplicitProducts?: boolean };
  outputStyle: OutputStyle;
  complexExactForm: ComplexExactForm;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  routePlan?: EquationSelectedTargetRoutePlan;
};

type ComplexRootCarrier = {
  inner: MathJson;
  degree: ComplexPrincipalRootDegree;
  key: string;
  labelLatex: string;
};

type MixedRootAffine = {
  coefficient: MathJson;
  remainder: MathJson;
  carrier: ComplexRootCarrier | null;
};

type CollectResult =
  | { kind: 'ok'; affine: MixedRootAffine }
  | { kind: 'blocked'; message: string }
  | { kind: 'none' };

const ce = new ComputeEngine();
const { addNodes, divideNodes, multiplyNodes, negateNode, subtractNodes } = createArithmeticHelpers();
const GENERATED_BRANCH_OPTIONS = { allowGeneratedImplicitProducts: true };

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function exactScalarIsExactZero(node: MathJson) {
  const exact = readExactScalarNode(simplifyNode(node));
  return Boolean(exact && exactScalarIsZero(exact));
}

function exactScalarIsExactNonzero(node: MathJson) {
  const exact = readExactScalarNode(simplifyNode(node));
  return Boolean(exact && !exactScalarIsZero(exact));
}

function isExactlyOne(node: MathJson) {
  const exact = readExactScalarNode(simplifyNode(node));
  return Boolean(exact && exact.numerator === 1 && exact.denominator === 1);
}

function nonzeroFactForNode(node: MathJson) {
  if (exactScalarIsExactNonzero(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne0`;
}

function carrierKey(inner: MathJson, degree: number) {
  return `${degree}|${JSON.stringify(simplifyNode(inner))}`;
}

function hasDeferredTargetCarrier(node: MathJson, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (
      operator === 'Abs'
      || operator === 'Sqrt'
      || operator === 'Root'
      || operator === 'Ln'
      || operator === 'Log'
      || operator === 'Sin'
      || operator === 'Cos'
      || operator === 'Tan'
      || operator === 'Exp'
    )
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  if (operator === 'Power' && operands.length === 2 && hasTarget(operands[1], target)) {
    return true;
  }
  return operands.some((operand) => hasDeferredTargetCarrier(operand as MathJson, target));
}

function matchRootCarrier(node: MathJson, target: string): ComplexRootCarrier | null {
  const simplified = simplifyNode(node);
  if (!isArrayNode(simplified)) {
    return null;
  }
  if (
    simplified[0] === 'Sqrt'
    && simplified.length === 2
    && hasTarget(simplified[1], target)
    && !hasDeferredTargetCarrier(simplified[1] as MathJson, target)
  ) {
    const inner = simplified[1] as MathJson;
    return {
      inner,
      degree: 2,
      key: carrierKey(inner, 2),
      labelLatex: latexForNode(simplified),
    };
  }
  if (
    simplified[0] === 'Root'
    && simplified.length === 3
    && hasTarget(simplified[1], target)
    && !hasTarget(simplified[2], target)
    && typeof simplified[2] === 'number'
    && isComplexPrincipalRootDegree(simplified[2])
    && !hasDeferredTargetCarrier(simplified[1] as MathJson, target)
  ) {
    const inner = simplified[1] as MathJson;
    return {
      inner,
      degree: simplified[2],
      key: carrierKey(inner, simplified[2]),
      labelLatex: latexForNode(simplified),
    };
  }
  return null;
}

function hasSelectedTargetRootWrapper(node: MathJson, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const [operator, ...operands] = node;
  if (
    (operator === 'Sqrt' || operator === 'Root')
    && operands.some((operand) => hasTarget(operand as MathJson, target))
  ) {
    return true;
  }

  return operands.some((operand) => hasSelectedTargetRootWrapper(operand as MathJson, target));
}

function hasUnsupportedMixedCompanion(node: MathJson, target: string) {
  return hasDeferredTargetCarrier(node, target);
}

function combine(left: MixedRootAffine, right: MixedRootAffine): CollectResult {
  const carrier = left.carrier ?? right.carrier;
  if (left.carrier && right.carrier && left.carrier.key !== right.carrier.key) {
    return {
      kind: 'blocked',
      message: 'Complex mixed algebraic wrapper catchup supports exactly one selected-target root carrier.',
    };
  }
  return {
    kind: 'ok',
    affine: {
      coefficient: addNodes(left.coefficient, right.coefficient),
      remainder: addNodes(left.remainder, right.remainder),
      carrier,
    },
  };
}

function collectMixedRootAffine(node: MathJson, target: string): CollectResult {
  const carrier = matchRootCarrier(node, target);
  if (carrier) {
    return {
      kind: 'ok',
      affine: { coefficient: 1, remainder: 0, carrier },
    };
  }
  if (!hasTarget(node, target)) {
    return {
      kind: 'ok',
      affine: { coefficient: 0, remainder: node, carrier: null },
    };
  }
  if (!isArrayNode(node)) {
    return {
      kind: 'ok',
      affine: { coefficient: 0, remainder: node, carrier: null },
    };
  }

  const [operator, ...operands] = node;
  if (operator === 'Add' || operator === 'Subtract') {
    let current: MixedRootAffine = { coefficient: 0, remainder: 0, carrier: null };
    for (const [index, operand] of operands.entries()) {
      const collected = collectMixedRootAffine(operand as MathJson, target);
      if (collected.kind !== 'ok') {
        return collected;
      }
      const affine = operator === 'Subtract' && index > 0
        ? {
            coefficient: negateNode(collected.affine.coefficient),
            remainder: negateNode(collected.affine.remainder),
            carrier: collected.affine.carrier,
          }
        : collected.affine;
      const next = combine(current, affine);
      if (next.kind !== 'ok') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Negate' && operands.length === 1) {
    const collected = collectMixedRootAffine(operands[0] as MathJson, target);
    if (collected.kind !== 'ok') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: negateNode(collected.affine.coefficient),
        remainder: negateNode(collected.affine.remainder),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectMixedRootAffine(operand as MathJson, target));
    const blocked = collected.find((entry) => entry.kind === 'blocked');
    if (blocked?.kind === 'blocked') {
      return blocked;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: MixedRootAffine } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const rootAffines = affines.filter((entry) => entry.carrier);
    if (rootAffines.length === 0) {
      return {
        kind: 'ok',
        affine: { coefficient: 0, remainder: node, carrier: null },
      };
    }
    if (rootAffines.length !== 1 || hasTarget(addNodes(...affines.filter((entry) => entry !== rootAffines[0]).map((entry) => entry.remainder)), target)) {
      return {
        kind: 'blocked',
        message: 'Complex mixed algebraic wrapper catchup requires target-free factors around the root carrier.',
      };
    }
    const targetFreeProduct = affines
      .filter((entry) => entry !== rootAffines[0])
      .reduce<MathJson>((product, entry) => multiplyNodes(product, entry.remainder), 1);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(targetFreeProduct, rootAffines[0].coefficient),
        remainder: multiplyNodes(targetFreeProduct, rootAffines[0].remainder),
        carrier: rootAffines[0].carrier,
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands as MathJson[];
    const collected = collectMixedRootAffine(numerator, target);
    if (collected.kind !== 'ok') {
      return collected;
    }
    if (collected.affine.carrier && hasTarget(denominator, target)) {
      return {
        kind: 'blocked',
        message: 'Complex mixed algebraic wrapper catchup requires target-free denominators around the root carrier.',
      };
    }
    if (!collected.affine.carrier) {
      return {
        kind: 'ok',
        affine: { coefficient: 0, remainder: node, carrier: null },
      };
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: divideNodes(collected.affine.coefficient, denominator),
        remainder: divideNodes(collected.affine.remainder, denominator),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (hasUnsupportedMixedCompanion(node, target)) {
    return {
      kind: 'blocked',
      message: 'Complex mixed algebraic wrapper catchup excludes nested roots, abs carriers, and transcendental companions.',
    };
  }

  return {
    kind: 'ok',
    affine: { coefficient: 0, remainder: node, carrier: null },
  };
}

function subtractAffine(left: MixedRootAffine, right: MixedRootAffine): CollectResult {
  return combine(left, {
    coefficient: negateNode(right.coefficient),
    remainder: negateNode(right.remainder),
    carrier: right.carrier,
  });
}

function unsupportedOutcome(lines: string[], error = 'This complex mixed algebraic wrapper equation is outside the supported guarded complex wrapper families.'): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error,
    warnings: [],
    detailSections: [
      {
        title: 'Complex Mixed Algebraic Wrapper Policy',
        lines,
      },
      {
        title: 'What To Try',
        lines: [
          'Use one principal Complex root carrier mixed with a compact algebraic selected-target companion.',
          'Keep generated powered equations inside bounded linear, rational, factorable, or algebraic-isolation routes.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function attachBoundary(input: ComplexMixedAlgebraicWrapperRouteInput, lines: string[], error?: string) {
  const outcome = unsupportedOutcome(lines, error);
  return attachEquationRuntimeEnvelope(
    outcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ invalidRequest: true }),
  );
}

function powerNode(value: MathJson, degree: ComplexPrincipalRootDegree) {
  return simplifyNode(['Power', value, degree] as MathJson);
}

function expandAlgebraicNode(node: MathJson): MathJson {
  return simplifyNode(expandMathJsonNodeOrOriginal(node, {
    maxPower: 2,
    maxExpandedTerms: 64,
    maxNodeCount: 1200,
  }) as MathJson);
}

function solveBranchFailureMessage() {
  return 'A generated Complex mixed algebraic wrapper branch is outside current compact Complex selected-target routes.';
}

function hasForbiddenGeneratedFormulaReadback(result: unknown) {
  const text = JSON.stringify(result);
  return text.includes('RootOf')
    || text.includes('Real Cardano Cases')
    || text.includes('Real Ferrari Cases')
    || text.includes('Cardano')
    || text.includes('Ferrari');
}

const BRANCH_POLYNOMIAL_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Generated mixed-wrapper branches with the selected target in a denominator stay outside this compact pass.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Generated mixed-wrapper branches above quadratic degree stay outside this compact pass.',
  },
  targetInUnsupportedExpression: {
    reason: 'unsupported-expression',
    message: 'Generated mixed-wrapper branches must be polynomial in the selected target.',
  },
  targetInUnsupportedPower: {
    reason: 'unsupported-power',
    message: 'Generated mixed-wrapper branches must use bounded polynomial powers of the selected target.',
  },
  targetInUnsupportedFamily: {
    reason: 'unsupported-family',
    message: 'Generated mixed-wrapper branches are outside compact polynomial readback.',
  },
} as const;

function solveCompactGeneratedBranchPolynomial(branchPolynomial: MathJson, target: string) {
  const collected = collectBoundedSymbolicTargetPolynomial(
    branchPolynomial,
    target,
    BRANCH_POLYNOMIAL_MESSAGES,
  );
  if (collected.kind === 'unsupported') {
    return null;
  }

  const degree = symbolicPolynomialDegree(collected.polynomial);
  if (degree === 1) {
    const [constant, linear] = collected.polynomial.terms;
    if (exactScalarIsExactZero(linear)) {
      return null;
    }
    return {
      solutionExpressions: [latexForNode(divideNodes(negateNode(constant), linear))],
      supplements: [nonzeroFactForNode(linear)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (degree === 2) {
    const [constant, linear, quadratic] = collected.polynomial.terms;
    if (exactScalarIsExactZero(quadratic)) {
      return null;
    }
    const discriminant = subtractNodes(
      multiplyNodes(linear, linear),
      multiplyNodes(4, quadratic, constant),
    );
    const denominator = multiplyNodes(2, quadratic);
    const principal = ['Sqrt', discriminant] as MathJson;
    return {
      solutionExpressions: [
        latexForNode(divideNodes(addNodes(negateNode(linear), principal), denominator)),
        latexForNode(divideNodes(subtractNodes(negateNode(linear), principal), denominator)),
      ],
      supplements: [nonzeroFactForNode(quadratic)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  return null;
}

function detailSections(options: {
  target: string;
  parameterNames: string[];
  carrier: ComplexRootCarrier;
  value: MathJson;
  poweredValue: MathJson;
  branchEquation: string;
  imageFact: ReturnType<typeof buildPrincipalRootImageFact>;
  solvedBranches: { branchLatex: string; exactLatex: string }[];
}): DisplayDetailSection[] {
  return buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Complex Mixed Algebraic Wrapper Solve',
    familyLines: [
      `Isolated ${options.carrier.labelLatex} as a Complex principal-root function with a selected-target companion.`,
      `Generated ${options.branchEquation} and delegated it to compact Complex selected-target routes.`,
    ],
    extraSections: [
      {
        title: 'Complex Principal-Image Facts',
        lines: options.imageFact.detailLines,
        lineKinds: ['math', 'text'],
      },
      {
        title: 'Complex Mixed Algebraic Branches',
        lines: [
          `${options.carrier.labelLatex}=${latexForNode(options.value)}`,
          `${latexForNode(options.carrier.inner)}=${latexForNode(options.poweredValue)}`,
          ...options.solvedBranches.map((branch) => `${branch.branchLatex}\\Rightarrow ${branch.exactLatex}`),
        ],
        lineKind: 'math',
      },
    ],
  });
}

function solveMixedRootAffine(
  input: ComplexMixedAlgebraicWrapperRouteInput,
  affine: MixedRootAffine,
) {
  if (!affine.carrier) {
    return undefined;
  }
  if (exactScalarIsExactZero(affine.coefficient)) {
    return attachBoundary(input, [
      'Complex mixed algebraic wrapper isolation requires a nonzero root coefficient.',
    ]);
  }
  if (!hasTarget(affine.remainder, input.selectedTarget)) {
    return undefined;
  }

  const valueNumerator = negateNode(affine.remainder);
  const value = isExactlyOne(affine.coefficient)
    ? valueNumerator
    : divideNodes(valueNumerator, affine.coefficient);
  const imageFact = buildPrincipalRootImageFact(value, affine.carrier.degree);
  const valueDependsOnTarget = hasTarget(value, input.selectedTarget);
  if (imageFact.classification === 'outside') {
    return attachBoundary(input, imageFact.detailLines, 'The isolated Complex root-wrapper value is outside the principal-root image.');
  }

  const poweredValue = expandAlgebraicNode(powerNode(value, affine.carrier.degree));
  const branchPolynomial = expandAlgebraicNode(subtractNodes(affine.carrier.inner, poweredValue));
  const branchEquation = `${latexForNode(branchPolynomial)}=0`;
  const compactPolynomial = solveCompactGeneratedBranchPolynomial(
    branchPolynomial,
    input.selectedTarget,
  );
  if (compactPolynomial) {
    const coefficientFact = nonzeroFactForNode(affine.coefficient);
    const imageSupplement = valueDependsOnTarget
      ? null
      : principalRootImageSupplementLatex(value, affine.carrier.degree);
    const exactSupplementLatex = normalizeParameterizedSupplementLatex([
      ...(coefficientFact ? [coefficientFact] : []),
      ...(imageSupplement ? [imageSupplement] : []),
      ...compactPolynomial.supplements,
    ]);
    const exactLatex = exactLatexForSolutions(input.selectedTarget, compactPolynomial.solutionExpressions);
    const solvedBranches = compactPolynomial.solutionExpressions.map((solution) => ({
      branchLatex: branchEquation,
      exactLatex: `${input.selectedTarget}=${solution}`,
    }));
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      branchReadback: finiteBranchReadbackForNormalizedBranches({
        targetLatex: input.selectedTarget,
        branchesLatex: solutionExpressionsFromExactLatex(exactLatex, input.selectedTarget),
        source: 'equation-complex-mixed-algebraic-wrapper',
        relationLatex: exactLatex.startsWith(`${input.selectedTarget}=`) ? '=' : '\\in',
        preserveOrder: true,
        ...(valueDependsOnTarget ? { countLabel: 'candidateRoots' } : {}),
        context: { domainIntent: 'complex' },
      }),
      exactSupplementLatex,
      detailSections: detailSections({
        target: input.selectedTarget,
        parameterNames: parameterNamesFromLatex(input.parameterizedEquationLatex, input.selectedTarget),
        carrier: affine.carrier,
        value,
        poweredValue,
        branchEquation,
        imageFact,
        solvedBranches,
      }),
      warnings: [],
      resultOrigin: 'symbolic',
      answerDomain: 'complex',
    };

    const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, input.selectedTarget);
    return attachEquationRuntimeEnvelope(
      finalOutcome,
      input.equationLatex,
      input.plannerResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
    );
  }

  const families: GeneratedBranchHandoffFamily[] = [
    {
      family: 'linear',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedLinearEquation(branchLatex, branchTarget, GENERATED_BRANCH_OPTIONS),
    },
    {
      family: 'rational',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedRationalEquation(branchLatex, branchTarget, GENERATED_BRANCH_OPTIONS),
    },
    {
      family: 'factorable-polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedFactorablePolynomialEquation(branchLatex, branchTarget, GENERATED_BRANCH_OPTIONS),
    },
    {
      family: 'algebraic-isolation',
      solve: (branchLatex, branchTarget) =>
        solveEquationAlgebraicIsolation(branchLatex, branchTarget, {
          ...GENERATED_BRANCH_OPTIONS,
          answerDomain: 'complex',
          outputStyle: input.outputStyle,
          complexExactForm: input.complexExactForm,
        }),
    },
  ];
  const solved = solveGeneratedBranchEquations({
    branchEquations: [branchEquation],
    target: input.selectedTarget,
    families,
    searchTrace: input.searchTrace,
    failureMessage: solveBranchFailureMessage,
  });
  if (solved.kind === 'unsupported') {
    return attachBoundary(input, [
      solveBranchFailureMessage(),
      'Generated Complex Cardano/Ferrari formula expansion remains retired for wrapper output.',
    ]);
  }
  if (solved.solutionExpressions.length > MAX_COMPLEX_SPECIAL_FORM_DEGREE) {
    return attachBoundary(input, [
      `Complex mixed algebraic wrapper output is capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
    ]);
  }
  if (hasForbiddenGeneratedFormulaReadback(solved)) {
    return attachBoundary(input, [
      'Complex mixed algebraic wrapper output must stay on compact branch readback and cannot expose RootOf, Cardano, or Ferrari formula fragments.',
    ]);
  }

  const coefficientFact = nonzeroFactForNode(affine.coefficient);
  const imageSupplement = valueDependsOnTarget
    ? null
    : principalRootImageSupplementLatex(value, affine.carrier.degree);
  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    ...(coefficientFact ? [coefficientFact] : []),
    ...(imageSupplement ? [imageSupplement] : []),
    ...solved.exactSupplementLatex,
  ]);
  const exactLatex = exactLatexForSolutions(input.selectedTarget, solved.solutionExpressions);
  const outcome: DisplayOutcome = {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: input.selectedTarget,
      branchesLatex: solutionExpressionsFromExactLatex(exactLatex, input.selectedTarget),
      source: 'equation-complex-mixed-algebraic-wrapper',
      relationLatex: exactLatex.startsWith(`${input.selectedTarget}=`) ? '=' : '\\in',
      preserveOrder: true,
      ...(valueDependsOnTarget ? { countLabel: 'candidateRoots' } : {}),
      context: { domainIntent: 'complex' },
    }),
    exactSupplementLatex,
    detailSections: detailSections({
      target: input.selectedTarget,
      parameterNames: parameterNamesFromLatex(input.parameterizedEquationLatex, input.selectedTarget),
      carrier: affine.carrier,
      value,
      poweredValue,
      branchEquation,
      imageFact,
      solvedBranches: solved.branches,
    }),
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: 'complex',
  };

  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, input.selectedTarget);
  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function tryComplexMixedAlgebraicWrapperRoute(
  input: ComplexMixedAlgebraicWrapperRouteInput,
): DisplayOutcome | undefined {
  let json: MathJson;
  try {
    json = ce.parse(input.parameterizedEquationLatex).json as MathJson;
  } catch {
    return undefined;
  }
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return undefined;
  }
  if (
    !hasSelectedTargetRootWrapper(json[1] as MathJson, input.selectedTarget)
    && !hasSelectedTargetRootWrapper(json[2] as MathJson, input.selectedTarget)
  ) {
    return undefined;
  }

  const left = collectMixedRootAffine(json[1] as MathJson, input.selectedTarget);
  if (left.kind === 'blocked') {
    return attachBoundary(input, [left.message]);
  }
  const right = collectMixedRootAffine(json[2] as MathJson, input.selectedTarget);
  if (right.kind === 'blocked') {
    return attachBoundary(input, [right.message]);
  }
  if (left.kind !== 'ok' || right.kind !== 'ok') {
    return undefined;
  }
  const normalized = subtractAffine(left.affine, right.affine);
  if (normalized.kind === 'blocked') {
    return attachBoundary(input, [normalized.message]);
  }
  if (normalized.kind !== 'ok') {
    return undefined;
  }
  return solveMixedRootAffine(input, normalized.affine);
}
