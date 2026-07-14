import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ComplexExactForm,
  DisplayDetailSection,
  ResultProducerDraft,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { exactScalarIsZero, normalizeExactScalar, readExactScalarNode } from '../../algebra/polynomial-core';
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
  type ComplexPrincipalRootDegree,
  createComplexPrincipalRootBranchNode,
  isComplexPrincipalRootDegree,
  principalRootBaseLatex,
  principalRootMultiplierLatex,
} from '../../equation/roots/complex-principal-roots';
import {
  exactScalarToLatex,
  sqrtExactScalar,
} from '../../equation/complex/exact';
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
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type ComplexPowerWrapperRouteInput = {
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

type ComplexPowerCarrier = {
  inner: MathJson;
  exponent: ComplexPrincipalRootDegree;
  key: string;
  labelLatex: string;
};

type ComplexPowerAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: ComplexPowerCarrier | null;
};

type CollectPowerAffineResult =
  | { kind: 'ok'; affine: ComplexPowerAffine }
  | { kind: 'none' }
  | { kind: 'blocked'; message: string };

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

type UnsupportedComplexWrapperOptions = {
  error?: string;
  tryLines?: string[];
};

function unsupportedComplexWrapperOutcome(
  lines: string[],
  options: UnsupportedComplexWrapperOptions = {},
): ResultProducerDraft {
  return createEquationResultOutcome({
    kind: 'error',
    title: 'Solve',
    error: options.error ?? 'This complex wrapper equation is outside the supported guarded complex wrapper families.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Wrapper Policy',
        lineKind: 'text',
        lines,
      },
      {
        title: 'What To Try',
        lineKind: 'text',
        lines: options.tryLines ?? [
          'Use a compact Complex power wrapper whose generated branches stay inside bounded linear, rational, factorable, or algebraic-isolation routes.',
          'Turn Complex Off when you want the real-domain wrapper formula route.',
        ],
      },
    ],
    answerMode: 'exact',
  });
}

