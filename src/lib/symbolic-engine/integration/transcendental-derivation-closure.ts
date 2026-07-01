import {
  certificateProofNodeLatex,
  differentiateForCertificateProof,
  type CertificateDifferentiationResult,
  type CertificateDifferentiationStopReason,
  type CertificateDifferentiationSuccess,
} from './transcendental-certificate/proof-diff';
import {
  buildTranscendentalTowerNormalForm,
  type TranscendentalTowerGenerator,
  type TranscendentalTowerNormalForm,
  type TranscendentalTowerNormalFormStop,
} from './transcendental-tower-normal-form';

export type TranscendentalDerivationClosureStopReason =
  | CertificateDifferentiationStopReason
  | TranscendentalTowerNormalFormStop['reason']
  | 'missing-generator-node';

export type TranscendentalGeneratorClosure = {
  kind: 'generator-closure';
  generatorId: string;
  head: string;
  extensionKind: TranscendentalTowerGenerator['extensionKind'];
  dependsOnGeneratorIds: string[];
  argumentDerivative?: CertificateDifferentiationSuccess;
  generatorDerivative: CertificateDifferentiationSuccess;
  generatorDerivativeLatex: string;
};

export type TranscendentalDerivationClosureSuccess = {
  kind: 'success';
  variable: string;
  normalForm: TranscendentalTowerNormalForm;
  inputDerivative: CertificateDifferentiationSuccess;
  inputDerivativeLatex: string;
  generatorClosures: TranscendentalGeneratorClosure[];
  proofSummary: string;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalDerivationClosureStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalDerivationClosureStopReason;
  detail: string;
  normalForm?: TranscendentalTowerNormalForm;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalDerivationClosureResult =
  | TranscendentalDerivationClosureSuccess
  | TranscendentalDerivationClosureStop;

function stop(
  variable: string,
  reason: TranscendentalDerivationClosureStopReason,
  detail: string,
  normalForm?: TranscendentalTowerNormalForm,
): TranscendentalDerivationClosureStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalForm,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function requireSuccess(
  result: CertificateDifferentiationResult,
  context: string,
  normalForm: TranscendentalTowerNormalForm,
): CertificateDifferentiationSuccess | TranscendentalDerivationClosureStop {
  if (result.kind === 'success') {
    return result;
  }
  return stop(
    result.variable,
    result.reason,
    `${context}: ${result.detail}`,
    normalForm,
  );
}

function isClosureStop(
  value: CertificateDifferentiationSuccess | TranscendentalDerivationClosureStop,
): value is TranscendentalDerivationClosureStop {
  return value.kind === 'stop';
}

function closeGenerator(
  generator: TranscendentalTowerGenerator,
  variable: string,
  normalForm: TranscendentalTowerNormalForm,
): TranscendentalGeneratorClosure | TranscendentalDerivationClosureStop {
  if (generator.sourceNode === undefined) {
    return stop(
      variable,
      'missing-generator-node',
      `Generator ${generator.id} has no source node for proof-local differentiation.`,
      normalForm,
    );
  }

  const argumentDerivative = generator.argumentNode === undefined
    ? undefined
    : requireSuccess(
      differentiateForCertificateProof(generator.argumentNode, variable),
      `Generator ${generator.id} argument derivative closure failed`,
      normalForm,
    );
  if (argumentDerivative && isClosureStop(argumentDerivative)) {
    return argumentDerivative;
  }

  const generatorDerivative = requireSuccess(
    differentiateForCertificateProof(generator.sourceNode, variable),
    `Generator ${generator.id} derivative closure failed`,
    normalForm,
  );
  if (isClosureStop(generatorDerivative)) {
    return generatorDerivative;
  }

  return {
    kind: 'generator-closure',
    generatorId: generator.id,
    head: generator.head,
    extensionKind: generator.extensionKind,
    dependsOnGeneratorIds: generator.derivativeRule.dependsOnGeneratorIds,
    argumentDerivative,
    generatorDerivative,
    generatorDerivativeLatex: certificateProofNodeLatex(generatorDerivative.derivativeNode),
  };
}

export function proveTranscendentalDerivationClosure(
  node: unknown,
  variable = 'x',
): TranscendentalDerivationClosureResult {
  const normalForm = buildTranscendentalTowerNormalForm(node, variable);
  if (normalForm.kind === 'stop') {
    return stop(
      normalForm.variable,
      normalForm.reason,
      normalForm.detail,
      undefined,
    );
  }

  const inputDerivative = requireSuccess(
    differentiateForCertificateProof(normalForm.normalizedInput, normalForm.variable),
    'Input derivative closure failed',
    normalForm,
  );
  if (isClosureStop(inputDerivative)) {
    return inputDerivative;
  }

  const generatorClosures: TranscendentalGeneratorClosure[] = [];
  for (const generator of normalForm.generators) {
    const closure = closeGenerator(generator, normalForm.variable, normalForm);
    if (closure.kind === 'stop') {
      return closure;
    }
    generatorClosures.push(closure);
  }

  return {
    kind: 'success',
    variable: normalForm.variable,
    normalForm,
    inputDerivative,
    inputDerivativeLatex: certificateProofNodeLatex(inputDerivative.derivativeNode),
    generatorClosures,
    proofSummary: 'Proof-local derivation closure succeeded without Compute Engine or numeric evidence.',
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
