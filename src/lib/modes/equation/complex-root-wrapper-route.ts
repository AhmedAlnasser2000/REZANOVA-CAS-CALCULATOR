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
import {
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
} from '../../equation/equation-target-shape';
import { solveEquationAlgebraicIsolation } from '../../equation/equation-algebraic-isolation';
import { MAX_COMPLEX_SPECIAL_FORM_DEGREE } from '../../equation/complex/special-form-carrier';
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
import { finiteBranchReadbackForNormalizedBranches } from '../../equation/readback/finite-branches';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';

type ComplexRootWrapperRouteInput = {
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

type ComplexRootAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: ComplexRootCarrier | null;
};

type CollectRootAffineResult =
  | { kind: 'ok'; affine: ComplexRootAffine }
  | { kind: 'none' }
  | { kind: 'blocked'; message: string };

type UnsupportedComplexWrapperOptions = {
  error?: string;
  tryLines?: string[];
};

const { addNodes, divideNodes, multiplyNodes, negateNode, subtractNodes } = createArithmeticHelpers();
const GENERATED_BRANCH_OPTIONS = { allowGeneratedImplicitProducts: true };
const ce = new ComputeEngine();

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

function unsupportedComplexWrapperOutcome(
  lines: string[],
  options: UnsupportedComplexWrapperOptions = {},
): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: options.error ?? 'This complex root-wrapper equation is outside the supported guarded complex wrapper families.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Root Wrapper Policy',
        lines,
      },
      {
        title: 'What To Try',
        lines: options.tryLines ?? [
          'Use a Complex principal root wrapper whose generated carrier equation stays inside bounded linear, rational, factorable, or algebraic-isolation routes.',
          'Use a Complex power relation such as F^n=R when you intend all branch roots instead of the principal root function.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function attachBoundary(
  input: ComplexRootWrapperRouteInput,
  lines: string[],
  options?: UnsupportedComplexWrapperOptions,
) {
  recordSelectedTargetFinalStop(
    input.searchTrace,
    'top-level',
    'complex-root-wrapper-unsupported',
    lines.join(' '),
  );
  const outcome = unsupportedComplexWrapperOutcome(lines, options);
  return attachEquationRuntimeEnvelope(
    outcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ invalidRequest: true }),
  );
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
    )
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  if (operator === 'Power' && operands.length === 2) {
    const [base, exponent] = operands as MathJson[];
    if (hasTarget(exponent, target)) {
      return true;
    }
    return hasDeferredTargetCarrier(base, target);
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

function combineAffine(
  left: ComplexRootAffine,
  right: ComplexRootAffine,
): CollectRootAffineResult {
  const carrier = left.carrier ?? right.carrier;
  if (left.carrier && right.carrier && left.carrier.key !== right.carrier.key) {
    return {
      kind: 'blocked',
      message: 'Complex root-wrapper catchup requires exactly one selected-target root carrier.',
    };
  }
  return {
    kind: 'ok',
    affine: {
      coefficient: addNodes(left.coefficient, right.coefficient),
      constant: addNodes(left.constant, right.constant),
      carrier,
    },
  };
}

function collectRootAffine(node: MathJson, target: string): CollectRootAffineResult {
  const carrier = matchRootCarrier(node, target);
  if (carrier) {
    return {
      kind: 'ok',
      affine: { coefficient: 1, constant: 0, carrier },
    };
  }
  if (!hasTarget(node, target)) {
    return {
      kind: 'ok',
      affine: { coefficient: 0, constant: node, carrier: null },
    };
  }
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;
  if (operator === 'Add' || operator === 'Subtract') {
    let current: ComplexRootAffine = { coefficient: 0, constant: 0, carrier: null };
    for (const [index, operand] of operands.entries()) {
      const collected = collectRootAffine(operand as MathJson, target);
      if (collected.kind !== 'ok') {
        return collected;
      }
      const affine = operator === 'Subtract' && index > 0
        ? {
            coefficient: negateNode(collected.affine.coefficient),
            constant: negateNode(collected.affine.constant),
            carrier: collected.affine.carrier,
          }
        : collected.affine;
      const combined = combineAffine(current, affine);
      if (combined.kind !== 'ok') {
        return combined;
      }
      current = combined.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Negate' && operands.length === 1) {
    const collected = collectRootAffine(operands[0] as MathJson, target);
    if (collected.kind !== 'ok') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: negateNode(collected.affine.coefficient),
        constant: negateNode(collected.affine.constant),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (operator === 'Multiply') {
    const targetOperands = operands.filter((operand) => hasTarget(operand, target));
    if (targetOperands.length !== 1) {
      return {
        kind: 'blocked',
        message: 'Complex root-wrapper catchup requires the selected target to appear in one root carrier factor.',
      };
    }
    const targetCollected = collectRootAffine(targetOperands[0] as MathJson, target);
    if (targetCollected.kind !== 'ok' || !targetCollected.affine.carrier) {
      return targetCollected.kind === 'blocked'
        ? targetCollected
        : { kind: 'none' };
    }
    const targetFreeProduct = operands
      .filter((operand) => !hasTarget(operand, target))
      .reduce<MathJson>((product, operand) => multiplyNodes(product, operand as MathJson), 1);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(targetFreeProduct, targetCollected.affine.coefficient),
        constant: multiplyNodes(targetFreeProduct, targetCollected.affine.constant),
        carrier: targetCollected.affine.carrier,
      },
    };
  }

  return { kind: 'none' };
}

function powerNode(value: MathJson, degree: ComplexPrincipalRootDegree) {
  return simplifyNode(['Power', value, degree]);
}

function solveBranchFailureMessage() {
  return 'A generated Complex root-wrapper carrier equation is outside current compact Complex selected-target routes.';
}

function guardedResultText(result: unknown) {
  return JSON.stringify(result);
}

function hasForbiddenGeneratedFormulaReadback(result: unknown) {
  const text = guardedResultText(result);
  return text.includes('RootOf')
    || text.includes('Real Cardano Cases')
    || text.includes('Real Ferrari Cases')
    || text.includes('Cardano')
    || text.includes('Ferrari');
}

function rootWrapperDetailSections(options: {
  target: string;
  parameterNames: string[];
  carrier: ComplexRootCarrier;
  value: MathJson;
  poweredValue: MathJson;
  imageFact: ReturnType<typeof buildPrincipalRootImageFact>;
  branchEquation: string;
  solvedBranches: { branchLatex: string; exactLatex: string }[];
}): DisplayDetailSection[] {
  return buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Complex Root Wrapper Solve',
    familyLines: [
      `Isolated ${options.carrier.labelLatex} as a Complex principal-root function.`,
      `Principal-image classification: ${options.imageFact.classification}.`,
      `Generated carrier equation ${options.branchEquation} and delegated it to compact Complex selected-target routes.`,
    ],
    extraSections: [
      {
        title: 'Complex Principal-Image Facts',
        lines: options.imageFact.detailLines,
        lineKinds: ['math', 'text'],
      },
      {
        title: 'Complex Root Wrapper Branches',
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

function solveComplexRootWrapper(
  input: ComplexRootWrapperRouteInput,
  affine: ComplexRootAffine,
  valueSide: MathJson,
) {
  if (!affine.carrier) {
    return undefined;
  }
  if (exactScalarIsExactZero(affine.coefficient)) {
    return attachBoundary(input, [
      'Complex root-wrapper isolation requires a nonzero root coefficient.',
    ]);
  }

  const value = isExactlyOne(affine.coefficient)
    ? subtractNodes(simplifyNode(valueSide), affine.constant)
    : divideNodes(
        subtractNodes(simplifyNode(valueSide), affine.constant),
        affine.coefficient,
      );
  const imageFact = buildPrincipalRootImageFact(value, affine.carrier.degree);
  if (imageFact.classification === 'outside') {
    return attachBoundary(input, imageFact.detailLines, {
      error: 'The isolated Complex root-wrapper value is outside the principal-root image.',
      tryLines: [
        'Use a value in the principal-root image for the selected root function.',
        'Use a Complex power relation such as F^n=R when you intend all branch roots.',
      ],
    });
  }

  const poweredValue = powerNode(value, affine.carrier.degree);
  const coefficientFact = nonzeroFactForNode(affine.coefficient);
  const valueDependsOnTarget = hasTarget(value, input.selectedTarget);
  const principalImageFact = valueDependsOnTarget
    ? null
    : principalRootImageSupplementLatex(value, affine.carrier.degree);
  const innerLatex = latexForNode(affine.carrier.inner);
  const branchEquation = `${innerLatex}=${latexForNode(poweredValue)}`;

  const branchFamilies: GeneratedBranchHandoffFamily[] = [
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

  recordSelectedTargetFamilyAttempt(input.searchTrace, 'top-level', 'composition');
  const solved = solveGeneratedBranchEquations({
    branchEquations: [branchEquation],
    target: input.selectedTarget,
    families: branchFamilies,
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
      `Complex root-wrapper output is capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
    ]);
  }
  if (hasForbiddenGeneratedFormulaReadback(solved)) {
    return attachBoundary(input, [
      'Complex root-wrapper output must stay on compact branch readback and cannot expose RootOf, Cardano, or Ferrari formula fragments.',
    ]);
  }

  recordSelectedTargetFamilySuccess(input.searchTrace, 'top-level', 'composition');
  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    ...(coefficientFact ? [coefficientFact] : []),
    ...(principalImageFact ? [principalImageFact] : []),
    ...solved.exactSupplementLatex,
  ]);
  const exactLatex = exactLatexForSolutions(input.selectedTarget, solved.solutionExpressions);
  const detailSections = rootWrapperDetailSections({
    target: input.selectedTarget,
    parameterNames: parameterNamesFromLatex(input.parameterizedEquationLatex, input.selectedTarget),
    carrier: affine.carrier,
    value,
    poweredValue,
    imageFact,
    branchEquation,
    solvedBranches: solved.branches,
  });

  const outcome: DisplayOutcome = {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: input.selectedTarget,
      branchesLatex: solutionExpressionsFromExactLatex(exactLatex, input.selectedTarget),
      source: 'equation-complex-root-wrapper',
      relationLatex: exactLatex.startsWith(`${input.selectedTarget}=`) ? '=' : '\\in',
      preserveOrder: true,
      ...(valueDependsOnTarget ? { countLabel: 'candidateRoots' } : {}),
      context: { domainIntent: 'complex' },
    }),
    exactSupplementLatex,
    detailSections,
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

export function tryComplexRootWrapperRoute(
  input: ComplexRootWrapperRouteInput,
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
  const candidates = [
    { carrierSide: json[1] as MathJson, valueSide: json[2] as MathJson },
    { carrierSide: json[2] as MathJson, valueSide: json[1] as MathJson },
  ];

  for (const candidate of candidates) {
    if (!hasTarget(candidate.carrierSide, input.selectedTarget) || hasTarget(candidate.valueSide, input.selectedTarget)) {
      continue;
    }
    const collected = collectRootAffine(candidate.carrierSide, input.selectedTarget);
    if (collected.kind === 'blocked') {
      return attachBoundary(input, [collected.message]);
    }
    if (collected.kind !== 'ok' || !collected.affine.carrier) {
      continue;
    }
    return solveComplexRootWrapper(
      input,
      collected.affine,
      candidate.valueSide,
    );
  }

  return undefined;
}