function attachBoundary(
  input: ComplexPowerWrapperRouteInput,
  lines: string[],
  options?: UnsupportedComplexWrapperOptions,
) {
  recordSelectedTargetFinalStop(
    input.searchTrace,
    'top-level',
    'complex-wrapper-unsupported',
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

function carrierKey(inner: MathJson, exponent: number) {
  return `${exponent}|${JSON.stringify(simplifyNode(inner))}`;
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

function matchPowerCarrier(node: MathJson, target: string): ComplexPowerCarrier | null {
  const simplified = simplifyNode(node);
  if (
    !isArrayNode(simplified)
    || simplified[0] !== 'Power'
    || simplified.length !== 3
    || !hasTarget(simplified[1], target)
    || hasTarget(simplified[2], target)
    || typeof simplified[2] !== 'number'
    || !isComplexPrincipalRootDegree(simplified[2])
  ) {
    return null;
  }
  const inner = simplified[1] as MathJson;
  if (hasDeferredTargetCarrier(inner, target)) {
    return null;
  }
  return {
    inner,
    exponent: simplified[2],
    key: carrierKey(inner, simplified[2]),
    labelLatex: latexForNode(simplified),
  };
}

function combineAffine(
  left: ComplexPowerAffine,
  right: ComplexPowerAffine,
): CollectPowerAffineResult {
  const carrier = left.carrier ?? right.carrier;
  if (left.carrier && right.carrier && left.carrier.key !== right.carrier.key) {
    return {
      kind: 'blocked',
      message: 'Complex power wrapper catchup requires exactly one selected-target power carrier.',
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

function hasDeferredOuterPowerWrapper(node: MathJson, target: string) {
  const simplified = simplifyNode(node);
  if (
    !isArrayNode(simplified)
    || simplified[0] !== 'Power'
    || simplified.length !== 3
    || !hasTarget(simplified[1], target)
    || hasTarget(simplified[2], target)
    || typeof simplified[2] !== 'number'
    || !isComplexPrincipalRootDegree(simplified[2])
  ) {
    return false;
  }
  return hasDeferredTargetCarrier(simplified[1] as MathJson, target);
}

function collectPowerAffine(node: MathJson, target: string): CollectPowerAffineResult {
  const carrier = matchPowerCarrier(node, target);
  if (carrier) {
    return {
      kind: 'ok',
      affine: { coefficient: 1, constant: 0, carrier },
    };
  }
  if (hasDeferredOuterPowerWrapper(node, target)) {
    return {
      kind: 'blocked',
      message: 'Complex power wrapper catchup requires the selected target to appear only inside one compact power carrier.',
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
    let current: ComplexPowerAffine = { coefficient: 0, constant: 0, carrier: null };
    for (const [index, operand] of operands.entries()) {
      const collected = collectPowerAffine(operand as MathJson, target);
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
    const collected = collectPowerAffine(operands[0] as MathJson, target);
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
        message: 'Complex power wrapper catchup requires the selected target to appear in one power carrier factor.',
      };
    }
    const targetCollected = collectPowerAffine(targetOperands[0] as MathJson, target);
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

function rootWrapperPolicyLines() {
  return [
    'Complex square-root and nth-root wrappers are principal functions, not all-root relations.',
    'Complex On solves over the complex domain, including real roots, but root-function inversion also needs principal-image validation of the right-hand side.',
    'That validation is not live yet, so the solver stops instead of squaring both sides and returning misleading branches.',
  ];
}

function rootWrapperTryLines() {
  return [
    'Use a Complex power relation such as F^n=R when you intend all branch roots.',
    'Use Real mode only when the real-domain root-wrapper semantics are intended.',
  ];
}

function hasTargetedRootWrapper(node: MathJson, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (operator === 'Sqrt' && operands.length === 1 && hasTarget(operands[0], target))
    || (
      operator === 'Root'
      && operands.length === 2
      && hasTarget(operands[0], target)
      && !hasTarget(operands[1], target)
    )
  ) {
    return true;
  }
  return operands.some((operand) => hasTargetedRootWrapper(operand as MathJson, target));
}

function omegaLatex(index: number) {
  return `\\omega_{${index}}`;
}

function branchSymbol(index: number) {
  return `u_{${index}}`;
}

function branchSymbolLatex(index: number) {
  return branchSymbol(index);
}

function branchValueLatex(value: MathJson, exponent: ComplexPrincipalRootDegree, branchIndex: number) {
  const node = createComplexPrincipalRootBranchNode({
    radicand: value,
    degree: exponent,
    branchIndex,
  });
  const root = principalRootBaseLatex(node);
  return branchIndex === 0 ? root : `${root}${omegaLatex(branchIndex)}`;
}

function exactVisiblePowerBranchLatex(
  value: MathJson,
  exponent: ComplexPrincipalRootDegree,
  branchIndex: number,
) {
  if (exponent !== 2 || branchIndex > 1) {
    return null;
  }
  const exact = readExactScalarNode(simplifyNode(value));
  if (!exact) {
    return null;
  }
  const normalized = normalizeExactScalar(exact);
  if (normalized.numerator < 0) {
    return null;
  }
  const root = sqrtExactScalar(normalized);
  if (!root) {
    return null;
  }
  const rootLatex = exactScalarToLatex(root);
  return branchIndex === 0 || rootLatex === '0' ? rootLatex : `-${rootLatex}`;
}

function compactPowerBranchDescriptors(
  value: MathJson,
  exponent: ComplexPrincipalRootDegree,
) {
  const descriptors: Array<{ branchLatex: string; usesSymbol: boolean }> = [];
  const seen = new Set<string>();
  for (let branchIndex = 0; branchIndex < exponent; branchIndex += 1) {
    const visibleBranch = exactVisiblePowerBranchLatex(value, exponent, branchIndex);
    const branchLatex = visibleBranch ?? branchSymbol(branchIndex);
    if (seen.has(branchLatex)) {
      continue;
    }
    seen.add(branchLatex);
    descriptors.push({
      branchLatex,
      usesSymbol: visibleBranch === null,
    });
  }
  return descriptors;
}

function complexPowerDefinitionSection(options: {
  value: MathJson;
  exponent: ComplexPrincipalRootDegree;
  complexExactForm: ComplexExactForm;
}): DisplayDetailSection {
  const valueLatex = latexForNode(options.value);
  const omegaLines = Array.from({ length: options.exponent }, (_, branchIndex) => {
    const node = createComplexPrincipalRootBranchNode({
      radicand: options.value,
      degree: options.exponent,
      branchIndex,
    });
    return `${omegaLatex(branchIndex)}=${principalRootMultiplierLatex(node, options.complexExactForm) || '1'}`;
  });
  const branchLines = Array.from({ length: options.exponent }, (_, branchIndex) =>
    `${branchSymbolLatex(branchIndex)}=${branchValueLatex(options.value, options.exponent, branchIndex)}`);
  const lines = [
    `r=${valueLatex}`,
    ...omegaLines,
    ...branchLines,
    'PrincipalRoot notation carries the internal Complex principal-argument and branch-cut policy.',
  ];

  return {
    title: 'Complex Power Definitions',
    lines,
    lineKinds: [
      ...Array.from({ length: lines.length - 1 }, () => 'math' as const),
      'text',
    ],
  };
}

function solveBranchFailureMessage() {
  return 'A generated Complex power-wrapper branch is outside current compact Complex selected-target routes.';
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

function solveComplexPowerWrapper(
  input: ComplexPowerWrapperRouteInput,
  affine: ComplexPowerAffine,
  valueSide: MathJson,
) {
  if (!affine.carrier) {
    return undefined;
  }
  if (exactScalarIsExactZero(affine.coefficient)) {
    return attachBoundary(input, [
      'Complex power wrapper isolation requires a nonzero power coefficient.',
    ]);
  }

  const value = isExactlyOne(affine.coefficient)
    ? subtractNodes(simplifyNode(valueSide), affine.constant)
    : divideNodes(
        subtractNodes(simplifyNode(valueSide), affine.constant),
        affine.coefficient,
      );
  const coefficientFact = nonzeroFactForNode(affine.coefficient);
  const innerLatex = latexForNode(affine.carrier.inner);
  const branchDescriptors = compactPowerBranchDescriptors(value, affine.carrier.exponent);
  const branchEquations = branchDescriptors.map(({ branchLatex }) => `${innerLatex}=${branchLatex}`);

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
    branchEquations,
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
      `Complex power wrapper output is capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
    ]);
  }
  if (hasForbiddenGeneratedFormulaReadback(solved)) {
    return attachBoundary(input, [
      'Complex power wrapper output must stay on compact branch readback and cannot expose RootOf, Cardano, or Ferrari formula fragments.',
    ]);
  }

  recordSelectedTargetFamilySuccess(input.searchTrace, 'top-level', 'composition');
  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    ...(coefficientFact ? [coefficientFact] : []),
    ...solved.exactSupplementLatex,
  ]);
  const exactLatex = exactLatexForSolutions(input.selectedTarget, solved.solutionExpressions);
  const detailSections = buildParameterizedDetailSections({
    target: input.selectedTarget,
    parameterNames: parameterNamesFromLatex(input.parameterizedEquationLatex, input.selectedTarget),
    familyTitle: 'Complex Power Wrapper Solve',
    familyLines: [
      `Isolated ${affine.carrier.labelLatex} as a Complex all-branch power relation.`,
      `Generated ${branchEquations.length} carrier branch equation${branchEquations.length === 1 ? '' : 's'} and delegated them to compact Complex selected-target routes.`,
    ],
    extraSections: [
      ...(branchDescriptors.some((branch) => branch.usesSymbol)
        ? [complexPowerDefinitionSection({
            value,
            exponent: affine.carrier.exponent,
            complexExactForm: input.complexExactForm,
          })]
        : []),
      {
        title: 'Complex Power Wrapper Branches',
        lines: [
          `${affine.carrier.labelLatex}=${latexForNode(value)}`,
          ...solved.branches.map((branch) => `${branch.branchLatex}\\Rightarrow ${branch.exactLatex}`),
        ],
        lineKind: 'math',
      },
    ],
  });

  const outcome: ResultProducerDraft = createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: input.selectedTarget,
      branchesLatex: solutionExpressionsFromExactLatex(exactLatex, input.selectedTarget),
      source: 'equation-complex-power-wrapper',
      relationLatex: exactLatex.startsWith(`${input.selectedTarget}=`) ? '=' : '\\in',
      preserveOrder: true,
      context: { domainIntent: 'complex' },
    }),
    exactSupplementLatex,
    detailSections,
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: 'complex',
  });

  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, input.selectedTarget);
  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function tryComplexPowerWrapperRoute(
  input: ComplexPowerWrapperRouteInput,
): ResultProducerDraft | undefined {
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
    if (hasTargetedRootWrapper(candidate.carrierSide, input.selectedTarget)) {
      return attachBoundary(input, rootWrapperPolicyLines(), {
        error: 'Complex root wrappers need principal-image validation before they can be solved safely.',
        tryLines: rootWrapperTryLines(),
      });
    }
    const collected = collectPowerAffine(candidate.carrierSide, input.selectedTarget);
    if (collected.kind === 'blocked') {
      if (hasDeferredOuterPowerWrapper(candidate.carrierSide, input.selectedTarget)) {
        return attachBoundary(input, [collected.message]);
      }
      continue;
    }
    if (collected.kind !== 'ok' || !collected.affine.carrier) {
      continue;
    }
    return solveComplexPowerWrapper(
      input,
      collected.affine,
      candidate.valueSide,
    );
  }

  return undefined;
}
