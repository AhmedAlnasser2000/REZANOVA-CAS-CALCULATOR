import type * as C from './canonical-result-common';
import type { CanonicalEquationPrimary } from './canonical-result-equation';
import type { CanonicalResultSpecialFunctionPrimary } from './canonical-result-special';
import type {
  CanonicalExponentialPrimitivePrimary, CanonicalNonElementaryPrimary,
  CanonicalRationalPrimitivePrimary, CanonicalIntegrationRestriction,
} from './canonical-result-integration';

/** Producers select semantic kinds. The wire revision is selected only by the contract builder. */
export type CanonicalResultPrimary = C.CanonicalResultPrimary
  | { kind: 'angle-quantity'; magnitude: C.CanonicalMathValue; unit: 'deg' | 'rad' | 'grad';
      presentation: C.CanonicalResultCompoundPresentation }
  | CanonicalResultSpecialFunctionPrimary
  | CanonicalEquationPrimary
  | CanonicalRationalPrimitivePrimary
  | CanonicalExponentialPrimitivePrimary
  | CanonicalNonElementaryPrimary;

export interface CanonicalResultDocument {
  version: 7;
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  primary?: CanonicalResultPrimary;
  request?: C.CanonicalResultRequest;
  answerRows?: C.CanonicalResultAnswerRows;
  branchReadback?: C.CanonicalResultBranchReadback;
  systemReadback?: C.CanonicalResultSystemReadback;
  periodicFamily?: C.CanonicalResultPeriodicFamily;
  supplements?: C.CanonicalResultSupplement[];
  /** Also available on ordinary answers after exponential-family cancellation. */
  integrationRestrictions?: { variable: string; entries: CanonicalIntegrationRestriction[] };
  approximations?: { primary?: string };
  details?: C.CanonicalResultDetailSection[];
  summaries?: C.CanonicalResultSummaries;
  warnings: string[];
  metadata?: C.CanonicalResultSemanticMetadata;
  table?: C.CanonicalResultTable;
}

export type CanonicalResultDraft = Omit<CanonicalResultDocument, 'version'>;

/** Kind refinement for an owned consumer; it is not another document version. */
export type CanonicalAnswerDocument<K extends CanonicalResultPrimary['kind']> =
  Omit<CanonicalResultDocument, 'primary'> & { primary: Extract<CanonicalResultPrimary, { kind: K }> };

export type CanonicalEquationDocument = CanonicalAnswerDocument<'equation-outcome'>;
