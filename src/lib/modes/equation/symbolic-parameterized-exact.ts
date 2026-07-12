import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { solveParameterizedExpLogEquation } from '../../equation/parameterized/exp-log';
import { solveParameterizedFactorablePolynomialEquation } from '../../equation/parameterized/factorable-polynomial';
import { solveParameterizedPolynomialEquation } from '../../equation/parameterized/polynomial';
import { solveParameterizedSpecialFormRootsEquation } from '../../equation/parameterized/special-form-roots';
import { solveParameterizedTrigEquation } from '../../equation/parameterized/trig';
import { resolveEquationSolveTarget } from '../../equation/equation-target';
import { createEquationFiniteRootSuccessOutcome } from '../../equation/equation-solve-result';
import { matchTrigEquationRewriteForSolve } from '../../trigonometry/rewrite-solve';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  AngleUnit,
  DisplayBranchReadback,
  DisplayDetailSection,
  DisplayMathPayloadV1,
  DisplayOutcome,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  containsTargetedAbsLatex,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';
import { profileEquationResult } from '../../display/printer';

type TargetResolution = ReturnType<typeof resolveEquationSolveTarget>;

type SelectedTargetParameterizedSuccess = {
  exactLatex: string;
  canonicalMath?: DisplayMathPayloadV1;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections?: DisplayDetailSection[];
  approxText?: string;
  answerDomain?: 'real' | 'complex';
};

function parameterizedOptionsFromTargetResolution(targetResolution: TargetResolution) {
  return {
    allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
      new Set(product.characters).size > 1),
  };
}

