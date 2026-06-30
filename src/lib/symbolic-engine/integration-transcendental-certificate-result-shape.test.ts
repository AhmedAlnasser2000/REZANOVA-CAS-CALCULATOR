import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { transcendentalCertificateToCalculusEvaluation } from '../calculus/engine/transcendental-certificate';
import { profileTranscendentalCertificateTower } from './integration/transcendental-certificate/profile';
import { buildTranscendentalNonElementaryCertificate } from './integration/transcendental-certificate/result-shape';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileTranscendentalCertificateTower(ce.parse(latex).json, variable);
}

describe('transcendental Risch certificate result shape', () => {
  it('builds an internal non-elementary certificate from a ready quadratic tower profile', () => {
    const certificate = buildTranscendentalNonElementaryCertificate(
      profile('e^{a*x^2+b*x+c}'),
    );

    expect(certificate).toBeDefined();
    if (!certificate) {
      throw new Error('expected non-elementary certificate');
    }
    expect(certificate.kind).toBe('non-elementary-certificate');
    expect(certificate.family).toBe('exp-quadratic');
    expect(certificate.exactLatex).toContain('No elementary antiderivative');
    expect(certificate.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(certificate.detailSections.map((section) => section.title)).toEqual([
      'Non-Elementary Certificate',
      'Proof Scope',
    ]);
    expect(certificate.detailSections[1].lines[0]).toContain('e^{');
  });

  it('does not build certificates for elementary-owned affine exponentials', () => {
    expect(buildTranscendentalNonElementaryCertificate(profile('e^{a*x+b}'))).toBeUndefined();
  });

  it('maps certificates to existing Calculus evaluation fields without antiderivative metadata', () => {
    const certificate = buildTranscendentalNonElementaryCertificate(profile('e^{x^2}'));
    if (!certificate) {
      throw new Error('expected non-elementary certificate');
    }

    const evaluation = transcendentalCertificateToCalculusEvaluation(certificate);

    expect(evaluation.error).toBeUndefined();
    expect(evaluation.exactLatex).toContain('No elementary antiderivative');
    expect(evaluation.resultOrigin).toBe('rule-based-symbolic');
    expect(evaluation.integrationStrategy).toBeUndefined();
    expect(evaluation.integrationCandidate).toBeUndefined();
    expect(evaluation.antiderivativeBackcheck).toBeUndefined();
    expect(evaluation.detailSections?.[0].title).toBe('Non-Elementary Certificate');
  });
});
