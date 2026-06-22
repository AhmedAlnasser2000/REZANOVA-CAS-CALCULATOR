export type InternalSolvedRoot = {
  node: unknown;
  latex: string;
  numeric: number;
};

export type PolynomialCarrierSolvedRoot = {
  latex: string;
  numeric: number;
};

export type PolynomialCarrierSolveAttempt =
  | { kind: 'none' }
  | { kind: 'recognized' }
  | { kind: 'empty' }
  | {
      kind: 'solved';
      roots: PolynomialCarrierSolvedRoot[];
      exactSupplementLatex?: string[];
    };

export type PolynomialCarrierComplexBranch = {
  exactLatex: string;
  approxValue?: {
    re: number;
    im: number;
  };
};

export type PolynomialCarrierComplexSolveAttempt =
  | { kind: 'none' }
  | { kind: 'recognized' }
  | { kind: 'empty' }
  | {
      kind: 'solved';
      branches: PolynomialCarrierComplexBranch[];
      exactSupplementLatex?: string[];
    };
