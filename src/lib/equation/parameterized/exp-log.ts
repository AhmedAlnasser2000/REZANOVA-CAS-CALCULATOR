import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  collectExpLogAffine,
  containsSelectedExpLog,
  divideNodes,
  finalizeGeneratedExpLogSolve,
  generatedEquationForCarrier,
  hasTarget,
  isArrayNode,
  isZeroNode,
  latexForNode,
  negateNode,
  nonzeroFactForNode,
  sameBaseDirectEquation,
  stop,
  subtractAffine,
} from './exp-log-core';
import { solveTargetBaseDirectEquation } from './exp-log-target-base';
export type {
  ParameterizedExpLogSolveOptions,
  ParameterizedExpLogSolveResult,
  ParameterizedExpLogSolveStop,
  ParameterizedExpLogSolveSuccess,
  ParameterizedExpLogStopReason,
} from './exp-log-types';
import type {
  ParameterizedExpLogSolveOptions,
  ParameterizedExpLogSolveResult,
} from './exp-log-types';
import type { MathJson } from './math-json';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';

const ce = new ComputeEngine();

export function solveParameterizedExpLogEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedExpLogSolveOptions = {},
): ParameterizedExpLogSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized exp/log solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized exp/log solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized exp/log solving.', target, parameterNames);
  }
  const equationJson = json as MathJson[];

  if (!hasTarget(equationJson, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const targetBase = solveTargetBaseDirectEquation(
    equationJson[1],
    equationJson[2],
    target,
    parameterNames,
    options.searchTrace,
  );
  if (targetBase.kind !== 'none') {
    return targetBase;
  }

  if (!containsSelectedExpLog(equationJson, target)) {
    return stop(
      'no-exp-log',
      'No supported exponential or logarithmic selected-target carrier was found for EQUATION-PARAM5.',
      target,
      parameterNames,
    );
  }

  const sameBase = sameBaseDirectEquation(equationJson[1], equationJson[2], target);
  let generatedEquationLatex: string;
  let domainFacts: string[];
  let carrierLabel = 'same-base exp/log carriers';

  if (sameBase) {
    generatedEquationLatex = sameBase.equationLatex;
    domainFacts = sameBase.facts;
  } else {
    const left = collectExpLogAffine(equationJson[1], target);
    if (left.kind === 'unsupported') {
      return stop(left.reason, left.message, target, parameterNames);
    }

    const right = collectExpLogAffine(equationJson[2], target);
    if (right.kind === 'unsupported') {
      return stop(right.reason, right.message, target, parameterNames);
    }

    const normalized = subtractAffine(left.affine, right.affine);
    if (normalized.kind === 'unsupported') {
      return stop(normalized.reason, normalized.message, target, parameterNames);
    }

    const carrier = normalized.affine.carrier;
    if (!carrier) {
      return stop(
        'no-exp-log',
        'No supported exponential or logarithmic selected-target carrier was found for EQUATION-PARAM5.',
        target,
        parameterNames,
      );
    }

    if (isZeroNode(normalized.affine.coefficient)) {
      return stop(
        'unsupported-shell',
        'The selected-target exp/log carrier cancels before isolation.',
        target,
        parameterNames,
      );
    }

    const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
    const generated = generatedEquationForCarrier(carrier, carrierValue);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }
    carrierLabel = `${carrier.labelLatex}=${latexForNode(carrierValue)}`;
    generatedEquationLatex = generated.equationLatex;
    domainFacts = [...new Set([
      nonzeroFactForNode(normalized.affine.coefficient),
      ...normalized.affine.facts,
      ...generated.facts,
    ].filter((entry): entry is string => Boolean(entry)))];
  }

  return finalizeGeneratedExpLogSolve({
    target,
    parameterNames,
    generatedEquationLatex,
    domainFacts,
    carrierLabel,
    searchTrace: options.searchTrace,
    formulaHandoff: options.formulaHandoff,
  });
}
