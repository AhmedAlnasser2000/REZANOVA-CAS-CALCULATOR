import type { SerializableMathJson } from './math-payload-types';
import type { CanonicalResultSemanticMetadataV1 } from './canonical-result-types';

export type CanonicalMathValueV2 = {
  canonicalLatex: string;
  mathJson: SerializableMathJson;
};

export type CanonicalResultPresentationAnswerRowsV2 = {
  label?: string;
  rows: Array<{
    latex: string;
    label?: string;
  }>;
};

export type CanonicalResultCompoundPresentationV2 = {
  primaryLatex: string;
  answerRows?: CanonicalResultPresentationAnswerRowsV2;
};

export type CanonicalResultPrimaryV2 =
  | {
      kind: 'math';
      value: CanonicalMathValueV2;
    }
  | {
      kind: 'period-phase';
      presentation: CanonicalResultCompoundPresentationV2;
      normalizedEquation: CanonicalMathValueV2;
      period: CanonicalMathValueV2;
      phaseShift: CanonicalMathValueV2;
    }
  | {
      kind: 'linear-map-profile';
      presentation: CanonicalResultCompoundPresentationV2;
      operand: CanonicalMathValueV2;
      domainDimension: number;
      codomainDimension: number;
      rank: number;
      nullity: number;
    }
  | {
      kind: 'linear-independence';
      presentation: CanonicalResultCompoundPresentationV2;
      operandVectors: CanonicalMathValueV2[];
      independent: boolean;
    };

export type CanonicalResultRequestV2 =
  | {
      kind: 'math';
      value: CanonicalMathValueV2;
    }
  | {
      kind: 'derivative-at-point';
      presentationLatex: string;
      body: CanonicalMathValueV2;
      appliedVariablePath: CanonicalMathValueV2[];
      point: CanonicalMathValueV2;
    }
  | {
      kind: 'angle-conversion';
      presentationLatex: string;
      value: CanonicalMathValueV2;
      fromUnit: 'deg' | 'rad' | 'grad';
      toUnit: 'deg' | 'rad' | 'grad';
    }
  | {
      kind: 'right-triangle';
      presentationLatex: string;
      angleUnit: 'deg' | 'rad' | 'grad';
      knownQuantities: Array<
        | { kind: 'side'; name: 'a' | 'b' | 'c'; value: CanonicalMathValueV2 }
        | { kind: 'angle'; name: 'A' | 'B'; value: CanonicalMathValueV2 }
      >;
    };

export type CanonicalResultSupplementV2 = {
  role: 'general' | 'exclusion' | 'condition' | 'parameter-constraint';
  presentationLatex: string;
  math: CanonicalMathValueV2;
};

export type CanonicalResultRowOperationV2 =
  | { kind: 'swap'; firstRow: number; secondRow: number }
  | { kind: 'scale'; row: number; factor: CanonicalMathValueV2 }
  | {
      kind: 'eliminate';
      targetRow: number;
      sourceRow: number;
      factor: CanonicalMathValueV2;
    };

export type CanonicalResultDetailPartV2 =
  | { kind: 'text'; text: string }
  | { kind: 'math'; math: CanonicalMathValueV2 }
  | {
      kind: 'row-operation';
      presentationLatex: string;
      operation: CanonicalResultRowOperationV2;
    };

export type CanonicalResultDetailSectionV2 = {
  title: string;
  lines: CanonicalResultDetailPartV2[][];
};

export type CanonicalResultAnswerRowsV2 = {
  label?: string;
  rows: Array<{
    math: CanonicalMathValueV2;
    label?: string;
  }>;
};

export type CanonicalResultBranchReadbackV2 = {
  target: CanonicalMathValueV2;
  relation: '=' | '\\in' | '\\approx';
  branches: CanonicalMathValueV2[];
  countLabel?: 'roots' | 'candidateRoots';
  label?: string;
  source?: string;
};

export type CanonicalResultSystemReadbackV2 = {
  variables: CanonicalMathValueV2[];
  rows: Array<{
    values: CanonicalMathValueV2[];
    approxText?: string;
  }>;
  label?: string;
  source?: string;
};

export type CanonicalResultPeriodicFamilyV2 = {
  carrier: CanonicalMathValueV2;
  parameter: CanonicalMathValueV2;
  parameterConstraints?: CanonicalMathValueV2[];
  branches: CanonicalMathValueV2[];
  discoveredFamilies?: CanonicalMathValueV2[];
  representatives?: Array<{
    label: string;
    exact?: CanonicalMathValueV2;
    approxText?: string;
  }>;
  suggestedIntervals?: Array<{
    label: string;
    start: CanonicalMathValueV2;
    end: CanonicalMathValueV2;
  }>;
  piecewiseBranches?: Array<{
    condition: CanonicalMathValueV2;
    result: CanonicalMathValueV2;
  }>;
  principalRange?: CanonicalMathValueV2;
  reducedCarrier?: CanonicalMathValueV2;
  structuredStopReason?:
    | 'second-periodic-parameter'
    | 'outside-principal-range'
    | 'unsupported-sawtooth-closure'
    | 'multi-parameter-periodic-family'
    | 'periodic-depth-cap'
    | 'unmerged-periodic-branches';
};

export type CanonicalResultSummariesV2 = {
  solve?: CanonicalResultDetailPartV2[][];
  transform?: {
    text?: string;
    math?: CanonicalMathValueV2;
  };
};

export type CanonicalResultSemanticMetadataV2 = Omit<
  CanonicalResultSemanticMetadataV1,
  'resolvedInput' | 'variableSubstitutions'
> & {
  resolvedInput?: CanonicalMathValueV2;
  variableSubstitutions?: Array<{
    name: string;
    value: CanonicalMathValueV2;
    numericValue: number;
  }>;
};

export type CanonicalResultTableCellV2 =
  | { kind: 'value'; value: CanonicalMathValueV2 }
  | {
      kind: 'undefined';
      reason: 'outside-real-domain' | 'pole';
      presentationLatex: string;
    };

export type CanonicalResultTableV2 = {
  headers: string[];
  rows: Array<{
    x: CanonicalMathValueV2;
    primary: CanonicalResultTableCellV2;
    secondary?: CanonicalResultTableCellV2;
  }>;
};

export type CanonicalResultDocumentV2 = {
  version: 2;
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  primary?: CanonicalResultPrimaryV2;
  request?: CanonicalResultRequestV2;
  answerRows?: CanonicalResultAnswerRowsV2;
  branchReadback?: CanonicalResultBranchReadbackV2;
  systemReadback?: CanonicalResultSystemReadbackV2;
  periodicFamily?: CanonicalResultPeriodicFamilyV2;
  supplements?: CanonicalResultSupplementV2[];
  approximations?: {
    primary?: string;
  };
  details?: CanonicalResultDetailSectionV2[];
  summaries?: CanonicalResultSummariesV2;
  warnings: string[];
  metadata?: CanonicalResultSemanticMetadataV2;
  table?: CanonicalResultTableV2;
};
