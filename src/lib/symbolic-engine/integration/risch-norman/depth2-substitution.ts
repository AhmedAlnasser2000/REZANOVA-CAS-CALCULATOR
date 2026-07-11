import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactScalarEquals,
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { boxLatex, flattenAdd, flattenMultiply, isNodeArray, wrapGroupedLatex } from '../../patterns';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { sameNode } from '../node-helpers';
import {
  profileDepth2TranscendentalTower,
  type Depth2TowerProfileReady,
} from '../transcendental-certificate/depth2-profile';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

type Depth2SubstitutionResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
};

const ONE: ExactScalar = { numerator: 1, denominator: 1 };

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman depth-2 derivative-substitution rule proof',
  };
}

function isExp(node: unknown): node is ['Power', unknown, unknown] {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE';
}

function scalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(normalizeExactScalar(value)));
}

function readableLatex(node: unknown): string {
  if (isExp(node)) {
    return `e^{${readableLatex(node[2])}}`;
  }

  return boxLatex(node).replace(/\\exponentialE/g, 'e');
}

function coefficientNodeOrOne(node: unknown | undefined) {
  return node ?? 1;
}

function splitCoefficientCarrier(
  node: unknown,
  carrier: unknown,
  variable: string,
) {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const carrierFactors = factors.filter((factor) => sameNode(factor, carrier));
  if (carrierFactors.length !== 1) {
    return undefined;
  }

  const coefficientFactors = factors.filter((factor) => !sameNode(factor, carrier));
  if (coefficientFactors.some((factor) => {
    if (typeof factor === 'string') {
      return factor === variable;
    }
    return isNodeArray(factor) && JSON.stringify(factor).includes(`"${variable}"`);
  })) {
    return undefined;
  }

  return coefficientFactors.length === 0
    ? undefined
    : coefficientFactors.length === 1
      ? coefficientFactors[0]
      : ['Multiply', ...coefficientFactors];
}

function ratioPrefactorLatex(input: {
  coefficientNode?: unknown;
  slopeNode: unknown;
}) {
  const coefficientNode = coefficientNodeOrOne(input.coefficientNode);
  const coefficientScalar = readExactScalarNode(coefficientNode);
  const slopeScalar = readExactScalarNode(input.slopeNode);
  if (coefficientScalar && slopeScalar) {
    const ratio = divideExactScalars(coefficientScalar, slopeScalar);
    if (!ratio) {
      return undefined;
    }
    const normalized = normalizeExactScalar(ratio);
    return exactScalarEquals(normalized, ONE) ? undefined : scalarLatex(normalized);
  }

  const coefficientLatex = input.coefficientNode === undefined ? '1' : boxLatex(input.coefficientNode);
  const slopeLatex = boxLatex(input.slopeNode);
  if (coefficientLatex === slopeLatex) {
    return undefined;
  }
  if (slopeLatex === '1') {
    return coefficientLatex === '1' ? undefined : coefficientLatex;
  }

  return String.raw`\frac{${coefficientLatex}}{${slopeLatex}}`;
}

function multiplyPrefactor(prefactorLatex: string | undefined, valueLatex: string) {
  if (!prefactorLatex || prefactorLatex === '1') {
    return valueLatex;
  }
  if (prefactorLatex === '-1') {
    return `-${wrapGroupedLatex(valueLatex)}`;
  }

  return String.raw`${prefactorLatex}\cdot ${valueLatex}`;
}

function supplement(entries: ExactSupplementEntry[]) {
  const lines = mergeExactSupplementLatex({
    entries,
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function condition(expressionLatex: string, relation: '>0' | '\\ne0'): ExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex,
    relation,
    source: 'candidate-validation',
  };
}

function result(
  exactLatex: string,
  variable: string,
  exactSupplementLatex?: string[],
): Depth2SubstitutionResult {
  return profileSymbolicIntegrationResult({
    exactLatex: normalizeGeneratedIntegrationLatex(exactLatex, variable),
    verification: proof(),
    exactSupplementLatex,
  });
}

function nestedExpProfileResult(
  profile: Depth2TowerProfileReady,
): Depth2SubstitutionResult | undefined {
  if (
    profile.family !== 'nested-exp-derivative-substitution'
    && profile.family !== 'nested-sin-exp-derivative-substitution'
  ) {
    return undefined;
  }

  return result(
    readableLatex(['Power', 'ExponentialE', profile.coreArgumentNode]),
    profile.variable,
  );
}

function splitOnePlusExp(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  const terms = flattenAdd(node);
  const oneTerms = terms.filter((term) => term === 1);
  const expTerms = terms.filter(isExp);
  return oneTerms.length === 1 && expTerms.length === 1 && terms.length === 2
    ? expTerms[0]
    : undefined;
}

function tryNestedExpLogDerivative(
  node: unknown,
  variable: string,
): Depth2SubstitutionResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const [, numerator, denominator] = node;
  const expCarrier = splitOnePlusExp(denominator);
  if (!expCarrier) {
    return undefined;
  }

  const coefficientNode = splitCoefficientCarrier(numerator, expCarrier, variable);
  if (coefficientNode === undefined && !sameNode(numerator, expCarrier)) {
    return undefined;
  }

  const affine = parseSymbolicAffine(expCarrier[2], variable);
  if (!affine) {
    return undefined;
  }

  const prefactor = ratioPrefactorLatex({
    coefficientNode,
    slopeNode: affine.slope,
  });
  return result(
    multiplyPrefactor(prefactor, String.raw`\ln\left(${readableLatex(denominator)}\right)`),
    variable,
  );
}

function splitAffineTimesLog(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const logFactors = factors.filter((factor) =>
    isNodeArray(factor) && factor[0] === 'Ln' && factor.length === 2);
  if (logFactors.length !== 1 || factors.length !== 2) {
    return undefined;
  }

  const logFactor = logFactors[0] as ['Ln', unknown];
  const affineFactor = factors.find((factor) => factor !== logFactor);
  if (!affineFactor || !sameNode(affineFactor, logFactor[1])) {
    return undefined;
  }

  const affine = parseSymbolicAffine(logFactor[1], variable);
  return affine
    ? { affine, argumentNode: logFactor[1], argumentLatex: affine.latex }
    : undefined;
}

function tryNestedLogLogDerivative(
  node: unknown,
  variable: string,
): Depth2SubstitutionResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const [, numerator, denominator] = node;
  const split = splitAffineTimesLog(denominator, variable);
  if (!split) {
    return undefined;
  }

  const coefficientNode = numerator === 1 ? undefined : numerator;
  const prefactor = ratioPrefactorLatex({
    coefficientNode,
    slopeNode: split.affine.slope,
  });
  const logArgument = String.raw`\ln\left(${split.argumentLatex}\right)`;
  return result(
    multiplyPrefactor(prefactor, String.raw`\ln\left|${logArgument}\right|`),
    variable,
    supplement([
      condition(split.argumentLatex, '>0'),
      condition(logArgument, '\\ne0'),
    ]),
  );
}

export function tryRischNormanDepth2DerivativeSubstitutionRule(
  node: unknown,
  variable = 'x',
): Depth2SubstitutionResult | undefined {
  const profile = profileDepth2TranscendentalTower(node, variable);
  if (profile.kind === 'ready' && profile.consumer === 'risch-norman-substitution') {
    const profiled = nestedExpProfileResult(profile);
    if (profiled) {
      return profiled;
    }
  }

  return tryNestedExpLogDerivative(node, variable)
    ?? tryNestedLogLogDerivative(node, variable);
}
