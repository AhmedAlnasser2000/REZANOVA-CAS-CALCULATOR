import {
  constructRischNormanLrtLogPart,
  type RischNormanLrtLogPartStopReason,
} from './risch-norman/lrt-log-part';
import { TRANSCENDENTAL_TOWER_FORMAL_CAPS } from './transcendental-tower-normal-form';

export type TranscendentalLrtLogPartLiftSuccess = {
  kind: 'success';
  variable: string;
  family: 'lrt-logarithmic-completion';
  antiderivativeNode: unknown;
  exactLatex: string;
  definitionsLatex: string[];
  resultantLatex: string;
  descriptorDegree: number;
  proofSteps: string[];
  capEvidence: {
    polynomialDegreeCap: number;
    algebraicDescriptorDegreeCap: number;
    casewiseBranchRowCap: number;
  };
  ownership: {
    method: 'integration-risch-norman-owned';
    sharedPrimitives: 'coefficient-domain-symbolic-polynomial-resultant-algebraic-root-descriptor';
  };
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLrtLogPartLiftStop = {
  kind: 'stop';
  variable: string;
  reason: RischNormanLrtLogPartStopReason;
  detail: string;
  primitiveReason?: string;
  capEvidence: TranscendentalLrtLogPartLiftSuccess['capEvidence'];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLrtLogPartLiftResult =
  | TranscendentalLrtLogPartLiftSuccess
  | TranscendentalLrtLogPartLiftStop;

export type TranscendentalLrtLogPartLiftInput = {
  numerator: unknown;
  denominator: unknown;
  variable?: string;
  lambdaVariable?: string;
};

function capEvidence(): TranscendentalLrtLogPartLiftSuccess['capEvidence'] {
  return {
    polynomialDegreeCap: TRANSCENDENTAL_TOWER_FORMAL_CAPS.targetFreeSymbolicDegree,
    algebraicDescriptorDegreeCap: TRANSCENDENTAL_TOWER_FORMAL_CAPS.resultantDescriptorDegree,
    casewiseBranchRowCap: TRANSCENDENTAL_TOWER_FORMAL_CAPS.casewiseBranchRows,
  };
}

function stopDetail(reason: RischNormanLrtLogPartStopReason) {
  switch (reason) {
    case 'symbolic-denominator-cap':
      return 'Symbolic denominator coefficients need algebraic coefficient reduction before LRT can safely complete the logarithmic part.';
    case 'non-squarefree-denominator':
      return 'The LRT logarithmic part expects a squarefree rational residual after Hermite reduction.';
    case 'improper-rational-residual':
      return 'The residual must be proper before LRT logarithmic completion.';
    case 'resultant-stop':
      return 'The bounded resultant or descriptor construction exceeded the formal LRT cap.';
    default:
      return 'The bounded LRT logarithmic-part lift did not accept this residual.';
  }
}

export function liftTranscendentalRationalLogPartLrt(
  input: TranscendentalLrtLogPartLiftInput,
): TranscendentalLrtLogPartLiftResult {
  const variable = input.variable ?? 'x';
  const caps = capEvidence();
  const lrt = constructRischNormanLrtLogPart({
    numerator: input.numerator,
    denominator: input.denominator,
    variable,
    lambdaVariable: input.lambdaVariable,
    maxPolynomialDegree: caps.polynomialDegreeCap,
    maxDescriptorDegree: caps.algebraicDescriptorDegreeCap,
  });

  if (lrt.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: lrt.reason,
      detail: stopDetail(lrt.reason),
      primitiveReason: lrt.primitiveReason,
      capEvidence: caps,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  return {
    kind: 'success',
    variable: lrt.variable,
    family: 'lrt-logarithmic-completion',
    antiderivativeNode: lrt.antiderivativeNode,
    exactLatex: lrt.exactLatex,
    definitionsLatex: lrt.definitionsLatex,
    resultantLatex: lrt.resultantLatex,
    descriptorDegree: lrt.rootDescriptor.degree,
    proofSteps: [
      lrt.proofEvidence.resultantDefinitionLatex,
      ...lrt.rootDescriptor.definitionLatex,
      ...lrt.proofEvidence.gcdDefinitionsLatex,
    ],
    capEvidence: caps,
    ownership: {
      method: 'integration-risch-norman-owned',
      sharedPrimitives: 'coefficient-domain-symbolic-polynomial-resultant-algebraic-root-descriptor',
    },
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
