import {
  type EquationSelectedTargetRouteFamily,
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
  recordSelectedTargetRoutePlan,
} from '../equation-target-shape';
import {
  type GeneratedHandoffSuccess,
  solutionExpressionsFromExactLatex,
} from './generated-handoff';

const GENERATED_BRANCH_OPTIONS = { allowGeneratedImplicitProducts: true };
const GENERATED_BRANCH_PHASE = 'generated-handoff';

export type GeneratedBranchHandoffStop<Reason extends string = string> = {
  kind: 'unsupported';
  reason?: Reason;
  message: string;
};

export type GeneratedBranchHandoffResult<Reason extends string = string> =
  | GeneratedHandoffSuccess
  | GeneratedBranchHandoffStop<Reason>;

export type GeneratedBranchHandoffFamily<Reason extends string = string> = {
  family: EquationSelectedTargetRouteFamily;
  solve: (
    equationLatex: string,
    target: string,
  ) => GeneratedBranchHandoffResult<Reason>;
};

export type GeneratedBranchHandoffAttempt<Reason extends string = string> = {
  family: EquationSelectedTargetRouteFamily;
  result: GeneratedBranchHandoffStop<Reason>;
};

export type GeneratedBranchHandoffFailureContext<Reason extends string = string> = {
  branchLatex: string;
  attempts: GeneratedBranchHandoffAttempt<Reason>[];
};

export type GeneratedBranchHandoffFailurePolicy<Reason extends string = string> = (
  context: GeneratedBranchHandoffFailureContext<Reason>,
) => string;

export type GeneratedBranchHandoffSolvedBranch = {
  branchLatex: string;
  family: EquationSelectedTargetRouteFamily;
  exactLatex: string;
  exactSupplementLatex?: string[];
  solutionExpressions: string[];
};

export type GeneratedBranchHandoffSuccess = {
  kind: 'success';
  branches: GeneratedBranchHandoffSolvedBranch[];
  solutionExpressions: string[];
  exactSupplementLatex: string[];
};

export type GeneratedBranchHandoffUnsupported<Reason extends string = string> = {
  kind: 'unsupported';
  branchLatex: string;
  message: string;
  attempts: GeneratedBranchHandoffAttempt<Reason>[];
};

export type GeneratedBranchHandoffOutput<Reason extends string = string> =
  | GeneratedBranchHandoffSuccess
  | GeneratedBranchHandoffUnsupported<Reason>;

export type SolveGeneratedBranchEquationsInput<Reason extends string = string> = {
  branchEquations: string[];
  target: string;
  families: GeneratedBranchHandoffFamily<Reason>[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  failureMessage: GeneratedBranchHandoffFailurePolicy<Reason>;
  dropComplexInfinity?: boolean;
};

function restrictPlanToSupportedFamilies(
  plan: EquationSelectedTargetRoutePlan,
  supportedFamilies: EquationSelectedTargetRouteFamily[],
): EquationSelectedTargetRoutePlan {
  const families = plan.families.filter((family) => supportedFamilies.includes(family));
  return {
    ...plan,
    families,
    skippedFamilies: supportedFamilies.filter((family) => !families.includes(family)),
  };
}

function planGeneratedBranchHandoff(
  equationLatex: string,
  target: string,
  supportedFamilies: EquationSelectedTargetRouteFamily[],
) {
  return restrictPlanToSupportedFamilies(
    planSelectedTargetRouteFamilies(
      profileEquationTargetShape(equationLatex, target, GENERATED_BRANCH_OPTIONS),
      { phase: GENERATED_BRANCH_PHASE },
    ),
    supportedFamilies,
  );
}

function solveGeneratedBranchEquation<Reason extends string>({
  branchLatex,
  target,
  families,
  searchTrace,
  failureMessage,
  dropComplexInfinity,
}: {
  branchLatex: string;
  target: string;
  families: GeneratedBranchHandoffFamily<Reason>[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  failureMessage: GeneratedBranchHandoffFailurePolicy<Reason>;
  dropComplexInfinity?: boolean;
}): GeneratedBranchHandoffSolvedBranch | GeneratedBranchHandoffUnsupported<Reason> {
  const supportedFamilies = families.map((entry) => entry.family);
  const routePlan = planGeneratedBranchHandoff(branchLatex, target, supportedFamilies);
  recordSelectedTargetRoutePlan(searchTrace, routePlan);
  const attempts: GeneratedBranchHandoffAttempt<Reason>[] = [];

  for (const family of families) {
    if (!routePlan.families.includes(family.family)) {
      continue;
    }

    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_BRANCH_PHASE, family.family);
    const result = family.solve(branchLatex, target);
    if (result.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_BRANCH_PHASE, family.family);
      return {
        branchLatex,
        family: family.family,
        exactLatex: result.exactLatex,
        exactSupplementLatex: result.exactSupplementLatex,
        solutionExpressions: solutionExpressionsFromExactLatex(result.exactLatex, target, {
          dropComplexInfinity,
        }),
      };
    }

    attempts.push({ family: family.family, result });
  }

  const message = failureMessage({ branchLatex, attempts });
  recordSelectedTargetFinalStop(searchTrace, GENERATED_BRANCH_PHASE, 'branch-handoff-unsupported', message);
  return {
    kind: 'unsupported',
    branchLatex,
    message,
    attempts,
  };
}

export function solveGeneratedBranchEquations<Reason extends string = string>({
  branchEquations,
  target,
  families,
  searchTrace,
  failureMessage,
  dropComplexInfinity,
}: SolveGeneratedBranchEquationsInput<Reason>): GeneratedBranchHandoffOutput<Reason> {
  const branches: GeneratedBranchHandoffSolvedBranch[] = [];

  for (const branchLatex of branchEquations) {
    const solved = solveGeneratedBranchEquation({
      branchLatex,
      target,
      families,
      searchTrace,
      failureMessage,
      dropComplexInfinity,
    });
    if ('message' in solved) {
      return solved;
    }
    branches.push(solved);
  }

  return {
    kind: 'success',
    branches,
    solutionExpressions: branches.flatMap((branch) => branch.solutionExpressions),
    exactSupplementLatex: [...new Set(branches.flatMap((branch) => branch.exactSupplementLatex ?? []))],
  };
}
