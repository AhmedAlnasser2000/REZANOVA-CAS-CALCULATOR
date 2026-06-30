import type { DisplayDetailSection } from '../../../../types/calculator';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  certificateProofNodeLatex,
  differentiateForCertificateProof,
  type CertificateDifferentiationStop,
  type CertificateDifferentiationSuccess,
} from './proof-diff';
import {
  profileTranscendentalCertificateTower,
  type TranscendentalCertificateRequiredFact,
  type TranscendentalCertificateTowerElementaryOwned,
  type TranscendentalCertificateTowerProfile,
  type TranscendentalCertificateTowerReady,
  type TranscendentalCertificateTowerStop,
  type TranscendentalCertificateTowerStopReason,
} from './profile';

export type ExpQuadraticCertificateProofStopReason =
  | TranscendentalCertificateTowerStopReason
  | 'elementary-owned'
  | 'proof-differentiation-stop';

export type ExpQuadraticCertificateProof = {
  kind: 'proof-ready';
  family: 'exp-quadratic';
  variable: string;
  normalizedInput: unknown;
  exponentNode: unknown;
  exponentLatex: string;
  exponentDerivativeNode: unknown;
  exponentDerivativeLatex: string;
  integrandDerivativeNode: unknown;
  integrandDerivativeLatex: string;
  requiredFacts: TranscendentalCertificateRequiredFact[];
  exactSupplementLatex?: string[];
  fieldDescriptor: TranscendentalCertificateTowerReady['fieldDescriptor'];
  theorem: 'quadratic-exponential-liouville-obstruction';
  liouvilleEquationLatex: string;
  proofSummary: string;
  proofDetails: DisplayDetailSection[];
  profile: TranscendentalCertificateTowerReady;
  exponentDifferentiation: CertificateDifferentiationSuccess;
  integrandDifferentiation: CertificateDifferentiationSuccess;
};

export type ExpQuadraticCertificateProofStop = {
  kind: 'stop';
  variable: string;
  reason: ExpQuadraticCertificateProofStopReason;
  detail: string;
  profile: TranscendentalCertificateTowerProfile;
  differentiation?: CertificateDifferentiationStop;
};

export type ExpQuadraticCertificateProofResult =
  | ExpQuadraticCertificateProof
  | ExpQuadraticCertificateProofStop;

function factEntry(fact: TranscendentalCertificateRequiredFact): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
    source: 'candidate-validation',
  };
}

function supplementFacts(facts: TranscendentalCertificateRequiredFact[]) {
  const lines = mergeExactSupplementLatex({
    entries: facts.map(factEntry),
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function stopFromProfile(
  profile: TranscendentalCertificateTowerStop,
): ExpQuadraticCertificateProofStop {
  return {
    kind: 'stop',
    variable: profile.variable,
    reason: profile.reason,
    detail: profile.detail,
    profile,
  };
}

function stopFromElementary(
  profile: TranscendentalCertificateTowerElementaryOwned,
): ExpQuadraticCertificateProofStop {
  return {
    kind: 'stop',
    variable: profile.variable,
    reason: 'elementary-owned',
    detail: `The ${profile.exponentDegree === 0 ? 'constant' : 'affine'} exponential case is already owned by elementary integration routes.`,
    profile,
  };
}

function stopFromDifferentiation(
  profile: TranscendentalCertificateTowerReady,
  differentiation: CertificateDifferentiationStop,
  subject: 'integrand' | 'exponent',
): ExpQuadraticCertificateProofStop {
  return {
    kind: 'stop',
    variable: profile.variable,
    reason: 'proof-differentiation-stop',
    detail: `Certificate proof stopped while differentiating the ${subject}: ${differentiation.detail}`,
    profile,
    differentiation,
  };
}

function proofDetailsFor(
  profile: TranscendentalCertificateTowerReady,
  exponentDerivativeLatex: string,
  liouvilleEquationLatex: string,
): DisplayDetailSection[] {
  const rationalCertificateLine = [
    'If an elementary antiderivative existed inside this exponential field,',
    `it would require an auxiliary rational function r(${profile.variable}).`,
  ].join(' ');
  return [
    {
      title: 'Certificate Proof Evidence',
      lines: [
        `q(${profile.variable})=${profile.exponentLatex}`,
        String.raw`q'(${profile.variable})=${exponentDerivativeLatex}`,
        rationalCertificateLine,
        liouvilleEquationLatex,
      ],
      lineKinds: ['math', 'math', 'text', 'math'],
    },
    {
      title: 'Liouville Obstruction',
      lines: [
        'The displayed first-order equation is the proof obligation for that auxiliary rational certificate, not a condition on the original input.',
        'For a genuine quadratic exponent, finite-pole and polynomial-degree comparisons rule out such a rational r.',
      ],
    },
  ];
}

export function proveExpQuadraticNonElementary(
  node: unknown,
  variable = 'x',
): ExpQuadraticCertificateProofResult {
  const profile = profileTranscendentalCertificateTower(node, variable);
  if (profile.kind === 'stop') {
    return stopFromProfile(profile);
  }
  if (profile.kind === 'elementary-owned') {
    return stopFromElementary(profile);
  }

  const exponentDifferentiation = differentiateForCertificateProof(profile.exponentNode, variable);
  if (exponentDifferentiation.kind !== 'success') {
    return stopFromDifferentiation(profile, exponentDifferentiation, 'exponent');
  }

  const integrandDifferentiation = differentiateForCertificateProof(profile.normalizedInput, variable);
  if (integrandDifferentiation.kind !== 'success') {
    return stopFromDifferentiation(profile, integrandDifferentiation, 'integrand');
  }

  const exponentDerivativeLatex = certificateProofNodeLatex(exponentDifferentiation.derivativeNode);
  const integrandDerivativeLatex = certificateProofNodeLatex(integrandDifferentiation.derivativeNode);
  const liouvilleEquationLatex = String.raw`\text{Required equation for }r(${profile.variable}):\quad r'(${profile.variable}) + \left(${exponentDerivativeLatex}\right)r(${profile.variable}) = 1`;

  return {
    kind: 'proof-ready',
    family: 'exp-quadratic',
    variable: profile.variable,
    normalizedInput: profile.normalizedInput,
    exponentNode: profile.exponentNode,
    exponentLatex: profile.exponentLatex,
    exponentDerivativeNode: exponentDifferentiation.derivativeNode,
    exponentDerivativeLatex,
    integrandDerivativeNode: integrandDifferentiation.derivativeNode,
    integrandDerivativeLatex,
    requiredFacts: profile.requiredFacts,
    exactSupplementLatex: supplementFacts(profile.requiredFacts),
    fieldDescriptor: profile.fieldDescriptor,
    theorem: 'quadratic-exponential-liouville-obstruction',
    liouvilleEquationLatex,
    proofSummary: 'Quadratic exponential non-elementarity follows from the Liouville rational-certificate obstruction for q of degree 2.',
    proofDetails: proofDetailsFor(profile, exponentDerivativeLatex, liouvilleEquationLatex),
    profile,
    exponentDifferentiation,
    integrandDifferentiation,
  };
}
