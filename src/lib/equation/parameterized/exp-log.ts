import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  collectExpLogAffine,
  cleanLatex,
  containsSelectedExpLog,
  divideNodes,
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
import {
  complexPreimageEquationForCarrier,
  finalizeComplexPreimageExpLogSolve,
  finalizeGeneratedExpLogSolve,
  generatedEquationForCarrier,
} from './exp-log-generated-finalize';
import { solveTargetBaseDirectEquation } from './exp-log-target-base';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
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

type NestedNaturalLogHandoff = {
  logNode: MathJson;
  inner: MathJson;
  value: MathJson;
  generatedEquationLatex: string;
  domainFacts: string[];
};

function nestedNaturalLogHandoffForSide(
  side: MathJson,
  otherSide: MathJson,
  target: string,
): NestedNaturalLogHandoff | null {
  const inner = isArrayNode(side) ? side[1] as MathJson : null;
  if (
    !isArrayNode(side)
    || side[0] !== 'Ln'
    || side.length !== 2
    || !inner
    || !hasTarget(inner, target)
    || !isSupportedNestedExponentialInner(inner, target)
    || hasTarget(otherSide, target)
  ) {
    return null;
  }

  const value = otherSide;
  return {
    logNode: side,
    inner,
    value,
    generatedEquationLatex: `${latexForNode(inner)}=${latexForNode(['Power', 'ExponentialE', value] as MathJson)}`,
    domainFacts: [`${latexForNode(inner)}>0`],
  };
}

function containsSelectedExponentialCarrier(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    operator === 'Power'
    && operands.length === 2
    && !hasTarget(operands[0], target)
    && hasTarget(operands[1], target)
  ) {
    return true;
  }
  return operands.some((operand) => containsSelectedExponentialCarrier(operand, target));
}

function isSupportedNestedExponentialInner(inner: MathJson, target: string) {
  return isArrayNode(inner)
    && (inner[0] === 'Add' || inner[0] === 'Subtract')
    && containsSelectedExponentialCarrier(inner, target);
}

function nestedNaturalLogHandoff(
  equationJson: MathJson[],
  target: string,
) {
  return nestedNaturalLogHandoffForSide(equationJson[1], equationJson[2], target)
    ?? nestedNaturalLogHandoffForSide(equationJson[2], equationJson[1], target);
}

function solveNestedNaturalLogComposition(
  handoff: NestedNaturalLogHandoff,
  target: string,
  parameterNames: string[],
  options: ParameterizedExpLogSolveOptions,
): ParameterizedExpLogSolveResult | null {
  const solved = solveParameterizedExpLogEquation(
    handoff.generatedEquationLatex,
    target,
    {
      ...options,
      allowGeneratedImplicitProducts: true,
    },
  );
  if (solved.kind === 'unsupported') {
    return null;
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    ...handoff.domainFacts,
    ...(solved.exactSupplementLatex ?? []),
  ].map(cleanLatex));

  return {
    ...solved,
    parameterNames,
    exactSupplementLatex,
    generatedEquationLatex: handoff.generatedEquationLatex,
    detailSections: buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Exp/Log Solve',
      familyLines: [
        `Converted ${latexForNode(handoff.logNode)}=${latexForNode(handoff.value)} to ${handoff.generatedEquationLatex} with a natural-log inverse rule.`,
        'Delegated the generated exponential equation to existing selected-target parameter solvers.',
      ],
      extraSections: solved.detailSections
        .filter((section) => section.title !== 'Solve Target'),
    }),
  };
}

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

  const nestedLog = nestedNaturalLogHandoff(equationJson, target);
  if (nestedLog) {
    const solvedNested = solveNestedNaturalLogComposition(nestedLog, target, parameterNames, options);
    if (solvedNested) {
      return solvedNested;
    }
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
  let generatedEquationMathJson: import('../../../types/calculator').SerializableMathJson | undefined;
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
    if (options.complexPreimageHandoff?.domain === 'complex' && parameterNames.length === 0) {
      const carrierEquationLatex = complexPreimageEquationForCarrier(carrier, carrierValue);
      return finalizeComplexPreimageExpLogSolve({
        target,
        parameterNames,
        carrierEquationLatex,
        domainFacts: [nonzeroFactForNode(normalized.affine.coefficient)]
          .filter((entry): entry is string => Boolean(entry)),
        carrierLabel: `${carrier.labelLatex}=${latexForNode(carrierValue)}`,
        complexPreimageHandoff: options.complexPreimageHandoff,
      });
    }

    const generated = generatedEquationForCarrier(carrier, carrierValue);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }
    carrierLabel = `${carrier.labelLatex}=${latexForNode(carrierValue)}`;
    generatedEquationLatex = generated.equationLatex;
    generatedEquationMathJson = generated.equationMathJson;
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
    generatedEquationMathJson,
    domainFacts,
    carrierLabel,
    searchTrace: options.searchTrace,
    formulaHandoff: options.formulaHandoff,
  });
}
