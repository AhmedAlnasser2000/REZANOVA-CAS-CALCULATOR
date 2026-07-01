import type { CertificateUxFact } from './transcendental-certificate/certificate-ux';
import { TRANSCENDENTAL_TOWER_FORMAL_CAPS } from './transcendental-tower-normal-form';

export type TranscendentalDegeneracyConditionKind =
  | 'discriminant-sign'
  | 'parameter'
  | 'pivot'
  | 'repeated-resultant'
  | 'slope';

export type TranscendentalDegeneracyCondition = {
  kind: TranscendentalDegeneracyConditionKind;
  expressionLatex: string;
  label?: string;
};

export type TranscendentalDegeneracyBranchFact = CertificateUxFact & {
  source: TranscendentalDegeneracyConditionKind;
  label: string;
};

export type TranscendentalDegeneracyBranchRow = {
  index: number;
  branchKind: 'degenerate' | 'generic';
  conditionLatex: string;
  facts: TranscendentalDegeneracyBranchFact[];
  proofScope: string;
};

export type TranscendentalDegeneracyBranchSolverSuccess = {
  kind: 'success';
  family: 'transcendental-degeneracy-branch-solver';
  branchRows: TranscendentalDegeneracyBranchRow[];
  capEvidence: {
    casewiseBranchRowCap: number;
  };
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalDegeneracyBranchSolverStop = {
  kind: 'stop';
  reason: 'branch-row-cap' | 'empty-conditions';
  detail: string;
  attemptedRows: number;
  capEvidence: TranscendentalDegeneracyBranchSolverSuccess['capEvidence'];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalDegeneracyBranchSolverResult =
  | TranscendentalDegeneracyBranchSolverSuccess
  | TranscendentalDegeneracyBranchSolverStop;

type BranchAlternative = {
  relation: CertificateUxFact['relation'];
  branchKind: 'degenerate' | 'generic';
  proofScope: string;
};

function capEvidence() {
  return {
    casewiseBranchRowCap: TRANSCENDENTAL_TOWER_FORMAL_CAPS.casewiseBranchRows,
  };
}

function relationLatex(expressionLatex: string, relation: string) {
  return `${expressionLatex}${relation}`;
}

function alternativesFor(condition: TranscendentalDegeneracyCondition): BranchAlternative[] {
  if (condition.kind === 'discriminant-sign') {
    return [
      {
        relation: '>0',
        branchKind: 'generic',
        proofScope: 'positive-discriminant branch',
      },
      {
        relation: '=0',
        branchKind: 'degenerate',
        proofScope: 'vanishing-discriminant branch',
      },
      {
        relation: '<0',
        branchKind: 'degenerate',
        proofScope: 'negative-discriminant branch',
      },
    ];
  }

  return [
    {
      relation: '\\ne0',
      branchKind: 'generic',
      proofScope: `${condition.kind} nonzero branch`,
    },
    {
      relation: '=0',
      branchKind: 'degenerate',
      proofScope: `${condition.kind} vanished branch`,
    },
  ];
}

function branchFact(
  condition: TranscendentalDegeneracyCondition,
  alternative: BranchAlternative,
): TranscendentalDegeneracyBranchFact {
  return {
    expressionLatex: condition.expressionLatex,
    relation: alternative.relation,
    source: condition.kind,
    label: condition.label ?? condition.kind,
  };
}

function combineAlternatives(
  conditions: TranscendentalDegeneracyCondition[],
  index: number,
  facts: TranscendentalDegeneracyBranchFact[],
  proofScopes: string[],
  rows: TranscendentalDegeneracyBranchRow[],
) {
  if (index >= conditions.length) {
    const branchKind = facts.some((fact) => fact.relation !== '\\ne0' && fact.relation !== '>0')
      ? 'degenerate'
      : 'generic';
    rows.push({
      index: rows.length + 1,
      branchKind,
      facts,
      conditionLatex: facts.map((fact) => relationLatex(fact.expressionLatex, fact.relation)).join(', '),
      proofScope: proofScopes.join('; '),
    });
    return;
  }

  const condition = conditions[index];
  for (const alternative of alternativesFor(condition)) {
    combineAlternatives(
      conditions,
      index + 1,
      [...facts, branchFact(condition, alternative)],
      [...proofScopes, alternative.proofScope],
      rows,
    );
  }
}

export function solveTranscendentalDegeneracyBranches(
  conditions: TranscendentalDegeneracyCondition[],
  options: { casewiseBranchRowCap?: number } = {},
): TranscendentalDegeneracyBranchSolverResult {
  const caps = {
    casewiseBranchRowCap: options.casewiseBranchRowCap ?? capEvidence().casewiseBranchRowCap,
  };
  if (conditions.length === 0) {
    return {
      kind: 'stop',
      reason: 'empty-conditions',
      detail: 'No degeneracy condition was provided for branch solving.',
      attemptedRows: 0,
      capEvidence: caps,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const attemptedRows = conditions.reduce(
    (count, condition) => count * alternativesFor(condition).length,
    1,
  );
  if (attemptedRows > caps.casewiseBranchRowCap) {
    return {
      kind: 'stop',
      reason: 'branch-row-cap',
      detail: `Degeneracy branching would create ${attemptedRows} rows, above cap ${caps.casewiseBranchRowCap}.`,
      attemptedRows,
      capEvidence: caps,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const branchRows: TranscendentalDegeneracyBranchRow[] = [];
  combineAlternatives(conditions, 0, [], [], branchRows);
  return {
    kind: 'success',
    family: 'transcendental-degeneracy-branch-solver',
    branchRows,
    capEvidence: caps,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
