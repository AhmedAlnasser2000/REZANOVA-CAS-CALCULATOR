import {
  buildDepth2ExpCompositionSpecialFunctionCertificate,
  buildEiLiAffineSpecialFunctionCertificate,
  buildExpQuadraticSpecialFunctionCertificateFromProof,
  buildFresnelQuadraticSpecialFunctionCertificate,
  buildSiCiAffineQuotientSpecialFunctionCertificate,
} from './transcendental-certificate/special-functions';
import { proveExpQuadraticNonElementary } from './transcendental-certificate/proof';
import { buildQuotientPowerSpecialFunctionCertificate } from './transcendental-certificate/quotient-powers';
import type { TranscendentalNonElementaryCertificate } from './transcendental-certificate/result-shape';
import {
  decomposeTranscendentalLiouvilleCandidate,
  type TranscendentalLiouvilleDecomposition,
  type TranscendentalLiouvilleStop,
} from './transcendental-liouville';

export type TranscendentalLiouvilleSolverFamily =
  | 'rational-part'
  | 'logarithmic-residual'
  | 'rde-obligation'
  | 'named-special-function-proof';

export type TranscendentalLiouvilleSolverSuccess = {
  kind: 'success';
  variable: string;
  family: TranscendentalLiouvilleSolverFamily;
  sourceFamily: string;
  decomposition?: TranscendentalLiouvilleDecomposition;
  certificate?: TranscendentalNonElementaryCertificate;
  exactSupplementLatex?: string[];
  proofSummary: string;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLiouvilleSolverStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalLiouvilleStop['reason'] | 'no-supported-liouville-solver-outcome';
  detail: string;
  decompositionStop?: TranscendentalLiouvilleStop;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLiouvilleSolverResult =
  | TranscendentalLiouvilleSolverSuccess
  | TranscendentalLiouvilleSolverStop;

function stop(
  variable: string,
  reason: TranscendentalLiouvilleSolverStop['reason'],
  detail: string,
  decompositionStop?: TranscendentalLiouvilleStop,
): TranscendentalLiouvilleSolverStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    decompositionStop,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function namedSpecialFunctionCertificate(node: unknown, variable: string) {
  const expProof = proveExpQuadraticNonElementary(node, variable);
  if (expProof.kind === 'proof-ready') {
    const certificate = buildExpQuadraticSpecialFunctionCertificateFromProof(expProof);
    if (certificate) {
      return certificate;
    }
  }

  return buildSiCiAffineQuotientSpecialFunctionCertificate(node, variable)
    ?? buildEiLiAffineSpecialFunctionCertificate(node, variable)
    ?? buildDepth2ExpCompositionSpecialFunctionCertificate(node, variable)
    ?? buildFresnelQuadraticSpecialFunctionCertificate(node, variable)
    ?? buildQuotientPowerSpecialFunctionCertificate(node, variable);
}

function specialFunctionSuccess(
  variable: string,
  certificate: TranscendentalNonElementaryCertificate,
  decomposition?: TranscendentalLiouvilleDecomposition,
): TranscendentalLiouvilleSolverSuccess {
  return {
    kind: 'success',
    variable,
    family: 'named-special-function-proof',
    sourceFamily: certificate.family,
    decomposition,
    certificate,
    exactSupplementLatex: certificate.exactSupplementLatex,
    proofSummary: certificate.proofSummary,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function fromDecomposition(
  decomposition: TranscendentalLiouvilleDecomposition,
  node: unknown,
): TranscendentalLiouvilleSolverSuccess {
  const certificate = namedSpecialFunctionCertificate(node, decomposition.variable);
  if (certificate) {
    return specialFunctionSuccess(decomposition.variable, certificate, decomposition);
  }

  if (decomposition.family === 'exp-quadratic-certificate') {
    return {
      kind: 'success',
      variable: decomposition.variable,
      family: 'rde-obligation',
      sourceFamily: decomposition.family,
      decomposition,
      exactSupplementLatex: decomposition.exactSupplementLatex,
      proofSummary: decomposition.proofSummary,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  if (decomposition.family === 'rational-hermite-correction') {
    return {
      kind: 'success',
      variable: decomposition.variable,
      family: 'rational-part',
      sourceFamily: decomposition.family,
      decomposition,
      exactSupplementLatex: decomposition.exactSupplementLatex,
      proofSummary: decomposition.proofSummary,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  return {
    kind: 'success',
    variable: decomposition.variable,
    family: 'logarithmic-residual',
    sourceFamily: decomposition.family,
    decomposition,
    exactSupplementLatex: decomposition.exactSupplementLatex,
    proofSummary: decomposition.proofSummary,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

export function solveTranscendentalLiouvilleCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalLiouvilleSolverResult {
  const decomposition = decomposeTranscendentalLiouvilleCandidate(node, variable);
  if (decomposition.kind === 'success') {
    return fromDecomposition(decomposition, node);
  }

  const certificate = namedSpecialFunctionCertificate(node, decomposition.variable);
  if (certificate) {
    return specialFunctionSuccess(decomposition.variable, certificate);
  }

  return stop(
    decomposition.variable,
    decomposition.reason,
    decomposition.detail,
    decomposition,
  );
}
