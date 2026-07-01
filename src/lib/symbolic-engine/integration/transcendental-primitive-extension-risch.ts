import {
  proveTranscendentalDerivationClosure,
  type TranscendentalDerivationClosureStopReason,
} from './transcendental-derivation-closure';
import type {
  TranscendentalTowerGenerator,
  TranscendentalTowerNormalForm,
} from './transcendental-tower-normal-form';
import type { TranscendentalFieldTowerFact } from './transcendental-field-tower';

export type TranscendentalPrimitiveExtensionStopReason =
  | TranscendentalDerivationClosureStopReason
  | 'no-primitive-generator'
  | 'non-primitive-extension';

export type TranscendentalPrimitiveGeneratorProof = {
  generatorId: string;
  head: string;
  argumentLatex?: string;
  derivativeRuleLatex: string;
  derivativeLatex: string;
  baseLevel: 'rational-base-field' | 'previous-primitive-extension';
  dependsOnGeneratorIds: string[];
};

export type TranscendentalPrimitiveExtensionSuccess = {
  kind: 'success';
  variable: string;
  normalForm: TranscendentalTowerNormalForm;
  generators: TranscendentalPrimitiveGeneratorProof[];
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
  proofSummary: string;
  proofSteps: string[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalPrimitiveExtensionStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalPrimitiveExtensionStopReason;
  detail: string;
  normalForm?: TranscendentalTowerNormalForm;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalPrimitiveExtensionResult =
  | TranscendentalPrimitiveExtensionSuccess
  | TranscendentalPrimitiveExtensionStop;

function stop(
  variable: string,
  reason: TranscendentalPrimitiveExtensionStopReason,
  detail: string,
  normalForm?: TranscendentalTowerNormalForm,
): TranscendentalPrimitiveExtensionStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalForm,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function nonPrimitiveGenerator(generators: TranscendentalTowerGenerator[]) {
  return generators.find((generator) => generator.extensionKind !== 'primitive-logarithm');
}

export function analyzePrimitiveExtensionRischCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalPrimitiveExtensionResult {
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
      'no-primitive-generator',
      'The tower normal form has no primitive logarithmic generator to analyze.',
      normalForm,
    );
  }

  const nonPrimitive = nonPrimitiveGenerator(normalForm.generators);
  if (nonPrimitive) {
    return stop(
      normalForm.variable,
      'non-primitive-extension',
      `Generator ${nonPrimitive.id} is ${nonPrimitive.extensionKind}, so the primitive-extension Risch layer does not own this tower.`,
      normalForm,
    );
  }

  const generatorProofs = normalForm.generators.map((generator) => {
    const closed = closure.generatorClosures.find((entry) => entry.generatorId === generator.id);
    return {
      generatorId: generator.id,
      head: generator.head,
      argumentLatex: generator.argumentLatex,
      derivativeRuleLatex: generator.derivativeRule.ruleLatex,
      derivativeLatex: closed?.generatorDerivativeLatex ?? generator.derivativeRule.ruleLatex,
      baseLevel: generator.derivativeRule.dependsOnGeneratorIds.length === 0
        ? 'rational-base-field'
        : 'previous-primitive-extension',
      dependsOnGeneratorIds: generator.derivativeRule.dependsOnGeneratorIds,
    } satisfies TranscendentalPrimitiveGeneratorProof;
  });

  return {
    kind: 'success',
    variable: normalForm.variable,
    normalForm,
    generators: generatorProofs,
    requiredFacts: normalForm.requiredFacts,
    branchFacts: normalForm.branchFacts,
    proofSummary: 'Primitive-extension Risch readiness succeeded for a logarithmic tower with proof-local derivation closure.',
    proofSteps: [
      'Every tower generator is logarithmic, so each theta derivative is argument-prime divided by the argument.',
      'Each generator derivative was checked through the proof-local exact differentiation path.',
      'No Compute Engine fallback or numeric-confidence evidence is used in this proof layer.',
    ],
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
