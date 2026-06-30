import type { TranscendentalNonElementaryCertificate } from '../../symbolic-engine/integration/transcendental-certificate/result-shape';
import type { CalculusCoreEvaluation } from './shared';

export function transcendentalCertificateToCalculusEvaluation(
  certificate: TranscendentalNonElementaryCertificate,
): CalculusCoreEvaluation {
  return {
    exactLatex: certificate.exactLatex,
    exactSupplementLatex: certificate.exactSupplementLatex,
    warnings: [],
    resultOrigin: 'rule-based-symbolic',
    detailSections: certificate.detailSections,
  };
}
