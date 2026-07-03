import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayDetailSection,
  LimitDirection,
  LimitTargetKind,
} from '../../../types/calculator';
import { resolveFiniteLimitRule } from './api';
import {
  formatLimitValueLatex,
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import { resolveInfiniteIndeterminateTransformLimit } from './indeterminate-transforms';
import { resolveInfiniteScaleLimit } from './infinity-scale-terms';
import { resolveInfiniteRewriteCancellationLimit } from './rewrite-cancellation-spine';
import { parsePiecewiseLimitExpression } from './piecewise-parser';
import type {
  PiecewiseLimitBranch,
  PiecewiseLimitCondition,
} from './piecewise-parser';
import type { FiniteLimitRuleSuccess } from './types';

export {
  collectPiecewiseLimitVariables,
  parsePiecewiseLimitExpression,
} from './piecewise-parser';
export type {
  PiecewiseLimitBranch,
  PiecewiseLimitCondition,
  PiecewiseLimitParseResult,
} from './piecewise-parser';

const ce = new ComputeEngine();
const CONDITION_SAMPLE_SCALE = 1e-6;
const INFINITY_SAMPLE = 1e6;
const MAX_ANALYZABLE_PIECEWISE_BRANCHES = 12;

export type PiecewiseLimitResolution =
  | { kind: 'not-piecewise' }
  | {
      kind: 'failure';
      error: string;
      detailSections?: DisplayDetailSection[];
    }
  | (FiniteLimitRuleSuccess & { kind: 'success' });

type PiecewiseLimitTarget =
  | {
      kind: 'finite';
      value: number;
      direction: LimitDirection;
    }
  | {
      kind: 'infinite';
      targetKind: Exclude<LimitTargetKind, 'finite'>;
    };

type BranchEvaluation =
  | { kind: 'success'; result: FiniteLimitRuleSuccess }
  | { kind: 'unhandled'; reason: string };

function conditionHoldsAt(condition: PiecewiseLimitCondition, variable: string, point: number) {
  if (condition.variable !== variable) {
    return false;
  }

  if (condition.operator === '<') {
    return point < condition.value;
  }
  if (condition.operator === '<=') {
    return point <= condition.value;
  }
  if (condition.operator === '>') {
    return point > condition.value;
  }
  return point >= condition.value;
}

function branchForPoint(
  branches: readonly PiecewiseLimitBranch[],
  variable: string,
  point: number,
) {
  let otherwise: PiecewiseLimitBranch | undefined;
  for (const branch of branches) {
    if (branch.otherwise) {
      otherwise = branch;
      continue;
    }
    if (branch.condition && conditionHoldsAt(branch.condition, variable, point)) {
      return branch;
    }
  }
  return otherwise;
}

function finiteSidePoint(target: number, direction: Exclude<LimitDirection, 'two-sided'>) {
  const offset = Math.max(1, Math.abs(target)) * CONDITION_SAMPLE_SCALE;
  return direction === 'left' ? target - offset : target + offset;
}

function branchForFiniteSide(
  branches: readonly PiecewiseLimitBranch[],
  variable: string,
  target: number,
  direction: Exclude<LimitDirection, 'two-sided'>,
) {
  return branchForPoint(branches, variable, finiteSidePoint(target, direction));
}

function branchForInfinity(
  branches: readonly PiecewiseLimitBranch[],
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
) {
  return branchForPoint(
    branches,
    variable,
    targetKind === 'posInfinity' ? INFINITY_SAMPLE : -INFINITY_SAMPLE,
  );
}

function valueLatex(result: FiniteLimitRuleSuccess) {
  return result.exactLatex
    ?? (result.value === undefined ? undefined : formatLimitValueLatex(result.value));
}

function resultApproxText(result: FiniteLimitRuleSuccess) {
  if (result.approxText) {
    return result.approxText;
  }
  if (typeof result.value === 'number') {
    return `${result.value}`;
  }
  if (result.value === 'posInfinity') {
    return 'Infinity';
  }
  if (result.value === 'negInfinity') {
    return '-Infinity';
  }
  return result.exactLatex;
}

function resultKey(result: FiniteLimitRuleSuccess) {
  if (result.value !== undefined) {
    return result.value;
  }
  return valueLatex(result);
}

function sameResult(left: FiniteLimitRuleSuccess, right: FiniteLimitRuleSuccess) {
  const leftKey = resultKey(left);
  const rightKey = resultKey(right);
  if (typeof leftKey === 'number' && typeof rightKey === 'number') {
    return Math.abs(leftKey - rightKey) <= 1e-8 * Math.max(1, Math.abs(leftKey), Math.abs(rightKey));
  }
  return leftKey !== undefined && leftKey === rightKey;
}

function parseBranchNode(branch: PiecewiseLimitBranch) {
  return ce.parse(branch.expressionLatex).json;
}

function resolveFiniteBranch(
  branch: PiecewiseLimitBranch,
  target: number,
  variable: string,
  direction: LimitDirection,
): BranchEvaluation {
  try {
    const result = resolveFiniteLimitRule(
      parseBranchNode(branch),
      target,
      variable,
      direction,
    );
    return result.kind === 'success'
      ? { kind: 'success', result }
      : {
          kind: 'unhandled',
          reason: `Branch ${branch.expressionLatex} did not resolve with current finite rules.`,
        };
  } catch {
    return {
      kind: 'unhandled',
      reason: `Branch ${branch.expressionLatex} could not be parsed.`,
    };
  }
}

function resolveInfiniteBranch(
  branch: PiecewiseLimitBranch,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): BranchEvaluation {
  try {
    const node = parseBranchNode(branch);
    const result =
      resolveInfiniteRewriteCancellationLimit(node, targetKind, variable)
      ?? resolveInfiniteScaleLimit(node, targetKind, variable)
      ?? resolveInfiniteIndeterminateTransformLimit(node, targetKind, variable);
    return result
      ? { kind: 'success', result }
      : {
          kind: 'unhandled',
          reason: `Branch ${branch.expressionLatex} did not resolve with current infinity rules.`,
        };
  } catch {
    return {
      kind: 'unhandled',
      reason: `Branch ${branch.expressionLatex} could not be parsed.`,
    };
  }
}

function directionLatex(variable: string, target: number, direction: Exclude<LimitDirection, 'two-sided'>) {
  const targetLatex = formatLimitValueLatex(target) ?? `${target}`;
  return `${variable}\\to ${targetLatex}^{${direction === 'left' ? '-' : '+'}}`;
}

function branchConditionLatex(branch: PiecewiseLimitBranch) {
  return branch.otherwise
    ? '\\mathrm{otherwise}'
    : branch.condition?.latex ?? '\\mathrm{selected}';
}

function selectedBranchRow(label: string, branch: PiecewiseLimitBranch) {
  return [
    limitTextPart(`${label} branch: `),
    limitMathPart(branch.expressionLatex),
    limitTextPart(' when '),
    limitMathPart(branchConditionLatex(branch)),
    limitTextPart('.'),
  ];
}

function branchCalculationRow(input: {
  label: string;
  branch: PiecewiseLimitBranch;
  variable: string;
  approachLatex: string;
  valueLatex: string;
}) {
  return [
    limitTextPart(`${input.label} calculation: `),
    limitMathPart(`\\lim_{${input.approachLatex}}${input.branch.expressionLatex}=${input.valueLatex}`),
    limitTextPart('.'),
  ];
}

function piecewiseSuccessDetails(input: {
  leftBranch?: PiecewiseLimitBranch;
  rightBranch?: PiecewiseLimitBranch;
  selectedBranch?: PiecewiseLimitBranch;
  leftResult?: FiniteLimitRuleSuccess;
  rightResult?: FiniteLimitRuleSuccess;
  result: FiniteLimitRuleSuccess;
  variable: string;
  target: PiecewiseLimitTarget;
}): DisplayDetailSection[] {
  const rows = [
    [limitTextPart('Form detected: piecewise branch analysis.')],
  ];

  if (input.target.kind === 'finite' && input.leftBranch && input.rightBranch && input.leftResult && input.rightResult) {
    const leftLatex = valueLatex(input.leftResult) ?? '?';
    const rightLatex = valueLatex(input.rightResult) ?? '?';
    rows.push(
      selectedBranchRow('Left', input.leftBranch),
      selectedBranchRow('Right', input.rightBranch),
      branchCalculationRow({
        label: 'Left',
        branch: input.leftBranch,
        variable: input.variable,
        approachLatex: directionLatex(input.variable, input.target.value, 'left'),
        valueLatex: leftLatex,
      }),
      branchCalculationRow({
        label: 'Right',
        branch: input.rightBranch,
        variable: input.variable,
        approachLatex: directionLatex(input.variable, input.target.value, 'right'),
        valueLatex: rightLatex,
      }),
      [
        limitTextPart('Conclusion: both branch limits equal '),
        limitMathPart(valueLatex(input.result) ?? '?'),
        limitTextPart('.'),
      ],
    );
  } else if (input.selectedBranch) {
    const targetLabel = input.target.kind === 'infinite'
      ? input.target.targetKind === 'posInfinity' ? '\\infty' : '-\\infty'
      : formatLimitValueLatex(input.target.value) ?? `${input.target.value}`;
    rows.push(
      selectedBranchRow('Selected', input.selectedBranch),
      [
        limitTextPart('Calculation: '),
        limitMathPart(`\\lim_{${input.variable}\\to ${targetLabel}}${input.selectedBranch.expressionLatex}=${valueLatex(input.result) ?? '?'}`),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Conclusion: the selected branch gives '),
        limitMathPart(valueLatex(input.result) ?? '?'),
        limitTextPart('.'),
      ],
    );
  }

  return [limitDetailSection('Limit Method', rows)];
}

function piecewiseMismatchDetails(input: {
  leftBranch: PiecewiseLimitBranch;
  rightBranch: PiecewiseLimitBranch;
  leftResult: FiniteLimitRuleSuccess;
  rightResult: FiniteLimitRuleSuccess;
  variable: string;
  target: number;
}): DisplayDetailSection[] {
  const leftLatex = valueLatex(input.leftResult) ?? '?';
  const rightLatex = valueLatex(input.rightResult) ?? '?';
  return [limitDetailSection('Why This Limit Fails', [
    selectedBranchRow('Left', input.leftBranch),
    selectedBranchRow('Right', input.rightBranch),
    branchCalculationRow({
      label: 'Left',
      branch: input.leftBranch,
      variable: input.variable,
      approachLatex: directionLatex(input.variable, input.target, 'left'),
      valueLatex: leftLatex,
    }),
    branchCalculationRow({
      label: 'Right',
      branch: input.rightBranch,
      variable: input.variable,
      approachLatex: directionLatex(input.variable, input.target, 'right'),
      valueLatex: rightLatex,
    }),
    [
      limitTextPart('The one-sided branch limits are different, so the two-sided Piecewise limit does not exist.'),
    ],
  ])];
}

function piecewiseDiagnosticRows(input: {
  reason: string;
  leftBranch?: PiecewiseLimitBranch;
  rightBranch?: PiecewiseLimitBranch;
  selectedBranch?: PiecewiseLimitBranch;
}) {
  const rows = [
    [limitTextPart(input.reason)],
  ];
  if (input.leftBranch) {
    rows.push(selectedBranchRow('Left', input.leftBranch));
  }
  if (input.rightBranch) {
    rows.push(selectedBranchRow('Right', input.rightBranch));
  }
  if (input.selectedBranch) {
    rows.push(selectedBranchRow('Selected', input.selectedBranch));
  }
  rows.push([
    limitTextPart('This milestone only supports simple branch selection plus existing finite and infinity limit routes.'),
  ]);
  return rows;
}

function unhandledPiecewise(
  reason: string,
  branches: {
    leftBranch?: PiecewiseLimitBranch;
    rightBranch?: PiecewiseLimitBranch;
    selectedBranch?: PiecewiseLimitBranch;
  } = {},
): PiecewiseLimitResolution {
  return {
    kind: 'failure',
    error: 'Piecewise branch limits are outside the supported Calculus rules.',
    detailSections: [limitDetailSection('Limit Diagnostic', piecewiseDiagnosticRows({
      reason,
      ...branches,
    }))],
  };
}

function successFromResult(
  result: FiniteLimitRuleSuccess,
  detailSections: DisplayDetailSection[],
): PiecewiseLimitResolution {
  return {
    ...result,
    exactLatex: valueLatex(result),
    approxText: resultApproxText(result),
    detailSections,
  };
}

function resolveFinitePiecewise(
  branches: readonly PiecewiseLimitBranch[],
  variable: string,
  target: Extract<PiecewiseLimitTarget, { kind: 'finite' }>,
): PiecewiseLimitResolution {
  if (target.direction === 'left' || target.direction === 'right') {
    const branch = branchForFiniteSide(branches, variable, target.value, target.direction);
    if (!branch) {
      return unhandledPiecewise('No Piecewise branch applies on the requested side.');
    }

    const result = resolveFiniteBranch(branch, target.value, variable, target.direction);
    return result.kind === 'success'
      ? successFromResult(
          result.result,
          piecewiseSuccessDetails({
            selectedBranch: branch,
            result: result.result,
            variable,
            target,
          }),
        )
      : unhandledPiecewise(result.reason, { selectedBranch: branch });
  }

  const leftBranch = branchForFiniteSide(branches, variable, target.value, 'left');
  const rightBranch = branchForFiniteSide(branches, variable, target.value, 'right');
  if (!leftBranch || !rightBranch) {
    return unhandledPiecewise('Could not select both one-sided Piecewise branches.');
  }

  const left = resolveFiniteBranch(leftBranch, target.value, variable, 'left');
  if (left.kind !== 'success') {
    return unhandledPiecewise(left.reason, { leftBranch, rightBranch });
  }
  const right = resolveFiniteBranch(rightBranch, target.value, variable, 'right');
  if (right.kind !== 'success') {
    return unhandledPiecewise(right.reason, { leftBranch, rightBranch });
  }

  if (!sameResult(left.result, right.result)) {
    return {
      kind: 'failure',
      error: 'Left and right Piecewise branch limits do not agree near the target.',
      detailSections: piecewiseMismatchDetails({
        leftBranch,
        rightBranch,
        leftResult: left.result,
        rightResult: right.result,
        variable,
        target: target.value,
      }),
    };
  }

  return successFromResult(
    left.result,
    piecewiseSuccessDetails({
      leftBranch,
      rightBranch,
      leftResult: left.result,
      rightResult: right.result,
      result: left.result,
      variable,
      target,
    }),
  );
}

function resolveInfinitePiecewise(
  branches: readonly PiecewiseLimitBranch[],
  variable: string,
  target: Extract<PiecewiseLimitTarget, { kind: 'infinite' }>,
): PiecewiseLimitResolution {
  const branch = branchForInfinity(branches, variable, target.targetKind);
  if (!branch) {
    return unhandledPiecewise('No Piecewise branch applies at the requested infinity direction.');
  }

  const result = resolveInfiniteBranch(branch, target.targetKind, variable);
  return result.kind === 'success'
    ? successFromResult(
        result.result,
        piecewiseSuccessDetails({
          selectedBranch: branch,
          result: result.result,
          variable,
          target,
        }),
      )
    : unhandledPiecewise(result.reason, { selectedBranch: branch });
}

export function resolvePiecewiseLimit(input: {
  bodyLatex: string;
  variable: string;
  target: PiecewiseLimitTarget;
}): PiecewiseLimitResolution {
  const parsed = parsePiecewiseLimitExpression(input.bodyLatex);
  if (parsed.kind === 'not-piecewise') {
    return { kind: 'not-piecewise' };
  }
  if (parsed.kind === 'malformed') {
    return {
      kind: 'failure',
      error: parsed.error,
    };
  }

  if (parsed.branches.length > MAX_ANALYZABLE_PIECEWISE_BRANCHES) {
    return {
      kind: 'failure',
      error: `Piecewise branch analysis supports up to ${MAX_ANALYZABLE_PIECEWISE_BRANCHES} branches in this milestone.`,
      detailSections: [limitDetailSection('Limit Diagnostic', [
        [limitTextPart(`The editor may contain ${parsed.branches.length} branches, but the solver cap is ${MAX_ANALYZABLE_PIECEWISE_BRANCHES}.`)],
        [limitTextPart('Reduce the branch count or evaluate a narrower one-sided limit.')],
      ])],
    };
  }

  const mismatchedCondition = parsed.branches.find((branch) =>
    branch.condition && branch.condition.variable !== input.variable);
  if (mismatchedCondition?.condition) {
    return {
      kind: 'failure',
      error: `Piecewise condition uses ${mismatchedCondition.condition.variable}, but the limit approaches ${input.variable}.`,
    };
  }

  return input.target.kind === 'finite'
    ? resolveFinitePiecewise(parsed.branches, input.variable, input.target)
    : resolveInfinitePiecewise(parsed.branches, input.variable, input.target);
}
