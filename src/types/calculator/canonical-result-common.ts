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

export type CanonicalMathValue = {
  canonicalLatex: string;
  mathJson: SerializableMathJson;
};

export type CanonicalResultPresentationAnswerRows = {
  label?: string;
  rows: Array<{
    latex: string;
    label?: string;
  }>;
};

export type CanonicalResultCompoundPresentation = {
  primaryLatex: string;
  answerRows?: CanonicalResultPresentationAnswerRows;
};

export type CanonicalResultPrimary =
  | {
      kind: 'math';
      value: CanonicalMathValue;
    }
  | {
      kind: 'period-phase';
      presentation: CanonicalResultCompoundPresentation;
      normalizedEquation: CanonicalMathValue;
      period: CanonicalMathValue;
      phaseShift: CanonicalMathValue;
    }
  | {
      kind: 'linear-map-profile';
      presentation: CanonicalResultCompoundPresentation;
      operand: CanonicalMathValue;
      domainDimension: number;
      codomainDimension: number;
      rank: number;
      nullity: number;
    }
  | {
      kind: 'linear-independence';
      presentation: CanonicalResultCompoundPresentation;
      operandVectors: CanonicalMathValue[];
      independent: boolean;
    };

export type CanonicalResultRequest =
  | {
      kind: 'math';
      value: CanonicalMathValue;
    }
  | {
      kind: 'derivative-at-point';
      presentationLatex: string;
      body: CanonicalMathValue;
      appliedVariablePath: CanonicalMathValue[];
      point: CanonicalMathValue;
    }
  | {
      kind: 'angle-conversion';
      presentationLatex: string;
      value: CanonicalMathValue;
      fromUnit: 'deg' | 'rad' | 'grad';
      toUnit: 'deg' | 'rad' | 'grad';
    }
  | {
      kind: 'right-triangle';
      presentationLatex: string;
      angleUnit: 'deg' | 'rad' | 'grad';
      knownQuantities: Array<
        | { kind: 'side'; name: 'a' | 'b' | 'c'; value: CanonicalMathValue }
        | { kind: 'angle'; name: 'A' | 'B'; value: CanonicalMathValue }
      >;
    };

export type CanonicalResultSupplement = {
  role: 'general' | 'exclusion' | 'condition' | 'parameter-constraint';
  presentationLatex: string;
  math: CanonicalMathValue;
};

export type CanonicalResultRowOperation =
  | { kind: 'swap'; firstRow: number; secondRow: number }
  | { kind: 'scale'; row: number; factor: CanonicalMathValue }
  | {
      kind: 'eliminate';
      targetRow: number;
      sourceRow: number;
      factor: CanonicalMathValue;
    };

export type CanonicalResultDetailPart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; math: CanonicalMathValue }
  | { kind: 'special-function'; expression: import('./canonical-result-special').CanonicalSpecialFunctionExpression }
  | {
      kind: 'row-operation';
      presentationLatex: string;
      operation: CanonicalResultRowOperation;
    };

export type CanonicalResultDetailSection = {
  title: string;
  lines: CanonicalResultDetailPart[][];
};

export type CanonicalResultAnswerRows = {
  label?: string;
  rows: Array<{
    math: CanonicalMathValue;
    label?: string;
  }>;
};

export type CanonicalResultBranchReadback = {
  target: CanonicalMathValue;
  relation: '=' | '\\in' | '\\approx';
  branches: CanonicalMathValue[];
  countLabel?: 'roots' | 'candidateRoots';
  label?: string;
  source?: string;
};

export type CanonicalResultSystemReadback = {
  variables: CanonicalMathValue[];
  rows: Array<{
    values: CanonicalMathValue[];
    approxText?: string;
  }>;
  label?: string;
  source?: string;
};

export type CanonicalResultPeriodicFamily = {
  carrier: CanonicalMathValue;
  parameter: CanonicalMathValue;
  parameterConstraints?: CanonicalMathValue[];
  branches: CanonicalMathValue[];
  discoveredFamilies?: CanonicalMathValue[];
  representatives?: Array<{
    label: string;
    exact?: CanonicalMathValue;
    approxText?: string;
  }>;
  suggestedIntervals?: Array<{
    label: string;
    start: CanonicalMathValue;
    end: CanonicalMathValue;
  }>;
  piecewiseBranches?: Array<{
    condition: CanonicalMathValue;
    result: CanonicalMathValue;
  }>;
  principalRange?: CanonicalMathValue;
  reducedCarrier?: CanonicalMathValue;
  structuredStopReason?:
    | 'second-periodic-parameter'
    | 'outside-principal-range'
    | 'unsupported-sawtooth-closure'
    | 'multi-parameter-periodic-family'
    | 'periodic-depth-cap'
    | 'unmerged-periodic-branches';
};

export type CanonicalResultSummaries = {
  solve?: CanonicalResultDetailPart[][];
  transform?: {
    text?: string;
    math?: CanonicalMathValue;
  };
};

export type CanonicalResultTableCell =
  | { kind: 'value'; value: CanonicalMathValue }
  | {
      kind: 'undefined';
      reason: 'outside-real-domain' | 'pole';
      presentationLatex: string;
    };

export type CanonicalResultTable = {
  headers: string[];
  rows: Array<{
    x: CanonicalMathValue;
    primary: CanonicalResultTableCell;
    secondary?: CanonicalResultTableCell;
  }>;
};

export type CanonicalResultTrustClassification =
  | 'certified-polynomial-roots'
  | 'local-numeric-roots'
  | 'bounded-search-approximate-roots'
  | 'global-complex-polynomial-roots'
  | 'global-complex-rational-roots'
  | 'region-local-complex-roots';

export type CanonicalResultTrustEvidence = {
  classification: CanonicalResultTrustClassification;
  text: string;
  interval?: {
    start: string;
    end: string;
  };
};

export type CanonicalResultSemanticMetadata = {
  answerMode?: LegacyEquationAnswerMode;
  answerDomain?: AnswerDomain;
  solutionKind?: SolutionKind;
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
  plannerBadges?: PlannerBadge[];
  solveBadges?: SolveBadge[];
  transformBadges?: TransformBadge[];
  resolvedInput?: CanonicalMathValue;
  candidateValues?: number[];
  rejectedCandidateCount?: number;
  substitutionDiagnostics?: SubstitutionSolveDiagnostics;
  numericMethod?: string;
  trustEvidence?: CanonicalResultTrustEvidence[];
  sourceMode?: ModeId;
  variableSubstitutions?: Array<{
    name: string;
    value: CanonicalMathValue;
    numericValue: number;
  }>;
};
