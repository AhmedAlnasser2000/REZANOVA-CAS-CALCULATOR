import {
  type EquationSelectedTargetRouteFamily,
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilyStop,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
  recordSelectedTargetRoutePlan,
} from '../equation-target-shape';
import {
  type GeneratedHandoffSuccess,
  solutionExpressionsFromExactLatex,
} from './generated-handoff';
import {
  globalSupplementLatexFromGeneratedFormulaPayload,
  solutionExpressionsFromGeneratedFormulaPayload,
  type GeneratedFormulaHandoffPayload,
} from './generated-formula-handoff-payload';
import {
  type GeneratedFormulaValidationEvidence,
  generatedFormulaValidationTraceDetails,
  inspectGeneratedFormulaPayloadValidation,
} from './generated-formula-validation';
import type { SerializableMathJson } from '../../../types/calculator';

const GENERATED_BRANCH_OPTIONS = { allowGeneratedImplicitProducts: true };
const GENERATED_BRANCH_PHASE = 'generated-handoff';
const GENERATED_FORMULA_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'cubic-cardano',
  'quartic-ferrari',
]);

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
  solutionMathJson?: SerializableMathJson[];
  formulaPayload?: GeneratedFormulaHandoffPayload;
};

export type GeneratedBranchHandoffSuccess = {
  kind: 'success';
  branches: GeneratedBranchHandoffSolvedBranch[];
  solutionExpressions: string[];
  solutionMathJson?: SerializableMathJson[];
  exactSupplementLatex: string[];
  formulaPayloads?: GeneratedFormulaHandoffPayload[];
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
  formulaValidationEvidence?: (
    payload: GeneratedFormulaHandoffPayload,
    context: {
      branchLatex: string;
      family: EquationSelectedTargetRouteFamily;
      target: string;
    },
  ) => GeneratedFormulaValidationEvidence;
};

function restrictPlanToSupportedFamilies(
  plan: EquationSelectedTargetRoutePlan,
  supportedFamilies: EquationSelectedTargetRouteFamily[],
  enableFormulaFamilies = false,
): EquationSelectedTargetRoutePlan {
  const families = plan.families.filter((family) => supportedFamilies.includes(family));
  if (enableFormulaFamilies && plan.profile.status === 'ok') {
    for (const family of supportedFamilies) {
      if (GENERATED_FORMULA_FAMILIES.has(family) && !families.includes(family)) {
        families.push(family);
      }
    }
  }
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
  enableFormulaFamilies = false,
) {
  return restrictPlanToSupportedFamilies(
    planSelectedTargetRouteFamilies(
      profileEquationTargetShape(equationLatex, target, GENERATED_BRANCH_OPTIONS),
      { phase: GENERATED_BRANCH_PHASE },
    ),
    supportedFamilies,
    enableFormulaFamilies,
  );
}

function solveGeneratedBranchEquation<Reason extends string>({
  branchLatex,
  target,
  families,
  searchTrace,
  failureMessage,
  dropComplexInfinity,
  formulaValidationEvidence,
}: {
  branchLatex: string;
  target: string;
  families: GeneratedBranchHandoffFamily<Reason>[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  failureMessage: GeneratedBranchHandoffFailurePolicy<Reason>;
  dropComplexInfinity?: boolean;
  formulaValidationEvidence?: SolveGeneratedBranchEquationsInput<Reason>['formulaValidationEvidence'];
}): GeneratedBranchHandoffSolvedBranch | GeneratedBranchHandoffUnsupported<Reason> {
  const supportedFamilies = families.map((entry) => entry.family);
  const routePlan = planGeneratedBranchHandoff(
    branchLatex,
    target,
    supportedFamilies,
    Boolean(formulaValidationEvidence),
  );
  recordSelectedTargetRoutePlan(searchTrace, routePlan);
  const attempts: GeneratedBranchHandoffAttempt<Reason>[] = [];

  for (const family of families) {
    if (!routePlan.families.includes(family.family)) {
      continue;
    }

    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_BRANCH_PHASE, family.family);
    const result = family.solve(branchLatex, target);
    if (result.kind === 'success') {
      if (result.formulaPayload) {
        const validation = inspectGeneratedFormulaPayloadValidation(
          result.formulaPayload,
          formulaValidationEvidence?.(result.formulaPayload, {
            branchLatex,
            family: family.family,
            target,
          }),
        );
        if (validation.kind === 'blocked') {
          recordSelectedTargetFamilyStop(
            searchTrace,
            GENERATED_BRANCH_PHASE,
            family.family,
            validation.reason,
            validation.message,
            generatedFormulaValidationTraceDetails(validation),
          );
          attempts.push({
            family: family.family,
            result: {
              kind: 'unsupported',
              reason: validation.reason as Reason,
              message: validation.message,
            },
          });
          continue;
        }
      }
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_BRANCH_PHASE, family.family);
      const formulaPayloadSupplements = result.formulaPayload
        ? globalSupplementLatexFromGeneratedFormulaPayload(result.formulaPayload)
        : [];
      const exactSupplementLatex = [
        ...new Set([
          ...(result.exactSupplementLatex ?? []),
          ...formulaPayloadSupplements,
        ]),
      ];
      const canonicalRoot = Array.isArray(result.primaryMath?.mathJson)
        ? result.primaryMath.mathJson
        : undefined;
      const solutionMathJson = canonicalRoot?.[0] === 'Equal'
        && canonicalRoot[1] === target
        && canonicalRoot.length === 3
          ? [canonicalRoot[2]]
          : canonicalRoot?.[0] === 'Element'
            && canonicalRoot[1] === target
            && Array.isArray(canonicalRoot[2])
            && canonicalRoot[2][0] === 'Set'
              ? canonicalRoot[2].slice(1)
              : undefined;
      return {
        branchLatex,
        family: family.family,
        exactLatex: result.exactLatex,
        ...(exactSupplementLatex.length ? { exactSupplementLatex } : {}),
        solutionExpressions: result.formulaPayload
          ? solutionExpressionsFromGeneratedFormulaPayload(result.formulaPayload)
          : solutionExpressionsFromExactLatex(result.exactLatex, target, {
              dropComplexInfinity,
            }),
        ...(solutionMathJson ? { solutionMathJson } : {}),
        ...(result.formulaPayload ? { formulaPayload: result.formulaPayload } : {}),
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
  formulaValidationEvidence,
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
      formulaValidationEvidence,
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
    ...(branches.every((branch) =>
      branch.solutionMathJson?.length === branch.solutionExpressions.length)
      ? { solutionMathJson: branches.flatMap((branch) => branch.solutionMathJson ?? []) }
      : {}),
    exactSupplementLatex: [...new Set(branches.flatMap((branch) => branch.exactSupplementLatex ?? []))],
    ...(
      branches.some((branch) => branch.formulaPayload)
        ? {
            formulaPayloads: branches
              .map((branch) => branch.formulaPayload)
              .filter((payload): payload is GeneratedFormulaHandoffPayload => Boolean(payload)),
          }
        : {}
    ),
  };
}
