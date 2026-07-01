import { boxLatex } from '../patterns';
import {
  profileTranscendentalFieldTower,
  type TranscendentalFieldTowerExtension,
  type TranscendentalFieldTowerFact,
  type TranscendentalFieldTowerProfile,
  type TranscendentalFieldTowerReadiness,
  type TranscendentalFieldTowerStopReason,
} from './transcendental-field-tower';

export const TRANSCENDENTAL_TOWER_FORMAL_CAPS = {
  exactRationalDegree: 12,
  targetFreeSymbolicDegree: 10,
  resultantDescriptorDegree: 8,
  casewiseBranchRows: 12,
} as const;

export type TranscendentalTowerCoefficientScope =
  | 'exact-rational'
  | 'exact-rational-plus-target-free-symbolic';

export type TranscendentalTowerExtensionKind =
  | 'exponential'
  | 'positive-base-exponential'
  | 'primitive-logarithm'
  | 'trigonometric-pair'
  | 'special-function';

export type TranscendentalTowerDerivativeRule = {
  kind:
    | 'theta-prime-equals-argument-prime-times-theta'
    | 'theta-prime-equals-log-base-times-argument-prime-times-theta'
    | 'theta-prime-equals-argument-prime-over-argument'
    | 'paired-trig-closure'
    | 'special-function-closure';
  ruleLatex: string;
  dependsOnGeneratorIds: string[];
};

export type TranscendentalTowerGenerator = {
  id: string;
  extensionKind: TranscendentalTowerExtensionKind;
  sourceFamily: TranscendentalFieldTowerExtension['family'];
  head: string;
  sourceNode?: unknown;
  depth: number;
  argumentKind: TranscendentalFieldTowerExtension['argumentKind'];
  argumentNode?: unknown;
  argumentLatex?: string;
  polynomialDegree?: number;
  baseNode?: unknown;
  baseLatex?: string;
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
  derivativeRule: TranscendentalTowerDerivativeRule;
};

