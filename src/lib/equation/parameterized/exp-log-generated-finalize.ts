import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection, SerializableMathJson } from '../../../types/calculator';
import { formatApproxNumber } from '../../display/format';
import { evaluateLatexAtTarget } from '../domain-guards';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import {
  createComplexLogExpFamily,
  createRealLogExpFamily,
  renderLogExpFamily,
} from '../solution/log-exp-family';
import { solveParameterizedComplexPreimageCarrierEquation } from './complex-preimage-handoff';
import { cleanLatex, EPSILON, numericValueOfNode, positiveFactForNode, stop } from './exp-log-core';
import { solveGeneratedExpLogEquation } from './exp-log-generated-handoff';
import {
  type BaseProfile,
  type ExpLogCarrierProfile,
  type ParameterizedExpLogSolveOptions,
  type ParameterizedExpLogSolveResult,
  type ParameterizedExpLogStopReason,
} from './exp-log-types';
import { dedupe } from './facts';
import { latexForNode, type MathJson } from './math-json';
import { buildParameterizedDetailSections, normalizeParameterizedSupplementLatex } from './readback';
import { profileEquationResult } from '../../display/printer';

const ce = new ComputeEngine();

function targetDomainMathJsonLeaves(
  target: string,
  exactSupplementLatex: readonly string[] | undefined,
) {
  return exactSupplementLatex?.includes(`${target}>0`)
    ? [{
        canonicalLatex: `${target}>0`,
        mathJson: ['Greater', target, 0] as SerializableMathJson,
        source: 'equation-parameterized-exp-log-domain',
      }]
    : undefined;
}

