export type ExactSupplementRelation = '\\ge0' | '>0' | '\\ne0' | '=0' | '<0';

export type ExactSupplementEntryKind =
  | 'condition'
  | 'exclusion'
  | 'branch-condition'
  | 'principal-range'
  | 'note';

export type ExactSupplementSource =
  | 'denominator'
  | 'radical-domain'
  | 'transform'
  | 'candidate-validation'
  | 'periodic-family'
  | 'legacy';

type ExactSupplementBase = {
  source: ExactSupplementSource;
};

export type ExactSupplementEntry =
  | (ExactSupplementBase & {
      kind: 'condition' | 'exclusion';
      expressionLatex: string;
      relation: ExactSupplementRelation;
    })
  | (ExactSupplementBase & {
      kind: 'branch-condition' | 'principal-range' | 'note';
      latex: string;
    });

export type CandidateRejectionKind =
  | 'denominator-exclusion'
  | 'domain-condition'
  | 'undefined-original'
  | 'residual-mismatch';
