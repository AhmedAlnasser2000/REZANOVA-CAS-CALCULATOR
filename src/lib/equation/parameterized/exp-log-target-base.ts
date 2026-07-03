import {
  ZERO,
  EPSILON,
  containsSelectedExpLog,
  finalizeGeneratedExpLogSolve,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  latexForNode,
  nonzeroFactForNode,
  notOneFactForNode,
  numericValueOfNode,
  positiveFactForNode,
  stop,
} from './exp-log-core';
import {
  logCarrierLatex,
  powerCarrierLatex,
  wrapLatexForPowerBase,
} from './exp-log-latex';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import type { MathJson } from './math-json';
import type {
  ParameterizedExpLogStopReason,
  ParameterizedExpLogSolveResult,
  TargetBaseCarrierMatch,
  TargetBaseCarrierProfile,
} from './exp-log-types';

function matchTargetBaseCarrier(node: unknown, target: string): TargetBaseCarrierMatch {
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;

  if (operator === 'Power' && operands.length === 2) {
    const [baseNode, exponentNode] = operands as MathJson[];
    if (!hasTarget(baseNode, target)) {
      return { kind: 'none' };
    }
    if (hasTarget(exponentNode, target)) {
      return {
        kind: 'blocked',
        reason: 'target-in-unsupported-operation',
        message: 'PARAM10 does not solve equations where the selected target appears in both base and exponent.',
      };
    }
    if (containsSelectedExpLog(baseNode, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-exp-log',
        message: 'Nested selected-target exp/log bases are outside PARAM10.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'power-base',
        node: node as MathJson,
        base: baseNode,
        exponentOrValue: exponentNode,
        labelLatex: powerCarrierLatex(baseNode, exponentNode),
      },
    };
  }

  if (operator === 'Log' && operands.length === 2) {
    const [argumentNode, baseNode] = operands as MathJson[];
    if (!hasTarget(baseNode, target)) {
      return { kind: 'none' };
    }
    if (hasTarget(argumentNode, target)) {
      return {
        kind: 'blocked',
        reason: 'target-in-unsupported-operation',
        message: 'PARAM10 does not solve logarithms where the selected target appears in both base and argument.',
      };
    }
    if (containsSelectedExpLog(baseNode, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-exp-log',
        message: 'Nested selected-target exp/log bases are outside PARAM10.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'log-base',
        node: node as MathJson,
        base: baseNode,
        exponentOrValue: operands[1] as MathJson,
        argument: argumentNode,
        labelLatex: logCarrierLatex(argumentNode, baseNode),
      },
    };
  }

  return { kind: 'none' };
}

function reciprocalExponentLatex(exponent: MathJson) {
  if (isOneNode(exponent)) {
    return '1';
  }
  if (isNegativeOneNode(exponent)) {
    return '-1';
  }
  return `\\frac{1}{${latexForNode(exponent)}}`;
}

function principalPowerLatex(value: MathJson, exponent: MathJson) {
  return `${wrapLatexForPowerBase(value)}^{${reciprocalExponentLatex(exponent)}}`;
}

function factsForTargetBasePower(base: MathJson, exponent: MathJson, value: MathJson) {
  return [
    positiveFactForNode(value),
    nonzeroFactForNode(exponent),
    positiveFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
}

function factsForTargetLogBase(base: MathJson, exponent: MathJson, argument: MathJson) {
  return [
    positiveFactForNode(argument),
    nonzeroFactForNode(exponent),
    positiveFactForNode(base),
    notOneFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
}

function generatedEquationForTargetBaseCarrier(
  carrier: TargetBaseCarrierProfile,
  value: MathJson,
): { kind: 'ok'; equationLatex: string; facts: string[] } | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string } {
  if (carrier.kind === 'power-base') {
    const exponentValue = numericValueOfNode(carrier.exponentOrValue);
    if (exponentValue !== null && Math.abs(exponentValue) <= EPSILON) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-shell',
        message: 'Zero-exponent target-in-base equations reduce to conditional families outside PARAM10.',
      };
    }

    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No principal real selected-target solution remains because the target-base right side must be positive.',
      };
    }

    return {
      kind: 'ok',
      equationLatex: `${latexForNode(carrier.base)}=${principalPowerLatex(value, carrier.exponentOrValue)}`,
      facts: factsForTargetBasePower(carrier.base, carrier.exponentOrValue, value),
    };
  }

  const logValue = numericValueOfNode(value);
  if (logValue !== null && Math.abs(logValue) <= EPSILON) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'Zero-result log-base equations reduce to conditional base families outside PARAM10.',
    };
  }

  const argument = carrier.argument ?? ZERO;
  const argumentValue = numericValueOfNode(argument);
  if (argumentValue !== null && argumentValue <= 0) {
    return {
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because logarithm arguments must be positive.',
    };
  }

  return {
    kind: 'ok',
    equationLatex: `${latexForNode(carrier.base)}=${principalPowerLatex(argument, value)}`,
    facts: factsForTargetLogBase(carrier.base, value, argument),
  };
}

export function solveTargetBaseDirectEquation(
  left: MathJson,
  right: MathJson,
  target: string,
  parameterNames: string[],
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
): ParameterizedExpLogSolveResult | { kind: 'none' } {
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];

  for (const candidate of candidates) {
    const match = matchTargetBaseCarrier(candidate.carrierSide, target);
    if (match.kind === 'blocked') {
      return stop(match.reason, match.message, target, parameterNames);
    }
    if (match.kind === 'none') {
      continue;
    }
    if (hasTarget(candidate.valueSide, target)) {
      return stop(
        'target-in-unsupported-operation',
        'PARAM10 target-in-base solving requires the opposite side to be target-free.',
        target,
        parameterNames,
      );
    }

    const generated = generatedEquationForTargetBaseCarrier(match.carrier, candidate.valueSide);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    return finalizeGeneratedExpLogSolve({
      target,
      parameterNames,
      generatedEquationLatex: generated.equationLatex,
      domainFacts: generated.facts,
      carrierLabel: `${match.carrier.labelLatex}=${latexForNode(candidate.valueSide)}`,
      searchTrace,
    });
  }

  return { kind: 'none' };
}
