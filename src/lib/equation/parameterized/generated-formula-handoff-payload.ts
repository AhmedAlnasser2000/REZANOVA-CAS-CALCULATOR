import type {
  AnswerDomain,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import type { EquationSelectedTargetRouteFamily } from '../equation-target-shape';

export type GeneratedFormulaAlgorithm = 'cardano' | 'ferrari';

export type GeneratedFormulaRouteFamily = Extract<
  EquationSelectedTargetRouteFamily,
  'cubic-cardano' | 'quartic-ferrari'
>;

export type GeneratedFormulaCandidateSet =
  | {
      kind: 'unconditional-finite';
      branchCount: number;
    }
  | {
      kind: 'conditional-cases';
      caseCount: number;
    };

export type GeneratedFormulaFactScope =
  | { kind: 'global' }
  | { kind: 'branch'; branchId: string }
  | { kind: 'case'; caseId: string }
  | { kind: 'generated-equation'; equationLatex: string }
  | { kind: 'wrapper'; branchLatex?: string };

export type GeneratedFormulaFactSource =
  | 'formula'
  | 'normalization'
  | 'validation'
  | 'wrapper';

export type GeneratedFormulaScopedFact = {
  latex: string;
  scope: GeneratedFormulaFactScope;
  source: GeneratedFormulaFactSource;
  message?: string;
};

export type GeneratedFormulaBranchRow = {
  id: string;
  solutionLatex: string;
  rowLatex?: string;
  label?: string;
  factsLatex?: string[];
};

export type GeneratedFormulaCaseRow = {
  id: string;
  resultLatex: string;
  conditionLatex: string;
  rowLatex?: string;
  text?: string;
  parts?: DisplayDetailLinePart[];
  factsLatex?: string[];
};

export type GeneratedFormulaPayloadOutput =
  | {
      kind: 'finite-branches';
      branches: GeneratedFormulaBranchRow[];
      branchReadback?: DisplayBranchReadback;
    }
  | {
      kind: 'case-math';
      exactLatex: string;
      cases: GeneratedFormulaCaseRow[];
    };

export type GeneratedFormulaHandoffPayload = {
  kind: 'generated-formula-payload';
  targetLatex: string;
  generatedEquationLatex: string;
  sourceFamily: GeneratedFormulaRouteFamily;
  formula: {
    algorithm: GeneratedFormulaAlgorithm;
    degree: 3 | 4;
    domain: 'real' | 'complex';
  };
  answerDomain: AnswerDomain;
  candidateSet: GeneratedFormulaCandidateSet;
  output: GeneratedFormulaPayloadOutput;
  exactLatex?: string;
  globalSupplementLatex?: string[];
  scopedFacts?: GeneratedFormulaScopedFact[];
  detailSections?: DisplayDetailSection[];
};

function dedupeLatex(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

export function solutionExpressionsFromGeneratedFormulaPayload(
  payload: GeneratedFormulaHandoffPayload,
) {
  if (
    payload.candidateSet.kind !== 'unconditional-finite'
    || payload.output.kind !== 'finite-branches'
  ) {
    return [];
  }

  return payload.output.branches
    .map((branch) => branch.solutionLatex)
    .filter(Boolean);
}

export function globalSupplementLatexFromGeneratedFormulaPayload(
  payload: GeneratedFormulaHandoffPayload,
) {
  const scopedGlobalFacts = (payload.scopedFacts ?? [])
    .filter((fact) => fact.scope.kind === 'global')
    .map((fact) => fact.latex);
  return dedupeLatex([
    ...(payload.globalSupplementLatex ?? []),
    ...scopedGlobalFacts,
  ]);
}
