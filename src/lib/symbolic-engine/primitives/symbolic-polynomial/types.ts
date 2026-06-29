import type {
  SymbolicCoefficient,
  SymbolicCoefficientFact,
  SymbolicCoefficientStopReason,
} from '../coefficient-domain';

export const DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_DEGREE = 8;
export const DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_SYLVESTER_DIMENSION = 6;
export const DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_DETERMINANT_TERMS = 720;

export type SymbolicPolynomialStopReason =
  | 'coefficient-stop'
  | 'constant-polynomial'
  | 'determinant-cap'
  | 'division-iteration-cap'
  | 'division-nonzero-remainder'
  | 'expansion-limit'
  | 'over-cap-degree'
  | 'selected-variable-dependent-coefficient'
  | 'sylvester-dimension-limit'
  | 'unsupported-coefficient'
  | 'variable-mismatch'
  | 'zero-polynomial';

export type SymbolicPolynomialStop = {
  kind: 'stop';
  reason: SymbolicPolynomialStopReason;
  coefficientReason?: SymbolicCoefficientStopReason;
  detail?: string;
};

export type SymbolicPolynomial = {
  variable: string;
  degree: number;
  coefficients: SymbolicCoefficient[];
  facts: SymbolicCoefficientFact[];
};

export type SymbolicPolynomialParseResult =
  | { kind: 'success'; polynomial: SymbolicPolynomial }
  | SymbolicPolynomialStop;

export type SymbolicPolynomialOperationResult =
  | { kind: 'success'; polynomial: SymbolicPolynomial }
  | SymbolicPolynomialStop;

export type SymbolicPolynomialDivisionResult =
  | {
      kind: 'success';
      quotient: SymbolicPolynomial;
      remainder: SymbolicPolynomial;
      facts: SymbolicCoefficientFact[];
    }
  | SymbolicPolynomialStop;

export type SymbolicPolynomialGcdResult =
  | {
      kind: 'success';
      gcd: SymbolicPolynomial;
      facts: SymbolicCoefficientFact[];
    }
  | SymbolicPolynomialStop;

export type SymbolicSquarefreeReadinessResult =
  | {
      kind: 'success';
      squarefree: boolean;
      derivative: SymbolicPolynomial;
      repeatedFactor: SymbolicPolynomial | null;
      squarefreePart: SymbolicPolynomial;
      facts: SymbolicCoefficientFact[];
    }
  | SymbolicPolynomialStop;

export type SymbolicPolynomialOptions = {
  maxDegree?: number;
  maxSylvesterDimension?: number;
  maxDeterminantTerms?: number;
};

export type SymbolicSylvesterMatrixResult =
  | {
      kind: 'success';
      variable: string;
      leftDegree: number;
      rightDegree: number;
      matrix: SymbolicCoefficient[][];
    }
  | SymbolicPolynomialStop;

export type SymbolicResultantResult =
  | {
      kind: 'success';
      variable: string;
      leftDegree: number;
      rightDegree: number;
      sylvesterMatrix: SymbolicCoefficient[][];
      resultant: SymbolicCoefficient;
      facts: SymbolicCoefficientFact[];
    }
  | SymbolicPolynomialStop;
