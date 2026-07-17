import type { DisplayDetailSection } from '../../../../types/calculator';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import type { CalculusAntiderivativeExpression } from '../../../calculus/engine/antiderivative-expression';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type {
  ExpQuadraticCertificateProof,
} from './proof';
import type {
  TranscendentalCertificateTowerProfile,
  TranscendentalCertificateTowerReady,
} from './profile';
import { certificateUxDetailSections } from './certificate-ux';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

export type TranscendentalNonElementaryCertificate = {
  kind: 'non-elementary-certificate';
  family:
    | 'exp-quadratic'
    | 'depth2-affine-quotient'
    | 'depth2-exp-composition'
    | 'fresnel-quadratic';
  variable: string;
  exactLatex: string;
  antiderivativeExpression?: CalculusAntiderivativeExpression;
  antiderivativeKind?: 'special-function';
  fieldLatex: string;
  theorem:
    | 'quadratic-exponential-transcendental-risch'
    | 'depth2-affine-quotient-transcendental-risch'
    | 'depth2-exp-composition-transcendental-risch'
    | 'fresnel-quadratic-transcendental-risch';
  proofSummary: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

const CERTIFICATE_MESSAGE_LATEX = String.raw`\text{No elementary antiderivative in the stated field.}`;

function factEntry(fact: TranscendentalCertificateTowerReady['requiredFacts'][number]): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
    source: 'candidate-validation',
  };
}

function certificateFacts(profile: TranscendentalCertificateTowerReady) {
  const lines = mergeExactSupplementLatex({
    entries: profile.requiredFacts.map(factEntry),
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function fieldLatex(profile: TranscendentalCertificateTowerReady) {
  return String.raw`K\left(${profile.variable}, e^{${profile.exponentLatex}}\right)`;
}

function detailSectionsFor(profile: TranscendentalCertificateTowerReady): DisplayDetailSection[] {
  const field = fieldLatex(profile);
  return [
    {
      title: 'Non-Elementary Certificate',
      lineKind: 'text',
      lines: [
        'No elementary antiderivative exists for this integrand in the stated elementary differential field.',
        'This is certificate evidence, not a failed heuristic integration search.',
      ],
    },
    {
      title: 'Proof Scope',
      lineKinds: ['math', 'text', 'text'],
      lines: [
        field,
        'Family: exponential of a quadratic polynomial in the selected variable.',
        'Special-function readback such as erf/erfi is intentionally deferred.',
      ],
    },
    ...certificateUxDetailSections({
      inputFacts: profile.requiredFacts,
      branchFacts: [],
    }),
  ];
}

export function buildTranscendentalNonElementaryCertificate(
  profile: TranscendentalCertificateTowerProfile,
): TranscendentalNonElementaryCertificate | undefined {
  if (profile.kind !== 'certificate-ready' || profile.certificateFamily !== 'exp-quadratic') {
    return undefined;
  }

  return profileSymbolicIntegrationResult({
    kind: 'non-elementary-certificate',
    family: 'exp-quadratic',
    variable: profile.variable,
    exactLatex: CERTIFICATE_MESSAGE_LATEX,
    fieldLatex: fieldLatex(profile),
    theorem: 'quadratic-exponential-transcendental-risch',
    proofSummary: 'Quadratic exponential non-elementarity certificate prepared for the stated coefficient field.',
    exactSupplementLatex: certificateFacts(profile),
    detailSections: detailSectionsFor(profile),
  });
}

export function buildTranscendentalNonElementaryCertificateFromProof(
  proof: ExpQuadraticCertificateProof,
): TranscendentalNonElementaryCertificate | undefined {
  const certificate = buildTranscendentalNonElementaryCertificate(proof.profile);
  if (!certificate) {
    return undefined;
  }

  return {
    ...certificate,
    proofSummary: proof.proofSummary,
    exactSupplementLatex: proof.exactSupplementLatex ?? certificate.exactSupplementLatex,
    detailSections: [...certificate.detailSections, ...proof.proofDetails],
  };
}
