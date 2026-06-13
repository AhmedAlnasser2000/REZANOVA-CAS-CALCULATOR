import type {
  RangeProofReason,
  RealRangeInterval,
  SolveDomainConstraint,
} from '../../../types/calculator';

export type RealRangeProof =
  | {
      kind: 'exact';
      interval: RealRangeInterval;
      reason: RangeProofReason;
      expressionLatex: string;
    }
  | { kind: 'unknown' };

export type DomainConstraintViolation = {
  constraint: SolveDomainConstraint;
  message: string;
};

export type OneSidedDomainCheck =
  | { kind: 'safe'; constraints: SolveDomainConstraint[] }
  | { kind: 'outside-domain'; constraints: SolveDomainConstraint[]; violation: DomainConstraintViolation }
  | { kind: 'unknown'; constraints: SolveDomainConstraint[] };

export type IntervalDomainCheck =
  | { kind: 'safe'; constraints: SolveDomainConstraint[] }
  | { kind: 'unsafe'; constraints: SolveDomainConstraint[]; value: number; violation: DomainConstraintViolation }
  | { kind: 'unknown'; constraints: SolveDomainConstraint[] };

export type LatexEvaluator = (expressionLatex: string, value: number) => number | null;
