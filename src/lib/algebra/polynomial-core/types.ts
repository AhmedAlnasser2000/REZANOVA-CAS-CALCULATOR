export type ExactScalar = {
  numerator: number;
  denominator: number;
};

export type ExactPolynomial = {
  variable: string;
  terms: Map<number, ExactScalar>;
};

export type ExactPolynomialDivisionResult = {
  quotient: ExactPolynomial;
  remainder: ExactPolynomial;
};

