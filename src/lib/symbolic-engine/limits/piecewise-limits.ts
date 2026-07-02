import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayDetailSection,
  LimitDirection,
  LimitTargetKind,
} from '../../../types/calculator';
import { isNodeArray } from '../patterns';
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
import type { FiniteLimitRuleSuccess } from './types';

const ce = new ComputeEngine();
type ComputeEngineBoxInput = Parameters<ComputeEngine['box']>[0];
const CONDITION_SAMPLE_SCALE = 1e-6;
const INFINITY_SAMPLE = 1e6;

type PiecewiseComparisonOperator = '<' | '<=' | '>' | '>=';

export type PiecewiseLimitCondition = {
  variable: string;
  operator: PiecewiseComparisonOperator;
  value: number;
  latex: string;
};

export type PiecewiseLimitBranch = {
  expressionLatex: string;
  condition?: PiecewiseLimitCondition;
  otherwise?: boolean;
};

export type PiecewiseLimitParseResult =
  | { kind: 'not-piecewise' }
  | { kind: 'malformed'; error: string }
  | { kind: 'piecewise'; branches: PiecewiseLimitBranch[] };

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

const SUPPORTED_GREEK = new Set([
  'alpha',
  'beta',
  'gamma',
  'delta',
  'lambda',
  'mu',
  'theta',
]);

function canonicalSymbol(input: string): string | undefined {
  const normalized = input
    .trim()
    .replace(/^\\/u, '')
    .replace(/[{}]/gu, '');

  if (/^[a-zA-Z]$/u.test(normalized)) {
    return normalized;
  }
  if (SUPPORTED_GREEK.has(normalized)) {
    return normalized;
  }
  return undefined;
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    } else if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
    } else if (char === delimiter && depth === 0) {
      parts.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(input.slice(start).trim());
  return parts.filter(Boolean);
}

function stripOuterParens(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
    return trimmed;
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0 && index < trimmed.length - 1) {
        return trimmed;
      }
    }
  }

  return trimmed.slice(1, -1).trim();
}

function normalizeConditionSource(input: string) {
  return input
    .trim()
    .replace(/\\text\{\s*if\s+([^}]*)\}/giu, '$1')
    .replace(/\\text\{\s*([^}]*)\}/giu, '$1')
    .replace(/\\leq?/giu, '<=')
    .replace(/\\geq?/giu, '>=')
    .replace(/\\lt/giu, '<')
    .replace(/\\gt/giu, '>')
    .replace(/≤/gu, '<=')
    .replace(/≥/gu, '>=')
    .replace(/\s+/gu, '');
}

function parseNumericConstant(input: string): number | undefined {
  const normalized = input
    .trim()
    .replace(/[{}]/gu, '')
    .replace(/^\+/u, '');
  if (/^-?\d+(?:\.\d+)?$/u.test(normalized)) {
    return Number(normalized);
  }
  return undefined;
}

function flipOperator(operator: PiecewiseComparisonOperator): PiecewiseComparisonOperator {
  if (operator === '<') {
    return '>';
  }
  if (operator === '<=') {
    return '>=';
  }
  if (operator === '>') {
    return '<';
  }
  return '<=';
}

function parseCondition(input: string): PiecewiseLimitCondition | undefined {
  const source = normalizeConditionSource(input);
  const match = source.match(/^(.+?)(<=|>=|<|>)(.+)$/u);
  if (!match) {
    return undefined;
  }

  const [, leftRaw, operatorRaw, rightRaw] = match;
  const operator = operatorRaw as PiecewiseComparisonOperator;
  const leftSymbol = canonicalSymbol(leftRaw);
  if (leftSymbol) {
    const value = parseNumericConstant(rightRaw);
    return value === undefined
      ? undefined
      : {
          variable: leftSymbol,
          operator,
          value,
          latex: `${leftRaw}${operator}${rightRaw}`,
        };
  }

  const rightSymbol = canonicalSymbol(rightRaw);
  if (rightSymbol) {
    const value = parseNumericConstant(leftRaw);
    return value === undefined
      ? undefined
      : {
          variable: rightSymbol,
          operator: flipOperator(operator),
          value,
          latex: `${rightRaw}${flipOperator(operator)}${leftRaw}`,
        };
  }

  return undefined;
}

function cleanBranchExpression(input: string) {
  return stripOuterParens(input)
    .replace(/,+$/u, '')
    .trim();
}

function parseFriendlyPiecewise(source: string): PiecewiseLimitParseResult {
  const match = source.trim().match(/^piecewise\s*\(([\s\S]*)\)$/iu);
  if (!match) {
    return { kind: 'not-piecewise' };
  }

  const entries = splitTopLevel(match[1], ',');
  if (entries.length < 2) {
    return {
      kind: 'malformed',
      error: 'Piecewise limits need at least two branches.',
    };
  }

  const branches: PiecewiseLimitBranch[] = [];
  for (const entry of entries) {
    const otherwise = entry.match(/^([\s\S]+?)\s+otherwise$/iu);
    if (otherwise) {
      branches.push({
        expressionLatex: cleanBranchExpression(otherwise[1]),
        otherwise: true,
      });
      continue;
    }

    const conditional = entry.match(/^([\s\S]+?)\s+if\s+([\s\S]+)$/iu);
    if (!conditional) {
      return {
        kind: 'malformed',
        error: 'Piecewise branches must use "expr if condition" or "expr otherwise".',
      };
    }

    const condition = parseCondition(conditional[2]);
    if (!condition) {
      return {
        kind: 'malformed',
        error: 'Piecewise limits only support simple comparison conditions in this milestone.',
      };
    }

    branches.push({
      expressionLatex: cleanBranchExpression(conditional[1]),
      condition,
    });
  }

  return { kind: 'piecewise', branches };
}

