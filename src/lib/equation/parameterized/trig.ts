import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit } from '../../../types/calculator';
import { hasTarget, isArrayNode } from './math-json';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';
import { containsSelectedTrig } from './trig-carrier';
import { solveDirectParameterizedTrigFromJson } from './trig-direct';
import { solveMixedParameterizedTrigFromJson } from './trig-mixed';
import type { MathJson } from './math-json';
export type {
  ParameterizedTrigSolveOptions,
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
  ParameterizedTrigSolveSuccess,
  ParameterizedTrigStopReason,
} from './trig-types';
import type {
  ParameterizedTrigSolveOptions,
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
  ParameterizedTrigStopReason,
} from './trig-types';

const ce = new ComputeEngine();

function stop(
  reason: ParameterizedTrigStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedTrigSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

export function solveParameterizedTrigEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  options: ParameterizedTrigSolveOptions = {},
): ParameterizedTrigSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target, { exclude: ['n'] });

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized trig solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized trig solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized trig solving.', target, parameterNames);
  }
  const equationJson = json as MathJson[];

  if (!hasTarget(equationJson, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (!containsSelectedTrig(equationJson, target)) {
    return stop(
      'no-trig',
      'No supported trigonometric selected-target carrier was found.',
      target,
      parameterNames,
    );
  }

  const direct = solveDirectParameterizedTrigFromJson(equationJson, target, angleUnit, parameterNames, options);
  if (direct.kind === 'success') {
    return direct;
  }

  const mixed = solveMixedParameterizedTrigFromJson(equationJson, target, angleUnit, parameterNames, options);
  if (mixed.kind === 'success') {
    return mixed;
  }

  if (options.complexPreimageHandoff?.domain === 'complex') {
    return direct;
  }

  return mixed.reason !== 'no-trig' ? mixed : direct;
}
