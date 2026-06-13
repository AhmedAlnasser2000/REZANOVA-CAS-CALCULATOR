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
