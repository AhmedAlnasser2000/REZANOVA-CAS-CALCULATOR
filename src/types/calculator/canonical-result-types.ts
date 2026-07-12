import type {
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  ResultOrigin,
} from './execution-types';
import type { SerializableMathJson } from './math-payload-types';
import type {
  AnswerDomain,
  LegacyEquationAnswerMode,
  ModeId,
  SolutionKind,
} from './mode-types';
import type {
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
  TransformBadge,
} from './solver-types';

export type CanonicalMathValueV1 = {
  canonicalLatex: string;
  mathJson?: SerializableMathJson;
};

export type CanonicalResultDetailPartV1 =
  | { kind: 'text'; text: string }
  | { kind: 'math'; math: CanonicalMathValueV1 };

export type CanonicalResultDetailSectionV1 = {
  title: string;
  lines: CanonicalResultDetailPartV1[][];
};

export type CanonicalResultAnswerRowsV1 = {
  label?: string;
  rows: Array<{
    math: CanonicalMathValueV1;
    label?: string;
  }>;
};

export type CanonicalResultBranchReadbackV1 = {
  target: CanonicalMathValueV1;
  relation: '=' | '\\in' | '\\approx';
  branches: CanonicalMathValueV1[];
  countLabel?: 'roots' | 'candidateRoots';
  label?: string;
  source?: string;
};

export type CanonicalResultSystemReadbackV1 = {
  variables: CanonicalMathValueV1[];
  rows: Array<{
    values: CanonicalMathValueV1[];
    approxText?: string;
  }>;
  label?: string;
  source?: string;
};

export type CanonicalResultPeriodicFamilyV1 = {
  carrier: CanonicalMathValueV1;
  parameter: CanonicalMathValueV1;
  parameterConstraints?: CanonicalMathValueV1[];
  branches: CanonicalMathValueV1[];
  discoveredFamilies?: CanonicalMathValueV1[];
  representatives?: Array<{
    label: string;
    exact?: CanonicalMathValueV1;
    approxText?: string;
  }>;
  suggestedIntervals?: Array<{
    label: string;
    start: CanonicalMathValueV1;
    end: CanonicalMathValueV1;
  }>;
  piecewiseBranches?: Array<{
    condition: CanonicalMathValueV1;
    result: CanonicalMathValueV1;
  }>;
  principalRange?: CanonicalMathValueV1;
  reducedCarrier?: CanonicalMathValueV1;
  structuredStopReason?:
    | 'second-periodic-parameter'
    | 'outside-principal-range'
    | 'unsupported-sawtooth-closure'
    | 'multi-parameter-periodic-family'
    | 'periodic-depth-cap'
    | 'unmerged-periodic-branches';
};

export type CanonicalResultSummariesV1 = {
  solve?: CanonicalResultDetailPartV1[][];
  transform?: {
    text?: string;
    math?: CanonicalMathValueV1;
  };
};

export type CanonicalResultSemanticMetadataV1 = {
  answerMode?: LegacyEquationAnswerMode;
  answerDomain?: AnswerDomain;
  solutionKind?: SolutionKind;
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
  plannerBadges?: PlannerBadge[];
  solveBadges?: SolveBadge[];
  transformBadges?: TransformBadge[];
  resolvedInput?: CanonicalMathValueV1;
  candidateValues?: number[];
  rejectedCandidateCount?: number;
  substitutionDiagnostics?: SubstitutionSolveDiagnostics;
  numericMethod?: string;
  sourceMode?: ModeId;
  variableSubstitutions?: Array<{
    name: string;
    value: CanonicalMathValueV1;
    numericValue: number;
  }>;
};

export type CanonicalResultTableV1 = {
  headers: string[];
  rows: Array<{
    x: CanonicalMathValueV1;
    primary: CanonicalMathValueV1;
    secondary?: CanonicalMathValueV1;
  }>;
};

export type CanonicalResultDocumentV1 = {
  version: 1;
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  primaryMath?: CanonicalMathValueV1;
  answerRows?: CanonicalResultAnswerRowsV1;
  branchReadback?: CanonicalResultBranchReadbackV1;
  systemReadback?: CanonicalResultSystemReadbackV1;
  periodicFamily?: CanonicalResultPeriodicFamilyV1;
  supplements?: CanonicalMathValueV1[];
  approximations?: {
    primary?: string;
  };
  details?: CanonicalResultDetailSectionV1[];
  summaries?: CanonicalResultSummariesV1;
  warnings: string[];
  metadata?: CanonicalResultSemanticMetadataV1;
  table?: CanonicalResultTableV1;
};

export type CanonicalResultOmissionReason = 'unavailable' | 'invalid' | 'over-size';
