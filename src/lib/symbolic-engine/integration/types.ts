import type { AntiderivativeBackcheck, AntiderivativeBackcheckStatus } from '../../calculus/engine/verification';
import type { CalculusIntegrationStrategy, DisplayDetailSection } from '../../../types/calculator';

export const BY_PARTS_POLYNOMIAL_DEGREE_CAP = 6;
export const LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP = 4;
export const RATIONAL_APPROX_MAX_DENOMINATOR = 24;

export type IntegralStrategy = CalculusIntegrationStrategy;
export type IntegrationCandidateMethod = IntegralStrategy | 'unsupported';
export type IntegrationCandidatePrerequisite =
  | 'derivative-backcheck'
  | 'domain-safety'
  | 'polynomial-core'
  | 'rational-function-core'
  | 'polynomial-division'
  | 'polynomial-gcd'
  | 'partial-fractions'
  | 'square-free-factorization'
  | 'resultants'
  | 'grobner-elimination'
  | 'branch-analysis'
  | 'compute-engine'
  | 'risch-liouville';
export type IntegrationCandidateFailureClass =
  | 'unsupported-family'
  | 'missing-derivative-factor'
  | 'blocked-polynomial-prerequisite'
  | 'not-verified'
  | 'not-symbolic';

export type IntegrationCandidateMetadata = {
  method: IntegrationCandidateMethod;
  requiredPrerequisites: IntegrationCandidatePrerequisite[];
  blockedPrerequisites: IntegrationCandidatePrerequisite[];
  verificationStatus: AntiderivativeBackcheckStatus | 'not-attempted';
  controlledFailureClass?: IntegrationCandidateFailureClass;
  readinessNotes: string[];
  domainHazards: string[];
};

export type IntegralResolution =
  | {
      kind: 'success';
      exactLatex: string;
      origin: 'rule-based-symbolic';
      strategy: IntegralStrategy;
      verification: AntiderivativeBackcheck;
      candidate: IntegrationCandidateMetadata;
      exactSupplementLatex?: string[];
      detailSections?: DisplayDetailSection[];
    }
  | {
      kind: 'error';
      error: string;
      candidate: IntegrationCandidateMetadata;
    };