export type TranscendentalTowerNormalForm = {
  kind: 'normal-form';
  variable: string;
  baseField: {
    kind: 'rational-function-field';
    variable: string;
    coefficientScope: TranscendentalTowerCoefficientScope;
    degreeCap: number;
  };
  coefficientScope: TranscendentalTowerCoefficientScope;
  normalizedInput: unknown;
  inputLatex: string;
  depth: number;
  generators: TranscendentalTowerGenerator[];
  readiness: TranscendentalFieldTowerReadiness[];
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
  caps: typeof TRANSCENDENTAL_TOWER_FORMAL_CAPS;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalTowerNormalFormStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalFieldTowerStopReason;
  detail: string;
  normalizedInput: unknown;
  depth: number;
  profile: TranscendentalFieldTowerProfile;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalTowerNormalFormResult =
  | TranscendentalTowerNormalForm
  | TranscendentalTowerNormalFormStop;

function extensionKindFor(
  extension: TranscendentalFieldTowerExtension,
): TranscendentalTowerExtensionKind {
  switch (extension.family) {
    case 'exp':
      return 'exponential';
    case 'positive-base-exp':
      return 'positive-base-exponential';
    case 'log':
      return 'primitive-logarithm';
    case 'trig':
      return 'trigonometric-pair';
    case 'special-function':
    default:
      return 'special-function';
  }
}

function generatorId(index: number) {
  return `theta_${index + 1}`;
}

function dependencyIdsFor(index: number, extension: TranscendentalFieldTowerExtension) {
  if (extension.argumentKind !== 'nested-transcendental') {
    return [];
  }
  return Array.from({ length: index }, (_, dependencyIndex) => generatorId(dependencyIndex));
}

function derivativeRuleFor(
  extension: TranscendentalFieldTowerExtension,
  index: number,
  variable: string,
): TranscendentalTowerDerivativeRule {
  const id = generatorId(index);
  const argument = extension.argumentLatex ?? '?';
  const argumentPrime = String.raw`\frac{d}{d${variable}}\left(${argument}\right)`;
  const dependencies = dependencyIdsFor(index, extension);

  if (extension.family === 'exp') {
    return {
      kind: 'theta-prime-equals-argument-prime-times-theta',
      ruleLatex: String.raw`${id}'=${argumentPrime}${id}`,
      dependsOnGeneratorIds: dependencies,
    };
  }

  if (extension.family === 'positive-base-exp') {
    const base = extension.baseLatex ?? '?';
    return {
      kind: 'theta-prime-equals-log-base-times-argument-prime-times-theta',
      ruleLatex: String.raw`${id}'=\ln\left(${base}\right)${argumentPrime}${id}`,
      dependsOnGeneratorIds: dependencies,
    };
  }

  if (extension.family === 'log') {
    return {
      kind: 'theta-prime-equals-argument-prime-over-argument',
      ruleLatex: String.raw`${id}'=\frac{${argumentPrime}}{${argument}}`,
      dependsOnGeneratorIds: dependencies,
    };
  }

  if (extension.family === 'trig') {
    return {
      kind: 'paired-trig-closure',
      ruleLatex: String.raw`${id}'\in\operatorname{span}\{\sin(${argument}),\cos(${argument})\}`,
      dependsOnGeneratorIds: dependencies,
    };
  }

  return {
    kind: 'special-function-closure',
    ruleLatex: String.raw`${id}'\text{ follows the registered ${extension.head} derivative rule}`,
    dependsOnGeneratorIds: dependencies,
  };
}

function factsContainSymbolic(facts: TranscendentalFieldTowerFact[]) {
  return facts.some((fact) => /[A-Za-z]/.test(fact.expressionLatex));
}

function inferCoefficientScope(
  profile: Extract<TranscendentalFieldTowerProfile, { kind: 'ready' }>,
): TranscendentalTowerCoefficientScope {
  const symbolicFacts = factsContainSymbolic([...profile.requiredFacts, ...profile.branchFacts]);
  const symbolicArguments = profile.extensions.some((extension) =>
    /[A-Za-z]/.test((extension.argumentLatex ?? '').replaceAll(profile.variable, '')));
  return symbolicFacts || symbolicArguments
    ? 'exact-rational-plus-target-free-symbolic'
    : 'exact-rational';
}

function mapGenerators(extensions: TranscendentalFieldTowerExtension[], variable: string) {
  return extensions.map((extension, index): TranscendentalTowerGenerator => ({
    id: generatorId(index),
    extensionKind: extensionKindFor(extension),
    sourceFamily: extension.family,
    head: extension.head,
    sourceNode: buildGeneratorSourceNode(extension),
    depth: extension.depth,
    argumentKind: extension.argumentKind,
    argumentNode: extension.argumentNode,
    argumentLatex: extension.argumentLatex,
    polynomialDegree: extension.polynomialDegree,
    baseNode: extension.baseNode,
    baseLatex: extension.baseLatex,
    requiredFacts: extension.requiredFacts,
    branchFacts: extension.branchFacts,
    derivativeRule: derivativeRuleFor(extension, index, variable),
  }));
}

function buildGeneratorSourceNode(extension: TranscendentalFieldTowerExtension) {
  if (extension.argumentNode === undefined) {
    return undefined;
  }
  if (extension.family === 'exp') {
    return ['Power', 'ExponentialE', extension.argumentNode];
  }
  if (extension.family === 'positive-base-exp' && extension.baseNode !== undefined) {
    return ['Power', extension.baseNode, extension.argumentNode];
  }
  return [extension.head, extension.argumentNode];
}

export function buildTranscendentalTowerNormalForm(
  node: unknown,
  variable = 'x',
): TranscendentalTowerNormalFormResult {
  const profile = profileTranscendentalFieldTower(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable: profile.variable,
      reason: profile.reason,
      detail: profile.detail,
      normalizedInput: profile.normalizedInput,
      depth: profile.depth,
      profile,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const coefficientScope = inferCoefficientScope(profile);
  const degreeCap = coefficientScope === 'exact-rational'
    ? TRANSCENDENTAL_TOWER_FORMAL_CAPS.exactRationalDegree
    : TRANSCENDENTAL_TOWER_FORMAL_CAPS.targetFreeSymbolicDegree;

  return {
    kind: 'normal-form',
    variable: profile.variable,
    baseField: {
      kind: 'rational-function-field',
      variable: profile.variable,
      coefficientScope,
      degreeCap,
    },
    coefficientScope,
    normalizedInput: profile.normalizedInput,
    inputLatex: boxLatex(profile.normalizedInput),
    depth: profile.depth,
    generators: mapGenerators(profile.extensions, profile.variable),
    readiness: profile.readiness,
    requiredFacts: profile.requiredFacts,
    branchFacts: profile.branchFacts,
    caps: TRANSCENDENTAL_TOWER_FORMAL_CAPS,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