function dedupeLatex(entries: Array<string | null | undefined>) {
  return [...new Set(entries.filter((entry): entry is string => Boolean(entry)))];
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*|,\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function exactLatexFromSolutionExpressions(target: string, solutionExpressions: string[]) {
  const unique = dedupeLatex(solutionExpressions);
  return unique.length === 1
    ? (/\\pi n|\bn\b/.test(unique[0])
        ? `${target}\\in\\left\\{${unique[0]}\\right\\}`
        : `${target}=${unique[0]}`)
    : `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPureHighDegreePolynomialEquation(equationLatex: string, target: string) {
  const compact = equationLatex.replace(/\s+/g, '');
  if (/\\(?!cdot\b)|\/|\|/.test(compact)) {
    return false;
  }

  const escapedTarget = escapeRegExp(target);
  const exponents = [...compact.matchAll(new RegExp(`${escapedTarget}\\^(?:\\{)?(\\d+)`, 'g'))]
    .map((match) => Number(match[1]))
    .filter((degree) => Number.isInteger(degree));
  return Math.max(1, ...exponents) >= 5;
}

function isPureQuadraticPolynomialEquation(equationLatex: string, target: string) {
  const compact = equationLatex.replace(/\s+/g, '');
  if (/\\(?!cdot\b)|\/|\|/.test(compact)) {
    return false;
  }

  const escapedTarget = escapeRegExp(target);
  const nonTargetLetters = compact
    .replace(new RegExp(escapedTarget, 'g'), '')
    .replace(/cdot/g, '');
  if (/[A-Za-z]/.test(nonTargetLetters)) {
    return false;
  }

  const exponents = [...compact.matchAll(new RegExp(`${escapedTarget}\\^(?:\\{)?(\\d+)`, 'g'))]
    .map((match) => Number(match[1]))
    .filter((degree) => Number.isInteger(degree));
  return Math.max(1, ...exponents) === 2;
}

function tryParameterizedTrigRewriteSolve(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  options: ReturnType<typeof parameterizedOptionsFromTargetResolution>,
): SelectedTargetParameterizedSuccess | undefined {
  const rewrite = matchTrigEquationRewriteForSolve(equationLatex, angleUnit);
  if (rewrite.kind !== 'candidate') {
    return undefined;
  }

  const generatedEquations = rewrite.candidate.kind === 'single-call'
    ? [rewrite.candidate.solvedLatex]
    : rewrite.candidate.branchLatex;
  const solvedBranches = generatedEquations.map((branchLatex) =>
    solveParameterizedTrigEquation(branchLatex, target, angleUnit, {
      ...options,
      allowGeneratedImplicitProducts: true,
    }));

  if (solvedBranches.some((branch) => branch.kind !== 'success')) {
    return undefined;
  }

  const successes = solvedBranches.flatMap((branch) => branch.kind === 'success' ? [branch] : []);
  const solutionExpressions = successes.flatMap((branch) =>
    solutionExpressionsFromExactLatex(branch.exactLatex, target));
  const exactSupplementLatex = dedupeLatex(successes.flatMap((branch) => branch.exactSupplementLatex ?? []));

  return profileEquationResult({
    exactLatex: exactLatexFromSolutionExpressions(target, solutionExpressions),
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    detailSections: [
      {
        title: 'Parameterized Trig Rewrite',
        lineKind: 'text',
        lines: [
          rewrite.candidate.summaryText,
          `Generated ${generatedEquations.length} trigonometric branch equation${generatedEquations.length === 1 ? '' : 's'} and solved them as periodic selected-target families.`,
          `Angle unit: ${angleUnit.toUpperCase()}.`,
        ],
      },
      ...successes.flatMap((branch) => branch.detailSections ?? []),
    ],
  });
}

function attachParameterizedSelectedTargetOutcome(input: {
  result: SelectedTargetParameterizedSuccess;
  selectedTarget: string;
  equationLatex: string;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}) {
  const outcome: DisplayOutcome = input.result.canonicalMath
    ? createEquationFiniteRootSuccessOutcome({
        title: 'Solve',
        exactLatex: input.result.exactLatex,
        canonicalMath: input.result.canonicalMath,
        branchReadback: input.result.branchReadback,
        approxText: input.result.approxText,
        exactSupplementLatex: input.result.exactSupplementLatex,
        detailSections: input.result.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
        answerDomain: input.result.answerDomain,
      })
    : {
        kind: 'success',
        title: 'Solve',
        exactLatex: input.result.exactLatex,
        branchReadback: input.result.branchReadback,
        approxText: input.result.approxText,
        exactSupplementLatex: input.result.exactSupplementLatex,
        detailSections: input.result.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
        ...(input.result.answerDomain ? { answerDomain: input.result.answerDomain } : {}),
      };
  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, input.selectedTarget);

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function trySelectedTargetParameterizedExactSolve(input: {
  equationLatex: string;
  angleUnit: AngleUnit;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: TargetResolution;
}): DisplayOutcome | undefined {
  const selectedTarget = input.targetResolution.selectedTarget;
  if (!selectedTarget) {
    return undefined;
  }

  const parameterizedOptions = parameterizedOptionsFromTargetResolution(input.targetResolution);
  const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(input.equationLatex).latex;
  const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
    ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
    : parameterizedSourceLatex;
  const specialFormRoots = containsTargetedAbsLatex(parameterizedEquationLatex, selectedTarget)
    ? undefined
    : solveParameterizedSpecialFormRootsEquation(
      parameterizedEquationLatex,
      selectedTarget,
      parameterizedOptions,
    );

  if (specialFormRoots?.kind === 'success') {
    return attachParameterizedSelectedTargetOutcome({
      result: specialFormRoots,
      selectedTarget,
      equationLatex: input.equationLatex,
      plannerResolvedLatex: input.plannerResolvedLatex,
      plannerBadges: input.plannerBadges,
    });
  }

  if (isPureQuadraticPolynomialEquation(parameterizedEquationLatex, selectedTarget)) {
    const polynomial = solveParameterizedPolynomialEquation(
      parameterizedEquationLatex,
      selectedTarget,
      parameterizedOptions,
    );
    if (polynomial.kind === 'success') {
      return attachParameterizedSelectedTargetOutcome({
        result: polynomial,
        selectedTarget,
        equationLatex: input.equationLatex,
        plannerResolvedLatex: input.plannerResolvedLatex,
        plannerBadges: input.plannerBadges,
      });
    }
  }

  if (isPureHighDegreePolynomialEquation(parameterizedEquationLatex, selectedTarget)) {
    const factorable = solveParameterizedFactorablePolynomialEquation(
      parameterizedEquationLatex,
      selectedTarget,
      parameterizedOptions,
    );
    if (factorable.kind === 'success') {
      return attachParameterizedSelectedTargetOutcome({
        result: factorable,
        selectedTarget,
        equationLatex: input.equationLatex,
        plannerResolvedLatex: input.plannerResolvedLatex,
        plannerBadges: input.plannerBadges,
      });
    }
  }

  const expLog = solveParameterizedExpLogEquation(
    parameterizedEquationLatex,
    selectedTarget,
    {
      ...parameterizedOptions,
      formulaHandoff: { domain: 'real' },
    },
  );
  if (expLog.kind === 'success') {
    return attachParameterizedSelectedTargetOutcome({
      result: expLog,
      selectedTarget,
      equationLatex: input.equationLatex,
      plannerResolvedLatex: input.plannerResolvedLatex,
      plannerBadges: input.plannerBadges,
    });
  }

  const trigRewrite = tryParameterizedTrigRewriteSolve(
    parameterizedEquationLatex,
    selectedTarget,
    input.angleUnit,
    parameterizedOptions,
  );
  if (trigRewrite) {
    return attachParameterizedSelectedTargetOutcome({
      result: trigRewrite,
      selectedTarget,
      equationLatex: input.equationLatex,
      plannerResolvedLatex: input.plannerResolvedLatex,
      plannerBadges: input.plannerBadges,
    });
  }

  const trigDirect = solveParameterizedTrigEquation(
    parameterizedEquationLatex,
    selectedTarget,
    input.angleUnit,
    parameterizedOptions,
  );
  return trigDirect.kind === 'success'
    ? attachParameterizedSelectedTargetOutcome({
      result: trigDirect,
      selectedTarget,
      equationLatex: input.equationLatex,
      plannerResolvedLatex: input.plannerResolvedLatex,
      plannerBadges: input.plannerBadges,
    })
    : undefined;
}
