import { certificateProofNodeLatex } from './transcendental-certificate/proof-diff';
import {
  proveTranscendentalDerivationClosure,
  type TranscendentalDerivationClosureStopReason,
} from './transcendental-derivation-closure';
import type {
  TranscendentalTowerGenerator,
  TranscendentalTowerNormalForm,
} from './transcendental-tower-normal-form';
import type { TranscendentalFieldTowerFact } from './transcendental-field-tower';

export type TranscendentalExponentialExtensionStopReason =
  | TranscendentalDerivationClosureStopReason
  | 'no-exponential-generator'
  | 'non-exponential-extension';

export type TranscendentalExponentialGeneratorProof = {
  generatorId: string;
  head: string;
  baseLatex?: string;
  argumentLatex?: string;
  derivativeRuleLatex: string;
  logarithmicDerivativeLatex: string;
  baseLevel: 'rational-base-field' | 'previous-exponential-extension';
  dependsOnGeneratorIds: string[];
};

export type TranscendentalExponentialExtensionSuccess = {
  kind: 'success';
  variable: string;
  normalForm: TranscendentalTowerNormalForm;
  generators: TranscendentalExponentialGeneratorProof[];
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
  proofSummary: string;
  proofSteps: string[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalExponentialExtensionStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalExponentialExtensionStopReason;
  detail: string;
  normalForm?: TranscendentalTowerNormalForm;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalExponentialExtensionResult =
  | TranscendentalExponentialExtensionSuccess
  | TranscendentalExponentialExtensionStop;

function stop(
  variable: string,
  reason: TranscendentalExponentialExtensionStopReason,
  detail: string,
  normalForm?: TranscendentalTowerNormalForm,
): TranscendentalExponentialExtensionStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalForm,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function isExponentialGenerator(generator: TranscendentalTowerGenerator) {
  return generator.extensionKind === 'exponential'
    || generator.extensionKind === 'positive-base-exponential';
}

function nonExponentialGenerator(generators: TranscendentalTowerGenerator[]) {
  return generators.find((generator) => !isExponentialGenerator(generator));
}

function logarithmicDerivativeLatex(
  generator: TranscendentalTowerGenerator,
  closure: ReturnType<typeof proveTranscendentalDerivationClosure> extends infer Result
    ? Result extends { kind: 'success'; generatorClosures: infer Closures }
      ? Closures extends Array<infer Closure>
        ? Closure
        : never
      : never
    : never,
) {
  const argumentDerivative = closure.argumentDerivative === undefined
    ? generator.derivativeRule.ruleLatex
    : certificateProofNodeLatex(closure.argumentDerivative.derivativeNode);

  if (generator.extensionKind === 'positive-base-exponential') {
    return String.raw`\ln\left(${generator.baseLatex ?? '?'}\right)\left(${argumentDerivative}\right)`;
  }

  return argumentDerivative;
}

export function analyzeExponentialExtensionRischCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalExponentialExtensionResult {
  const closure = proveTranscendentalDerivationClosure(node, variable);
  if (closure.kind === 'stop') {
    return stop(
      closure.variable,
      closure.reason,
      closure.detail,
      closure.normalForm,
    );
  }

  const normalForm = closure.normalForm;
  if (normalForm.generators.length === 0) {
    return stop(
      normalForm.variable,
      'no-exponential-generator',
      'The tower normal form has no exponential generator to analyze.',
      normalForm,
    );
  }

  const nonExponential = nonExponentialGenerator(normalForm.generators);
  if (nonExponential) {
    return stop(
      normalForm.variable,
      'non-exponential-extension',
      `Generator ${nonExponential.id} is ${nonExponential.extensionKind}, so the exponential-extension Risch layer does not own this tower.`,
      normalForm,
    );
  }

  const generatorProofs = normalForm.generators.map((generator) => {
    const closed = closure.generatorClosures.find((entry) => entry.generatorId === generator.id);
    return {
      generatorId: generator.id,
      head: generator.head,
      baseLatex: generator.baseLatex,
      argumentLatex: generator.argumentLatex,
      derivativeRuleLatex: generator.derivativeRule.ruleLatex,
      logarithmicDerivativeLatex: closed
        ? logarithmicDerivativeLatex(generator, closed)
        : generator.derivativeRule.ruleLatex,
      baseLevel: generator.derivativeRule.dependsOnGeneratorIds.length === 0
        ? 'rational-base-field'
        : 'previous-exponential-extension',
      dependsOnGeneratorIds: generator.derivativeRule.dependsOnGeneratorIds,
    } satisfies TranscendentalExponentialGeneratorProof;
  });

  return {
    kind: 'success',
    variable: normalForm.variable,
    normalForm,
    generators: generatorProofs,
    requiredFacts: normalForm.requiredFacts,
    branchFacts: normalForm.branchFacts,
    proofSummary: 'Exponential-extension Risch readiness succeeded for a tower whose generator logarithmic derivatives stay in the previous field.',
    proofSteps: [
      'Every tower generator is exponential or positive-base exponential.',
      'For each generator theta, theta-prime divided by theta is represented in the previous field.',
      'Each generator derivative was checked through the proof-local exact differentiation path.',
      'No Compute Engine fallback or numeric-confidence evidence is used in this proof layer.',
    ],
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
