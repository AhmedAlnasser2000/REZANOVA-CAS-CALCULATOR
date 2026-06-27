import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AnswerDomain, DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  type CompositionCarrier,
  compositionLatexForNode,
  simplifyCompositionNode,
} from '../composition/core';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import { expandMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/expansion/expansion';
import { dedupe, nodeHasSymbol as sharedNodeHasSymbol } from './facts';
import { exactLatexForMixedAlgebraicSolutions, solveMixedAffine } from './mixed-algebraic-branches';
import type { GeneratedFormulaHandoffPayload } from './generated-formula-handoff-payload';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  type MathJson,
  ONE,
  ZERO,
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  isZeroNode,
} from './math-json';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';

const ce = new ComputeEngine();
const MAX_MIXED_CARRIERS = 2;
type RealCaseFormulaPayload = GeneratedFormulaHandoffPayload & {
  output: Extract<GeneratedFormulaHandoffPayload['output'], { kind: 'case-math' }>;
};

export type { MathJson };

type AlgebraicCarrierKind = 'absolute-value' | 'square-root' | 'square-power';

export type ParameterizedMixedAlgebraicStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-mixed-algebraic'
  | 'mixed-carriers'
  | 'target-outside-carrier'
  | 'branch-limit'
  | 'unsupported-branch';

export type ParameterizedMixedAlgebraicSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  answerDomain?: AnswerDomain;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string[];
};

export type ParameterizedMixedAlgebraicSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedMixedAlgebraicStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedMixedAlgebraicSolveResult =
  | ParameterizedMixedAlgebraicSolveSuccess
  | ParameterizedMixedAlgebraicSolveStop;

export type ParameterizedMixedAlgebraicSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
  formulaHandoff?: {
    domain: 'real';
  };
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
};

export type AlgebraicCarrier = CompositionCarrier & {
  kind: AlgebraicCarrierKind;
};

type CarrierTerm = {
  carrier: AlgebraicCarrier;
  coefficient: MathJson;
};

export type MixedAffine = {
  constant: MathJson;
  terms: CarrierTerm[];
  facts: string[];
};

type CollectResult =
  | { kind: 'ok'; value: MixedAffine }
  | { kind: 'unsupported'; reason: ParameterizedMixedAlgebraicStopReason; message: string };

export type SolveCarrierResult =
  | {
      kind: 'success';
      solutions: string[];
      supplements: string[];
      generatedEquations: string[];
      formulaPayload?: GeneratedFormulaHandoffPayload;
    }
  | { kind: 'unsupported'; reason: ParameterizedMixedAlgebraicStopReason; message: string };

function simplifyNode(node: MathJson): MathJson {
  return simplifyCompositionNode(node);
}

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
  squareNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyNode);

function expandAlgebraicNode(node: MathJson): MathJson {
  return simplifyNode(expandMathJsonNodeOrOriginal(node, {
    maxPower: 2,
    maxExpandedTerms: 64,
    maxNodeCount: 1200,
  }) as MathJson);
}

function multiplyExpandedForMixedReadback(left: MathJson, right: MathJson): MathJson {
  const expandedLeft = expandAlgebraicNode(left);
  const expandedRight = expandAlgebraicNode(right);
  if (isArrayNode(expandedLeft) && expandedLeft[0] === 'Add') {
    return addNodes(...expandedLeft.slice(1).map((term) =>
      multiplyExpandedForMixedReadback(term as MathJson, expandedRight)));
  }
  if (isArrayNode(expandedRight) && expandedRight[0] === 'Add') {
    return addNodes(...expandedRight.slice(1).map((term) =>
      multiplyExpandedForMixedReadback(expandedLeft, term as MathJson)));
  }
  return multiplyNodes(expandedLeft, expandedRight);
}

function expandedSquareNode(node: MathJson): MathJson {
  const expanded = expandAlgebraicNode(node);
  return multiplyExpandedForMixedReadback(expanded, expanded);
}

