import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit } from '../../../types/calculator';
import {
  generateNestedCompositionBranchesForChain,
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrierChain,
  type CompositionCarrierKind,
  type CompositionCoreStopReason,
  type CompositionMathJson,
} from './core';

const ce = new ComputeEngine();

const ALGEBRAIC_WRAPPER_KINDS = new Set<CompositionCarrierKind>([
  'square-root',
  'absolute-value',
  'square-power',
  'odd-power',
  'even-power',
  'nth-root',
]);

export type NestedAlgebraicFormulaWrapperReady = {
  kind: 'ready';
  depth: 2;
  carrierKinds: [CompositionCarrierKind, CompositionCarrierKind];
  carrierLatex: [string, string];
  generatedEquationLatex: string[];
  layerEquationLatex: string[];
  facts: string[];
};

export type NestedAlgebraicFormulaWrapperDeferred = {
  kind: 'deferred';
  reason: CompositionCoreStopReason;
  message: string;
  carrierKinds?: CompositionCarrierKind[];
};

export type NestedAlgebraicFormulaWrapperSubstrate =
  | NestedAlgebraicFormulaWrapperReady
  | NestedAlgebraicFormulaWrapperDeferred;

function deferred(
  reason: CompositionCoreStopReason,
  message: string,
  carrierKinds?: CompositionCarrierKind[],
): NestedAlgebraicFormulaWrapperDeferred {
  return {
    kind: 'deferred',
    reason,
    message,
    ...(carrierKinds ? { carrierKinds } : {}),
  };
}

function parseEquation(equationLatex: string) {
  try {
    const json = ce.parse(equationLatex).json;
    if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
      return null;
    }
    return [json[1] as CompositionMathJson, json[2] as CompositionMathJson] as const;
  } catch {
    return 'parse-error' as const;
  }
}

export function inspectNestedAlgebraicFormulaWrapperSubstrate(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
): NestedAlgebraicFormulaWrapperSubstrate {
  const parsed = parseEquation(equationLatex);
  if (parsed === 'parse-error') {
    return deferred('parse-error', 'The equation could not be parsed for nested wrapper formula readiness.');
  }
  if (!parsed) {
    return deferred('non-equation', 'Enter an = equation before nested wrapper formula readiness.');
  }

  const [left, right] = parsed;
  if (!hasCompositionTarget(['Equal', left, right], target)) {
    return deferred('target-not-found', `Selected target ${target} was not found in this equation.`);
  }

  let sawTargetOutsideCarrier = false;
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];

  for (const candidate of candidates) {
    if (!hasCompositionTarget(candidate.carrierSide, target)) {
      continue;
    }
    if (hasCompositionTarget(candidate.valueSide, target)) {
      sawTargetOutsideCarrier = true;
      continue;
    }

    const chain = matchSelectedCompositionCarrierChain(candidate.carrierSide, target);
    if (chain.kind === 'blocked') {
      return deferred(chain.reason, chain.message);
    }
    if (chain.kind === 'none') {
      continue;
    }

    const carrierKinds = chain.carriers.map((carrier) => carrier.kind);
    if (!carrierKinds.every((kind) => ALGEBRAIC_WRAPPER_KINDS.has(kind))) {
      return deferred(
        'unsupported-carrier',
        'Nested formula substrate is limited to two algebraic wrapper carriers.',
        carrierKinds,
      );
    }

    const generated = generateNestedCompositionBranchesForChain(
      chain.carriers,
      candidate.valueSide,
      target,
      angleUnit,
    );
    if (generated.kind === 'unsupported') {
      return deferred(generated.reason, generated.message, carrierKinds);
    }

    return {
      kind: 'ready',
      depth: 2,
      carrierKinds: carrierKinds as [CompositionCarrierKind, CompositionCarrierKind],
      carrierLatex: chain.carriers.map((carrier) => carrier.labelLatex) as [string, string],
      generatedEquationLatex: generated.equations,
      layerEquationLatex: generated.layerEquationLatex,
      facts: generated.facts,
    };
  }

  if (sawTargetOutsideCarrier) {
    return deferred(
      'target-outside-carrier',
      'Nested formula substrate requires the selected target to appear only inside the bounded composition chain.',
    );
  }

  return deferred(
    'no-composition',
    'No supported nested algebraic wrapper formula substrate was found.',
  );
}