function parseCasesPiecewise(source: string): PiecewiseLimitParseResult {
  const match = source.trim().match(/^\\begin\{cases\}([\s\S]+)\\end\{cases\}$/u);
  if (!match) {
    return { kind: 'not-piecewise' };
  }

  const rows = match[1]
    .split(/\\\\/u)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length < 2) {
    return {
      kind: 'malformed',
      error: 'Piecewise limits need at least two cases rows.',
    };
  }

  const branches: PiecewiseLimitBranch[] = [];
  for (const row of rows) {
    const [expressionPart, conditionPart] = splitTopLevel(row, '&');
    if (!expressionPart || !conditionPart) {
      return {
        kind: 'malformed',
        error: 'Piecewise cases rows need an expression and condition.',
      };
    }

    const conditionSource = conditionPart.trim();
    if (/otherwise|\\top|true/iu.test(conditionSource)) {
      branches.push({
        expressionLatex: cleanBranchExpression(expressionPart),
        otherwise: true,
      });
      continue;
    }

    const condition = parseCondition(conditionSource);
    if (!condition) {
      return {
        kind: 'malformed',
        error: 'Piecewise limits only support simple comparison conditions in this milestone.',
      };
    }

    branches.push({
      expressionLatex: cleanBranchExpression(expressionPart),
      condition,
    });
  }

  return { kind: 'piecewise', branches };
}

function parseWhichPiecewise(node: unknown): PiecewiseLimitBranch[] | undefined {
  if (!isNodeArray(node) || node[0] !== 'Which') {
    return undefined;
  }

  const branches: PiecewiseLimitBranch[] = [];
  for (let index = 1; index < node.length; index += 2) {
    const conditionNode = node[index];
    const expressionNode = node[index + 1];
    if (expressionNode === undefined) {
      return undefined;
    }

    const expressionLatex = ce.box(expressionNode as ComputeEngineBoxInput).latex;
    if (conditionNode === 'True') {
      branches.push({ expressionLatex, otherwise: true });
      continue;
    }

    if (!isNodeArray(conditionNode) || conditionNode.length !== 3) {
      return undefined;
    }

    const head = conditionNode[0];
    const operator =
      head === 'Less' ? '<'
        : head === 'LessEqual' ? '<='
          : head === 'Greater' ? '>'
            : head === 'GreaterEqual' ? '>='
              : undefined;
    if (!operator) {
      return undefined;
    }

    const condition = parseCondition(
      `${ce.box(conditionNode[1] as ComputeEngineBoxInput).latex}${operator}${ce.box(conditionNode[2] as ComputeEngineBoxInput).latex}`,
    );
    if (!condition) {
      return undefined;
    }

    branches.push({ expressionLatex, condition });
  }

  return branches.length >= 2 ? branches : undefined;
}

export function parsePiecewiseLimitExpression(bodyLatex: string): PiecewiseLimitParseResult {
  const friendly = parseFriendlyPiecewise(bodyLatex);
  if (friendly.kind !== 'not-piecewise') {
    return friendly;
  }

  const cases = parseCasesPiecewise(bodyLatex);
  if (cases.kind !== 'not-piecewise') {
    return cases;
  }

  try {
    const branches = parseWhichPiecewise(ce.parse(bodyLatex).json);
    return branches
      ? { kind: 'piecewise', branches }
      : { kind: 'not-piecewise' };
  } catch {
    return { kind: 'not-piecewise' };
  }
}

function collectVariablesFromNode(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    const symbol = canonicalSymbol(node);
    if (symbol) {
      variables.add(symbol);
    }
    return;
  }

  if (!isNodeArray(node)) {
    return;
  }

  for (const child of node.slice(1)) {
    collectVariablesFromNode(child, variables);
  }
}

export function collectPiecewiseLimitVariables(bodyLatex: string): string[] | undefined {
  const parsed = parsePiecewiseLimitExpression(bodyLatex);
  if (parsed.kind === 'not-piecewise') {
    return undefined;
  }
  if (parsed.kind === 'malformed') {
    return [];
  }

  const variables = new Set<string>();
  for (const branch of parsed.branches) {
    if (branch.condition) {
      variables.add(branch.condition.variable);
    }
    try {
      collectVariablesFromNode(ce.parse(branch.expressionLatex).json, variables);
    } catch {
      // malformed branch expressions are reported by the evaluator.
    }
  }

  return [...variables].sort((left, right) => left.localeCompare(right));
}

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

function unhandledPiecewise(reason: string): PiecewiseLimitResolution {
  return {
    kind: 'failure',
    error: 'Piecewise branch limits are outside the supported Calculus rules.',
    detailSections: [limitDetailSection('Limit Diagnostic', [
      [limitTextPart(reason)],
      [limitTextPart('This milestone only supports simple branch selection plus existing finite and infinity limit routes.')],
    ])],
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
      : unhandledPiecewise(result.reason);
  }

  const leftBranch = branchForFiniteSide(branches, variable, target.value, 'left');
  const rightBranch = branchForFiniteSide(branches, variable, target.value, 'right');
  if (!leftBranch || !rightBranch) {
    return unhandledPiecewise('Could not select both one-sided Piecewise branches.');
  }

  const left = resolveFiniteBranch(leftBranch, target.value, variable, 'left');
  if (left.kind !== 'success') {
    return unhandledPiecewise(left.reason);
  }
  const right = resolveFiniteBranch(rightBranch, target.value, variable, 'right');
  if (right.kind !== 'success') {
    return unhandledPiecewise(right.reason);
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
    : unhandledPiecewise(result.reason);
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