function positiveBaseFacts(base: BaseProfile): string[] {
  if (base.kind !== 'symbolic') {
    return [];
  }
  return [`${base.latex}>0`, `${base.latex}\\ne1`];
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function approximateLatexExpression(latex: string): number | null {
  try {
    const value = ce.parse(latex).N().valueOf();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function approxTextForBranches(target: string, branches: readonly string[]) {
  const values = branches.map(approximateLatexExpression);
  if (values.some((value) => value === null)) {
    return undefined;
  }
  const formatted = values.map((value) => formatApproxNumber(value ?? 0));
  return formatted.length === 1
    ? `${target} ~= ${formatted[0]}`
    : `${target} ~= ${formatted.join(', ')}`;
}

function exactAssignmentMathJson(target: string, assignment: string): SerializableMathJson | undefined {
  try {
    return ce.parse(`${target}=${assignment}`).json as SerializableMathJson;
  } catch {
    return undefined;
  }
}

function legacyFactExpression(factLatex: string): { expressionLatex: string; operator: '>' | '\\ge' | '\\ne' } | null {
  const fact = cleanLatex(factLatex).replace(/\s+/gu, '');
  const comparison = fact.match(/^(.*?)(\\ge|\\ne|>)0$/u);
  if (!comparison) {
    return null;
  }

  return {
    expressionLatex: comparison[1],
    operator: comparison[2] as '>' | '\\ge' | '\\ne',
  };
}

function legacyFactHoldsAtCandidate(factLatex: string, target: string, candidate: number) {
  const comparison = legacyFactExpression(factLatex);
  if (!comparison) {
    return true;
  }

  const evaluated = evaluateLatexAtTarget(comparison.expressionLatex, target, candidate);
  if (evaluated.value === null) {
    return false;
  }

  if (comparison.operator === '>') {
    return evaluated.value > EPSILON;
  }
  if (comparison.operator === '\\ge') {
    return evaluated.value >= -EPSILON;
  }
  return Math.abs(evaluated.value) > EPSILON;
}

function generatedCandidateDomainStop(
  candidateLatex: string,
  target: string,
  parameterNames: string[],
  domainFacts: string[],
): ParameterizedExpLogSolveResult | null {
  const candidate = approximateLatexExpression(candidateLatex);
  if (candidate === null) {
    return null;
  }

  const invalidFacts = domainFacts.filter((fact) => !legacyFactHoldsAtCandidate(fact, target, candidate));
  if (invalidFacts.length === 0) {
    return null;
  }

  return stop(
    'domain-empty',
    'No real selected-target solution remains because the algebraic candidate is undefined in the real domain.',
    target,
    parameterNames,
  );
}

function filterBranchesByLegacyFacts(
  branches: readonly string[],
  target: string,
  domainFacts: string[],
) {
  return branches.filter((branch) => {
    const candidate = approximateLatexExpression(branch);
    if (candidate === null) {
      return true;
    }

    return domainFacts.every((fact) => legacyFactHoldsAtCandidate(fact, target, candidate));
  });
}

function normalizeGeneratedDomainFacts(entries: string[]) {
  return normalizeParameterizedSupplementLatex(dedupe(entries.map(cleanLatex))) ?? [];
}

function rationalLatex(numerator: number, denominator: number) {
  if (numerator === 0) {
    return '0';
  }
  const sign = numerator < 0 ? '-' : '';
  const divisor = greatestCommonDivisor(numerator, denominator);
  const absNumerator = Math.abs(numerator) / divisor;
  const normalizedDenominator = denominator / divisor;
  if (normalizedDenominator === 1) {
    return `${sign}${absNumerator}`;
  }
  return `${sign}\\frac{${absNumerator}}{${normalizedDenominator}}`;
}

function exactRationalLogLatex(base: BaseProfile, value: MathJson) {
  if (base.kind === 'symbolic') {
    return null;
  }

  const valueNumeric = numericValueOfNode(value);
  if (valueNumeric === null || valueNumeric <= 0) {
    return null;
  }

  for (let denominator = 1; denominator <= 12; denominator += 1) {
    for (let numerator = -48; numerator <= 48; numerator += 1) {
      const candidate = Math.pow(base.value, numerator / denominator);
      const tolerance = EPSILON * Math.max(1, Math.abs(valueNumeric));
      if (Math.abs(candidate - valueNumeric) <= tolerance) {
        return rationalLatex(numerator, denominator);
      }
    }
  }

  return null;
}

function logLatexForBase(base: BaseProfile, value: MathJson) {
  const rationalLog = exactRationalLogLatex(base, value);
  if (rationalLog) {
    return rationalLog;
  }

  const valueLatex = latexForNode(value);
  if (base.kind === 'natural') {
    return `\\ln\\left(${valueLatex}\\right)`;
  }
  if (base.kind === 'common' || base.kind === 'numeric') {
    return `\\frac{\\ln\\left(${valueLatex}\\right)}{\\ln\\left(${base.latex}\\right)}`;
  }
  return `\\log_{${base.latex}}\\left(${valueLatex}\\right)`;
}

function powerLatexForBase(base: BaseProfile, exponent: MathJson) {
  const exponentLatex = latexForNode(exponent);
  if (base.kind === 'natural') {
    return `e^{${exponentLatex}}`;
  }
  return `${base.latex}^{${exponentLatex}}`;
}

export function generatedEquationForCarrier(
  carrier: ExpLogCarrierProfile,
  value: MathJson,
): { kind: 'ok'; equationLatex: string; equationMathJson: SerializableMathJson; facts: string[] } | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string } {
  if (carrier.kind === 'exponential') {
    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because exponential outputs must be positive.',
      };
    }
    return {
      kind: 'ok',
      equationLatex: `${latexForNode(carrier.inner)}=${logLatexForBase(carrier.base, value)}`,
      equationMathJson: [
        'Equal',
        carrier.inner,
        carrier.base.kind === 'natural'
          ? ['Ln', value]
          : ['Log', value, carrier.base.kind === 'symbolic' ? carrier.base.node : carrier.base.value],
      ] as SerializableMathJson,
      facts: [
        ...positiveBaseFacts(carrier.base),
        positiveFactForNode(value),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  return {
    kind: 'ok',
    equationLatex: `${latexForNode(carrier.inner)}=${powerLatexForBase(carrier.base, value)}`,
    equationMathJson: [
      'Equal',
      carrier.inner,
      ['Power', carrier.base.kind === 'natural'
        ? 'ExponentialE'
        : carrier.base.kind === 'symbolic'
          ? carrier.base.node
          : carrier.base.value, value],
    ] as SerializableMathJson,
    facts: [
      ...positiveBaseFacts(carrier.base),
      positiveFactForNode(carrier.inner),
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

export function complexPreimageEquationForCarrier(
  carrier: ExpLogCarrierProfile,
  value: MathJson,
) {
  return `${cleanLatex(carrier.labelLatex)}=${cleanLatex(latexForNode(value))}`;
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function integerNodeValue(node: unknown): number | null {
  if (typeof node === 'number' && Number.isSafeInteger(node)) return node;
  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2) {
    const child = integerNodeValue(node[1]);
    return child === null ? null : -child;
  }
  return null;
}

function exactIntegerPowerLatex(latex: string) {
  let node: unknown;
  try {
    node = ce.parse(latex).json;
  } catch {
    return latex;
  }
  if (!Array.isArray(node) || node[0] !== 'Power' || node.length !== 3) return latex;
  const base = integerNodeValue(node[1]);
  const exponent = integerNodeValue(node[2]);
  if (base === null || exponent === null || base === 0 || Math.abs(exponent) > 32) return latex;
  const magnitude = BigInt(Math.abs(base)) ** BigInt(Math.abs(exponent));
  if (magnitude.toString().length > 96) return latex;
  const sign = base < 0 && Math.abs(exponent) % 2 === 1 ? '-' : '';
  if (exponent === 0) return '1';
  if (exponent > 0) return `${sign}${magnitude}`;
  return `${sign}\\frac{1}{${magnitude}}`;
}

function normalizeGeneratedRhsLatex(latex: string) {
  const cleaned = cleanLatex(latex)
    .replace(/\\ln\\left\(([^{}]*)\\right\)/gu, '\\ln($1)');
  return exactIntegerPowerLatex(cleaned);
}

function isExactNumericIntegerPower(latex: string) {
  const cleaned = cleanLatex(latex);
  return exactIntegerPowerLatex(cleaned) !== cleaned;
}

function generatedDirectTargetAssignment(generatedEquationLatex: string, target: string) {
  const prefix = `${target}=`;
  if (!generatedEquationLatex.startsWith(prefix)) {
    return null;
  }

  const rhs = generatedEquationLatex.slice(prefix.length);
  return rhs.includes(target) ? null : normalizeGeneratedRhsLatex(rhs);
}

function generatedPureSquareAssignment(generatedEquationLatex: string, target: string) {
  const compact = generatedEquationLatex.replace(/\s+/gu, '');
  const leftVariants = [`${target}^2=`, `${target}^{2}=`];
  const matchedPrefix = leftVariants.find((prefix) => compact.startsWith(prefix));
  if (!matchedPrefix) {
    return null;
  }

  const rhs = compact.slice(matchedPrefix.length);
  return rhs && !rhs.includes(target)
    ? normalizeGeneratedRhsLatex(rhs)
    : null;
}

export function finalizeGeneratedExpLogSolve({
  target,
  parameterNames,
  generatedEquationLatex,
  generatedEquationMathJson: _generatedEquationMathJson,
  domainFacts = [],
  carrierLabel,
  searchTrace,
  formulaHandoff,
}: {
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  generatedEquationMathJson?: SerializableMathJson;
  domainFacts?: string[];
  carrierLabel: string;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  formulaHandoff?: ParameterizedExpLogSolveOptions['formulaHandoff'];
}): ParameterizedExpLogSolveResult {
  const familyLines = [
    `Isolated ${carrierLabel} using a bounded exp/log inverse-pair rule.`,
    `Delegated ${generatedEquationLatex} to existing selected-target parameter solvers.`,
  ];
  const directAssignment = generatedDirectTargetAssignment(generatedEquationLatex, target);
  // Leave ordinary generated equations to the established handoff so its
  // route evidence and traditional readback remain intact. The one exception
  // is a numeric integral power, whose evaluation otherwise leaks decimals
  // into textbook base-log answers (for example 9^(-2)).
  const rawDirectAssignment = generatedEquationLatex.startsWith(`${target}=`)
    ? generatedEquationLatex.slice(`${target}=`.length)
    : undefined;
  if (directAssignment && rawDirectAssignment && isExactNumericIntegerPower(rawDirectAssignment)) {
    const exactSupplementLatex = normalizeGeneratedDomainFacts(domainFacts);
    const domainStop = generatedCandidateDomainStop(
      directAssignment,
      target,
      parameterNames,
      exactSupplementLatex,
    );
    if (domainStop) {
      return domainStop;
    }
    const assignmentMathJson = exactAssignmentMathJson(target, directAssignment);
    const primaryMath = assignmentMathJson
      ? {
          version: 1 as const,
          canonicalLatex: `${target}=${directAssignment}`,
          mathJson: assignmentMathJson,
        }
      : undefined;
    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      exactLatex: `${target}=${directAssignment}`,
      ...(primaryMath ? { primaryMath } : {}),
      branchReadback: finiteBranchReadbackForNormalizedBranches({
        targetLatex: target,
        branchesLatex: [directAssignment],
        source: 'equation-parameterized-exp-log',
      }),
      approxText: approxTextForBranches(target, [directAssignment]),
      exactSupplementLatex,
      detailSections: buildParameterizedDetailSections({
        target,
        parameterNames,
        familyTitle: 'Parameterized Exp/Log Solve',
        familyLines,
      }),
      generatedEquationLatex,
      answerDomain: 'real',
      mathJsonLeaves: targetDomainMathJsonLeaves(target, exactSupplementLatex),
    });
  }

  const pureSquareAssignment = generatedPureSquareAssignment(generatedEquationLatex, target);
  if (pureSquareAssignment) {
    const branches = [`-\\sqrt{${pureSquareAssignment}}`, `\\sqrt{${pureSquareAssignment}}`];
    const exactSupplementLatex = normalizeGeneratedDomainFacts([
      ...domainFacts,
      `${pureSquareAssignment}\\ge0`,
    ]);
    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      exactLatex: `${target}\\in\\left\\{${branches.join(',\\ ')}\\right\\}`,
      branchReadback: finiteBranchReadbackForNormalizedBranches({
        targetLatex: target,
        branchesLatex: branches,
        preserveOrder: true,
        source: 'equation-parameterized-exp-log',
      }),
      approxText: approxTextForBranches(target, branches),
      exactSupplementLatex,
      detailSections: buildParameterizedDetailSections({
        target,
        parameterNames,
        familyTitle: 'Parameterized Exp/Log Solve',
        familyLines,
      }),
      generatedEquationLatex,
      answerDomain: 'real',
      mathJsonLeaves: targetDomainMathJsonLeaves(target, exactSupplementLatex),
    });
  }

  const solved = solveGeneratedExpLogEquation(generatedEquationLatex, target, searchTrace, formulaHandoff);
  if (solved.kind === 'unsupported') {
    return stop(
      'handoff-unsupported',
      `The isolated exp/log equation ${generatedEquationLatex} is outside current selected-target parameter solvers. ${solved.message}`,
      target,
      parameterNames,
    );
  }

  const exactSupplementLatex = normalizeGeneratedDomainFacts([
    ...domainFacts,
    ...(solved.exactSupplementLatex ?? []),
  ]);
  if (solved.formulaPayload?.answerDomain === 'real' && solved.formulaPayload.output.kind === 'case-math') {
    const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Exp/Log Solve',
      familyLines,
      extraSections: (solved.formulaPayload.detailSections ?? [])
        .filter((section) => section.title !== 'Solve Target'),
    });

    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      exactLatex: cleanLatex(solved.formulaPayload.output.exactLatex),
      exactSupplementLatex,
      detailSections,
      generatedEquationLatex,
      answerDomain: 'real',
      mathJsonLeaves: targetDomainMathJsonLeaves(target, exactSupplementLatex),
    });
  }

  const solutionExpressions = solutionExpressionsFromExactLatex(solved.exactLatex, target);
  const normalizedBranches = dedupe(solutionExpressions.map(cleanLatex));
  const validBranches = filterBranchesByLegacyFacts(normalizedBranches, target, exactSupplementLatex);
  if (normalizedBranches.length > 0 && validBranches.length === 0) {
    return stop(
      'domain-empty',
      'No real selected-target solution remains because the algebraic candidate is undefined in the real domain.',
      target,
      parameterNames,
    );
  }

  const renderedFamily = renderLogExpFamily(createRealLogExpFamily({
    targetLatex: target,
    branches: validBranches,
  }));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Exp/Log Solve',
    familyLines,
  });
  const solutionMathJson = solved.solutionMathJson;
  const primaryMath = solutionMathJson?.length === renderedFamily.branchesLatex.length
    ? {
        version: 1 as const,
        canonicalLatex: renderedFamily.exactLatex,
        mathJson: solutionMathJson.length === 1
          ? ['Equal', target, solutionMathJson[0]] as SerializableMathJson
          : ['Element', target, ['Set', ...solutionMathJson]] as SerializableMathJson,
      }
    : undefined;

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: renderedFamily.exactLatex,
    ...(primaryMath ? { primaryMath } : {}),
    branchReadback: renderedFamily.branchReadback,
    approxText: approxTextForBranches(target, renderedFamily.branchesLatex),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex,
    mathJsonLeaves: targetDomainMathJsonLeaves(target, exactSupplementLatex),
  };
}

