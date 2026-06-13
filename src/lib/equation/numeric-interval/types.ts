export const SAMPLE_ZERO_TOLERANCE = 1e-7;
export const BISECTION_TOLERANCE = 1e-10;
export const LOCAL_MIN_SEED_TOLERANCE = 0.15;
export const LOCAL_MIN_ACCEPT_TOLERANCE = 1e-6;
export const GOLDEN_SECTION_ITERATIONS = 48;
export const MIN_SUBDIVISIONS = 8;
export const NUMERIC_METHOD_LABEL = 'Bracket-first bisection + local-minimum recovery';
export const EPSILON = 1e-9;

export type SamplePoint = {
  x: number;
  value: number;
};

export type NumericDiagnostics = {
  sampleHitCount: number;
  signBracketCount: number;
  localMinSeedCount: number;
  recoveredCandidateCount: number;
};

export type DirectTrigEquationInfo = {
  kind: 'sin' | 'cos' | 'tan';
  innerNode: unknown;
  innerLatex: string;
  targetValue: number;
  targetLatex: string;
};

export type SampledImage = {
  min: number;
  max: number;
  sawUndefined: boolean;
};

export type AffineModel = {
  coefficient: number;
  offset: number;
};

export type NumericIntervalSolveResult =
  | {
      kind: 'success';
      roots: number[];
      rejectedCandidateCount: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
    }
  | {
      kind: 'error';
      error: string;
      rejectedCandidateCount?: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
    };

export const EMPTY_NUMERIC_DIAGNOSTICS: NumericDiagnostics = {
  sampleHitCount: 0,
  signBracketCount: 0,
  localMinSeedCount: 0,
  recoveredCandidateCount: 0,
};