function latexForNode(node: MathJson) {
  return compositionLatexForNode(node);
}

function stop(
  reason: ParameterizedMixedAlgebraicStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedMixedAlgebraicSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function unsupported(
  reason: ParameterizedMixedAlgebraicStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

function nodeHasSymbol(node: MathJson) {
  return sharedNodeHasSymbol(node, latexForNode);
}

function signlessLatexForNode(node: MathJson) {
  const latex = latexForNode(node);
  return latex.startsWith('-') ? latex.slice(1) : latex;
}

function nonzeroFactForNode(node: MathJson): string | null {
  if (isOneNode(node) || isNegativeOneNode(node) || !nodeHasSymbol(node)) {
    return null;
  }
  return `${signlessLatexForNode(node)}\\ne0`;
}

function nonnegativeFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ge0`;
}

function isRealCaseFormulaPayload(
  payload: GeneratedFormulaHandoffPayload | undefined,
): payload is RealCaseFormulaPayload {
  return payload?.answerDomain === 'real' && payload.output.kind === 'case-math';
}

function formulaDetailSections(options: {
  payload: GeneratedFormulaHandoffPayload;
  target: string;
  parameterNames: string[];
  familyLines: string[];
  generatedEquations: string[];
}): DisplayDetailSection[] {
  return buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Parameterized Mixed Algebraic Solve',
    familyLines: options.familyLines,
    extraSections: [
      ...(options.payload.detailSections ?? []).filter((section) => section.title !== 'Solve Target'),
      {
        title: 'Mixed Algebraic Branches',
        lines: options.generatedEquations.map((entry) => `Generated: ${entry}`),
      },
    ],
  });
}

function carrierKey(carrier: AlgebraicCarrier) {
  return `${carrier.kind}:${latexForNode(carrier.node)}`;
}

function mergeTerms(terms: CarrierTerm[]) {
  const merged = new Map<string, CarrierTerm>();
  for (const term of terms) {
    const key = carrierKey(term.carrier);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, term);
      continue;
    }
    merged.set(key, {
      carrier: existing.carrier,
      coefficient: addNodes(existing.coefficient, term.coefficient),
    });
  }
  return [...merged.values()].filter((term) => !isZeroNode(term.coefficient));
}

function addAffine(left: MixedAffine, right: MixedAffine): CollectResult {
  const terms = mergeTerms([...left.terms, ...right.terms]);
  if (terms.length > MAX_MIXED_CARRIERS) {
    return unsupported(
      'branch-limit',
      'This algebraic mixed-carrier equation has more independent carriers than the supported cap.',
    );
  }
  return {
      kind: 'ok',
      value: {
        constant: addNodes(left.constant, right.constant),
        terms,
        facts: dedupe([...left.facts, ...right.facts]),
      },
    };
}

function negateAffine(affine: MixedAffine): MixedAffine {
  return {
    constant: negateNode(affine.constant),
    terms: affine.terms.map((term) => ({
      carrier: term.carrier,
      coefficient: negateNode(term.coefficient),
    })),
    facts: affine.facts,
  };
}

function subtractAffine(left: MixedAffine, right: MixedAffine): CollectResult {
  return addAffine(left, negateAffine(right));
}

function hasAlgebraicCarrier(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  return Boolean(matchAlgebraicCarrier(node, target))
    || node.slice(1).some((entry) => hasAlgebraicCarrier(entry, target));
}

function hasTargetInUnsupportedTranscendental(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (
      operator === 'Sin'
      || operator === 'Cos'
      || operator === 'Tan'
      || operator === 'Exp'
      || operator === 'Log'
      || operator === 'Ln'
    )
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  return operands.some((operand) => hasTargetInUnsupportedTranscendental(operand, target));
}

function matchAlgebraicCarrier(node: unknown, target: string): AlgebraicCarrier | null {
  if (!isArrayNode(node)) {
    return null;
  }
  const [operator, ...operands] = node;
  if ((operator === 'Abs' || operator === 'Sqrt') && operands.length === 1) {
    const inner = operands[0] as MathJson;
    if (!hasTarget(inner, target)) {
      return null;
    }
    return {
      kind: operator === 'Abs' ? 'absolute-value' : 'square-root',
      node: node as MathJson,
      inner,
      labelLatex: latexForNode(node as MathJson),
    };
  }
  if (
    operator === 'Power'
    && operands.length === 2
    && operands[1] === 2
    && hasTarget(operands[0], target)
  ) {
    return {
      kind: 'square-power',
      node: node as MathJson,
      inner: operands[0] as MathJson,
      labelLatex: latexForNode(node as MathJson),
    };
  }
  return null;
}

function collectMixedAffine(node: unknown, target: string): CollectResult {
  const carrier = matchAlgebraicCarrier(node, target);
  if (carrier) {
    if (hasAlgebraicCarrier(carrier.inner, target)) {
      return unsupported(
        'unsupported-branch',
        'This algebraic mixed-carrier equation needs deeper nested carrier handling.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: ZERO,
        terms: [{ carrier, coefficient: ONE }],
        facts: [],
      },
    };
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
  }

  if (!isArrayNode(node)) {
    return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: MixedAffine = { constant: ZERO, terms: [], facts: [] };
    for (const operand of operands) {
      const collected = collectMixedAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addAffine(current, collected.value);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.value;
    }
    return { kind: 'ok', value: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectMixedAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectMixedAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractAffine(leftCollected.value, rightCollected.value);
  }

  if (operator === 'Negate') {
    const collected = collectMixedAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', value: negateAffine(collected.value) };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectMixedAffine(operand, target));
    const failed = collected.find((entry) => entry.kind === 'unsupported');
    if (failed?.kind === 'unsupported') {
      return failed;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; value: MixedAffine } => entry.kind === 'ok')
      .map((entry) => entry.value);
    const carrierAffines = affines.filter((entry) => entry.terms.length > 0);
    if (carrierAffines.length === 0) {
      return {
        kind: 'ok',
        value: {
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
          terms: [],
          facts: dedupe(affines.flatMap((entry) => entry.facts)),
        },
      };
    }
    if (
      carrierAffines.length > 1
      || carrierAffines[0].terms.length !== 1
      || !isZeroNode(carrierAffines[0].constant)
    ) {
      return unsupported(
        'target-outside-carrier',
        'The selected target appears in a product that is outside bounded algebraic mixed-carrier solving.',
      );
    }
    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierAffines[0])
      .map((entry) => entry.constant);
    if (targetFreeFactors.some((factor) => hasTarget(factor, target))) {
      return unsupported(
        'target-outside-carrier',
        'Carrier coefficients must be target-free in bounded algebraic mixed-carrier solving.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: ZERO,
        terms: [{
          carrier: carrierAffines[0].terms[0].carrier,
          coefficient: multiplyNodes(...targetFreeFactors, carrierAffines[0].terms[0].coefficient),
        }],
        facts: dedupe(affines.flatMap((entry) => entry.facts)),
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasAlgebraicCarrier(denominator, target)) {
      return unsupported(
        'unsupported-branch',
        'Algebraic mixed-carrier denominators are outside this bounded exact pass.',
      );
    }
    const collected = collectMixedAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    const denominatorFact = nodeHasSymbol(denominator as MathJson)
      ? `${latexForNode(denominator as MathJson)}\\ne0`
      : null;
    if (collected.value.terms.length === 0) {
      return {
        kind: 'ok',
        value: {
          constant: divideNodes(collected.value.constant, denominator as MathJson),
          terms: [],
          facts: dedupe([
            ...collected.value.facts,
            denominatorFact,
          ].filter((entry): entry is string => Boolean(entry))),
        },
      };
    }
    if (hasTarget(denominator, target)) {
      return unsupported(
        'target-outside-carrier',
        'Carrier denominators must be target-free in bounded algebraic mixed-carrier solving.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: divideNodes(collected.value.constant, denominator as MathJson),
        terms: collected.value.terms.map((term) => ({
          carrier: term.carrier,
          coefficient: divideNodes(term.coefficient, denominator as MathJson),
        })),
        facts: dedupe([
          ...collected.value.facts,
          denominatorFact,
        ].filter((entry): entry is string => Boolean(entry))),
      },
    };
  }

  if (hasAlgebraicCarrier(node, target)) {
    return unsupported(
      'unsupported-branch',
      'This algebraic mixed-carrier expression is nested too deeply for the bounded pass.',
    );
  }

  if (hasTargetInUnsupportedTranscendental(node, target)) {
    return unsupported(
      'mixed-carriers',
      'Independent transcendental and algebraic selected-target carriers are not handled by this exact algebraic pass.',
    );
  }

  return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
}

export function solveParameterizedMixedAlgebraicEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedMixedAlgebraicSolveOptions = {},
): ParameterizedMixedAlgebraicSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before algebraic mixed-carrier solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for algebraic mixed-carrier solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before algebraic mixed-carrier solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectMixedAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }
  const right = collectMixedAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractAffine(left.value, right.value);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  if (normalized.value.terms.length === 0) {
    return stop(
      'no-mixed-algebraic',
      'No additive algebraic selected-target carriers were found.',
      target,
      parameterNames,
    );
  }

  if (
    normalized.value.terms.length === 1
    && isZeroNode(normalized.value.constant)
  ) {
    return stop(
      'no-mixed-algebraic',
      'This is a direct algebraic carrier equation, not an additive mixed-carrier equation.',
      target,
      parameterNames,
    );
  }

  const solved = solveMixedAffine(normalized.value, target, {
    addNodes,
    divideNodes,
    expandedSquareNode,
    isZeroNode,
    latexForNode,
    multiplyNodes,
    negateNode,
    nonnegativeFactForNode,
    nonzeroFactForNode,
    squareNode,
    subtractNodes,
  }, options.searchTrace, options.formulaHandoff);
  if (solved.kind === 'unsupported') {
    return stop(solved.reason, solved.message, target, parameterNames);
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex(solved.supplements);
  const formulaPayload = solved.formulaPayload;
  if (isRealCaseFormulaPayload(formulaPayload)) {
    const familyLines = [
      `Collected ${normalized.value.terms.length} algebraic carrier and generated a Real formula branch equation.`,
      'Conditional branch facts are shown explicitly; they are not simplified into hidden parameter assumptions.',
    ];
    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: formulaPayload.output.exactLatex,
      answerDomain: 'real',
      exactSupplementLatex,
      detailSections: formulaDetailSections({
        payload: formulaPayload,
        target,
        parameterNames,
        familyLines,
        generatedEquations: solved.generatedEquations,
      }),
      generatedEquationLatex: solved.generatedEquations,
    };
  }

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Mixed Algebraic Solve',
    familyLines: [
      `Collected ${normalized.value.terms.length} algebraic carrier${normalized.value.terms.length === 1 ? '' : 's'} and generated bounded branch equations.`,
      'Conditional branch facts are shown explicitly; they are not simplified into hidden parameter assumptions.',
    ],
    extraSections: [{
      title: 'Branch Conditions',
      lines: [
        ...(exactSupplementLatex ?? []),
        ...solved.generatedEquations.map((entry) => `Generated: ${entry}`),
      ],
    }],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForMixedAlgebraicSolutions(target, solved.solutions),
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: target,
      branchesLatex: dedupe(solved.solutions),
      preserveOrder: true,
      source: 'equation-parameterized-mixed-algebraic',
    }),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: solved.generatedEquations,
  };
}