export function finalizeComplexPreimageExpLogSolve({
  target,
  parameterNames,
  carrierEquationLatex,
  domainFacts,
  carrierLabel,
  complexPreimageHandoff,
}: {
  target: string;
  parameterNames: string[];
  carrierEquationLatex: string;
  domainFacts: string[];
  carrierLabel: string;
  complexPreimageHandoff: NonNullable<ParameterizedExpLogSolveOptions['complexPreimageHandoff']>;
}): ParameterizedExpLogSolveResult {
  const solved = solveParameterizedComplexPreimageCarrierEquation(
    carrierEquationLatex,
    target,
    complexPreimageHandoff,
  );
  if (!solved || solved.answerDomain !== 'complex') {
    return stop(
      'handoff-unsupported',
      `The isolated complex exp/log carrier equation ${carrierEquationLatex} is outside current Complex preimage solvers.`,
      target,
      parameterNames,
    );
  }

  const baseSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    ...domainFacts,
    ...(solved.exactSupplementLatex ?? []),
  ].map(cleanLatex))) ?? [];
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Exp/Log Solve',
    familyLines: [
      `Isolated ${carrierLabel} with a Complex affine exp/log-carrier rule.`,
      `Delegated ${carrierEquationLatex} to existing Complex preimage solving.`,
    ],
    extraSections: (solved.detailSections ?? [])
      .filter((section) => section.title !== 'Solve Target'),
  });
  const renderedFamily = renderLogExpFamily(createComplexLogExpFamily(profileEquationResult({
    targetLatex: target,
    exactLatex: cleanLatex(solved.exactLatex),
    branchReadback: solved.branchReadback,
  })));
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    ...baseSupplementLatex,
    ...(renderedFamily.parameterLatex ? [renderedFamily.parameterLatex] : []),
  ]));

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: renderedFamily.exactLatex,
    branchReadback: renderedFamily.branchReadback,
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: carrierEquationLatex,
    answerDomain: 'complex',
  };
}
