import {
  solveTranscendentalLiouvilleCandidate,
  type TranscendentalLiouvilleSolverResult,
} from '../transcendental-liouville-solver';
import { proveExpQuadraticNonElementary } from './proof';
import {
  buildTranscendentalNonElementaryCertificateFromProof,
  type TranscendentalNonElementaryCertificate,
} from './result-shape';

export type TranscendentalCertificateOrchestratorSuccess = {
  kind: 'success';
  variable: string;
  outcome: 'named-special-function-answer' | 'non-elementary-certificate';
  certificate: TranscendentalNonElementaryCertificate;
  proofRecord: TranscendentalLiouvilleSolverResult;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalCertificateOrchestratorElementary = {
  kind: 'elementary-solve';
  variable: string;
  outcome: 'elementary-owned-by-existing-routes';
  sourceFamily: string;
  proofRecord: Extract<TranscendentalLiouvilleSolverResult, { kind: 'success' }>;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalCertificateOrchestratorStop = {
  kind: 'stop';
  variable: string;
  outcome: 'controlled-unsupported-stop';
  reason: Extract<TranscendentalLiouvilleSolverResult, { kind: 'stop' }>['reason'];
  detail: string;
  proofRecord: Extract<TranscendentalLiouvilleSolverResult, { kind: 'stop' }>;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalCertificateOrchestratorResult =
  | TranscendentalCertificateOrchestratorSuccess
  | TranscendentalCertificateOrchestratorElementary
  | TranscendentalCertificateOrchestratorStop;

function fallbackNonElementaryCertificate(node: unknown, variable: string) {
  const proof = proveExpQuadraticNonElementary(node, variable);
  return proof.kind === 'proof-ready'
    ? buildTranscendentalNonElementaryCertificateFromProof(proof)
    : undefined;
}

export function orchestrateTranscendentalCertificateCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalCertificateOrchestratorResult {
  const proofRecord = solveTranscendentalLiouvilleCandidate(node, variable);

  if (proofRecord.kind === 'stop') {
    return {
      kind: 'stop',
      variable: proofRecord.variable,
      outcome: 'controlled-unsupported-stop',
      reason: proofRecord.reason,
      detail: proofRecord.detail,
      proofRecord,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const certificate =
    proofRecord.certificate
    ?? (
      proofRecord.sourceFamily === 'exp-quadratic-certificate'
        ? fallbackNonElementaryCertificate(node, proofRecord.variable)
        : undefined
    );

  if (certificate) {
    return {
      kind: 'success',
      variable: proofRecord.variable,
      outcome: certificate.antiderivativeKind === 'special-function'
        ? 'named-special-function-answer'
        : 'non-elementary-certificate',
      certificate,
      proofRecord,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  return {
    kind: 'elementary-solve',
    variable: proofRecord.variable,
    outcome: 'elementary-owned-by-existing-routes',
    sourceFamily: proofRecord.sourceFamily,
    proofRecord,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
