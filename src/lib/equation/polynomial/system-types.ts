import type {
  BivariateResultantOptions,
  BivariateResultantStop,
} from '../../algebra/polynomial-bivariate-elimination';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../../types/calculator';

export type CandidateRoot = {
  latex: string;
  numeric: number;
  node: unknown;
};

export type CandidatePair = {
  x: CandidateRoot;
  y: CandidateRoot;
};

export type ZeroFormResult =
  | { kind: 'success'; zeroLatex: string; zeroNode: unknown }
  | { kind: 'stop'; reason: 'missing-equation' | 'parse-error' | 'unsupported-relation' };

export type ProjectionSolveResult =
  | { kind: 'success'; roots: CandidateRoot[] }
  | { kind: 'stop'; reason: 'projection-roots-unavailable' };

type ZeroFormStopReason = Extract<ZeroFormResult, { kind: 'stop' }>['reason'];

export type SolveStopReason =
  | ZeroFormStopReason
  | BivariateResultantStop['reason']
  | 'constant-resultant-no-solution'
  | 'missing-system-variable'
  | 'projection-roots-unavailable'
  | 'candidate-limit'
  | 'no-real-roots'
  | 'no-validated-pairs';

export type PolynomialSystem2x2Options = {
  storedVariables?: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  bivariateOptions?: Omit<BivariateResultantOptions, 'storedVariables'>;
  maxCandidatePairs?: number;
  validationTolerance?: number;
};
