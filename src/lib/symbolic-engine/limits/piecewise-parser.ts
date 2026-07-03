import { ComputeEngine } from '@cortex-js/compute-engine';

import { isNodeArray } from '../patterns';

const ce = new ComputeEngine();
type ComputeEngineBoxInput = Parameters<ComputeEngine['box']>[0];

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

function splitFriendlyPiecewiseEntries(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    } else if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
    } else if ((char === ',' || char === ';' || char === '\n') && depth === 0) {
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

  const entries = splitFriendlyPiecewiseEntries(match[1]);
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
